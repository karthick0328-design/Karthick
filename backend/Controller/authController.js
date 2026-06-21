// authController.js (Updated: Added 'department' to JWT payload in login and signup for frontend access; Manual JWT signing to ensure inclusion; Aligned with previous fixes)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const ResetPassword = require('../models/ResetPassword');
const UserProfile = require('../models/UserProfile');
const Counter = require('../models/Counter');

async function initializeCounter() {
  const counter = await Counter.findById('userId');
  if (!counter) {
    await Counter.create({ _id: 'userId', sequence: 0 });
    console.log('Counter initialized for userId');
  }
}
initializeCounter();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USERNAME || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});

// Verification check to ensure SMTP is working correctly on startup
const smtpHost = process.env.SMTP_SERVER || 'smtp.hostinger.com';
const smtpUser = process.env.SMTP_USERNAME || process.env.EMAIL_USER;
// Identify which password variable was picked up
const smtpPassType = process.env.SMTP_PASSWORD ? 'SMTP_PASSWORD' 
                   : process.env.EMAIL_APP_PASSWORD ? 'EMAIL_APP_PASSWORD' 
                   : process.env.EMAIL_PASS ? 'EMAIL_PASS' 
                   : 'NONE';

transporter.verify((error, success) => {
  if (error) {
    console.error(`[${new Date().toISOString()}] ❌ authController SMTP Verification Error on ${smtpHost} for user ${smtpUser} (using source: ${smtpPassType}):`, error.message);
    if (error.responseCode === 535) {
      console.warn(`[${new Date().toISOString()}] 💡 TIP: Authentication failed (535). Please verify that the password in ${smtpPassType} matches the account ${smtpUser} in your ${smtpHost} panel.`);
    }
  } else {
    console.log(`[${new Date().toISOString()}] ✅ authController SMTP Server is ready (using: ${smtpHost}, source: ${smtpPassType})`);
  }
});
// Allowed countries for validation
const allowedCountries = ['Indian', 'Foreign'];

