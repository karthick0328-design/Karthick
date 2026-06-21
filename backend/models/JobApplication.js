const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', required: true },
    candidateName: { type: String, required: true },
    candidateEmail: { type: String, required: true },
    resumeUrl: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Pending', 'Accept', 'Waiting List', 'Reject'], 
        default: 'Pending' 
    },
    appliedAt: { type: Date, default: Date.now },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
