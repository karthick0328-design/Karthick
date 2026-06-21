// models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  vacancy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Vacancy', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'rejected', 'hired'], 
    default: 'pending' 
  },
  coverLetter: { 
    type: String 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Application', applicationSchema);