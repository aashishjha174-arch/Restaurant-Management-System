const router = require('express').Router();
const Booking = require('../models/Booking');
const authMiddleware = require('../middleware/auth');
const nodemailer = require('nodemailer');

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

function generateBookingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SG-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/* ---------------- EMAIL SETUP (BREVO SMTP) ---------------- */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: 465,
  secure: true, // IMPORTANT
  auth: {
    user: process.env.SMTP_LOGIN,
    pass: process.env.SMTP_KEY
  }
});

async function sendEmailConfirmation(booking) {
  try {
    const info = await transporter.sendMail({
      from: "The Secret Garden <a2a0b8001@smtp-brevo.com>",
      to: booking.email,
      subject: `Booking Confirmed: ${booking.bookingId} 🌿`,
      html: `
        <div style="font-family: Arial; background:#f5f0e8; padding:20px; color:#0d1f17;">
          <h2 style="color:#1a3a2a;">The Secret Garden</h2>

          <p>Dear <b>${booking.name}</b>,</p>
          <p>Your booking is confirmed ✨</p>

          <h3>Booking Details</h3>
          <ul>
            <li><b>ID:</b> ${booking.bookingId}</li>
            <li><b>Date:</b> ${booking.date}</li>
            <li><b>Time:</b> ${booking.time}</li>
            <li><b>Seats:</b> ${booking.seats}</li>
            <li><b>Payment:</b> ${booking.paymentMethod}</li>
            <li><b>Status:</b> ${booking.paymentStatus}</li>
          </ul>

          <p style="margin-top:20px;">We look forward to serving you 🌿</p>
        </div>
      `
    });

    console.log("✅ Email sent successfully");
    console.log("Message ID:", info.messageId);

  } catch (error) {
    console.error("❌ EMAIL FAILED:");
    console.error(error);
  }
}

/* ---------------- 1. AVAILABILITY ---------------- */

router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD)' });
    }

    const bookings = await Booking.find({ date, status: { $ne: 'Cancelled' } });

    const slotAvailability = {};
    TIME_SLOTS.forEach(slot => {
      slotAvailability[slot] = MAX_SEATS_PER_SLOT;
    });

    bookings.forEach(b => {
      if (slotAvailability[b.time] !== undefined) {
        slotAvailability[b.time] -= b.seats;
        if (slotAvailability[b.time] < 0) slotAvailability[b.time] = 0;
      }
    });

    res.json({ date, slots: slotAvailability });

  } catch (error) {
    console.error('Check Availability Error:', error);
    res.status(500).json({ message: 'Error checking availability' });
  }
});

/* ---------------- 2. CREATE BOOKING ---------------- */

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, seats, specialRequests, paymentMethod } = req.body;

    if (!name || !email || !phone || !date || !time || !seats || !paymentMethod) {
      return res.status(400).json({ message: 'All required booking fields must be provided' });
    }

    const requestedSeats = parseInt(seats);
    if (isNaN(requestedSeats) || requestedSeats <= 0) {
      return res.status(400).json({ message: 'Invalid number of seats' });
    }

    if (!TIME_SLOTS.includes(time)) {
      return res.status(400).json({ message: 'Invalid time slot selected' });
    }

    const existingBookings = await Booking.find({ date, time, status: { $ne: 'Cancelled' } });
    const bookedSeats = existingBookings.reduce((sum, b) => sum + b.seats, 0);
    const availableSeats = MAX_SEATS_PER_SLOT - bookedSeats;

    if (requestedSeats > availableSeats) {
      return res.status(400).json({
        message: `Sorry, only ${availableSeats} seats are available for this slot.`
      });
    }

    const paymentStatus = paymentMethod === 'Online' ? 'Paid' : 'Pending';
    const bookingId = generateBookingId();

    const newBooking = new Booking({
      name,
      email,
      phone,
      date,
      time,
      seats: requestedSeats,
      specialRequests,
      paymentMethod,
      paymentStatus,
      status: 'Confirmed',
      bookingId
    });

    await newBooking.save();

    // send email in background (don’t block response)
    sendEmailConfirmation(newBooking);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: newBooking
    });

  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Server error creating booking' });
  }
});

/* ---------------- 3. ADMIN: GET BOOKINGS ---------------- */

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    let query = {};

    const todayStr = new Date().toISOString().split('T')[0];

    if (filter === 'today') {
      query.date = todayStr;
    } else if (filter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.date = tomorrow.toISOString().split('T')[0];
    } else if (filter === 'week') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.date = {
        $gte: todayStr,
        $lte: nextWeek.toISOString().split('T')[0]
      };
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const bookings = await Booking.find(query).sort({ date: 1, time: 1 });
    res.json(bookings);

  } catch (error) {
    console.error('Get Bookings Error:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

/* ---------------- 4. ADMIN: UPDATE ---------------- */

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ success: true, booking });

  } catch (error) {
    console.error('Update Booking Error:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
});

/* ---------------- 5. ADMIN: DELETE ---------------- */

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Booking deleted successfully' });

  } catch (error) {
    console.error('Delete Booking Error:', error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
});

module.exports = router;