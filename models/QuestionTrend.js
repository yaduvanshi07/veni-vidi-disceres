const mongoose = require('mongoose');

const questionTrendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  topic: String,
  subject: String,
  frequency: {
    type: Number,
    default: 1
  },
  lastAsked: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuestionTrend', questionTrendSchema);