// Input validation for signup and profile update (updated: Added isUpdate flag; Added conditional validation for service/seniority based on role; Removed department validation for signup)
const validateSignup = (data, role = 'user', isUpdate = false) => {
  const errors = [];

  // Common fields
  if (!data.name || !data.name.trim()) {
    errors.push({ field: 'name', message: 'Full name is required.' });
  }
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }

  // Password validation: required for signup, optional for update (unless provided)
  if (!isUpdate || data.password) {
    if (!data.password) {
      errors.push({ field: 'password', message: 'Password is required.' });
    } else {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
      if (!strongPasswordRegex.test(data.password)) {
        errors.push({
          field: 'password',
          message:
            'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
        });
      }
    }
  }

  if (!isUpdate || data.confirmPassword) {
    if (!data.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Please confirm your password.' });
    } else if (data.password !== data.confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }
  }
  const cleanPhone = data.phone ? String(data.phone).replace(/\D/g, '') : '';
  if (data.phone && data.phone.trim().length > 0) {
    if (cleanPhone.length < 10 || cleanPhone.length > 12) {
      errors.push({ field: 'phone', message: 'Enter a valid phone number (10-12 digits).' });
    }
  }
  // Address required for signup, optional for profile updates
  if (!isUpdate && (!data.address || !data.address.trim())) {
    errors.push({ field: 'address', message: 'Address is required.' });
  }
  // Country optional: Validate enum only if provided
  if (data.country && !allowedCountries.includes(data.country.trim())) {
    errors.push({ field: 'country', message: 'Country must be either Indian or Foreign.' });
  }
  // Location required only if country is provided
  if (data.country && (!data.location || !data.location.trim())) {
    errors.push({ field: 'location', message: `${data.country.trim() === 'Indian' ? 'State/City' : 'Country/State/City'} is required.` });
  }
  // Branch required for signup, optional for profile updates
  if (!isUpdate) {
    if (!data.branch || !data.branch.trim()) {
      errors.push({ field: 'branch', message: 'Branch is required.' });
    } else if (data.branch.trim().length < 2) {
      errors.push({ field: 'branch', message: 'Branch must be at least 2 characters long.' });
    } else if (data.branch.trim().length > 100) {
      errors.push({ field: 'branch', message: 'Branch must be less than 100 characters.' });
    }
  } else if (data.branch && data.branch.trim().length > 0) {
    // If branch is provided in an update, validate its length
    if (data.branch.trim().length < 2) {
      errors.push({ field: 'branch', message: 'Branch must be at least 2 characters long.' });
    } else if (data.branch.trim().length > 100) {
      errors.push({ field: 'branch', message: 'Branch must be less than 100 characters.' });
    }
  }

  // Service validation: required at signup for non-user roles; during update, preserve existing value
  if (!isUpdate) {
    if (role !== 'user') {
      if (!data.service || data.service.trim().length < 2) {
        errors.push({ field: 'service', message: 'Service is required for this role and must be at least 2 characters long.' });
      } else if (data.service.trim().length > 100) {
        errors.push({ field: 'service', message: 'Service must be less than 100 characters.' });
      }
    } else if (data.service && data.service.trim().length > 0 && (data.service.trim().length < 2 || data.service.trim().length > 100)) {
      errors.push({ field: 'service', message: 'Service must be at least 2 characters long if provided.' });
    }
  }

  // Seniority validation: required only at signup for employee; during updates preserve existing value
  if (!isUpdate) {
    if (role === 'employee') {
      if (!data.seniority || !['junior', 'senior'].includes(data.seniority)) {
        errors.push({ field: 'seniority', message: 'Seniority is required for employee role and must be "junior" or "senior".' });
      }
    } else if (data.seniority && data.seniority !== null && data.seniority !== undefined) {
      errors.push({ field: 'seniority', message: 'Seniority is not allowed for this role.' });
    }
  }

  // Membership type validations (assuming user signup)
  if (data.membershipType) {
    if (!['student', 'scholar', 'faculty', 'industry', 'employee', ''].includes(data.membershipType)) {
      errors.push({ field: 'membershipType', message: 'Invalid membership type.' });
    }
    if (data.membershipType === 'student') {
      if (!data.college || !data.college.trim()) {
        errors.push({ field: 'college', message: 'College is required for students.' });
      }
      if (!data.degree || !data.degree.trim()) {
        errors.push({ field: 'degree', message: 'Degree is required for students.' });
      }
      if (!data.highestDegree) {
        errors.push({ field: 'highestDegree', message: 'Highest degree is required for students.' });
      } else if (!['', 'Bachelor', 'Master', 'Ph.D.'].includes(data.highestDegree)) {
        errors.push({ field: 'highestDegree', message: 'Invalid highest degree.' });
      }
      if (!data.currentYear && !data.passOutYear) {
        errors.push({
          field: 'currentYear',
          message: 'Current year or pass out year is required for students.',
        });
      }
    } else if (data.membershipType === 'scholar') {
      if (!data.college || !data.college.trim()) {
        errors.push({ field: 'college', message: 'College is required for scholars.' });
      }
      if (!data.degree || !data.degree.trim()) {
        errors.push({ field: 'degree', message: 'Degree is required for scholars.' });
      }
    } else if (data.membershipType === 'faculty' || data.membershipType === 'industry') {
      if (!data.company || !data.company.trim()) {
        errors.push({ field: 'company', message: 'Company is required for faculty/industry professionals.' });
      }
      if (!data.professionalRole || !data.professionalRole.trim()) {
        errors.push({ field: 'professionalRole', message: 'Professional role is required for faculty/industry professionals.' });
      }
      if (!data.yearOfExperience && (!data.previousExperiences || data.previousExperiences.length === 0)) {
        errors.push({
          field: 'yearOfExperience',
          message: 'Year of experience or previous experience is required for faculty/industry professionals.',
        });
      }
      if (!data.highestDegree) {
        errors.push({ field: 'highestDegree', message: 'Highest degree is required for faculty/industry professionals.' });
      } else if (!['', 'Bachelor', 'Master', 'Ph.D.'].includes(data.highestDegree)) {
        errors.push({ field: 'highestDegree', message: 'Invalid highest degree.' });
      }
      if (!data.college || !data.college.trim()) {
        errors.push({ field: 'college', message: 'College is required for faculty/industry professionals (for UG/PG).' });
      }
    }
  }

  if (data.highestDegree && !['', 'Bachelor', 'Master', 'Ph.D.'].includes(data.highestDegree)) {
    errors.push({ field: 'highestDegree', message: 'Invalid highest degree.' });
  }

  // Previous experiences (optional but consistent if provided)
  if (data.previousExperiences && Array.isArray(data.previousExperiences)) {
    if (data.previousExperiences.length > 5) {
      errors.push({ field: 'previousExperiences', message: 'Cannot exceed 5 previous experiences.' });
    }
    data.previousExperiences.forEach((exp, index) => {
      if (exp.prevCompany?.trim() || exp.prevRole?.trim()) {
        if (!exp.prevCompany?.trim()) {
          errors.push({ field: `prevCompany-${index}`, message: 'Company is required if role is provided.' });
        }
        if (!exp.prevRole?.trim()) {
          errors.push({ field: `prevRole-${index}`, message: 'Role is required if company is provided.' });
        }
      }
      if (exp.prevYearOfExperience && (isNaN(parseInt(exp.prevYearOfExperience)) || parseInt(exp.prevYearOfExperience) < 0)) {
        errors.push({ field: `prevYearOfExperience-${index}`, message: 'Valid years of experience required.' });
      }
      if (exp.category && !['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract', ''].includes(exp.category)) {
        errors.push({ field: `category-${index}`, message: 'Invalid experience category.' });
      }
    });
  }

  return errors;
};

