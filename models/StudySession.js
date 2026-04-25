const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  subject: String,
  topic: String,
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  duration: Number, // in minutes
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StudySession', studySessionSchema);

