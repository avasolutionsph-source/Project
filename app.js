/* ============================================
   FlyHighManarang PWA - JavaScript
   Animal Feed & Veterinary Medicine Shop
   Demo Frontend Logic
   ============================================ */

// ============================================
// App Configuration
// ============================================

const APP_DATA = {
  storeName: "FlyHighManarang",
  currency: "PHP",
  currencySymbol: "₱"
};


const FEED_UNITS = [
  { value: "sack", label: "Sack", multiplier: "sack" },
  { value: "0.25", label: "0.25 KG", multiplier: 0.25 },
  { value: "0.50", label: "0.50 KG", multiplier: 0.50 },
  { value: "0.75", label: "0.75 KG", multiplier: 0.75 },
  { value: "1.00", label: "1.00 KG", multiplier: 1.00 },
  { value: "custom", label: "Custom KG", multiplier: "custom" }
];



// ============================================
// Security Helpers
// ============================================

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ============================================
// State Management
// ============================================

let currentProductImage = null;

let state = {
  currentScreen: "dashboard",
  cart: [],
  cartTotal: 0,
  selectedProduct: null,
  selectedUnit: null,
  customKg: 0,
  quantity: 1,
  paymentMethod: "Cash",
  darkMode: false,
  storeName: APP_DATA.storeName,
  products: [],
  inventory: [],
  display: [],
  transactions: [],
  editingProductId: null,
  posSearchTerm: "",
  posCurrentCategory: "all",
  salesHistoryFilter: "today",
  salesHistoryPayment: "all",
  salesHistorySearch: "",
  currentUser: null
};

// ============================================
// Initialize App
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  try {
    // Initialize database with default data if first time
    await initializeDatabase();

    // Check authentication status
    await checkAuthStatus();

  } catch (error) {
    console.error("Error initializing app:", error);
    showToast("Error loading data. Please refresh.");
  }
}

// Check if user is logged in or needs to set up account
async function checkAuthStatus() {
  // Initialize Supabase
  initSupabase();

  try {
    // Check for existing Supabase session
    const session = await supabaseGetSession();

    if (session && session.user) {
      // User is logged in via Supabase
      state.currentUser = {
        id: session.user.id,
        email: session.user.email,
        role: 'admin'
      };
      await initializeMainApp();
    } else {
      // No session - show login form
      showLoginForm();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    // Fallback to login form
    showLoginForm();
  }
}

// Show login form
function showLoginForm() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('setup-form').style.display = 'none';
  document.getElementById('login-error').classList.remove('show');
  document.getElementById('auth-switch-link').style.display = 'block';
}

// Show setup form (create account)
function showSetupForm() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('setup-form').style.display = 'block';
  document.getElementById('setup-error').classList.remove('show');
  document.getElementById('auth-switch-link').style.display = 'none';
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    errorEl.classList.add('show');
    return;
  }

  // Disable button during login
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const data = await supabaseSignIn(email, password);

    if (data && data.user) {
      // Login successful
      state.currentUser = {
        id: data.user.id,
        email: data.user.email,
        role: 'admin'
      };

      errorEl.classList.remove('show');
      showToast('Welcome back!');
      await initializeMainApp();
    }
  } catch (error) {
    console.error('Login error:', error);
    errorEl.textContent = error.message || 'Invalid email or password';
    errorEl.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
}

// Handle signup/create account
async function handleSetup(event) {
  event.preventDefault();

  const email = document.getElementById('setup-email').value.trim();
  const password = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-confirm').value;
  const errorEl = document.getElementById('setup-error');
  const submitBtn = event.target.querySelector('button[type="submit"]');

  if (!email || !password || !confirm) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.classList.add('show');
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    errorEl.classList.add('show');
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.classList.add('show');
    return;
  }

  // Disable button during signup
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    const data = await supabaseSignUp(email, password);

    if (data && data.user) {
      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        errorEl.textContent = 'This email is already registered. Please login instead.';
        errorEl.classList.add('show');
        return;
      }

      // Signup successful - auto login
      state.currentUser = {
        id: data.user.id,
        email: data.user.email,
        role: 'admin'
      };

      errorEl.classList.remove('show');
      showToast('Account created! Welcome to FlyHighManarang');

      // Check for existing local data to migrate
      const localProducts = await db.products.count();
      if (localProducts > 0) {
        showToast('Migrating existing data to cloud...');
        try {
          await migrateLocalDataToSupabase();
          showToast('Data migrated successfully!');
        } catch (migError) {
          console.error('Migration error:', migError);
          showToast('Data will sync when connection is stable');
        }
      }

      await initializeMainApp();
    }
  } catch (error) {
    console.error('Signup error:', error);
    errorEl.textContent = error.message || 'Error creating account. Please try again.';
    errorEl.classList.add('show');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.parentElement) return;
  const btn = input.parentElement.querySelector('.toggle-password');
  if (!btn) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>`;
  } else {
    input.type = 'password';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>`;
  }
}

// Logout
async function logout() {
  if (!confirm('Are you sure you want to logout?')) return;

  try {
    await supabaseSignOut();
  } catch (error) {
    console.error('Logout error:', error);
  }

  state.currentUser = null;
  localStorage.removeItem('flyhigh_current_user');
  showLoginForm();
  showToast('Logged out successfully');
}

// Initialize main app after successful login
async function initializeMainApp() {
  // Hide login, show loading screen
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-loading').style.display = 'flex';
  document.getElementById('app').style.display = 'none';

  const statusEl = document.getElementById('loading-status');
  const progressBar = document.getElementById('loading-progress-bar');

  try {
    // Update loading status helper
    const updateLoadingStatus = (message, progress) => {
      if (statusEl) statusEl.textContent = message;
      if (progressBar) progressBar.style.width = `${progress}%`;
    };

    updateLoadingStatus('Loading database...', 10);
    await loadDataFromDB();

    updateLoadingStatus('Loading preferences...', 25);
    await loadPreferences();

    updateLoadingStatus('Connecting to cloud...', 40);
    await initializeSyncManager();

    updateLoadingStatus('Setting up navigation...', 55);
    setupNavigation();
    initSidebarState();

    updateLoadingStatus('Rendering products...', 70);
    renderProducts();
    renderInventory();
    renderProductsTable();
    renderDisplay();

    updateLoadingStatus('Preparing dashboard...', 85);
    renderUserMenu();
    initSalesOverview();
    initTopMovingProducts();
    generateNotifications();

    updateLoadingStatus('Finalizing...', 95);
    updateTime();
    setInterval(updateTime, 1000);
    registerServiceWorker();
    setupInstallPrompt();
    setupSyncStatusListener();

    updateLoadingStatus('Ready!', 100);

    // Brief delay to show 100% completion
    await new Promise(resolve => setTimeout(resolve, 300));

    // Hide loading, show app
    document.getElementById('app-loading').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    console.log("FlyHighManarang PWA initialized with Supabase sync!");
  } catch (error) {
    console.error('App initialization error:', error);
    if (statusEl) statusEl.textContent = 'Error loading app. Please refresh.';
    if (progressBar) progressBar.style.background = 'var(--danger)';
  }
}

// Initialize sync manager and perform initial sync
async function initializeSyncManager() {
  try {
    await syncManager.initialize();
    updateSyncStatusUI(syncManager.getSyncStatus());
  } catch (error) {
    console.error('Sync manager init error:', error);
    updateSyncStatusUI('offline');
  }
}

// Listen for sync status changes
function setupSyncStatusListener() {
  document.addEventListener('sync-status-change', (event) => {
    const { status, message } = event.detail;
    updateSyncStatusUI(status, message);
  });

  // Also listen for network changes
  document.addEventListener('network-status-change', (event) => {
    updateSyncStatusUI(event.detail === 'online' ? 'synced' : 'offline');
  });
}

// Update sync status UI
function updateSyncStatusUI(status, message = '') {
  const syncIcon = document.getElementById('sync-icon');
  const syncText = document.getElementById('sync-text');

  if (!syncIcon || !syncText) return;

  // Remove all status classes
  syncIcon.className = 'sync-icon';

  switch (status) {
    case 'synced':
      syncIcon.classList.add('synced');
      syncText.textContent = 'Synced';
      break;
    case 'syncing':
      syncIcon.classList.add('syncing');
      syncText.textContent = 'Syncing...';
      break;
    case 'offline':
      syncIcon.classList.add('offline');
      syncText.textContent = 'Offline';
      break;
    case 'error':
      syncIcon.classList.add('error');
      syncText.textContent = message || 'Sync Error';
      break;
    case 'online':
      syncIcon.classList.add('synced');
      syncText.textContent = 'Online';
      break;
    default:
      syncIcon.classList.add('offline');
      syncText.textContent = status;
  }
}

// Render user menu in sidebar
function renderUserMenu() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const existingMenu = sidebar.querySelector('.user-menu');

  if (existingMenu) {
    existingMenu.remove();
  }

  if (!state.currentUser) return;

  // Get display name - use email or username
  const displayName = state.currentUser.email || state.currentUser.username || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();
  const shortName = displayName.includes('@') ? displayName.split('@')[0] : displayName;

  const userMenu = document.createElement('div');
  userMenu.className = 'user-menu';
  userMenu.innerHTML = `
    <div class="user-info">
      <div class="user-avatar">${userInitial}</div>
      <div class="user-details">
        <div class="user-name">${shortName}</div>
        <div class="user-role">${state.currentUser.role || 'Admin'}</div>
      </div>
    </div>
    <button class="btn-logout" onclick="logout()">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      Logout
    </button>
  `;

  sidebar.appendChild(userMenu);
}

// Load all data from IndexedDB into state
async function loadDataFromDB() {
  state.products = await getAllProducts();
  state.inventory = await getAllInventory();
  state.display = await getAllDisplay();
  state.transactions = await getAllTransactions();

  // Ensure all products have inventory records
  await syncProductsWithInventory();

  // Migrate display data to new format (remainingPieces for non-feed)
  await migrateDisplayData();

  // Update dashboard counts
  document.getElementById("total-products").textContent = state.products.length;
  document.getElementById("low-stock-items").textContent = state.inventory.filter(i => i.lowStock).length;
}

// Migrate old display data to new format with remainingPieces
async function migrateDisplayData() {
  for (const display of state.display) {
    const product = state.products.find(p => p.id === display.productId);
    if (!product) continue;

    const isFeed = product.category === "Feed";

    // Skip if already migrated or is Feed product
    if (isFeed || display.remainingPieces !== undefined) continue;

    // Migrate non-feed display to use remainingPieces
    const piecesPerBox = product.piecesPerBox || 1;
    display.originalPieces = piecesPerBox;
    display.remainingPieces = display.remainingKg || piecesPerBox; // Use remainingKg as fallback
    display.category = product.category;

    // Save to DB
    await updateDisplay(display.id, {
      originalPieces: display.originalPieces,
      remainingPieces: display.remainingPieces,
      category: display.category
    });

    console.log(`[Migration] Updated display ${display.id} for ${product.name}: ${display.remainingPieces} pieces`);
  }
}

// Ensure every product has an inventory record
async function syncProductsWithInventory() {
  for (const product of state.products) {
    const existingInventory = state.inventory.find(i => i.id === product.id);
    if (!existingInventory) {
      // Create inventory record for this product with sync support
      const newInventory = {
        id: product.id,
        name: product.name,
        category: product.category,
        lowStock: false,
        stockSacks: 0,
        stockKg: 0,
        stockUnits: 0
      };
      state.inventory.push(newInventory);
      await addInventoryWithSync(newInventory);
      console.log(`[Sync] Created inventory record for product: ${product.name}`);
    }
  }
}

function loadPreferences() {
  const savedDarkMode = localStorage.getItem("darkMode");
  const savedStoreName = localStorage.getItem("storeName");

  if (savedDarkMode !== null) {
    state.darkMode = savedDarkMode === "true";
  }

  if (savedStoreName) {
    state.storeName = savedStoreName;
    document.getElementById("store-name-display").textContent = savedStoreName;
    document.getElementById("store-name-input").value = savedStoreName;
  }

  applyTheme();
}

function applyTheme() {
  if (state.darkMode) {
    document.body.classList.remove("light-mode");
    document.getElementById("dark-mode-toggle").checked = true;
  } else {
    document.body.classList.add("light-mode");
    document.getElementById("dark-mode-toggle").checked = false;
  }
}

// ============================================
// Navigation
// ============================================

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const screen = item.dataset.screen;
      navigateTo(screen);
    });
  });
}

function navigateTo(screen) {
  // Update state
  state.currentScreen = screen;

  // Update nav items
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.dataset.screen === screen) {
      item.classList.add("active");
    }
  });

  // Update screens
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
  });
  document.getElementById(`${screen}-screen`).classList.add("active");

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    pos: "Point of Sale",
    "sales-history": "Sales History",
    display: "Display",
    inventory: "Inventory",
    products: "Products",
    "ava-ai": "Ava AI",
    settings: "Settings"
  };
  document.getElementById("page-title").textContent = titles[screen];

  // Show/hide global search based on screen
  const globalSearch = document.getElementById("global-search");
  const searchableScreens = ["display", "inventory", "products"];
  if (searchableScreens.includes(screen)) {
    globalSearch.style.display = "block";
    globalSearch.placeholder = `Search ${titles[screen].toLowerCase()}...`;
    globalSearch.value = "";
  } else {
    globalSearch.style.display = "none";
    globalSearch.value = "";
  }

  // Render Ava AI insights when navigating to that screen
  if (screen === "ava-ai") {
    renderAvaAI();
  }

  // Render Sales History when navigating to that screen
  if (screen === "sales-history") {
    renderSalesHistory();
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const body = document.body;

  // Toggle collapsed state
  sidebar.classList.toggle("collapsed");
  body.classList.toggle("sidebar-collapsed");

  // Save preference to localStorage
  const isCollapsed = sidebar.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const body = document.body;
  sidebar.classList.add("collapsed");
  body.classList.add("sidebar-collapsed");
  localStorage.setItem("sidebarCollapsed", "true");
}

// Initialize sidebar state from localStorage
function initSidebarState() {
  const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  const sidebar = document.getElementById("sidebar");
  const body = document.body;

  if (isCollapsed && sidebar) {
    sidebar.classList.add("collapsed");
    body.classList.add("sidebar-collapsed");
  }
}

// ============================================
// Time Update
// ============================================

function updateTime() {
  const now = new Date();
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  document.getElementById("current-time").textContent = now.toLocaleDateString('en-US', options);
}

// ============================================
// Theme Toggle
// ============================================

async function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("darkMode", state.darkMode);
  applyTheme();

  // Sync dark mode setting to Supabase
  try {
    await setSettingWithSync('darkMode', state.darkMode);
  } catch (error) {
    console.error('[Settings] Failed to sync dark mode:', error);
  }
}

// ============================================
// Helper Functions
// ============================================

function getCategoryIcon(category) {
  const icons = {
    "Feed": "FEED",
    "Medicine": "MED",
    "Vitamins": "VIT",
    "Accessories": "ACC",
    "Grooming": "GRM",
    "Treats": "TRT"
  };
  return icons[category] || "ITEM";
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Month names for display
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ============================================
// Dashboard Data Functions (Real Data from Transactions)
// ============================================

// State for profit period selection
let profitPeriod = 'today'; // 'today', 'week', 'month', 'year', 'total'
let profitSoldPeriod = 'today'; // Separate period for profit by product section
let reportsPeriod = 'today'; // Period for financial reports section

// Calculate profit from transactions
function getProfitDataFromTransactions() {
  const transactions = state.transactions;
  const products = state.products;
  const now = new Date();
  const today = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Create product lookup for cost prices
  const productCostMap = {};
  products.forEach(p => {
    productCostMap[p.id] = p.costPrice || 0;
  });

  // Calculate profit for each period
  let todayProfit = 0, todayRevenue = 0, todayCost = 0;
  let weekProfit = 0, weekRevenue = 0, weekCost = 0;
  let monthProfit = 0, monthRevenue = 0, monthCost = 0;
  let yearProfit = 0, yearRevenue = 0, yearCost = 0;
  let totalProfit = 0, totalRevenue = 0, totalCost = 0;

  transactions.forEach(txn => {
    const txnDate = new Date(txn.date);
    const txnDateStr = txnDate.toDateString();

    // Calculate cost for this transaction based on items
    let txnCost = 0;
    if (txn.items && Array.isArray(txn.items)) {
      txn.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const costPrice = productCostMap[item.productId] || 0; // Cost per sack for feeds, cost per piece for non-feeds
        const kgPerSack = product?.kgPerSack || 25;
        const piecesPerBox = product?.piecesPerBox || 1;

        // Calculate cost based on quantity sold
        // For feeds: costPrice is cost PER SACK, so divide by kgPerSack to get cost per kg
        if (item.kgAmount > 0) {
          // Feed sold by kg - convert costPrice (per sack) to per kg
          const costPerKg = costPrice / kgPerSack;
          txnCost += costPerKg * item.kgAmount;
        } else if (item.unit && item.unit.toUpperCase().includes('KG')) {
          // Fallback for old transactions: parse KG from unit string
          const kgMatch = item.unit.match(/^([\d.]+)\s*KG/i);
          if (kgMatch) {
            const kgAmount = parseFloat(kgMatch[1]);
            const costPerKg = costPrice / kgPerSack;
            txnCost += costPerKg * kgAmount;
          } else {
            txnCost += costPrice * (item.quantity || 1);
          }
        } else if (item.sackAmount > 0 || (item.unit && item.unit.toUpperCase().includes('SACK'))) {
          // Feed sold by sack - costPrice is already per sack
          txnCost += costPrice * (item.sackAmount || item.quantity || 1);
        } else if (item.pieceAmount > 0) {
          // Non-feed sold by piece - costPrice is per BOX, divide by piecesPerBox
          const costPerPiece = costPrice / piecesPerBox;
          txnCost += costPerPiece * item.pieceAmount;
        } else if (item.boxAmount > 0 || (item.unit && item.unit.toUpperCase().includes('BOX'))) {
          // Non-feed sold by box - costPrice is per BOX
          txnCost += costPrice * (item.boxAmount || item.quantity || 1);
        } else {
          // Fallback: use quantity
          txnCost += costPrice * (item.quantity || 1);
        }
      });
    }

    const txnRevenue = txn.total || 0;
    const txnProfit = txnRevenue - txnCost;

    // Total (all-time)
    totalRevenue += txnRevenue;
    totalCost += txnCost;
    totalProfit += txnProfit;

    // This year
    if (txnDate >= startOfYear) {
      yearRevenue += txnRevenue;
      yearCost += txnCost;
      yearProfit += txnProfit;
    }

    // This month
    if (txnDate >= startOfMonth) {
      monthRevenue += txnRevenue;
      monthCost += txnCost;
      monthProfit += txnProfit;
    }

    // This week
    if (txnDate >= startOfWeek) {
      weekRevenue += txnRevenue;
      weekCost += txnCost;
      weekProfit += txnProfit;
    }

    // Today
    if (txnDateStr === today) {
      todayRevenue += txnRevenue;
      todayCost += txnCost;
      todayProfit += txnProfit;
    }
  });

  return {
    today: { profit: todayProfit, revenue: todayRevenue, cost: todayCost },
    week: { profit: weekProfit, revenue: weekRevenue, cost: weekCost },
    month: { profit: monthProfit, revenue: monthRevenue, cost: monthCost },
    year: { profit: yearProfit, revenue: yearRevenue, cost: yearCost },
    total: { profit: totalProfit, revenue: totalRevenue, cost: totalCost }
  };
}