// Signup function (updated: Added optional service/seniority handling; Assumes 'user' role, so optional/null; Removed department handling for signup; UPDATED: Manual JWT with department)
const signup = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Raw Request Body:`, JSON.stringify(req.body, null, 2));
    if (!req.body || typeof req.body !== 'object') {
      console.log(`[${new Date().toISOString()}] ❌ Invalid request body format`);
      return res.status(400).json({
        errors: [{ field: 'request', message: 'Invalid request body format' }],
        success: false,
      });
    }

    // SEC-FIX: Use Type Guards and sanitize logs
    const normalizedBody = {};
    if (req.body && typeof req.body === 'object') {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof key === 'string') {
          normalizedBody[key.toLowerCase()] = value;
        }
      }
    }

    const { uniqueid, ...safeBody } = normalizedBody;
    if (uniqueid !== undefined) {
      console.log(`[${new Date().toISOString()}] ❌ Client sent uniqueId: ${uniqueid}`);
      return res.status(400).json({
        errors: [{ field: 'uniqueId', message: 'Unique ID is generated by the server and cannot be provided.' }],
        success: false,
      });
    }

    console.log(`[${new Date().toISOString()}] ✅ Processed Signup Data:`, JSON.stringify(safeBody, null, 2));

    const {
      name,
      email,
      password, // Plain password
      confirmpassword,
      phone,
      address,
      country,
      location,
      membershiptype,
      professionalrole,
      company,
      college,
      degree,
      highestdegree,
      currentyear,
      passoutyear,
      yearofexperience,
      previousexperiences,
      branch,
      iswhatsapp,
      service,
      seniority,
      department, // NEW: Optional department for signup (e.g., for internal users)
    } = normalizedBody;

    // Map variations back to standard names for validation
    const validationData = {
      name,
      email,
      password,
      confirmPassword: confirmpassword,
      phone,
      address,
      country,
      location: location || '',
      membershipType: membershiptype || '',
      professionalRole: professionalrole || '',
      company,
      college,
      degree,
      highestDegree: highestdegree || '',
      currentYear: currentyear || '',
      passOutYear: passoutyear || '',
      yearOfExperience: yearofexperience || '',
      previousExperiences: previousexperiences || [],
      branch: branch || '',
      service: service || '',
      seniority: seniority || null,
      department: department || '', // NEW: Include in validation (optional)
    };

    // Assume user role for signup
    const userRole = 'user';
    const errors = validateSignup(validationData, userRole);
    if (errors.length > 0) {
      console.log(`[${new Date().toISOString()}] Validation errors:`, JSON.stringify(errors, null, 2));
      return res.status(400).json({ errors, success: false });
    }

    // SEC-FIX: Type guards for inputs
    if (typeof email !== 'string' || typeof name !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        errors: [{ field: 'request', message: 'Invalid input types' }],
        success: false,
      });
    }

    const normalizedEmail = email.toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      console.log(`[${new Date().toISOString()}] ❌ Email already exists: ${normalizedEmail}`);
      return res.status(400).json({
        errors: [{ field: 'email', message: 'This email is already registered' }],
        isEmailTaken: true,
        success: false,
      });
    }

    const trimmedName = name.trim();
    const existingName = await User.findOne({
      name: { $regex: `^${trimmedName}$`, $options: 'i' },
    });
    if (existingName) {
      console.log(`[${new Date().toISOString()}] ❌ Name already taken: ${trimmedName}`);
      return res.status(400).json({
        errors: [{ field: 'name', message: 'This name is already taken' }],
        isNameTaken: true,
        success: false,
      });
    }

    console.log(`[${new Date().toISOString()}] Starting user save for email: ${normalizedEmail}`);

    const newUser = new User({
      name: trimmedName,
      email: normalizedEmail,
      password, // Will be hashed in pre-save
      phone,
      country: (country || '').trim(),
      branch: (branch || '').trim(),
      department: (department || '').trim(), // NEW: Save department if provided
      isVerified: false,
      role: userRole,
      service: (service || '').trim(), // Optional for user
      seniority: null, // Not allowed for user
      // Removed: membershipType, displayMembershipType, membershipStatus, membershipExpiry (not in User schema)
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] User object before save (PLAIN password):`, JSON.stringify(newUser.toObject(), null, 2));
    }

    console.log(`[${new Date().toISOString()}] newUser country before save: "${newUser.country}"`);
    await newUser.save();
    console.log(`[${new Date().toISOString()}] User created: ${newUser._id}, Unique ID: ${newUser.uniqueId}, hashed pw: ${newUser.password.substring(0, 20)}...`);

    // Clean previous experiences
    const cleanPrevExp = (previousexperiences || [])
      .filter(exp => exp.prevCompany?.trim() || exp.prevRole?.trim())
      .map(exp => ({
        prevCompany: exp.prevCompany?.trim() || '',
        prevRole: exp.prevRole?.trim() || '',
        prevYearOfExperience: exp.prevYearOfExperience?.trim() || '',
        category: exp.category || 'Full-time',
      }));

    const newUserProfile = new UserProfile({
      userId: newUser._id,
      email: normalizedEmail,
      phone,
      isWhatsApp: iswhatsapp || false,
      address: (address || '').trim(),
      country: (country || '').trim(),
      location: (location || '').trim(),
      membershipType: validationData.membershipType,
      professionalRole: (professionalrole || '').trim(),
      company: (company || '').trim(),
      college: (college || '').trim(),
      degree: (degree || '').trim(),
      highestDegree: (highestdegree || '').trim(),
      currentYear: currentyear ? String(currentyear).trim() : '',
      passOutYear: passoutyear ? String(passoutyear).trim() : '',
      yearOfExperience: (yearofexperience || '').trim(),
      previousExperiences: cleanPrevExp,
      branch: (branch || '').trim(),
    });

    console.log(`[${new Date().toISOString()}] Profile object country: "${newUserProfile.country}"`);
    await newUserProfile.save();
    console.log(`[${new Date().toISOString()}] User profile created: ${newUserProfile._id}`);

    // UPDATED: Manual JWT creation to include department
    const payload = {
      id: newUser._id,
      uniqueId: newUser.uniqueId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      service: newUser.service,
      seniority: newUser.seniority,
      department: newUser.department || '',
      attendanceVerificationMethod: newUser.attendanceVerificationMethod || 'none',
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Generated JWT payload:`, payload);
    }

    res.status(201).json({
      success: true,
      message: 'Signup successful!',
      token,
      user: {
        id: newUser._id,
        uniqueId: newUser.uniqueId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        service: newUser.service || '',
        seniority: newUser.seniority || null,
        department: newUser.department || '', // NEW: Include in response
        // Use profile for membership fields
        membershipType: newUserProfile.membershipType,
        displayMembershipType: newUserProfile.displayMembershipType,
        membershipStatus: newUserProfile.membershipStatus,
        membershipExpiry: newUserProfile.membershipExpiry,
        country: newUserProfile.country || '',
        branch: newUserProfile.branch || '',
        location: newUserProfile.location || '',
        address: newUserProfile.address || '',
        professionalRole: newUserProfile.professionalRole || '',
        company: newUserProfile.company || '',
        college: newUserProfile.college || '',
        degree: newUserProfile.degree || '',
        highestDegree: newUserProfile.highestDegree || '',
        currentYear: newUserProfile.currentYear || '',
        passOutYear: newUserProfile.passOutYear || '',
        yearOfExperience: newUserProfile.yearOfExperience || '',
        previousExperiences: newUserProfile.previousExperiences || [],
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Signup Error:`, error.stack);
    if (error.message === 'Failed to generate unique ID') {
      return res.status(500).json({
        errors: [{ field: 'uniqueId', message: 'Failed to generate unique ID. Please try again later.' }],
        success: false,
      });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
      }));
      console.log(`[${new Date().toISOString()}] ValidationError:`, JSON.stringify(errors, null, 2));
      return res.status(400).json({ errors, success: false });
    }
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({
          errors: [{ field: 'email', message: 'This email is already registered' }],
          success: false,
        });
      }
      if (error.keyPattern.name) {
        return res.status(400).json({
          errors: [{ field: 'name', message: 'This name is already taken' }],
          success: false,
        });
      }
      if (error.keyPattern.uniqueId) {
        return res.status(400).json({
          errors: [{ field: 'uniqueId', message: 'Unique ID is already taken' }],
          success: false,
        });
      }
    }
    res.status(500).json({
      errors: [
        {
          field: '',
          message: process.env.NODE_ENV === 'development' ? error.stack : 'Server error',
        },
      ],
      success: false,
    });
  }
};

