const mongoose = require('mongoose');

const cashBookEntrySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    type: {
        type: String,
        required: true,
        enum: ['Cash In', 'Cash Out']
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    source: {
        type: String,
        required: true,
        default: 'Manual Entry'
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Cancelled'],
        default: 'Completed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CashBookEntry', cashBookEntrySchema);
