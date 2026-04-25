const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  rewardPoints: {
    type: Number,
    default: 0
  },
  purchasedDocuments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  profile: {
    firstName: String,
    lastName: String,
    bio: String,
    avatar: String
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    defaultInstitution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution'
    }
  },
  // Institutional data
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution'
  },
  studentId: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'professor', 'teacher'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

