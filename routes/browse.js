const express = require('express');
const router = express.Router();
const Institution = require('../models/Institution');
const Course = require('../models/Course');
const Document = require('../models/Document');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { requireAuth } = require('../middleware/auth');

// Step 1: Public Landing Page (Institutes)
router.get('/', async (req, res) => {
    try {
        const institutions = await Institution.find({ isVerified: true });
        res.render('browse/landing', {
            user: req.session.user || null,
            institutions
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Failed to load institutes', user: req.session.user || null });
    }
});

// Step 2: Course Selection
router.get('/institute/:id/courses', async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);
        const courses = await Course.find({ institutionId: req.params.id });
        res.render('browse/courses', {
            user: req.session.user || null,
            institution,
            courses
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Failed to load courses', user: req.session.user || null });
    }
});

// Step 3: Year Selection
router.get('/institute/:instId/course/:courseId/years', async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.instId);
        const course = await Course.findById(req.params.courseId);

        // Static years 1-4
        const years = [
            { value: 1, label: '1st Year' },
            { value: 2, label: '2nd Year' },
            { value: 3, label: '3rd Year' },
            { value: 4, label: '4th Year' }
        ];

        res.render('browse/years', {
            user: req.session.user || null,
            institution,
            course,
            years
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Failed to load years', user: req.session.user || null });
    }
});

// Step 4: Exam Type Selection
router.get('/institute/:instId/course/:courseId/year/:year/exams', async (req, res) => {
    try {
        const { instId, courseId, year } = req.params;
        const institution = await Institution.findById(instId);
        const course = await Course.findById(courseId);

        res.render('browse/exams', {
            user: req.session.user || null,
            institution,
            course,
            year
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Failed to load exam types', user: req.session.user || null });
    }
});

// Step 5 & 6: Paper Grid (AUTH REQUIRED)
router.get('/papers', requireAuth, async (req, res) => {
    try {
        const { instId, courseId, year, examType } = req.query;

        const institution = await Institution.findById(instId);
        const course = await Course.findById(courseId);

        const query = {
            institutionId: instId,
            courseId: courseId,
            year: year,
            examType: examType
        };

        const papers = await Document.find(query).populate('userId', 'username');

        res.render('browse/papers', {
            user: req.session.user,
            institution,
            course,
            year,
            examType,
            papers
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Failed to load papers', user: req.session.user });
    }
});

// Step 7: Payment Simulation
router.get('/payment/:paperId', requireAuth, async (req, res) => {
    try {
        const paper = await Document.findById(req.params.paperId)
            .populate('institutionId')
            .populate('courseId');

        if (!paper) throw new Error('Paper not found');

        // Pricing Logic
        const basePrice = 25.00;
        const gst = 4.50; // 18%
        const platformFee = 9.00;
        const finalAmount = 38.50;

        res.render('browse/payment', {
            user: req.session.user,
            paper,
            pricing: { basePrice, gst, platformFee, finalAmount }
        });
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { error: 'Payment init failed', user: req.session.user });
    }
});

// Step 8: Process Payment & Reward
router.post('/payment/:paperId/confirm', requireAuth, async (req, res) => {
    try {
        const paper = await Document.findById(req.params.paperId);
        if (!paper) return res.status(404).json({ success: false, message: 'Paper not found' });

        const buyer = await User.findById(req.session.userId);

        // Simulation Details
        const basePrice = 25.00;
        const reward = 7.50; // 30% of 25

        // Log to console (Requirement)
        console.log('--- PAYMENT SIMULATION ---');
        console.log(`Buyer: ${buyer.username} (${buyer._id})`);
        console.log(`Paper: ${paper.originalName} (${paper._id})`);
        console.log(`Uploader: ${paper.userId ? paper.userId : 'System'}`);
        console.log(`Base Price: ${basePrice}`);
        console.log(`Reward: ${reward}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        // Store Reward
        if (paper.userId) {
            await User.findByIdAndUpdate(paper.userId, {
                $inc: { walletBalance: reward, rewardPoints: 10 }
            });
        }

        // Record Transaction
        await Transaction.create({
            buyerId: buyer._id,
            paperId: paper._id,
            uploaderId: paper.userId,
            amount: {
                basePrice,
                gst: 4.5,
                platformFee: 9,
                total: 38.5
            },
            uploaderReward: reward,
            status: 'completed'
        });

        // Step 9: Redirect to existing access page (which is documents view)
        // Returning JSON to let frontend redirect
        res.json({ success: true, redirectUrl: `/documents/${paper._id}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Payment failed' });
    }
});

module.exports = router;
