const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Institution = require('../models/Institution');
const Course = require('../models/Course');
const Document = require('../models/Document');
const User = require('../models/User');

router.use(requireAuth);

// Get all institutions
router.get('/institutions', async (req, res) => {
  try {
    const institutions = await Institution.find().sort({ name: 1 });
    res.json({ success: true, data: institutions });
  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch institutions' });
  }
});

// Create institution (admin only)
router.post('/institutions', requireAdmin, async (req, res) => {
  try {
    const { name, type, description } = req.body;
    
    const institution = new Institution({
      name,
      type,
      description
    });
    
    await institution.save();
    res.json({ success: true, data: institution });
  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({ success: false, message: 'Failed to create institution' });
  }
});

// Get courses
router.get('/courses', async (req, res) => {
  try {
    const { institutionId, semester, year } = req.query;
    const query = {};
    
    if (institutionId) query.institutionId = institutionId;
    if (semester) query.semester = semester;
    if (year) query.year = year;
    
    const courses = await Course.find(query).populate('institutionId').sort({ name: 1 });
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// Create course
router.post('/courses', async (req, res) => {
  try {
    const { name, code, institutionId, semester, year, description, professorName, professorEmail } = req.body;
    
    const course = new Course({
      name,
      code,
      institutionId,
      semester,
      year,
      description,
      professorName,
      professorEmail
    });
    
    await course.save();
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, message: 'Failed to create course' });
  }
});

// Update user institution
router.post('/user/institution', async (req, res) => {
  try {
    const { institutionId, studentId } = req.body;
    
    await User.findByIdAndUpdate(req.session.userId, {
      institutionId,
      studentId
    });
    
    res.json({ success: true, message: 'Institution updated' });
  } catch (error) {
    console.error('Update user institution error:', error);
    res.status(500).json({ success: false, message: 'Failed to update institution' });
  }
});

// Verify document (professor/teacher only)
router.post('/documents/:id/verify', async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    
    if (user.role !== 'professor' && user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    document.isVerified = true;
    document.verifiedBy = req.session.userId;
    await document.save();
    
    res.json({ success: true, message: 'Document verified' });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify document' });
  }
});

// Get documents by institution/course
router.get('/documents/filter', async (req, res) => {
  try {
    const { institutionId, courseId, semester, year } = req.query;
    const query = { userId: req.session.userId };
    
    if (institutionId) query.institutionId = institutionId;
    if (courseId) query.courseId = courseId;
    if (semester) query.semester = semester;
    if (year) query.year = year;
    
    const documents = await Document.find(query)
      .populate('courseId')
      .populate('institutionId')
      .sort({ uploadDate: -1 });
    
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Filter documents error:', error);
    res.status(500).json({ success: false, message: 'Failed to filter documents' });
  }
});

module.exports = router;

