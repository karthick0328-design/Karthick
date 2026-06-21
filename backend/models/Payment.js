// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentType: {
        type: String,
        enum: ['initial', 'milestone', 'final', 'partial'],
        required: true
    },
    method: {
        type: String,
        enum: ['Cash', 'Check', 'UPI', 'Bank Transfer'],
        required: true
    },
    transactionId: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    paidAt: {
        type: Date
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    notes: {
        type: String
    },
    // Additional fields for check payments
    checkNumber: {
        type: String
    },
    bankName: {
        type: String
    },
    checkDate: {
        type: Date
    },
    // Additional fields for UPI
    upiId: {
        type: String
    },
    upiTransactionId: {
        type: String
    },
    // Receipt reference
    receiptId: {
        type: String
    },
    receiptUrl: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for queries
paymentSchema.index({ projectId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

// Method to mark payment as completed
paymentSchema.methods.markCompleted = async function (verifiedBy) {
    this.status = 'completed';
    this.paidAt = new Date();
    this.verifiedBy = verifiedBy;
    this.verifiedAt = new Date();
    await this.save();
};

// Static method to get total paid for project
paymentSchema.statics.getTotalPaid = async function (projectId) {
    const result = await this.aggregate([
        { $match: { projectId: mongoose.Types.ObjectId(projectId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
};

// Static method to check if 50% paid
paymentSchema.statics.hasReachedThreshold = async function (projectId, totalAmount, threshold = 0.5) {
    const totalPaid = await this.getTotalPaid(projectId);
    return totalPaid >= (totalAmount * threshold);
};

module.exports = mongoose.model('Payment', paymentSchema);
