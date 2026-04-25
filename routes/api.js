const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const { extractTextFromDocument } = require('../utils/textExtraction');
const { enhancedChat } = require('../utils/enhancedChatbot');
const { trackQuestion } = require('../utils/analytics');
const { getModel } = require('../utils/getGeminiModel');

router.use(requireAuth);

// ── Shared chat logic ─────────────────────────────────────────────────────────
async function handleSingleDocChat(userId, message, documentId, res) {
  const document = await Document.findOne({ _id: documentId, userId });

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
    const userId = req.session.userId;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const docIds = Array.isArray(documentIds) ? documentIds : [];

    if (docIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one document ID is required' });
    }

    // Multi-document enhanced chat
    if (docIds.length > 1) {
      const result = await enhancedChat(userId, message, docIds);
      await trackQuestion(userId, message, docIds[0], null, null).catch(() => {});
      return res.json({
        success: true,
        response: result.response,
        enhancedFeatures: result.enhancedFeatures
      });
    }

    // Single document
    return handleSingleDocChat(userId, message, docIds[0], res);
  } catch (error) {
    console.error('[API] Chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process chat message' });
  }
});

// ── POST /api/chat/:documentId (legacy) ──────────────────────────────────────
router.post('/chat/:documentId', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    return handleSingleDocChat(req.session.userId, message, req.params.documentId, res);
  } catch (error) {
    console.error('[API] Legacy chat error:', error);
    res.status(500).json({ success: false, message: 'Failed to process chat message' });
  }
});

// ── GET /api/parse-status/:documentId ────────────────────────────────────────
router.get('/parse-status/:documentId', async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      userId: req.session.userId
    }).select('isParsed parsedAt extractedText');

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
    const document = await Document.findOne({
      _id: req.params.documentId,
      userId: req.session.userId
    }).select('originalName extractedText');

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
