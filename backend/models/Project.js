// models/Project.js (UPDATED: Added paidAmount to paymentDetails schema)
const mongoose = require('mongoose');

// Sub-schema for project activities (UPDATED: Added attachments)
const activitySchema = new mongoose.Schema({
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  statusChange: { type: String },
  remarks: { type: String },
  visibility: {
    type: String,
    enum: ['Internal', 'TL_Reviewed', 'SM_Reviewed', 'External'],
    default: 'Internal'
  },
  attachments: [{
    path: { type: String },
    filename: { type: String },
    mimetype: { type: String }
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
});

// NEW: Sub-schema for receipt
const receiptSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed, required: true },  // JSON receipt details
  generatedAt: { type: Date, default: Date.now },
});

// UPDATED: Sub-schema for payment details (added paidAmount)
const paymentDetailsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  projectDescription: { type: String, required: true },
  detailedQuotation: { type: String, required: true },
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, min: 0, default: 0 }, // NEW: Track actual paid amount
  paymentMethod: { type: String, enum: ['Cash', 'Check', 'UPI'] },
  userSubmittedAt: { type: Date },
  salesApprovedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // NEW: Additional fields for Check and UPI
  checkNumber: { type: String },
  bankName: { type: String },
  checkDate: { type: Date },
  upiId: { type: String },
});

// Sub-schema for project messages (chat between owner and assigned manager) (unchanged)
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true, maxlength: [1000, 'Message too long (max 1000 chars)'] },
  timestamp: { type: Date, default: Date.now },
});

// Main Project Schema (UPDATED: Added paymentDetails)
const projectSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    unique: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Under Review', 'In Progress', 'Completed', 'On Hold'],
    default: 'Draft'
  },
  formData: { type: mongoose.Schema.Types.Mixed },
  remarks: { type: String },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Department Managers
  teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Lead assigned by Manager
  teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Employees assigned by TL
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  reviewerRemarks: { type: String },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Payment fields (UPDATED)
  quotedAmount: { type: Number, min: 0 },
  baseAmount: { type: Number, min: 0 }, // Store the original base amount
  // Advanced features fields
  gst: { type: Number, min: 0 }, // GST percentage or amount
  discount: { type: Number, min: 0, default: 0 }, // NEW: Discount amount to be subtracted after GST
  taxHandling: { type: String }, // Tax handling description
  projectProgress: { type: String }, // Project milestones/progress tracking
  memberCost: { type: Number, min: 0 }, // Cost per team member
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Quote Sent', 'Payment Form Created', 'Payment Submitted', 'Awaiting Approval', 'Awaiting Balance Approval', '50% Paid', 'Official Receipt Issued', 'Receipt Issued', 'Full Paid'],
    default: 'Pending'
  },
  paidAt: { type: Date },
  paymentDetails: paymentDetailsSchema,
  receipt: receiptSchema,
  attachments: [{
    path: { type: String },
    filename: { type: String },
    mimetype: { type: String }
  }],

  // NEW: Workflow & Approval Fields (Universal 4-Step Workflow)
  workflowStep: {
    type: Number,
    default: 0,
    // 0: Pre-Assignment (Sales/Draft)
    // 1: Service Manager Review
    // 2: Cross-department Approval (Finance & HR)
    // 3: Team Lead Assignment
    // 4: Team Formation (Work In Progress)
  },
  approvals: {
    serviceManager: {
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      remarks: String
    },
    financial: {
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      remarks: String
    },
    hr: { // For project feasibility/personnel checks
      status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      remarks: String
    }
  },

  // NEW: Employee Reporting (Direct to Manager if no TL, or Escalation)
  reports: [{
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['Progress', 'Manpower', 'Issue', 'Other'], default: 'Progress' },
    status: { type: String, enum: ['Pending', 'Reviewed', 'Escalated to HR', 'Accepted by HR', 'Resolved'], default: 'Pending' },
    managerRemarks: { type: String },
    escalatedAt: { type: Date },
    hrResponse: { type: String }, // If escalated for hiring
    createdAt: { type: Date, default: Date.now }
  }],

  // NEW: Financial Review (Service Manager requests, Financial Manager approves/adjusts amount)
  financialReview: {
    requested: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestReason: { type: String },

    // Detailed sections
    software: { type: String },
    consumable: { type: String },
    kits: { type: String },
    others: { type: String },
    quality: { type: String },

    // Vendor details
    vendors: [{
      details: { type: String },
      amount: { type: Number },
      attachment: {
        path: { type: String },
        filename: { type: String },
        mimetype: { type: String }
      }
    }],

    // File uploads
    attachments: [{
      path: { type: String },
      filename: { type: String },
      mimetype: { type: String }
    }],

    requestedAmount: { type: Number, min: 0 },
    selectedProducts: [{ type: String }], // Keeping for compatibility if needed
    requestedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAmount: { type: Number, min: 0 },
    remarks: { type: String },
    reviewedAt: { type: Date }
  },

  // NEW: Purchase Details (Financial Manager -> Financial Employee Flow)
  purchaseDetails: {
    productName: { type: String },
    amountSent: { type: Number, min: 0 },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Order Placing', 'Going to send', 'Delivered'],
      default: 'Order Placing'
    },
    description: { type: String },
    quantity: { type: Number },
    billForm: {
      generated: { type: Boolean, default: false },
      saved: { type: Boolean, default: false },
      billNumber: { type: String },
      totalAmount: { type: Number },
      remainingAmount: { type: Number },
      receivedQuantity: { type: Number },
      quality: { type: String },
      billImage: { type: String },
      verified: { type: Boolean, default: false },
      generatedAt: { type: Date },
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    deliveredAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
  },

  // NEW: Professional Fee (Order Amount) - Added by Sales after Service completion
  professionalFee: {
    amount: { type: Number, min: 0, default: 0 },
    vendorName: { type: String },
    description: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date },
    updatedAt: { type: Date }
  },

  activities: [activitySchema],
  messages: [messageSchema],  // Chat messages array
}, { timestamps: true });

// Pre-save: Generate uniqueId (unchanged)
projectSchema.pre('save', async function (next) {
  if (!this.uniqueId) {
    const Counter = mongoose.models.Counter || require('./Counter');
    const counter = await Counter.findOneAndUpdate(
      { _id: 'projectId' },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );
    this.uniqueId = `PRJ${counter.sequence.toString().padStart(4, '0')}`;
  }
  next();
});

// Log activity method (UPDATED: Handle attachments)
projectSchema.methods.logActivity = async function (description, updatedBy, options = {}) {
  this.activities.push({
    description,
    updatedBy,
    statusChange: options.statusChange,
    remarks: options.remarks,
    visibility: options.visibility || 'Internal',
    attachments: options.attachments || [] // NEW
  });
  await this.save();
};

// Add message method (for chat) (unchanged)
projectSchema.methods.addMessage = async function (content, senderId) {
  this.messages.push({
    senderId,
    content,
    timestamp: new Date(),
  });
  await this.save();
};

// NEW: Check if user can view progress without payment restrictions (Managers, TLs, Employees assigned)
projectSchema.methods.canUserViewProgress = function (userId) {
  if (!userId) return false;
  const uid = userId.toString();
  return (
    (this.assignedTo && this.assignedTo.some(id => id.toString() === uid)) ||
    (this.teamLeadId && this.teamLeadId.toString() === uid) ||
    (this.teamMembers && this.teamMembers.some(id => id.toString() === uid))
  );
};

module.exports = mongoose.model('Project', projectSchema);