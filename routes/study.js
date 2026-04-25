const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  generateFlashcards,
  generateSummary,
  findRelatedDocuments,
  updateFlashcardMastery
} = require('../utils/studyFeatures');
const Flashcard = require('../models/Flashcard');
const Summary = require('../models/Summary');
const Exam = require('../models/Exam');
const Document = require('../models/Document');

router.use(requireAuth);

// Flashcards view
router.get('/flashcards', async (req, res) => {
  try {
    res.render('flashcards', {
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Flashcards view error:', error);
    res.render('error', {
      error: 'Failed to load flashcards',
      user: req.session.user || null
    });
  }
});

// Exams view
router.get('/exams', async (req, res) => {
  try {
    res.render('exams', {
      user: req.session.user || null
    });
  } catch (error) {
    console.error('Exams view error:', error);
    res.render('error', {
      error: 'Failed to load exams',
      user: req.session.user || null
    });
  }
});

// Generate flashcards
router.post('/flashcards/generate/:documentId', async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);
    
    if (!document || document.userId.toString() !== req.session.userId.toString()) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    if (!document.isParsed || !document.extractedText) {
      return res.status(400).json({ success: false, message: 'Document must be parsed first' });
    }
    
    res.json({ success: true, message: 'Flashcard generation started' });
    
    // Generate asynchronously
    generateFlashcards(req.session.userId, req.params.documentId, document.extractedText)
      .then(() => {
        console.log('Flashcards generated successfully');
      })
      .catch(err => {
        console.error('Flashcard generation error:', err);
      });
    
  } catch (error) {
    console.error('Generate flashcards error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate flashcards' });
  }
});

// Get flashcards
router.get('/api/flashcards', async (req, res) => {
  try {
    const { documentId, topic, difficulty, due } = req.query;
    const query = { userId: req.session.userId };
    
    if (documentId) query.documentId = documentId;
    if (topic) query.topic = topic;
    if (difficulty) query.difficulty = difficulty;
    if (due === 'true') {
      query.nextReview = { $lte: new Date() };
    }
    
    const flashcards = await Flashcard.find(query)
      .populate('documentId', 'originalName')
      .sort({ nextReview: 1 });
    res.json({ success: true, data: flashcards });
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flashcards' });
  }
});

// Update flashcard mastery
router.post('/api/flashcards/:id/review', async (req, res) => {
  try {
    const { isCorrect } = req.body;
    const flashcard = await Flashcard.findById(req.params.id);
    
    if (!flashcard || flashcard.userId.toString() !== req.session.userId.toString()) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }
    
    const updated = await updateFlashcardMastery(req.params.id, isCorrect);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Review flashcard error:', error);
    res.status(500).json({ success: false, message: 'Failed to update flashcard' });
  }
});

// Generate summary
router.post('/summary/generate/:documentId', async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);
    
    if (!document || document.userId.toString() !== req.session.userId.toString()) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    if (!document.isParsed || !document.extractedText) {
      return res.status(400).json({ success: false, message: 'Document must be parsed first' });
    }
    
    res.json({ success: true, message: 'Summary generation started' });
    
    // Generate asynchronously
    generateSummary(req.session.userId, req.params.documentId, document.extractedText)
      .then(() => {
        console.log('Summary generated successfully');
      })
      .catch(err => {
        console.error('Summary generation error:', err);
      });
    
  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

// Get summary
router.get('/api/summary/:documentId', async (req, res) => {
  try {
    const summary = await Summary.findOne({
      userId: req.session.userId,
      documentId: req.params.documentId
    });
    
    if (!summary) {
      return res.status(404).json({ success: false, message: 'Summary not found' });
    }
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// Get related documents
router.get('/api/related/:documentId', async (req, res) => {
  try {
    const related = await findRelatedDocuments(req.params.documentId, req.session.userId);
    res.json({ success: true, data: related });
  } catch (error) {
    console.error('Related documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to find related documents' });
  }
});

// Exam management
router.post('/api/exams', async (req, res) => {
  try {
    const { title, description, examDate, examTime, location, courseId } = req.body;
    
    const exam = new Exam({
      userId: req.session.userId,
      courseId,
      title,
      description,
      examDate: new Date(examDate),
      examTime,
      location
    });
    
    // Generate reminders
    const examDateObj = new Date(examDate);
    const reminders = [
      { date: new Date(examDateObj.getTime() - 7 * 24 * 60 * 60 * 1000), message: `${title} is in 7 days!` },
      { date: new Date(examDateObj.getTime() - 1 * 24 * 60 * 60 * 1000), message: `${title} is tomorrow!` },
      { date: new Date(examDateObj.getTime() - 1 * 60 * 60 * 1000), message: `${title} is in 1 hour!` }
    ];
    exam.reminders = reminders;
    
    await exam.save();
    res.json({ success: true, data: exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ success: false, message: 'Failed to create exam' });
  }
});

router.get('/api/exams', async (req, res) => {
  try {
    const exams = await Exam.find({
      userId: req.session.userId,
      isActive: true
    })
    .populate('courseId')
    .sort({ examDate: 1 });
    
    res.json({ success: true, data: exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch exams' });
  }
});

router.delete('/api/exams/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam || exam.userId.toString() !== req.session.userId.toString()) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    
    exam.isActive = false;
    await exam.save();
    
    res.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete exam' });
  }
});

module.exports = router;
