const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');

// Marketplace Feed
router.get('/', requireAuth, async (req, res) => {
    try {
        const { search, filter } = req.query;
        let query = {}; // Show all by default

        if (search) {
            query.$or = [
                { originalName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        if (filter === 'premium') query.isPremium = true;
        if (filter === 'free') query.isPremium = false;

        const documents = await Document.find(query)
            .populate('userId', 'username')
            .sort({ uploadDate: -1 });

        // Get current user to check unlocked docs
        const user = await User.findById(req.session.userId);

        res.render('marketplace/feed', {
            user: req.session.user,
            documents,
            purchasedDocs: user.purchasedDocuments.map(id => id.toString()),
            searchQuery: search || ''
        });
    } catch (error) {
        console.error('Marketplace Error:', error);
        res.status(500).render('error', { error: 'Failed to load marketplace', user: req.session.user });
    }
});

// Unlock/Purchase Document (Demo Logic)
router.post('/unlock/:id', requireAuth, async (req, res) => {
    try {
        const docId = req.params.id;
        const buyerId = req.session.userId;
        const document = await Document.findById(docId);

        if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

        // Check if already owned/purchased
        const buyer = await User.findById(buyerId);
        if (document.userId.toString() === buyerId || buyer.purchasedDocuments.includes(docId)) {
            return res.json({ success: true, message: 'Already unlocked' });
        }

        // Demo Payment Logic (Always Success for now)
        const price = document.price || 50; // Default demo price if not set

        // Add to unlocked list
        await User.findByIdAndUpdate(buyerId, {
            $addToSet: { purchasedDocuments: docId }
        });

        // Record Transaction
        await Transaction.create({
            buyerId,
            paperId: docId,
            uploaderId: document.userId,
            amount: { total: price },
            status: 'completed',
            type: 'marketplace_unlock' // Distinguish from old flow if needed
        });

        // Reward Uploader (Optional demo logic)
        if (document.userId) {
            await User.findByIdAndUpdate(document.userId, {
                $inc: { walletBalance: price * 0.7 } // 70% share
            });
        }

        res.json({ success: true, message: 'Document unlocked successfully!' });

    } catch (error) {
        console.error('Unlock Error:', error);
        res.status(500).json({ success: false, message: 'Purchase failed' });
    }
});

module.exports = router;
