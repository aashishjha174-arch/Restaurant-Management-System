const router = require('express').Router();
const GalleryImage = require('../models/GalleryImage');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');

// -------------------------
// Ensure uploads folder
// -------------------------
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -------------------------
// Multer config
// -------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// -------------------------
// Helpers
// -------------------------
function deleteLocalFile(imagePath) {
  if (!imagePath) return;

  const fileName = path.basename(imagePath);
  const fullPath = path.join(uploadsDir, fileName);

  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error('File delete error:', err.message);
    });
  }
}

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

    const imagePath = `/uploads/${req.file.filename}`;

    const newImage = new GalleryImage({
      url: imagePath,
      caption: caption || ''
    });

    const saved = await withTimeout(newImage.save(), 5000);

    res.status(201).json({ success: true, image: saved });

  } catch (error) {
    console.error('Gallery Upload Error:', error.message);

    // rollback file if DB fails
    if (req.file) {
      deleteLocalFile(`/uploads/${req.file.filename}`);
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

    if (image.url && image.url.startsWith('/uploads/')) {
      deleteLocalFile(image.url);
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