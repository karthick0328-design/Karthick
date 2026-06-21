const mongoose = require('mongoose');

const SmtpProfileSchema = new mongoose.Schema({
    displayName: { type: String, required: true },
    fromEmail: { type: String, required: true },
    smtpHost: { type: String, required: true },
    port: { type: Number, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SmtpProfile', SmtpProfileSchema);
