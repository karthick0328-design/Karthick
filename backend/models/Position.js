const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Position name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Position name must be at least 2 characters'],
    maxlength: [50, 'Position name cannot exceed 50 characters'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator admin is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Position', positionSchema);