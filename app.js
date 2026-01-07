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
// State Management
// ============================================

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
  const hasUsers = await hasAnyUsers();
  const savedUser = localStorage.getItem('flyhigh_current_user');

  if (!hasUsers) {
    // First time - show setup form
    showSetupForm();
  } else if (savedUser) {
    // User was previously logged in
    const user = JSON.parse(savedUser);
    state.currentUser = user;
    await initializeMainApp();
  } else {
    // Show login form
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
}

// Show setup form (first time)
function showSetupForm() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('setup-form').style.display = 'block';
  document.getElementById('setup-error').classList.remove('show');
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    errorEl.textContent = 'Please enter username and password';
    errorEl.classList.add('show');
    return;
  }

  const user = await getUserByUsername(username);

  if (!user) {
    errorEl.textContent = 'Invalid username or password';
    errorEl.classList.add('show');
    return;
  }

  // Simple password check (in a real app, use proper hashing)
  if (user.password !== password) {
    errorEl.textContent = 'Invalid username or password';
    errorEl.classList.add('show');
    return;
  }

  // Login successful
  state.currentUser = { id: user.id, username: user.username, role: user.role };
  localStorage.setItem('flyhigh_current_user', JSON.stringify(state.currentUser));

  errorEl.classList.remove('show');
  await initializeMainApp();
}

