const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const { extractTextFromDocument } = require('../utils/textExtraction');
const { enhancedChat } = require('../utils/enhancedChatbot');
const { trackQuestion } = require('../utils/analytics');
const { getModel } = require('../utils/getGeminiModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Institution = require('../models/Institution');

// ── Logo Upload Directory Setup ────────────────────────────────────────────────
const logosDir = path.join(__dirname, '..', 'public', 'uploads', 'logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// ── Multer Storage Configuration for Logos ─────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logosDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const logoFileFilter = (_req, file, cb) => {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  if (allowed.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG, PNG, GIF, and WEBP images are allowed'), { status: 400 }));
  }
};

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: logoFileFilter
});

// Custom auth check that accepts either an active session or a valid x-api-key
const requireSessionOrApiKey = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Authentication required' });
};

// ── POST /api/institutions ────────────────────────────────────────────────────
router.post('/institutions', requireSessionOrApiKey, uploadLogo.single('logo'), async (req, res) => {
  try {
    const { name, type, description, isVerified } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const existing = await Institution.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Institution with this name already exists' });
    }

    let logoUrl = '';
    if (req.file) {
      logoUrl = `/uploads/logos/${req.file.filename}`;
    }

    const institution = new Institution({
      name: name.trim(),
      type: type || 'University',
      description: description || '',
      logo: logoUrl,
      isVerified: isVerified !== undefined ? (isVerified === 'true' || isVerified === true) : true
    });

    await institution.save();
    res.status(201).json({ success: true, data: institution });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('[API] Create institution error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create institution' });
  }
});

const User = require('../models/User');
const { DEMO_TOKEN_LIMIT, isPublicDemoDoc } = require('../utils/demoConfig');

// ── Shared guest chat logic for the designated public demo document ──────────
async function handleGuestDemoChat(req, res, message, document) {
  const currentUsage = req.session.demoTokenUsage || 0;

  // 1. Server-side check: do NOT call Gemini if limit is already reached
  if (currentUsage >= DEMO_TOKEN_LIMIT) {
    return res.status(403).json({
      success: false,
      limitReached: true,
      message: "You've reached the free demo limit. Create an account or log in to continue using the AI Assistant.",
      demoUsage: {
        used: currentUsage,
        limit: DEMO_TOKEN_LIMIT,
        remaining: 0
      }
    });
  }

  if (!document.isParsed || !document.extractedText) {
    return res.status(400).json({ success: false, message: 'Document has not been parsed yet.' });
  }

  try {
    const model = getModel();
    const contextPrompt = `You are a helpful study assistant. Analyze the following document and answer the user's question based strictly on its content. If the answer is not in the document, say so politely.\n\nDOCUMENT:\n${document.extractedText}\n\nQUESTION: ${message}`;

    const result = await model.generateContent(contextPrompt);
    const assistantMessage = result.response.text();

    // 2. Track actual token count from Gemini's usageMetadata
    let tokensUsed = result.response?.usageMetadata?.totalTokenCount;
    if (typeof tokensUsed !== 'number' || tokensUsed <= 0) {
      // Safe fallback if usageMetadata is missing
      tokensUsed = Math.ceil((contextPrompt.length + assistantMessage.length) / 4);
    }

    // 3. Update guest usage safely, capped at DEMO_TOKEN_LIMIT
    const newUsage = Math.min(DEMO_TOKEN_LIMIT, currentUsage + tokensUsed);
    req.session.demoTokenUsage = newUsage;

    if (!Array.isArray(req.session.demoChatHistory)) {
      req.session.demoChatHistory = [];
    }
    req.session.demoChatHistory.push({ role: 'user', content: message, timestamp: new Date() });
    req.session.demoChatHistory.push({ role: 'assistant', content: assistantMessage, timestamp: new Date() });

    await new Promise((resolve) => req.session.save(resolve));

    const limitReached = newUsage >= DEMO_TOKEN_LIMIT;

    return res.json({
      success: true,
      response: assistantMessage,
      chatHistory: req.session.demoChatHistory,
      isGuestDemo: true,
      limitReached,
      demoUsage: {
        used: newUsage,
        limit: DEMO_TOKEN_LIMIT,
        remaining: Math.max(0, DEMO_TOKEN_LIMIT - newUsage)
      }
    });
  } catch (error) {
    console.error('[API] Guest Gemini chat error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process chat message with AI' });
  }
}

