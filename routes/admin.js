const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');

// Apply auth middleware
router.use(requireAuth);
// Apply admin middleware
router.use(requireAdmin);

// Admin dashboard
router.get('/', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const parsedDocuments = await Document.countDocuments({ isParsed: true });
    
    const totalChatQueries = await Document.aggregate([
      { $project: { chatCount: { $size: '$chatHistory' } } },
      { $group: { _id: null, total: { $sum: '$chatCount' } } }
    ]);

    const totalFileSize = await Document.aggregate([
      { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    const recentDocuments = await Document.find().sort({ uploadDate: -1 }).limit(10).populate('userId', 'username email');

    const analytics = {
      totalUsers,
      totalDocuments,
      parsedDocuments,
      totalChatQueries: totalChatQueries[0]?.total || 0,
      totalFileSize: totalFileSize[0]?.total || 0
    };

    res.render('admin', {
      user: req.session.user,
      analytics,
      recentUsers,
      recentDocuments
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('error', {
      error: 'Failed to load admin dashboard',
      user: req.session.user || null
    });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const documents = await Document.find().populate('userId', 'username email').sort({ uploadDate: -1 });
    res.json({ success: true, documents });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.session.userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;

