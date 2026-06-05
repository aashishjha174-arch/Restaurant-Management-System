const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // Stored as YYYY-MM-DD to avoid timezone conversion bugs
    required: true,
    index: true
  },
  time: {
    type: String, // Time slot, e.g. "09:00 AM - 11:00 AM"
    required: true,
    index: true
  },
  seats: {
    type: Number,
    required: true,
    min: 1
  },
  specialRequests: {
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Online'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Cancelled', 'Completed'],
    default: 'Confirmed'
  },
  bookingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
