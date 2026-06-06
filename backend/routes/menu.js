const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

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

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ]);

const BACKEND_URL = process.env.BACKEND_URL || 'https://restaurant-management-system-r5mg.onrender.com';

// 1. GET all menu items
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

// 2. ADD menu item
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, category required' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `${BACKEND_URL}/uploads/${req.file.filename}`;
    }

    const newItem = new MenuItem({
      name,
      description,
      price: parseFloat(price),
      category,
      image: imagePath,
      available: available === 'true' || available === true,
      order: parseInt(order || 0)
    });

    const savedItem = await withTimeout(newItem.save(), 5000);
    res.status(201).json({ success: true, item: savedItem });
  } catch (error) {
    console.error('Add Menu Error:', error.message);
    res.status(500).json({ message: 'Error adding menu item' });
  }
});

// 3. UPDATE menu item
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;

    const item = await withTimeout(MenuItem.findById(req.params.id), 5000);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const updateData = {
      name: name || item.name,
      description: description ?? item.description,
      price: price !== undefined ? parseFloat(price) : item.price,
      category: category || item.category,
      available: available !== undefined ? (available === 'true' || available === true) : item.available,
      order: order !== undefined ? parseInt(order) : item.order
    };

    if (req.file) {
      if (item.image) deleteLocalFile(item.image);
      updateData.image = `${BACKEND_URL}/uploads/${req.file.filename}`;
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

// 4. REORDER items
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

// 5. DELETE item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await withTimeout(MenuItem.findById(req.params.id), 5000);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    if (item.image) deleteLocalFile(item.image);

    await withTimeout(MenuItem.findByIdAndDelete(req.params.id), 5000);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error.message);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;