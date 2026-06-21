const mongoose = require('mongoose');

const departmentRateSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      trim: true,
      default: null, // Optional, for global rates
    },
    service: {
      type: String,
      trim: true,
      default: null, // Optional, for service-specific rates
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['head', 'manager', 'team manager', 'tl', 'employee'],
      lowercase: true,
    },
    monthlyRate: {
      type: Number,
      required: [true, 'Monthly rate is required'],
      min: [0, 'Monthly rate cannot be negative'],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique rates for dept+service+role combination
// We need a partial index for the case where service is null (if we treat null as a value in unique index, it works, but let's be safe)
// Actually, simple unique index works if we store empty string/null consistently.
departmentRateSchema.index({ department: 1, service: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('DepartmentRate', departmentRateSchema);