const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const User = require('../models/User');
const Document = require('../models/Document');
const Transaction = require('../models/Transaction');

// ── Marketplace feed ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, filter } = req.query;
    const query = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { originalName: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    if (filter === 'premium') query.isPremium = true;
    else if (filter === 'free') query.isPremium = false;

    const [documents, user] = await Promise.all([
      Document.find(query)
        .select('-extractedText -chatHistory')
        .populate('userId', 'username')
        .sort({ uploadDate: -1 })
        .lean(),
      User.findById(req.session.userId).select('purchasedDocuments').lean()
    ]);

    res.render('marketplace/feed', {
      user: req.session.user,
      documents,
      purchasedDocs: (user?.purchasedDocuments || []).map((id) => id.toString()),
      searchQuery: search || ''
    });
  } catch (error) {
    console.error('[MARKETPLACE] Feed error:', error);
    res.status(500).render('error', { error: 'Failed to load marketplace', user: req.session.user });
  }
});

// ── Unlock / purchase document ─────────────────────────────────────────────────
router.post('/unlock/:id', requireAuth, async (req, res) => {
  try {
    const docId = req.params.id;
    const buyerId = req.session.userId;

    const [document, buyer] = await Promise.all([
      Document.findById(docId).select('userId price isPremium'),
      User.findById(buyerId).select('purchasedDocuments')
    ]);

    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    // Already owned
    const alreadyOwned =
      document.userId.toString() === buyerId ||
      buyer.purchasedDocuments.some((id) => id.toString() === docId);

    if (alreadyOwned) {
      return res.json({ success: true, message: 'Already unlocked' });
    }

    const price = document.price || 50;
    const uploaderShare = Math.round(price * 0.7 * 100) / 100; // 70%, rounded to 2dp

    // All writes run in parallel
    await Promise.all([
      User.findByIdAndUpdate(buyerId, { $addToSet: { purchasedDocuments: docId } }),
      Transaction.create({
        buyerId,
        paperId: docId,
        uploaderId: document.userId,
        amount: { total: price },
        status: 'completed',
        type: 'marketplace_unlock'
      }),
      document.userId
        ? User.findByIdAndUpdate(document.userId, { $inc: { walletBalance: uploaderShare } })
        : Promise.resolve()
    ]);

    res.json({ success: true, message: 'Document unlocked successfully!' });
  } catch (error) {
    console.error('[MARKETPLACE] Unlock error:', error);
    res.status(500).json({ success: false, message: 'Purchase failed' });
  }
});

module.exports = router;
