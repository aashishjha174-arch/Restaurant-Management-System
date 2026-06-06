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

async function sendEmailConfirmation(booking) {
  try {
    const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

    if (!emailUser || !emailPass) {
      console.log(`[SIMULATED EMAIL TO ${booking.email}] bookingId: ${booking.bookingId}`);
      return;
    }

   const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || 465),
  secure: true,
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

    const mailOptions = {
      from: `"The Secret Garden" <${emailUser}>`,
      to: booking.email,
      subject: `Booking Confirmed: ${booking.bookingId} - The Secret Garden`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f0e8; padding: 30px; color: #0d1f17; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a3a2a; border-bottom: 2px solid #c9a84c; padding-bottom: 10px;">
            The Secret Garden by Phat Kath
          </h2>
          <p>Dear <strong>${booking.name}</strong>,</p>
          <p>Thank you for booking a table with us! Your reservation is confirmed.</p>

          <table style="width: 100%; max-width: 400px; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #c9a84c;">Booking ID:</td>
              <td style="padding: 8px 0; color: #c9a84c; font-weight: bold; border-bottom: 1px solid #c9a84c;">${booking.bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Date:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0d8cc;">${booking.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Time Slot:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0d8cc;">${booking.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Seats:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0d8cc;">${booking.seats}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Payment Method:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0d8cc;">${booking.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Payment Status:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e0d8cc;">${booking.paymentStatus}</td>
            </tr>
          </table>

          <p><strong>Special Requests:</strong> ${booking.specialRequests || 'None'}</p>

          <div style="background-color: #1a3a2a; color: #f5f0e8; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0;">Need to change or cancel? Call us at <strong>982-3002449</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 0.85em;">Jogin Pakha Marg, Kathmandu 44600</p>
          </div>

          <p style="margin-top: 20px; color: #555; font-size: 0.85em;">
            We look forward to welcoming you to The Secret Garden! 🌿
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${booking.email}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
}

// 1. PUBLIC: Get seat availability for a date
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

// 2. PUBLIC: Create booking
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

    // Send email in background — don't await so it doesn't slow response
    sendEmailConfirmation(newBooking).catch(err => console.error('Email bg error:', err));

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

// 3. ADMIN: Get all bookings
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

// 4. ADMIN: Update booking
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

// 5. ADMIN: Delete booking
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