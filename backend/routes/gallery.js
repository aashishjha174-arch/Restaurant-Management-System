const router = require('express').Router();
const GalleryImage = require('../models/GalleryImage');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');

// Multer Config (Shares the uploads folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for high res gallery
});

// Helper to delete local files
function deleteLocalFile(imagePath) {
  if (!imagePath) return;
  const fileName = path.basename(imagePath);
  const fullPath = path.join(uploadsDir, fileName);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error(`Failed to delete gallery file ${fullPath}:`, err.message);
    });
  }
}

// 1. PUBLIC: Get all gallery images
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find({}).sort({ uploadedAt: -1 });
    res.json(images);
  } catch (error) {
    console.error('Fetch Gallery Error:', error);
    res.status(500).json({ message: 'Error retrieving gallery images' });
  }
});

// 2. ADMIN: Upload photo to gallery
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    const newImage = new GalleryImage({
      url: imagePath,
      caption: caption || ''
    });

    await newImage.save();
    res.status(201).json({ success: true, image: newImage });
  } catch (error) {
    console.error('Gallery Upload Error:', error);
    res.status(500).json({ message: 'Error uploading image to gallery' });
  }
});

// 3. ADMIN: Delete photo from gallery
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete associated image file
    if (image.url && image.url.startsWith('/uploads/')) {
      deleteLocalFile(image.url);
    }

    await GalleryImage.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete Gallery Image Error:', error);
    res.status(500).json({ message: 'Error deleting gallery image' });
  }
});

module.exports = router;