// Login function (updated: Added service/seniority to response; Removed 'team manager' from internal role checks; Use UserProfile for membership fields; Aligned defaults; UPDATED: Manual JWT with department)
const login = async (req, res) => {
  try {
    // SEC-FIX: Use type guards
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const email = typeof req.body.email === 'string' ? req.body.email : '';

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Login attempt (identifier provided)`);
    }

    if (!email || !password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        success: false,
      });
    }

    const identifier = email;
    const inputPassword = password;
    const normalizedIdentifier = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);
    let user;
    if (isEmail) {
      const normalizedEmail = normalizedIdentifier.toLowerCase();
      console.log(`[${new Date().toISOString()}] Searching for user with normalized email: ${normalizedEmail}`);
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        console.log(`[${new Date().toISOString()}] ❌ No user found for email: ${normalizedEmail}`);
        return res.status(401).json({
          error: 'Invalid credentials',
          success: false,
        });
      }
    } else {
      console.log(`[${new Date().toISOString()}] Searching for user with uniqueId: ${normalizedIdentifier}`);
      user = await User.findOne({ uniqueId: normalizedIdentifier });
      if (!user) {
        console.log(`[${new Date().toISOString()}] ❌ No user found for uniqueId: ${normalizedIdentifier}`);
        return res.status(401).json({
          error: 'Invalid credentials',
          success: false,
        });
      }
    }
    console.log(`[${new Date().toISOString()}] User found: ${user._id}, role: ${user.role}, isActive: ${user.isActive}, isVerified: ${user.isVerified}`);
    console.log(`[${new Date().toISOString()}] User password length: ${user.password ? user.password.length : 0}`);

    // NEW: Safe auto-detect and fix double-hash for internal users
    let isDoubleHashed = false;
    try {
      isDoubleHashed = await user.isDoubleHashed();
    } catch (detectError) {
      console.error(`[${new Date().toISOString()}] Error detecting double-hash:`, detectError.message);
      isDoubleHashed = false; // Fallback to no fix if method fails
    }
    if (isDoubleHashed) {
      console.log(`[${new Date().toISOString()}] 🔧 Detected potential double-hash for ${user.email}; auto-fixing...`);
      try {
        const newSalt = await bcrypt.genSalt(12);
        const singleHash = await bcrypt.hash(inputPassword, newSalt);
        user.password = singleHash;
        await user.save({ validateBeforeSave: false }); // Bypass pre-save to avoid re-hash
        console.log(`[${new Date().toISOString()}] ✅ Auto-fixed hash for ${user.email}`);
      } catch (fixError) {
        console.error(`[${new Date().toISOString()}] Error auto-fixing hash:`, fixError.message);
        // Continue without fix; user will get mismatch error
      }
    }

    // Proceed with comparison
    const isPasswordCorrect = await user.comparePassword(inputPassword);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Hashed password comparison for user: ${user.email}, match: ${isPasswordCorrect}`);
    }
    if (!isPasswordCorrect) {
      console.log(`[${new Date().toISOString()}] ❌ Password mismatch for user: ${user.email}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        success: false,
      });
    }
    // Optional: Check isActive and isVerified (uncomment if you want to block inactive/unverified logins)
    // if (!user.isActive) {
    //   return res.status(401).json({ error: 'Account is deactivated', success: false });
    // }
    // if (!user.isVerified) {
    //   return res.status(401).json({ error: 'Account not verified. Please check your email.', success: false });
    // }
    let userProfile = await UserProfile.findOne({ userId: user._id }).lean();
    if (!userProfile) {
      console.error(`[${new Date().toISOString()}] ❌ No profile for user ${user._id}`);
      // UPDATED: Create a minimal profile with valid enum values - set defaults for user
      const isInternalRole = ['employee', 'manager', 'subadmin', 'head', 'tl', 'superadmin'].includes(user.role);
      const defaultMembershipType = isInternalRole ? 'employee' : '';
      userProfile = await UserProfile.create({
        userId: user._id,
        email: user.email,
        phone: user.phone || '',
        isWhatsApp: false,
        address: '', // Optional
        country: user.country || 'Indian', // Required
        location: '', // Optional
        membershipType: defaultMembershipType, // Valid: 'employee' for internal, empty for user
        professionalRole: '',
        company: '',
        college: '',
        degree: '',
        highestDegree: '',
        currentYear: '',
        passOutYear: '',
        yearOfExperience: '',
        previousExperiences: [],
        education: [],
        skills: [],
        bio: '',
        dob: '',
        branch: user.branch || '',
      });
      console.log(`[${new Date().toISOString()}] Created missing profile for user ${user._id} with valid defaults (membershipType: ${defaultMembershipType})`);
    }
    // UPDATED: Manual JWT creation to include department
    const payload = {
      id: user._id,
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: userProfile.phone || user.phone || null,
      service: user.service,
      seniority: user.seniority,
      department: user.department || '',
      attendanceVerificationMethod: user.attendanceVerificationMethod || 'none',
      financeAccess: user.financeAccess || [],
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Generated JWT payload:`, payload);
    }
    console.log(`[${new Date().toISOString()}] ✅ Login successful for user: ${user.email}`);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        uniqueId: user.uniqueId,
        name: user.name,
        email: user.email,
        role: user.role ? user.role.toLowerCase() : 'user',
        department: user.department || '',
        service: user.service || '',
        seniority: user.seniority || null,
        phone: userProfile.phone || user.phone || '',
        isVerified: user.isVerified,
        address: userProfile.address || '',
        country: userProfile.country || '',
        location: userProfile.location || '',
        membershipType: userProfile.membershipType || '',
        displayMembershipType: userProfile.displayMembershipType || '',
        membershipStatus: userProfile.membershipStatus || '',
        membershipExpiry: userProfile.membershipExpiry ? userProfile.membershipExpiry.getTime() : null,
        professionalRole: userProfile.professionalRole || '',
        company: userProfile.company || '',
        college: userProfile.college || '',
        degree: userProfile.degree || '',
        highestDegree: userProfile.highestDegree || '',
        currentYear: userProfile.currentYear || '',
        passOutYear: userProfile.passOutYear || '',
        yearOfExperience: userProfile.yearOfExperience || '',
        previousExperiences: userProfile.previousExperiences || [],
        education: userProfile.education || [],
        skills: userProfile.skills || [],
        bio: userProfile.bio || '',
        dob: userProfile.dob || '',
        branch: userProfile.branch || '',
        isWhatsApp: userProfile.isWhatsApp || false,
      },
      token,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Login Error:`, error.stack);
    let errorMessage = 'Internal server error';
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      errorMessage = 'Database error, please try again later';
    } else if (error.message.includes('JWT_SECRET')) {
      errorMessage = 'Server configuration error, contact support';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token configuration';
    }
    res.status(500).json({
      error: errorMessage,
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};




// Get Users (updated: Removed invalid query.membershipType; Focused on internal roles; Added service/seniority to select if needed)
const getUsers = asyncHandler(async (req, res) => {
  try {
    const { membershipType, isActive } = req.query;
    console.log(`[${new Date().toISOString()}] getUsers: Request query:`, { membershipType, isActive });
    console.log(`[${new Date().toISOString()}] getUsers: User:`, req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      email: req.user.email,
    } : 'No user found');
    if (!req.user || !req.user.id || !req.user.role) {
      console.error(`[${new Date().toISOString()}] getUsers: No authenticated user or missing user properties`);
      return res.status(401).json({
        success: false,
        message: 'No authenticated user found or user data is incomplete',
      });
    }
    const userRole = req.user.role.toLowerCase();
    if (!(
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      userRole === 'subadmin' ||
      req.isFullAttendanceAccess ||
      ((userRole === 'employee' || userRole === 'manager') && Array.isArray(req.user.managerPosition) && req.user.managerPosition.length > 0)
    )) {
      console.error(`[${new Date().toISOString()}] getUsers: Unauthorized access by user ${req.user.id} with role ${userRole}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin, Subadmin, or Employee/Manager with managerPosition authority required.',
      });
    }
    // Updated: Default to fetching active employees and managers for assignment management
    let query = { isActive: true };
    if (membershipType) {
      if (['student', 'scholar', 'faculty', 'industry'].includes(membershipType)) {
        // Note: No membershipType field in User; filtering by role only (external users)
        query.role = 'user';
        // Removed: query.membershipType = membershipType (invalid field)
      } else if (membershipType === 'employee') {
        query.role = { $in: ['employee', 'manager'] };
        // Removed: query.membershipType = 'employee' (invalid field)
      } else {
        console.error(`[${new Date().toISOString()}] getUsers: Invalid membershipType: ${membershipType}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid membership type. Must be one of: student, scholar, faculty, industry, employee',
        });
      }
    } else {
      // Default to employees and managers
      query.role = { $in: ['employee', 'manager'] };
    }
    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        console.error(`[${new Date().toISOString()}] getUsers: Invalid isActive value: ${isActive}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid isActive value. Must be "true" or "false"',
        });
      }
      query.isActive = isActive === 'true';
    }
    console.log(`[${new Date().toISOString()}] getUsers: MongoDB query:`, query);
    const users = await User.find(query)
      .select('_id name uniqueId email role branch isActive service seniority department') // NEW: Include department
      .lean();
    if (!users) {
      console.error(`[${new Date().toISOString()}] getUsers: Database returned null for query:`, query);
      return res.status(500).json({
        success: false,
        message: 'Database error: No users found',
      });
    }
    console.log(`[${new Date().toISOString()}] getUsers: Fetched ${users.length} users`);
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: { users },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getUsers: Error:`, error.message, error.stack);
    let message = 'Server error while fetching users';
    if (error.name === 'MongoServerError') {
      message = 'Database error while fetching users';
    } else if (error.name === 'TypeError') {
      message = 'Invalid user data or configuration';
    }
    res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get User Profile (updated: Added service/seniority to response; Use UserProfile for membership fields; Aligned with model; NEW: Include department)
const getUserProfile = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] getUserProfile: User:`, req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    } : 'No user found');
    if (!req.user || !req.user.id) {
      console.error(`[${new Date().toISOString()}] getUserProfile: No authenticated user or missing user ID`);
      return res.status(401).json({
        success: false,
        message: 'No authenticated user found or user ID is missing',
      });
    }
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      console.error(`[${new Date().toISOString()}] getUserProfile: User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    let userProfile = await UserProfile.findOne({ userId }).lean();
    if (!userProfile) {
      console.warn(`[${new Date().toISOString()}] getUserProfile: Profile missing for user ${userId}, creating default...`);
      const isInternalRole = ['employee', 'manager', 'subadmin', 'head', 'tl'].includes(user.role);
      const defaultMembershipType = isInternalRole ? 'employee' : '';

      const newProfileData = {
        userId: user._id,
        email: user.email,
        phone: user.phone || '',
        isWhatsApp: false,
        address: '',
        country: user.country || 'Indian',
        location: '',
        membershipType: defaultMembershipType,
        professionalRole: '',
        company: '',
        college: '',
        degree: '',
        highestDegree: '',
        currentYear: '',
        passOutYear: '',
        yearOfExperience: '',
        previousExperiences: [],
        education: [],
        skills: [],
        bio: '',
        dob: '',
        branch: user.branch || '',
      };

      const createdProfile = await UserProfile.create(newProfileData);
      userProfile = createdProfile.toObject();
    }
    console.log(`[${new Date().toISOString()}] getUserProfile: User data:`, user);
    console.log(`[${new Date().toISOString()}] getUserProfile: User profile data:`, userProfile);
    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      user: {
        id: user._id,
        uniqueId: user.uniqueId || '',
        name: user.name || '',
        email: user.email || '',
        phone: userProfile.phone || user.phone || '',
        role: user.role ? user.role.toLowerCase() : 'user',
        department: user.department || '', // NEW: Include department
        service: user.service || '',
        seniority: user.seniority || null,
        isVerified: user.isVerified || false,
        address: userProfile.address || '',
        country: userProfile.country || '',
        location: userProfile.location || '',
        membershipType: userProfile.membershipType || '',
        subadminCategory: user.subadminCategory || [],
        professionalRole: userProfile.professionalRole || '',
        company: userProfile.company || '',
        college: userProfile.college || '',
        degree: userProfile.degree || '',
        highestDegree: userProfile.highestDegree || '',
        currentYear: userProfile.currentYear || '',
        passOutYear: userProfile.passOutYear || '',
        yearOfExperience: userProfile.yearOfExperience || '',
        previousExperiences: userProfile.previousExperiences || [],
        education: userProfile.education || [],
        skills: userProfile.skills || [],
        bio: userProfile.bio || '',
        dob: userProfile.dob || '',
        branch: userProfile.branch || '',
        isWhatsApp: userProfile.isWhatsApp || false,
        financeAccess: user.financeAccess || [],
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getUserProfile: Error:`, error.message, error.stack);
    let message = 'Server error while fetching user profile';
    res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update User Profile (updated: Added conditional handling/validation for service/seniority based on role; Conditional country/location validation; Aligned with model; NEW: Handle department update)
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { uniqueId, ...safeBody } = req.body;
    // uniqueId is stripped from safeBody and ignored for updates

    const {
      phone,
      address,
      country,
      location,
      membershipType,
      professionalRole,
      company,
      college,
      degree,
      highestDegree,
      currentYear,
      passOutYear,
      yearOfExperience,
      previousExperiences,
      education,
      skills,
      bio,
      dob,
      isWhatsApp,
      branch,
      service,
      seniority,
      department,
    } = safeBody;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      // Create profile if it doesn't exist (safety for legacy users)
      userProfile = await UserProfile.create({
        userId: user._id,
        email: user.email,
        phone: user.phone || '',
        country: user.country || 'Indian',
        branch: user.branch || 'Main',
      });
    }

    // Merge incoming changes with existing data for validation
    const validationData = {
      name: user.name,
      email: user.email,
      phone: phone !== undefined ? phone : (userProfile.phone || user.phone || ''),
      address: address !== undefined ? address : (userProfile.address || ''),
      country: country !== undefined ? country : (userProfile.country || user.country || 'Indian'),
      location: location !== undefined ? location : (userProfile.location || ''),
      membershipType: membershipType !== undefined ? membershipType : (userProfile.membershipType || ''),
      professionalRole: professionalRole !== undefined ? professionalRole : (userProfile.professionalRole || ''),
      company: company !== undefined ? company : (userProfile.company || ''),
      college: college !== undefined ? college : (userProfile.college || ''),
      degree: degree !== undefined ? degree : (userProfile.degree || ''),
      highestDegree: highestDegree !== undefined ? highestDegree : (userProfile.highestDegree || ''),
      currentYear: currentYear !== undefined ? currentYear : (userProfile.currentYear || ''),
      passOutYear: passOutYear !== undefined ? passOutYear : (userProfile.passOutYear || ''),
      yearOfExperience: yearOfExperience !== undefined ? yearOfExperience : (userProfile.yearOfExperience || ''),
      previousExperiences: previousExperiences !== undefined ? previousExperiences : (userProfile.previousExperiences || []),
      education: education !== undefined ? education : (userProfile.education || []),
      skills: skills !== undefined ? skills : (userProfile.skills || []),
      bio: bio !== undefined ? bio : (userProfile.bio || ''),
      dob: dob !== undefined ? dob : (userProfile.dob || ''),
      branch: branch !== undefined ? branch : (userProfile.branch || user.branch || ''),
      service: service !== undefined ? service : (user.service || ''),
      seniority: seniority !== undefined ? seniority : (user.seniority || null),
      department: department !== undefined ? department : (user.department || ''),
    };

    const errors = validateSignup(validationData, user.role, true); // true indicates it's an update
    if (errors.length > 0) {
      console.warn(`[${new Date().toISOString()}] ❌ Validation failed for user ${userId} (${user.role}):`, JSON.stringify(errors, null, 2));
      return res.status(400).json({ errors, success: false });
    }

    // Update UserProfile
    if (phone !== undefined) userProfile.phone = phone;
    if (isWhatsApp !== undefined) userProfile.isWhatsApp = isWhatsApp;
    if (address !== undefined) userProfile.address = address.trim();
    if (country !== undefined) userProfile.country = country.trim();
    if (location !== undefined) userProfile.location = location.trim();
    if (membershipType !== undefined) userProfile.membershipType = membershipType;
    if (professionalRole !== undefined) userProfile.professionalRole = professionalRole.trim();
    if (company !== undefined) userProfile.company = company.trim();
    if (college !== undefined) userProfile.college = college.trim();
    if (degree !== undefined) userProfile.degree = degree.trim();
    if (highestDegree !== undefined) userProfile.highestDegree = highestDegree;
    if (currentYear !== undefined) userProfile.currentYear = String(currentYear).trim();
    if (passOutYear !== undefined) userProfile.passOutYear = String(passOutYear).trim();
    if (yearOfExperience !== undefined) userProfile.yearOfExperience = String(yearOfExperience).trim();
    if (previousExperiences !== undefined) userProfile.previousExperiences = previousExperiences;
    if (education !== undefined) userProfile.education = education;
    if (skills !== undefined) userProfile.skills = skills;
    if (bio !== undefined) userProfile.bio = bio.trim();
    if (dob !== undefined) userProfile.dob = dob.trim();
    if (branch !== undefined) userProfile.branch = branch.trim();

    await userProfile.save();


    if (phone && phone !== user.phone) {
      user.phone = phone;
    }
    if (country && country !== user.country) {
      user.country = (country || '').trim();
    }
    if (branch && branch !== user.branch) {
      user.branch = (branch || '').trim();
    }
    // NEW: Update service/seniority if provided and role allows
    if (service !== undefined && service !== user.service) {
      if (req.user.role === 'user' && service.trim().length === 0) {
        user.service = '';
      } else if (req.user.role !== 'user' && service.trim().length >= 2) {
        user.service = service.trim();
      }
    }
    if (seniority !== undefined && seniority !== user.seniority) {
      if (req.user.role === 'employee' && ['junior', 'senior'].includes(seniority)) {
        user.seniority = seniority;
      } else if (req.user.role !== 'employee') {
        user.seniority = null;
      }
    }
    // UPDATED: Update department if provided
    if (department !== undefined && department !== user.department) {
      user.department = (department || '').trim();
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      userProfile,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Update User Profile Error:`, error.stack);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// Forgot Password (unchanged)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required', success: false });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000;
    await ResetPassword.create({
      userId: user._id,
      email: normalizedEmail,
      resetPasswordCode: resetCode,
      resetPasswordExpires: expiryTime,
      isVerified: false,
    });
    await transporter.sendMail({
      from: `"BioScience Hub" <${process.env.SMTP_FROM_EMAIL || process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}. It expires in 10 minutes.`,
    });
    res.status(200).json({ message: 'Reset code sent to email', success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Forgot Password Error for ${normalizedEmail}:`, error.message);
    
    // Developer Shortcut: Log the reset code even if mail fails
    const resetSession = await ResetPassword.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (resetSession && resetSession.resetPasswordCode) {
      console.log(`[${new Date().toISOString()}] 🛠️  DEVELOPER TIP: Use this reset code: ${resetSession.resetPasswordCode}`);
    }

    if (error.responseCode === 535) {
      return res.status(200).json({ 
        message: 'Mail server error. For testing, please check the server terminal for your code.',
        success: true,
        isDemoMode: true 
      });
    }

    res.status(500).json({ message: 'Server error', success: false });
  }
};

