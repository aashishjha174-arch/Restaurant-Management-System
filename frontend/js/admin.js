const API_BASE = window.location.origin;

let allBookings = [];

/* ---------------- INIT ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
  loadBookings("all");
});

/* ---------------- DASHBOARD ---------------- */
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    const data = await res.json();

    allBookings = data;

    calculateKPIs(data);
    renderRecent(data);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

/* ---------------- KPI CALC ---------------- */
function calculateKPIs(bookings) {
  const today = new Date().toISOString().split("T")[0];

  const todayBookings = bookings.filter(b => b.date === today);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const tomorrowBookings = bookings.filter(b => b.date === tomorrow);

  document.getElementById("kpi-today-bookings").textContent = todayBookings.length;
  document.getElementById("kpi-tomorrow-bookings").textContent = tomorrowBookings.length;

  const revenue = todayBookings.reduce((sum, b) => sum + (b.seats * 500), 0);
  document.getElementById("kpi-revenue-today").textContent = `Rs ${revenue}`;
}

/* ---------------- RECENT BOOKINGS ---------------- */
function renderRecent(bookings) {
  const tbody = document.getElementById("recent-bookings-list-tbody");
  tbody.innerHTML = "";

  const today = new Date().toISOString().split("T")[0];

  bookings
    .filter(b => b.date === today)
    .slice(0, 10)
    .forEach(b => {
      tbody.innerHTML += `
        <tr>
          <td>${b.name || "-"}</td>
          <td>${b.date}</td>
          <td>${b.time || "-"}</td>
          <td>${b.seats}</td>
          <td>${b.status || "Pending"}</td>
        </tr>
      `;
    });
}

/* ---------------- BOOKINGS TABLE ---------------- */
async function loadBookings(filter = "all") {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`);
    let data = await res.json();

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    if (filter === "today") data = data.filter(b => b.date === today);
    if (filter === "tomorrow") data = data.filter(b => b.date === tomorrow);
    if (filter === "week") {
      const now = Date.now();
      const week = 7 * 86400000;
      data = data.filter(b => new Date(b.date).getTime() - now < week);
    }

    renderTable(data);
  } catch (err) {
    console.error("Bookings load error:", err);
  }
}

/* ---------------- TABLE RENDER ---------------- */
function renderTable(data) {
  const tbody = document.getElementById("bookings-table-tbody");
  tbody.innerHTML = "";

  data.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td>${b.name}</td>
        <td>${b.contact || "-"}</td>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td style="text-align:center">${b.seats}</td>
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
  await fetch(`${API_BASE}/api/bookings/${id}`, {
    method: "DELETE"
  });

  loadBookings("all");
  loadDashboard();
}

/* ---------------- FILTER HOOKS (GLOBAL) ---------------- */
window.loadBookingsTable = loadBookings;