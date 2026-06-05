require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-garden';

/* ---------------- CORS (FIXED ONCE ONLY) ---------------- */
app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://localhost:5500',
    'https://restaurant-management-system-r5mg.onrender.com'
  ],
  credentials: true
}));

/* ---------------- CORE MIDDLEWARE ---------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------- HEALTH CHECK ---------------- */
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState;

  res.json({
    server: "alive",
    database:
      state === 1 ? "connected"
      : state === 2 ? "connecting"
      : state === 0 ? "disconnected"
      : "unknown"
  });
});

/* ---------------- UPLOADS ---------------- */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

/* ---------------- FRONTEND ---------------- */
app.use(express.static(path.join(__dirname, '../frontend')));

/* ---------------- API ROUTES ---------------- */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/settings', require('./routes/settings'));

/* ---------------- PAGES ---------------- */
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'));
});

/* ---------------- DB + SERVER ---------------- */
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log("MongoDB connected");

  app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error("DB Error:", err.message);

  app.listen(PORT, () => {
    console.log("Server running WITHOUT DB");
  });
});