const API_BASE = window.location.origin;

let allBookings = [];

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadBookings("all");
});

/* ---------------- SAFE FETCH ---------------- */
async function fetchBookings() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("API returned invalid data:", data);
      return [];
    }

    return data;
  } catch (err) {
    console.error("Fetch error:", err);
    return [];
  }
}

/* ---------------- DASHBOARD ---------------- */
async function loadDashboard() {
  const data = await fetchBookings();

  allBookings = data;

  calculateKPIs(data);
  renderRecent(data);
}

/* ---------------- KPIs ---------------- */
function calculateKPIs(bookings) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const todayBookings = bookings.filter(b => b.date === today);
  const tomorrowBookings = bookings.filter(b => b.date === tomorrow);

  const revenue = todayBookings.reduce((sum, b) => {
    return sum + ((b.seats || 0) * 500);
  }, 0);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("kpi-today-bookings", todayBookings.length);
  set("kpi-tomorrow-bookings", tomorrowBookings.length);
  set("kpi-revenue-today", `Rs ${revenue}`);
}

/* ---------------- RECENT TABLE ---------------- */
function renderRecent(bookings) {
  const tbody = document.getElementById("recent-bookings-list-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  bookings
    .filter(b => b.date === today)
    .slice(0, 8)
    .forEach(b => {
      tbody.innerHTML += `
        <tr>
          <td>${b.name || "-"}</td>
          <td>${b.date || "-"}</td>
          <td>${b.time || "-"}</td>
          <td>${b.seats || 0}</td>
          <td>${b.status || "Pending"}</td>
        </tr>
      `;
    });
}

/* ---------------- BOOKINGS TABLE ---------------- */
async function loadBookings(filter = "all") {
  const data = await fetchBookings();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  let filtered = data;

  if (filter === "today") {
    filtered = data.filter(b => b.date === today);
  }

  if (filter === "tomorrow") {
    filtered = data.filter(b => b.date === tomorrow);
  }

  if (filter === "week") {
    const now = Date.now();
    const week = 7 * 86400000;

    filtered = data.filter(b => {
      return new Date(b.date).getTime() - now <= week;
    });
  }

  renderTable(filtered);
}

/* ---------------- TABLE ---------------- */
function renderTable(data) {
  const tbody = document.getElementById("bookings-table-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td>${b.name || "-"}</td>
        <td>${b.contact || "-"}</td>
        <td>${b.date || "-"}</td>
        <td>${b.time || "-"}</td>
        <td style="text-align:center">${b.seats || 0}</td>
        <td>${b.paymentMethod || "-"}</td>
        <td>${b.paymentStatus || "Pending"}</td>
        <td>${b.status || "Pending"}</td>
        <td>
          <button onclick="deleteBooking('${b._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

/* ---------------- DELETE ---------------- */
async function deleteBooking(id) {
  try {
    await fetch(`${API_BASE}/api/bookings/${id}`, {
      method: "DELETE"
    });

    loadBookings("all");
    loadDashboard();

  } catch (err) {
    console.error("Delete error:", err);
  }
}

/* ---------------- GLOBAL EXPORT ---------------- */
window.loadBookingsTable = loadBookings;
window.deleteBooking = deleteBooking;