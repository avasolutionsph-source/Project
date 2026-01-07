/* ============================================
   FlyHighManarang - Dexie Database Setup
   Persistent local storage using IndexedDB
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

console.log('Dexie database module loaded.');
