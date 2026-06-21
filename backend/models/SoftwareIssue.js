const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    attachments: [{ type: String }]
});

const activityLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now }
});

const softwareIssueSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    projectTitle: { type: String },
    projectId: { type: String },
    projectService: { type: String },
    issueType: { 
        type: String, 
        enum: ['Bug', 'UI Issue', 'Performance Issue', 'Security Issue', 'Feature Request'],
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Testing', 'Resolved', 'Closed'],
        default: 'Open'
    },
    department: { type: String },
    service: { type: String },
    seniority: { type: String },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [{ type: String }],
    comments: [commentSchema],
    activityLogs: [activityLogSchema]
}, { timestamps: true });

const SoftwareIssue = mongoose.model('SoftwareIssue', softwareIssueSchema);

module.exports = SoftwareIssue;
