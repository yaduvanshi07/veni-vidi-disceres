const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    buyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true
    },
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    amount: {
        basePrice: Number,
        gst: Number,
        platformFee: Number,
        total: Number
    },
    uploaderReward: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed' // Simulated
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
