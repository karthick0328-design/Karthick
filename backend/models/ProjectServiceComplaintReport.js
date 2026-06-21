const mongoose = require('mongoose');

const projectServiceComplaintReportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true },
  projectSummary: {
    projectId: String,
    projectName: String,
    department: String,
    deadline: Date
  },
  complaintSummary: {
    total: { type: Number, default: 0 },
    open: { type: Number, default: 0 },
    inProgress: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    riskSummary: { type: String, default: 'STABLE' }
  },
  complaints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProjectServiceComplaint' }],
  aiGeneratedComplaints: [{ type: mongoose.Schema.Types.Mixed }],
  highRiskUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    role: String,
    complaintCount: Number,
    reason: String
  }],
  escalations: [{
    complaintId: String,
    from: String,
    to: String,
    severity: String,
    reason: String,
    level: String,
    escalationLevel: String
  }],
  resolutions: [{
    complaintId: String,
    immediate: String,
    preventive: String,
    rootCause: String
  }],
  adminInsights: {
    criticalComplaints: [String],
    frequentOffenders: [String],
    leadershipIssues: [String],
    projectRiskSummary: String
  },
  adminActions: {
    immediate: [String],
    preventive: [String],
    strategic: [String]
  }
}, { timestamps: true });

// Auto-generate report ID (Use Counter model for atomicity)
projectServiceComplaintReportSchema.pre('save', async function (next) {
  if (!this.reportId) {
    try {
      const Counter = mongoose.models.Counter || require('./Counter');
      const counter = await Counter.findOneAndUpdate(
        { _id: 'reportId' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      this.reportId = `REP-${counter.sequence.toString().padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('ProjectServiceComplaintReport', projectServiceComplaintReportSchema);
