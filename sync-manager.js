/* ============================================
   FlyHighManarang - Sync Manager
   Handles offline-first data synchronization
   ============================================ */

// Sync Manager Class
class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.storeId = null;
    this.lastSyncTime = null;
    this.syncListeners = [];

    // Listen for network changes
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // Initialize sync manager
  async initialize() {
    console.log('[SyncManager] Initializing...');

    // Get store ID from Supabase
    this.storeId = await getStoreId();

    // Get last sync time from local DB
    this.lastSyncTime = await getLastSyncTime();

    // Store ID locally for offline reference
    if (this.storeId) {
      await setLocalStoreId(this.storeId);
    }

    console.log('[SyncManager] Initialized with storeId:', this.storeId);

    // If online, sync immediately
    if (this.isOnline && this.storeId) {
      await this.fullSync();
    }
  }

  // Add sync status listener
  addListener(callback) {
    this.syncListeners.push(callback);
  }

  // Notify listeners of sync status change
  notifyListeners(status, message = '') {
    this.syncListeners.forEach(cb => cb(status, message));
    document.dispatchEvent(new CustomEvent('sync-status-change', {
      detail: { status, message }
    }));
  }

  // Handle coming online
  async handleOnline() {
    console.log('[SyncManager] Network online');
    this.isOnline = true;
    this.notifyListeners('online', 'Connection restored');

    // Sync pending changes
    if (this.storeId) {
      await this.pushToServer();
      await this.pullFromServer();
    }
  }

  // Handle going offline
  handleOffline() {
    console.log('[SyncManager] Network offline');
    this.isOnline = false;
    this.notifyListeners('offline', 'Working offline');
  }

  // Full sync (pull then push)
  async fullSync() {
    if (!this.isOnline || !this.storeId || this.isSyncing) {
      console.log('[SyncManager] Skipping full sync - not ready');
      return;
    }

    console.log('[SyncManager] Starting full sync...');
    this.notifyListeners('syncing', 'Syncing data...');

    try {
      await this.pullFromServer();
      await this.pushToServer();
      await setLastSyncTime(new Date().toISOString());
      this.lastSyncTime = new Date().toISOString();
      this.notifyListeners('synced', 'All data synced');
      console.log('[SyncManager] Full sync complete');
    } catch (error) {
      console.error('[SyncManager] Full sync failed:', error);
      this.notifyListeners('error', 'Sync failed');
    }
  }

  // Pull data from Supabase
  async pullFromServer() {
    if (!this.isOnline || !this.storeId) return;

    console.log('[SyncManager] Pulling from server...');
    this.isSyncing = true;

    try {
      const tables = ['products', 'inventory', 'display', 'transactions', 'settings'];

      for (const table of tables) {
        const serverData = await fetchFromSupabase(table, this.lastSyncTime);
        console.log(`[SyncManager] Fetched ${serverData.length} records from ${table}`);

        for (const serverRecord of serverData) {
          if (table === 'settings') {
            // Settings use 'key' as primary identifier
            await db.settings.put({
              key: serverRecord.key,
              value: serverRecord.value,
              supabaseId: serverRecord.id,
              syncStatus: 'synced'
            });
          } else {
            await this.mergeRecord(table, serverRecord);
          }
        }
      }

    } catch (error) {
      console.error('[SyncManager] Pull failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Push pending changes to Supabase
  async pushToServer() {
    if (!this.isOnline || !this.storeId) return;

    console.log('[SyncManager] Pushing to server...');
    this.isSyncing = true;

    try {
      // Get all pending sync items
      const pendingItems = await getPendingSyncItems();
      console.log(`[SyncManager] ${pendingItems.length} items to sync`);

      for (const item of pendingItems) {
        try {
          const data = JSON.parse(item.data);
          const supabaseData = this.mapToSupabase(item.tableName, data);

          if (item.operation === 'delete') {
            // Soft delete
            if (data.supabaseId) {
              await softDeleteFromSupabase(item.tableName, data.supabaseId);
            }
          } else {
            // Upsert
            const result = await upsertToSupabase(item.tableName, supabaseData);

            // Update local record with Supabase ID
            if (result && result.id) {
              await markAsSynced(item.tableName, item.recordId, result.id);
            }
          }

          // Remove from sync queue
          await removeSyncQueueItem(item.id);
          console.log(`[SyncManager] Synced ${item.tableName}:${item.recordId}`);

        } catch (error) {
          console.error(`[SyncManager] Failed to sync ${item.tableName}:${item.recordId}:`, error);

          // Increment attempts
          const newAttempts = (item.attempts || 0) + 1;
          await updateSyncQueueAttempts(item.id, newAttempts, error.message);

          // Mark as conflict after 5 attempts
          if (newAttempts >= 5) {
            await markAsConflict(item.tableName, item.recordId);
          }
        }
      }

    } catch (error) {
      console.error('[SyncManager] Push failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Merge server record with local data
  async mergeRecord(tableName, serverRecord) {
    const localId = serverRecord.local_id;
    let localRecord = null;

    // Try to find local record by local_id or supabaseId
    if (localId) {
      localRecord = await db[tableName].get(localId);
    }

    if (!localRecord) {
      // Check if we have a record with this supabaseId
      const existing = await db[tableName]
        .where('supabaseId')
        .equals(serverRecord.id)
        .first();
      localRecord = existing;
    }

    const mappedRecord = this.mapFromSupabase(tableName, serverRecord);

    if (!localRecord) {
      // New record from server - add it
      const newId = await db[tableName].add(mappedRecord);
      console.log(`[SyncManager] Added new ${tableName} record:`, newId);
    } else {
      // Existing record - check for conflicts
      const serverVersion = serverRecord.version || 0;
      const localVersion = localRecord.version || 0;

      if (localRecord.syncStatus === 'pending') {
        // Local has unsaved changes
        if (serverVersion > localVersion) {
          // Server is newer - mark as conflict
          await markAsConflict(tableName, localRecord.id);
          console.log(`[SyncManager] Conflict detected for ${tableName}:${localRecord.id}`);
        }
        // Otherwise local wins, will push on next sync
      } else {
        // No pending local changes - accept server version
        await db[tableName].update(localRecord.id, {
          ...mappedRecord,
          id: localRecord.id
        });
        console.log(`[SyncManager] Updated ${tableName}:${localRecord.id} from server`);
      }
    }
  }

  // Write to local DB and queue for sync
  async writeLocal(tableName, data, operation = 'upsert') {
    const timestamp = new Date().toISOString();
    const recordId = data.id || Date.now();

    // Add sync metadata
    const recordWithMeta = {
      ...data,
      id: recordId,
      syncStatus: 'pending',
      lastModified: timestamp
    };

    // Write to Dexie
    if (operation === 'delete') {
      await db[tableName].delete(recordId);
    } else {
      await db[tableName].put(recordWithMeta);
    }

    // Add to sync queue
    await addToSyncQueue(tableName, operation, recordId, recordWithMeta);

    // Attempt immediate sync if online
    if (this.isOnline && !this.isSyncing && this.storeId) {
      this.pushToServer().catch(err => {
        console.error('[SyncManager] Background sync failed:', err);
      });
    }

    return recordWithMeta;
  }

  // Map local Dexie format to Supabase format
  mapToSupabase(tableName, data) {
    const result = {
      local_id: data.id != null ? String(data.id) : null
    };

    // Field mappings (camelCase to snake_case)
    const mappings = {
      products: {
        pricePerKg: 'price_per_kg',
        pricePerSack: 'price_per_sack',
        kgPerSack: 'kg_per_sack',
        pricePerPiece: 'price_per_piece',
        pricePerBox: 'price_per_box',
        piecesPerBox: 'pieces_per_box',
        costPrice: 'cost_price',
        wholesalePrice: 'wholesale_price',
        wholesaleMin: 'wholesale_min',
        wholesaleMinKg: 'wholesale_min_kg'
      },
      inventory: {
        productId: 'product_id',
        lowStock: 'low_stock',
        stockSacks: 'stock_sacks',
        stockKg: 'stock_kg',
        stockUnits: 'stock_units',
        lowStockThreshold: 'low_stock_threshold'
      },
      display: {
        productId: 'product_id',
        productName: 'product_name',
        displayDate: 'display_date',
        originalKg: 'original_kg',
        remainingKg: 'remaining_kg',
        originalPieces: 'original_pieces',
        remainingPieces: 'remaining_pieces'
      },
      transactions: {
        transactionCode: 'transaction_code',
        transactionDate: 'transaction_date',
        paymentMethod: 'payment_method',
        cashierId: 'cashier_id'
      },
      settings: {
        // Settings use 'key' as identifier, value is JSON
      }
    };

    const tableMapping = mappings[tableName] || {};

    for (const [key, value] of Object.entries(data)) {
      // Skip internal fields
      if (['id', 'syncStatus', 'lastModified', 'supabaseId', 'version'].includes(key)) {
        continue;
      }

      // Use mapping if exists, otherwise use original key
      const mappedKey = tableMapping[key] || key;
      result[mappedKey] = value;
    }

    // Handle special case for transactions - id is transaction_code
    if (tableName === 'transactions' && data.id && typeof data.id === 'string') {
      result.transaction_code = data.id;
      result.transaction_date = data.date;
    }

    // Handle display table - ensure required fields have defaults
    if (tableName === 'display') {
      result.original_kg = result.original_kg ?? 0;
      result.remaining_kg = result.remaining_kg ?? 0;
      result.original_pieces = result.original_pieces ?? 0;
      result.remaining_pieces = result.remaining_pieces ?? 0;
    }

    // Add supabaseId if exists (for updates)
    if (data.supabaseId) {
      result.id = data.supabaseId;
    }

    return result;
  }

  // Map Supabase format to local Dexie format
  mapFromSupabase(tableName, data) {
    const result = {
      supabaseId: data.id,
      syncStatus: 'synced',
      lastModified: data.updated_at,
      version: data.version || 1
    };

    // Use local_id if available
    if (data.local_id) {
      result.id = data.local_id;
    }

    // Reverse field mappings (snake_case to camelCase)
    const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    const skipFields = ['id', 'local_id', 'store_id', 'created_at', 'updated_at', 'version', 'deleted_at'];

    for (const [key, value] of Object.entries(data)) {
      if (skipFields.includes(key)) continue;
      result[snakeToCamel(key)] = value;
    }

    // Handle special case for transactions
    if (tableName === 'transactions') {
      result.id = data.transaction_code;
      result.date = data.transaction_date;
    }

    return result;
  }

  // Get sync status
  getSyncStatus() {
    if (!this.isOnline) return 'offline';
    if (this.isSyncing) return 'syncing';
    return 'synced';
  }
}

// Create global sync manager instance
const syncManager = new SyncManager();

// ============================================
// Wrapped CRUD functions with sync support
// ============================================

// Add product with sync
async function addProductWithSync(product) {
  const result = await syncManager.writeLocal('products', product, 'insert');

  // Also add to inventory
  const inventoryItem = {
    id: result.id,
    name: product.name,
    category: product.category,
    lowStock: false,
    stockSacks: 0,
    stockKg: 0,
    stockUnits: 0
  };
  await syncManager.writeLocal('inventory', inventoryItem, 'insert');

  return result;
}

// Update product with sync
async function updateProductWithSync(id, changes) {
  const existing = await db.products.get(id);
  if (!existing) throw new Error('Product not found');

  const updated = { ...existing, ...changes };
  return await syncManager.writeLocal('products', updated, 'update');
}

// Delete product with sync
async function deleteProductWithSync(id) {
  const existing = await db.products.get(id);
  if (!existing) return;

  return await syncManager.writeLocal('products', existing, 'delete');
}

// Add transaction with sync
async function addTransactionWithSync(transaction) {
  return await syncManager.writeLocal('transactions', transaction, 'insert');
}

// Add display with sync
async function addDisplayWithSync(displayItem) {
  return await syncManager.writeLocal('display', displayItem, 'insert');
}

// Update display with sync
async function updateDisplayWithSync(id, changes) {
  const existing = await db.display.get(id);
  if (!existing) throw new Error('Display item not found');

  const updated = { ...existing, ...changes };
  return await syncManager.writeLocal('display', updated, 'update');
}

// Delete display with sync
async function deleteDisplayWithSync(id) {
  const existing = await db.display.get(id);
  if (!existing) return;

  return await syncManager.writeLocal('display', existing, 'delete');
}

// Add inventory with sync (for creating new inventory records)
async function addInventoryWithSync(inventoryItem) {
  return await syncManager.writeLocal('inventory', inventoryItem, 'insert');
}

// Update inventory with sync
async function updateInventoryWithSync(id, changes) {
  const existing = await db.inventory.get(id);
  if (!existing) throw new Error('Inventory item not found');

  const updated = { ...existing, ...changes };
  return await syncManager.writeLocal('inventory', updated, 'update');
}

// Delete inventory with sync
async function deleteInventoryWithSync(id) {
  const existing = await db.inventory.get(id);
  if (!existing) return;

  return await syncManager.writeLocal('inventory', existing, 'delete');
}

// Set setting with sync
async function setSettingWithSync(key, value) {
  const existing = await db.settings.get(key);
  const setting = {
    key,
    value,
    id: existing?.id || key // Use key as ID for settings
  };

  if (existing) {
    return await syncManager.writeLocal('settings', { ...existing, value }, 'update');
  } else {
    return await syncManager.writeLocal('settings', setting, 'insert');
  }
}

// ============================================
// Migration function for existing local data
// ============================================

async function migrateLocalDataToSupabase() {
  console.log('[SyncManager] Starting migration of local data...');

  const storeId = await getStoreId();
  if (!storeId) {
    throw new Error('No store ID - user must be logged in');
  }

  // Get all local data
  const products = await db.products.toArray();
  const inventory = await db.inventory.toArray();
  const display = await db.display.toArray();
  const transactions = await db.transactions.toArray();

  console.log(`[SyncManager] Migrating: ${products.length} products, ${inventory.length} inventory, ${display.length} display, ${transactions.length} transactions`);

  // Mark all as pending and add to sync queue
  for (const product of products) {
    if (!product.supabaseId) {
      await markAsPending('products', product.id);
      await addToSyncQueue('products', 'insert', product.id, product);
    }
  }

  for (const inv of inventory) {
    if (!inv.supabaseId) {
      await markAsPending('inventory', inv.id);
      await addToSyncQueue('inventory', 'insert', inv.id, inv);
    }
  }

  for (const disp of display) {
    if (!disp.supabaseId) {
      await markAsPending('display', disp.id);
      await addToSyncQueue('display', 'insert', disp.id, disp);
    }
  }

  for (const txn of transactions) {
    if (!txn.supabaseId) {
      await markAsPending('transactions', txn.id);
      await addToSyncQueue('transactions', 'insert', txn.id, txn);
    }
  }

  // Push all to server
  await syncManager.pushToServer();

  console.log('[SyncManager] Migration complete');
}

// ============================================
// Debug/Recovery Functions (for console use)
// ============================================

// Clear sync queue and retry sync (run after fixing Supabase schema)
async function clearAndResync() {
  console.log('[SyncManager] Clearing sync queue and preparing fresh sync...');

  // Clear the sync queue
  await clearSyncQueue();
  console.log('[SyncManager] Sync queue cleared');

  // Re-mark all local records as pending
  const tables = ['products', 'inventory', 'display', 'transactions'];

  for (const tableName of tables) {
    const records = await db[tableName].toArray();
    for (const record of records) {
      if (!record.supabaseId) {
        await markAsPending(tableName, record.id);
        await addToSyncQueue(tableName, 'upsert', record.id, record);
      }
    }
    console.log(`[SyncManager] Queued ${records.filter(r => !r.supabaseId).length} ${tableName} records for sync`);
  }

  // Trigger sync
  if (syncManager.isOnline && syncManager.storeId) {
    console.log('[SyncManager] Starting sync...');
    await syncManager.pushToServer();
    console.log('[SyncManager] Sync complete!');
  } else {
    console.log('[SyncManager] Will sync when online and authenticated');
  }
}

// View current sync queue status
async function viewSyncQueue() {
  const items = await getPendingSyncItems();
  console.log('[SyncManager] Sync queue has', items.length, 'items:');
  items.forEach(item => {
    console.log(`  - ${item.tableName}:${item.recordId} (${item.operation}) attempts: ${item.attempts}`);
  });
  return items;
}

// Expose to window for console access
window.clearAndResync = clearAndResync;
window.viewSyncQueue = viewSyncQueue;

console.log('[SyncManager] Module loaded');
