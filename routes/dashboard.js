const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');
const Exam = require('../models/Exam');

// Apply auth middleware to all dashboard routes
router.use(requireAuth);

// Dashboard home
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).populate('purchasedDocuments');
    const documents = await Document.find({ userId: req.session.userId })
      .sort({ uploadDate: -1 })
      .limit(10);

    const totalDocuments = await Document.countDocuments({ userId: req.session.userId });
    const parsedDocuments = await Document.countDocuments({
      userId: req.session.userId,
      isParsed: true
    });

    const totalChatQueries = await Document.aggregate([
      { $match: { userId: req.session.userId } },
      { $project: { chatCount: { $size: '$chatHistory' } } },
      { $group: { _id: null, total: { $sum: '$chatCount' } } }
    ]);

    // Get upcoming exams
    const upcomingExams = await Exam.find({
      userId: req.session.userId,
      isActive: true,
      examDate: { $gte: new Date() }
    })
      .sort({ examDate: 1 })
      .limit(5)
      .populate('courseId');

    const analytics = {
      totalDocuments,
      parsedDocuments,
      totalChatQueries: totalChatQueries[0]?.total || 0
    };

    // Update session user with preferences
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
      analytics,
      upcomingExams
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', {
      error: 'Failed to load dashboard',
      user: req.session.user || null
    });
  }
});

// Update profile
router.post('/profile', async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.bio': bio
    });
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Update theme preference
router.post('/theme', async (req, res) => {
  try {
    const { theme } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      'preferences.theme': theme
    });
    req.session.theme = theme;
    res.json({ success: true });
  } catch (error) {
    console.error('Theme update error:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
