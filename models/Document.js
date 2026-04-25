const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['pdf', 'image', 'docx']
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['Notes', 'Reports', 'Certificates', 'Other'],
    default: 'Other'
  },
  // Institutional features
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer', 'Winter', 'All']
  },
  year: Number,
  examType: {
    type: String,
    enum: ['Assessment', 'EndSemester', 'Other'], // 'Other' for backward compatibility
    default: 'Other'
  },
  examDate: Date,
  subject: String,
  topics: [String],
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Study features
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewed: Date,
  studyTime: {
    type: Number,
    default: 0 // in minutes
  },
  extractedText: {
    type: String,
    default: ''
  },
  isParsed: {
    type: Boolean,
    default: false
  },
  parsedAt: Date,
  chatHistory: [chatMessageSchema],
  uploadDate: {
    type: Date,
    default: Date.now
  },
  // Marketplace Features
  price: {
    type: Number,
    default: 0
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    maxLength: 500
  },
  tags: [String],
  previewImage: String
});

module.exports = mongoose.model('Document', documentSchema);

