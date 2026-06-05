// Admin Panel Controller for The Secret Garden

const API_BASE = 'https://restaurant-management-system-r5mg.onrender.com';

// Global state
let currentBookings = [];
let chartInstance = null;

// Auth check
function checkAuth() {
  const token = localStorage.getItem('sg_admin_token');
  const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.includes('/admin/login');

  if (!token && !isLoginPage) {
    window.location.href = '/admin/login';
  } else if (token && isLoginPage) {
    window.location.href = '/admin/dashboard';
  }
}

// Get Auth headers
function getHeaders() {
  const token = localStorage.getItem('sg_admin_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// 1. LOGIN HANDLING
function initLoginPage() {
  const loginForm = document.getElementById('admin-login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('sg_admin_token', data.token);
        localStorage.setItem('sg_admin_username', data.admin.username);
        showToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 1000);
      } else {
        showToast(data.message || 'Invalid username or password.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Connection error. Failed to log in.', 'error');
    }
  });
}

// 2. DASHBOARD SIDEBAR TOGGLE
function initDashboardTabs() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const tabPanels = document.querySelectorAll('.dashboard-tab-panel');
  if (sidebarItems.length === 0) return;

  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.dataset.tab;

      sidebarItems.forEach(i => i.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPanel = document.getElementById(tabId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        onTabActivated(tabId);
      }
    });
  });

  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('sg_admin_token');
      localStorage.removeItem('sg_admin_username');
      window.location.href = '/admin/login';
    });
  }

  const userLabel = document.getElementById('admin-user-display-name');
  const userAvatar = document.getElementById('admin-user-avatar-initial');
  if (userLabel) {
    const user = localStorage.getItem('sg_admin_username') || 'Admin';
    userLabel.textContent = user;
    if (userAvatar) userAvatar.textContent = user[0].toUpperCase();
  }
}

function onTabActivated(tabId) {
  switch(tabId) {
    case 'tab-dashboard': loadDashboardMetrics(); break;
    case 'tab-bookings': loadBookingsTable('all'); break;
    case 'tab-menu': loadMenuTable(); break;
    case 'tab-gallery': loadGalleryManager(); break;
    case 'tab-reviews': loadReviewsManager(); break;
    case 'tab-settings': loadSettingsEditor(); break;
  }
}

// 3. DASHBOARD METRICS & CHARTS
async function loadDashboardMetrics() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`, { headers: getHeaders() });
    if (res.status === 401) return handleSessionExpired();
    const bookings = await res.json();
    currentBookings = bookings;

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date();
    tomorrowStr.setDate(tomorrowStr.getDate() + 1);
    const tomorrowDateStr = tomorrowStr.toISOString().split('T')[0];

    const todayBookings = bookings.filter(b => b.date === todayStr && b.status !== 'Cancelled');
    const todaySeats = todayBookings.reduce((sum, b) => sum + b.seats, 0);
    const tomorrowBookings = bookings.filter(b => b.date === tomorrowDateStr && b.status !== 'Cancelled');
    const tomorrowSeats = tomorrowBookings.reduce((sum, b) => sum + b.seats, 0);

    const revenueToday = bookings
      .filter(b => b.date === todayStr && b.paymentStatus === 'Paid' && b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.seats * 750), 0);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const revenueMonth = bookings
      .filter(b => {
        const bDate = new Date(b.date);
        return bDate.getMonth() === currentMonth && 
               bDate.getFullYear() === currentYear && 
               b.paymentStatus === 'Paid' && 
               b.status !== 'Cancelled';
      })
      .reduce((sum, b) => sum + (b.seats * 750), 0);

    document.getElementById('kpi-today-bookings').textContent = todayBookings.length;
    document.getElementById('kpi-today-seats').textContent = todaySeats;
    document.getElementById('kpi-tomorrow-bookings').textContent = `${tomorrowBookings.length} bookings (${tomorrowSeats} seats)`;
    document.getElementById('kpi-revenue-today').textContent = `Rs ${revenueToday.toLocaleString()}`;
    document.getElementById('kpi-revenue-month').textContent = `Rs ${revenueMonth.toLocaleString()}`;

    renderPaymentChart(bookings);
    renderRecentBookings(bookings.slice(0, 5));
  } catch (error) {
    console.error('Metrics failed:', error);
  }
}

function renderPaymentChart(bookings) {
  const cashPaid = bookings.filter(b => b.paymentMethod === 'Cash' && b.paymentStatus === 'Paid').length;
  const onlinePaid = bookings.filter(b => b.paymentMethod === 'Online' && b.paymentStatus === 'Paid').length;
  const pending = bookings.filter(b => b.paymentStatus === 'Pending').length;

  const ctx = document.getElementById('payment-breakdown-chart');
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  if (typeof Chart === 'undefined') {
    document.getElementById('chart-placeholder').innerHTML = '<div style="color:var(--primary); font-weight:600;">Chart.js failed to load.</div>';
    return;
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Cash Paid', 'Online Paid', 'Pending'],
      datasets: [{
        data: [cashPaid, onlinePaid, pending],
        backgroundColor: ['#1a3a2a', '#c9a84c', '#e6dfd3'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Inter' } } }
      }
    }
  });
}

function renderRecentBookings(recentList) {
  const container = document.getElementById('recent-bookings-list-tbody');
  if (!container) return;

  container.innerHTML = '';
  if (recentList.length === 0) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;">No recent bookings found.</td></tr>';
    return;
  }

  recentList.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${b.name}</strong></td>
      <td>${b.date}</td>
      <td>${b.time.split(' - ')[0]}</td>
      <td>${b.seats}</td>
      <td><span class="badge badge-${b.status.toLowerCase()}">${b.status}</span></td>
    `;
    container.appendChild(row);
  });
}

