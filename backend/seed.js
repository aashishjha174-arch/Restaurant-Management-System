require('dotenv').config({ path: __dirname + '/.env' });

const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const MenuItem = require('./models/MenuItem');
const Settings = require('./models/Settings');
const Review = require('./models/Review');
const GalleryImage = require('./models/GalleryImage');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-garden';

async function runSeed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to DB");

    await Promise.all([
      Admin.deleteMany({}),
      MenuItem.deleteMany({}),
      Settings.deleteMany({}),
      Review.deleteMany({}),
      GalleryImage.deleteMany({})
    ]);

    await Admin.create({
      username: process.env.ADMIN_USERNAME || "admin",
      passwordHash: process.env.ADMIN_PASSWORD_HASH
    });

    await Settings.create({
      phone: "982-3002449",
      facebook: "https://facebook.com",
      instagram: "https://instagram.com",
      address: "Kathmandu",
      openingHours: "9 AM"
    });

    await MenuItem.insertMany(require("./seedData/menuItems"));
    await Review.insertMany(require("./seedData/reviews"));
    await GalleryImage.insertMany(require("./seedData/gallery"));

    console.log("Seed complete");
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runSeed();