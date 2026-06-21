// models/ResetPassword.js
const mongoose = require('mongoose');

const resetPasswordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  resetPasswordCode: {
    type: String,
    required: true,
  },
  resetPasswordExpires: {
    type: Date,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationExpires: {
    type: Date,
  },
});

module.exports = mongoose.model('ResetPassword', resetPasswordSchema);
