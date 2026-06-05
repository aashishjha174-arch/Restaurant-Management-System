const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  phone: {
    type: String,
    default: '982-3002449'
  },
  facebook: {
    type: String,
    default: 'facebook.com'
  },
  instagram: {
    type: String,
    default: 'instagram.com'
  },
  address: {
    type: String,
    default: 'P884+3PW, Jogin Pakha Marg, Kathmandu 44600'
  },
  openingHours: {
    type: String,
    default: 'Opens 9 AM'
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
