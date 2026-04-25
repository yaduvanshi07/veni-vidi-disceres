const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const { extractTextFromDocument } = require('../utils/textExtraction');
const { enhancedChat } = require('../utils/enhancedChatbot');
const { trackQuestion } = require('../utils/analytics');
const { getModel } = require('../utils/getGeminiModel');

// Apply auth middleware
router.use(requireAuth);

// Enhanced chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, documentIds } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const docIds = documentIds || [];
    
    // Use enhanced chat if multiple documents
    if (docIds.length > 1) {
      const result = await enhancedChat(req.session.userId, message, docIds);
      
      // Track question
      await trackQuestion(req.session.userId, message, docIds[0], null, null);
      
      res.json({
        success: true,
        response: result.response,
        enhancedFeatures: result.enhancedFeatures
      });
      return;
    }
    
    // Single document chat (original behavior)
    if (docIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one document ID is required'
      });
    }

    const documentId = docIds[0];
    
    // Get document
    const document = await Document.findOne({
      _id: documentId,
      userId: req.session.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Ensure document is parsed
    if (!document.isParsed || !document.extractedText) {
      return res.status(400).json({
        success: false,
        message: 'Please parse the document first'
      });
    }

    // Track question
    await trackQuestion(req.session.userId, message, documentId, document.topics?.[0], document.subject);

    // Try enhanced chat first
    try {
      const result = await enhancedChat(req.session.userId, message, [documentId]);
      
      // Add to chat history
      document.chatHistory.push({
        role: 'user',
        content: message
      });
      document.chatHistory.push({
        role: 'assistant',
        content: result.response
      });
      await document.save();
      
      res.json({
        success: true,
        response: result.response,
        chatHistory: document.chatHistory,
        enhancedFeatures: result.enhancedFeatures
      });
      return;
    } catch (enhancedError) {
      console.log('Enhanced chat failed, using standard chat');
    }

    // Fallback to standard chat
    document.chatHistory.push({
      role: 'user',
      content: message
    });

    // Get model
    const model = getModel();

    // Create context prompt
    const contextPrompt = `You are a helpful assistant analyzing a document. Here is the document content:

${document.extractedText}

Please answer the user's question based on the document content above. If the question cannot be answered from the document, politely say so.`;

    // Generate response
    const result = await model.generateContent(contextPrompt + '\n\nUser question: ' + message);
    const response = await result.response;
    const assistantMessage = response.text();

    // Add assistant message to chat history
    document.chatHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    // Save updated chat history
    await document.save();

    res.json({
      success: true,
      response: assistantMessage,
      chatHistory: document.chatHistory
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    });
  }
});

// Legacy single document chat endpoint (for backward compatibility)
router.post('/chat/:documentId', async (req, res) => {
  req.body.documentIds = [req.params.documentId];
  // Call the enhanced chat handler
  const { message } = req.body;
  const documentId = req.params.documentId;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Message is required'
    });
  }

  // Get document
  const document = await Document.findOne({
    _id: documentId,
    userId: req.session.userId
  });

  if (!document) {
    return res.status(404).json({
      success: false,
      message: 'Document not found'
    });
  }

  if (!document.isParsed || !document.extractedText) {
    return res.status(400).json({
      success: false,
      message: 'Please parse the document first'
    });
  }

  // Track question
  await trackQuestion(req.session.userId, message, documentId, document.topics?.[0], document.subject);

  // Try enhanced chat
  try {
    const result = await enhancedChat(req.session.userId, message, [documentId]);
    
    document.chatHistory.push({
      role: 'user',
      content: message
    });
    document.chatHistory.push({
      role: 'assistant',
      content: result.response
    });
    await document.save();
    
    return res.json({
      success: true,
      response: result.response,
      chatHistory: document.chatHistory,
      enhancedFeatures: result.enhancedFeatures
    });
  } catch (enhancedError) {
    console.log('Enhanced chat failed, using standard chat');
  }

  // Fallback to standard
  document.chatHistory.push({
    role: 'user',
    content: message
  });

  const model = getModel();
  const contextPrompt = `You are a helpful assistant analyzing a document. Here is the document content:

${document.extractedText}

Please answer the user's question based on the document content above. If the question cannot be answered from the document, politely say so.`;

  const result = await model.generateContent(contextPrompt + '\n\nUser question: ' + message);
  const response = await result.response;
  const assistantMessage = response.text();

  document.chatHistory.push({
    role: 'assistant',
    content: assistantMessage
  });

  await document.save();

  return res.json({
    success: true,
    response: assistantMessage,
    chatHistory: document.chatHistory
  });
});

// Get parsed text status
router.get('/parse-status/:documentId', async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
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
      isParsed: document.isParsed,
      extractedText: document.extractedText,
      parsedAt: document.parsedAt
    });
  } catch (error) {
    console.error('Parse status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parse status'
    });
  }
});

// Download extracted text
router.get('/download-text/:documentId', async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.documentId,
      userId: req.session.userId
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    if (!document.extractedText) {
      return res.status(400).json({
        success: false,
        message: 'No extracted text available'
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}_extracted.txt"`);
    res.send(document.extractedText);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download text'
    });
  }
});

module.exports = router;

