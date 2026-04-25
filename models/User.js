const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'professor', 'teacher'],
      default: 'user'
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative']
    },
    rewardPoints: {
      type: Number,
      default: 0,
      min: [0, 'Reward points cannot be negative']
    },
    purchasedDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      }
    ],
    profile: {
      firstName: { type: String, trim: true, maxlength: 50 },
      lastName: { type: String, trim: true, maxlength: 50 },
      bio: { type: String, trim: true, maxlength: 500 },
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
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution'
    },
    studentId: { type: String, trim: true },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: Date
  },
  {
    timestamps: true // Adds createdAt & updatedAt automatically
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });

// ── Hash password before saving ───────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12); // 12 rounds for production
    next();
  } catch (err) {
    next(err);
  }
});

// ── Compare password ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Safe public profile (no password exposure) ────────────────────────────────
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    walletBalance: this.walletBalance,
    rewardPoints: this.rewardPoints,
    profile: this.profile,
    preferences: this.preferences,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
