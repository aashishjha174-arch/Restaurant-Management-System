const API_BASE = window.location.origin;

/* ---------------- CREATE BOOKING ---------------- */
async function createBooking(formData) {
  try {
    const res = await fetch(`${API_BASE}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Booking failed:", data);
      alert(data.message || "Booking failed");
      return;
    }

    alert("Booking successful ✨");
    return data;

  } catch (err) {
    console.error("Error:", err);
  }
}

/* ---------------- FORM HANDLER ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#booking-form");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      name: document.querySelector("#name").value,
      contact: document.querySelector("#contact").value,
      date: document.querySelector("#date").value,
      time: document.querySelector("#time").value,
      seats: Number(document.querySelector("#seats").value),
      paymentMethod: document.querySelector("#paymentMethod")?.value || "cash",
      paymentStatus: "Pending",
      status: "Pending"
    };

    await createBooking(formData);
    form.reset();
  });
});