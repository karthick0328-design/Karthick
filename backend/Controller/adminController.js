// controllers/adminController.js
// Handles admin-specific operations, including creating pending internal users
// (for roles: subadmin, employee, head, manager, tl, employee)
// Admin provides uniqueId (pre-generated or auto), email, role, and other basic fields
// Sets isPasswordSet: true (password is set and hashed), isActive: true, isVerified: true
// Updated: For subadmin role, department is now required and limited to specific departments.
// Removed subadminCategory entirely.
// Fixed: Set service to provided value or empty for internal users to satisfy validation.

const User = require('../models/User');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('../models/Counter');
const Drive = require('../models/Drive');
const Announcement = require('../models/Announcement');
const Payment = require('../models/Payment');
const Meeting = require('../models/Meeting');
const CashBookEntry = require('../models/CashBookEntry');
const Expense = require('../models/Expense');
const JobApplication = require('../models/JobApplication');
const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');

const createInternalUser = async (req, res) => {
  try {
    const {
      uniqueId,
      email,
      role,
      branch,
      phone = '',
      name = '',
      password,
      confirmPassword,
      department,
      service = ''
    } = req.body;

    // SEC-FIX: Sanitize logs (don't log full req.body)
    console.log(`[${new Date().toISOString()}] Create internal user request for email: ${email}`);

    // SEC-FIX: Type validation to prevent type confusion bypasses
    if (typeof email !== 'string') {
      return res.status(400).json({ success: false, errors: [{ field: 'email', message: 'Email must be a string' }] });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'email', message: 'Invalid email format' }],
      });
    }

    // Validate role is internal (removed 'team manager' as per model update)
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
    if (!internalRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: subadmin, employee, head, manager, tl, admin, superadmin',
      });
    }

    // Validate branch
    if (!branch || typeof branch !== 'string' || !branch.trim()) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'branch', message: 'Branch is required and must be a string' }],
      });
    }

    // Validate department (required for all internal roles, including subadmin)
    let trimmedDepartment = '';
    if (!department || typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'department', message: 'Department is required and must be a string' }],
      });
    }
    trimmedDepartment = department.trim();
    if (trimmedDepartment.length < 2) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'department', message: 'Department must be at least 2 characters long' }],
      });
    }
    if (trimmedDepartment.length > 100) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'department', message: 'Department must be less than 100 characters' }],
      });
    }

    // For subadmin, restrict to specific departments
    if (role === 'subadmin') {
      const validSubadminDepartments = ['Sales & Customer Services', 'Human Resources', 'Financial'];
      if (!validSubadminDepartments.includes(trimmedDepartment)) {
        return res.status(400).json({
          success: false,
          errors: [{
            field: 'department',
            message: `For subadmin, department must be one of: ${validSubadminDepartments.join(', ')}`
          }],
        });
      }
    }

    // Validate service if provided
    let trimmedService = (service && typeof service === 'string') ? service.trim() : '';
    if (trimmedService && !['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'BioChemistry', 'Molecular Biology'].includes(trimmedService)) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'service', message: 'Invalid service. Must be one of: NGS, Drug Discovery, Software Development, Microbiology, BioChemistry, Molecular Biology' }],
      });
    }

    // Validate name
    if (typeof name !== 'string') {
      return res.status(400).json({ success: false, errors: [{ field: 'name', message: 'Name must be a string' }] });
    }
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'name', message: 'Name must be at least 2 characters long' }],
      });
    }

    // Validate phone
    if (typeof phone !== 'string') {
      return res.status(400).json({ success: false, errors: [{ field: 'phone', message: 'Phone must be a string' }] });
    }
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !/^\+?\d{10,12}$/.test(trimmedPhone)) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'phone', message: 'Please enter a valid phone number (10-12 digits)' }],
      });
    }

    // Validate password
    const trimmedPassword = (password && typeof password === 'string') ? password.trim() : '';
    if (!trimmedPassword) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'password', message: 'Password is required' }],
      });
    }
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
    if (!strongPasswordRegex.test(trimmedPassword)) {
      return res.status(400).json({
        success: false,
        errors: [{
          field: 'password',
          message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
        }],
      });
    }
    const trimmedConfirmPassword = confirmPassword ? String(confirmPassword).trim() : '';
    if (trimmedPassword !== trimmedConfirmPassword) {
      return res.status(400).json({
        success: false,
        errors: [{ field: 'confirmPassword', message: 'Passwords do not match' }],
      });
    }

    // If uniqueId not provided, generate it
    let finalUniqueId = uniqueId ? String(uniqueId).trim() : '';
    if (!finalUniqueId) {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'userId' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true }
      );
      finalUniqueId = `CAG${counter.sequence.toString().padStart(3, '0')}`;
    } else {
      // Enforce CAG format for provided uniqueId to match schema
      if (!/^CAG\d+$/.test(finalUniqueId)) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'uniqueId', message: 'Unique ID must follow the format CAG<number>' }],
        });
      }
    }

    // Check if uniqueId or email already exists
    const existingUser = await User.findOne({
      $or: [{ uniqueId: finalUniqueId }, { email: trimmedEmail }],
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Unique ID or email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(trimmedPassword, salt);

    // Create user
    const newUser = new User({
      uniqueId: finalUniqueId,
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      phone: trimmedPhone,
      country: 'Indian',
      branch: branch.trim(),
      role,
      department: trimmedDepartment,
      service: trimmedService, // Use provided service or empty
      isPasswordSet: true, // Password is set and hashed
      isActive: true, // Active immediately
      isVerified: true, // Verified by admin creation
    });

    // Prevent pre-save from re-hashing (since already hashed)
    newUser.isModified('password', false);

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Internal user created successfully',
      data: {
        id: newUser._id, // Added id
        uniqueId: newUser.uniqueId,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        service: newUser.service,
        instructions: 'Share the uniqueId, email, and password with the user.',
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] âŒ Error creating internal user:`, error.message);
    // If it's a Mongoose validation error, extract field errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        errors: Object.entries(validationErrors).map(([field, message]) => ({ field, message })),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating internal user',
    });
  }
};

// GET /api/adminassignments/internal-users/:id - View single internal user (adjusted path comment for mounting)
const getInternalUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching internal user with ID: ${id}`); // Added logging for debugging
    if (!id || id === 'undefined' || id === '' || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid user ID detected:', id); // Debug log
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided. Please check the user ID in the request.',
      });
    }
    const user = await User.findById(id).select('-password').lean(); // Exclude password for security; added lean() for perf
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    // Ensure it's an internal user
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
    if (!internalRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Not an internal user.',
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('âŒ Error fetching internal user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user',
    });
  }
};

