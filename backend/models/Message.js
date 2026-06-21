const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    content: { type: String, trim: true },
    contentType: { type: String, enum: ['text', 'markdown', 'system', 'event'], default: 'text' },

    attachments: [{
        filename: String,
        url: String, // Blob storage URL
        mimeType: String,
        size: Number,
        virusScanned: { type: Boolean, default: false }
    }],

    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Threading
    threadRootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // Readers
    readBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],

    // Interactive Actions (for approvals/assignments embedded in chat)
    actionRequired: { type: Boolean, default: false },
    actionType: { type: String, enum: ['approve_funds', 'assign_employee', 'none'] },
    actionData: { type: mongoose.Schema.Types.Mixed }, // e.g., { projectId: '...', amount: 5000 }
    actionStatus: { type: String, enum: ['pending', 'completed', 'rejected', 'cancelled'], default: 'pending' },
    actionPerformedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    isSystemMessage: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null } // Soft delete
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
