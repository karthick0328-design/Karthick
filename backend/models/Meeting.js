const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Meeting title is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    service: {
        type: String,
        // enum: ['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'Biochemistry', 'Molecular Biology']
    },
    department: {
        type: String,
        // enum: ['Financial', 'sales and customer services', 'Human Resource']
    },
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: Date
    },
    meetingLink: {
        type: String,
        required: true,
        unique: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    meetingCode: {
        type: String,
        required: true,
        unique: true
    },
    isRecording: {
        type: Boolean,
        default: false
    },
    recordings: [{
        url: String,
        startedAt: Date,
        endedAt: Date,
        egressId: String
    }],
    attendance: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['present', 'absent', 'pending'], default: 'pending' },
        markedAt: { type: Date },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
}, {
    timestamps: true
});

// Index for performance
meetingSchema.index({ service: 1, startTime: 1 });
meetingSchema.index({ managerId: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
