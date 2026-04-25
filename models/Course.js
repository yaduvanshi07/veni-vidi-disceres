const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  semester: {
    type: String,
    enum: ['Fall', 'Spring', 'Summer', 'Winter', 'All']
  },
  year: Number,
  description: String,
  syllabus: String,
  professorName: String,
  professorEmail: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', courseSchema);

