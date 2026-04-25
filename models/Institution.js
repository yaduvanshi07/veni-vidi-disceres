const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['University', 'College', 'School', 'Other'],
    default: 'University'
  },
  description: String,
  logo: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Institution', institutionSchema);

