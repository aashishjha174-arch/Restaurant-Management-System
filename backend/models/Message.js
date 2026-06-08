const router = require('express').Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

// PUBLIC: Submit message
router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields required' });
    }
    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADMIN: Get all messages
router.get('/', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// ADMIN: Mark as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.json({ success: true, msg });
  } catch (err) {
    res.status(500).json({ message: 'Error updating message' });
  }
});

// ADMIN: Delete message
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message' });
  }
});

module.exports = router;