// Update profit display
function updateProfitDisplay() {
  const profitData = getProfitDataFromTransactions();
  const data = profitData[profitPeriod];

  const profitAmountEl = document.getElementById('profit-amount');
  const profitRevenueEl = document.getElementById('profit-revenue');
  const profitCostEl = document.getElementById('profit-cost');
  const profitMarginEl = document.getElementById('profit-margin');

  if (profitAmountEl) {
    profitAmountEl.textContent = formatNumber(data.profit);
    profitAmountEl.className = data.profit >= 0 ? 'profit-positive' : 'profit-negative';
  }

  if (profitRevenueEl) {
    profitRevenueEl.textContent = `₱${formatNumber(data.revenue)}`;
  }

  if (profitCostEl) {
    profitCostEl.textContent = `₱${formatNumber(data.cost)}`;
  }

  if (profitMarginEl) {
    const margin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0;
    profitMarginEl.textContent = `${margin}%`;
  }

  // Update active button
  document.querySelectorAll('.profit-period-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.period === profitPeriod) {
      btn.classList.add('active');
    }
  });
}

// Change profit period (for profit overview cards)
function changeProfitPeriod(period) {
  profitPeriod = period;
  // Update button states
  document.querySelectorAll('.profit-period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
  updateProfitDisplay();
}

// Change profit sold period (for profit by product section)
function changeProfitSoldPeriod(period) {
  profitSoldPeriod = period;
  // Update button states
  document.querySelectorAll('.profit-sold-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });
  updateProfitFromSold();
}

// Change reports period (for financial reports section)
function changeReportsPeriod(period) {
  reportsPeriod = period;
  // Update dropdown if called programmatically
  const select = document.getElementById('reports-period-select');
  if (select && select.value !== period) {
    select.value = period;
  }
  updateFinancialReports();
}

// Get financial report data for the selected period
function getFinancialReportData() {
  const transactions = state.transactions;
  const products = state.products;
  const now = new Date();
  const today = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Create product lookup for cost prices
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      costPrice: p.costPrice || 0,
      kgPerSack: p.kgPerSack || 25,
      piecesPerBox: p.piecesPerBox || 1
    };
  });

  let totalRevenue = 0;
  let totalCost = 0;

  transactions.forEach(txn => {
    const txnDate = new Date(txn.date);
    const txnDateStr = txnDate.toDateString();

    // Check if transaction is in selected period
    let inPeriod = false;
    if (reportsPeriod === 'today' && txnDateStr === today) inPeriod = true;
    else if (reportsPeriod === 'week' && txnDate >= startOfWeek) inPeriod = true;
    else if (reportsPeriod === 'month' && txnDate >= startOfMonth) inPeriod = true;
    else if (reportsPeriod === 'year' && txnDate >= startOfYear) inPeriod = true;
    else if (reportsPeriod === 'total') inPeriod = true;

    if (!inPeriod) return;

    // Process items in transaction
    if (txn.items && Array.isArray(txn.items)) {
      txn.items.forEach(item => {
        const product = productMap[item.productId];
        if (!product) return;

        const costPrice = product.costPrice; // Cost per sack for feeds, cost per piece for non-feeds
        const kgPerSack = product.kgPerSack || 25;
        const piecesPerBox = product.piecesPerBox || 1;
        let itemCost = 0;
        let itemRevenue = item.price || 0;

        // Calculate cost based on sale type
        // For feeds: costPrice is cost PER SACK, so divide by kgPerSack to get cost per kg
        if (item.kgAmount > 0) {
          // Feed sold by kg - convert costPrice (per sack) to per kg
          const costPerKg = costPrice / kgPerSack;
          itemCost = costPerKg * item.kgAmount;
        } else if (item.unit && item.unit.toUpperCase().includes('KG')) {
          // Fallback for old transactions: parse KG from unit string
          const kgMatch = item.unit.match(/^([\d.]+)\s*KG/i);
          if (kgMatch) {
            const kgAmount = parseFloat(kgMatch[1]);
            const costPerKg = costPrice / kgPerSack;
            itemCost = costPerKg * kgAmount;
          } else {
            itemCost = costPrice * (item.quantity || 1);
          }
        } else if (item.sackAmount > 0 || (item.unit && item.unit.toUpperCase().includes('SACK'))) {
          // Feed sold by sack - costPrice is already per sack
          itemCost = costPrice * (item.sackAmount || item.quantity || 1);
        } else if (item.pieceAmount > 0) {
          // Non-feed sold by piece - costPrice is per BOX, divide by piecesPerBox
          const costPerPiece = costPrice / piecesPerBox;
          itemCost = costPerPiece * item.pieceAmount;
        } else if (item.boxAmount > 0 || (item.unit && item.unit.toUpperCase().includes('BOX'))) {
          // Non-feed sold by box - costPrice is per BOX
          itemCost = costPrice * (item.boxAmount || item.quantity || 1);
        } else {
          // Fallback: use quantity
          itemCost = costPrice * (item.quantity || 1);
        }

        totalRevenue += itemRevenue;
        totalCost += itemCost;
      });
    }
  });

  // Margin = Revenue (total sales)
  // Expenses = Cost of goods sold (COGS)
  // Profit = Margin - Expenses
  const margin = totalRevenue;
  const expenses = totalCost;
  const profit = margin - expenses;

  return { margin, expenses, profit };
}

// Update financial reports display
function updateFinancialReports() {
  const data = getFinancialReportData();

  const marginEl = document.getElementById('report-margin-value');
  const expensesEl = document.getElementById('report-expenses-value');
  const profitEl = document.getElementById('report-profit-value');

  if (marginEl) marginEl.textContent = formatNumber(data.margin);
  if (expensesEl) expensesEl.textContent = formatNumber(data.expenses);
  if (profitEl) {
    profitEl.textContent = formatNumber(data.profit);
    // Add/remove negative class for color styling
    if (data.profit < 0) {
      profitEl.classList.add('negative');
    } else {
      profitEl.classList.remove('negative');
    }
  }
}

// Export financial report
function exportFinancialReport() {
  const data = getFinancialReportData();
  const periodLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    total: 'All Time'
  };

  const reportDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const reportContent = `
FINANCIAL REPORT
================
Store: ${localStorage.getItem('storeName') || 'FlyHighManarang'}
Period: ${periodLabels[reportsPeriod]}
Generated: ${reportDate}

----------------------------------------
SUMMARY
----------------------------------------
Margin (Revenue):    P ${formatNumber(data.margin)}
Expenses (COGS):     P ${formatNumber(data.expenses)}
----------------------------------------
NET PROFIT:          P ${formatNumber(data.profit)}
----------------------------------------

Profit Margin: ${data.margin > 0 ? ((data.profit / data.margin) * 100).toFixed(1) : 0}%
  `;

  // Create and download text file
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-report-${reportsPeriod}-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Report exported successfully!');
}

// ============================================
// Top Moving Products Functions
// ============================================

// Initialize Top Moving Products date range
function initTopMovingProducts() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const startInput = document.getElementById('top-moving-start-date');
  const endInput = document.getElementById('top-moving-end-date');

  if (startInput) startInput.value = formatDateForInput(startOfMonth);
  if (endInput) endInput.value = formatDateForInput(today);

  updateTopMovingProducts();
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Set date preset for Top Moving Products
function setTopMovingDatePreset(preset) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      // startDate is already today
      break;
    case 'yesterday':
      startDate.setDate(startDate.getDate() - 1);
      today.setDate(today.getDate() - 1);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1);
      break;
    case 'custom':
      // Don't change dates, let user pick
      return;
  }

  const startInput = document.getElementById('top-moving-start-date');
  const endInput = document.getElementById('top-moving-end-date');

  if (startInput) startInput.value = formatDateForInput(startDate);
  if (endInput) endInput.value = formatDateForInput(today);

  updateTopMovingProducts();
}

// Get Top Moving Products data
function getTopMovingProductsData() {
  const startInput = document.getElementById('top-moving-start-date');
  const endInput = document.getElementById('top-moving-end-date');

  if (!startInput || !endInput) return [];

  const startDate = new Date(startInput.value);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endInput.value);
  endDate.setHours(23, 59, 59, 999);

  const transactions = state.transactions;
  const products = state.products;

  // Create product lookup
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      name: p.name,
      brand: p.brand || '',
      category: p.category,
      costPrice: p.costPrice || 0,
      kgPerSack: p.kgPerSack || 25,
      piecesPerBox: p.piecesPerBox || 1
    };
  });

  // Aggregate sales by product
  const productSales = {};

  transactions.forEach(txn => {
    const txnDate = new Date(txn.date);

    // Check if transaction is within date range
    if (txnDate < startDate || txnDate > endDate) return;

    if (txn.items && Array.isArray(txn.items)) {
      txn.items.forEach(item => {
        const product = productMap[item.productId];
        if (!product) return;

        const costPrice = product.costPrice;
        const kgPerSack = product.kgPerSack || 25;
        const piecesPerBox = product.piecesPerBox || 1;

        let itemCost = 0;
        let itemRevenue = item.price || 0;
        let quantity = 0;
        let unitType = '';

        // Calculate cost and quantity
        if (item.kgAmount > 0) {
          const costPerKg = costPrice / kgPerSack;
          itemCost = costPerKg * item.kgAmount;
          quantity = item.kgAmount;
          unitType = 'kg';
        } else if (item.unit && item.unit.toUpperCase().includes('KG')) {
          // Fallback for old transactions: parse KG from unit string like "1.00 KG" or "25.00 KG"
          const kgMatch = item.unit.match(/^([\d.]+)\s*KG/i);
          if (kgMatch) {
            const kgAmount = parseFloat(kgMatch[1]);
            const costPerKg = costPrice / kgPerSack;
            itemCost = costPerKg * kgAmount;
            quantity = kgAmount;
            unitType = 'kg';
          } else {
            itemCost = costPrice * (item.quantity || 1);
            quantity = item.quantity || 1;
            unitType = 'kg';
          }
        } else if (item.sackAmount > 0 || (item.unit && item.unit.toUpperCase().includes('SACK'))) {
          const sacks = item.sackAmount || item.quantity || 1;
          itemCost = costPrice * sacks;
          quantity = sacks;
          unitType = 'sack';
        } else if (item.pieceAmount > 0) {
          // Non-feed sold by piece - costPrice is per BOX, divide by piecesPerBox
          const costPerPiece = costPrice / piecesPerBox;
          itemCost = costPerPiece * item.pieceAmount;
          quantity = item.pieceAmount;
          unitType = 'pc';
        } else if (item.boxAmount > 0 || (item.unit && item.unit.toUpperCase().includes('BOX'))) {
          // Non-feed sold by box - costPrice is per BOX
          const boxes = item.boxAmount || item.quantity || 1;
          itemCost = costPrice * boxes;
          quantity = boxes;
          unitType = 'box';
        } else {
          itemCost = costPrice * (item.quantity || 1);
          quantity = item.quantity || 1;
          unitType = 'unit';
        }

        const discount = item.discount || 0;
        const margin = itemRevenue - itemCost;

        // Aggregate by product
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            name: product.name,
            brand: product.brand,
            category: product.category,
            quantity: 0,
            unitType: unitType,
            price: 0,
            discount: 0,
            cost: 0,
            margin: 0
          };
        }

        productSales[item.productId].quantity += quantity;
        productSales[item.productId].price += itemRevenue;
        productSales[item.productId].discount += discount;
        productSales[item.productId].cost += itemCost;
        productSales[item.productId].margin += margin;
      });
    }
  });

  // Convert to array and sort by margin (highest first)
  return Object.values(productSales)
    .sort((a, b) => b.margin - a.margin);
}

// Update Top Moving Products display
function updateTopMovingProducts() {
  const data = getTopMovingProductsData();
  const tbody = document.getElementById('top-moving-tbody');

  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr class="no-data-row">
        <td colspan="6">No sales data for this period</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const marginClass = item.margin >= 0 ? 'margin-positive' : 'margin-negative';
    const qtyDisplay = item.unitType === 'kg'
      ? item.quantity.toFixed(2)
      : item.quantity.toFixed(item.quantity % 1 === 0 ? 0 : 1);

    return `
      <tr>
        <td class="col-product">${item.name}${item.unitType ? ` <small class="unit-type">${item.unitType.toUpperCase()}${item.unitType !== 'kg' ? 's' : ''}</small>` : ''}</td>
        <td class="col-qty">${qtyDisplay}</td>
        <td class="col-price">${formatNumber(item.price)}</td>
        <td class="col-dc">${item.discount > 0 ? formatNumber(item.discount) : '0'}</td>
        <td class="col-cost">${formatNumber(item.cost)}</td>
        <td class="col-margin ${marginClass}">${formatNumber(item.margin)}</td>
      </tr>
    `;
  }).join('');
}

// Export Top Moving Products to CSV
function exportTopMovingProducts() {
  const data = getTopMovingProductsData();
  const startDate = document.getElementById('top-moving-start-date')?.value || '';
  const endDate = document.getElementById('top-moving-end-date')?.value || '';

  if (data.length === 0) {
    showToast('No data to export');
    return;
  }

  // Build CSV content
  let csv = 'PRODUCT,QTY,UNIT,PRICE,DISCOUNT,COST,MARGIN\n';

  data.forEach(item => {
    const qty = item.unitType === 'kg' ? item.quantity.toFixed(2) : item.quantity;
    csv += `"${item.name}",${qty},${item.unitType},${item.price.toFixed(2)},${item.discount.toFixed(2)},${item.cost.toFixed(2)},${item.margin.toFixed(2)}\n`;
  });

  // Add totals row
  const totals = data.reduce((acc, item) => ({
    price: acc.price + item.price,
    discount: acc.discount + item.discount,
    cost: acc.cost + item.cost,
    margin: acc.margin + item.margin
  }), { price: 0, discount: 0, cost: 0, margin: 0 });

  csv += `\nTOTAL,,,${totals.price.toFixed(2)},${totals.discount.toFixed(2)},${totals.cost.toFixed(2)},${totals.margin.toFixed(2)}\n`;

  // Download file
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `top-moving-products_${startDate}_to_${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('CSV exported successfully!');
}

// Get profit breakdown by product for the selected period
function getProfitByProduct() {
  const transactions = state.transactions;
  const products = state.products;
  const now = new Date();
  const today = now.toDateString();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Create product lookup
  const productMap = {};
  products.forEach(p => {
    productMap[p.id] = {
      name: p.name,
      brand: p.brand || '',
      category: p.category,
      costPrice: p.costPrice || 0,
      kgPerSack: p.kgPerSack || 25,
      piecesPerBox: p.piecesPerBox || 1
    };
  });

  // Track profit by product
  const profitByProduct = {};

  transactions.forEach(txn => {
    const txnDate = new Date(txn.date);
    const txnDateStr = txnDate.toDateString();

    // Check if transaction is in selected period (using profitSoldPeriod)
    let inPeriod = false;
    if (profitSoldPeriod === 'today' && txnDateStr === today) inPeriod = true;
    else if (profitSoldPeriod === 'week' && txnDate >= startOfWeek) inPeriod = true;
    else if (profitSoldPeriod === 'month' && txnDate >= startOfMonth) inPeriod = true;
    else if (profitSoldPeriod === 'year' && txnDate >= startOfYear) inPeriod = true;
    else if (profitSoldPeriod === 'total') inPeriod = true;

    if (!inPeriod) return;

    // Process items in transaction
    if (txn.items && Array.isArray(txn.items)) {
      txn.items.forEach(item => {
        const product = productMap[item.productId];
        if (!product) return;

        const costPrice = product.costPrice; // Cost per sack for feeds, cost per piece for non-feeds
        const kgPerSack = product.kgPerSack || 25;
        const piecesPerBox = product.piecesPerBox || 1;
        let itemCost = 0;
        let itemRevenue = item.price || 0;
        let quantitySold = 0;
        let unitType = '';

        // Calculate cost and quantity based on sale type
        // For feeds: costPrice is cost PER SACK, so divide by kgPerSack to get cost per kg
        if (item.kgAmount > 0) {
          // Feed sold by kg - convert costPrice (per sack) to per kg
          const costPerKg = costPrice / kgPerSack;
          itemCost = costPerKg * item.kgAmount;
          quantitySold = item.kgAmount;
          unitType = 'kg';
        } else if (item.unit && item.unit.toUpperCase().includes('KG')) {
          // Fallback for old transactions: parse KG from unit string
          const kgMatch = item.unit.match(/^([\d.]+)\s*KG/i);
          if (kgMatch) {
            const kgAmount = parseFloat(kgMatch[1]);
            const costPerKg = costPrice / kgPerSack;
            itemCost = costPerKg * kgAmount;
            quantitySold = kgAmount;
            unitType = 'kg';
          } else {
            itemCost = costPrice * (item.quantity || 1);
            quantitySold = item.quantity || 1;
            unitType = 'kg';
          }
        } else if (item.sackAmount > 0 || (item.unit && item.unit.toUpperCase().includes('SACK'))) {
          // Feed sold by sack - costPrice is already per sack
          const sacks = item.sackAmount || item.quantity || 1;
          itemCost = costPrice * sacks;
          quantitySold = sacks;
          unitType = 'sack(s)';
        } else if (item.pieceAmount > 0) {
          // Non-feed sold by piece - costPrice is per BOX, divide by piecesPerBox
          const costPerPiece = costPrice / piecesPerBox;
          itemCost = costPerPiece * item.pieceAmount;
          quantitySold = item.pieceAmount;
          unitType = 'pc(s)';
        } else if (item.boxAmount > 0 || (item.unit && item.unit.toUpperCase().includes('BOX'))) {
          // Non-feed sold by box - costPrice is per BOX
          const boxes = item.boxAmount || item.quantity || 1;
          itemCost = costPrice * boxes;
          quantitySold = boxes;
          unitType = 'box(es)';
        } else {
          // Fallback: use quantity
          itemCost = costPrice * (item.quantity || 1);
          quantitySold = item.quantity || 1;
          unitType = 'unit(s)';
        }

        const itemProfit = itemRevenue - itemCost;

        // Aggregate by product
        if (!profitByProduct[item.productId]) {
          profitByProduct[item.productId] = {
            productId: item.productId,
            name: product.name,
            brand: product.brand,
            category: product.category,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            quantitySold: 0,
            unitType: unitType,
            salesCount: 0
          };
        }

        profitByProduct[item.productId].totalRevenue += itemRevenue;
        profitByProduct[item.productId].totalCost += itemCost;
        profitByProduct[item.productId].totalProfit += itemProfit;
        profitByProduct[item.productId].quantitySold += quantitySold;
        profitByProduct[item.productId].salesCount += 1;
      });
    }
  });

  // Convert to array and sort by profit (highest first)
  const sortedProducts = Object.values(profitByProduct)
    .sort((a, b) => b.totalProfit - a.totalProfit);

  return sortedProducts;
}

// Update profit from sold display
function updateProfitFromSold() {
  const profitData = getProfitByProduct();
  const container = document.getElementById('profit-sold-list');
  if (!container) return;

  if (profitData.length === 0) {
    container.innerHTML = `
      <div class="no-profit-data">
        <p>No sales data for this period</p>
        <small>Make some sales to see profit breakdown</small>
      </div>
    `;
    return;
  }

  // Show top 10 products
  const topProducts = profitData.slice(0, 10);

  // Calculate margin for each product
  const getMargin = (profit, revenue) => {
    if (revenue === 0) return 0;
    return ((profit / revenue) * 100).toFixed(1);
  };

  container.innerHTML = topProducts.map((item, index) => `
    <div class="profit-sold-item">
      <div class="profit-sold-rank">${index + 1}</div>
      <div class="profit-sold-info">
        <div class="profit-sold-name">${escapeHtml(item.name)}</div>
        <div class="profit-sold-details">
          ${item.brand ? `<span class="profit-sold-brand">${escapeHtml(item.brand)}</span>` : ''}
          <span class="profit-sold-category">${escapeHtml(item.category || 'Other')}</span>
        </div>
      </div>
      <div class="profit-sold-qty">
        <span class="profit-sold-qty-value">${item.quantitySold.toFixed(item.unitType === 'kg' ? 2 : 0)} ${item.unitType}</span>
        <span class="profit-sold-revenue">P${formatNumber(item.totalRevenue)}</span>
      </div>
      <div class="profit-sold-profit">
        <span class="profit-sold-amount ${item.totalProfit < 0 ? 'negative' : ''}">${item.totalProfit >= 0 ? '+' : ''}P${formatNumber(Math.abs(item.totalProfit))}</span>
        <span class="profit-sold-margin">${getMargin(item.totalProfit, item.totalRevenue)}% margin</span>
      </div>
    </div>
  `).join('');
}

// Get sales data from real transactions
function getSalesDataFromTransactions() {
  const transactions = state.transactions;
  const now = new Date();
  const today = now.toDateString();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Calculate today's sales
  const todaySales = transactions
    .filter(t => new Date(t.date).toDateString() === today)
    .reduce((sum, t) => sum + t.total, 0);

  // Group transactions by year and month
  const monthlyData = {};
  const yearlyData = {};
  let allTimeTotal = 0;
  let oldestYear = currentYear;

  transactions.forEach(t => {
    const date = new Date(t.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Track oldest year
    if (year < oldestYear) oldestYear = year;

    // Monthly aggregation
    if (!monthlyData[year]) monthlyData[year] = {};
    if (!monthlyData[year][month]) monthlyData[year][month] = 0;
    monthlyData[year][month] += t.total;

    // Yearly aggregation
    if (!yearlyData[year]) yearlyData[year] = 0;
    yearlyData[year] += t.total;

    // All-time total
    allTimeTotal += t.total;
  });

  return {
    todaySales,
    monthlyData,
    yearlyData,
    allTimeTotal,
    totalTransactions: transactions.length,
    oldestYear: transactions.length > 0 ? oldestYear : currentYear
  };
}

// Initialize Sales Overview on page load
function initSalesOverview() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Populate month selector from real data
  populateMonthSelector(currentYear, currentMonth);

  // Update all displays
  updateMonthlySales();
  updateYearlySales(currentYear);
  updateAllTimeSales();
  updateDashboardCards();
  updateProfitDisplay();
  updateProfitFromSold();
  updateFinancialReports();
  renderRecentSales();
}

// Event-driven update after a sale is completed
function updateDashboardAfterSale() {
  const currentYear = new Date().getFullYear();

  // Update sales overview
  updateMonthlySales();
  updateYearlySales(currentYear);
  updateAllTimeSales();

  // Update dashboard cards (Today's Sales, Total Products, etc.)
  updateDashboardCards();

  // Update profit displays
  updateProfitDisplay();
  updateProfitFromSold();

  // Update financial reports
  updateFinancialReports();

  // Update recent sales list
  renderRecentSales();

  // Update month selector in case this is first sale of a new month
  const currentMonth = new Date().getMonth() + 1;
  populateMonthSelector(currentYear, currentMonth);

  console.log('[Dashboard] Updated after sale');
}

// Populate month selector from real transaction data
function populateMonthSelector(currentYear, currentMonth) {
  const selector = document.getElementById("month-selector");
  if (!selector) return;

  selector.innerHTML = "";

  const salesData = getSalesDataFromTransactions();
  const monthlyData = salesData.monthlyData;

  // If no data, just show current month
  if (Object.keys(monthlyData).length === 0) {
    const option = document.createElement("option");
    option.value = `${currentYear}-${currentMonth}`;
    option.textContent = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
    selector.appendChild(option);
    return;
  }

  // Get available years sorted descending
  const availableYears = Object.keys(monthlyData).map(Number).sort((a, b) => b - a);

  availableYears.forEach(year => {
    const yearData = monthlyData[year];
    const months = Object.keys(yearData).map(Number).sort((a, b) => b - a);

    months.forEach(month => {
      const option = document.createElement("option");
      option.value = `${year}-${month}`;
      option.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
      selector.appendChild(option);
    });
  });
}

// Update Monthly Sales display based on selected month
function updateMonthlySales() {
  const selector = document.getElementById("month-selector");
  const amountEl = document.getElementById("monthly-sales-amount");
  const comparisonEl = document.querySelector(".monthly-sales .sales-comparison");

  if (!selector || !amountEl) return;

  const salesData = getSalesDataFromTransactions();
  const monthlyData = salesData.monthlyData;

  if (!selector.value) {
    amountEl.textContent = "0";
    if (comparisonEl) comparisonEl.innerHTML = `<span class="neutral">-</span> vs last month`;
    return;
  }

  const [year, month] = selector.value.split("-").map(Number);
  const currentAmount = monthlyData[year]?.[month] || 0;

  // Calculate previous month for comparison
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  const prevAmount = monthlyData[prevYear]?.[prevMonth] || 0;

  amountEl.textContent = formatNumber(currentAmount);

  if (comparisonEl) {
    if (prevAmount > 0) {
      const change = ((currentAmount - prevAmount) / prevAmount * 100).toFixed(1);
      const isPositive = change >= 0;
      comparisonEl.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change}%</span> vs last month`;
    } else {
      comparisonEl.innerHTML = `<span class="neutral">-</span> vs last month`;
    }
  }
}

