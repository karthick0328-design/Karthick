// User Model - models/User.js (UPDATED: Removed 'manager' from rolesRequiringDeptOrService to allow creation without department or service; Made phone optional to align with controller flexibility; Preserved all other updates for case-insensitivity, validation, etc.)
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Counter = require('./Counter');
// Sub-schema for user activities
const activitySchema = new mongoose.Schema({
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
// Sub-schema for important dates
const importantDateSchema = new mongoose.Schema({
  description: { type: String, required: true },
  date: { type: Date, required: true },
});
// Valid departments (display casing for storage; normalized for validation)
const displayDepartments = ['Sales & Customer Services', 'Human Resources', 'Financial'];
const validDepartments = displayDepartments.map(dept => dept.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ')); // Use space normalization to match example casing variations like "Human Resource"
// Valid services (exact match for enum, fixed spelling/casing per examples)
const displayServices = ['NGS', 'Drug Discovery', 'Software develope', 'Microbiology', 'BioChemistry', 'Modecular Biology'];
const validServicesLower = displayServices.map(s => s.toLowerCase().replace(/\s+/g, ' ')); // For case-insensitive validation
// Main User Schema
const userSchema = new mongoose.Schema(
  {
    uniqueId: {
      type: String,
      unique: true,
      match: [/^CAG\d+$/, 'Unique ID must follow the format CAG<number>'],
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    phone: {
      type: String,
      trim: true,
      // UPDATED: Made optional to align with controller (empty string allowed)
      match: [/^\+?\d{10,12}$/, 'Please enter a valid phone number (10-12 digits)'],
      // No required: true here; validation message only triggers if non-empty but invalid
    },
    country: {
      type: String,
      enum: {
        values: ['Indian', 'Foreign'],
        message: 'Country must be either Indian or Foreign',
      },
      trim: true,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
      trim: true,
      minlength: [2, 'Branch must be at least 2 characters long'],
      maxlength: [100, 'Branch must be less than 100 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'subadmin', 'head', 'manager', 'tl', 'employee', 'superadmin'],
      default: 'user',
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
    service: {
      type: String,
      enum: {
        values: [...displayServices, ''],
        message: `Service must be one of: ${displayServices.join(', ')} or empty.`,
      },
      trim: true,
      default: '',
    },
    seniority: {
      type: String,
      enum: {
        values: ['junior', 'senior', null],
        message: 'Seniority must be "junior", "senior", or null.',
      },
      default: null,
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isPasswordSet: { type: Boolean, default: false }, // For one-time password fix
    loginOtp: { type: String, default: null },
    loginOtpExpires: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null },
    donationSlug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    attendanceVerificationMethod: {
      type: String,
      enum: {
        values: ['Physical', 'Virtual', 'biometric', 'none'],
        message: 'Invalid verification method',
      },
      default: 'Physical',
    },
    profileImage: {
      type: String, // Base64 string or URL
      default: null,
    },
    faceEmbedding: {
      type: [Number], // Array of 128 or 512 numbers
      default: null,
    },
    biometricScanId: {
      type: String,
      match: [/^BIO-\d{9}$/, 'Biometric scan ID must follow format BIO-<9 digits>'],
      trim: true,
      unique: true,
      sparse: true,
    },
    activities: [activitySchema],
    importantDates: [importantDateSchema],
    financeAccess: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);
// Validator for department (required only for subadmin; for others, OR with service - no overwrite of display casing)
userSchema.path('department').validate(function (value) {
  const trimmedValue = value ? value.trim() : '';
  if (this.role === 'subadmin' && trimmedValue.length === 0) {
    throw new Error('Department is required for subadmin role.');
  }
  if (trimmedValue.length > 0) {
    // Normalize for validation only (preserve original casing in storage)
    const normalized = trimmedValue.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
    if (!validDepartments.includes(normalized)) {
      throw new Error(`Invalid department: ${value}. Must be one of ${displayDepartments.join(', ')} (case-insensitive).`);
    }
  }
  return true;
}, 'Invalid department.');
// Validator for service (if provided, must be valid (case-insensitive); required only if no department for head/tl/employee - UPDATED: Excluded 'manager')
userSchema.path('service').validate(function (value) {
  const trimmedValue = value ? value.trim() : '';
  const trimmedDept = this.department ? this.department.trim() : '';
  const normalizedDept = trimmedDept.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
  // If service provided, validate against allowed (case-insensitive)
  if (trimmedValue.length > 0) {
    const normalizedService = trimmedValue.toLowerCase().replace(/\s+/g, ' ');
    if (!validServicesLower.includes(normalizedService)) {
      throw new Error(`Invalid service: ${value}. Allowed services: ${displayServices.join(', ')} (case-insensitive).`);
    }
  }
  // Role-specific requirement: for head/tl/employee, require dept OR service (managers now exempt)
  const rolesRequiringDeptOrService = ['head', 'tl', 'employee'];  // UPDATED: Removed 'manager'
  if (rolesRequiringDeptOrService.includes(this.role)) {
    if (trimmedDept.length === 0 && trimmedValue.length === 0) {
      throw new Error('Department or service is required for this role.');
    }
  }
  // For subadmin, forbid service
  if (this.role === 'subadmin' && trimmedValue.length > 0) {
    throw new Error('Subadmin role cannot have service.');
  }
  return true;
}, 'Invalid service.');
// Validator for seniority (required only for employee regardless of dept/service; forbid for all others)
userSchema.path('seniority').validate(function (value) {
  const trimmedValue = value ? value.trim().toLowerCase() : null;
  // For employee: require valid seniority
  if (this.role === 'employee') {
    if (!trimmedValue || !['junior', 'senior'].includes(trimmedValue)) {
      throw new Error(`Seniority is required for employee role. Allowed: ${['junior', 'senior'].join(', ')}`);
    }
  }
  // For all non-employee roles: forbid seniority (nullify if set)
  if (this.role !== 'employee' && value && value !== null) {
    this.seniority = null;
    // Note: Nullification happens here, but validation passes
  }
  // For subadmin: explicitly forbid (already covered by non-employee)
  if (this.role === 'subadmin' && value && value !== null) {
    throw new Error('Subadmin role cannot have seniority.');
  }
  return true;
}, 'Invalid seniority.');
// Indexes for performance
userSchema.index({ branch: 1 });
userSchema.index({ department: 1 });
userSchema.index({ service: 1 });
userSchema.index({ role: 1, department: 1 }); // Added for faster internal user queries
// Combined pre('save') middleware (UPDATED: No department normalization to preserve display casing; Added service casing fix if needed)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') && !this.isNew) {
    return next();
  }
  // Normalize role
  if (this.isModified('role')) {
    this.role = this.role.toLowerCase();
    console.log(`[${new Date().toISOString()}] Normalized role: ${this.role}`);
  }
  // Generate uniqueId
  if (!this.uniqueId) {
    try {
      console.log(`[${new Date().toISOString()}] Generating uniqueId for user: ${this.email || 'unknown'}`);
      const Counter = mongoose.models.Counter || mongoose.model('Counter', require('./Counter').schema);
      const counter = await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      if (!counter) {
        throw new Error('Counter document not found or created');
      }
      this.uniqueId = `CAG${counter.sequence.toString().padStart(3, '0')}`;
      console.log(`[${new Date().toISOString()}] Generated uniqueId: ${this.uniqueId} for user: ${this.email || 'unknown'}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error generating uniqueId for user: ${this.email || 'unknown'}`, error.stack);
      return next(new Error('Failed to generate unique ID'));
    }
  } else {
    console.log(`[${new Date().toISOString()}] uniqueId already set: ${this.uniqueId}`);
  }
  // Enforce seniority based on role (additional safeguard, aligned with validator)
  if (this.isModified('role') || this.isModified('seniority')) {
    if (this.role === 'employee' && (!this.seniority || !['junior', 'senior'].includes(this.seniority.toLowerCase()))) {
      return next(new Error('Seniority is required for employee role and must be "junior" or "senior".'));
    }
    if (this.role !== 'employee' && this.seniority && this.seniority !== null) {
      this.seniority = null;
      console.log(`[${new Date().toISOString()}] Nullified seniority for non-employee role: ${this.role}`);
    }
  }
  // Hash password only if it's plain text
  if (this.isModified('password') && this.password && this.password.length < 60) {
    console.log(`[${new Date().toISOString()}] Hashing password for user: ${this.email || 'unknown'}`);
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`[${new Date().toISOString()}] Password hashed successfully for user: ${this.email || 'unknown'}`);
  } else if (this.isModified('password')) {
    console.log(`[${new Date().toISOString()}] Password already hashed, skipping re-hash for user: ${this.email || 'unknown'}`);
  }
  // FIXED: Normalize service casing only if it matches a valid one (preserve exact input if not, but enum will catch)
  if (this.isModified('service') && this.service && this.service.trim()) {
    const trimmedService = this.service.trim();
    const normalizedServiceLower = trimmedService.toLowerCase().replace(/\s+/g, ' ');
    const matchingService = displayServices.find(s => s.toLowerCase().replace(/\s+/g, ' ') === normalizedServiceLower);
    this.service = matchingService || trimmedService;
    console.log(`[${new Date().toISOString()}] Normalized service: ${this.service}`);
  }
  // Do NOT normalize department to preserve display casing (e.g., 'Human Resources' vs 'human resources')
  next();
});
// Compare entered password with hashed one
userSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Comparing password for ${this.email}: isMatch=${isMatch}`);
  }
  return isMatch;
};

// Check if password was accidentally double-hashed
// A double-hashed password would be longer than 60 characters (bcrypt hash is always 60 chars)
// or the hash wouldn't match when trying to compare a bcrypt hash as input
userSchema.methods.isDoubleHashed = async function () {
  // Bcrypt hashes are always exactly 60 characters
  // If password is longer, it might be double-hashed
  if (this.password && this.password.length > 60) {
    return true;
  }
  // Check if the stored hash looks like a bcrypt hash of another bcrypt hash
  // A valid bcrypt hash starts with $2a$, $2b$, or $2y$ followed by cost factor
  const bcryptPattern = /^\$2[aby]\$\d{2}\$/;
  if (this.password && bcryptPattern.test(this.password)) {
    // Try to detect if comparing any bcrypt-like string would match
    // This is a heuristic - if password length is exactly 60 and starts with bcrypt prefix, it's likely correct
    return false;
  }
  return false;
};
// Create JWT with full user info
userSchema.methods.createJWT = function () {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_IN) {
    throw new Error('JWT_SECRET or JWT_EXPIRES_IN is not defined');
  }
  return jwt.sign(
    {
      id: this._id.toString(),
      uniqueId: this.uniqueId,
      name: this.name,
      email: this.email,
      role: this.role,
      department: this.department,
      service: this.service,
      seniority: this.seniority,
      attendanceVerificationMethod: this.attendanceVerificationMethod,
      phone: this.phone,
      country: this.country,
      branch: this.branch,
      donationSlug: this.donationSlug,
      financeAccess: this.financeAccess || [],
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};
module.exports = mongoose.model('User', userSchema);