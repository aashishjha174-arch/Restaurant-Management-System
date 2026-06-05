
// =====================
// CONFIG
// =====================
const API_BASE =
  window.API_BASE ||
  'https://restaurant-management-system-r5mg.onrender.com';

// =====================
// SAFE FETCH WRAPPER (CRITICAL)
// =====================
async function safeFetch(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!res.ok && res.status === 401) {
      handleSessionExpired();
      throw new Error("Unauthorized");
    }

    return res;
  } catch (err) {
    console.error("Fetch failed:", url, err.message);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// =====================
// GLOBAL STATE
// =====================
let currentBookings = [];
let chartInstance = null;

// =====================
// AUTH
// =====================
function checkAuth() {
  const token = localStorage.getItem('sg_admin_token');
  const isLoginPage =
    window.location.pathname.includes('/admin/login');

  if (!token && !isLoginPage) {
    window.location.href = '/admin/login';
  } else if (token && isLoginPage) {
    window.location.href = '/admin/dashboard';
  }
}

function getHeaders() {
  const token = localStorage.getItem('sg_admin_token');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// =====================
// LOGIN
// =====================
function initLoginPage() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await safeFetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('sg_admin_token', data.token);
        localStorage.setItem('sg_admin_username', data.admin.username);

        showToast('Login successful!', 'success');

        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 800);
      } else {
        showToast(data.message || 'Login failed', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  });
}

// =====================
// DASHBOARD TABS
// =====================
function initDashboardTabs() {
  const items = document.querySelectorAll('.sidebar-item');
  const panels = document.querySelectorAll('.dashboard-tab-panel');

  if (!items.length) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;

      items.forEach(i => i.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');

      const panel = document.getElementById(tabId);
      if (panel) {
        panel.classList.add('active');
        onTabActivated(tabId);
      }
    });
  });

  const user = localStorage.getItem('sg_admin_username') || 'Admin';

  const nameEl = document.getElementById('admin-user-display-name');
  const avatarEl = document.getElementById('admin-user-avatar-initial');

  if (nameEl) nameEl.textContent = user;
  if (avatarEl) avatarEl.textContent = user[0].toUpperCase();

  const logout = document.getElementById('admin-logout-btn');
  if (logout) {
    logout.onclick = () => {
      localStorage.clear();
      window.location.href = '/admin/login';
    };
  }
}

function onTabActivated(tabId) {
  switch (tabId) {
    case 'tab-dashboard':
      loadDashboardMetrics();
      break;
    case 'tab-bookings':
      loadBookingsTable('all');
      break;
    case 'tab-menu':
      loadMenuTable();
      break;
    case 'tab-gallery':
      loadGalleryManager();
      break;
    case 'tab-reviews':
      loadReviewsManager();
      break;
    case 'tab-settings':
      loadSettingsEditor();
      break;
  }
}

// =====================
// DASHBOARD
// =====================
async function loadDashboardMetrics() {
  try {
    const res = await safeFetch(`${API_BASE}/api/bookings`, {
      headers: getHeaders()
    });

    const bookings = await res.json();
    currentBookings = bookings;

    const today = new Date().toISOString().split('T')[0];

    const todayBookings = bookings.filter(b => b.date === today);

    safeSet('kpi-today-bookings', todayBookings.length);

  } catch (err) {
    console.error(err);
  }
}

function safeSet(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// =====================
// BOOKINGS
// =====================
async function loadBookingsTable(type = 'all') {
  const tbody = document.getElementById('bookings-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = 'Loading...';

  try {
    const res = await safeFetch(`${API_BASE}/api/bookings`, {
      headers: getHeaders()
    });

    const data = await res.json();
    currentBookings = data;

    renderBookings(data);
  } catch {
    tbody.innerHTML = 'Failed to load';
  }
}

function renderBookings(bookings) {
  const tbody = document.getElementById('bookings-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  bookings.forEach(b => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${b.name}</td>
      <td>${b.date}</td>
      <td>${b.seats}</td>
      <td>${b.status}</td>
    `;

    tbody.appendChild(row);
  });
}

// =====================
// MENU (SAFE VERSION)
// =====================
async function loadMenuTable() {
  const tbody = document.getElementById('menu-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = 'Loading...';

  try {
    const res = await safeFetch(`${API_BASE}/api/menu`);
    const items = await res.json();

    tbody.innerHTML = '';

    items.forEach(item => {
      const row = document.createElement('tr');

      row.innerHTML = `
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>Rs ${item.price}</td>
      `;

      tbody.appendChild(row);
    });

  } catch {
    tbody.innerHTML = 'Error loading menu';
  }
}

// =====================
// GALLERY
// =====================
async function loadGalleryManager() {
  const container = document.getElementById('gallery-manager-grid');
  if (!container) return;

  container.innerHTML = 'Loading...';

  try {
    const res = await safeFetch(`${API_BASE}/api/gallery`);
    const images = await res.json();

    container.innerHTML = '';

    images.forEach(img => {
      const div = document.createElement('div');

      div.innerHTML = `
        <img src="${img.url}" style="width:100%">
      `;

      container.appendChild(div);
    });

  } catch {
    container.innerHTML = 'Error loading gallery';
  }
}

// =====================
// SESSION HANDLER
// =====================
function handleSessionExpired() {
  localStorage.clear();
  showToast('Session expired', 'error');
  setTimeout(() => {
    window.location.href = '/admin/login';
  }, 1000);
}

// =====================
// MODALS (SAFE)
// =====================
function initModalTriggers() {
  document.querySelectorAll('[data-modal-target]').forEach(btn => {
    btn.onclick = () => {
      const m = document.getElementById(btn.dataset.modalTarget);
      if (m) m.classList.add('active');
    };
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modal').forEach(m => {
        m.classList.remove('active');
      });
    };
  });
}

// =====================
// GLOBAL ERROR SAFETY
// =====================
window.addEventListener('unhandledrejection', e => {
  console.error('Unhandled:', e.reason);
});

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLoginPage();
  initDashboardTabs();
  initModalTriggers();

  const defaultTab = document.querySelector('.sidebar-item.active');
  if (defaultTab) onTabActivated(defaultTab.dataset.tab);
});