// Verify Reset Code (unchanged)
const verifyResetCode = async (req, res) => {
  try {
    let { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'Reset code is required', success: false });
    }
    otp = String(otp).trim();
    const resetRequest = await ResetPassword.findOne({
      resetPasswordCode: otp,
      resetPasswordExpires: { $gt: Date.now() },
    }).sort({ resetPasswordExpires: -1 });
    if (!resetRequest) {
      return res.status(400).json({ message: 'Invalid or expired reset code', success: false });
    }
    await ResetPassword.updateOne(
      { _id: resetRequest._id },
      { $set: { isVerified: true, verificationExpires: Date.now() + 10 * 60 * 1000 } }
    );
    res.status(200).json({ message: 'Code verified successfully', success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Verify Code Error:`, error.stack);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// Reset Password (unchanged)
const resetPassword = async (req, res) => {
  try {
    let { newPassword, otp } = req.body;
    if (!newPassword || !otp) {
      return res.status(400).json({ message: 'New password and OTP are required', success: false });
    }
    otp = String(otp).trim();
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
        success: false,
      });
    }
    const resetRequest = await ResetPassword.findOne({
      resetPasswordCode: otp,
      isVerified: true,
      verificationExpires: { $gt: Date.now() },
    });
    if (!resetRequest) {
      return res.status(400).json({ message: 'Reset session expired or invalid', success: false });
    }
    const user = await User.findById(resetRequest.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found', success: false });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedNewPassword } }
    );
    await ResetPassword.deleteMany({ userId: resetRequest.userId });
    res.status(200).json({ message: 'Password reset successfully', success: true });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Reset Password Error:`, error.stack);
    res.status(500).json({ message: 'Server error', success: false });
  }
};

