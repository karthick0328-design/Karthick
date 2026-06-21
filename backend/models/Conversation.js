const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['direct', 'group', 'service', 'project', 'department', 'system'],
        required: true
    },
    name: { type: String, trim: true }, // For groups
    description: { type: String },
    status: { type: String, default: 'active' }, // NEW: Track status (e.g. 'Escalated to HR', 'Resolved')

    // Dynamic Reference to context
    relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' },
    relatedModel: { type: String, enum: ['Project', 'Service', 'Department'] },
    // Note: Service/Dept might be strings in User model, but we might want to link to Project ID or just store the string name in 'name' or separate field for Service/Dept?
    // Since User.js stores dept/service as strings, we might strictly use `relatedId` for Project and `contextName` for Service/Dept. 
    // Let's refine: if relatedModel is Project, relatedId is ObjectId. If Service/Dept, we might just use `name` or add a `contextString` field. 
    // However, existing usage implies strings. Let's keep it flexible.

    contextStringType: { type: String }, // 'Service', 'Department'
    contextStringValue: { type: String }, // 'Drug Discovery', 'Financial'

    members: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member', 'observer'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        muted: { type: Boolean, default: false }
    }],

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: { type: Date, default: Date.now },

    settings: {
        isArchived: { type: Boolean, default: false },
        allowMemberInvite: { type: Boolean, default: false },
        retentionDays: { type: Number, default: 90 }
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes 
conversationSchema.index({ 'members.userId': 1, lastMessageAt: -1 });
conversationSchema.index({ type: 1, contextStringValue: 1 }); // Fast lookup for "Drug Discovery Service Group"
conversationSchema.index({ relatedId: 1 }); // Fast lookup for "Project Group"

module.exports = mongoose.model('Conversation', conversationSchema);