// Update Yearly Sales display
function updateYearlySales(currentYear) {
  const yearLabel = document.querySelector(".yearly-sales .year-label");
  const yearlyAmount = document.getElementById("yearly-sales-amount");
  const yearlyComparison = document.querySelector(".yearly-sales .sales-comparison");

  if (!yearLabel || !yearlyAmount) return;

  const salesData = getSalesDataFromTransactions();
  const yearlyData = salesData.yearlyData;

  const currentYearTotal = yearlyData[currentYear] || 0;
  const prevYearTotal = yearlyData[currentYear - 1] || 0;

  yearLabel.textContent = currentYear;
  yearlyAmount.textContent = formatNumber(currentYearTotal);

  if (yearlyComparison) {
    if (prevYearTotal > 0) {
      const change = ((currentYearTotal - prevYearTotal) / prevYearTotal * 100).toFixed(1);
      const isPositive = change >= 0;
      yearlyComparison.innerHTML = `<span class="${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${change}%</span> vs ${currentYear - 1}`;
    } else {
      yearlyComparison.innerHTML = `<span class="neutral">-</span> vs last year`;
    }
  }
}

// Update All-Time Sales display
function updateAllTimeSales() {
  const alltimeAmount = document.getElementById("alltime-sales-amount");
  const alltimeInfo = document.querySelector(".alltime-sales .sales-info");
  const sinceLabel = document.querySelector(".alltime-sales .year-label");

  const salesData = getSalesDataFromTransactions();

  if (alltimeAmount) {
    alltimeAmount.textContent = formatNumber(salesData.allTimeTotal);
  }

  if (alltimeInfo) {
    alltimeInfo.textContent = `Total Transactions: ${formatNumber(salesData.totalTransactions)}`;
  }

  if (sinceLabel) {
    sinceLabel.textContent = salesData.totalTransactions > 0 ? `Since ${salesData.oldestYear}` : "No sales yet";
  }
}

// Update Dashboard summary cards
function updateDashboardCards() {
  const salesData = getSalesDataFromTransactions();

  // Today's sales
  const todaySalesEl = document.getElementById("total-sales-today");
  if (todaySalesEl) {
    todaySalesEl.textContent = formatNumber(salesData.todaySales);
  }

  // Total products
  const totalProductsEl = document.getElementById("total-products");
  if (totalProductsEl) {
    totalProductsEl.textContent = state.products.length;
  }

  // Low stock items
  const lowStockEl = document.getElementById("low-stock-items");
  if (lowStockEl) {
    const lowStockCount = state.inventory.filter(i => i.lowStock).length;
    lowStockEl.textContent = lowStockCount;
  }
}

// Render Recent Sales on Dashboard
function renderRecentSales() {
  const container = document.querySelector(".recent-activity .activity-list");
  if (!container) return;

  // Get 5 most recent transactions
  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (recentTransactions.length === 0) {
    container.innerHTML = `
      <div class="no-activity">
        <p>No recent sales</p>
        <small>Sales will appear here after checkout</small>
      </div>
    `;
    return;
  }

  container.innerHTML = recentTransactions.map(txn => {
    const firstItem = txn.items && txn.items[0];
    if (!firstItem) return '';
    const itemSummary = txn.items.length > 1
      ? `${escapeHtml(firstItem.name)} +${txn.items.length - 1} more`
      : `${escapeHtml(firstItem.name)} (${firstItem.quantity} ${escapeHtml(firstItem.unit)})`;
    const timeAgo = getTimeAgo(new Date(txn.date));
    const saleNumber = txn.id.split('-').pop();

    return `
      <div class="activity-item" onclick="viewTransactionDetails('${escapeHtml(txn.id)}')">
        <span class="activity-icon">RCPT</span>
        <div class="activity-details">
          <strong>Sale #${escapeHtml(saleNumber)}</strong>
          <p>${itemSummary} - ₱${formatNumber(txn.total)}</p>
        </div>
        <span class="activity-time">${timeAgo}</span>
      </div>
    `;
  }).join("");
}

// Helper: Get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

// ============================================
// POS Functions
// ============================================

