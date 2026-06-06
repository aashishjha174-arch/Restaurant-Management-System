const router = require('express').Router();
const GalleryImage = require('../models/GalleryImage');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// -------------------------
// Cloudinary config
// -------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// -------------------------
// Multer + Cloudinary storage
// -------------------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'secret-garden/gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// timeout wrapper
const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ]);

// -------------------------
// 1. GET gallery
// -------------------------
router.get('/', async (req, res) => {
  try {
    const images = await withTimeout(
      GalleryImage.find({}).sort({ uploadedAt: -1 }),
      5000
    );
    res.json(images);
  } catch (error) {
    console.error('Fetch Gallery Error:', error.message);
    res.status(500).json({ message: 'Error retrieving gallery images' });
  }
});

// -------------------------
// 2. UPLOAD image
// -------------------------
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Cloudinary gives us req.file.path (the full secure URL)
    const newImage = new GalleryImage({
      url:       req.file.path,
      publicId:  req.file.filename,
      caption:   caption || ''
    });

    const saved = await withTimeout(newImage.save(), 5000);
    res.status(201).json({ success: true, image: saved });

  } catch (error) {
    console.error('Gallery Upload Error:', error.message);

    // Rollback: delete from Cloudinary if DB fails
    if (req.file && req.file.filename) {
      cloudinary.uploader.destroy(req.file.filename).catch(console.error);
    }

    res.status(500).json({ message: 'Error uploading image' });
  }
});

// -------------------------
// 3. DELETE image
// -------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const image = await withTimeout(
      GalleryImage.findById(req.params.id),
      5000
    );

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete from Cloudinary if we have the public ID
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId).catch(console.error);
    }

    await withTimeout(
      GalleryImage.findByIdAndDelete(req.params.id),
      5000
    );

    res.json({ success: true, message: 'Deleted successfully' });

  } catch (error) {
    console.error('Delete Gallery Error:', error.message);
    res.status(500).json({ message: 'Error deleting image' });
  }
});

// -------------------------
// Multer error handler
// -------------------------
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;