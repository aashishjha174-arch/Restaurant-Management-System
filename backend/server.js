require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-garden';

app.get("/health", async (req, res) => {
  try {
    res.status(200).json({ status: "alive" });
  } catch (err) {
    res.status(500).json({ status: "error" });
  }
});
// Middleware
app.use(cors({
  origin: ['https://gardenrestaurant.netlify.app', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Serve other frontend assets statically
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/settings', require('./routes/settings'));

// Page Routing (Clean URLs mapping to frontend folder files)
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

// Default fallback for single page/static requests
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

// Database Connection and Server Boot
console.log('Connecting to database:', MONGODB_URI);
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`Server is running locally on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database connection failed. Express server will run but DB calls will fail:', error.message);
    // Boot server anyway so frontend remains accessible and display warning banner
    app.listen(PORT, () => {
      console.log(`Server running in database fallback mode on http://localhost:${PORT}`);
    });
  });