// 4. BOOKINGS TABLE
async function loadBookingsTable(filterType = 'all') {
  const tbody = document.getElementById('bookings-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Loading reservations data...</td></tr>';

  let url = `${API_BASE}/api/bookings`;
  if (filterType === 'today' || filterType === 'tomorrow' || filterType === 'week') {
    url += `?filter=${filterType}`;
  } else if (filterType.startsWith('range')) {
    const parts = filterType.split('&');
    const startVal = parts[1].split('=')[1];
    const endVal = parts[2].split('=')[1];
    url += `?startDate=${startVal}&endDate=${endVal}`;
  }

  try {
    const res = await fetch(url, { headers: getHeaders() });
    if (res.status === 401) return handleSessionExpired();
    const bookings = await res.json();
    currentBookings = bookings;
    renderBookingsList(bookings);
  } catch (error) {
    console.error('Load bookings table failed:', error);
  }
}

function renderBookingsList(bookings) {
  const tbody = document.getElementById('bookings-table-tbody');
  tbody.innerHTML = '';

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 25px;">No reservations found matching the filters.</td></tr>';
    return;
  }

  bookings.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${b.name}</strong><br><small style="color:gray;">${b.bookingId}</small></td>
      <td><small>${b.email}<br>${b.phone}</small></td>
      <td>${b.date}</td>
      <td><small>${b.time}</small></td>
      <td style="text-align:center;"><strong>${b.seats}</strong></td>
      <td>${b.paymentMethod}</td>
      <td>
        <select onchange="updateBookingPaymentStatus('${b._id}', this.value)" style="padding: 4px 8px; font-size: 0.8rem; border-radius:4px; font-weight:600;">
          <option value="Pending" ${b.paymentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Paid" ${b.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
        </select>
      </td>
      <td>
        <select onchange="updateBookingStatus('${b._id}', this.value)" style="padding: 4px 8px; font-size: 0.8rem; border-radius:4px; font-weight:600;">
          <option value="Confirmed" ${b.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="Completed" ${b.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${b.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button onclick="deleteBooking('${b._id}')" class="btn" style="background-color: var(--red); color: white; padding: 6px 12px; border-radius: 4px; font-size: 0.75rem;">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

window.updateBookingStatus = async (id, status) => {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    if (res.ok) { showToast('Booking status updated successfully', 'success'); loadBookingsTable('all'); }
  } catch (error) { console.error(error); }
};

window.updateBookingPaymentStatus = async (id, paymentStatus) => {
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ paymentStatus })
    });
    if (res.ok) { showToast('Payment status updated successfully', 'success'); loadBookingsTable('all'); }
  } catch (error) { console.error(error); }
};

window.deleteBooking = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this reservation?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/bookings/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) { showToast('Booking deleted successfully', 'success'); loadBookingsTable('all'); }
  } catch (error) { console.error(error); }
};

