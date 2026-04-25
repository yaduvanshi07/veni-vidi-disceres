const mongoose = require('mongoose');

const flashcardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  front: {
    type: String,
    required: true
  },
  back: {
    type: String,
    required: true
  },
  topic: String,
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  mastery: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastReviewed: Date,
  reviewCount: {
    type: Number,
    default: 0
  },
  nextReview: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Flashcard', flashcardSchema);

