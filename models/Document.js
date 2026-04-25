const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 50000
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false } // Embedded subdoc — no need for its own _id
);

const documentSchema = new mongoose.Schema(
  {
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
      required: true,
      trim: true,
      maxlength: 255
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
      required: true,
      min: 0
    },
    category: {
      type: String,
      enum: ['Notes', 'Reports', 'Certificates', 'Other'],
      default: 'Other'
    },

    // ── Institutional ──────────────────────────────────────────────────────────
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
      enum: ['Assessment', 'EndSemester', 'Other'],
      default: 'Other'
    },
    examDate: Date,
    subject: { type: String, trim: true, maxlength: 200 },
    topics: [{ type: String, trim: true, maxlength: 100 }],
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // ── Study ──────────────────────────────────────────────────────────────────
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastViewed: Date,
    studyTime: {
      type: Number,
      default: 0,
      min: 0
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
    chatHistory: {
      type: [chatMessageSchema],
      default: [],
      validate: {
        validator: (v) => v.length <= 500,
        message: 'Chat history cannot exceed 500 messages'
      }
    },

    // ── Marketplace ────────────────────────────────────────────────────────────
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative']
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    previewImage: String
  },
  {
    timestamps: { createdAt: 'uploadDate', updatedAt: 'updatedAt' }
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
documentSchema.index({ userId: 1, uploadDate: -1 });
documentSchema.index({ institutionId: 1, courseId: 1, year: 1, examType: 1 });
documentSchema.index({ isParsed: 1 });
documentSchema.index({ isPremium: 1 });
documentSchema.index(
  { originalName: 'text', extractedText: 'text', description: 'text', tags: 'text' },
  { weights: { originalName: 10, description: 5, tags: 3, extractedText: 1 }, name: 'document_text_search' }
);

module.exports = mongoose.model('Document', documentSchema);
