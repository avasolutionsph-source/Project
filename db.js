/* ============================================
   FlyHighManarang - Dexie Database Setup
   Persistent local storage using IndexedDB
   With Supabase sync support
   ============================================ */

// Initialize Dexie Database
const db = new Dexie('FlyHighManarangDB');

// Define database schema (version 1)
db.version(1).stores({
  products: '++id, name, brand, category',
  inventory: 'id, name, category, lowStock',
  display: '++id, productId, openedDate',
  transactions: 'id, date, paymentMethod',
  settings: 'key'
});

// Version 2: Add users table for authentication
db.version(2).stores({
  products: '++id, name, brand, category',
  inventory: 'id, name, category, lowStock',
  display: '++id, productId, openedDate',
  transactions: 'id, date, paymentMethod',
  settings: 'key',
  users: '++id, username'
});

// Version 3: Add sync metadata for Supabase integration
db.version(3).stores({
  products: '++id, name, brand, category, supabaseId, syncStatus, lastModified',
  inventory: 'id, name, category, lowStock, supabaseId, syncStatus, lastModified',
  display: '++id, productId, openedDate, supabaseId, syncStatus, lastModified',
  transactions: 'id, date, paymentMethod, supabaseId, syncStatus, lastModified',
  settings: 'key, supabaseId',
  users: '++id, username, supabaseId',
  syncQueue: '++id, tableName, operation, recordId, createdAt, attempts',
  syncMeta: 'key'
});

// Default data flag
const DB_INITIALIZED_KEY = 'flyhigh_db_initialized';

// Check if database needs initialization
async function initializeDatabase() {
  const isInitialized = localStorage.getItem(DB_INITIALIZED_KEY);

  if (!isInitialized) {
    console.log('Initializing database with default data...');
    await seedDefaultData();
    localStorage.setItem(DB_INITIALIZED_KEY, 'true');
    console.log('Database initialized successfully!');
  } else {
    console.log('Database already initialized.');
  }
}

// Seed default demo data
async function seedDefaultData() {
  // Clear existing data first
  await db.products.clear();
  await db.inventory.clear();
  await db.display.clear();
  await db.transactions.clear();

  // Seed Products
  await db.products.bulkAdd(DEFAULT_PRODUCTS);

  // Seed Inventory
  await db.inventory.bulkAdd(DEFAULT_INVENTORY);

  // Seed Display
  await db.display.bulkAdd(DEFAULT_DISPLAY);

  // Seed Transactions
  await db.transactions.bulkAdd(DEFAULT_TRANSACTIONS);

  // Seed Settings
  await db.settings.put({ key: 'storeName', value: 'FlyHighManarang' });
  await db.settings.put({ key: 'darkMode', value: false });
}

// Reset database (for demo purposes)
async function resetDatabase() {
  localStorage.removeItem(DB_INITIALIZED_KEY);
  await db.delete();
  location.reload();
}

// ============================================
// Default Data (empty - user adds their own)
// ============================================

const DEFAULT_PRODUCTS = [];
const DEFAULT_INVENTORY = [];
const DEFAULT_DISPLAY = [];
const DEFAULT_TRANSACTIONS = [];

// ============================================
// Database Helper Functions
// ============================================

// Products
async function getAllProducts() {
  return await db.products.toArray();
}

async function getProductById(id) {
  return await db.products.get(id);
}

async function addProduct(product) {
  return await db.products.add(product);
}

async function updateProduct(id, changes) {
  return await db.products.update(id, changes);
}

async function deleteProductFromDB(id) {
  return await db.products.delete(id);
}

// Inventory
async function getAllInventory() {
  return await db.inventory.toArray();
}

async function getInventoryById(id) {
  return await db.inventory.get(id);
}

async function addInventory(inventoryItem) {
  return await db.inventory.put(inventoryItem);
}

async function updateInventory(id, changes) {
  return await db.inventory.update(id, changes);
}

// Display
async function getAllDisplay() {
  return await db.display.toArray();
}

async function addDisplay(displayItem) {
  return await db.display.add(displayItem);
}

async function updateDisplay(id, changes) {
  return await db.display.update(id, changes);
}

async function deleteDisplay(id) {
  return await db.display.delete(id);
}

// Transactions
async function getAllTransactions() {
  return await db.transactions.toArray();
}

async function addTransaction(transaction) {
  return await db.transactions.add(transaction);
}

async function getTransactionById(id) {
  return await db.transactions.get(id);
}

// Settings
async function getSetting(key) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : null;
}

async function setSetting(key, value) {
  return await db.settings.put({ key, value });
}

// Users
async function getAllUsers() {
  return await db.users.toArray();
}

async function getUserByUsername(username) {
  return await db.users.where('username').equalsIgnoreCase(username).first();
}

async function addUser(user) {
  return await db.users.add(user);
}

async function updateUser(id, changes) {
  return await db.users.update(id, changes);
}

async function deleteUser(id) {
  return await db.users.delete(id);
}

async function hasAnyUsers() {
  const count = await db.users.count();
  return count > 0;
}

// ============================================
// Sync Queue Functions (for Supabase sync)
// ============================================

// Add item to sync queue
async function addToSyncQueue(tableName, operation, recordId, data) {
  return await db.syncQueue.add({
    tableName,
    operation,
    recordId,
    data: JSON.stringify(data),
    createdAt: new Date().toISOString(),
    attempts: 0
  });
}

// Get all pending sync items
async function getPendingSyncItems() {
  return await db.syncQueue.toArray();
}

// Remove item from sync queue
async function removeSyncQueueItem(id) {
  return await db.syncQueue.delete(id);
}

// Update sync queue item attempts
async function updateSyncQueueAttempts(id, attempts, error = null) {
  return await db.syncQueue.update(id, {
    attempts,
    lastError: error
  });
}

// Clear sync queue
async function clearSyncQueue() {
  return await db.syncQueue.clear();
}

// ============================================
// Sync Metadata Functions
// ============================================

// Get sync metadata
async function getSyncMeta(key) {
  const meta = await db.syncMeta.get(key);
  return meta ? meta.value : null;
}

// Set sync metadata
async function setSyncMeta(key, value) {
  return await db.syncMeta.put({ key, value });
}

// Get last sync time
async function getLastSyncTime() {
  return await getSyncMeta('lastSyncTime');
}

// Set last sync time
async function setLastSyncTime(time) {
  return await setSyncMeta('lastSyncTime', time);
}

// Get store ID from local meta
async function getLocalStoreId() {
  return await getSyncMeta('storeId');
}

// Set store ID in local meta
async function setLocalStoreId(storeId) {
  return await setSyncMeta('storeId', storeId);
}

// ============================================
// Sync Status Helpers
// ============================================

// Mark record as pending sync
async function markAsPending(tableName, id) {
  return await db[tableName].update(id, {
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  });
}

// Mark record as synced
async function markAsSynced(tableName, id, supabaseId) {
  return await db[tableName].update(id, {
    syncStatus: 'synced',
    supabaseId: supabaseId,
    lastModified: new Date().toISOString()
  });
}

// Mark record as conflict
async function markAsConflict(tableName, id) {
  return await db[tableName].update(id, {
    syncStatus: 'conflict',
    lastModified: new Date().toISOString()
  });
}

// Get all pending records for a table
async function getPendingRecords(tableName) {
  return await db[tableName].where('syncStatus').equals('pending').toArray();
}

// Get all conflict records for a table
async function getConflictRecords(tableName) {
  return await db[tableName].where('syncStatus').equals('conflict').toArray();
}

console.log('Dexie database module loaded.');
