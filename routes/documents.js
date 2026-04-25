const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');
const { extractTextFromDocument } = require('../utils/textExtraction');

// ── Uploads directory setup ───────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Multer storage config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only PDF, JPG, PNG, and DOCX files are allowed'), { status: 400 }));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter
});

// ── Auth on all routes ────────────────────────────────────────────────────────
router.use(requireAuth);

// ── Upload document ───────────────────────────────────────────────────────────
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { mimetype, originalname } = req.file;
    const fileType =
      mimetype.includes('pdf') ? 'pdf'
      : mimetype.includes('image') ? 'image'
      : (mimetype.includes('word') || originalname.toLowerCase().endsWith('.docx')) ? 'docx'
      : null;

    if (!fileType) {
      fs.unlinkSync(req.file.path); // Clean up unknown file
      return res.status(400).json({ success: false, message: 'Unsupported file type' });
    }

    const document = new Document({
      userId: req.session.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType,
      mimeType: mimetype,
      fileSize: req.file.size,
      category: req.body.category || 'Other',
      institutionId: req.body.institutionId || undefined,
      courseId: req.body.courseId || undefined,
      semester: req.body.semester || undefined,
      year: req.body.year ? parseInt(req.body.year, 10) : undefined,
      examType: req.body.examType || 'Other',
      examDate: req.body.examDate || undefined,
      subject: req.body.subject || undefined,
      topics: req.body.topics ? req.body.topics.split(',').map((t) => t.trim()).filter(Boolean) : []
    });

    await document.save();
    res.status(201).json({ success: true, message: 'File uploaded successfully', documentId: document._id });
  } catch (error) {
    // Clean up file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('[DOCUMENTS] Upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

// ── Get all documents (API) ───────────────────────────────────────────────────
router.get('/api/all', async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.session.userId, isParsed: true })
      .select('_id originalName uploadDate')
      .sort({ uploadDate: -1 })
      .lean();
    res.json({ success: true, data: documents });
  } catch (error) {
    console.error('[DOCUMENTS] API all error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// ── Get all documents (view) ──────────────────────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const { category, search, sortBy = 'uploadDate', order = 'desc' } = req.query;

    // Whitelist sortBy to prevent injection
    const ALLOWED_SORT = new Set(['uploadDate', 'originalName', 'fileSize', 'viewCount']);
    const safeSortBy = ALLOWED_SORT.has(sortBy) ? sortBy : 'uploadDate';

    const query = { userId: req.session.userId };
    if (category && category !== 'All') query.category = category;

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
      query.$or = [
        { originalName: { $regex: safeSearch, $options: 'i' } },
        { subject: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const documents = await Document.find(query)
      .select('-extractedText -chatHistory') // Don't load heavy fields
      .sort({ [safeSortBy]: order === 'asc' ? 1 : -1 })
      .lean();

    res.render('documents', {
      user: req.session.user,
      documents,
      currentCategory: category || 'All',
      currentSearch: search || '',
      currentSort: safeSortBy,
      currentOrder: order
    });
  } catch (error) {
    console.error('[DOCUMENTS] Get all error:', error);
    res.render('error', { error: 'Failed to load documents', user: req.session.user || null });
  }
});

// ── View single document ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).render('error', { error: 'Document not found', user: req.session.user || null });
    }

    // Access control
    const user = await User.findById(req.session.userId);
    const isOwner = document.userId.toString() === req.session.userId;
    const isUnlocked = user.purchasedDocuments.some((id) => id.toString() === document._id.toString());
    const isFree = !document.isPremium;

    if (!isOwner && !isUnlocked && !isFree) {
      return res.redirect(`/marketplace?unlock=${document._id}`);
    }

    // Track view (fire-and-forget, no await to keep response fast)
    Document.findByIdAndUpdate(document._id, {
      $inc: { viewCount: 1 },
      lastViewed: new Date()
    }).catch((e) => console.error('[DOCUMENTS] View track error:', e));

    res.render('document-view', {
      user: req.session.user,
      document,
      sessionStart: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DOCUMENTS] View error:', error);
    res.render('error', { error: 'Failed to load document', user: req.session.user || null });
  }
});

// ── Parse document ────────────────────────────────────────────────────────────
router.post('/:id/parse', async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    if (document.isParsed) {
      return res.json({ success: true, message: 'Document already parsed', documentId: document._id });
    }

    // Respond immediately — parsing is async
    res.json({ success: true, message: 'Parsing started', documentId: document._id });

    extractTextFromDocument(document.filePath, document.fileType)
      .then((extractedText) =>
        Document.findByIdAndUpdate(document._id, {
          extractedText,
          isParsed: true,
          parsedAt: new Date()
        })
      )
      .catch((err) => console.error('[DOCUMENTS] Text extraction error:', err));
  } catch (error) {
    console.error('[DOCUMENTS] Parse error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse document' });
  }
});

// ── Delete document ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete file from disk (non-blocking)
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlink(document.filePath, (err) => {
        if (err) console.error('[DOCUMENTS] File delete error:', err);
      });
    }

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[DOCUMENTS] Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

// ── Update document category ──────────────────────────────────────────────────
router.patch('/:id/category', async (req, res) => {
  try {
    const { category } = req.body;
    const ALLOWED_CATEGORIES = ['Notes', 'Reports', 'Certificates', 'Other'];
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { category },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Category updated' });
  } catch (error) {
    console.error('[DOCUMENTS] Category update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
});

// ── Multer error handler ──────────────────────────────────────────────────────
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.status === 400) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;
