const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  studyTime: {
    type: Number,
    default: 0 // in minutes
  },
  documentsViewed: {
    type: Number,
    default: 0
  },
  questionsAsked: {
    type: Number,
    default: 0
  },
  subjects: [{
    subject: String,
    timeSpent: Number
  }],
  topics: [{
    topic: String,
    timeSpent: Number,
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    }
  }],
  weakTopics: [String],
  strongTopics: [String],
  performanceScore: {
    type: Number,
    min: 0,
    max: 100
  }
});

module.exports = mongoose.model('Analytics', analyticsSchema);

