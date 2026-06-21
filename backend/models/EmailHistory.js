const mongoose = require('mongoose');

const EmailHistorySchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientCount: {
        type: Number,
        default: 0
    },
    sentCount: {
        type: Number,
        default: 0
    },
    failedCount: {
        type: Number,
        default: 0
    },
    skippedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['completed', 'partial', 'failed', 'running'],
        default: 'running'
    },
    errorLogs: {
        type: [String],
        default: []
    },
    templateUsed: {
        type: String // Optional: can store HTML body or identifier
    }
}, { timestamps: true });

module.exports = mongoose.model('EmailHistory', EmailHistorySchema);
