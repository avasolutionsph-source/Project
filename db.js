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
// Default Data
// ============================================

const DEFAULT_PRODUCTS = [
  // CHICKEN FEEDS
  { id: 1, name: "Broiler Starter Crumble", brand: "B-Meg", category: "Feed", pricePerKg: 52, pricePerSack: 1250, kgPerSack: 25, costPrice: 1050, wholesalePrice: 1150, wholesaleMin: 5 },
  { id: 2, name: "Layer Pellet Premium", brand: "Vitarich", category: "Feed", pricePerKg: 48, pricePerSack: 1150, kgPerSack: 25, costPrice: 980, wholesalePrice: 1080, wholesaleMin: 5 },
  { id: 3, name: "Broiler Finisher Mash", brand: "Thunderbird", category: "Feed", pricePerKg: 50, pricePerSack: 1200, kgPerSack: 25, costPrice: 1000, wholesalePrice: 1100, wholesaleMin: 5 },
  { id: 4, name: "Native Chicken Feeds", brand: "San Miguel Foods", category: "Feed", pricePerKg: 46, pricePerSack: 1100, kgPerSack: 25, costPrice: 920, wholesalePrice: 1020, wholesaleMin: 5 },
  { id: 5, name: "Quail Layer Ration", brand: "B-Meg", category: "Feed", pricePerKg: 44, pricePerSack: 1050, kgPerSack: 25, costPrice: 880, wholesalePrice: 980, wholesaleMin: 5 },
  // HOG FEEDS
  { id: 6, name: "Hog Starter Pellet", brand: "B-Meg", category: "Feed", pricePerKg: 56, pricePerSack: 1350, kgPerSack: 25, costPrice: 1150, wholesalePrice: 1250, wholesaleMin: 5 },
  { id: 7, name: "Hog Grower Crumble", brand: "Pilmico", category: "Feed", pricePerKg: 55, pricePerSack: 1320, kgPerSack: 25, costPrice: 1120, wholesalePrice: 1220, wholesaleMin: 5 },
  { id: 8, name: "Hog Finisher Premium", brand: "Thunderbird", category: "Feed", pricePerKg: 54, pricePerSack: 1280, kgPerSack: 25, costPrice: 1080, wholesalePrice: 1180, wholesaleMin: 5 },
  { id: 9, name: "Sow & Piglet Starter", brand: "UNAHCO", category: "Feed", pricePerKg: 62, pricePerSack: 1480, kgPerSack: 25, costPrice: 1280, wholesalePrice: 1380, wholesaleMin: 5 },
  // DUCK FEEDS
  { id: 10, name: "Duck Starter Crumble", brand: "Vitarich", category: "Feed", pricePerKg: 48, pricePerSack: 1150, kgPerSack: 25, costPrice: 950, wholesalePrice: 1050, wholesaleMin: 5 },
  { id: 11, name: "Duck Grower Pellet", brand: "Pilmico", category: "Feed", pricePerKg: 49, pricePerSack: 1180, kgPerSack: 25, costPrice: 980, wholesalePrice: 1080, wholesaleMin: 5 },
  { id: 12, name: "Duck Layer Pellet", brand: "San Miguel Foods", category: "Feed", pricePerKg: 51, pricePerSack: 1220, kgPerSack: 25, costPrice: 1020, wholesalePrice: 1120, wholesaleMin: 5 },
  // FISH FEEDS
  { id: 13, name: "Tilapia Grower Float", brand: "Santeh", category: "Feed", pricePerKg: 58, pricePerSack: 1420, kgPerSack: 25, costPrice: 1220, wholesalePrice: 1320, wholesaleMin: 5 },
  { id: 14, name: "Bangus Starter", brand: "B-Meg Aqua", category: "Feed", pricePerKg: 62, pricePerSack: 1550, kgPerSack: 25, costPrice: 1350, wholesalePrice: 1450, wholesaleMin: 5 },
  // OTHER ANIMAL FEEDS
  { id: 15, name: "Cattle Fattener Mix", brand: "Feedpro", category: "Feed", pricePerKg: 58, pricePerSack: 1380, kgPerSack: 25, costPrice: 1180, wholesalePrice: 1280, wholesaleMin: 5 },
  // MEDICINES
  { id: 16, name: "Vetracin Gold Injectable", brand: "Unahco", category: "Medicine", pricePerPiece: 185, pricePerBox: 1750, piecesPerBox: 10, costPrice: 150, wholesalePrice: 165, wholesaleMin: 10 },
  { id: 17, name: "Albendazole Dewormer", brand: "Univet", category: "Medicine", pricePerPiece: 65, pricePerBox: 600, piecesPerBox: 10, costPrice: 50, wholesalePrice: 58, wholesaleMin: 10 },
  { id: 18, name: "Oxytetracycline Powder", brand: "Vetpharm", category: "Medicine", pricePerPiece: 95, pricePerBox: 880, piecesPerBox: 10, costPrice: 75, wholesalePrice: 85, wholesaleMin: 10 },
  { id: 19, name: "Terramycin Wound Spray", brand: "Zoetis", category: "Medicine", pricePerPiece: 285, pricePerBox: 2700, piecesPerBox: 10, costPrice: 240, wholesalePrice: 260, wholesaleMin: 5 },
  { id: 20, name: "Ivermectin Injectable", brand: "Kepro", category: "Medicine", pricePerPiece: 320, pricePerBox: 3000, piecesPerBox: 10, costPrice: 270, wholesalePrice: 295, wholesaleMin: 5 },
  // VITAMINS
  { id: 21, name: "Amino Acid Supplement", brand: "Vetsearch", category: "Vitamins", pricePerPiece: 145, pricePerBox: 1350, piecesPerBox: 10, costPrice: 115, wholesalePrice: 130, wholesaleMin: 10 },
  { id: 22, name: "Calcium-Phosphorus Mix", brand: "Zagro", category: "Vitamins", pricePerPiece: 125, pricePerBox: 1150, piecesPerBox: 10, costPrice: 100, wholesalePrice: 112, wholesaleMin: 10 },
  { id: 23, name: "Electrolyte Plus", brand: "Biotech", category: "Vitamins", pricePerPiece: 85, pricePerBox: 780, piecesPerBox: 10, costPrice: 65, wholesalePrice: 75, wholesaleMin: 10 },
  { id: 24, name: "Vitamin B-Complex", brand: "Bayer", category: "Vitamins", pricePerPiece: 195, pricePerBox: 1850, piecesPerBox: 10, costPrice: 160, wholesalePrice: 178, wholesaleMin: 5 },
  // ACCESSORIES
  { id: 25, name: "Nipple Drinker Set", brand: "AgriTech", category: "Accessories", pricePerPiece: 85, pricePerBox: 780, piecesPerBox: 10, costPrice: 65, wholesalePrice: 75, wholesaleMin: 20 },
  { id: 26, name: "Tube Feeder 5kg", brand: "FarmPlus", category: "Accessories", pricePerPiece: 220, pricePerBox: 2000, piecesPerBox: 10, costPrice: 180, wholesalePrice: 198, wholesaleMin: 10 },
  { id: 27, name: "Brooder Heat Lamp", brand: "PhilAgri", category: "Accessories", pricePerPiece: 450, pricePerBox: 4200, piecesPerBox: 10, costPrice: 380, wholesalePrice: 420, wholesaleMin: 5 },
  // GROOMING
  { id: 28, name: "Perla Dog Shampoo", brand: "Perla", category: "Grooming", pricePerPiece: 125, pricePerBox: 1150, piecesPerBox: 10, costPrice: 100, wholesalePrice: 112, wholesaleMin: 12 },
  { id: 29, name: "Tick & Flea Powder", brand: "Bob Martin", category: "Grooming", pricePerPiece: 165, pricePerBox: 1550, piecesPerBox: 10, costPrice: 135, wholesalePrice: 150, wholesaleMin: 10 },
  { id: 30, name: "Pet Brush Double-Sided", brand: "PetCare", category: "Grooming", pricePerPiece: 95, pricePerBox: 880, piecesPerBox: 10, costPrice: 75, wholesalePrice: 85, wholesaleMin: 15 },
  // TREATS
  { id: 31, name: "Pedigree Dentastix", brand: "Pedigree", category: "Treats", pricePerPiece: 45, pricePerBox: 420, piecesPerBox: 10, costPrice: 35, wholesalePrice: 40, wholesaleMin: 20 },
  { id: 32, name: "Bow Wow Beef Jerky", brand: "Bow Wow", category: "Treats", pricePerPiece: 35, pricePerBox: 320, piecesPerBox: 10, costPrice: 28, wholesalePrice: 32, wholesaleMin: 20 },
  { id: 33, name: "Whiskas Temptations", brand: "Whiskas", category: "Treats", pricePerPiece: 55, pricePerBox: 500, piecesPerBox: 10, costPrice: 42, wholesalePrice: 48, wholesaleMin: 15 }
];