function renderProducts(filter = "all", searchTerm = "") {
  const grid = document.getElementById("product-grid");
  let filteredProducts = state.products;

  // Apply category filter
  if (filter !== "all") {
    filteredProducts = filteredProducts.filter(p => p.category === filter);
  }

  // Apply search filter
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase().trim();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(search) ||
      (p.brand && p.brand.toLowerCase().includes(search)) ||
      p.category.toLowerCase().includes(search)
    );
  }

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <p>No products found</p>
        <small>${searchTerm ? `for "${escapeHtml(searchTerm)}"` : ''}</small>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(product => `
    <div class="product-card" onclick="selectProduct(${product.id})">
      ${product.image
        ? `<div class="product-image"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}"></div>`
        : ''}
      <div class="product-name">${escapeHtml(product.name)}</div>
      <div class="product-brand">${escapeHtml(product.brand || '')}</div>
      <div class="product-category">${escapeHtml(product.category)}</div>
      <div class="product-price">
        ${product.category === "Feed"
          ? `₱${product.pricePerKg}/kg`
          : `₱${product.pricePerPiece}/${product.piecesPerBox > 1 ? 'pc' : 'unit'}`}
      </div>
    </div>
  `).join("");
}

function filterProducts(category, e) {
  // Update filter buttons
  document.querySelectorAll("#pos-screen .filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (e && e.target) {
    e.target.classList.add("active");
  }

  state.posCurrentCategory = category;
  renderProducts(category, state.posSearchTerm);
}

function searchPOSProducts() {
  const searchInput = document.getElementById("pos-product-search");
  state.posSearchTerm = searchInput.value;
  renderProducts(state.posCurrentCategory, state.posSearchTerm);
}

function selectProduct(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.selectedProduct = product;
  state.selectedUnit = null;
  state.customKg = 0;
  state.quantity = 1;

  // Update modal
  document.getElementById("modal-product-name").textContent = product.name;
  document.getElementById("item-quantity").value = 1;
  document.getElementById("preview-price").textContent = "₱0.00";

  // Render unit options
  renderUnitOptions(product);

  // Show modal
  document.getElementById("product-modal").classList.add("active");
}

function renderUnitOptions(product) {
  const container = document.getElementById("unit-selection");
  const customContainer = document.getElementById("custom-kg-container");

  if (product.category === "Feed") {
    const kgPerSack = product.kgPerSack || 25;
    container.innerHTML = `
      <button class="unit-btn" data-value="sack" onclick="selectUnit('sack')">
        Sack (${kgPerSack} kg) - ₱${product.pricePerSack}
      </button>
      <button class="unit-btn" data-value="0.25" onclick="selectUnit('0.25')">
        0.25 KG - ₱${(product.pricePerKg * 0.25).toFixed(2)}
      </button>
      <button class="unit-btn" data-value="0.50" onclick="selectUnit('0.50')">
        0.50 KG - ₱${(product.pricePerKg * 0.50).toFixed(2)}
      </button>
      <button class="unit-btn" data-value="0.75" onclick="selectUnit('0.75')">
        0.75 KG - ₱${(product.pricePerKg * 0.75).toFixed(2)}
      </button>
      <button class="unit-btn" data-value="1.00" onclick="selectUnit('1.00')">
        1.00 KG - ₱${(product.pricePerKg * 1.00).toFixed(2)}
      </button>
      <button class="unit-btn" data-value="custom" onclick="selectUnit('custom')">
        Custom KG
      </button>
      <button class="unit-btn" data-value="feed-combo" onclick="selectUnit('feed-combo')">
        Custom (Sack + KG)
      </button>
    `;
    customContainer.style.display = "none";
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats - Piece/Box or Unit options
    const piecesPerBox = product.piecesPerBox || 1;

    // Check if product has box pricing (piecesPerBox > 1)
    if (piecesPerBox > 1) {
      container.innerHTML = `
        <button class="unit-btn" data-value="piece" onclick="selectUnit('piece')">
          Piece - ₱${product.pricePerPiece}
        </button>
        <button class="unit-btn" data-value="box" onclick="selectUnit('box')">
          Box (${piecesPerBox} pcs) - ₱${product.pricePerBox}
        </button>
        <button class="unit-btn" data-value="custom-combo" onclick="selectUnit('custom-combo')">
          Custom (Box + Pieces)
        </button>
      `;
    } else {
      // Single unit pricing (no box option)
      container.innerHTML = `
        <button class="unit-btn" data-value="piece" onclick="selectUnit('piece')">
          Unit - ₱${product.pricePerPiece}
        </button>
      `;
    }
    customContainer.style.display = "none";
  }
}

// Track if custom kg listener is already attached
let customKgListenerAttached = false;
let customComboListenerAttached = false;

// State for custom combo (boxes + pieces) - for non-feed products
let customComboBoxes = 0;
let customComboPieces = 0;

// State for feed combo (sacks + kg) - for feed products
let feedComboSacks = 0;
let feedComboKg = 0;

function selectUnit(unit) {
  state.selectedUnit = unit;

  // Update button states
  document.querySelectorAll(".unit-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.value === unit) {
      btn.classList.add("active");
    }
  });

  // Show/hide custom KG input
  const customContainer = document.getElementById("custom-kg-container");
  const customComboContainer = document.getElementById("custom-combo-container");

  if (unit === "custom") {
    customContainer.style.display = "block";
    if (customComboContainer) customComboContainer.style.display = "none";
    document.getElementById("custom-kg").focus();

    // Only add listener once to prevent memory leak
    if (!customKgListenerAttached) {
      document.getElementById("custom-kg").addEventListener("input", (e) => {
        state.customKg = parseFloat(e.target.value) || 0;
        updatePreviewPrice();
      });
      customKgListenerAttached = true;
    }
  } else if (unit === "custom-combo") {
    customContainer.style.display = "none";
    hideFeedComboInputs();
    showCustomComboInputs();
    // Hide quantity section when using custom combo
    const quantitySection = document.querySelector(".quantity-selection");
    if (quantitySection) quantitySection.style.display = "none";
  } else if (unit === "feed-combo") {
    customContainer.style.display = "none";
    hideCustomComboInputs();
    showFeedComboInputs();
    // Hide quantity section when using feed combo
    const quantitySection = document.querySelector(".quantity-selection");
    if (quantitySection) quantitySection.style.display = "none";
  } else {
    customContainer.style.display = "none";
    hideCustomComboInputs();
    hideFeedComboInputs();
    // Show quantity section for other units
    const quantitySection = document.querySelector(".quantity-selection");
    if (quantitySection) quantitySection.style.display = "block";
  }

  updatePreviewPrice();
}

function hideCustomComboInputs() {
  const container = document.getElementById("custom-combo-container");
  if (container) container.style.display = "none";
}

function hideFeedComboInputs() {
  const container = document.getElementById("feed-combo-container");
  if (container) container.style.display = "none";
}

function showCustomComboInputs() {
  let container = document.getElementById("custom-combo-container");

  if (!container) {
    // Create the custom combo container if it doesn't exist
    container = document.createElement("div");
    container.id = "custom-combo-container";
    container.className = "custom-combo-container";

    const product = state.selectedProduct;
    const piecesPerBox = product?.piecesPerBox || 12;

    container.innerHTML = `
      <div class="combo-input-row">
        <div class="combo-input-group">
          <label>Boxes</label>
          <div class="combo-stepper">
            <button type="button" class="stepper-btn" onclick="adjustComboBoxes(-1)">-</button>
            <input type="number" id="combo-boxes" value="0" min="0" readonly>
            <button type="button" class="stepper-btn" onclick="adjustComboBoxes(1)">+</button>
          </div>
        </div>
        <span class="combo-plus">+</span>
        <div class="combo-input-group">
          <label>Pieces</label>
          <div class="combo-stepper">
            <button type="button" class="stepper-btn" onclick="adjustComboPieces(-1)">-</button>
            <input type="number" id="combo-pieces" value="0" min="0" max="${piecesPerBox - 1}" readonly>
            <button type="button" class="stepper-btn" onclick="adjustComboPieces(1)">+</button>
          </div>
        </div>
      </div>
      <div class="combo-summary" id="combo-summary">
        Total: 0 pieces
      </div>
    `;

    // Insert after the unit buttons, before quantity selection
    const quantitySelection = document.querySelector(".quantity-selection");
    if (quantitySelection) {
      quantitySelection.parentNode.insertBefore(container, quantitySelection);
    }
  }

  container.style.display = "block";

  // Reset values
  customComboBoxes = 0;
  customComboPieces = 0;
  document.getElementById("combo-boxes").value = 0;
  document.getElementById("combo-pieces").value = 0;
  updateComboSummary();
}

function adjustComboBoxes(delta) {
  customComboBoxes = Math.max(0, customComboBoxes + delta);
  document.getElementById("combo-boxes").value = customComboBoxes;
  updateComboSummary();
  updatePreviewPrice();
}

function adjustComboPieces(delta) {
  const product = state.selectedProduct;
  const maxPieces = (product?.piecesPerBox || 12) - 1;
  customComboPieces = Math.max(0, Math.min(maxPieces, customComboPieces + delta));
  document.getElementById("combo-pieces").value = customComboPieces;
  updateComboSummary();
  updatePreviewPrice();
}

function updateComboSummary() {
  const product = state.selectedProduct;
  const piecesPerBox = product?.piecesPerBox || 12;
  const totalPieces = (customComboBoxes * piecesPerBox) + customComboPieces;

  const summaryEl = document.getElementById("combo-summary");
  if (summaryEl) {
    if (customComboBoxes > 0 && customComboPieces > 0) {
      summaryEl.textContent = `Total: ${customComboBoxes} box(es) + ${customComboPieces} piece(s) = ${totalPieces} pieces`;
    } else if (customComboBoxes > 0) {
      summaryEl.textContent = `Total: ${customComboBoxes} box(es) = ${totalPieces} pieces`;
    } else if (customComboPieces > 0) {
      summaryEl.textContent = `Total: ${customComboPieces} piece(s)`;
    } else {
      summaryEl.textContent = `Total: 0 pieces`;
    }
  }
}

// ============================================
// Feed Combo (Sacks + KG) Functions
// ============================================

function showFeedComboInputs() {
  let container = document.getElementById("feed-combo-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "feed-combo-container";
    container.className = "custom-combo-container";

    const product = state.selectedProduct;
    const kgPerSack = product?.kgPerSack || 25;

    container.innerHTML = `
      <div class="combo-input-row">
        <div class="combo-input-group">
          <label>Sacks</label>
          <div class="combo-stepper">
            <button type="button" class="stepper-btn" onclick="adjustFeedSacks(-1)">-</button>
            <input type="number" id="feed-sacks" value="0" min="0" readonly>
            <button type="button" class="stepper-btn" onclick="adjustFeedSacks(1)">+</button>
          </div>
        </div>
        <span class="combo-plus">+</span>
        <div class="combo-input-group">
          <label>KG</label>
          <div class="combo-stepper">
            <button type="button" class="stepper-btn" onclick="adjustFeedKg(-0.25)">-</button>
            <input type="number" id="feed-kg" value="0" min="0" step="0.25" readonly>
            <button type="button" class="stepper-btn" onclick="adjustFeedKg(0.25)">+</button>
          </div>
        </div>
      </div>
      <div class="combo-summary" id="feed-combo-summary">
        Total: 0 kg
      </div>
    `;

    const quantitySelection = document.querySelector(".quantity-selection");
    if (quantitySelection) {
      quantitySelection.parentNode.insertBefore(container, quantitySelection);
    }
  }

  container.style.display = "block";

  // Reset values
  feedComboSacks = 0;
  feedComboKg = 0;
  document.getElementById("feed-sacks").value = 0;
  document.getElementById("feed-kg").value = 0;
  updateFeedComboSummary();
}

function adjustFeedSacks(delta) {
  feedComboSacks = Math.max(0, feedComboSacks + delta);
  document.getElementById("feed-sacks").value = feedComboSacks;
  updateFeedComboSummary();
  updatePreviewPrice();
}

function adjustFeedKg(delta) {
  feedComboKg = Math.max(0, Math.round((feedComboKg + delta) * 100) / 100);
  document.getElementById("feed-kg").value = feedComboKg;
  updateFeedComboSummary();
  updatePreviewPrice();
}

function updateFeedComboSummary() {
  const product = state.selectedProduct;
  const kgPerSack = product?.kgPerSack || 25;
  const totalKg = (feedComboSacks * kgPerSack) + feedComboKg;

  const summaryEl = document.getElementById("feed-combo-summary");
  if (summaryEl) {
    if (feedComboSacks > 0 && feedComboKg > 0) {
      summaryEl.textContent = `Total: ${feedComboSacks} sack(s) + ${feedComboKg} kg = ${totalKg.toFixed(2)} kg`;
    } else if (feedComboSacks > 0) {
      summaryEl.textContent = `Total: ${feedComboSacks} sack(s) = ${totalKg.toFixed(2)} kg`;
    } else if (feedComboKg > 0) {
      summaryEl.textContent = `Total: ${feedComboKg} kg`;
    } else {
      summaryEl.textContent = `Total: 0 kg`;
    }
  }
}

function increaseQuantity() {
  state.quantity++;
  document.getElementById("item-quantity").value = state.quantity;
  updatePreviewPrice();
}

function decreaseQuantity() {
  if (state.quantity > 1) {
    state.quantity--;
    document.getElementById("item-quantity").value = state.quantity;
    updatePreviewPrice();
  }
}

function updatePreviewPrice() {
  const product = state.selectedProduct;
  if (!product || !state.selectedUnit) {
    document.getElementById("preview-price").textContent = "₱0.00";
    document.getElementById("wholesale-hint")?.remove();
    return;
  }

  let price = 0;
  let isWholesale = false;
  let regularPrice = 0;

  if (product.category === "Feed") {
    const kgPerSack = product.kgPerSack || 25;

    if (state.selectedUnit === "sack") {
      regularPrice = product.pricePerSack * state.quantity;
      const totalKg = kgPerSack * state.quantity;

      // Check for wholesale (sack-based or KG-based)
      if (product.wholesalePrice) {
        if (product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
          // KG-based wholesale threshold met
          price = product.wholesalePrice * state.quantity;
          isWholesale = true;
        } else if (product.wholesaleMin && state.quantity >= product.wholesaleMin) {
          // Sack-based wholesale threshold met
          price = product.wholesalePrice * state.quantity;
          isWholesale = true;
        } else {
          price = regularPrice;
        }
      } else {
        price = regularPrice;
      }
    } else if (state.selectedUnit === "custom") {
      // Custom KG input
      const totalKg = state.customKg * state.quantity;
      regularPrice = product.pricePerKg * totalKg;

      // Check KG-based wholesale
      if (product.wholesalePrice && product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * totalKg;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
    } else if (state.selectedUnit === "feed-combo") {
      // Feed combo: sacks + kg
      const totalKg = (feedComboSacks * kgPerSack) + feedComboKg;
      const sackPrice = product.pricePerSack * feedComboSacks;
      const kgPrice = product.pricePerKg * feedComboKg;
      regularPrice = sackPrice + kgPrice;

      // Check KG-based wholesale for combo
      if (product.wholesalePrice && product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * totalKg;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
    } else {
      // Preset KG buttons (0.25, 0.50, 0.75, 1.00)
      const kg = parseFloat(state.selectedUnit);
      const totalKg = kg * state.quantity;
      regularPrice = product.pricePerKg * totalKg;

      // Check KG-based wholesale
      if (product.wholesalePrice && product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * totalKg;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
    }
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats - Box or Piece
    if (state.selectedUnit === "box") {
      regularPrice = product.pricePerBox * state.quantity;
      // Check for wholesale
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        price = (product.wholesalePrice * product.piecesPerBox) * state.quantity;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
    } else if (state.selectedUnit === "piece") {
      // No wholesale for individual pieces - wholesale is for boxes only
      price = product.pricePerPiece * state.quantity;
    } else if (state.selectedUnit === "custom-combo") {
      // Custom combo: boxes + pieces
      const boxPrice = product.pricePerBox * customComboBoxes;
      const piecePrice = product.pricePerPiece * customComboPieces;
      price = boxPrice + piecePrice;
    }
  }

  const previewEl = document.getElementById("preview-price");

  if (isWholesale) {
    const savings = regularPrice - price;
    previewEl.innerHTML = `<span class="wholesale-price">₱${price.toFixed(2)}</span> <span class="regular-price-strike">₱${regularPrice.toFixed(2)}</span>`;
    // Show/update wholesale hint
    let hintEl = document.getElementById("wholesale-hint");
    if (!hintEl) {
      hintEl = document.createElement("div");
      hintEl.id = "wholesale-hint";
      hintEl.className = "wholesale-hint";
      previewEl.parentNode.appendChild(hintEl);
    }
    hintEl.innerHTML = `Wholesale applied! Saving ₱${savings.toFixed(2)}`;
  } else {
    previewEl.textContent = `₱${price.toFixed(2)}`;
    // Remove wholesale hint if exists
    document.getElementById("wholesale-hint")?.remove();

    // Show hint for how many more needed for wholesale
    if (product.wholesalePrice) {
      let hintMessage = null;

      if (product.category === "Feed" && product.wholesaleMinKg) {
        // KG-based wholesale hint for Feed products
        const kgPerSack = product.kgPerSack || 25;
        let currentKg = 0;

        if (state.selectedUnit === "sack") {
          currentKg = kgPerSack * state.quantity;
        } else if (state.selectedUnit === "custom") {
          currentKg = state.customKg * state.quantity;
        } else if (state.selectedUnit === "feed-combo") {
          currentKg = (feedComboSacks * kgPerSack) + feedComboKg;
        } else {
          const kg = parseFloat(state.selectedUnit);
          currentKg = kg * state.quantity;
        }

        const remainingKg = product.wholesaleMinKg - currentKg;
        if (remainingKg > 0) {
          hintMessage = `Add ${remainingKg.toFixed(2)} more kg for wholesale price!`;
        }
      } else if (product.wholesaleMin && (state.selectedUnit === "sack" || state.selectedUnit === "box")) {
        // Sack/Box-based wholesale hint
        const remaining = product.wholesaleMin - state.quantity;
        const unitName = state.selectedUnit === "sack" ? "sacks" : "boxes";
        if (remaining > 0) {
          hintMessage = `Add ${remaining} more ${unitName} for wholesale price!`;
        }
      }

      if (hintMessage) {
        let hintEl = document.getElementById("wholesale-hint");
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.id = "wholesale-hint";
          hintEl.className = "wholesale-hint pending";
          previewEl.parentNode.appendChild(hintEl);
        }
        hintEl.className = "wholesale-hint pending";
        hintEl.innerHTML = hintMessage;
      }
    }
  }
}

function addToCart() {
  const product = state.selectedProduct;
  if (!product || !state.selectedUnit) {
    showToast("Please select a unit");
    return;
  }

  if (state.selectedUnit === "custom" && state.customKg <= 0) {
    showToast("Please enter a valid KG amount");
    return;
  }

  if (state.selectedUnit === "custom-combo" && customComboBoxes <= 0 && customComboPieces <= 0) {
    showToast("Please select at least 1 box or piece");
    return;
  }

  if (state.selectedUnit === "feed-combo" && feedComboSacks <= 0 && feedComboKg <= 0) {
    showToast("Please select at least 1 sack or enter kg amount");
    return;
  }

  let price = 0;
  let unitLabel = "";
  let kgAmount = 0; // Track kg for display deduction
  let isWholesale = false; // Track if wholesale pricing was applied

  if (product.category === "Feed") {
    const kgPerSack = product.kgPerSack || 25;

    if (state.selectedUnit === "sack") {
      const totalKg = kgPerSack * state.quantity;

      // Check if wholesale pricing applies (sack-based or KG-based)
      if (product.wholesalePrice) {
        if (product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
          price = product.wholesalePrice * state.quantity;
          isWholesale = true;
        } else if (product.wholesaleMin && state.quantity >= product.wholesaleMin) {
          price = product.wholesalePrice * state.quantity;
          isWholesale = true;
        } else {
          price = product.pricePerSack * state.quantity;
        }
      } else {
        price = product.pricePerSack * state.quantity;
      }
      unitLabel = `${state.quantity} Sack(s)${isWholesale ? ' (Wholesale)' : ''}`;
      kgAmount = 0; // Sack sales don't deduct from display
    } else if (state.selectedUnit === "custom") {
      kgAmount = state.customKg * state.quantity;
      // Check if enough display stock
      const displayStock = getDisplayKgForProduct(product.id);
      if (displayStock < kgAmount) {
        showToast(`Not enough display stock! Available: ${displayStock.toFixed(2)} kg`);
        return;
      }

      // Check KG-based wholesale
      if (product.wholesalePrice && product.wholesaleMinKg && kgAmount >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * kgAmount;
        isWholesale = true;
        unitLabel = `${kgAmount.toFixed(2)} KG (Wholesale)`;
      } else {
        price = product.pricePerKg * state.customKg * state.quantity;
        unitLabel = `${kgAmount.toFixed(2)} KG`;
      }
    } else if (state.selectedUnit === "feed-combo") {
      // Feed combo: sacks + kg
      const totalKg = (feedComboSacks * kgPerSack) + feedComboKg;

      // Check if enough display stock for kg portion
      if (feedComboKg > 0) {
        const displayStock = getDisplayKgForProduct(product.id);
        if (displayStock < feedComboKg) {
          showToast(`Not enough display stock for kg! Available: ${displayStock.toFixed(2)} kg`);
          return;
        }
      }

      // Check KG-based wholesale for combo
      if (product.wholesalePrice && product.wholesaleMinKg && totalKg >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * totalKg;
        isWholesale = true;
      } else {
        const sackPrice = product.pricePerSack * feedComboSacks;
        const kgPrice = product.pricePerKg * feedComboKg;
        price = sackPrice + kgPrice;
      }
      kgAmount = feedComboKg; // Only kg portion deducts from display

      // Build label
      const parts = [];
      if (feedComboSacks > 0) parts.push(`${feedComboSacks} Sack(s)`);
      if (feedComboKg > 0) parts.push(`${feedComboKg} KG`);
      unitLabel = parts.join(' + ') + (isWholesale ? ' (Wholesale)' : '');
    } else {
      const kg = parseFloat(state.selectedUnit);
      kgAmount = kg * state.quantity;
      // Check if enough display stock
      const displayStock = getDisplayKgForProduct(product.id);
      if (displayStock < kgAmount) {
        showToast(`Not enough display stock! Available: ${displayStock.toFixed(2)} kg`);
        return;
      }

      // Check KG-based wholesale
      if (product.wholesalePrice && product.wholesaleMinKg && kgAmount >= product.wholesaleMinKg) {
        const wholesalePricePerKg = product.wholesalePrice / kgPerSack;
        price = wholesalePricePerKg * kgAmount;
        isWholesale = true;
        unitLabel = `${kgAmount.toFixed(2)} KG (Wholesale)`;
      } else {
        price = product.pricePerKg * kg * state.quantity;
        unitLabel = `${kgAmount.toFixed(2)} KG`;
      }
    }
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats - Box or Piece
    if (state.selectedUnit === "box") {
      // Check if wholesale pricing applies (for boxes)
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        // Wholesale price is per piece, calculate box based on pieces
        price = (product.wholesalePrice * product.piecesPerBox) * state.quantity;
        isWholesale = true;
      } else {
        price = product.pricePerBox * state.quantity;
      }
      unitLabel = `${state.quantity} Box(es)${isWholesale ? ' (Wholesale)' : ''}`;
    } else if (state.selectedUnit === "piece") {
      // Check if enough display stock for pieces
      const displayStock = getDisplayPiecesForProduct(product.id);
      const piecesNeeded = state.quantity;
      if (displayStock < piecesNeeded) {
        showToast(`Not enough display stock! Available: ${displayStock} piece(s)`);
        return;
      }
      // No wholesale for individual pieces - wholesale is for boxes only
      price = product.pricePerPiece * state.quantity;
      unitLabel = `${state.quantity} Piece(s)`;
    } else if (state.selectedUnit === "custom-combo") {
      // Custom combo: boxes + pieces
      // Check if enough display stock for pieces
      if (customComboPieces > 0) {
        const displayStock = getDisplayPiecesForProduct(product.id);
        if (displayStock < customComboPieces) {
          showToast(`Not enough display stock for pieces! Available: ${displayStock} piece(s)`);
          return;
        }
      }
      const boxPrice = product.pricePerBox * customComboBoxes;
      const piecePrice = product.pricePerPiece * customComboPieces;
      price = boxPrice + piecePrice;

      // Build label
      const parts = [];
      if (customComboBoxes > 0) parts.push(`${customComboBoxes} Box(es)`);
      if (customComboPieces > 0) parts.push(`${customComboPieces} Piece(s)`);
      unitLabel = parts.join(' + ');
    }
  }

  // Calculate unit price for transaction history
  let unitPrice = price;
  if (state.selectedUnit !== "custom-combo" && state.selectedUnit !== "feed-combo") {
    unitPrice = price / state.quantity;
  }

  // Track amounts for deduction during checkout
  let pieceAmount = 0; // For non-feed piece sales (display deduction)
  let boxAmount = 0;   // For non-feed box sales (inventory deduction)
  let sackAmount = 0;  // For feed sack sales (inventory deduction)

  if (product.category === "Feed") {
    if (state.selectedUnit === "sack") {
      sackAmount = state.quantity;
    } else if (state.selectedUnit === "feed-combo") {
      // Feed combo: sacks deduct from inventory, kg deducts from display
      sackAmount = feedComboSacks;
      // kgAmount already set above for display deduction
    }
    // kgAmount already set for kg sales
  } else {
    if (state.selectedUnit === "piece") {
      pieceAmount = state.quantity;
    } else if (state.selectedUnit === "box") {
      boxAmount = state.quantity;
    } else if (state.selectedUnit === "custom-combo") {
      // Custom combo: boxes deduct from inventory, pieces deduct from display
      boxAmount = customComboBoxes;
      pieceAmount = customComboPieces;
    }
  }

  const cartItem = {
    id: Date.now(),
    productId: product.id,
    productName: product.name,
    brand: product.brand || '',
    category: product.category,
    unit: unitLabel,
    unitPrice: unitPrice,
    price: price,
    quantity: state.quantity,
    kgAmount: kgAmount,     // For Feed kg sales - deduct from display
    pieceAmount: pieceAmount, // For non-feed piece sales - deduct from display
    boxAmount: boxAmount,     // For non-feed box sales - deduct from inventory
    sackAmount: sackAmount,   // For Feed sack sales - deduct from inventory
    isWholesale: isWholesale
  };

  state.cart.push(cartItem);
  updateCart();
  closeProductModal();
  showToast(`${product.name} added to cart!${isWholesale ? ' (Wholesale price applied!)' : ''}`);
}

function updateCart() {
  const container = document.getElementById("cart-items");

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <span class="empty-cart-icon">CART</span>
        <p>Cart is empty</p>
      </div>
    `;
    document.getElementById("cart-subtotal").textContent = "₱0.00";
    document.getElementById("cart-total").textContent = "₱0.00";
    document.getElementById("btn-checkout").disabled = true;
    return;
  }

  container.innerHTML = state.cart.map(item => `
    <div class="cart-item${item.isWholesale ? ' wholesale-item' : ''}">
      <div class="cart-item-info">
        <h4>${escapeHtml(item.productName)}${item.isWholesale ? ' <span class="wholesale-badge">WHOLESALE</span>' : ''}</h4>
        <p>${escapeHtml(item.unit)}</p>
      </div>
      <div class="cart-item-price">
        <span class="price">₱${item.price.toFixed(2)}</span>
        <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    </div>
  `).join("");

  state.cartTotal = state.cart.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("cart-subtotal").textContent = `₱${state.cartTotal.toFixed(2)}`;
  document.getElementById("cart-total").textContent = `₱${state.cartTotal.toFixed(2)}`;
  document.getElementById("btn-checkout").disabled = false;
}

function removeFromCart(itemId) {
  state.cart = state.cart.filter(item => item.id !== itemId);
  updateCart();
  showToast("Item removed from cart");
}

function clearCart() {
  if (state.cart.length === 0) {
    showToast("Cart is already empty");
    return;
  }

  if (confirm("Are you sure you want to clear all items from the cart?")) {
    state.cart = [];
    updateCart();
    showToast("Cart cleared");
  }
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("active");
  state.selectedProduct = null;
  state.selectedUnit = null;
  state.customKg = 0;
  state.quantity = 1;
}

// ============================================
// Checkout Functions
// ============================================

