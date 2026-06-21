const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    // Snapshotted fields for historical data integrity
    employeeName: { type: String },
    employeeUniqueId: { type: String },
    employeeRole: { type: String },
    employeeService: { type: String },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      // NO index: true here—causes duplicate with explicit index below
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in time is required'],
    },
    checkOut: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'waiting'],
      default: 'present',
      required: [true, 'Attendance status is required'],
    },
    environment: {
      type: String,
      enum: ['virtual', 'physical'],
      default: 'physical',
      required: [true, 'Environment type is required'],
    },
    sleepDuration: {
      type: Number,
      default: 0,
    },
    cursorMovements: [{
      type: Date,
      required: [
        function () {
          return this.environment === 'virtual' && this.status !== 'on-leave';
        },
        'Cursor movements are required for virtual environment',
      ],
    }],
    verificationMethod: {
      type: String,
      enum: ['biometric', 'signature', 'punch-card', 'rfid-qr', 'Physical', 'Virtual', 'none'],
      default: 'biometric',
    },
    biometricScanId: {
      type: String,
      required: [
        function () {
          return this.environment === 'physical' && this.status === 'present' && this.verificationMethod === 'biometric';
        },
        'Biometric scan ID is required for biometric verification',
      ],
      match: [/^BIO-\d{9}$/, 'Biometric scan ID must follow format BIO-<9 digits>'],
    },
    signatureData: {
      type: String, // URL or base64 string for signature
      required: [
        function () {
          return this.environment === 'physical' && this.status === 'present' && this.verificationMethod === 'signature';
        },
        'Signature data is required for signature verification',
      ],
    },
    punchCardId: {
      type: String,
      required: [
        function () {
          return this.environment === 'physical' && this.status === 'present' && this.verificationMethod === 'punch-card';
        },
        'Punch Card ID is required for punch-card verification',
      ],
    },
    scanData: {
      type: String, // QR code or RFID data
      required: [
        function () {
          return this.environment === 'physical' && this.status === 'present' && this.verificationMethod === 'rfid-qr';
        },
        'Scan data is required for RFID/QR verification',
      ],
    },
    virtualVerificationImage: {
      type: String, // Base64 image
      required: [
        function () {
          return this.environment === 'virtual' && this.status === 'present';
        },
        'Verification image is required for virtual attendance',
      ],
    },
    faceEmbedding: {
      type: [Number],
      default: null,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    deviceId: {
      type: String,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    monitoringStatus: {
      type: String,
      enum: ['pending-approval', 'active', 'failed', 'completed'],
      default: 'completed', // Default for historical/manual records
    },
    lastActivityAt: {
      type: Date,
    },
    hrMarkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    isHolidayWork: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    leaveReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Leave reason cannot exceed 500 characters'],
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    salaryDeductionAmount: {
      type: Number,
      default: 0,
    },
    workedOnHoliday: {
      type: Boolean,
      default: false,
    },
    holidayType: {
      type: String,
      enum: ['government', 'regular', null],
      default: null,
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: [0, 'Overtime hours cannot be negative'],
      max: [8, 'Overtime hours cannot exceed 8 hours per day'],
    },
    sentToFinance: {
      type: Boolean,
      default: false,
    },
    financeProcessed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Explicit indexes (no duplicates)
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isApproved: 1 });
attendanceSchema.index({ environment: 1 });
// REMOVED: attendanceSchema.index({ date: 1 }); // This was the duplicate culprit

module.exports = mongoose.model('Attendance', attendanceSchema);