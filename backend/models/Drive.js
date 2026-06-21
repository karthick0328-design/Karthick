const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number, // In bytes
        required: true
    },
    path: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['General', 'Project', 'Personal', 'Project Attachment', 'Project Result'],
        default: 'General'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    }
}, { timestamps: true });

// Pre-save check could be added here, but better in controller for 2GB limit
module.exports = mongoose.model('Drive', driveSchema);