// Get Staff Members (updated: Removed 'team manager'; Added 'subadmin' to query; Added service/seniority to select; NEW: Include department)
const getStaffMembers = asyncHandler(async (req, res) => {
  try {
    const { isActive } = req.query;
    console.log(`[${new Date().toISOString()}] getStaffMembers: Request query:`, { isActive });
    console.log(`[${new Date().toISOString()}] getStaffMembers: User:`, req.user ? {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
      email: req.user.email,
    } : 'No user found');
    if (!req.user || !req.user.id || !req.user.role) {
      console.error(`[${new Date().toISOString()}] getStaffMembers: No authenticated user or missing user properties`);
      return res.status(401).json({
        success: false,
        message: 'No authenticated user found or user data is incomplete',
      });
    }
    const userRole = req.user.role.toLowerCase();
    const userService = req.user.service;

    // Check if user is authorized (Admin, Subadmin, HR Manager, or Manager with filtering)
    const isFullAccess = userRole === 'admin' || userRole === 'subadmin' || req.isFullAttendanceAccess;
    const isServiceManager = userRole === 'manager' && userService;
    const isManagerPosition = (userRole === 'employee' || userRole === 'manager') && Array.isArray(req.user.managerPosition) && req.user.managerPosition.length > 0;

    if (!isFullAccess && !isServiceManager && !isManagerPosition) {
      console.error(`[${new Date().toISOString()}] getStaffMembers: Unauthorized access by user ${req.user.id} with role ${userRole}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Authorized role required.',
      });
    }

    const { service, roles } = req.query;

    let query = {};

    // Role filter: Use provided roles or default set
    if (roles && typeof roles === 'string') {
      query.role = { $in: roles.split(',').map(r => r.trim().toLowerCase()) };
    } else {
      query.role = { $in: ['employee', 'head', 'manager', 'tl', 'subadmin'] };
    }
    if (service) {
      // If user is a service manager, ensure they can only query their own service
      if (isServiceManager && !isFullAccess && service !== userService) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view staff in your service.',
        });
      }
      query.service = service;
    } else if (isServiceManager && !isFullAccess) {
      // Force service filter for service managers if not specified
      query.service = userService;
    }

    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        console.error(`[${new Date().toISOString()}] getStaffMembers: Invalid isActive value: ${isActive}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid isActive value. Must be "true" or "false"',
        });
      }
      query.isActive = isActive === 'true';
    } else {
      // Default to active staff
      query.isActive = true;
    }
    console.log(`[${new Date().toISOString()}] getStaffMembers: MongoDB query:`, query);
    const staffMembers = await User.find(query)
      .select('_id name uniqueId email role branch isActive service seniority department') // NEW: Include department
      .lean();
    if (!staffMembers) {
      console.error(`[${new Date().toISOString()}] getStaffMembers: Database returned null for query:`, query);
      return res.status(500).json({
        success: false,
        message: 'Database error: No staff members found',
      });
    }
    console.log(`[${new Date().toISOString()}] getStaffMembers: Fetched ${staffMembers.length} staff members`);
    res.status(200).json({
      success: true,
      message: 'Staff members retrieved successfully',
      data: { staffMembers },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getStaffMembers: Error:`, error.message, error.stack);
    let message = 'Server error while fetching staff members';
    if (error.name === 'MongoServerError') {
      message = 'Database error while fetching staff members';
    } else if (error.name === 'TypeError') {
      message = 'Invalid user data or configuration';
    }
    res.status(500).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Send Login Verification OTP
const sendLoginOtp = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.loginOtp = otp;
    user.loginOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const mailOptions = {
      from: `"Support System" <${process.env.SMTP_FROM_EMAIL || 'cag_team@ponnaiyacag.com'}>`,
      to: user.email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
          <div style="max-width:600px; margin:auto; background:#fff; border-radius:8px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,.08);">
            <h2 style="color:#1a1a2e; text-align:center;">Email Verification</h2>
            <p style="color:#444; line-height:1.6; text-align:center;">
              Your verification code for logging in is:
            </p>
            <h1 style="text-align:center; color:#6366f1; letter-spacing:4px; font-size:36px; margin:20px 0;">
              ${otp}
            </h1>
            <p style="color:#444; line-height:1.6; text-align:center;">
              This code will expire in 10 minutes. Please do not share this code with anyone.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] ✅ Login verification OTP sent to ${user.email}`);

    res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    // SECURITY: Log the OTP to the console so the developer can see it if email fails
    console.error(`[${new Date().toISOString()}] ❌ Error in sendLoginOtp:`, error.message);
    
    // Check if the user is authenticated (middleware should handle this, but double check)
    if (user && user.loginOtp) {
      console.log(`[${new Date().toISOString()}] 🛠️  DEVELOPER TIP: Use this code to bypass email failure: ${user.loginOtp}`);
    } else {
      console.log(`[${new Date().toISOString()}] 🛠️  DEVELOPER TIP: Check your database or middleware for current user context.`);
    }

    if (error.responseCode === 535) {
      return res.status(200).json({ 
        success: true, 
        message: 'Mail server error. For testing, please check the server terminal for your code.',
        isDemoMode: true 
      });
    }

    res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
});

// Verify Login Verification OTP
const verifyLoginOtp = asyncHandler(async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.loginOtp || user.loginOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    if (Date.now() > user.loginOtpExpires) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    user.loginOtp = null;
    user.loginOtpExpires = null;
    await user.save({ validateBeforeSave: false });

    console.log(`[${new Date().toISOString()}] Login verification OTP successful for ${user.email}`);

    res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in verifyLoginOtp:`, error);
    res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  verifyResetCode,
  getStaffMembers,
  getUsers,
  getUserProfile,
  getUserProfile,
  updateUserProfile,
  sendLoginOtp,
  verifyLoginOtp
};