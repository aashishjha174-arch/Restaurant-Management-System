const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String, // Cloudinary public_id for deletion
    default: ''
  },
  caption: {
    type: String,
    trim: true,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