function exportBookingsToCSV() {
  if (currentBookings.length === 0) { showToast('No booking entries available to export.', 'error'); return; }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Booking ID,Customer Name,Email,Phone,Date,Time Slot,Seats,Payment Method,Payment Status,Status\n';

  currentBookings.forEach(b => {
    const row = [b.bookingId, `"${b.name}"`, b.email, b.phone, b.date, `"${b.time}"`, b.seats, b.paymentMethod, b.paymentStatus, b.status].join(',');
    csvContent += row + '\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Secret_Garden_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 5. MENU MANAGEMENT
async function loadMenuTable() {
  const tbody = document.getElementById('menu-table-tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading menu items...</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/api/menu`);
    const items = await response.json();

    tbody.innerHTML = '';
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No items added. Add your first item!</td></tr>';
      return;
    }

    items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="width: 70px;">
          ${item.image ? `<img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid var(--secondary);">` : `<div style="width:50px; height:50px; background:#e6dfd3; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:0.75rem; color:var(--primary); font-weight:600;">No Pic</div>`}
        </td>
        <td><strong>${item.name}</strong><br><small style="color:gray;">${item.description || 'No description'}</small></td>
        <td><span class="badge" style="background:#e6dfd3; color:var(--primary);">${item.category}</span></td>
        <td><strong>Rs ${item.price}</strong></td>
        <td>
          <label class="switch" style="position:relative; display:inline-block; width:40px; height:20px;">
            <input type="checkbox" ${item.available ? 'checked' : ''} onchange="toggleMenuItemAvailability('${item._id}', this.checked)" style="width:100%; height:100%; opacity:0; cursor:pointer; z-index:2;">
            <span style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:${item.available ? 'var(--primary)' : '#ccc'}; border-radius:20px; transition:0.4s; pointer-events:none; display:block;"></span>
          </label>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            <button onclick="openEditMenuModal('${encodeURIComponent(JSON.stringify(item))}')" class="btn" style="background-color: var(--secondary); color: var(--dark); padding: 5px 10px; border-radius: 4px; font-size:0.75rem;">Edit</button>
            <button onclick="deleteMenuItem('${item._id}')" class="btn" style="background-color: var(--red); color: white; padding: 5px 10px; border-radius: 4px; font-size:0.75rem;">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    updateCategoryReorderList(items);
  } catch (error) {
    console.error('Load menu table failed:', error);
  }
}

window.toggleMenuItemAvailability = async (id, available) => {
  try {
    const res = await fetch(`${API_BASE}/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sg_admin_token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ available })
    });
    if (res.ok) { showToast('Availability status toggled successfully', 'success'); loadMenuTable(); }
  } catch (error) { console.error(error); }
};

window.deleteMenuItem = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this menu item?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/menu/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sg_admin_token')}` }
    });
    if (res.ok) { showToast('Menu item deleted successfully', 'success'); loadMenuTable(); }
  } catch (error) { console.error(error); }
};

function initMenuFormSubmission() {
  const form = document.getElementById('add-menu-item-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const response = await fetch(`${API_BASE}/api/menu`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sg_admin_token')}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Menu item added successfully', 'success');
        form.reset();
        document.getElementById('menu-item-modal').classList.remove('active');
        loadMenuTable();
      } else {
        showToast(data.message || 'Failed to add item.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading menu item.', 'error');
    }
  });

  const editForm = document.getElementById('edit-menu-item-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const itemId = document.getElementById('edit-item-id').value;
      const formData = new FormData(editForm);
      try {
        const response = await fetch(`${API_BASE}/api/menu/${itemId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('sg_admin_token')}` },
          body: formData
        });
        const data = await response.json();
        if (response.ok && data.success) {
          showToast('Menu item updated successfully', 'success');
          document.getElementById('edit-item-modal').classList.remove('active');
          loadMenuTable();
        } else {
          showToast(data.message || 'Failed to update item.', 'error');
        }
      } catch (err) { console.error(err); }
    });
  }
}

window.openEditMenuModal = (itemString) => {
  const item = JSON.parse(decodeURIComponent(itemString));
  document.getElementById('edit-item-id').value = item._id;
  document.getElementById('edit-item-name').value = item.name;
  document.getElementById('edit-item-description').value = item.description || '';
  document.getElementById('edit-item-price').value = item.price;
  document.getElementById('edit-item-category').value = item.category;
  document.getElementById('edit-item-order').value = item.order || 0;
  document.getElementById('edit-item-modal').classList.add('active');
};

