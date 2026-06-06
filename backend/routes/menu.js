const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
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
    folder: 'secret-garden/menu',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ]);

// -------------------------
// 1. GET all menu items
// -------------------------
router.get('/', async (req, res) => {
  try {
    const menuItems = await withTimeout(
      MenuItem.find({}).sort({ category: 1, order: 1 }),
      5000
    );
    res.json(menuItems);
  } catch (error) {
    console.error('Fetch Menu Error:', error.message);
    res.status(500).json({ message: 'Error retrieving menu items' });
  }
});

// -------------------------
// 2. ADD menu item
// -------------------------
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, category required' });
    }

    // Cloudinary gives req.file.path as the full permanent URL
    const imagePath = req.file ? req.file.path : '';
    const publicId   = req.file ? req.file.filename : '';

    const newItem = new MenuItem({
      name,
      description,
      price:     parseFloat(price),
      category,
      image:     imagePath,
      publicId,
      available: available === 'true' || available === true,
      order:     parseInt(order || 0)
    });

    const savedItem = await withTimeout(newItem.save(), 5000);
    res.status(201).json({ success: true, item: savedItem });

  } catch (error) {
    console.error('Add Menu Error:', error.message);

    // Rollback: delete from Cloudinary if DB fails
    if (req.file && req.file.filename) {
      cloudinary.uploader.destroy(req.file.filename).catch(console.error);
    }

    res.status(500).json({ message: 'Error adding menu item' });
  }
});

// -------------------------
// 3. UPDATE menu item
// -------------------------
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;

    const item = await withTimeout(MenuItem.findById(req.params.id), 5000);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const updateData = {
      name:        name || item.name,
      description: description ?? item.description,
      price:       price !== undefined ? parseFloat(price) : item.price,
      category:    category || item.category,
      available:   available !== undefined ? (available === 'true' || available === true) : item.available,
      order:       order !== undefined ? parseInt(order) : item.order
    };

    if (req.file) {
      // Delete old image from Cloudinary
      if (item.publicId) {
        cloudinary.uploader.destroy(item.publicId).catch(console.error);
      }
      updateData.image    = req.file.path;
      updateData.publicId = req.file.filename;
    }

    const updatedItem = await withTimeout(
      MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true }),
      5000
    );

    res.json({ success: true, item: updatedItem });

  } catch (error) {
    console.error('Update Menu Error:', error.message);
    res.status(500).json({ message: 'Error updating menu item' });
  }
});

// -------------------------
// 4. REORDER items
// -------------------------
router.put('/reorder/batch', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be array' });
    }

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order, category: item.category } }
      }
    }));

    await withTimeout(MenuItem.bulkWrite(bulkOps), 5000);
    res.json({ success: true, message: 'Menu reordered successfully' });

  } catch (error) {
    console.error('Reorder Error:', error.message);
    res.status(500).json({ message: 'Error reordering menu' });
  }
});

// -------------------------
// 5. DELETE item
// -------------------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await withTimeout(MenuItem.findById(req.params.id), 5000);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Delete from Cloudinary
    if (item.publicId) {
      await cloudinary.uploader.destroy(item.publicId).catch(console.error);
    }

    await withTimeout(MenuItem.findByIdAndDelete(req.params.id), 5000);
    res.json({ success: true, message: 'Deleted successfully' });

  } catch (error) {
    console.error('Delete Error:', error.message);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;