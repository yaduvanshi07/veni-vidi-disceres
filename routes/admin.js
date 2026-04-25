const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');

router.use(requireAuth);
router.use(requireAdmin);

// ── Admin dashboard ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [totalUsers, totalDocuments, parsedDocuments, chatAgg, sizeAgg, recentUsers, recentDocuments] =
      await Promise.all([
        User.countDocuments(),
        Document.countDocuments(),
        Document.countDocuments({ isParsed: true }),
        Document.aggregate([
          { $project: { chatCount: { $size: '$chatHistory' } } },
          { $group: { _id: null, total: { $sum: '$chatCount' } } }
        ]),
        Document.aggregate([{ $group: { _id: null, total: { $sum: '$fileSize' } } }]),
        User.find().sort({ createdAt: -1 }).limit(5).select('-password').lean(),
        Document.find().sort({ uploadDate: -1 }).limit(10).populate('userId', 'username email').lean()
      ]);

    res.render('admin', {
      user: req.session.user,
      analytics: {
        totalUsers,
        totalDocuments,
        parsedDocuments,
        totalChatQueries: chatAgg[0]?.total || 0,
        totalFileSize: sizeAgg[0]?.total || 0
      },
      recentUsers,
      recentDocuments
    });
  } catch (error) {
    console.error('[ADMIN] Dashboard error:', error);
    res.render('error', { error: 'Failed to load admin dashboard', user: req.session.user || null });
  }
});

// ── Get all users ─────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, users });
  } catch (error) {
    console.error('[ADMIN] Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// ── Get all documents ─────────────────────────────────────────────────────────
router.get('/documents', async (req, res) => {
  try {
    const documents = await Document.find()
      .select('-extractedText -chatHistory') // Don't send heavy fields
      .populate('userId', 'username email')
      .sort({ uploadDate: -1 })
      .lean();
    res.json({ success: true, documents });
  } catch (error) {
    console.error('[ADMIN] Get documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// ── Delete user ───────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.session.userId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ── Verify document ───────────────────────────────────────────────────────────
router.post('/documents/:id/verify', async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, verifiedBy: req.session.userId },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document verified' });
  } catch (error) {
    console.error('[ADMIN] Verify document error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify document' });
  }
});

module.exports = router;