const DEFAULT_INVENTORY = [
  // Feeds
  { id: 1, name: "Broiler Starter Crumble", category: "Feed", stockKg: 625, stockSacks: 25, lowStock: false },
  { id: 2, name: "Layer Pellet Premium", category: "Feed", stockKg: 500, stockSacks: 20, lowStock: false },
  { id: 3, name: "Broiler Finisher Mash", category: "Feed", stockKg: 375, stockSacks: 15, lowStock: false },
  { id: 4, name: "Native Chicken Feeds", category: "Feed", stockKg: 250, stockSacks: 10, lowStock: false },
  { id: 5, name: "Quail Layer Ration", category: "Feed", stockKg: 125, stockSacks: 5, lowStock: true },
  { id: 6, name: "Hog Starter Pellet", category: "Feed", stockKg: 500, stockSacks: 20, lowStock: false },
  { id: 7, name: "Hog Grower Crumble", category: "Feed", stockKg: 375, stockSacks: 15, lowStock: false },
  { id: 8, name: "Hog Finisher Premium", category: "Feed", stockKg: 250, stockSacks: 10, lowStock: false },
  { id: 9, name: "Sow & Piglet Starter", category: "Feed", stockKg: 125, stockSacks: 5, lowStock: true },
  { id: 10, name: "Duck Starter Crumble", category: "Feed", stockKg: 250, stockSacks: 10, lowStock: false },
  { id: 11, name: "Duck Grower Pellet", category: "Feed", stockKg: 200, stockSacks: 8, lowStock: false },
  { id: 12, name: "Duck Layer Pellet", category: "Feed", stockKg: 150, stockSacks: 6, lowStock: true },
  { id: 13, name: "Tilapia Grower Float", category: "Feed", stockKg: 300, stockSacks: 12, lowStock: false },
  { id: 14, name: "Bangus Starter", category: "Feed", stockKg: 175, stockSacks: 7, lowStock: false },
  { id: 15, name: "Cattle Fattener Mix", category: "Feed", stockKg: 200, stockSacks: 8, lowStock: false },
  // Medicines
  { id: 16, name: "Vetracin Gold Injectable", category: "Medicine", stockUnits: 45, lowStock: false },
  { id: 17, name: "Albendazole Dewormer", category: "Medicine", stockUnits: 80, lowStock: false },
  { id: 18, name: "Oxytetracycline Powder", category: "Medicine", stockUnits: 35, lowStock: false },
  { id: 19, name: "Terramycin Wound Spray", category: "Medicine", stockUnits: 20, lowStock: false },
  { id: 20, name: "Ivermectin Injectable", category: "Medicine", stockUnits: 15, lowStock: true },
  // Vitamins
  { id: 21, name: "Amino Acid Supplement", category: "Vitamins", stockUnits: 60, lowStock: false },
  { id: 22, name: "Calcium-Phosphorus Mix", category: "Vitamins", stockUnits: 50, lowStock: false },
  { id: 23, name: "Electrolyte Plus", category: "Vitamins", stockUnits: 75, lowStock: false },
  { id: 24, name: "Vitamin B-Complex", category: "Vitamins", stockUnits: 30, lowStock: false },
  // Accessories
  { id: 25, name: "Nipple Drinker Set", category: "Accessories", stockUnits: 100, lowStock: false },
  { id: 26, name: "Tube Feeder 5kg", category: "Accessories", stockUnits: 40, lowStock: false },
  { id: 27, name: "Brooder Heat Lamp", category: "Accessories", stockUnits: 12, lowStock: true },
  // Grooming
  { id: 28, name: "Perla Dog Shampoo", category: "Grooming", stockUnits: 55, lowStock: false },
  { id: 29, name: "Tick & Flea Powder", category: "Grooming", stockUnits: 40, lowStock: false },
  { id: 30, name: "Pet Brush Double-Sided", category: "Grooming", stockUnits: 25, lowStock: false },
  // Treats
  { id: 31, name: "Pedigree Dentastix", category: "Treats", stockUnits: 85, lowStock: false },
  { id: 32, name: "Bow Wow Beef Jerky", category: "Treats", stockUnits: 70, lowStock: false },
  { id: 33, name: "Whiskas Temptations", category: "Treats", stockUnits: 45, lowStock: false }
];

