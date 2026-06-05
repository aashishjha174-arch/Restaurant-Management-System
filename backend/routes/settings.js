const router = require('express').Router();
const Settings = require('../models/Settings');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// 1. PUBLIC: Get restaurant settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      // Return hardcoded default settings if database hasn't been seeded yet
      settings = {
        phone: '982-3002449',
        facebook: 'facebook.com',
        instagram: 'instagram.com',
        address: 'P884+3PW, Jogin Pakha Marg, Kathmandu 44600',
        openingHours: 'Opens 9 AM'
      };
    }
    res.json(settings);
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    res.status(500).json({ message: 'Error retrieving settings' });
  }
});

// 2. ADMIN: Update restaurant settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { phone, facebook, instagram, address, openingHours } = req.body;

    let settings = await Settings.findOne({});
    if (!settings) {
      settings = new Settings({});
    }

    if (phone !== undefined) settings.phone = phone;
    if (facebook !== undefined) settings.facebook = facebook;
    if (instagram !== undefined) settings.instagram = instagram;
    if (address !== undefined) settings.address = address;
    if (openingHours !== undefined) settings.openingHours = openingHours;

    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
});

// 3. ADMIN: Change admin password
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    await admin.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

module.exports = router;
