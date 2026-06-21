const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: [1, 'Month must be between 1-12'],
      max: [12, 'Month must be between 1-12'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [2020, 'Year must be 2020 or later'],
    },
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: [0, 'Basic salary cannot be negative'],
    },
    totalAllowances: {
      type: Number,
      default: 0,
      min: [0, 'Total allowances cannot be negative'],
    },
    grossSalary: {
      type: Number,
      required: [true, 'Gross salary is required'],
      min: [0, 'Gross salary cannot be negative'],
    },
    attendanceDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Attendance deductions cannot be negative'],
    },
    holidayIncrements: {
      type: Number,
      default: 0,
      min: [0, 'Holiday increments cannot be negative'],
    },
    tds: {
      type: Number,
      default: 0,
      min: [0, 'TDS cannot be negative'],
    },
    professionalTax: {
      type: Number,
      default: 0,
      min: [0, 'Professional tax cannot be negative'],
    },
    epf: {
      type: Number,
      default: 0,
      min: [0, 'EPF cannot be negative'],
    },
    esi: {
      type: Number,
      default: 0,
      min: [0, 'ESI cannot be negative'],
    },
    otherDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Other deductions cannot be negative'],
    },
    totalDeductions: {
      type: Number,
      default: 0,
      min: [0, 'Total deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary cannot be negative'],
    },
    workingDays: {
      type: Number,
      default: 22,
      min: [1, 'Working days must be at least 1'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    isGenerated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'credited'],
      default: 'pending',
    },
    totalIncrements: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

salarySchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });
salarySchema.index({ userId: 1 });
salarySchema.index({ year: 1, month: 1 });

module.exports = mongoose.model('Salary', salarySchema);
