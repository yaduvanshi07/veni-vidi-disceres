const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getStudyPatterns,
  identifyWeakTopics,
  getFrequentlyAskedQuestions,
  predictPerformance,
  trackStudySession
} = require('../utils/analytics');
const StudySession = require('../models/StudySession');

router.use(requireAuth);

// Analytics dashboard view
router.get('/dashboard', async (req, res) => {
  try {
    res.render('analytics', {
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.render('error', {
      error: 'Failed to load analytics dashboard',
      user: req.session.user || null
    });
  }
});

// Get analytics dashboard data
router.get('/', async (req, res) => {
  try {
    const patterns = await getStudyPatterns(req.session.userId, 30);
    const weakTopics = await identifyWeakTopics(req.session.userId);
    const faqTrends = await getFrequentlyAskedQuestions(req.session.userId, 10);
    const performance = await predictPerformance(req.session.userId);
    
    res.json({
      success: true,
      data: {
        patterns,
        weakTopics,
        faqTrends,
        performance
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// Start study session
router.post('/session/start', async (req, res) => {
  try {
    const { documentId, courseId, subject, topic } = req.body;
    
    const session = await trackStudySession(
      req.session.userId,
      documentId,
      courseId,
      subject,
      topic,
      new Date(),
      null
    );
    
    res.json({
      success: true,
      sessionId: session._id
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ success: false, message: 'Failed to start session' });
  }
});

// End study session
router.post('/session/end/:sessionId', async (req, res) => {
  try {
    const session = await StudySession.findById(req.params.sessionId);
    
    if (!session || session.userId.toString() !== req.session.userId.toString()) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    session.endTime = new Date();
    session.duration = Math.round((session.endTime - session.startTime) / 1000 / 60);
    await session.save();
    
    res.json({ success: true, session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

// Get study patterns
router.get('/patterns', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const patterns = await getStudyPatterns(req.session.userId, days);
    res.json({ success: true, data: patterns });
  } catch (error) {
    console.error('Patterns error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patterns' });
  }
});

// Get weak topics
router.get('/weak-topics', async (req, res) => {
  try {
    const weakTopics = await identifyWeakTopics(req.session.userId);
    res.json({ success: true, data: weakTopics });
  } catch (error) {
    console.error('Weak topics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weak topics' });
  }
});

// Get FAQ trends
router.get('/faq-trends', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const trends = await getFrequentlyAskedQuestions(req.session.userId, limit);
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('FAQ trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQ trends' });
  }
});

// Get performance prediction
router.get('/performance', async (req, res) => {
  try {
    const performance = await predictPerformance(req.session.userId);
    res.json({ success: true, data: performance });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to predict performance' });
  }
});

module.exports = router;

