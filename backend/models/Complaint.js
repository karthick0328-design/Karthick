const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Complaint title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee ID is required'],
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
  },
  department: {
    type: String,
    default: '',
  },
  service: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['Performance Issue', 'Attendance Issue', 'Behavior Issue', 'Other'],
    required: [true, 'Complaint category is required'],
  },
  evidence: {
    type: String, // URL/Path to the evidence file
    default: null,
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reported by is required'],
  },
  reportedByDepartment: {
    type: String,
    default: '',
  },
  reportedByService: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Reported', 'Under Review', 'Investigation', 'Action Taken', 'Closed'],
    default: 'Reported',
  },
  adminAction: {
    type: String,
    enum: [
      'Issue a warning',
      'Schedule a performance review',
      'Request improvement plan',
      'Assign training',
      'Escalate the issue',
      'Close the complaint',
      null
    ],
    default: null,
  },
  adminNotes: {
    type: String,
    default: '',
  }
}, { timestamps: true });

// Optional: Add index for performance in filtering
complaintSchema.index({ department: 1, service: 1, status: 1 });
complaintSchema.index({ employeeId: 1 });
complaintSchema.index({ reportedBy: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
