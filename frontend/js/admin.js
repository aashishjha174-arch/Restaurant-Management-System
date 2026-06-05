// =====================
// API BASE (ONLY ONCE)
// =====================
const API_BASE = "https://restaurant-management-system-r5mg.onrender.com";

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  initDashboard();

  loadBookingsTable("today");
  loadMenuItems();
  loadGallery();
  loadReviews();

  setupTabs();
  setupLogout();
});

// =====================
// DASHBOARD
// =====================
async function initDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    const bookings = await res.json();

    updateKPIs(bookings);
    loadRecentBookings(bookings);
    renderChart(bookings);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// =====================
// KPIs
// =====================
function updateKPIs(bookings) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const todayBookings = bookings.filter(b => b.date === today);
  const tomorrowBookings = bookings.filter(b => b.date === tomorrow);

  const seatsToday = todayBookings.reduce((sum, b) => sum + (b.seats || 0), 0);

  const revenueToday = todayBookings.reduce(
    (sum, b) => sum + (b.totalAmount || 0),
    0
  );

  document.getElementById("kpi-today-bookings").textContent = todayBookings.length;
  document.getElementById("kpi-today-seats").textContent = seatsToday;
  document.getElementById("kpi-tomorrow-bookings").textContent = tomorrowBookings.length;
  document.getElementById("kpi-revenue-today").textContent = `Rs ${revenueToday}`;
}

// =====================
// RECENT BOOKINGS
// =====================
function loadRecentBookings(bookings) {
  const tbody = document.getElementById("recent-bookings-list-tbody");
  tbody.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  bookings
    .filter(b => b.date === today)
    .slice(0, 6)
    .forEach(b => {
      tbody.innerHTML += `
        <tr>
          <td>${b.name}</td>
          <td>${b.date}</td>
          <td>${b.time}</td>
          <td>${b.seats}</td>
          <td>${b.status || "Pending"}</td>
        </tr>
      `;
    });
}

// =====================
// CHART
// =====================
function renderChart(bookings) {
  const ctx = document.getElementById("payment-breakdown-chart");
  if (!ctx) return;

  const paid = bookings.filter(b => b.paymentStatus === "paid").length;
  const unpaid = bookings.length - paid;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Paid", "Unpaid"],
      datasets: [{
        data: [paid, unpaid]
      }]
    }
  });
}

// =====================
// BOOKINGS TABLE
// =====================
async function loadBookingsTable(filter = "all") {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    let bookings = await res.json();

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    if (filter === "today") {
      bookings = bookings.filter(b => b.date === today);
    } else if (filter === "tomorrow") {
      bookings = bookings.filter(b => b.date === tomorrow);
    }

    const tbody = document.getElementById("bookings-table-tbody");
    tbody.innerHTML = "";

    bookings.forEach(b => {
      tbody.innerHTML += `
        <tr>
          <td>${b.name}</td>
          <td>${b.contact || "-"}</td>
          <td>${b.date}</td>
          <td>${b.time}</td>
          <td>${b.seats}</td>
          <td>${b.paymentMethod || "-"}</td>
          <td>${b.paymentStatus || "pending"}</td>
          <td>${b.status || "pending"}</td>
          <td><button onclick="deleteBooking('${b._id}')">Delete</button></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Booking load error:", err);
  }
}

// =====================
// MENU
// =====================
async function loadMenuItems() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    const items = await res.json();

    const tbody = document.getElementById("menu-table-tbody");
    tbody.innerHTML = "";

    items.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td><img src="${API_BASE}${item.image}" width="50"/></td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>Rs ${item.price}</td>
          <td>${item.available ? "Yes" : "No"}</td>
          <td>
            <button onclick="deleteMenu('${item._id}')">Delete</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// =====================
// GALLERY
// =====================
async function loadGallery() {
  try {
    const res = await fetch(`${API_BASE}/api/gallery`);
    const images = await res.json();

    const grid = document.getElementById("gallery-manager-grid");
    grid.innerHTML = "";

    images.forEach(img => {
      grid.innerHTML += `
        <div>
          <img src="${API_BASE}${img.image}" width="100%">
        </div>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// =====================
// REVIEWS
// =====================
async function loadReviews() {
  try {
    const res = await fetch(`${API_BASE}/api/reviews`);
    const reviews = await res.json();

    const tbody = document.getElementById("reviews-moderation-tbody");
    tbody.innerHTML = "";

    reviews.forEach(r => {
      tbody.innerHTML += `
        <tr>
          <td>${r.name}</td>
          <td>${r.rating}</td>
          <td>${r.comment}</td>
          <td>${r.status}</td>
          <td>
            <button onclick="approveReview('${r._id}')">Approve</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// =====================
// TABS
// =====================
function setupTabs() {
  document.querySelectorAll(".sidebar-item").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".dashboard-tab-panel")
        .forEach(p => p.classList.remove("active"));

      const target = tab.getAttribute("data-tab");
      document.getElementById(target).classList.add("active");
    });
  });
}

// =====================
// LOGOUT
// =====================
function setupLogout() {
  const btn = document.getElementById("admin-logout-btn");

  if (btn) {
    btn.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
    });
  }
}

// =====================
// DELETE HELPERS (basic)
// =====================
async function deleteBooking(id) {
  await fetch(`${API_BASE}/api/bookings/${id}`, { method: "DELETE" });
  loadBookingsTable("today");
  initDashboard();
}

async function deleteMenu(id) {
  await fetch(`${API_BASE}/api/menu/${id}`, { method: "DELETE" });
  loadMenuItems();
}

async function approveReview(id) {
  await fetch(`${API_BASE}/api/reviews/${id}/approve`, {
    method: "PUT"
  });

  loadReviews();
}