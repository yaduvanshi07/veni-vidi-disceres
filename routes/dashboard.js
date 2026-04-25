const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');
const Exam = require('../models/Exam');

router.use(requireAuth);

// ── Dashboard home ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [user, documents, totalDocuments, parsedDocuments, chatAgg, upcomingExams] = await Promise.all([
      User.findById(userId).populate('purchasedDocuments'),
      Document.find({ userId })
        .select('-extractedText -chatHistory')
        .sort({ uploadDate: -1 })
        .limit(10)
        .lean(),
      Document.countDocuments({ userId }),
      Document.countDocuments({ userId, isParsed: true }),
      Document.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $project: { chatCount: { $size: '$chatHistory' } } },
        { $group: { _id: null, total: { $sum: '$chatCount' } } }
      ]),
      Exam.find({ userId, isActive: true, examDate: { $gte: new Date() } })
        .sort({ examDate: 1 })
        .limit(5)
        .populate('courseId')
        .lean()
    ]);

    // Keep session user fresh
    if (user) {
      req.session.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      };
    }

    res.render('dashboard', {
      user: req.session.user,
      userProfile: user,
      documents,
      analytics: {
        totalDocuments,
        parsedDocuments,
        totalChatQueries: chatAgg[0]?.total || 0
      },
      upcomingExams
    });
  } catch (error) {
    console.error('[DASHBOARD] Error:', error);
    res.render('error', { error: 'Failed to load dashboard', user: req.session.user || null });
  }
});

// ── Update profile ────────────────────────────────────────────────────────────
router.post('/profile', async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      'profile.firstName': firstName?.trim(),
      'profile.lastName': lastName?.trim(),
      'profile.bio': bio?.trim()
    });
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[DASHBOARD] Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// ── Update theme ──────────────────────────────────────────────────────────────
router.post('/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ success: false, message: 'Invalid theme value' });
    }
    await User.findByIdAndUpdate(req.session.userId, { 'preferences.theme': theme });
    req.session.user = { ...req.session.user, preferences: { ...req.session.user?.preferences, theme } };
    res.json({ success: true });
  } catch (error) {
    console.error('[DASHBOARD] Theme update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update theme' });
  }
});

module.exports = router;