function checkout() {
  if (state.cart.length === 0) return;

  state.paymentMethod = document.getElementById("payment-method").value;

  const summary = document.getElementById("checkout-summary");
  summary.innerHTML = `
    <div class="checkout-items">
      ${state.cart.map(item => `
        <div class="checkout-item">
          <span>${item.productName} (${item.unit})</span>
          <span>₱${item.price.toFixed(2)}</span>
        </div>
      `).join("")}
    </div>
    <div class="checkout-total">
      <span>Total:</span>
      <span class="amount">₱${state.cartTotal.toFixed(2)}</span>
    </div>
    <div class="checkout-payment">
      Payment Method: <strong>${state.paymentMethod}</strong>
    </div>
    <div class="checkout-cash-section">
      <div class="cash-input-group">
        <label for="customer-cash">Customer Cash:</label>
        <div class="cash-input-wrapper">
          <span class="currency-symbol">₱</span>
          <input type="number" id="customer-cash" placeholder="0.00" min="0" step="0.01" oninput="calculateChange()">
        </div>
      </div>
      <div class="quick-cash-buttons">
        <button type="button" onclick="setQuickCash(${Math.ceil(state.cartTotal / 100) * 100})">₱${Math.ceil(state.cartTotal / 100) * 100}</button>
        <button type="button" onclick="setQuickCash(${Math.ceil(state.cartTotal / 500) * 500})">₱${Math.ceil(state.cartTotal / 500) * 500}</button>
        <button type="button" onclick="setQuickCash(1000)">₱1,000</button>
        <button type="button" onclick="setQuickCash(${state.cartTotal})">Exact</button>
      </div>
      <div class="change-display" id="change-display">
        <span>Change:</span>
        <span class="change-amount" id="change-amount">₱0.00</span>
      </div>
    </div>
  `;

  document.getElementById("checkout-modal").classList.add("active");

  // Focus on cash input
  setTimeout(() => {
    document.getElementById("customer-cash").focus();
  }, 100);
}

function setQuickCash(amount) {
  document.getElementById("customer-cash").value = amount.toFixed(2);
  calculateChange();
}

function calculateChange() {
  const cashInput = document.getElementById("customer-cash");
  const changeDisplay = document.getElementById("change-amount");
  const cash = parseFloat(cashInput.value) || 0;
  const change = cash - state.cartTotal;

  if (cash === 0) {
    changeDisplay.textContent = "₱0.00";
    changeDisplay.classList.remove("positive", "negative");
  } else if (change >= 0) {
    changeDisplay.textContent = `₱${change.toFixed(2)}`;
    changeDisplay.classList.add("positive");
    changeDisplay.classList.remove("negative");
  } else {
    changeDisplay.textContent = `₱${Math.abs(change).toFixed(2)} short`;
    changeDisplay.classList.add("negative");
    changeDisplay.classList.remove("positive");
  }
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal").classList.remove("active");
}

async function confirmCheckout() {
  // Validate cash payment
  if (state.paymentMethod === "Cash") {
    const cashInput = document.getElementById("customer-cash");
    const cash = parseFloat(cashInput.value) || 0;

    if (cash < state.cartTotal) {
      showToast("Insufficient cash amount. Please collect the correct payment.");
      cashInput.focus();
      return;
    }
  }

  showLoading("Processing transaction...");

  try {
    // Create new transaction record
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const txnCount = state.transactions.filter(t => t.id.includes(dateStr)).length + 1;
    const txnId = `TXN-${dateStr}-${String(txnCount).padStart(3, '0')}`;

    const newTransaction = {
      id: txnId,
      date: now.toISOString(),
      items: state.cart.map(item => ({
        productId: item.productId,
        name: item.productName,
        brand: item.brand || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        price: item.price,
        // Amount fields for accurate cost calculations
        kgAmount: item.kgAmount || 0,
        sackAmount: item.sackAmount || 0,
        pieceAmount: item.pieceAmount || 0,
        boxAmount: item.boxAmount || 0,
        isWholesale: item.isWholesale || false
      })),
      subtotal: state.cartTotal,
      total: state.cartTotal,
      paymentMethod: state.paymentMethod,
      syncStatus: 'pending',
      lastModified: new Date().toISOString()
    };

    // Store original state for potential rollback
    const originalDisplayState = JSON.parse(JSON.stringify(state.display));
    const originalInventoryState = JSON.parse(JSON.stringify(state.inventory));

    try {
      // Process all deductions FIRST before committing the transaction
      for (const item of state.cart) {
        console.log(`[Checkout] Processing item:`, {
          product: item.productName,
          category: item.category,
          kgAmount: item.kgAmount,
          pieceAmount: item.pieceAmount,
          boxAmount: item.boxAmount,
          sackAmount: item.sackAmount
        });

        // 1. Feed products - kg sales deduct from display
        if (item.kgAmount > 0) {
          console.log(`[Checkout] Deducting ${item.kgAmount} kg from display`);
          const success = await deductFromDisplay(item.productId, item.kgAmount);
          if (!success) {
            throw new Error(`Insufficient display stock for ${item.productName}`);
          }
        }

        // 2. Feed products - sack sales deduct from inventory
        if (item.sackAmount > 0) {
          console.log(`[Checkout] Deducting ${item.sackAmount} sacks from inventory`);
          const success = await deductFromInventory(item.productId, item.sackAmount, 'sack');
          if (!success) {
            throw new Error(`Insufficient inventory for ${item.productName}`);
          }
        }

        // 3. Non-feed products - piece sales deduct from display
        if (item.pieceAmount > 0) {
          console.log(`[Checkout] Deducting ${item.pieceAmount} pieces from display`);
          const success = await deductPiecesFromDisplay(item.productId, item.pieceAmount);
          if (!success) {
            throw new Error(`Insufficient display stock for ${item.productName}`);
          }
        }

        // 4. Non-feed products - box sales deduct from inventory
        if (item.boxAmount > 0) {
          console.log(`[Checkout] Deducting ${item.boxAmount} boxes from inventory`);
          const success = await deductFromInventory(item.productId, item.boxAmount, 'box');
          if (!success) {
            throw new Error(`Insufficient inventory for ${item.productName}`);
          }
        }
      }

      // All deductions successful - now save the transaction
      await addTransactionWithSync(newTransaction);
      state.transactions.unshift(newTransaction);

      // Clear cart and show success
      state.cart = [];
      updateCart();
      closeCheckoutModal();
      hideLoading();
      showToast("Transaction completed successfully!");

      // Update dashboard displays (event-driven updates)
      updateDashboardAfterSale();
    } catch (deductError) {
      // Rollback: restore state if deductions failed
      console.error("Checkout deduction error:", deductError);
      state.display = originalDisplayState;
      state.inventory = originalInventoryState;
      renderDisplay();
      renderInventory();
      throw new Error(`Checkout failed: ${deductError.message}`);
    }
  } catch (error) {
    hideLoading();
    console.error("Checkout error:", error);
    showToast(error.message || "Error processing transaction. Please try again.");
  }
}

// ============================================
// Sales History Functions
// ============================================

function renderSalesHistory() {
  const filteredTransactions = getFilteredTransactions();
  const container = document.getElementById("transaction-list");

  // Update summary cards
  updateSalesSummary(filteredTransactions);

  if (filteredTransactions.length === 0) {
    container.innerHTML = `
      <div class="no-transactions">
        <div class="no-transactions-icon">RECEIPT</div>
        <p>No transactions found</p>
        <small>${state.salesHistorySearch ? `for "${state.salesHistorySearch}"` : 'for this period'}</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredTransactions.map(txn => {
    const txnDate = new Date(txn.date);
    const formattedDate = formatTransactionDate(txnDate);
    const itemCount = txn.items.length;
    const paymentClass = txn.paymentMethod.toLowerCase();

    return `
      <div class="transaction-card" onclick="viewTransactionDetails('${txn.id}')">
        <div class="transaction-info">
          <div class="transaction-id">#${txn.id}</div>
          <div class="transaction-meta">
            <span class="transaction-items-count">${itemCount} item${itemCount > 1 ? 's' : ''}</span>
            <span class="transaction-date">${formattedDate}</span>
          </div>
        </div>
        <div class="transaction-right">
          <div class="transaction-total">₱${txn.total.toLocaleString()}</div>
          <div class="transaction-payment ${paymentClass}">${txn.paymentMethod}</div>
        </div>
      </div>
    `;
  }).join("");
}

function getFilteredTransactions() {
  let filtered = [...state.transactions];

  // Apply date filter
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (state.salesHistoryFilter === "today") {
    filtered = filtered.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate >= today;
    });
  } else if (state.salesHistoryFilter === "week") {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    filtered = filtered.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate >= weekAgo;
    });
  } else if (state.salesHistoryFilter === "month") {
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    filtered = filtered.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate >= monthAgo;
    });
  }

  // Apply payment method filter
  if (state.salesHistoryPayment !== "all") {
    filtered = filtered.filter(txn => txn.paymentMethod === state.salesHistoryPayment);
  }

  // Apply search filter
  if (state.salesHistorySearch.trim()) {
    const search = state.salesHistorySearch.toLowerCase();
    filtered = filtered.filter(txn =>
      txn.id.toLowerCase().includes(search) ||
      txn.items.some(item => item.name.toLowerCase().includes(search))
    );
  }

  // Sort by date descending (newest first)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  return filtered;
}

function updateSalesSummary(transactions) {
  const totalSales = transactions.reduce((sum, txn) => sum + txn.total, 0);
  const transactionCount = transactions.length;
  const averageSale = transactionCount > 0 ? totalSales / transactionCount : 0;

  document.getElementById("summary-total-sales").textContent = `₱${totalSales.toLocaleString()}`;
  document.getElementById("summary-transaction-count").textContent = transactionCount;
  document.getElementById("summary-average-sale").textContent = `₱${Math.round(averageSale).toLocaleString()}`;
}

function formatTransactionDate(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const txnDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (txnDay.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  } else if (txnDay.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + timeStr;
  }
}

function filterByDateRange(range, e) {
  state.salesHistoryFilter = range;

  // Update active button
  document.querySelectorAll(".date-filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (e && e.target) {
    e.target.classList.add("active");
  }

  renderSalesHistory();
}

function filterByPayment() {
  state.salesHistoryPayment = document.getElementById("payment-filter").value;
  renderSalesHistory();
}

function searchTransactions() {
  state.salesHistorySearch = document.getElementById("sales-history-search").value;
  renderSalesHistory();
}

function viewTransactionDetails(txnId) {
  const txn = state.transactions.find(t => t.id === txnId);
  if (!txn) return;

  const txnDate = new Date(txn.date);
  const formattedDate = txnDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  document.getElementById("txn-detail-id").textContent = `#${txn.id}`;
  document.getElementById("txn-detail-date").textContent = formattedDate;

  // Render items
  const itemsHtml = txn.items.map(item => `
    <div class="txn-item">
      <div class="txn-item-info">
        <div class="txn-item-name">${item.name}</div>
        <div class="txn-item-details">${item.quantity} ${item.unit} x ₱${item.unitPrice.toLocaleString()}</div>
      </div>
      <div class="txn-item-price">₱${item.price.toLocaleString()}</div>
    </div>
  `).join("");

  document.getElementById("txn-detail-items").innerHTML = itemsHtml;
  document.getElementById("txn-detail-subtotal").textContent = `₱${txn.subtotal.toLocaleString()}`;
  document.getElementById("txn-detail-total").textContent = `₱${txn.total.toLocaleString()}`;

  const paymentBadge = document.getElementById("txn-detail-payment");
  paymentBadge.textContent = txn.paymentMethod;
  paymentBadge.className = `payment-badge ${txn.paymentMethod.toLowerCase()}`;

  document.getElementById("transaction-detail-modal").classList.add("active");
}

function closeTransactionModal() {
  document.getElementById("transaction-detail-modal").classList.remove("active");
}

// ============================================
// Notification System Functions
// ============================================

let notifications = [];

function generateNotifications() {
  notifications = [];
  const now = new Date();

  // 1. Low Stock Alerts (Critical)
  const lowStockItems = state.inventory.filter(item => item.lowStock);
  if (lowStockItems.length > 0) {
    // Add individual critical items
    const criticalItems = lowStockItems.slice(0, 3); // Top 3 critical items
    criticalItems.forEach(item => {
      const stockDisplay = item.category === 'Feed'
        ? `${item.stockKg} kg / ${item.stockSacks} sacks`
        : `${item.stockUnits} units`;
      notifications.push({
        id: `lowstock-${item.id}`,
        type: 'danger',
        icon: '!',
        title: 'Critical Low Stock',
        message: `${item.name} is running low (${stockDisplay}). Restock soon!`,
        time: now,
        action: 'inventory',
        read: false
      });
    });

    // Summary notification if more items
    if (lowStockItems.length > 3) {
      notifications.push({
        id: 'lowstock-summary',
        type: 'warning',
        icon: '!',
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} items need restocking. Check inventory for details.`,
        time: now,
        action: 'inventory',
        read: false
      });
    }
  }

  // 2. Display Stock Running Low
  const lowDisplayItems = state.display.filter(d => {
    const percentUsed = ((d.originalKg - d.remainingKg) / d.originalKg) * 100;
    return percentUsed > 70;
  });
  if (lowDisplayItems.length > 0) {
    lowDisplayItems.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      notifications.push({
        id: `display-${item.id}`,
        type: 'warning',
        icon: '!',
        title: 'Display Stock Low',
        message: `${product?.name || 'Product'} on display: Only ${item.remainingKg.toFixed(1)} kg remaining.`,
        time: now,
        action: 'display',
        read: false
      });
    });
  }

  // 3. Today's Sales Summary
  const todayTransactions = state.transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    return txnDate.toDateString() === now.toDateString();
  });
  if (todayTransactions.length > 0) {
    const todaySales = todayTransactions.reduce((sum, txn) => sum + txn.total, 0);
    notifications.push({
      id: 'today-sales',
      type: 'success',
      icon: '$',
      title: "Today's Sales",
      message: `You've made ${todayTransactions.length} sale(s) totaling ₱${todaySales.toLocaleString()} today.`,
      time: now,
      action: 'sales-history',
      read: false
    });
  }

  // 4. Best Seller Insight
  const productSales = {};
  state.transactions.forEach(txn => {
    txn.items.forEach(item => {
      if (!productSales[item.name]) {
        productSales[item.name] = { count: 0, revenue: 0 };
      }
      productSales[item.name].count += item.quantity;
      productSales[item.name].revenue += item.price;
    });
  });
  const topProduct = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue)[0];
  if (topProduct) {
    notifications.push({
      id: 'top-seller',
      type: 'info',
      icon: '*',
      title: 'Top Seller',
      message: `${topProduct[0]} is your best seller with ₱${topProduct[1].revenue.toLocaleString()} in sales.`,
      time: now,
      action: 'products',
      read: false
    });
  }

  // 5. Wholesale Opportunity
  const feedProducts = state.products.filter(p => p.category === 'Feed');
  const highStockFeeds = state.inventory.filter(inv => {
    const product = feedProducts.find(p => p.id === inv.id);
    return product && inv.stockSacks >= 20 && !inv.lowStock;
  });
  if (highStockFeeds.length > 0) {
    const product = state.products.find(p => p.id === highStockFeeds[0].id);
    notifications.push({
      id: 'wholesale-opportunity',
      type: 'info',
      icon: 'i',
      title: 'Wholesale Opportunity',
      message: `You have high stock of ${product?.name}. Consider promoting wholesale pricing!`,
      time: now,
      action: 'pos',
      read: false
    });
  }

  // 6. Recent Large Transaction
  const recentLargeTxn = state.transactions.find(txn => txn.total >= 5000);
  if (recentLargeTxn) {
    const txnDate = new Date(recentLargeTxn.date);
    notifications.push({
      id: `large-txn-${recentLargeTxn.id}`,
      type: 'success',
      icon: '$',
      title: 'Large Sale!',
      message: `Transaction ${recentLargeTxn.id} was ₱${recentLargeTxn.total.toLocaleString()} - Great job!`,
      time: txnDate,
      action: 'sales-history',
      read: false
    });
  }

  // 7. Expiring Soon (Demo - for medicines)
  const medicineItems = state.inventory.filter(inv => inv.category === 'Medicine');
  if (medicineItems.length > 0) {
    const randomMedicine = medicineItems[Math.floor(Math.random() * medicineItems.length)];
    const product = state.products.find(p => p.id === randomMedicine.id);
    notifications.push({
      id: 'expiry-warning',
      type: 'warning',
      icon: '!',
      title: 'Expiry Reminder',
      message: `Check expiry dates for ${product?.name}. Medicines should be sold first!`,
      time: now,
      action: 'inventory',
      read: false
    });
  }

  // Sort by time (newest first)
  notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

  // Update badge and render
  updateNotificationBadge();
  renderNotifications();
}

function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  const unreadCount = notifications.filter(n => !n.read).length;

  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function renderNotifications() {
  const container = document.getElementById("notification-list");

  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="no-notifications">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <p>No notifications</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications.map(notif => `
    <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick('${notif.id}', '${notif.action}')">
      <div class="notification-icon ${notif.type}">${notif.icon}</div>
      <div class="notification-content">
        <div class="notification-title">${notif.title}</div>
        <div class="notification-message">${notif.message}</div>
        <div class="notification-time">${formatNotificationTime(notif.time)}</div>
      </div>
    </div>
  `).join("");
}

function formatNotificationTime(time) {
  const now = new Date();
  const notifTime = new Date(time);
  const diffMs = now - notifTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function toggleNotifications() {
  const dropdown = document.getElementById("notification-dropdown");
  dropdown.classList.toggle("active");

  // Close when clicking outside
  if (dropdown.classList.contains("active")) {
    setTimeout(() => {
      document.addEventListener("click", closeNotificationsOnClickOutside);
    }, 10);
  }
}

function closeNotificationsOnClickOutside(e) {
  const dropdown = document.getElementById("notification-dropdown");
  const wrapper = document.querySelector(".notification-wrapper");

  if (!wrapper.contains(e.target)) {
    dropdown.classList.remove("active");
    document.removeEventListener("click", closeNotificationsOnClickOutside);
  }
}

function handleNotificationClick(notifId, action) {
  // Mark as read
  const notif = notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    updateNotificationBadge();
    renderNotifications();
  }

  // Close dropdown
  document.getElementById("notification-dropdown").classList.remove("active");

  // Navigate to relevant screen
  if (action) {
    navigateTo(action);
  }
}

function markAllAsRead() {
  notifications.forEach(n => n.read = true);
  updateNotificationBadge();
  renderNotifications();
}

// ============================================
// Inventory Functions
// ============================================

let currentInventoryFilter = "all";

