// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }, // null for system notifications
    type: {
        type: String,
        enum: [
            'assignment',
            'no_employee_alert',
            'financial_approval_request',
            'financial_approval_response',
            'hr_escalation',
            'payment_milestone',
            'project_update',
            'manager_push',
            'holiday_alert',
            'meeting_invite',
            'complaint_filed',
            'complaint_action'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }, // Additional context (e.g., amount, service, etc.)
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: {
        type: Date
    },
    actionUrl: {
        type: String // Frontend route to navigate to
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Method to mark as read
notificationSchema.methods.markAsRead = async function () {
    this.read = true;
    this.readAt = new Date();
    await this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
    const notification = new this(data);
    await notification.save();
    return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
    return await this.countDocuments({ recipientId: userId, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