// PUT /api/adminassignments/internal-users/:id - Edit internal user
const updateInternalUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Updating internal user with ID: ${id}`); // Added logging
    if (!id || id === 'undefined' || id === '' || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid user ID for update:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided',
      });
    }
    const updates = req.body; // { name?, email?, phone?, branch?, department?, role?, service? }

    // Fetch current user to preserve fields not being updated
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Build update object conditionally
    const updateObj = {};

    // Validate and set email if provided
    if (updates.email !== undefined) {
      if (typeof updates.email !== 'string' || !updates.email.trim()) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'email', message: 'Email is required and must be a string' }],
        });
      }
      const trimmedEmail = updates.email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'email', message: 'Invalid email format' }],
        });
      }
      // Check uniqueness
      const existingUser = await User.findOne({ email: trimmedEmail }).where({ _id: { $ne: id } });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists',
        });
      }
      updateObj.email = trimmedEmail;
    }

    // Validate and set role if provided
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
    if (updates.role !== undefined) {
      if (!internalRoles.includes(updates.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be one of: subadmin, employee, head, manager, tl, admin, superadmin',
        });
      }
      updateObj.role = updates.role;
    }

    // Validate and set branch if provided
    if (updates.branch !== undefined) {
      if (typeof updates.branch !== 'string' || !updates.branch.trim()) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'branch', message: 'Branch is required and must be a string' }],
        });
      }
      updateObj.branch = updates.branch.trim();
    }

    // Validate and set department if provided (required for all internal roles)
    if (updates.department !== undefined) {
      if (typeof updates.department !== 'string' || !updates.department.trim()) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'department', message: 'Department is required and must be a string' }],
        });
      }
      const trimmedDepartment = updates.department.trim();
      if (trimmedDepartment.length < 2 || trimmedDepartment.length > 100) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'department', message: 'Department must be between 2-100 characters' }],
        });
      }

      // For subadmin, restrict to specific departments
      if (updates.role === 'subadmin' || currentUser.role === 'subadmin') {
        const validSubadminDepartments = ['Sales & Customer Services', 'Human Resources', 'Financial'];
        if (!validSubadminDepartments.includes(trimmedDepartment)) {
          return res.status(400).json({
            success: false,
            errors: [{
              field: 'department',
              message: `For subadmin, department must be one of: ${validSubadminDepartments.join(', ')}`
            }],
          });
        }
      }
      updateObj.department = trimmedDepartment;
    }

    // Validate and set service if provided
    if (updates.service !== undefined) {
      const trimmedService = (typeof updates.service === 'string' && updates.service) ? updates.service.trim() : '';
      if (trimmedService && !['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'BioChemistry', 'Molecular Biology'].includes(trimmedService)) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'service', message: 'Invalid service. Must be one of: NGS, Drug Discovery, Software Development, Microbiology, BioChemistry, Molecular Biology' }],
        });
      }
      updateObj.service = trimmedService;
    }

    // Validate and set name if provided
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string') {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'name', message: 'Name must be a string' }],
        });
      }
      const trimmedName = updates.name.trim();
      if (!trimmedName || trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'name', message: 'Name must be at least 2 characters long' }],
        });
      }
      updateObj.name = trimmedName;
    }

    // Validate and set phone if provided
    if (updates.phone !== undefined) {
      if (typeof updates.phone !== 'string') {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'phone', message: 'Phone must be a string' }],
        });
      }
      const trimmedPhone = updates.phone.trim();
      if (!trimmedPhone || !/^\+?\d{10,12}$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          errors: [{ field: 'phone', message: 'Please enter a valid phone number (10-12 digits)' }],
        });
      }
      updateObj.phone = trimmedPhone;
    }

    // If password is provided, hash it
    if (updates.password) {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
      if (!strongPasswordRegex.test(updates.password)) {
        return res.status(400).json({
          success: false,
          errors: [{
            field: 'password',
            message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
          }],
        });
      }
      const salt = await bcrypt.genSalt(12);
      const passwordToHash = typeof updates.password === 'string' ? updates.password.trim() : String(updates.password);
      updateObj.password = await bcrypt.hash(passwordToHash, salt);
    }

    // If no updates, return early
    if (Object.keys(updateObj).length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No changes provided',
        data: currentUser.select('-password'),
      });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateObj,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity if there were changes
    const changedFields = Object.keys(updateObj).filter(key => key !== 'password');
    if (changedFields.length > 0) {
      const activityDescription = `Admin updated user details: ${changedFields.join(', ')}`;
      updatedUser.activities.push({ description: activityDescription, createdAt: new Date() });
      await updatedUser.save();
    }

    res.status(200).json({
      success: true,
      message: 'Internal user updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('âŒ Error updating internal user:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        errors: Object.entries(validationErrors).map(([field, message]) => ({ field, message })),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating user',
    });
  }
};

// DELETE /api/adminassignments/internal-users/:id - Delete internal user
const deleteInternalUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Deleting internal user with ID: ${id}`); // Added logging
    if (!id || id === 'undefined' || id === '' || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid user ID for delete:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided',
      });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
    if (!internalRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Not an internal user.',
      });
    }
    await User.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: 'Internal user deleted successfully',
    });
  } catch (error) {
    console.error('âŒ Error deleting internal user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
    });
  }
};

