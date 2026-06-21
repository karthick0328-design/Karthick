const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    receiptDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    basicAmount: {
        type: Number,
        required: true,
        min: 0
    },
    taxAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paidTo: {
        type: String,
        required: true,
        trim: true
    },
    paymentMode: {
        type: String,
        required: true,
        enum: ['Cash', 'Bank Transfer', 'UPI', 'Check', 'Credit Card', 'Other'],
        default: 'Cash'
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    receiptUrl: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