function renderInventory(filter = currentInventoryFilter) {
  const grid = document.getElementById("inventory-grid");
  let filteredInventory = state.inventory;

  if (filter === "lowstock") {
    filteredInventory = state.inventory.filter(item => item.lowStock);
  } else if (filter !== "all") {
    filteredInventory = state.inventory.filter(item => item.category === filter);
  }

  if (filteredInventory.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No items found in this category</p></div>`;
    return;
  }

  grid.innerHTML = filteredInventory.map(item => {
    const product = state.products.find(p => p.id === item.id);

    if (item.category === "Feed") {
      // Get display info for Feed products (use String() for type-safe comparison)
      const displayCount = state.display.filter(d => String(d.productId) === String(item.id)).length;
      const displayKg = getDisplayKgForProduct(item.id);
      const totalSacks = item.stockSacks + displayCount; // Total = stored + on display

      return `
        <div class="inventory-card ${item.lowStock ? 'low-stock' : ''}" onclick="openEditInventoryModal(${item.id})">
          <div class="inventory-card-header">
            <div class="inventory-info">
              <h3>${escapeHtml(item.name)}</h3>
              <span class="category">${escapeHtml(item.category)}</span>
            </div>
            <button class="inventory-edit-btn" onclick="event.stopPropagation(); openEditInventoryModal(${item.id})">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <div class="stock-details">
            <div class="stock-row">
              <span class="stock-label">Total Sacks</span>
              <span class="stock-value">${totalSacks} Sacks</span>
            </div>
            <div class="stock-row">
              <span class="stock-label">In Storage</span>
              <span class="stock-value ${item.stockSacks < 5 ? 'warning' : ''}">${item.stockSacks} Sacks</span>
            </div>
            <div class="stock-row display-row">
              <span class="stock-label">On Display</span>
              <span class="stock-value display-value">${displayCount} Sacks (${displayKg.toFixed(2)} kg)</span>
            </div>
          </div>
          ${item.lowStock ? '<span class="low-stock-badge">LOW STOCK</span>' : ''}
        </div>
      `;
    } else {
      // Get display info for Non-feed products (use String() for type-safe comparison)
      const displayCount = state.display.filter(d => String(d.productId) === String(item.id)).length;
      const displayPieces = getDisplayPiecesForProduct(item.id);
      const totalBoxes = item.stockUnits + displayCount; // Total = stored + on display (as boxes)

      return `
        <div class="inventory-card ${item.lowStock ? 'low-stock' : ''}" onclick="openEditInventoryModal(${item.id})">
          <div class="inventory-card-header">
            <div class="inventory-info">
              <h3>${escapeHtml(item.name)}</h3>
              <span class="category">${escapeHtml(item.category)}</span>
            </div>
            <button class="inventory-edit-btn" onclick="event.stopPropagation(); openEditInventoryModal(${item.id})">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <div class="stock-details">
            <div class="stock-row">
              <span class="stock-label">Total Boxes</span>
              <span class="stock-value">${totalBoxes} Boxes</span>
            </div>
            <div class="stock-row">
              <span class="stock-label">In Storage</span>
              <span class="stock-value ${item.stockUnits < 5 ? 'warning' : ''}">${item.stockUnits} Boxes</span>
            </div>
            <div class="stock-row display-row">
              <span class="stock-label">On Display</span>
              <span class="stock-value display-value">${displayCount} Boxes (${displayPieces} pieces)</span>
            </div>
          </div>
          ${item.lowStock ? '<span class="low-stock-badge">LOW STOCK</span>' : ''}
        </div>
      `;
    }
  }).join("");
}

function filterInventory(category, e) {
  currentInventoryFilter = category;

  // Update filter buttons
  document.querySelectorAll(".inventory-filter .filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (e && e.target) {
    e.target.classList.add("active");
  }

  renderInventory(category);
}

function searchInventory(searchTerm) {
  // Get search term from parameter or input element
  const search = (searchTerm || document.getElementById("inventory-search").value || "").toLowerCase();
  const cards = document.querySelectorAll(".inventory-card");

  cards.forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(search) ? "" : "none";
  });
}

// ============================================
// Inventory Edit Functions
// ============================================

let editingInventoryId = null;

function openEditInventoryModal(inventoryId) {
  const item = state.inventory.find(i => i.id === inventoryId);
  if (!item) {
    showToast("Inventory item not found");
    return;
  }

  editingInventoryId = inventoryId;

  // Set product info
  document.getElementById("edit-inventory-name").textContent = item.name;
  document.getElementById("edit-inventory-category").textContent = item.category;

  // Show/hide appropriate fields based on category
  if (item.category === "Feed") {
    document.getElementById("feed-stock-fields").style.display = "block";
    document.getElementById("unit-stock-fields").style.display = "none";
    document.getElementById("edit-stock-sacks").value = item.stockSacks || 0;
  } else {
    document.getElementById("feed-stock-fields").style.display = "none";
    document.getElementById("unit-stock-fields").style.display = "block";
    document.getElementById("edit-stock-units").value = item.stockUnits || 0;
  }

  // Set low stock threshold
  document.getElementById("edit-low-stock-threshold").value = item.lowStockThreshold || 0;

  // Show modal
  document.getElementById("edit-inventory-modal").classList.add("active");
}

function closeEditInventoryModal() {
  document.getElementById("edit-inventory-modal").classList.remove("active");
  editingInventoryId = null;
}

async function saveInventoryStock() {
  if (!editingInventoryId) {
    showToast("No inventory item selected");
    return;
  }

  const item = state.inventory.find(i => i.id === editingInventoryId);
  if (!item) {
    showToast("Inventory item not found");
    return;
  }

  // Get threshold value
  const threshold = parseInt(document.getElementById("edit-low-stock-threshold").value) || 0;
  item.lowStockThreshold = threshold;

  // Get values based on category and calculate low stock status
  if (item.category === "Feed") {
    const newSacks = parseInt(document.getElementById("edit-stock-sacks").value) || 0;
    item.stockSacks = newSacks;
    // Auto-calculate low stock based on threshold
    item.lowStock = newSacks <= threshold && threshold > 0;
  } else {
    const newUnits = parseInt(document.getElementById("edit-stock-units").value) || 0;
    item.stockUnits = newUnits;
    // Auto-calculate low stock based on threshold
    item.lowStock = newUnits <= threshold && threshold > 0;
  }

  // Save to database with sync
  await updateInventoryWithSync(editingInventoryId, item);

  // Update UI
  renderInventory();
  closeEditInventoryModal();
  showToast("Stock updated successfully");

  // Update dashboard
  updateDashboardCards();
}

// ============================================
// Display Functions
// ============================================

function searchDisplay(searchTerm) {
  // Get search term from parameter or input element
  const search = (searchTerm || document.getElementById("display-search").value || "").toLowerCase();
  const cards = document.querySelectorAll(".display-card");

  cards.forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(search) ? "" : "none";
  });
}

// Global search handler - routes to appropriate search based on current screen
function handleGlobalSearch() {
  const searchTerm = document.getElementById("global-search").value;

  switch (state.currentScreen) {
    case "display":
      searchDisplay(searchTerm);
      break;
    case "inventory":
      searchInventory(searchTerm);
      break;
    case "products":
      currentProductsSearch = searchTerm.toLowerCase();
      renderProductsTable(currentProductsFilter);
      break;
  }
}

function renderDisplay() {
  const grid = document.getElementById("display-grid");

  if (state.display.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>No items on display</p>
        <p class="empty-hint">Add a sack to display for kg retail sales</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.display.map(item => {
    // Use String() for type-safe comparison after Supabase sync
    const product = state.products.find(p => String(p.id) === String(item.productId));
    const isFeed = item.category === "Feed" || (product && product.category === "Feed");

    // Use appropriate fields based on product type
    let original, remaining, unit;
    if (isFeed) {
      original = item.originalKg || 0;
      remaining = item.remainingKg || 0;
      unit = "kg";
    } else {
      original = item.originalPieces || item.originalKg || 0;  // Fallback for old data
      remaining = item.remainingPieces !== undefined ? item.remainingPieces : (item.remainingKg || 0);
      unit = "piece(s)";
    }

    const usedAmount = original - remaining;
    const percentUsed = original > 0 ? (usedAmount / original) * 100 : 0;
    // For non-feed: low when less than 20% of original pieces remain
    const lowThreshold = isFeed ? 5 : Math.max(1, Math.floor(original * 0.2));
    const isLow = remaining < lowThreshold;

    return `
      <div class="display-card ${isLow ? 'low-display' : ''}">
        <div class="display-card-header">
          <div class="display-info">
            <h3>${escapeHtml(item.productName)}</h3>
            <span class="display-date">Opened: ${formatDate(item.displayDate)}</span>
            <span class="display-category">${escapeHtml(item.category || (product ? product.category : 'Unknown'))}</span>
          </div>
        </div>
        <div class="display-stock">
          <div class="display-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${100 - percentUsed}%"></div>
            </div>
            <div class="display-kg-info">
              <span class="remaining-kg">${isFeed ? remaining.toFixed(2) : remaining} ${unit}</span>
              <span class="original-kg">/ ${isFeed ? original.toFixed(2) : original} ${unit}</span>
            </div>
          </div>
          <div class="display-stats">
            <div class="stat">
              <span class="stat-label">Sold</span>
              <span class="stat-value">${isFeed ? usedAmount.toFixed(2) : usedAmount} ${unit}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Remaining</span>
              <span class="stat-value ${isLow ? 'warning' : ''}">${isFeed ? remaining.toFixed(2) : remaining} ${unit}</span>
            </div>
          </div>
        </div>
        ${isLow ? '<span class="low-display-badge">LOW STOCK</span>' : ''}
        <button class="btn-remove-display" onclick="removeFromDisplay(${item.id})">Remove Display</button>
      </div>
    `;
  }).join("");
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function openAddDisplayModal() {
  // Populate all products dropdown
  const select = document.getElementById("display-product-select");
  const allProducts = state.products;

  select.innerHTML = '<option value="">-- Select a product --</option>' +
    allProducts.map(p => {
      const inv = state.inventory.find(i => i.id === p.id);
      // For Feed: use sacks, for others: use boxes (each box = piecesPerBox pieces)
      const isFeed = p.category === "Feed";
      const availableStock = isFeed ? (inv ? inv.stockSacks : 0) : (inv ? inv.stockUnits : 0);
      const stockUnit = isFeed ? "sacks" : "boxes";
      // Check how many are already on display (use String() for type-safe comparison)
      const onDisplay = state.display.filter(d => String(d.productId) === String(p.id)).length;
      const remaining = availableStock - onDisplay;

      return `<option value="${p.id}" ${remaining <= 0 ? 'disabled' : ''}>
        ${escapeHtml(p.name)} (${remaining} ${stockUnit} available)
      </option>`;
    }).join("");

  // Set default date to today
  document.getElementById("display-date").value = new Date().toISOString().split('T')[0];

  // Hide product info initially
  document.getElementById("display-product-info").style.display = "none";

  // Add change listener to show product info
  select.onchange = function() {
    const productId = parseInt(this.value);
    if (productId) {
      const product = state.products.find(p => p.id === productId);
      const inv = state.inventory.find(i => i.id === productId);
      const isFeed = product.category === "Feed";

      document.getElementById("display-info-name").textContent = product.name;
      document.getElementById("display-info-kg").textContent = isFeed ? `${product.kgPerSack || 25} kg/sack` : `${product.piecesPerBox || 1} pieces/box`;
      document.getElementById("display-info-stock").textContent = isFeed ? `${inv ? inv.stockSacks : 0} sacks` : `${inv ? inv.stockUnits : 0} boxes`;
      document.getElementById("display-product-info").style.display = "block";
    } else {
      document.getElementById("display-product-info").style.display = "none";
    }
  };

  document.getElementById("add-display-modal").classList.add("active");
}

function closeAddDisplayModal() {
  document.getElementById("add-display-modal").classList.remove("active");
}

async function addToDisplay() {
  const productId = parseInt(document.getElementById("display-product-select").value);
  const displayDate = document.getElementById("display-date").value;

  if (!productId) {
    showToast("Please select a product");
    return;
  }

  if (!displayDate) {
    showToast("Please select a date");
    return;
  }

  const product = state.products.find(p => p.id === productId);
  const inv = state.inventory.find(i => i.id === productId);

  if (!product) {
    showToast("Product not found");
    return;
  }

  const isFeed = product.category === "Feed";

  // Check stock availability based on product type
  const availableStock = isFeed ? (inv ? inv.stockSacks : 0) : (inv ? inv.stockUnits : 0);

  if (!inv || availableStock <= 0) {
    showToast("No stock available");
    return;
  }

  // Check if we have available stock (not already on display) - use String() for type-safe comparison
  const onDisplay = state.display.filter(d => String(d.productId) === String(productId)).length;
  if (onDisplay >= availableStock) {
    showToast("All stock is already on display");
    return;
  }

  // For Feed: use kg per sack, for others: use pieces per box
  const displayQuantity = isFeed ? (product.kgPerSack || 25) : (product.piecesPerBox || 1);
  const quantityLabel = isFeed ? "kg" : "piece(s)";

  // Add to display with sync metadata
  // Include all fields with defaults to satisfy Supabase NOT NULL constraints
  const newDisplay = {
    id: Date.now(),
    productId: productId,
    productName: product.name,
    displayDate: displayDate,
    category: product.category,
    // Default all quantity fields to 0 (Supabase requires non-null)
    originalKg: 0,
    remainingKg: 0,
    originalPieces: 0,
    remainingPieces: 0,
    syncStatus: 'pending',
    lastModified: new Date().toISOString()
  };

  // Set the appropriate quantity field based on product type
  if (isFeed) {
    newDisplay.originalKg = displayQuantity;
    newDisplay.remainingKg = displayQuantity;
  } else {
    newDisplay.originalPieces = displayQuantity;
    newDisplay.remainingPieces = displayQuantity;
  }

  // Save to DB first, then update state
  await addDisplayWithSync(newDisplay);
  state.display.push(newDisplay);

  // Update inventory - reduce stock by 1
  if (isFeed) {
    const newStockSacks = inv.stockSacks - 1;
    const newStockKg = (inv.stockKg || 0) - displayQuantity;
    await updateInventoryWithSync(productId, { stockSacks: newStockSacks, stockKg: newStockKg });
    inv.stockSacks = newStockSacks;
    inv.stockKg = newStockKg;
  } else {
    const newStockUnits = inv.stockUnits - 1;
    await updateInventoryWithSync(productId, { stockUnits: newStockUnits });
    inv.stockUnits = newStockUnits;
  }

  renderDisplay();
  renderInventory();
  updateDashboardCards(); // Update dashboard
  closeAddDisplayModal();
  showToast(`${product.name} added to display (${displayQuantity} ${quantityLabel})`);
}

async function removeFromDisplay(displayId) {
  const displayItem = state.display.find(d => d.id === displayId);

  if (!displayItem) return;

  if (displayItem.remainingKg > 0) {
    if (!confirm(`This display still has ${displayItem.remainingKg.toFixed(2)} kg remaining. Remove anyway?`)) {
      return;
    }
  }

  // Remove from display (DB first, then state)
  await deleteDisplayWithSync(displayId);
  state.display = state.display.filter(d => d.id !== displayId);

  renderDisplay();
  updateDashboardCards(); // Update dashboard
  showToast("Display removed");
}

// Get total display kg for a product (Feed)
function getDisplayKgForProduct(productId) {
  // Use == for loose comparison to handle string/number type mismatch after Supabase sync
  return state.display
    .filter(d => String(d.productId) === String(productId))
    .reduce((total, d) => total + (d.remainingKg || 0), 0);
}

// Get total display pieces for a product (Non-feed)
function getDisplayPiecesForProduct(productId) {
  // Use == for loose comparison to handle string/number type mismatch after Supabase sync
  return state.display
    .filter(d => String(d.productId) === String(productId))
    .reduce((total, d) => {
      // Use remainingPieces if available, else fall back to remainingKg (old format)
      const pieces = d.remainingPieces !== undefined ? d.remainingPieces : (d.remainingKg || 0);
      return total + pieces;
    }, 0);
}

// Deduct kg from display (used by POS for Feed products)
async function deductFromDisplay(productId, kgAmount) {
  let remaining = kgAmount;

  // Sort displays by date (oldest first) to use FIFO
  // Use String() for type-safe comparison after Supabase sync
  const productDisplays = state.display
    .filter(d => String(d.productId) === String(productId))
    .sort((a, b) => new Date(a.displayDate) - new Date(b.displayDate));

  for (const display of productDisplays) {
    if (remaining <= 0) break;

    if (display.remainingKg >= remaining) {
      const newRemainingKg = display.remainingKg - remaining;
      remaining = 0;
      // Update in DB with sync, then state
      await updateDisplayWithSync(display.id, { remainingKg: newRemainingKg });
      display.remainingKg = newRemainingKg;
    } else {
      remaining -= display.remainingKg;
      // Update in DB with sync, then state
      await updateDisplayWithSync(display.id, { remainingKg: 0 });
      display.remainingKg = 0;
    }
  }

  // Remove empty Feed displays from DB first, then state
  // Only remove if remainingKg is 0 AND it's a Feed product (has originalKg but no originalPieces)
  const emptyFeedDisplays = state.display.filter(d => d.remainingKg <= 0 && d.originalKg && !d.originalPieces);
  for (const empty of emptyFeedDisplays) {
    await deleteDisplayWithSync(empty.id);
  }
  state.display = state.display.filter(d => !(d.remainingKg <= 0 && d.originalKg && !d.originalPieces));

  renderDisplay();
  return remaining === 0; // Returns true if successfully deducted all
}

// Deduct pieces from display (used by POS for non-feed products)
async function deductPiecesFromDisplay(productId, pieceAmount) {
  console.log(`[POS] Deducting ${pieceAmount} pieces from product ${productId}`);
  let remaining = pieceAmount;

  // Sort displays by date (oldest first) to use FIFO
  // Use String() for type-safe comparison after Supabase sync
  const productDisplays = state.display
    .filter(d => String(d.productId) === String(productId))
    .sort((a, b) => new Date(a.displayDate) - new Date(b.displayDate));

  console.log(`[POS] Found ${productDisplays.length} display entries for product`);

  for (const display of productDisplays) {
    if (remaining <= 0) break;

    // Handle both new format (remainingPieces) and old format (remainingKg used for pieces)
    const currentPieces = display.remainingPieces !== undefined ? display.remainingPieces : (display.remainingKg || 0);
    console.log(`[POS] Display ${display.id}: current pieces = ${currentPieces}, remaining to deduct = ${remaining}`);

    if (currentPieces >= remaining) {
      const newRemainingPieces = currentPieces - remaining;
      remaining = 0;
      console.log(`[POS] Deducting ${pieceAmount} pieces, new remaining = ${newRemainingPieces}`);
      // Update in DB with sync, then state
      await updateDisplayWithSync(display.id, { remainingPieces: newRemainingPieces });
      display.remainingPieces = newRemainingPieces;
    } else {
      remaining -= currentPieces;
      console.log(`[POS] Not enough in this display, taking all ${currentPieces}, still need ${remaining}`);
      // Update in DB with sync, then state
      await updateDisplayWithSync(display.id, { remainingPieces: 0 });
      display.remainingPieces = 0;
    }
  }

  // Remove empty non-feed displays from DB first, then state
  // Check for displays where pieces are depleted (either remainingPieces=0 or old format with remainingKg=0 for non-feed)
  const isEmptyNonFeedDisplay = (d) => {
    const product = state.products.find(p => p.id === d.productId);
    if (!product || product.category === "Feed") return false;
    const pieces = d.remainingPieces !== undefined ? d.remainingPieces : (d.remainingKg || 0);
    return pieces <= 0;
  };

  const emptyPieceDisplays = state.display.filter(isEmptyNonFeedDisplay);
  for (const empty of emptyPieceDisplays) {
    await deleteDisplayWithSync(empty.id);
  }
  state.display = state.display.filter(d => !isEmptyNonFeedDisplay(d));

  renderDisplay();
  return remaining === 0; // Returns true if successfully deducted all
}

// Deduct from inventory (sacks or boxes)
async function deductFromInventory(productId, amount, type) {
  const inventory = state.inventory.find(i => i.id === productId);
  if (!inventory) return false;

  if (type === 'sack') {
    if (inventory.stockSacks < amount) return false;
    inventory.stockSacks -= amount;
    await updateInventoryWithSync(productId, { stockSacks: inventory.stockSacks });
  } else if (type === 'box') {
    if (inventory.stockUnits < amount) return false;
    inventory.stockUnits -= amount;
    await updateInventoryWithSync(productId, { stockUnits: inventory.stockUnits });
  }

  // Check for low stock
  checkLowStock(inventory);
  renderInventory();
  return true;
}

// Check and update low stock status
function checkLowStock(inventory) {
  const threshold = inventory.lowStockThreshold || 10;
  const stock = inventory.category === 'Feed' ? inventory.stockSacks : inventory.stockUnits;
  inventory.lowStock = stock <= threshold;
}

// ============================================
// Products Management Functions
// ============================================

let currentProductsFilter = "all";
let currentProductsSearch = "";

function searchProductsTable() {
  currentProductsSearch = document.getElementById("products-search").value.toLowerCase();
  renderProductsTable(currentProductsFilter);
}

function filterProductsTable(category, e) {
  currentProductsFilter = category;

  // Update filter buttons
  document.querySelectorAll(".products-filter .filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (e && e.target) {
    e.target.classList.add("active");
  }

  renderProductsTable(category);
}

function renderProductsTable(filter = "all") {
  const tbody = document.getElementById("products-table-body");

  let filteredProducts = state.products;
  if (filter !== "all") {
    filteredProducts = state.products.filter(p => p.category === filter);
  }

  // Apply search filter
  if (currentProductsSearch) {
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(currentProductsSearch) ||
      (p.brand && p.brand.toLowerCase().includes(currentProductsSearch))
    );
  }

  tbody.innerHTML = filteredProducts.map(product => {
    const hasWholesale = product.wholesalePrice && product.wholesaleMin;
    const wholesaleUnit = product.category === "Feed" ? 'sacks' : 'boxes';
    const wholesaleInfo = hasWholesale
      ? `<span class="wholesale-info">Wholesale: ₱${product.wholesalePrice}${product.category === "Feed" ? '/sack' : '/box'} (min ${product.wholesaleMin} ${wholesaleUnit})</span>`
      : '';
    const costInfo = product.costPrice
      ? `<span class="cost-info">Cost: ₱${product.costPrice}</span>`
      : '';

    return `
    <tr>
      <td>${product.id}</td>
      <td class="product-name-cell">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="table-product-image">`
          : '<div class="table-product-no-image">No img</div>'}
        <span>${escapeHtml(product.name)}</span>
      </td>
      <td>${escapeHtml(product.brand || '-')}</td>
      <td>${escapeHtml(product.category)}</td>
      <td class="pricing-cell">
        <div class="retail-price">
          ${product.category === "Feed"
            ? `₱${product.pricePerKg}/kg | ₱${product.pricePerSack}/sack (${product.kgPerSack || 25}kg)`
            : product.piecesPerBox > 1
              ? `₱${product.pricePerPiece}/pc | ₱${product.pricePerBox}/box (${product.piecesPerBox}pcs)`
              : `₱${product.pricePerPiece}/unit`}
        </div>
        ${costInfo}
        ${wholesaleInfo}
      </td>
      <td class="actions">
        <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
        <button class="btn-delete" onclick="deleteProduct(${product.id})">Delete</button>
      </td>
    </tr>
  `}).join("");
}

