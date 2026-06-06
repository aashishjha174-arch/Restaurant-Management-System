require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-garden';

// ===== CORS =====
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'https://restaurant-management-system-r5mg.onrender.com',
    'https://gardenrestaurant.netlify.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState });
});

// ===== UPLOADS =====
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ===== STATIC FRONTEND =====
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== API ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/settings', require('./routes/settings'));

// ===== PAGE ROUTES =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});
app.get('/menu', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/menu.html'));
});
app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/booking.html'));
});
app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/gallery.html'));
});
app.get('/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/reviews.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/contact.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'));
});

// ===== 404 FALLBACK =====
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// ===== DATABASE + SERVER START =====
console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    app.listen(PORT, () => {
      console.log(`⚠️ Server running in DB fallback mode on port ${PORT}`);
    });
  });