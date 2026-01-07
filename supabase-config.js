/* ============================================
   FlyHighManarang - Supabase Configuration
   ============================================ */

// Supabase project credentials
const SUPABASE_URL = 'https://picrojqhqvlvjdipylup.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpY3JvanFocXZsdmpkaXB5bHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mjg1NjAsImV4cCI6MjA4MzMwNDU2MH0.j2vzHfbpmEEUj23shSGKsznY93LvO0f4JarjPgnU2Jw';

// Initialize Supabase client (use different name to avoid conflict with window.supabase)
let supabaseClient = null;

// Initialize when Supabase JS is loaded
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    console.log('[Supabase] Client initialized');
    return supabaseClient;
  }
  console.warn('[Supabase] Library not loaded yet');
  return null;
}

// Get the Supabase client (lazy initialization)
function getSupabase() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

// ============================================
// Authentication Functions
// ============================================

// Sign up new user
async function supabaseSignUp(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const { data, error } = await client.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Sign in existing user
async function supabaseSignIn(email, password) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Sign out
async function supabaseSignOut() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

// Get current user
async function supabaseGetUser() {
  const client = getSupabase();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  return user;
}

// Get current session
async function supabaseGetSession() {
  const client = getSupabase();
  if (!client) return null;

  const { data: { session } } = await client.auth.getSession();
  return session;
}

// Listen to auth state changes
function onSupabaseAuthChange(callback) {
  const client = getSupabase();
  if (!client) return null;

  return client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ============================================
// Store Functions
// ============================================

// Get user's store ID
async function getStoreId() {
  const client = getSupabase();
  if (!client) return null;

  const user = await supabaseGetUser();
  if (!user) return null;

  const { data, error } = await client
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('[Supabase] Error getting store ID:', error);
    return null;
  }

  return data?.store_id;
}

// Get store details
async function getStoreDetails() {
  const client = getSupabase();
  if (!client) return null;

  const storeId = await getStoreId();
  if (!storeId) return null;

  const { data, error } = await client
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single();

  if (error) {
    console.error('[Supabase] Error getting store details:', error);
    return null;
  }

  return data;
}

// Update store name
async function updateStoreName(name) {
  const client = getSupabase();
  if (!client) return false;

  const storeId = await getStoreId();
  if (!storeId) return false;

  const { error } = await client
    .from('stores')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', storeId);

  if (error) {
    console.error('[Supabase] Error updating store name:', error);
    return false;
  }

  return true;
}

// ============================================
// Data Sync Functions
// ============================================

// Fetch all data for a table from Supabase
async function fetchFromSupabase(tableName, since = null) {
  const client = getSupabase();
  if (!client) return [];

  const storeId = await getStoreId();
  if (!storeId) return [];

  let query = client
    .from(tableName)
    .select('*')
    .eq('store_id', storeId)
    .is('deleted_at', null);

  if (since) {
    query = query.gt('updated_at', since);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[Supabase] Error fetching ${tableName}:`, error);
    return [];
  }

  return data || [];
}

// Upsert data to Supabase
async function upsertToSupabase(tableName, record) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const storeId = await getStoreId();
  if (!storeId) throw new Error('No store ID');

  // Convert local_id to string to match TEXT column type
  const dataWithStore = {
    ...record,
    store_id: storeId,
    local_id: record.local_id != null ? String(record.local_id) : null
  };

  // Convert product_id to string for display/inventory tables
  if ((tableName === 'display' || tableName === 'inventory') && dataWithStore.product_id != null) {
    dataWithStore.product_id = String(dataWithStore.product_id);
  }

  // Remove the Supabase id field if it's not a valid UUID (for new records)
  if (dataWithStore.id && typeof dataWithStore.id === 'number') {
    delete dataWithStore.id;
  }

  // Determine conflict resolution strategy
  let onConflict;
  if (tableName === 'transactions') {
    onConflict = 'store_id,transaction_code';
  } else if (dataWithStore.id) {
    // If we have a Supabase UUID, use it for conflict resolution
    onConflict = 'id';
  } else {
    // For new records, use store_id + local_id as unique constraint
    onConflict = 'store_id,local_id';
  }

  const { data, error } = await client
    .from(tableName)
    .upsert(dataWithStore, { onConflict })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Soft delete from Supabase
async function softDeleteFromSupabase(tableName, supabaseId) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const { error } = await client
    .from(tableName)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', supabaseId);

  if (error) throw error;
}

// ============================================
// Real-time Subscriptions
// ============================================

// Subscribe to table changes
function subscribeToTable(tableName, callback) {
  const client = getSupabase();
  if (!client) return null;

  return client
    .channel(`${tableName}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
}

// Unsubscribe from channel
async function unsubscribeFromChannel(channel) {
  const client = getSupabase();
  if (!client || !channel) return;

  await client.removeChannel(channel);
}

// ============================================
// Network Status
// ============================================

let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  document.dispatchEvent(new CustomEvent('network-status-change', { detail: 'online' }));
});

window.addEventListener('offline', () => {
  isOnline = false;
  document.dispatchEvent(new CustomEvent('network-status-change', { detail: 'offline' }));
});

function isNetworkOnline() {
  return isOnline;
}

console.log('[Supabase Config] Module loaded');
