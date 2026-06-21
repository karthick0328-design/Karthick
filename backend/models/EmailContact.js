const mongoose = require('mongoose');

const EmailContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    category: {
        type: String,
        default: 'General' // Subscribers, Registration, Inquiry, etc.
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED'],
        default: 'ACTIVE'
    },
    token: {
        type: String,
        default: () => require('crypto').randomBytes(16).toString('hex')
    }
}, { timestamps: true });

module.exports = mongoose.model('EmailContact', EmailContactSchema);
