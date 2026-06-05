const router = require('express').Router();
const MenuItem = require('../models/MenuItem');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists programmatically
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Setup
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to safely delete local files
function deleteLocalFile(imagePath) {
  if (!imagePath) return;
  const fileName = path.basename(imagePath);
  const fullPath = path.join(uploadsDir, fileName);
  if (fs.existsSync(fullPath)) {
    fs.unlink(fullPath, (err) => {
      if (err) console.error(`Failed to delete local file ${fullPath}:`, err.message);
    });
  }
}

// 1. PUBLIC: Fetch all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({}).sort({ category: 1, order: 1 });
    res.json(menuItems);
  } catch (error) {
    console.error('Fetch Menu Error:', error);
    res.status(500).json({ message: 'Error retrieving menu items' });
  }
});

// 2. ADMIN: Add new menu item
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    let imagePath = '';
    if (req.file) {
      imagePath = `${process.env.BACKEND_URL}/uploads/${req.file.filename}`;
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

    await newItem.save();
    res.status(201).json({ success: true, item: newItem });
  } catch (error) {
    console.error('Add Menu Item Error:', error);
    res.status(500).json({ message: 'Error adding menu item' });
  }
});

// 3. ADMIN: Edit menu item
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available, order } = req.body;
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const updateData = {
      name: name || item.name,
      description: description !== undefined ? description : item.description,
      price: price !== undefined ? parseFloat(price) : item.price,
      category: category || item.category,
      available: available !== undefined ? (available === 'true' || available === true) : item.available,
      order: order !== undefined ? parseInt(order) : item.order
    };

    if (req.file) {
      // Remove old image file if it exists
      if (item.image && item.image.startsWith('/uploads/')) {
        deleteLocalFile(item.image);
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ message: 'Error updating menu item' });
  }
});

// 4. ADMIN: Reorder menu items/categories
router.put('/reorder/batch', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order, category }
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const bulkOps = items.map(item => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order, category: item.category } }
      }
    }));

    await MenuItem.bulkWrite(bulkOps);
    res.json({ success: true, message: 'Menu order updated successfully' });
  } catch (error) {
    console.error('Reorder Menu Error:', error);
    res.status(500).json({ message: 'Error reordering menu items' });
  }
});

// 5. ADMIN: Delete menu item
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Delete associated image file
    if (item.image && item.image.startsWith('/uploads/')) {
      deleteLocalFile(item.image);
    }

    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ message: 'Error deleting menu item' });
  }
});

module.exports = router;