// ── Shared authenticated chat logic ───────────────────────────────────────────
async function handleSingleDocChat(userId, message, documentId, res) {
  let document = await Document.findOne({ _id: documentId, userId });

  // If not owner, check if public demo or unlocked/free
  if (!document) {
    const doc = await Document.findById(documentId);
    if (doc) {
      if (isPublicDemoDoc(doc) || !doc.isPremium) {
        document = doc;
      } else {
        const user = await User.findById(userId);
        if (user?.purchasedDocuments?.some((id) => id.toString() === doc._id.toString())) {
          document = doc;
        }
      }
    }
  }

  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  if (!document.isParsed || !document.extractedText) {
    return res.status(400).json({ success: false, message: 'Please parse the document first' });
  }

  await trackQuestion(userId, message, documentId, document.topics?.[0], document.subject).catch(() => {});

  // Try enhanced chat first, fall back gracefully
  try {
    const result = await enhancedChat(userId, message, [documentId]);
    document.chatHistory.push({ role: 'user', content: message });
    document.chatHistory.push({ role: 'assistant', content: result.response });
    await document.save();
    return res.json({
      success: true,
      response: result.response,
      chatHistory: document.chatHistory,
      enhancedFeatures: result.enhancedFeatures
    });
  } catch (_enhancedErr) {
    console.warn('[API] Enhanced chat failed, falling back to standard chat');
  }

  // Standard chat fallback
  const model = getModel();
  const contextPrompt = `You are a helpful study assistant. Analyze the following document and answer the user's question based strictly on its content. If the answer is not in the document, say so politely.\n\nDOCUMENT:\n${document.extractedText}\n\nQUESTION: ${message}`;

  const result = await model.generateContent(contextPrompt);
  const assistantMessage = result.response.text();

  document.chatHistory.push({ role: 'user', content: message });
  document.chatHistory.push({ role: 'assistant', content: assistantMessage });
  await document.save();

  return res.json({
    success: true,
    response: assistantMessage,
    chatHistory: document.chatHistory
  });
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { message, documentIds } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const docIds = Array.isArray(documentIds) ? documentIds : [];
    if (docIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document ID is required' });
    }

    const isAuthenticated = Boolean(req.session && req.session.userId);

    // Unauthenticated guest check
    if (!isAuthenticated) {
      if (docIds.length !== 1) {
        return res.status(401).json({ success: false, message: 'Authentication required for multi-document chat' });
      }
      const document = await Document.findById(docIds[0]);
      if (!document || !isPublicDemoDoc(document)) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      return handleGuestDemoChat(req, res, message.trim(), document);
    }

    // Authenticated user chat:
    const userId = req.session.userId;
    if (docIds.length > 1) {
      const result = await enhancedChat(userId, message.trim(), docIds);
      await trackQuestion(userId, message.trim(), docIds[0], null, null).catch(() => {});
      return res.json({
        success: true,
        response: result.response,
        enhancedFeatures: result.enhancedFeatures
      });
    }

    return handleSingleDocChat(userId, message.trim(), docIds[0], res);
  } catch (error) {
    console.error('[API] Chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process chat message' });
  }
});

// ── POST /api/chat/:documentId ───────────────────────────────────────────────
router.post('/chat/:documentId', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const documentId = req.params.documentId;
    const isAuthenticated = Boolean(req.session && req.session.userId);

    // Unauthenticated guest check
    if (!isAuthenticated) {
      const document = await Document.findById(documentId);
      if (!document || !isPublicDemoDoc(document)) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      return handleGuestDemoChat(req, res, message.trim(), document);
    }

    return handleSingleDocChat(req.session.userId, message.trim(), documentId, res);
  } catch (error) {
    console.error('[API] Chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process chat message' });
  }
});

// ── GET /api/parse-status/:documentId ────────────────────────────────────────
router.get('/parse-status/:documentId', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const isAuthenticated = Boolean(req.session && req.session.userId);

    let document;
    if (isAuthenticated) {
      document = await Document.findOne({
        _id: documentId,
        $or: [{ userId: req.session.userId }, { isPublicDemo: true }]
      }).select('isParsed parsedAt extractedText');
    } else {
      document = await Document.findById(documentId).select('isParsed parsedAt extractedText isPublicDemo');
      if (!document || !isPublicDemoDoc(document)) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
    }

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({
      success: true,
      isParsed: document.isParsed,
      extractedTextLength: document.extractedText?.length || 0,
      parsedAt: document.parsedAt
    });
  } catch (error) {
    console.error('[API] Parse status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get parse status' });
  }
});

// ── GET /api/download-text/:documentId ───────────────────────────────────────
router.get('/download-text/:documentId', async (req, res) => {
  try {
    const documentId = req.params.documentId;
    const isAuthenticated = Boolean(req.session && req.session.userId);

    let document;
    if (isAuthenticated) {
      document = await Document.findOne({
        _id: documentId,
        $or: [{ userId: req.session.userId }, { isPublicDemo: true }]
      }).select('originalName extractedText');
    } else {
      document = await Document.findById(documentId).select('originalName extractedText isPublicDemo');
      if (!document || !isPublicDemoDoc(document)) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
    }

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    if (!document.extractedText) {
      return res.status(400).json({ success: false, message: 'No extracted text available' });
    }

    const safeName = document.originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_extracted.txt"`);
    res.send(document.extractedText);
  } catch (error) {
    console.error('[API] Download error:', error);
    res.status(500).json({ success: false, message: 'Failed to download text' });
  }
});

module.exports = router;