const DEFAULT_DISPLAY = [
  { id: 1, productId: 1, productName: "Broiler Starter Crumble", openedDate: new Date().toISOString(), originalKg: 25, remainingKg: 18.5 },
  { id: 2, productId: 6, productName: "Hog Starter Pellet", openedDate: new Date(Date.now() - 86400000).toISOString(), originalKg: 25, remainingKg: 12.25 },
  { id: 3, productId: 2, productName: "Layer Pellet Premium", openedDate: new Date(Date.now() - 172800000).toISOString(), originalKg: 25, remainingKg: 8.75 }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: "TXN-20251228-001",
    date: "2025-12-28T14:30:00",
    items: [
      { productId: 1, name: "Broiler Starter Crumble", brand: "B-Meg", quantity: 2, unit: "sack", unitPrice: 1250, price: 2500 },
      { productId: 16, name: "Vetracin Gold Injectable", brand: "Unahco", quantity: 1, unit: "piece", unitPrice: 185, price: 185 }
    ],
    subtotal: 2685,
    total: 2685,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251228-002",
    date: "2025-12-28T12:15:00",
    items: [
      { productId: 6, name: "Hog Starter Pellet", brand: "B-Meg", quantity: 5, unit: "sack", unitPrice: 1350, price: 6750 }
    ],
    subtotal: 6750,
    total: 6750,
    paymentMethod: "GCash"
  },
  {
    id: "TXN-20251228-003",
    date: "2025-12-28T10:45:00",
    items: [
      { productId: 2, name: "Layer Pellet Premium", brand: "Vitarich", quantity: 3, unit: "sack", unitPrice: 1150, price: 3450 },
      { productId: 21, name: "Amino Acid Supplement", brand: "Vetsearch", quantity: 2, unit: "piece", unitPrice: 145, price: 290 }
    ],
    subtotal: 3740,
    total: 3740,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251227-001",
    date: "2025-12-27T16:20:00",
    items: [
      { productId: 11, name: "Duck Grower Pellet", brand: "Pilmico", quantity: 2, unit: "sack", unitPrice: 1180, price: 2360 }
    ],
    subtotal: 2360,
    total: 2360,
    paymentMethod: "Maya"
  },
  {
    id: "TXN-20251227-002",
    date: "2025-12-27T14:00:00",
    items: [
      { productId: 1, name: "Broiler Starter Crumble", brand: "B-Meg", quantity: 10, unit: "sack", unitPrice: 1150, price: 11500 }
    ],
    subtotal: 11500,
    total: 11500,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251227-003",
    date: "2025-12-27T09:30:00",
    items: [
      { productId: 25, name: "Nipple Drinker Set", brand: "AgriTech", quantity: 5, unit: "piece", unitPrice: 85, price: 425 },
      { productId: 26, name: "Tube Feeder 5kg", brand: "FarmPlus", quantity: 3, unit: "piece", unitPrice: 220, price: 660 }
    ],
    subtotal: 1085,
    total: 1085,
    paymentMethod: "GCash"
  },
  {
    id: "TXN-20251226-001",
    date: "2025-12-26T15:45:00",
    items: [
      { productId: 8, name: "Hog Finisher Premium", brand: "Thunderbird", quantity: 8, unit: "sack", unitPrice: 1280, price: 10240 }
    ],
    subtotal: 10240,
    total: 10240,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251226-002",
    date: "2025-12-26T11:20:00",
    items: [
      { productId: 17, name: "Albendazole Dewormer", brand: "Univet", quantity: 10, unit: "piece", unitPrice: 65, price: 650 },
      { productId: 20, name: "Ivermectin Injectable", brand: "Kepro", quantity: 5, unit: "piece", unitPrice: 320, price: 1600 }
    ],
    subtotal: 2250,
    total: 2250,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251225-001",
    date: "2025-12-25T13:00:00",
    items: [
      { productId: 13, name: "Tilapia Grower Float", brand: "Santeh", quantity: 6, unit: "sack", unitPrice: 1420, price: 8520 }
    ],
    subtotal: 8520,
    total: 8520,
    paymentMethod: "Cash"
  },
  {
    id: "TXN-20251224-001",
    date: "2025-12-24T17:30:00",
    items: [
      { productId: 28, name: "Perla Dog Shampoo", brand: "Perla", quantity: 3, unit: "piece", unitPrice: 125, price: 375 },
      { productId: 29, name: "Tick & Flea Powder", brand: "Bob Martin", quantity: 2, unit: "piece", unitPrice: 165, price: 330 }
    ],
    subtotal: 705,
    total: 705,
    paymentMethod: "Maya"
  }
];

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

console.log('Dexie database module loaded.');
