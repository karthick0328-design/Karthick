const mongoose = require('mongoose');

const projectServiceComplaintSchema = new mongoose.Schema({
  complaintId: { type: String, unique: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectName: { type: String, required: true },
  raisedBy: { 
    type: String, 
    required: true 
    // Can be User ID or "AI"
  },
  raisedByName: { type: String },
  against: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  againstName: { type: String, required: true },
  role: { 
    type: String, 
    required: true 
  },
  description: { type: String, required: true },
  category: [{ 
    type: String, 
    required: true 
  }],
  severity: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Low' 
  },
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Investigating', 'Resolved'], 
    default: 'Open' 
  },
  visibleTo: [{ type: String }], // Roles that can see this: Employee, TL, Manager, Head, Admin
  actionBy: { type: String }, // Role or User ID responsible for taking action
  isAiGenerated: { type: Boolean, default: false },
  
  // ── ADVANCED COMPLAINT FIELDS ──────────────────────────────────────────────
  incidentDate: { type: Date },                        // When the incident occurred
  isUrgent: { type: Boolean, default: false },         // Marks complaint as urgent
  isAnonymous: { type: Boolean, default: false },      // Hide reporter identity
  witnesses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Witness user IDs
  evidenceNotes: { type: String },                     // Supporting evidence text
  evidenceFiles: [{                                    // Uploaded evidence files
    filename: { type: String },          // stored filename on disk
    originalName: { type: String },      // original uploaded filename
    mimetype: { type: String },
    size: { type: Number },              // bytes
    url: { type: String },               // accessible URL path
    uploadedAt: { type: Date, default: Date.now }
  }],
  tags: [{ type: String }],                            // Searchable tags
  priorityScore: { type: Number, default: 0 },         // Computed: severity + urgency
  resolutionNotes: { type: String },                   // Admin resolution notes
  resolvedAt: { type: Date },                          // When resolved
  resolvedBy: { type: String }                         // Who resolved it
}, { timestamps: true });

// Auto-generate complaint ID (Use Counter model for atomicity)
projectServiceComplaintSchema.pre('save', async function (next) {
  if (!this.complaintId) {
    try {
      const Counter = mongoose.models.Counter || require('./Counter');
      const counter = await Counter.findOneAndUpdate(
        { _id: 'complaintId' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      this.complaintId = `CMP-${counter.sequence.toString().padStart(5, '0')}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('ProjectServiceComplaint', projectServiceComplaintSchema);
