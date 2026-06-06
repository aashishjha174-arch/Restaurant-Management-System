const router = require('express').Router();
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/auth');

const brevo = require('@getbrevo/brevo');

const MAX_SEATS_PER_SLOT = 50;

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
  '07:00 PM - 09:00 PM',
  '09:00 PM - 11:00 PM'
];

/* ---------------- BOOKING ID ---------------- */

function generateBookingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SG-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* ---------------- BREVO API SETUP ---------------- */

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/* ---------------- EMAIL FUNCTION (API) ---------------- */

async function sendEmailConfirmation(booking) {
  try {
    const emailData = {
      sender: {
        name: "The Secret Garden",
        email: "a2a0b8001@smtp-brevo.com"
      },
      to: [
        {
          email: booking.email,
          name: booking.name
        }
      ],
      subject: `Booking Confirmed: ${booking.bookingId} 🌿`,
      htmlContent: `
        <div style="font-family: Arial; padding:20px; background:#f5f0e8; color:#0d1f17;">
          <h2 style="color:#1a3a2a;">The Secret Garden</h2>

          <p>Hi <b>${booking.name}</b>,</p>
          <p>Your booking is confirmed ✨</p>

          <ul>
            <li><b>Booking ID:</b> ${booking.bookingId}</li>
            <li><b>Date:</b> ${booking.date}</li>
            <li><b>Time:</b> ${booking.time}</li>
            <li><b>Seats:</b> ${booking.seats}</li>
            <li><b>Payment:</b> ${booking.paymentMethod}</li>
            <li><b>Status:</b> ${booking.paymentStatus}</li>
          </ul>

          <p style="margin-top:20px;">We can’t wait to host you 🌿</p>
        </div>
      `
    };

    const response = await apiInstance.sendTransacEmail(emailData);

    console.log("📩 Email sent via Brevo API:", response.messageId || "success");

  } catch (err) {
    console.error("❌ EMAIL API FAILED:", err.message);
  }
}

/* ---------------- AVAILABILITY ---------------- */

router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date required" });
    }

    const bookings = await Booking.find({ date, status: { $ne: "Cancelled" } });

    const slots = {};
    TIME_SLOTS.forEach(t => slots[t] = MAX_SEATS_PER_SLOT);

    bookings.forEach(b => {
      if (slots[b.time] !== undefined) {
        slots[b.time] -= b.seats;
        if (slots[b.time] < 0) slots[b.time] = 0;
      }
    });

    res.json({ date, slots });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error checking availability" });
  }
});

/* ---------------- CREATE BOOKING ---------------- */

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, seats, specialRequests, paymentMethod } = req.body;

    if (!name || !email || !phone || !date || !time || !seats || !paymentMethod) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const seatCount = parseInt(seats);
    if (!seatCount || seatCount <= 0) {
      return res.status(400).json({ message: "Invalid seats" });
    }

    if (!TIME_SLOTS.includes(time)) {
      return res.status(400).json({ message: "Invalid slot" });
    }

    const existing = await Booking.find({ date, time, status: { $ne: "Cancelled" } });
    const booked = existing.reduce((a, b) => a + b.seats, 0);

    const available = MAX_SEATS_PER_SLOT - booked;

    if (seatCount > available) {
      return res.status(400).json({
        message: `Only ${available} seats left`
      });
    }

    const bookingId = generateBookingId();

    const paymentStatus = paymentMethod === "Online" ? "Paid" : "Pending";

    const booking = new Booking({
      name,
      email,
      phone,
      date,
      time,
      seats: seatCount,
      specialRequests,
      paymentMethod,
      paymentStatus,
      status: "Confirmed",
      bookingId
    });

    await booking.save();

    // fire-and-forget email (no blocking)
    sendEmailConfirmation(booking);

    res.status(201).json({
      success: true,
      booking
    });

  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------- ADMIN ROUTES ---------------- */

router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ date: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!booking) return res.status(404).json({ message: "Not found" });

    res.json({ success: true, booking });

  } catch (err) {
    res.status(500).json({ message: "Error updating" });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Error deleting" });
  }
});

module.exports = router;