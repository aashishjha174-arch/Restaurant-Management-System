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

function generateBookingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SG-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

async function sendEmailConfirmation(booking) {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.log(`[SIMULATED EMAIL TO ${booking.email}] bookingId: ${booking.bookingId}`);
      return;
    }

    const emailData = {
      sender: {
        name: 'The Secret Garden',
        email: 'phatkathrestaurant@gmail.com'
      },
      to: [
        {
          email: booking.email,
          name: booking.name
        }
      ],
      subject: `Booking Confirmed: ${booking.bookingId} 🌿`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f0e8; padding: 30px; color: #0d1f17; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a3a2a; border-bottom: 2px solid #c9a84c; padding-bottom: 10px;">
            The Secret Garden by Phat Kath 🌿
          </h2>

          <p>Dear <strong>${booking.name}</strong>,</p>
          <p>Your table reservation is confirmed! We look forward to welcoming you.</p>

          <table style="width: 100%; max-width: 400px; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #c9a84c;">Booking ID:</td>
              <td style="padding: 10px 0; color: #c9a84c; font-weight: bold; border-bottom: 1px solid #c9a84c;">${booking.bookingId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Date:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0d8cc;">${booking.date}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Time Slot:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0d8cc;">${booking.time}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Seats:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0d8cc;">${booking.seats}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Payment Method:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0d8cc;">${booking.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #e0d8cc;">Payment Status:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e0d8cc;">${booking.paymentStatus}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Special Requests:</td>
              <td style="padding: 10px 0;">${booking.specialRequests || 'None'}</td>
            </tr>
          </table>

          <div style="background-color: #1a3a2a; color: #f5f0e8; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0;">Need to change or cancel? Call us at <strong>982-3002449</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 0.85em;">Jogin Pakha Marg, Kathmandu 44600</p>
          </div>

          <p style="margin-top: 20px; color: #555; font-size: 0.85em;">
            We can't wait to host you at The Secret Garden! 🌿
          </p>
        </div>
      `
    };

    const response = await apiInstance.sendTransacEmail(emailData);
    console.log('✅ Email sent via Brevo:', response.messageId || 'success');

  } catch (err) {
    console.error('❌ Email failed:', err.message);
  }
}

// 1. PUBLIC: Get availability
router.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Date required' });

    const bookings = await Booking.find({ date, status: { $ne: 'Cancelled' } });
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
    res.status(500).json({ message: 'Error checking availability' });
  }
});

// 2. PUBLIC: Create booking
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, date, time, seats, specialRequests, paymentMethod } = req.body;

    if (!name || !email || !phone || !date || !time || !seats || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const seatCount = parseInt(seats);
    if (!seatCount || seatCount <= 0) {
      return res.status(400).json({ message: 'Invalid seats' });
    }

    if (!TIME_SLOTS.includes(time)) {
      return res.status(400).json({ message: 'Invalid time slot' });
    }

    const existing = await Booking.find({ date, time, status: { $ne: 'Cancelled' } });
    const booked = existing.reduce((a, b) => a + b.seats, 0);
    const available = MAX_SEATS_PER_SLOT - booked;

    if (seatCount > available) {
      return res.status(400).json({ message: `Only ${available} seats left` });
    }

    const bookingId = generateBookingId();
    const paymentStatus = paymentMethod === 'Online' ? 'Paid' : 'Pending';

    const booking = new Booking({
      name, email, phone, date, time,
      seats: seatCount,
      specialRequests,
      paymentMethod,
      paymentStatus,
      status: 'Confirmed',
      bookingId
    });

    await booking.save();

    sendEmailConfirmation(booking).catch(err => console.error('Email bg error:', err));

    res.status(201).json({ success: true, booking });

  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ message: 'Server error' });
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
      query.date = { $gte: todayStr, $lte: nextWeek.toISOString().split('T')[0] };
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const bookings = await Booking.find(query).sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// 4. ADMIN: Update booking
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ message: 'Error updating' });
  }
});

// 5. ADMIN: Delete booking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting' });
  }
});

module.exports = router;