function updateCategoryReorderList(items) {
  const container = document.getElementById('category-reorder-list-container');
  if (!container) return;

  const categories = [...new Set(items.map(item => item.category))];
  container.innerHTML = '';
  categories.forEach((cat, index) => {
    const row = document.createElement('div');
    row.className = 'reorder-item';
    row.innerHTML = `
      <span>${cat}</span>
      <div class="reorder-btns">
        <button onclick="shiftCategory('${cat}', 'up')" class="reorder-btn" ${index === 0 ? 'disabled' : ''}>▲</button>
        <button onclick="shiftCategory('${cat}', 'down')" class="reorder-btn" ${index === categories.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
    `;
    container.appendChild(row);
  });
}

window.shiftCategory = async (categoryName, direction) => {
  try {
    const menuRes = await fetch(`${API_BASE}/api/menu`);
    const items = await menuRes.json();
    const categories = [...new Set(items.map(item => item.category))];
    const index = categories.indexOf(categoryName);
    if (index === -1) return;

    let targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const categoriesSwapped = [...categories];
    const temp = categoriesSwapped[index];
    categoriesSwapped[index] = categoriesSwapped[targetIndex];
    categoriesSwapped[targetIndex] = temp;

    const updateBatch = [];
    items.forEach(item => {
      const newCatIndex = categoriesSwapped.indexOf(item.category);
      updateBatch.push({ id: item._id, category: item.category, order: newCatIndex * 10 + item.order % 10 });
    });

    const res = await fetch(`${API_BASE}/api/menu/reorder/batch`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ items: updateBatch })
    });
    if (res.ok) { showToast('Categories reordered successfully', 'success'); loadMenuTable(); }
  } catch (error) { console.error(error); }
};

// 6. GALLERY MANAGEMENT
async function loadGalleryManager() {
  const container = document.getElementById('gallery-manager-grid');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center; padding: 30px;">Loading pictures...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/gallery`);
    const images = await res.json();

    container.innerHTML = '';
    if (images.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:20px; grid-column:1/-1;">No pictures uploaded to gallery.</div>';
      return;
    }

    images.forEach(img => {
      const card = document.createElement('div');
      card.className = 'gallery-item';
      card.style.position = 'relative';
      card.innerHTML = `
        <img src="${img.url}" style="height:150px; object-fit:cover; width:100%;">
        <div style="padding:10px; font-size:0.8rem; font-weight:500;">${img.caption || 'No caption'}</div>
        <button onclick="deleteGalleryPhoto('${img._id}')" class="btn" style="position:absolute; top:10px; right:10px; background-color: var(--red); color: white; padding: 4px 8px; border-radius:4px; font-size:0.7rem;">Delete</button>
      `;
      container.appendChild(card);
    });
  } catch (error) { console.error(error); }
}

window.deleteGalleryPhoto = async (id) => {
  if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/gallery/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) { showToast('Photo deleted successfully', 'success'); loadGalleryManager(); }
  } catch (error) { console.error(error); }
};

function initGalleryFormSubmission() {
  const form = document.getElementById('upload-gallery-photo-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    try {
      const response = await fetch(`${API_BASE}/api/gallery`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sg_admin_token')}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Photo uploaded successfully', 'success');
        form.reset();
        document.getElementById('gallery-photo-modal').classList.remove('active');
        loadGalleryManager();
      } else {
        showToast(data.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading photo.', 'error');
    }
  });
}