// Handle first-time setup
async function handleSetup(event) {
  event.preventDefault();

  const username = document.getElementById('setup-username').value.trim();
  const password = document.getElementById('setup-password').value;
  const confirm = document.getElementById('setup-confirm').value;
  const errorEl = document.getElementById('setup-error');

  if (!username || !password || !confirm) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.classList.add('show');
    return;
  }

  if (username.length < 3) {
    errorEl.textContent = 'Username must be at least 3 characters';
    errorEl.classList.add('show');
    return;
  }

  if (password.length < 4) {
    errorEl.textContent = 'Password must be at least 4 characters';
    errorEl.classList.add('show');
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.classList.add('show');
    return;
  }

  try {
    // Create admin user
    await addUser({
      username: username,
      password: password,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    // Auto-login after setup
    const newUser = await getUserByUsername(username);
    state.currentUser = { id: newUser.id, username: newUser.username, role: newUser.role };
    localStorage.setItem('flyhigh_current_user', JSON.stringify(state.currentUser));

    errorEl.classList.remove('show');
    showToast('Account created! Welcome to FlyHighManarang');
    await initializeMainApp();
  } catch (error) {
    console.error('Error creating user:', error);
    errorEl.textContent = 'Error creating account. Please try again.';
    errorEl.classList.add('show');
  }
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const btn = input.parentElement.querySelector('.toggle-password');

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
function logout() {
  if (!confirm('Are you sure you want to logout?')) return;

  state.currentUser = null;
  localStorage.removeItem('flyhigh_current_user');
  showLoginForm();
  showToast('Logged out successfully');
}

// Initialize main app after successful login
async function initializeMainApp() {
  // Hide login, show app
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Load data from IndexedDB
  await loadDataFromDB();

  // Load saved preferences
  await loadPreferences();

  // Set up navigation
  setupNavigation();

  // Render initial content
  renderProducts();
  renderInventory();
  renderProductsTable();
  renderDisplay();

  // Update user menu
  renderUserMenu();

  // Initialize Sales Overview (dynamic year/month)
  initSalesOverview();

  // Initialize Notifications
  generateNotifications();

  // Update time
  updateTime();
  setInterval(updateTime, 1000);

  // Register service worker
  registerServiceWorker();

  // Check for install prompt
  setupInstallPrompt();

  console.log("FlyHighManarang PWA initialized with Dexie!");
}

// Render user menu in sidebar
function renderUserMenu() {
  const sidebar = document.getElementById('sidebar');
  const existingMenu = sidebar.querySelector('.user-menu');

  if (existingMenu) {
    existingMenu.remove();
  }

  if (!state.currentUser) return;

  const userInitial = state.currentUser.username.charAt(0).toUpperCase();
  const userMenu = document.createElement('div');
  userMenu.className = 'user-menu';
  userMenu.innerHTML = `
    <div class="user-info">
      <div class="user-avatar">${userInitial}</div>
      <div class="user-details">
        <div class="user-name">${state.currentUser.username}</div>
        <div class="user-role">${state.currentUser.role}</div>
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

  // Update dashboard counts
  document.getElementById("total-products").textContent = state.products.length;
  document.getElementById("low-stock-items").textContent = state.inventory.filter(i => i.lowStock).length;
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
  sidebar.classList.toggle("open");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("open");
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

function toggleTheme() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("darkMode", state.darkMode);
  applyTheme();
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
  renderRecentSales();
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
    const firstItem = txn.items[0];
    const itemSummary = txn.items.length > 1
      ? `${firstItem.name} +${txn.items.length - 1} more`
      : `${firstItem.name} (${firstItem.quantity} ${firstItem.unit})`;
    const timeAgo = getTimeAgo(new Date(txn.date));
    const saleNumber = txn.id.split('-').pop();

    return `
      <div class="activity-item" onclick="viewTransactionDetails('${txn.id}')">
        <span class="activity-icon">RCPT</span>
        <div class="activity-details">
          <strong>Sale #${saleNumber}</strong>
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
        <small>${searchTerm ? `for "${searchTerm}"` : ''}</small>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(product => `
    <div class="product-card" onclick="selectProduct(${product.id})">
      <div class="product-name">${product.name}</div>
      <div class="product-brand">${product.brand || ''}</div>
      <div class="product-category">${product.category}</div>
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
  if (unit === "custom") {
    customContainer.style.display = "block";
    document.getElementById("custom-kg").focus();

    // Only add listener once to prevent memory leak
    if (!customKgListenerAttached) {
      document.getElementById("custom-kg").addEventListener("input", (e) => {
        state.customKg = parseFloat(e.target.value) || 0;
        updatePreviewPrice();
      });
      customKgListenerAttached = true;
    }
  } else {
    customContainer.style.display = "none";
  }

  updatePreviewPrice();
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
    if (state.selectedUnit === "sack") {
      regularPrice = product.pricePerSack * state.quantity;
      // Check for wholesale
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        price = product.wholesalePrice * state.quantity;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
    } else if (state.selectedUnit === "custom") {
      price = product.pricePerKg * state.customKg * state.quantity;
    } else {
      const kg = parseFloat(state.selectedUnit);
      price = product.pricePerKg * kg * state.quantity;
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
      regularPrice = product.pricePerPiece * state.quantity;
      // Check for wholesale
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        price = product.wholesalePrice * state.quantity;
        isWholesale = true;
      } else {
        price = regularPrice;
      }
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
    if (product.wholesaleMin && product.wholesalePrice && (state.selectedUnit === "sack" || state.selectedUnit === "box" || state.selectedUnit === "piece")) {
      const remaining = product.wholesaleMin - state.quantity;
      if (remaining > 0) {
        let hintEl = document.getElementById("wholesale-hint");
        if (!hintEl) {
          hintEl = document.createElement("div");
          hintEl.id = "wholesale-hint";
          hintEl.className = "wholesale-hint pending";
          previewEl.parentNode.appendChild(hintEl);
        }
        hintEl.className = "wholesale-hint pending";
        hintEl.innerHTML = `Add ${remaining} more for wholesale price!`;
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

  let price = 0;
  let unitLabel = "";
  let kgAmount = 0; // Track kg for display deduction
  let isWholesale = false; // Track if wholesale pricing was applied

  if (product.category === "Feed") {
    if (state.selectedUnit === "sack") {
      // Check if wholesale pricing applies (for sacks)
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        price = product.wholesalePrice * state.quantity;
        isWholesale = true;
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
      price = product.pricePerKg * state.customKg * state.quantity;
      unitLabel = `${kgAmount.toFixed(2)} KG`;
    } else {
      const kg = parseFloat(state.selectedUnit);
      kgAmount = kg * state.quantity;
      // Check if enough display stock
      const displayStock = getDisplayKgForProduct(product.id);
      if (displayStock < kgAmount) {
        showToast(`Not enough display stock! Available: ${displayStock.toFixed(2)} kg`);
        return;
      }
      price = product.pricePerKg * kg * state.quantity;
      unitLabel = `${kgAmount.toFixed(2)} KG`;
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
      // Check if wholesale pricing applies (for pieces)
      if (product.wholesalePrice && product.wholesaleMin && state.quantity >= product.wholesaleMin) {
        price = product.wholesalePrice * state.quantity;
        isWholesale = true;
      } else {
        price = product.pricePerPiece * state.quantity;
      }
      unitLabel = `${state.quantity} Piece(s)${isWholesale ? ' (Wholesale)' : ''}`;
    }
  }

  // Calculate unit price for transaction history
  const unitPrice = price / state.quantity;

  const cartItem = {
    id: Date.now(),
    productId: product.id,
    productName: product.name,
    brand: product.brand || '',
    unit: unitLabel,
    unitPrice: unitPrice,
    price: price,
    quantity: state.quantity,
    kgAmount: kgAmount, // Store kg amount for display deduction on checkout
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
        <h4>${item.productName}${item.isWholesale ? ' <span class="wholesale-badge">WHOLESALE</span>' : ''}</h4>
        <p>${item.unit}</p>
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
        price: item.price
      })),
      subtotal: state.cartTotal,
      total: state.cartTotal,
      paymentMethod: state.paymentMethod
    };

    // Add to transactions (state and DB)
    state.transactions.unshift(newTransaction);
    await addTransaction(newTransaction);

    // Deduct kg amounts from display for Feed products
    for (const item of state.cart) {
      if (item.kgAmount > 0) {
        await deductFromDisplay(item.productId, item.kgAmount);
      }
    }

    // Clear cart and show success
    state.cart = [];
    updateCart();
    closeCheckoutModal();
    hideLoading();
    showToast("Transaction completed successfully!");
  } catch (error) {
    hideLoading();
    console.error("Checkout error:", error);
    showToast("Error processing transaction. Please try again.");
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
      // Get display info for Feed products
      const displayCount = state.display.filter(d => d.productId === item.id).length;
      const displayKg = getDisplayKgForProduct(item.id);
      const totalSacks = item.stockSacks + displayCount; // Total = stored + on display

      return `
        <div class="inventory-card ${item.lowStock ? 'low-stock' : ''}">
          <div class="inventory-card-header">
            <div class="inventory-info">
              <h3>${item.name}</h3>
              <span class="category">${item.category}</span>
            </div>
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
      return `
        <div class="inventory-card ${item.lowStock ? 'low-stock' : ''}">
          <div class="inventory-card-header">
            <div class="inventory-info">
              <h3>${item.name}</h3>
              <span class="category">${item.category}</span>
            </div>
          </div>
          <div class="stock-details">
            <div class="stock-row">
              <span class="stock-label">Stock (Units)</span>
              <span class="stock-value ${item.stockUnits < 20 ? 'warning' : ''}">${item.stockUnits} Units</span>
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
  const search = searchTerm.toLowerCase();
  const cards = document.querySelectorAll(".inventory-card");

  cards.forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(search) ? "block" : "none";
  });
}

// ============================================
// Display Functions
// ============================================

function searchDisplay(searchTerm) {
  const search = searchTerm.toLowerCase();
  const cards = document.querySelectorAll(".display-card");

  cards.forEach(card => {
    const name = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = name.includes(search) ? "block" : "none";
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
    const usedKg = item.originalKg - item.remainingKg;
    const percentUsed = (usedKg / item.originalKg) * 100;
    const isLow = item.remainingKg < 5;
    const product = state.products.find(p => p.id === item.productId);

    return `
      <div class="display-card ${isLow ? 'low-display' : ''}">
        <div class="display-card-header">
          <div class="display-info">
            <h3>${item.productName}</h3>
            <span class="display-date">Opened: ${formatDate(item.displayDate)}</span>
          </div>
        </div>
        <div class="display-stock">
          <div class="display-progress">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${100 - percentUsed}%"></div>
            </div>
            <div class="display-kg-info">
              <span class="remaining-kg">${item.remainingKg.toFixed(2)} kg</span>
              <span class="original-kg">/ ${item.originalKg} kg</span>
            </div>
          </div>
          <div class="display-stats">
            <div class="stat">
              <span class="stat-label">Sold</span>
              <span class="stat-value">${usedKg.toFixed(2)} kg</span>
            </div>
            <div class="stat">
              <span class="stat-label">Remaining</span>
              <span class="stat-value ${isLow ? 'warning' : ''}">${item.remainingKg.toFixed(2)} kg</span>
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
  // Populate feed products dropdown
  const select = document.getElementById("display-product-select");
  const feedProducts = state.products.filter(p => p.category === "Feed");

  select.innerHTML = '<option value="">-- Select a feed product --</option>' +
    feedProducts.map(p => {
      const inv = state.inventory.find(i => i.id === p.id);
      const availableSacks = inv ? inv.stockSacks : 0;
      // Check how many are already on display
      const onDisplay = state.display.filter(d => d.productId === p.id).length;
      const remaining = availableSacks - onDisplay;

      return `<option value="${p.id}" ${remaining <= 0 ? 'disabled' : ''}>
        ${p.name} (${remaining} sacks available)
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

      document.getElementById("display-info-name").textContent = product.name;
      document.getElementById("display-info-kg").textContent = `${product.kgPerSack || 25} kg`;
      document.getElementById("display-info-stock").textContent = `${inv ? inv.stockSacks : 0} sacks`;
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

  if (!inv || inv.stockSacks <= 0) {
    showToast("No stock available");
    return;
  }

  // Check if we have available sacks (not already on display)
  const onDisplay = state.display.filter(d => d.productId === productId).length;
  if (onDisplay >= inv.stockSacks) {
    showToast("All sacks are already on display");
    return;
  }

  const kgPerSack = product.kgPerSack || 25;

  // Add to display
  const newDisplay = {
    id: Date.now(),
    productId: productId,
    productName: product.name,
    displayDate: displayDate,
    originalKg: kgPerSack,
    remainingKg: kgPerSack
  };

  state.display.push(newDisplay);
  await addDisplay(newDisplay);

  // Update inventory - reduce stock sack by 1
  inv.stockSacks -= 1;
  inv.stockKg -= kgPerSack;
  await updateInventory(productId, { stockSacks: inv.stockSacks, stockKg: inv.stockKg });

  renderDisplay();
  renderInventory();
  closeAddDisplayModal();
  showToast(`${product.name} added to display (${kgPerSack} kg)`);
}

async function removeFromDisplay(displayId) {
  const displayItem = state.display.find(d => d.id === displayId);

  if (!displayItem) return;

  if (displayItem.remainingKg > 0) {
    if (!confirm(`This display still has ${displayItem.remainingKg.toFixed(2)} kg remaining. Remove anyway?`)) {
      return;
    }
  }

  // Remove from display (state and DB)
  state.display = state.display.filter(d => d.id !== displayId);
  await deleteDisplay(displayId);

  renderDisplay();
  showToast("Display removed");
}

// Get total display kg for a product
function getDisplayKgForProduct(productId) {
  return state.display
    .filter(d => d.productId === productId)
    .reduce((total, d) => total + d.remainingKg, 0);
}

// Deduct kg from display (used by POS)
async function deductFromDisplay(productId, kgAmount) {
  let remaining = kgAmount;

  // Sort displays by date (oldest first) to use FIFO
  const productDisplays = state.display
    .filter(d => d.productId === productId)
    .sort((a, b) => new Date(a.displayDate) - new Date(b.displayDate));

  for (const display of productDisplays) {
    if (remaining <= 0) break;

    if (display.remainingKg >= remaining) {
      display.remainingKg -= remaining;
      remaining = 0;
      // Update in DB
      await updateDisplay(display.id, { remainingKg: display.remainingKg });
    } else {
      remaining -= display.remainingKg;
      display.remainingKg = 0;
      // Update in DB
      await updateDisplay(display.id, { remainingKg: 0 });
    }
  }

  // Remove empty displays from state and DB
  const emptyDisplays = state.display.filter(d => d.remainingKg <= 0);
  for (const empty of emptyDisplays) {
    await deleteDisplay(empty.id);
  }
  state.display = state.display.filter(d => d.remainingKg > 0);

  renderDisplay();
  return remaining === 0; // Returns true if successfully deducted all
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
    const wholesaleInfo = hasWholesale
      ? `<span class="wholesale-info">Wholesale: ₱${product.wholesalePrice}${product.category === "Feed" ? '/sack' : '/pc'} (min ${product.wholesaleMin})</span>`
      : '';
    const costInfo = product.costPrice
      ? `<span class="cost-info">Cost: ₱${product.costPrice}</span>`
      : '';

    return `
    <tr>
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.brand || '-'}</td>
      <td>${product.category}</td>
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

  togglePricingFields(product.category);
  document.getElementById("edit-product-modal").classList.add("active");
}

async function deleteProduct(productId) {
  if (confirm("Are you sure you want to delete this product?")) {
    state.products = state.products.filter(p => p.id !== productId);
    await deleteProductFromDB(productId);
    renderProductsTable();
    renderProducts();
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
  } else {
    // Medicine, Vitamins, Accessories, Grooming, Treats all use piece/box pricing
    feedPricing.forEach(el => el.style.display = "none");
    medicinePricing.forEach(el => el.style.display = "block");
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
  const wholesaleMin = parseInt(document.getElementById("edit-wholesale-min").value) || 0;

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
      // Persist to DB
      await updateProduct(state.editingProductId, product);
    }
    showToast("Product updated");
  } else {
    // Add new
    const newProduct = {
      id: Math.max(...state.products.map(p => p.id)) + 1,
      name: name,
      brand: brand,
      category: category,
      costPrice: costPrice,
      wholesalePrice: wholesalePrice,
      wholesaleMin: wholesaleMin
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

    state.products.push(newProduct);
    await addProduct(newProduct);
    showToast("Product added");
  }

  renderProductsTable();
  renderProducts();
  closeEditProductModal();
}

function closeEditProductModal() {
  document.getElementById("edit-product-modal").classList.remove("active");
  state.editingProductId = null;
}

// ============================================
// Settings Functions
// ============================================

function updateStoreName() {
  const newName = document.getElementById("store-name-input").value;
  state.storeName = newName;
  localStorage.setItem("storeName", newName);
  document.getElementById("store-name-display").textContent = newName;
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
          <span class="alert-name">${alert.name}</span>
          <span class="alert-stock">${alert.stockUnits ? alert.stockUnits + ' units' : alert.stockSacks + ' sacks'} remaining</span>
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