// GET /api/adminassignments/internal-users/:id/history - Get user history (activities)
const getUserHistory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching history for user ID: ${id}`); // Added logging
    if (!id || id === 'undefined' || id === '' || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid user ID for history:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID provided',
      });
    }
    const user = await User.findById(id).select('activities importantDates');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.status(200).json({
      success: true,
      data: {
        activities: user.activities,
        importantDates: user.importantDates,
      },
    });
  } catch (error) {
    console.error('âŒ Error fetching user history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching history',
    });
  }
};

// GET /api/adminassignments/history - Get paginated admin history (all activities across internal users)
const getAdminHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];

    // Aggregate activities across all internal users
    const activitiesPipeline = [
      { $match: { role: { $in: internalRoles } } },
      { $unwind: { path: '$activities', preserveNullAndEmptyArrays: false } }, // Only users with activities
      { $sort: { 'activities.createdAt': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users', // Assuming same collection
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$userDetails.name',
          userEmail: '$userDetails.email',
          userRole: '$userDetails.role',
          activity: {
            description: '$activities.description',
            createdAt: '$activities.createdAt'
          }
        }
      }
    ];

    const activities = await User.aggregate(activitiesPipeline);

    // Get total count
    const countPipeline = [
      { $match: { role: { $in: internalRoles } } },
      { $unwind: { path: '$activities', preserveNullAndEmptyArrays: false } },
      { $count: 'total' }
    ];
    const countResult = await User.aggregate(countPipeline);
    const totalCount = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching admin history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching admin history'
    });
  }
};

const getAllInternalUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];

    const users = await User.find({ role: { $in: internalRoles } })
      .select('-password') // Exclude password for security
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({ role: { $in: internalRoles } });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching internal users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching internal users',
    });
  }
};

const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.query;
    const query = jobId ? { jobId } : {};
    const applications = await JobApplication.find(query).populate('jobId', 'title jobTitle').sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateJobApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const application = await JobApplication.findByIdAndUpdate(id, { status, notes }, { new: true });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAdminDashboard = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let days = 30; // default 30 days
    if (timeRange === '24h') days = 1;
    else if (timeRange === '7d') days = 7;
    else if (timeRange === '90d') days = 90;

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Stats metrics
    // Stats metrics - OVERALL TOTALS
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalMembers = await User.countDocuments({ 
      role: { $in: ['admin', 'subadmin', 'head', 'manager', 'tl', 'employee', 'superadmin'] }
    });
    
    // Total Projects in range for secondary stats
    const poRegex = /^\s*Purchase Order\s*$/i;
    const totalProjects = await Project.countDocuments({ createdAt: { $gte: cutoffDate }, category: { $not: poRegex } });
    const completedProjects = await Project.countDocuments({ status: 'Completed', createdAt: { $gte: cutoffDate }, category: { $not: poRegex } });

    // Revenue calculation from projects (Total for the range)
    const projectsInRange = await Project.find({ createdAt: { $gte: cutoffDate }, category: { $not: poRegex } }, 'paymentDetails.paidAmount paymentDetails.amount quotedAmount');
    let totalRevenue = 0;
    let expectedRevenue = 0;
    projectsInRange.forEach(p => {
      if (p.paymentDetails && p.paymentDetails.paidAmount) {
        totalRevenue += p.paymentDetails.paidAmount;
      }
      
      let amount = 0;
      if (p.paymentDetails && p.paymentDetails.amount) {
        amount = p.paymentDetails.amount;
      } else if (p.quotedAmount) {
        amount = p.quotedAmount;
      }
      expectedRevenue += amount;
    });
    
    let remainingAmount = expectedRevenue - totalRevenue;
    if (remainingAmount < 0) remainingAmount = 0;

    // Recent Activities
    const recentProjectsRecords = await Project.find({ category: { $ne: 'Purchase Order' } })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(8);

    const recentActivities = recentProjectsRecords.map(p => {
      const timeDiff = Math.abs(new Date() - new Date(p.createdAt));
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const timeStr = hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)} days ago`;

      return {
        id: p._id.toString(),
        user: p.userId ? p.userId.name : 'Unknown User',
        action: `Initiated ${p.category || 'New Project'} in ${p.department}`,
        time: timeStr,
        type: 'info',
        avatar: p.userId && p.userId.name ? p.userId.name.substring(0, 2).toUpperCase() : 'U'
      };
    });

    // Stats for Display
    const statsData = [
      {
        title: 'Total Member',
        value: totalMembers.toString(),
        change: 8.2,
        icon: 'UsersRound',
        color: 'bg-indigo-500',
        description: `Active hierarchy personnel`
      },
      {
        title: 'Total User',
        value: totalUsers.toString(),
        change: 5.2,
        icon: 'Users',
        color: 'bg-blue-500',
        description: `External registered clients`
      },
      {
        title: 'Active Projects',
        value: await Project.countDocuments({ status: { $nin: ['Completed', 'Cancelled'] }, category: { $not: /^\s*Purchase Order\s*$/i } }).then(c => c.toString()),
        change: 12.5,
        icon: 'BookOpen',
        color: 'bg-green-500',
        description: `Currently running projects`
      },
      {
        title: 'Revenue Flow',
        value: `₹${totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(1) + 'K' : totalRevenue}`,
        change: 8.4,
        icon: 'DollarSign',
        color: 'bg-purple-500',
        description: `Collected in last ${days} days`
      }
    ];

    // Recent Projects list for overview pipeline table (Enhanced mapping)
    const recentProjectsList = await Project.find({ category: { $not: /^\s*Purchase Order\s*$/i }, status: { $nin: ['Completed', 'Cancelled'] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id uniqueId paymentDetails.title category department status workflowStep projectProgress createdAt')
      .lean();

    const projects = recentProjectsList.map(p => {
      // Extract numeric progress from "XX%" string or fallback to workflowStep
      let progressVal = 0;
      if (p.projectProgress && typeof p.projectProgress === 'string') {
          const match = p.projectProgress.match(/(\d+)%/);
          if (match) {
              progressVal = parseInt(match[1], 10);
          } else {
              progressVal = (p.workflowStep || 0) * 20;
          }
      } else {
          progressVal = (p.workflowStep || 0) * 20; // 5 stages
      }

      // Ensure progressVal is within 0-100
      progressVal = Math.min(Math.max(progressVal || 0, 0), 100);

      const displayTitle = (p.paymentDetails && p.paymentDetails.title) || p.category || p.uniqueId || 'Untitled Project';

      return {
        _id: p._id.toString(),
        projectId: p.uniqueId || p._id.toString(),
        name: displayTitle,
        title: displayTitle,
        category: p.category || 'General',
        department: p.department || '—',
        status: p.status || 'Active',
        progress: progressVal,
        createdAt: p.createdAt
      };
    });

    // Improved Line Graph Data: Fill in days with 0 projects
    const trend = await Project.aggregate([
      { $match: { createdAt: { $gte: cutoffDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const trendMap = new Map(trend.map(t => [t._id, t.count]));
    const lineGraphData = [];
    for (let i = 0; i <= days; i++) {
        const d = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        lineGraphData.push({
            name: label,
            date: label,
            value: trendMap.get(dateStr) || 0
        });
    }

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalMembers: totalMembers.toString(),
          totalUsers: totalUsers.toString(),
          totalProjects: totalProjects.toString(),
          totalRevenue: `₹${(totalRevenue).toLocaleString()}`,
          expectedRevenue: `₹${(expectedRevenue).toLocaleString()}`,
          remainingAmount: `₹${(remainingAmount).toLocaleString()}`,
          revenuePercentage: expectedRevenue > 0 ? ((totalRevenue / expectedRevenue) * 100).toFixed(1) : 0,
          completionRate: `${(totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0).toFixed(1)}%`
        },
        stats: statsData,
        recentActivities,
        projects,
        lineGraphData
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching admin dashboard:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching dashboard' });
  }
};

const getAdminProjectsByDept = async (req, res) => {
  try {
    const { department } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Map URL slug to DB department name if necessary
    const deptMap = {
      'drug-discovery': 'Drug Discovery',
      'molecular': 'Molecular Biology',
      'ngs': 'NGS Analysis',
      'software': 'Software Development'
    };
    
    const dbDept = deptMap[department] || department;

    const projects = await Project.find({ department: dbDept })
      .populate('userId', 'name email uniqueId')
      .populate('teamLeadId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments({ department: dbDept });

    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching admin projects by dept:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching projects' });
  }
};

const getAdminAnalytics = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    let days = 30;
    if (timeRange === '7d') days = 7;
    else if (timeRange === '90d') days = 90;

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Project Status Distribution
    const statusDistribution = await Project.aggregate([
      { $match: { createdAt: { $gte: cutoffDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Projects per Department
    const deptDistribution = await Project.aggregate([
      { $match: { createdAt: { $gte: cutoffDate } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    // 3. Growth trend (Projects created per day)
    const trend = await Project.aggregate([
      { $match: { createdAt: { $gte: cutoffDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        deptDistribution,
        trend
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching admin analytics:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching analytics' });
  }
};

const getAllClients = async (req, res) => {
  try {
    // Increased limit to 100 to ensure we get most clients if frontend isn't paginating
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const clients = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Fetch ALL projects for each client
    const clientsWithProjects = await Promise.all(clients.map(async (client) => {
      const allProjects = await Project.find({ userId: client._id })
        .sort({ createdAt: -1 })
        .select('uniqueId category status workflowStep paymentDetails.title projectProgress')
        .lean();
      
      return {
        ...client,
        projects: allProjects.map(p => {
          // Calculate progress priority logic
          let progressNum = 0;
          if (p.projectProgress && typeof p.projectProgress === 'string') {
            const match = p.projectProgress.match(/(\d+)%/);
            if (match) {
              progressNum = parseInt(match[1], 10);
            } else {
              progressNum = (p.workflowStep || 0) * 20;
            }
          } else {
            progressNum = (p.workflowStep || 0) * 20; // 5 steps usually
          }
          
          progressNum = Math.min(Math.max(progressNum || 0, 0), 100);

          return {
            projectId: p.uniqueId,
            title: p.paymentDetails?.title || p.category || 'Untitled Project',
            status: p.status || 'Active',
            progress: progressNum
          };
        })
      };
    }));

    const total = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      success: true,
      data: clientsWithProjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching clients:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching clients',
    });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = status ? { status } : {};

    const projects = await Project.find(query)
      .populate('userId', 'name email uniqueId')
      .populate('teamLeadId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all projects:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching all projects',
    });
  }
};

const getAdminProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Support finding by either _id or uniqueId
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { uniqueId: id };

    const project = await Project.findOne(query)
      .populate('userId', 'name email uniqueId department phone branch')
      .populate('teamLeadId', 'name email uniqueId role')
      .populate('teamMembers', 'name email uniqueId role')
      .populate('assignedTo', 'name email uniqueId role')
      .populate('activities.updatedBy', 'name role')
      .populate('messages.senderId', '_id name email uniqueId role');

    if (!project) {
        return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (project.activities) {
        project.activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    if (project.messages && Array.isArray(project.messages)) {
        project.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    let mainProject = project;
    let allPurchaseOrders = [];
    let parentContext = null;

    // If this is a Purchase Order category, we need to find the "Main" project it belongs to
    if (project.category === 'Purchase Order' && project.formData?.referenceId) {
        const potentialParent = await Project.findById(project.formData.referenceId)
            .populate('userId', 'name email uniqueId department phone branch')
            .populate('teamLeadId', 'name email uniqueId role')
            .populate('teamMembers', 'name email uniqueId role')
            .populate('assignedTo', 'name email uniqueId role')
            .populate('activities.updatedBy', 'name role')
            .populate('messages.senderId', '_id name email uniqueId role');

        if (potentialParent) {
            parentContext = potentialParent;
            // Now fetch ALL POs for this main project including THIS one
            allPurchaseOrders = await Project.find({
                category: 'Purchase Order',
                'formData.referenceId': potentialParent._id.toString()
            }).populate('purchaseDetails.assignedEmployee', 'name email')
              .populate('financialReview.requestedBy', 'name role email')
              .lean();
        } else {
            // Standalone PO with no parent found
            allPurchaseOrders = [project.toObject()];
        }
    } else {
        // Typical Project, fetch its linked POs
        allPurchaseOrders = await Project.find({
            category: 'Purchase Order',
            'formData.referenceId': project._id.toString()
        }).populate('purchaseDetails.assignedEmployee', 'name email')
          .populate('financialReview.requestedBy', 'name role email')
          .lean();
    }

    const responseData = mainProject.toObject();
    responseData.linkedPurchaseOrders = allPurchaseOrders;
    if (parentContext) {
        responseData.parentProjectContext = parentContext.toObject();
    }


    res.status(200).json({
        success: true,
        data: responseData
    });
  } catch (error) {
    console.error('❌ Error fetching project details:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching project details' });
  }
};

const getDriveUsage = async (req, res) => {
  try {
    const { userId, role } = req.query;
    let matchStage = {};

    if (userId) {
      matchStage = { userId: new mongoose.Types.ObjectId(userId) };
    } else if (role) {
      // Find all users with this role
      const users = await User.find({ role }).select('_id').lean();
      const userIds = users.map(u => u._id);
      matchStage = { userId: { $in: userIds } };
    }

    const usage = await Drive.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          totalSize: { $sum: '$size' },
          fileCount: { $sum: 1 }
        }
      }
    ]);

    const totalUsage = await Drive.aggregate([
      { $match: matchStage },
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        categories: usage,
        total: totalUsage[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching drive usage:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching drive usage' });
  }
};

const getAnnouncements = async (req, res) => {
  try {
    const { category } = req.query; // 'Announcement', 'Advertisement', 'Job Opening'
    const query = category ? { category } : {};
    const data = await Announcement.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching announcements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // First, try to get from Payment collection (legacy or new architecture)
    let query = userId ? { userId } : {};
    let payments = await Payment.find(query)
      .populate('projectId', 'title uniqueId category quotedAmount paymentDetails')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Second, if no payments or to get comprehensive list, fetch from Projects that have paymentDetails
    let projectQuery = userId ? { userId } : { paymentStatus: { $ne: 'Pending' }, paymentDetails: { $exists: true } };
    const projectsWithPayments = await Project.find(projectQuery)
        .populate('userId', 'name email role')
        .sort({ updatedAt: -1 })
        .lean();

    // Map projects to synthetic payment objects
    const projectPayments = projectsWithPayments.map(p => ({
        _id: `PROJECT_PAY_${p._id}`,
        projectId: {
            _id: p._id,
            uniqueId: p.uniqueId,
            title: p.paymentDetails?.title || p.category,
            category: p.category,
            quotedAmount: p.quotedAmount,
            paymentDetails: p.paymentDetails
        },
        userId: p.userId,
        amount: p.paymentDetails?.paidAmount || 0,
        paymentType: p.paymentDetails?.paidAmount >= (p.paymentDetails?.amount || 0) ? 'final' : 'partial',
        method: p.paymentDetails?.paymentMethod || 'Other',
        status: ['Full Paid', '50% Paid', 'Official Receipt Issued', 'Receipt Issued'].includes(p.paymentStatus) ? 'completed' : 'pending',
        paidAt: p.paidAt || p.paymentDetails?.userSubmittedAt,
        createdAt: p.paymentDetails?.userSubmittedAt || p.createdAt,
        isSynthetic: true
    }));

    // Merge and filter out duplicates if needed (by project ID as a simple heuristic for this unified view)
    const combined = [...payments];
    const existingProjectIds = new Set(payments.map(pay => pay.projectId?._id?.toString()));
    
    projectPayments.forEach(pp => {
        if (!existingProjectIds.has(pp.projectId?._id?.toString())) {
            combined.push(pp);
        }
    });

    // Final sort
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: combined });
  } catch (error) {
    console.error('âŒ Error fetching all payments:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching payments' });
  }
};

const getServiceProfit = async (req, res) => {
  try {
    // Fetch all projects to have a complete picture of revenue (potential and actual)
    const projects = await Project.find();
    
    // Aggregate by category (Service Unit) - EXCLUDING Purchase Orders from Earnings Stream
    const stats = {};
    const poRegex = /^\s*Purchase Order\s*$/i;

    projects.filter(p => !poRegex.test(p.category || 'General')).forEach(p => {
      let rawCat = (p.category || 'General').trim();
      
      if (!stats[rawCat]) stats[rawCat] = { revenue: 0, count: 0, completedCount: 0, paidRevenue: 0 };
      
      let totalQuote = Number(p.quotedAmount) || 0;
      let paid = Number(p.paymentDetails?.paidAmount) || 0;

      stats[rawCat].revenue += totalQuote;
      stats[rawCat].paidRevenue += paid;
      stats[rawCat].count += 1;
      
      if (['Completed'].includes(p.status)) {
        stats[rawCat].completedCount += 1;
      }
    });

    const data = Object.keys(stats).map(name => {
      const s = stats[name];
      const margin = s.revenue > 0 ? Math.round((s.paidRevenue / s.revenue) * 100) : 0;
      return {
        name,
        revenue: s.revenue,
        paidRevenue: s.paidRevenue,
        projects: s.count,
        completedProjects: s.completedCount,
        margin: `${margin}%`
      };
    });

    const poStats = { totalVolume: 0, count: 0, completedCount: 0, approvedVolume: 0 };
    projects.filter(p => poRegex.test(p.category || 'General')).forEach(p => {
      poStats.count += 1;
      let estimate = Number(p.financialReview?.requestedAmount) || Number(p.quotedAmount) || 0;
      let actual = Number(p.financialReview?.approvedAmount) || Number(p.purchaseDetails?.amountSent) || 0;
      
      poStats.totalVolume += estimate;
      poStats.approvedVolume += actual;
      if (['Completed'].includes(p.status)) {
        poStats.completedCount += 1;
      }
    });

    res.status(200).json({ success: true, data, purchases: poStats });
  } catch (error) {
    console.error('âŒ Error fetching service profit:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllMeetings = async (req, res) => {
  try {
    const data = await Meeting.find()
      .populate('managerId', 'name email role')
      .populate('participants', 'name email role')
      .sort({ startTime: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching all meetings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCashBook = async (req, res) => {
  try {
    const data = await CashBookEntry.find().populate('recordedBy', 'name').sort({ date: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching cashbook:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getExpenses = async (req, res) => {
  try {
    const data = await Expense.find().populate('recordedBy', 'name').sort({ receiptDate: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching expenses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSalaries = async (req, res) => {
  try {
    const data = await Salary.find().populate('userId', 'name email role').sort({ year: -1, month: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching salaries:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    
    if (month && year) {
        // Find for specific month of a specific year
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
    } else if (year) {
        // Find for entire year
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
    }

    const data = await Attendance.find(query)
      .populate('userId', 'name role service department')
      .sort({ date: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching attendance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createExpense = async (req, res) => {
  try {
    const { receiptDate, category, basicAmount, taxAmount, paidTo, paymentMode, description } = req.body;
    const totalAmount = parseFloat(basicAmount) + (parseFloat(taxAmount) || 0);

    const expenseData = {
        receiptDate,
        category,
        basicAmount: parseFloat(basicAmount),
        taxAmount: parseFloat(taxAmount) || 0,
        totalAmount,
        paidTo,
        paymentMode,
        description,
        recordedBy: req.user.id || req.user._id
    };

    if (req.file) {
        expenseData.receiptUrl = `/uploads/financial/${req.file.filename}`;
    }

    const expense = await Expense.create(expenseData);
    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    console.error('âŒ Error creating expense:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    await expense.deleteOne();
    res.status(200).json({ success: true, message: 'Expense removed' });
  } catch (error) {
    console.error('âŒ Error deleting expense:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getGSTReport = async (req, res) => {
  try {
    const data = await Expense.find({ taxAmount: { $gt: 0 } }).populate('recordedBy', 'name').sort({ receiptDate: -1 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('âŒ Error fetching GST report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getRecruitmentData = async (req, res) => {
  try {
    const vacancies = await Announcement.find({ category: 'Job Opening' }).sort({ createdAt: -1 });
    // Assuming applications are tracked by Announcement.applicationsCount for now
    // or simply returning an empty list if not implemented separately
    res.status(200).json({ 
      success: true, 
      data: {
        vacancies,
        applications: [] // Future: Add Application model integration
      } 
    });
  } catch (error) {
    console.error('âŒ Error fetching recruitment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createSalary = async (req, res) => {
  try {
    const salaryData = req.body;
    const salary = new Salary(salaryData);
    await salary.save();
    res.status(201).json({ success: true, data: salary });
  } catch (error) {
    console.error('âŒ Error creating salary:', error);
    res.status(500).json({ success: false, message: 'Server error while creating salary' });
  }
};

const deleteSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findByIdAndDelete(id);
    if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found' });
    res.status(200).json({ success: true, message: 'Salary record deleted successfully' });
  } catch (error) {
    console.error('âŒ Error deleting salary:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting salary' });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const body = { ...req.body, createdBy: userId };

    // Map content to description if description is missing (from req.body)
    if (body.content && !body.description) {
      body.description = body.content;
    }

    // Map title to jobTitle for consistency in Job Opening / Advertisement
    if (body.title && !body.jobTitle) {
      body.jobTitle = body.title;
    }

    // Handle uploaded files from req.files (Multer)
    if (req.files) {
        if (req.files['images']) body.images = req.files['images'].map(file => `/uploads/announcements/${file.filename}`);
        if (req.files['attachments']) body.attachments = req.files['attachments'].map(file => `/uploads/announcements/${file.filename}`);
    }

    // Handle array fields
    ['requiredSkills', 'platforms', 'links', 'requirements', 'visibilityRole', 'visibilityDepartment', 'visibilityService', 'visibilityUser'].forEach(field => {
        if (typeof body[field] === 'string' && body[field]) {
            body[field] = body[field].split(',').map(s => s.trim()).filter(Boolean);
        }
    });

    // Handle number and boolean fields
    if (body.openingsCount === "" || body.openingsCount === "undefined") delete body.openingsCount;
    else if (body.openingsCount) body.openingsCount = Number(body.openingsCount);

    if (body.minSalary === "" || body.minSalary === "undefined") delete body.minSalary;
    else if (body.minSalary) body.minSalary = Number(body.minSalary);

    if (body.maxSalary === "" || body.maxSalary === "undefined") delete body.maxSalary;
    else if (body.maxSalary) body.maxSalary = Number(body.maxSalary);

    if (body.duration === "" || body.duration === "undefined") delete body.duration;
    else if (body.duration) body.duration = Number(body.duration);

    if (body.autoClose) body.autoClose = body.autoClose === 'true' || body.autoClose === true;

    // Handle empty Date strings to prevent validation errors
    ['expiresAt', 'expectedJoiningDate', 'applicationDeadline', 'scheduledDate'].forEach(dateField => {
        if (body[dateField] === "" || body[dateField] === "undefined") {
            delete body[dateField];
        } else if (body[dateField]) {
            body[dateField] = new Date(body[dateField]);
        }
    });

    const announcement = new Announcement(body);
    await announcement.save();

    if (announcement.itemType === 'Announcement' && announcement.status === 'Published') {
        const io = req.app.get('io');
        if (io) {
            io.emit('newMessage', {
                _id: 'ann_' + Date.now(),
                senderId: { _id: 'system', name: 'Global Announcement' },
                content: announcement.description || announcement.jobTitle
            });
        }
    }

    res.status(201).json({ 
        success: true, 
        message: 'Announcement Created Successfully',
        data: announcement 
    });
  } catch (error) {
    console.error('âŒ Error creating announcement in adminController:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: 'Validation Error', error: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error while creating announcement', error: error.message });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    let body = { ...req.body };

    // Handle uploaded files from req.files (Multer)
    if (req.files) {
        if (req.files['images']) body.images = req.files['images'].map(file => `/uploads/announcements/${file.filename}`);
        if (req.files['attachments']) body.attachments = req.files['attachments'].map(file => `/uploads/announcements/${file.filename}`);
    }

    // Map content to description if description is missing (from req.body)
    if (body.content && !body.description) {
        body.description = body.content;
    }

    // Handle array fields
    ['requiredSkills', 'platforms', 'links', 'requirements', 'visibilityRole', 'visibilityDepartment', 'visibilityService', 'visibilityUser'].forEach(field => {
        if (typeof body[field] === 'string' && body[field]) {
            body[field] = body[field].split(',').map(s => s.trim()).filter(Boolean);
        }
    });

    // Handle number and boolean fields
    if (body.openingsCount === "" || body.openingsCount === "undefined") delete body.openingsCount;
    else if (body.openingsCount) body.openingsCount = Number(body.openingsCount);

    if (body.minSalary === "" || body.minSalary === "undefined") delete body.minSalary;
    else if (body.minSalary) body.minSalary = Number(body.minSalary);

    if (body.maxSalary === "" || body.maxSalary === "undefined") delete body.maxSalary;
    else if (body.maxSalary) body.maxSalary = Number(body.maxSalary);

    if (body.duration === "" || body.duration === "undefined") delete body.duration;
    else if (body.duration) body.duration = Number(body.duration);

    if (body.autoClose !== undefined) body.autoClose = body.autoClose === 'true' || body.autoClose === true;

    // Handle empty Date strings to prevent validation errors
    ['expiresAt', 'expectedJoiningDate', 'applicationDeadline', 'scheduledDate'].forEach(dateField => {
        if (body[dateField] === "" || body[dateField] === "undefined") {
            delete body[dateField];
        } else if (body[dateField]) {
            body[dateField] = new Date(body[dateField]);
        }
    });

    const announcement = await Announcement.findByIdAndUpdate(id, body, { new: true });
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });

    res.status(200).json({ 
        success: true, 
        message: 'Announcement Updated Successfully',
        data: announcement 
    });
  } catch (error) {
    console.error('âŒ Error updating announcement in adminController:', error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: 'Validation Error', error: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error while updating announcement', error: error.message });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found' });
    
    res.status(200).json({ 
        success: true, 
        message: 'Announcement Deleted Successfully'
    });
  } catch (error) {
    console.error('âŒ Error deleting announcement in adminController:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting announcement', error: error.message });
  }
};

const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOut, status, workedOnHoliday, holidayType, overtimeHours, notes } = req.body;
    
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (checkOut) attendance.checkOut = checkOut;
    if (status) attendance.status = status;
    if (workedOnHoliday !== undefined) attendance.workedOnHoliday = workedOnHoliday;
    if (holidayType) attendance.holidayType = holidayType;
    if (overtimeHours !== undefined) attendance.overtimeHours = overtimeHours;
    if (notes) attendance.notes = notes;

    await attendance.save();
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error('âŒ Error updating attendance:', error);
    res.status(500).json({ success: false, message: 'Server error while updating attendance' });
  }
};

const getDriveQuota = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Determine limit
    let totalLimit;
    if (userId) {
       // if we have specific logic for user drive limits, we can place it here. Using default 2GB for individuals as per global requirement, or we can fetch User schema if we store custom limits.
       totalLimit = 2 * 1024 * 1024 * 1024; // 2GB
    } else {
       totalLimit = 10 * 1024 * 1024 * 1024 * 1024; // 10TB in bytes globally
    }

    const matchStage = userId ? { $match: { userId: new mongoose.Types.ObjectId(userId) } } : { $match: {} };

    const totalUsage = await Drive.aggregate([
      matchStage,
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);
    const used = totalUsage[0]?.total || 0;
    const remaining = Math.max(0, totalLimit - used);
    
    const query = userId ? { userId } : {};
    const history = await Drive.find(query).sort({ createdAt: -1 }).limit(50).populate('userId', 'name role email');

    res.status(200).json({
      success: true,
      data: {
        totalLimit,
        used,
        remaining,
        history
      }
    });
  } catch (error) {
    console.error('âŒ Error fetching drive quota:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching drive quota' });
  }
};

const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updates } = req.body;
    
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (status) project.status = status;
    if (updates) {
      project.activities.push({
        description: `Admin Update: ${updates}`,
        createdAt: new Date()
      });
    }

    await project.save();
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Update member status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.role = role;
    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;
    const salary = await Salary.findById(id).populate('userId', 'name uniqueId department role service');
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }
    res.status(200).json({ success: true, data: salary });
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSalary = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Salary.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update salary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get aggregated P&L summary (Total Earnings, Total Spending, Tax)
// @route   GET /api/adminassignments/finance/summary
// @access  Private (Admin/Superadmin)
const getFinancialSummary = async (req, res) => {
  try {
    // ── 1. EXPENSES ────────────────────────────────────────────────────────
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' }, tax: { $sum: '$taxAmount' } } }
    ]);
    const totalExpenses = expenseAgg[0]?.total || 0;
    const totalTax      = expenseAgg[0]?.tax   || 0;

    // ── 2. PURCHASE ORDERS ─────────────────────────────────────────────────
    // Use approvedAmount first (actual committed spend), then requestedAmount as fallback.
    // We only count each PO once; amountSent mirrors approvedAmount so no double-count.
    const purchaseAgg = await Project.aggregate([
      // Use regex for case-insensitive and trim-like matching
      { $match: { category: { $regex: /^\s*Purchase Order\s*$/i }, 'financialReview.status': 'Approved' } },
      {
        $addFields: {
          effectiveAmount: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$financialReview.approvedAmount', 0] }, 0] },
              then: '$financialReview.approvedAmount',
              else: { $ifNull: ['$financialReview.requestedAmount', 0] }
            }
          }
        }
      },
      { $group: { _id: null, total: { $sum: '$effectiveAmount' } } }
    ]);
    const totalPurchaseOrders = purchaseAgg[0]?.total || 0;

    // ── 3. SALARIES ────────────────────────────────────────────────────────
    // Summing all salary records in the DB for natural fidelity (inclusive approach).
    const salaryAgg = await Salary.aggregate([
      { $group: { _id: null, total: { $sum: '$grossSalary' } } }
    ]);
    const totalSalaries = salaryAgg[0]?.total || 0;

    // ── 4. REVENUE ─────────────────────────────────────────────────────────
    // Sum actual paid amounts from projects (exclude Purchase Orders)
    const revenueAgg = await Project.aggregate([
      { $match: { category: { $not: /^\s*Purchase Order\s*$/i } } },
      {
        $group: {
          _id: null,
          totalPaid:   { $sum: { $cond: [{ $gt: ['$paymentDetails.paidAmount', 0] }, '$paymentDetails.paidAmount', 0] } },
          totalQuoted: { $sum: { $ifNull: ['$quotedAmount', 0] } }
        }
      }
    ]);

    // ── 5. CASH BOOK MANUAL OUT-FLOWS ──────────────────────────────────────
    const cashOutAgg = await CashBookEntry.aggregate([
      { $match: { type: 'Cash Out', status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCashOut = cashOutAgg[0]?.total || 0;

    // ── 6. CASH BOOK MANUAL IN-FLOWS ───────────────────────────────────────
    const cashInAgg = await CashBookEntry.aggregate([
      { $match: { type: 'Cash In', status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCashIn = cashInAgg[0]?.total || 0;

    const totalSpending = totalExpenses + totalPurchaseOrders + totalSalaries + totalCashOut;
    const totalRevenue  = (revenueAgg[0]?.totalPaid || 0) + totalCashIn;
    const netProfit     = totalRevenue - totalSpending;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalSpending,
        netProfit,
        totalTax,
        breakdown: {
          expenses:       totalExpenses,
          purchaseOrders: totalPurchaseOrders,
          salaries:       totalSalaries,
          cashOut:        totalCashOut
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching financial summary:', error);
    res.status(500).json({ success: false, message: 'Server error while computing financial summary' });
  }
};

module.exports = {
  createInternalUser,
  getInternalUser,
  updateInternalUser,
  deleteInternalUser,
  getUserHistory,
  getAdminHistory,
  getAllInternalUsers,
  getAdminDashboard,
  getAdminProjectsByDept,
  getAdminAnalytics,
  getAllClients,
  getAllProjects,
  getDriveUsage,
  getAnnouncements,
  getAllPayments,
  getServiceProfit,
  getAllMeetings,
  getCashBook,
  getExpenses,
  getSalaries,
  getAttendance,
  getGSTReport,
  getRecruitmentData,
  updateProjectStatus,
  updateMemberStatus,
  updateMemberRole,
  createSalary,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  updateAttendanceRecord,
  getDriveQuota,
  getAdminProjectById,
  getJobApplications,
  updateJobApplicationStatus,
  createExpense,
  deleteExpense,
  deleteSalary,
  getSalaryById,
  updateSalary,
  getFinancialSummary
};