// 7. REVIEWS MANAGEMENT
async function loadReviewsManager() {
  const container = document.getElementById('reviews-moderation-tbody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading customer feedback entries...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/api/reviews/admin`, { headers: getHeaders() });
    if (res.status === 401) return handleSessionExpired();
    const data = await res.json();

    document.getElementById('mod-total-reviews').textContent = data.metrics.totalReviews;
    document.getElementById('mod-approved-reviews').textContent = data.metrics.approvedReviews;
    document.getElementById('mod-pending-reviews').textContent = data.metrics.pendingReviews;
    document.getElementById('mod-avg-rating').textContent = `${data.metrics.averageRating} ★`;

    container.innerHTML = '';
    if (data.reviews.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No customer reviews submitted yet.</td></tr>';
      return;
    }

    data.reviews.forEach(r => {
      const date = new Date(r.createdAt).toLocaleDateString();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${r.name}</strong><br><small style="color:gray;">${date}</small></td>
        <td><span style="color:var(--secondary); font-size:1.1rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></td>
        <td><p style="font-size:0.85rem; font-style:italic; max-width:350px;">"${r.text}"</p></td>
        <td>
          <span class="badge" style="background-color: ${r.approved ? '#e8f5e9' : '#fff3e0'}; color: ${r.approved ? 'var(--green)' : '#ef6c00'};">
            ${r.approved ? 'Approved' : 'Pending'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:8px;">
            ${r.approved 
              ? `<button onclick="toggleReviewApproval('${r._id}', false)" class="btn" style="background-color: var(--primary); color: var(--bg-cream); padding:5px 8px; border-radius:4px; font-size:0.7rem;">Unapprove</button>`
              : `<button onclick="toggleReviewApproval('${r._id}', true)" class="btn" style="background-color: var(--green); color: white; padding:5px 8px; border-radius:4px; font-size:0.7rem;">Approve</button>`
            }
            <button onclick="deleteReview('${r._id}')" class="btn" style="background-color: var(--red); color: white; padding:5px 8px; border-radius:4px; font-size:0.7rem;">Delete</button>
          </div>
        </td>
      `;
      container.appendChild(row);
    });
  } catch (error) { console.error(error); }
}

window.toggleReviewApproval = async (id, approved) => {
  try {
    const res = await fetch(`${API_BASE}/api/reviews/${id}/approve`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ approved })
    });
    if (res.ok) { showToast(approved ? 'Review approved for public viewing' : 'Review unapproved', 'success'); loadReviewsManager(); }
  } catch (error) { console.error(error); }
};

window.deleteReview = async (id) => {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/reviews/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (res.ok) { showToast('Review deleted successfully', 'success'); loadReviewsManager(); }
  } catch (error) { console.error(error); }
};

// 8. SETTINGS
async function loadSettingsEditor() {
  const form = document.getElementById('restaurant-settings-form');
  if (!form) return;

  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    const settings = await res.json();

    document.getElementById('settings-phone-input').value = settings.phone || '';
    document.getElementById('settings-facebook-input').value = settings.facebook || '';
    document.getElementById('settings-instagram-input').value = settings.instagram || '';
    document.getElementById('settings-hours-input').value = settings.openingHours || '';
    document.getElementById('settings-address-input').value = settings.address || '';
  } catch (error) { console.error(error); }
}

function initSettingsSubmissions() {
  const form = document.getElementById('restaurant-settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        phone: document.getElementById('settings-phone-input').value,
        facebook: document.getElementById('settings-facebook-input').value,
        instagram: document.getElementById('settings-instagram-input').value,
        openingHours: document.getElementById('settings-hours-input').value,
        address: document.getElementById('settings-address-input').value
      };
      try {
        const res = await fetch(`${API_BASE}/api/settings`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) { showToast('Restaurant configurations updated successfully', 'success'); loadSettingsEditor(); }
        else { showToast('Failed to save settings.', 'error'); }
      } catch (err) { console.error(err); }
    });
  }

  const passForm = document.getElementById('change-password-form');
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldPassword = document.getElementById('old-password-input').value;
      const newPassword = document.getElementById('new-password-input').value;
      const confirmPass = document.getElementById('confirm-password-input').value;

      if (newPassword !== confirmPass) { showToast('New passwords do not match!', 'error'); return; }

      try {
        const res = await fetch(`${API_BASE}/api/settings/password`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) { showToast('Admin password changed successfully!', 'success'); passForm.reset(); }
        else { showToast(data.message || 'Failed to change password.', 'error'); }
      } catch (err) { console.error(err); }
    });
  }
}

function handleSessionExpired() {
  localStorage.removeItem('sg_admin_token');
  localStorage.removeItem('sg_admin_username');
  showToast('Session expired. Please log in again.', 'error');
  setTimeout(() => { window.location.href = '/admin/login'; }, 1500);
}

// 9. MODAL HANDLERS
function initModalTriggers() {
  const triggers = document.querySelectorAll('[data-modal-target]');
  const closes = document.querySelectorAll('.modal-close');
  const modals = document.querySelectorAll('.modal');

  triggers.forEach(t => {
    t.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(t.dataset.modalTarget);
      if (target) target.classList.add('active');
    });
  });

  closes.forEach(c => {
    c.addEventListener('click', () => { modals.forEach(m => m.classList.remove('active')); });
  });

  window.addEventListener('click', (e) => {
    modals.forEach(m => { if (e.target === m) m.classList.remove('active'); });
  });
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLoginPage();
  initDashboardTabs();
  initMenuFormSubmission();
  initGalleryFormSubmission();
  initSettingsSubmissions();
  initModalTriggers();

  const exportBtn = document.getElementById('export-bookings-csv-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportBookingsToCSV);

  const defaultTab = document.querySelector('.sidebar-item.active');
  if (defaultTab) onTabActivated(defaultTab.dataset.tab);
});
