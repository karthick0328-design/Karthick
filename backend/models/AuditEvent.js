const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who performed the action
    action: { type: String, required: true }, // e.g., 'CREATE_GROUP', 'APPROVE_FUNDS', 'ADD_MEMBER', 'ESCALATE_HR'

    targetType: { type: String, enum: ['Conversation', 'Message', 'Project', 'User'] },
    targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the target entity

    metadata: { type: mongoose.Schema.Types.Mixed }, // Structured details (e.g. old_value, new_value)

    ipAddress: String,
    userAgent: String
}, { timestamps: { createdAt: true, updatedAt: false } }); // Immutable: no updatedAt

module.exports = mongoose.model('AuditEvent', auditEventSchema);
