const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');
const { extractTextFromDocument } = require('../utils/textExtraction');
const { trackStudySession } = require('../utils/analytics');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, and DOCX files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Apply auth middleware
router.use(requireAuth);

// Upload document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileType = req.file.mimetype.includes('pdf') ? 'pdf' :
      req.file.mimetype.includes('image') ? 'image' :
        req.file.mimetype.includes('word') || req.file.originalname.endsWith('.docx') ? 'docx' : 'other';

    const document = new Document({
      userId: req.session.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      category: req.body.category || 'Other',
      institutionId: req.body.institutionId || null,
      courseId: req.body.courseId || null,
      semester: req.body.semester || null,
      year: req.body.year || null,
      examType: req.body.examType || 'Other',
      examDate: req.body.examDate || null,
      subject: req.body.subject || null,
      topics: req.body.topics ? req.body.topics.split(',') : []
    });

    await document.save();
    res.json({
      success: true,
      message: 'File uploaded successfully',
      documentId: document._id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
});

// Get all documents (for API)
router.get('/api/all', async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.session.userId, isParsed: true })
      .select('_id originalName')
      .sort({ uploadDate: -1 });

    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('Get documents API error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// Get all documents
router.get('/all', async (req, res) => {
  try {
    const { category, search, sortBy = 'uploadDate', order = 'desc' } = req.query;
    const query = { userId: req.session.userId };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { extractedText: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const documents = await Document.find(query)
      .sort(sortOptions);

    res.render('documents', {
      user: req.session.user,
      documents,
      currentCategory: category || 'All',
      currentSearch: search || '',
      currentSort: sortBy,
      currentOrder: order
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.render('error', {
      error: 'Failed to load documents',
      user: req.session.user || null
    });
  }
});

// View single document
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.render('error', {
        error: 'Document not found',
        user: req.session.user || null
      });
    }

    // Access Control Logic
    const user = await User.findById(req.session.userId);
    const isOwner = document.userId.toString() === req.session.userId;
    const isUnlocked = user.purchasedDocuments.includes(document._id);
    const isFree = !document.isPremium;

    if (!isOwner && !isUnlocked && !isFree) {
      // Redirect to marketplace if trying to access locked content
      return res.redirect(`/marketplace?unlock=${document._id}`);
    }

    // Track view
    document.viewCount += 1;
    document.lastViewed = new Date();
    await document.save();

    // Start study session tracking
    const sessionStart = new Date();

    res.render('document-view', {
      user: req.session.user,
      document,
      sessionStart: sessionStart.toISOString()
    });
  } catch (error) {
    console.error('View document error:', error);
    res.render('error', {
      error: 'Failed to load document',
      user: req.session.user || null
    });
  }
});

// Parse document
router.post('/:id/parse', async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Parsing started',
      documentId: document._id
    });

    // Parse document asynchronously
    extractTextFromDocument(document.filePath, document.fileType)
      .then(async (extractedText) => {
        await Document.findByIdAndUpdate(document._id, {
          extractedText,
          isParsed: true,
          parsedAt: new Date()
        });
      })
      .catch(err => {
        console.error('Text extraction error:', err);
      });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to parse document'
    });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete from database
    await Document.findByIdAndDelete(document._id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// Update document category
router.patch('/:id/category', async (req, res) => {
  try {
    const { category } = req.body;
    await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { category }
    );
    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

module.exports = router;