// Handle product image upload
function handleProductImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showToast("Please select an image file");
    return;
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image must be less than 2MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    // Resize image to save space in IndexedDB
    resizeImage(e.target.result, 300, 300, (resizedImage) => {
      currentProductImage = resizedImage;
      updateImagePreview(resizedImage);
    });
  };
  reader.readAsDataURL(file);
}

// Resize image to max dimensions while maintaining aspect ratio
function resizeImage(dataUrl, maxWidth, maxHeight, callback) {
  const img = new Image();
  img.onload = function() {
    let width = img.width;
    let height = img.height;

    // Calculate new dimensions
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round(width * maxHeight / height);
        height = maxHeight;
      }
    }

    // Create canvas and resize
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to base64 with compression
    callback(canvas.toDataURL('image/jpeg', 0.7));
  };
  img.src = dataUrl;
}

// Update image preview in modal
function updateImagePreview(imageData) {
  const preview = document.getElementById("product-image-preview");
  const removeBtn = document.querySelector(".btn-remove-image");

  if (imageData) {
    preview.innerHTML = `<img src="${imageData}" alt="Product preview">`;
    removeBtn.style.display = "block";
  } else {
    preview.innerHTML = `<span class="no-image-text">No image</span>`;
    removeBtn.style.display = "none";
  }
}

// Remove product image
function removeProductImage() {
  currentProductImage = null;
  document.getElementById("edit-product-image").value = "";
  updateImagePreview(null);
}

// Clear image state when modal opens
function clearProductImageState() {
  currentProductImage = null;
  document.getElementById("edit-product-image").value = "";
  updateImagePreview(null);
}

function openProductModal() {
  state.editingProductId = null;
  document.getElementById("edit-modal-title").textContent = "Add New Product";
  document.getElementById("edit-product-name").value = "";
  document.getElementById("edit-product-brand").value = "";
  document.getElementById("edit-product-category").value = "Feed";
  document.getElementById("edit-price-per-kg").value = "";
  document.getElementById("edit-price-per-sack").value = "";
  document.getElementById("edit-kg-per-sack").value = "25";
  document.getElementById("edit-price-per-piece").value = "";
  document.getElementById("edit-price-per-box").value = "";
  document.getElementById("edit-pieces-per-box").value = "12";
  // Clear wholesale fields
  document.getElementById("edit-cost-price").value = "";
  document.getElementById("edit-wholesale-price").value = "";
  document.getElementById("edit-wholesale-min").value = "";
  // Clear image
  clearProductImageState();

  togglePricingFields("Feed");
  document.getElementById("edit-product-modal").classList.add("active");
}

function editProduct(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  state.editingProductId = productId;
  document.getElementById("edit-modal-title").textContent = "Edit Product";
  document.getElementById("edit-product-name").value = product.name;
  document.getElementById("edit-product-brand").value = product.brand || "";
  document.getElementById("edit-product-category").value = product.category;

  if (product.category === "Feed") {
    document.getElementById("edit-price-per-kg").value = product.pricePerKg;
    document.getElementById("edit-price-per-sack").value = product.pricePerSack;
    document.getElementById("edit-kg-per-sack").value = product.kgPerSack || 25;
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats
    document.getElementById("edit-price-per-piece").value = product.pricePerPiece;
    document.getElementById("edit-price-per-box").value = product.pricePerBox || "";
    document.getElementById("edit-pieces-per-box").value = product.piecesPerBox || 1;
  }

  // Load wholesale fields
  document.getElementById("edit-cost-price").value = product.costPrice || "";
  document.getElementById("edit-wholesale-price").value = product.wholesalePrice || "";
  document.getElementById("edit-wholesale-min").value = product.wholesaleMin || "";
  document.getElementById("edit-wholesale-min-kg").value = product.wholesaleMinKg || "";

  // Load existing image
  currentProductImage = product.image || null;
  updateImagePreview(currentProductImage);

  // Toggle pricing fields first (this sets default wholesale type to 'sacks')
  togglePricingFields(product.category);

  // THEN override the wholesale type based on saved product data
  if (product.category === "Feed" && product.wholesaleMinKg) {
    setWholesaleType('kg');
  }

  document.getElementById("edit-product-modal").classList.add("active");
}

async function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    // Remove from local state
    state.products = state.products.filter(p => p.id !== productId);
    state.inventory = state.inventory.filter(i => i.id !== productId);
    state.display = state.display.filter(d => d.productId !== productId);

    // Use sync-aware delete (handles Supabase sync)
    await deleteProductWithSync(productId);

    // Delete related inventory with sync
    await deleteInventoryWithSync(productId);

    // Delete related display records with sync
    const displayRecords = await db.display.where('productId').equals(productId).toArray();
    for (const display of displayRecords) {
      await deleteDisplayWithSync(display.id);
    }

    renderProductsTable();
    renderProducts();
    renderInventory();
    renderDisplay();
    updateDashboardCards(); // Update dashboard
    showToast("Product deleted");
  }
}

function togglePricingFields(category) {
  const feedPricing = document.querySelectorAll(".feed-pricing");
  const medicinePricing = document.querySelectorAll(".medicine-pricing");

  // Feed uses kg/sack pricing, all other categories use piece/box pricing
  if (category === "Feed") {
    feedPricing.forEach(el => el.style.display = "block");
    medicinePricing.forEach(el => el.style.display = "none");
    // Show wholesale type toggle for Feed
    document.getElementById("wholesale-type-container").style.display = "block";
    document.getElementById("wholesale-min-boxes-group").style.display = "none";
    setWholesaleType('sacks'); // Default to sacks for new Feed products
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats all use piece/box pricing
    feedPricing.forEach(el => el.style.display = "none");
    medicinePricing.forEach(el => el.style.display = "block");
    // Hide wholesale type toggle for non-Feed, show boxes only
    document.getElementById("wholesale-type-container").style.display = "none";
    document.getElementById("wholesale-min-sacks-group").style.display = "none";
    document.getElementById("wholesale-min-kg-group").style.display = "none";
    document.getElementById("wholesale-min-boxes-group").style.display = "block";
  }
}

// Toggle between Min Sacks and Min KG for wholesale (Feed products only)
function setWholesaleType(type) {
  const sackBtn = document.querySelector('.toggle-btn[data-type="sacks"]');
  const kgBtn = document.querySelector('.toggle-btn[data-type="kg"]');
  const sacksGroup = document.getElementById("wholesale-min-sacks-group");
  const kgGroup = document.getElementById("wholesale-min-kg-group");

  if (type === 'kg') {
    sackBtn?.classList.remove('active');
    kgBtn?.classList.add('active');
    sacksGroup.style.display = 'none';
    kgGroup.style.display = 'block';
  } else {
    kgBtn?.classList.remove('active');
    sackBtn?.classList.add('active');
    kgGroup.style.display = 'none';
    sacksGroup.style.display = 'block';
  }
}

document.getElementById("edit-product-category")?.addEventListener("change", (e) => {
  togglePricingFields(e.target.value);
});

async function saveProduct() {
  const name = document.getElementById("edit-product-name").value.trim();
  const brand = document.getElementById("edit-product-brand").value.trim();
  const category = document.getElementById("edit-product-category").value;

  // Validate required fields
  if (!name) {
    showToast("Please enter a product name");
    return;
  }

  if (!category) {
    showToast("Please select a category");
    return;
  }

  // Validate pricing based on category
  if (category === "Feed") {
    const pricePerKg = parseFloat(document.getElementById("edit-price-per-kg").value) || 0;
    const pricePerSack = parseFloat(document.getElementById("edit-price-per-sack").value) || 0;

    if (pricePerKg <= 0 && pricePerSack <= 0) {
      showToast("Please enter at least one price (per kg or per sack)");
      return;
    }
  } else {
    const pricePerPiece = parseFloat(document.getElementById("edit-price-per-piece").value) || 0;

    if (pricePerPiece <= 0) {
      showToast("Please enter a price per piece");
      return;
    }
  }

  // Get wholesale field values
  const costPrice = parseFloat(document.getElementById("edit-cost-price").value) || 0;
  const wholesalePrice = parseFloat(document.getElementById("edit-wholesale-price").value) || 0;

  // Get wholesale minimum based on type (sacks vs kg for Feed, boxes for non-Feed)
  let wholesaleMin = 0;
  let wholesaleMinKg = 0;

  if (category === "Feed") {
    const wholesaleType = document.querySelector('.toggle-btn[data-type="kg"]')?.classList.contains('active') ? 'kg' : 'sacks';
    if (wholesaleType === 'kg') {
      wholesaleMinKg = parseFloat(document.getElementById("edit-wholesale-min-kg").value) || 0;
      wholesaleMin = 0; // Clear sacks minimum when using KG
    } else {
      wholesaleMin = parseInt(document.getElementById("edit-wholesale-min").value) || 0;
      wholesaleMinKg = 0; // Clear KG minimum when using sacks
    }
  } else {
    wholesaleMin = parseInt(document.getElementById("edit-wholesale-min").value) || 0;
    wholesaleMinKg = 0;
  }

  if (state.editingProductId) {
    // Edit existing
    const product = state.products.find(p => p.id === state.editingProductId);
    if (product) {
      product.name = name;
      product.brand = brand;
      product.category = category;
      product.costPrice = costPrice;
      product.wholesalePrice = wholesalePrice;
      product.wholesaleMin = wholesaleMin;
      product.wholesaleMinKg = wholesaleMinKg;
      product.image = currentProductImage; // Save image
      if (category === "Feed") {
        product.pricePerKg = parseFloat(document.getElementById("edit-price-per-kg").value) || 0;
        product.pricePerSack = parseFloat(document.getElementById("edit-price-per-sack").value) || 0;
        product.kgPerSack = parseInt(document.getElementById("edit-kg-per-sack").value) || 25;
        delete product.pricePerPiece;
        delete product.pricePerBox;
        delete product.piecesPerBox;
      } else {
        // Medicine, Vitamins, Accessories, Grooming, Treats
        product.pricePerPiece = parseFloat(document.getElementById("edit-price-per-piece").value) || 0;
        const piecesPerBox = parseInt(document.getElementById("edit-pieces-per-box").value) || 1;
        product.piecesPerBox = piecesPerBox;
        product.pricePerBox = piecesPerBox > 1 ? (parseFloat(document.getElementById("edit-price-per-box").value) || 0) : 0;
        delete product.pricePerKg;
        delete product.pricePerSack;
        delete product.kgPerSack;
      }
      // Persist to DB with sync
      await updateProductWithSync(state.editingProductId, product);
    }
    showToast("Product updated");
  } else {
    // Add new
    const newId = state.products.length > 0 ? Math.max(...state.products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: name,
      brand: brand,
      category: category,
      costPrice: costPrice,
      wholesalePrice: wholesalePrice,
      wholesaleMin: wholesaleMin,
      wholesaleMinKg: wholesaleMinKg,
      image: currentProductImage // Save image
    };

    if (category === "Feed") {
      newProduct.pricePerKg = parseFloat(document.getElementById("edit-price-per-kg").value) || 0;
      newProduct.pricePerSack = parseFloat(document.getElementById("edit-price-per-sack").value) || 0;
      newProduct.kgPerSack = parseInt(document.getElementById("edit-kg-per-sack").value) || 25;
    } else {
      // Medicine, Vitamins, Accessories, Grooming, Treats
      newProduct.pricePerPiece = parseFloat(document.getElementById("edit-price-per-piece").value) || 0;
      const piecesPerBox = parseInt(document.getElementById("edit-pieces-per-box").value) || 1;
      newProduct.piecesPerBox = piecesPerBox;
      newProduct.pricePerBox = piecesPerBox > 1 ? (parseFloat(document.getElementById("edit-price-per-box").value) || 0) : 0;
    }

    // Add sync metadata
    newProduct.syncStatus = 'pending';
    newProduct.lastModified = new Date().toISOString();

    state.products.push(newProduct);
    // Use sync-aware function (also creates inventory)
    await addProductWithSync(newProduct);

    // Update local state with inventory
    const newInventory = {
      id: newId,
      name: name,
      category: category,
      lowStock: false,
      stockSacks: 0,
      stockKg: 0,
      stockUnits: 0,
      syncStatus: 'pending',
      lastModified: new Date().toISOString()
    };
    state.inventory.push(newInventory);

    showToast("Product added");
  }

  renderProductsTable();
  renderProducts();
  renderInventory(); // Also refresh inventory view
  updateDashboardCards(); // Update dashboard
  closeEditProductModal();
}

function closeEditProductModal() {
  document.getElementById("edit-product-modal").classList.remove("active");
  state.editingProductId = null;
}

// ============================================
// Settings Functions
// ============================================

async function updateStoreNameSetting() {
  const newName = document.getElementById("store-name-input").value;
  state.storeName = newName;
  localStorage.setItem("storeName", newName);
  document.getElementById("store-name-display").textContent = newName;

  // Sync store name setting to Supabase
  try {
    await setSettingWithSync('storeName', newName);
    // Also update in Supabase stores table if available
    if (typeof updateStoreName === 'function') {
      await updateStoreName(newName);
    }
  } catch (error) {
    console.error('[Settings] Failed to sync store name:', error);
  }
}

// Reset Application - Clear all data
function confirmResetApp() {
  // First confirmation
  if (!confirm("Are you sure you want to reset the application?\n\nThis will delete:\n- All products\n- All inventory\n- All transactions\n- All display items\n- All user accounts\n\nThis action CANNOT be undone!")) {
    return;
  }

  // Second confirmation for safety
  const confirmText = prompt("To confirm, type 'RESET' (all caps):");
  if (confirmText !== "RESET") {
    showToast("Reset cancelled");
    return;
  }

  // Perform reset
  resetApp();
}

async function resetApp() {
  showLoading("Resetting application...");

  try {
    // Clear localStorage
    localStorage.removeItem('flyhigh_db_initialized');
    localStorage.removeItem('flyhigh_current_user');
    localStorage.removeItem('storeName');
    localStorage.removeItem('darkMode');

    // Delete the entire Dexie database
    await db.delete();

    showToast("Application reset successfully!");

    // Reload the page after a short delay
    setTimeout(() => {
      location.reload();
    }, 1000);
  } catch (error) {
    console.error("Error resetting app:", error);
    hideLoading();
    showToast("Error resetting application. Please try again.");
  }
}

// ============================================
// Toast Notification
// ============================================

function showToast(message) {
  const toast = document.getElementById("toast");
  document.getElementById("toast-message").textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// ============================================
// Loading Overlay
// ============================================

function showLoading(text = "Processing...") {
  const overlay = document.getElementById("loading-overlay");
  const loadingText = overlay.querySelector(".loading-text");
  loadingText.textContent = text;
  overlay.classList.add("active");
}

function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("active");
}

// ============================================
// Number Formatting Helper
// ============================================

function formatCurrency(amount) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(num) {
  return num.toLocaleString('en-PH');
}

// ============================================
// Ava AI Functions
// ============================================

function renderAvaAI() {
  renderSalesForecast();
  renderStockAlerts();
  renderReorderSuggestions();
  renderProfitInsights();
  renderAvaRecommendations();
  renderCannibalization();
  renderTrendingProducts();
}

// Render Sales Forecast based on real transaction data
function renderSalesForecast() {
  const forecastValue = document.getElementById("sales-forecast-value");
  const forecastBreakdown = document.getElementById("sales-forecast-breakdown");
  if (!forecastValue || !forecastBreakdown) return;

  // Calculate average daily sales from past transactions
  const transactions = state.transactions;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Group sales by day of week
  const salesByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  transactions.forEach(t => {
    const day = new Date(t.date).getDay();
    salesByDay[day].push(t.total);
  });

  // Calculate average for each day
  const avgByDay = {};
  let totalWeekForecast = 0;
  let maxDaySales = 0;

  for (let i = 0; i < 7; i++) {
    const daySales = salesByDay[i];
    const avg = daySales.length > 0
      ? Math.round(daySales.reduce((a, b) => a + b, 0) / daySales.length)
      : 0;
    avgByDay[i] = avg;
    totalWeekForecast += avg;
    if (avg > maxDaySales) maxDaySales = avg;
  }

  // Calculate trend (compare this week projection vs last week actual)
  const lastWeekTotal = transactions
    .filter(t => {
      const txnDate = new Date(t.date);
      const now = new Date();
      const daysAgo = (now - txnDate) / 86400000;
      return daysAgo >= 7 && daysAgo < 14;
    })
    .reduce((sum, t) => sum + t.total, 0);

  const trendPercent = lastWeekTotal > 0
    ? ((totalWeekForecast - lastWeekTotal) / lastWeekTotal * 100).toFixed(1)
    : 0;
  const isPositive = trendPercent >= 0;

  // Update forecast header
  forecastValue.innerHTML = `
    <span class="forecast-amount">₱${formatNumber(totalWeekForecast)}</span>
    <span class="forecast-trend ${isPositive ? 'positive' : 'negative'}">${isPositive ? '+' : ''}${trendPercent}% expected</span>
  `;

  // Build day breakdown (Mon-Sun order)
  const orderedDays = [1, 2, 3, 4, 5, 6, 0]; // Mon to Sun
  forecastBreakdown.innerHTML = orderedDays.map(dayIndex => {
    const avg = avgByDay[dayIndex];
    const barWidth = maxDaySales > 0 ? Math.round((avg / maxDaySales) * 100) : 0;
    return `
      <div class="forecast-day">
        <span class="day">${dayNames[dayIndex]}</span>
        <div class="forecast-bar"><div class="forecast-fill" style="width: ${barWidth}%;"></div></div>
        <span class="amount">₱${formatNumber(avg)}</span>
      </div>
    `;
  }).join("");
}

