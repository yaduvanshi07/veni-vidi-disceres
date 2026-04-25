const mongoose = require('mongoose');

const summarySchema = new mongoose.Schema({
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
  keyConcepts: [String],
  summary: {
    type: String,
    required: true
  },
  importantPoints: [String],
  formulas: [{
    name: String,
    formula: String,
    latex: String
  }],
  diagrams: [{
    description: String,
    explanation: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Summary', summarySchema);

