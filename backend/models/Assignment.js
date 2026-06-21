// models/Assignment.js
const mongoose = require('mongoose');

// Sub-schema for assignment history (optional, for tracking changes)
const assignmentHistorySchema = new mongoose.Schema({
  action: { type: String, required: true, enum: ['assigned', 'reassigned', 'updated', 'deactivated'] },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String },
});

// Main Assignment Schema
const assignmentSchema = new mongoose.Schema(
  {
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Manager (Head/Position holder) is required'],
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
      validate: {
        validator: async function (value) {
          const User = mongoose.model('User');
          const emp = await User.findById(value);
          return emp && ['employee', 'tl'].includes(emp.role);
        },
        message: 'Assigned user must have role "employee" or "tl"',
      },
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      minlength: [2, 'Branch must be at least 2 characters long'],
    },
    // Example updated position schema field
    position: {
      type: String,
      required: true,
      match: [
        /^(.+?)(?:\s+\['[^']+'\])?$/,
        'Position must be in the format "Main Position" or "Main Position [\'Sub Position\']" (e.g., "Sale" or "Sale [\'Coordinators\']").'
      ]
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    history: [assignmentHistorySchema],
  },
  { timestamps: true }
);

// Indexes for performance
assignmentSchema.index({ manager: 1, branch: 1 });
assignmentSchema.index({ employee: 1, branch: 1 });
assignmentSchema.index({ position: 1, branch: 1 });
assignmentSchema.index({ isActive: 1 });

// Pre-save middleware to add to history
assignmentSchema.pre('save', function (next) {
  if (this.isNew) {
    this.history.push({
      action: 'assigned',
      assignedBy: this.manager,
      notes: `Initial assignment to ${this.branch} branch under ${this.position} position.`,
    });
  } else if (this.isModified('branch') || this.isModified('position')) {
    this.history.push({
      action: 'reassigned',
      assignedBy: this.manager,
      notes: `Reassigned to ${this.branch} branch under ${this.position} position.`,
    });
  } else if (this.isModified('isActive') && !this.isActive) {
    this.history.push({
      action: 'deactivated',
      assignedBy: this.manager,
      notes: 'Assignment deactivated.',
    });
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);