function refreshAvaAI() {
  showToast("Ava is analyzing your data...");
  setTimeout(() => {
    renderAvaAI();
    showToast("Insights updated!");
  }, 1500);
}

let currentAvaFilter = "all";

function filterAvaAI(feature, e) {
  currentAvaFilter = feature;

  // Update filter buttons
  document.querySelectorAll(".ava-filter .filter-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  if (e && e.target) {
    e.target.classList.add("active");
  }

  // Get all Ava AI sections with data-feature attribute
  const sections = document.querySelectorAll("[data-feature]");

  sections.forEach(section => {
    if (feature === "all") {
      // Show all sections
      section.style.display = "";
    } else if (section.dataset.feature === feature) {
      // Show matching section
      section.style.display = "";
    } else {
      // Hide non-matching sections
      section.style.display = "none";
    }
  });
}

function renderStockAlerts() {
  const container = document.getElementById("stock-alerts");
  if (!container) return;

  // Calculate days until stock out based on simulated daily sales
  const stockAlerts = state.inventory
    .filter(item => item.lowStock || (item.stockUnits && item.stockUnits < 20) || (item.stockSacks && item.stockSacks < 5))
    .map(item => {
      const product = state.products.find(p => p.id === item.id);
      // Simulate daily sales velocity
      const dailySales = Math.random() * 3 + 1;
      const currentStock = item.stockUnits || (item.stockSacks * (product?.kgPerSack || 25));
      const daysUntilOut = Math.floor(currentStock / dailySales);

      return {
        ...item,
        product,
        daysUntilOut,
        urgency: daysUntilOut <= 3 ? 'critical' : daysUntilOut <= 7 ? 'warning' : 'normal'
      };
    })
    .sort((a, b) => a.daysUntilOut - b.daysUntilOut)
    .slice(0, 5);

  if (stockAlerts.length === 0) {
    container.innerHTML = '<p class="no-alerts">All stock levels are healthy!</p>';
    return;
  }

  container.innerHTML = stockAlerts.map(alert => `
    <div class="stock-alert-item ${alert.urgency}">
      <div class="alert-product">
        <div class="alert-info">
          <span class="alert-name">${escapeHtml(alert.name)}</span>
          <span class="alert-stock">${alert.stockUnits !== undefined ? alert.stockUnits + ' boxes' : alert.stockSacks + ' sacks'} remaining</span>
        </div>
      </div>
      <div class="alert-forecast">
        <span class="days-left ${alert.urgency}">${alert.daysUntilOut} days</span>
        <span class="forecast-label">until stock out</span>
      </div>
    </div>
  `).join("");
}

function renderReorderSuggestions() {
  const container = document.getElementById("reorder-suggestions");
  if (!container) return;

  // Get low stock items and calculate recommended order quantities
  const reorderItems = state.inventory
    .filter(item => item.lowStock)
    .map(item => {
      const product = state.products.find(p => p.id === item.id);
      // Calculate recommended order based on category
      const recommendedQty = item.category === "Feed" ? 10 : 24;
      const estimatedCost = product ? (product.costPrice || 0) * recommendedQty : 0;

      return {
        ...item,
        product,
        recommendedQty,
        estimatedCost,
        unit: item.category === "Feed" ? "sacks" : "units"
      };
    });

  if (reorderItems.length === 0) {
    container.innerHTML = '<p class="no-suggestions">No immediate reorders needed!</p>';
    return;
  }

  const totalCost = reorderItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  container.innerHTML = reorderItems.map(item => `
    <div class="reorder-item">
      <div class="reorder-product">
        <div class="reorder-info">
          <span class="reorder-name">${item.name}</span>
          <span class="reorder-current">Current: ${item.stockUnits || item.stockSacks} ${item.unit}</span>
        </div>
      </div>
      <div class="reorder-suggestion">
        <span class="reorder-qty">Order ${item.recommendedQty} ${item.unit}</span>
        <span class="reorder-cost">Est. ₱${item.estimatedCost.toLocaleString()}</span>
      </div>
    </div>
  `).join("") + `
    <div class="reorder-total">
      <span>Total Estimated Cost:</span>
      <span class="total-amount">₱${totalCost.toLocaleString()}</span>
    </div>
  `;
}

function renderProfitInsights() {
  const container = document.getElementById("profit-insights");
  if (!container) return;

  // Calculate profit insights from product data
  let totalRetailValue = 0;
  let totalCostValue = 0;
  let highestMarginProduct = null;
  let highestMargin = 0;

  state.products.forEach(product => {
    const inv = state.inventory.find(i => i.id === product.id);
    if (!inv) return;

    const stock = inv.stockUnits || inv.stockSacks || 0;
    const retailPrice = product.pricePerPiece || product.pricePerSack || 0;
    const costPrice = product.costPrice || retailPrice * 0.7;

    totalRetailValue += retailPrice * stock;
    totalCostValue += costPrice * stock;

    const margin = ((retailPrice - costPrice) / retailPrice) * 100;
    if (margin > highestMargin) {
      highestMargin = margin;
      highestMarginProduct = product;
    }
  });

  const potentialProfit = totalRetailValue - totalCostValue;
  const avgMargin = totalRetailValue > 0 ? ((potentialProfit / totalRetailValue) * 100) : 0;

  container.innerHTML = `
    <div class="profit-stat">
      <span class="profit-label">Inventory Value (Retail)</span>
      <span class="profit-value">₱${totalRetailValue.toLocaleString()}</span>
    </div>
    <div class="profit-stat">
      <span class="profit-label">Inventory Cost</span>
      <span class="profit-value cost">₱${totalCostValue.toLocaleString()}</span>
    </div>
    <div class="profit-stat highlight">
      <span class="profit-label">Potential Profit</span>
      <span class="profit-value profit">₱${potentialProfit.toLocaleString()}</span>
    </div>
    <div class="profit-stat">
      <span class="profit-label">Average Margin</span>
      <span class="profit-value">${avgMargin.toFixed(1)}%</span>
    </div>
    ${highestMarginProduct ? `
      <div class="profit-stat best-margin">
        <span class="profit-label">Highest Margin Product</span>
        <span class="profit-value">${highestMarginProduct.name} (${highestMargin.toFixed(1)}%)</span>
      </div>
    ` : ''}
  `;
}

function renderAvaRecommendations() {
  const container = document.getElementById("ava-recommendations");
  if (!container) return;

  const recommendations = [];

  // Check for low stock items
  const lowStockCount = state.inventory.filter(i => i.lowStock).length;
  if (lowStockCount > 0) {
    recommendations.push({
      type: 'warning',
      icon: 'ALERT',
      title: 'Restock Alert',
      message: `${lowStockCount} product(s) are running low on stock. Consider placing orders to avoid stockouts.`,
      action: 'View low stock items in Inventory'
    });
  }

  // Check for display items running low
  const lowDisplayItems = state.display.filter(d => d.remainingKg < 5);
  if (lowDisplayItems.length > 0) {
    recommendations.push({
      type: 'info',
      icon: 'STORE',
      title: 'Display Stock Low',
      message: `${lowDisplayItems.length} display item(s) have less than 5kg remaining. Add new sacks to display.`,
      action: 'Go to Display Management'
    });
  }

  // Wholesale opportunity
  const wholesaleProducts = state.products.filter(p => p.wholesalePrice && p.wholesaleMin);
  if (wholesaleProducts.length > 0) {
    recommendations.push({
      type: 'success',
      icon: 'SALE',
      title: 'Wholesale Opportunity',
      message: `You have ${wholesaleProducts.length} products with wholesale pricing. Promote bulk buying to increase sales volume.`,
      action: 'Review wholesale products'
    });
  }

  // High margin suggestion
  const highMarginProducts = state.products.filter(p => {
    const margin = p.costPrice ? ((p.pricePerPiece || p.pricePerSack) - p.costPrice) / (p.pricePerPiece || p.pricePerSack) : 0;
    return margin > 0.25;
  });
  if (highMarginProducts.length > 0) {
    recommendations.push({
      type: 'success',
      icon: 'TREND',
      title: 'High Margin Products',
      message: `${highMarginProducts.length} products have margins above 25%. Focus promotions on these for maximum profit.`,
      action: 'View high margin products'
    });
  }

  // General tips
  recommendations.push({
    type: 'tip',
    icon: 'TIP',
    title: 'Pro Tip',
    message: 'Track your best-selling days to optimize staffing and inventory levels for peak periods.',
    action: null
  });

  container.innerHTML = recommendations.map(rec => `
    <div class="recommendation-item ${rec.type}">
      <div class="rec-content">
        <h4>${rec.title}</h4>
        <p>${rec.message}</p>
        ${rec.action ? `<span class="rec-action">${rec.action} →</span>` : ''}
      </div>
    </div>
  `).join("");
}

function renderTrendingProducts() {
  const container = document.getElementById("trending-products");
  if (!container) return;

  // Calculate trending products from real transaction data
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 86400000);
  const twoWeeksAgo = new Date(now - 14 * 86400000);

  // Get this week's transactions
  const thisWeekTxns = state.transactions.filter(t => new Date(t.date) >= oneWeekAgo);
  // Get last week's transactions
  const lastWeekTxns = state.transactions.filter(t => {
    const txnDate = new Date(t.date);
    return txnDate >= twoWeeksAgo && txnDate < oneWeekAgo;
  });

  // Aggregate sales by product for this week
  const thisWeekSales = {};
  thisWeekTxns.forEach(t => {
    t.items.forEach(item => {
      if (!thisWeekSales[item.productId]) {
        thisWeekSales[item.productId] = { name: item.name, quantity: 0, revenue: 0 };
      }
      thisWeekSales[item.productId].quantity += item.quantity;
      thisWeekSales[item.productId].revenue += item.price;
    });
  });

  // Aggregate sales by product for last week
  const lastWeekSales = {};
  lastWeekTxns.forEach(t => {
    t.items.forEach(item => {
      if (!lastWeekSales[item.productId]) {
        lastWeekSales[item.productId] = { quantity: 0 };
      }
      lastWeekSales[item.productId].quantity += item.quantity;
    });
  });

  // Build trending array
  const trendingProducts = Object.entries(thisWeekSales)
    .map(([productId, data]) => {
      const lastWeek = lastWeekSales[productId]?.quantity || 0;
      const thisWeek = data.quantity;
      const trendPercent = lastWeek > 0
        ? Math.round((thisWeek - lastWeek) / lastWeek * 100)
        : (thisWeek > 0 ? 100 : 0);

      return {
        productId,
        name: data.name,
        weekSales: thisWeek,
        trend: trendPercent >= 0 ? 'up' : 'down',
        trendPercent: Math.abs(trendPercent)
      };
    })
    .sort((a, b) => b.weekSales - a.weekSales)
    .slice(0, 8);

  if (trendingProducts.length === 0) {
    container.innerHTML = '<p class="no-trending">No sales data yet. Start selling to see trending products!</p>';
    return;
  }

  container.innerHTML = trendingProducts.map((product, index) => `
    <div class="trending-item">
      <span class="trending-rank">#${index + 1}</span>
      <div class="trending-info">
        <span class="trending-name">${product.name}</span>
        <span class="trending-sales">${product.weekSales} units this week</span>
      </div>
      <span class="trending-trend ${product.trend}">
        ${product.trend === 'up' ? '+' : '-'}${product.trendPercent}%
      </span>
    </div>
  `).join("");
}

function renderCannibalization() {
  const container = document.getElementById("cannibalization-analysis");
  if (!container) return;

  // Use real transaction data to analyze cannibalization
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 86400000);
  const twoWeeksAgo = new Date(now - 14 * 86400000);

  // Get sales data for this week and last week
  const thisWeekTxns = state.transactions.filter(t => new Date(t.date) >= oneWeekAgo);
  const lastWeekTxns = state.transactions.filter(t => {
    const txnDate = new Date(t.date);
    return txnDate >= twoWeeksAgo && txnDate < oneWeekAgo;
  });

  // Aggregate sales by product
  const getSalesByProduct = (txns) => {
    const sales = {};
    txns.forEach(t => {
      t.items.forEach(item => {
        if (!sales[item.productId]) {
          sales[item.productId] = { productId: item.productId, name: item.name, quantity: 0 };
        }
        sales[item.productId].quantity += item.quantity;
      });
    });
    return sales;
  };

  const thisWeekSales = getSalesByProduct(thisWeekTxns);
  const lastWeekSales = getSalesByProduct(lastWeekTxns);

  // Group products by category and analyze cannibalization
  const categories = [...new Set(state.products.map(p => p.category))];
  const cannibalizationData = [];

  categories.forEach(category => {
    const categoryProducts = state.products.filter(p => p.category === category);

    // Only analyze categories with more than 1 product
    if (categoryProducts.length < 2) return;

    // Get sales data for each product in category
    const productsWithSales = categoryProducts.map(product => {
      const thisWeek = thisWeekSales[product.id]?.quantity || 0;
      const lastWeek = lastWeekSales[product.id]?.quantity || 0;
      return {
        ...product,
        simulatedSales: thisWeek,
        prevWeekSales: lastWeek
      };
    }).filter(p => p.simulatedSales > 0 || p.prevWeekSales > 0);

    if (productsWithSales.length < 2) return;

    // Sort by sales to find dominant product
    productsWithSales.sort((a, b) => b.simulatedSales - a.simulatedSales);

    // Identify cannibalization pairs
    for (let i = 0; i < productsWithSales.length - 1; i++) {
      const dominant = productsWithSales[i];
      const affected = productsWithSales[i + 1];

      if (dominant.prevWeekSales === 0 || affected.prevWeekSales === 0) continue;

      // Calculate cannibalization score based on real growth
      const dominantGrowth = ((dominant.simulatedSales - dominant.prevWeekSales) / dominant.prevWeekSales) * 100;
      const affectedGrowth = ((affected.simulatedSales - affected.prevWeekSales) / affected.prevWeekSales) * 100;

      // If dominant grew while affected declined, there's potential cannibalization
      if (dominantGrowth > 0 && affectedGrowth < 0) {
        const cannibalizationScore = Math.min(Math.abs(affectedGrowth), 45);

        cannibalizationData.push({
          category,
          dominant,
          affected,
          dominantSales: dominant.simulatedSales,
          affectedSales: affected.simulatedSales,
          cannibalizationScore,
          recommendation: getCannibalizationRecommendation(dominant, affected, cannibalizationScore)
        });
      }
    }
  });

  // Sort by cannibalization score (highest first)
  cannibalizationData.sort((a, b) => b.cannibalizationScore - a.cannibalizationScore);

  if (cannibalizationData.length === 0) {
    container.innerHTML = '<p class="no-cannibalization">No significant product cannibalization detected!</p>';
    return;
  }

  container.innerHTML = cannibalizationData.slice(0, 4).map(data => `
    <div class="cannibalization-item">
      <div class="cannibalization-header">
        <span class="category-badge">${data.category}</span>
        <span class="cannibal-score ${data.cannibalizationScore > 25 ? 'high' : data.cannibalizationScore > 15 ? 'medium' : 'low'}">
          ${data.cannibalizationScore.toFixed(0)}% impact
        </span>
      </div>
      <div class="cannibalization-products">
        <div class="cannibal-product dominant">
          <div class="product-details">
            <span class="product-name">${data.dominant.name}</span>
            <span class="product-sales">${data.dominantSales} sales/week</span>
          </div>
          <span class="product-status winner">Dominant</span>
        </div>
        <div class="cannibal-arrow">
          <span class="arrow-icon">v</span>
          <span class="arrow-label">Taking sales from</span>
        </div>
        <div class="cannibal-product affected">
          <div class="product-details">
            <span class="product-name">${data.affected.name}</span>
            <span class="product-sales">${data.affectedSales} sales/week</span>
          </div>
          <span class="product-status declining">Declining</span>
        </div>
      </div>
      <div class="cannibalization-recommendation">
        <span class="rec-text">${data.recommendation}</span>
      </div>
    </div>
  `).join("");
}

function getCannibalizationRecommendation(dominant, affected, score) {
  const recommendations = [
    `Consider bundling ${affected.name} with other products to boost sales.`,
    `Price differentiation: Adjust ${affected.name} pricing to target a different customer segment.`,
    `Position ${affected.name} for a specific use case to reduce overlap with ${dominant.name}.`,
    `Create a promotion for ${affected.name} to regain market share.`,
    `Consider discontinuing ${affected.name} if profit margins are low.`,
    `Bundle ${dominant.name} and ${affected.name} together for a combo deal.`,
    `Target different customer segments: ${dominant.name} for bulk buyers, ${affected.name} for retail.`
  ];

  // Return recommendation based on score
  if (score > 30) {
    return recommendations[4]; // High cannibalization - consider discontinuing
  } else if (score > 20) {
    return recommendations[Math.floor(Math.random() * 3)]; // Medium - bundling/pricing
  } else {
    return recommendations[Math.floor(Math.random() * 4) + 3]; // Low - promotions/targeting
  }
}

// ============================================
// Service Worker Registration
// ============================================

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(registration => {
        console.log("ServiceWorker registered:", registration.scope);
      })
      .catch(error => {
        console.log("ServiceWorker registration failed:", error);
      });
  }
}

// ============================================
// PWA Install Prompt
// ============================================

let deferredPrompt;

function setupInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show custom install banner
    const banner = document.createElement("div");
    banner.className = "install-banner show";
    banner.innerHTML = `
      <p>Install FlyHighManarang for a better experience!</p>
      <div>
        <button class="btn-dismiss" onclick="dismissInstall()">Not now</button>
        <button class="btn-install" onclick="installApp()">Install</button>
      </div>
    `;
    document.body.appendChild(banner);
  });
}

function installApp() {
  const banner = document.querySelector(".install-banner");
  if (banner) banner.remove();

  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(choice => {
      if (choice.outcome === "accepted") {
        console.log("PWA installed");
      }
      deferredPrompt = null;
    });
  }
}

function dismissInstall() {
  const banner = document.querySelector(".install-banner");
  if (banner) banner.remove();
}

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener("keydown", (e) => {
  // ESC to close modals
  if (e.key === "Escape") {
    closeProductModal();
    closeEditProductModal();
    closeCheckoutModal();
  }

  // Ctrl+1-6 for navigation (demo)
  if (e.ctrlKey) {
    const screens = ["dashboard", "pos", "inventory", "products", "reports", "settings"];
    const num = parseInt(e.key);
    if (num >= 1 && num <= 6) {
      e.preventDefault();
      navigateTo(screens[num - 1]);
    }
  }
});

// ============================================
// Click outside to close modals
// ============================================

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
    }
  });
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.querySelector(".menu-toggle");

  if (window.innerWidth <= 768 &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== menuToggle) {
    closeSidebar();
  }
});
