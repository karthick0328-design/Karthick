// Controller/hrController.js
// HR-specific operations for user management
// Includes role assignment, user CRUD, promotions, and demotions

const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Counter = require('../models/Counter');

/**
 * Utility function to trim keys and string values in req.body
 */
const trimBody = (body) => {
    const trimmed = {};
    for (const [key, value] of Object.entries(body)) {
        const trimmedKey = key.trim();
        if (trimmedKey) {
            trimmed[trimmedKey] = typeof value === 'string' ? value.trim() : value;
        }
    }
    return trimmed;
};

/**
 * GET /api/hr/internal-users
 * List users with pagination, search, filters, and sorting
 */
const getUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            role,
            department,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            status
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter query
        const internalRoles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
        const filter = {};

        // SEC-FIX: Escape regex characters in search string to prevent ReDoS/Regex Injection
        const escapedSearch = typeof search === 'string' ? search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
        if (escapedSearch) {
            filter.$or = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } },
                { uniqueId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }

        if (role) {
            filter.role = role;
        } else {
            // Default to internal roles only for /internal-users endpoint
            filter.role = { $in: internalRoles };
        }

        if (department) {
            filter.department = department;
        }

        if (status) {
            filter.isActive = status === 'active';
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const users = await User.find(filter)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: error.message
        });
    }
};

/**
 * GET /api/hr/get-user/:userId
 * Get single user by ID
 */
const getUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(userId).select('-password').lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching user',
            error: error.message
        });
    }
};

/**
 * PUT /api/hr/assign-role/:userId
 * Assign role and department to a user
 */
const assignRoleAndDepartment = async (req, res) => {
    try {
        const { userId } = req.params;
        // Trim body for robustness
        const trimmedBody = trimBody(req.body);
        const { role, department, service, seniority } = trimmedBody;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Validate role
        const validRoles = ['employee', 'tl', 'manager', 'head', 'subadmin', 'admin', 'superadmin'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent modifying admin role
        if (user.role === 'admin' || user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify admin role'
            });
        }

        // Update fields
        if (role) {
            user.role = role;
        }
        if (department !== undefined) {
            user.department = department;
        }
        if (service !== undefined) {
            user.service = service;
        }
        if (seniority !== undefined) {
            user.seniority = seniority;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Role and department assigned successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                service: user.service,
                seniority: user.seniority
            }
        });
    } catch (error) {
        console.error('Error assigning role:', error);
        let message = 'Server error while assigning role';
        if (error.name === 'ValidationError') {
            message = 'Invalid user data: ' + Object.values(error.errors).map(e => e.message).join(', ');
        }
        res.status(500).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * POST /api/hr/create-user
 * Create a new user
 */
const createUser = async (req, res) => {
    try {
        // Trim body for robustness (handles keys like "service " with space)
        const trimmedBody = trimBody(req.body);
        const {
            name,
            email,
            password,
            role,
            department,  // Now explicitly optional for all roles (model handles validation)
            phone,
            branch,
            service,     // Optional
            seniority,
            attendanceVerificationMethod,
            biometricScanId,
            profileImage,
            isVerified,
            country = 'Indian'
        } = trimmedBody;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Validate role
        const validRoles = ['employee', 'tl', 'manager', 'head', 'subadmin', 'admin', 'superadmin'];
        if (role && !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Additional validations (model will handle most, but early checks for subadmin dept and employee seniority)
        // Note: Department/service are now optional in controller; model validation adjusted below
        const userRole = role || 'employee';
        if (userRole === 'subadmin' && !department) {
            return res.status(400).json({
                success: false,
                message: 'Department is required for subadmin role'
            });
        }
        if (userRole === 'employee' && !seniority) {
            return res.status(400).json({
                success: false,
                message: 'Seniority is required for employee role'
            });
        }

        // Build user data conditionally (uniqueId generated by model pre-save)
        // Set optional fields to empty string if not provided (allows model to accept without requiring them)
        const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone ? phone.trim() : '',
            branch: branch ? branch.trim() : '',
            role: userRole,
            department: department ? department.trim() : '',  // Optional: empty string if not provided
            service: service ? service.trim() : '',          // Optional: empty string if not provided
            attendanceVerificationMethod: attendanceVerificationMethod || 'Physical',
            profileImage: profileImage || null,
            ...(biometricScanId && { biometricScanId: biometricScanId.trim() }),
            country,
            isActive: true,
            isVerified: isVerified !== undefined ? isVerified : false,
            isPasswordSet: false
        };

        // Conditionally add seniority only for employees
        if (userRole === 'employee') {
            userData.seniority = seniority.toLowerCase();
        }
        // Do not set seniority for other roles (let schema default handle it)

        // Create user (pre-save will handle hashing, normalization, uniqueId generation, etc.)
        const user = new User(userData);

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                _id: user._id,
                uniqueId: user.uniqueId,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                service: user.service,
                seniority: user.seniority,
                attendanceVerificationMethod: user.attendanceVerificationMethod,
                biometricScanId: user.biometricScanId,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        let message = 'Server error while creating user';
        if (error.name === 'CastError') {
            message = 'Database configuration error: Invalid counter ID';
        } else if (error.name === 'ValidationError') {
            message = 'Invalid user data: ' + Object.values(error.errors).map(e => e.message).join(', ');
        }
        res.status(500).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * PUT /api/hr/update-user/:userId
 * Update user information
 */
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Trim body for robustness
        const trimmedBody = trimBody(req.body);
        const updates = trimmedBody;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent modifying admin
        if (user.role === 'admin' || user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify admin user'
            });
        }

        // Fields that cannot be updated
        const restrictedFields = ['_id', 'uniqueId', 'createdAt', 'updatedAt', 'password'];
        restrictedFields.forEach(field => delete updates[field]);

        // Validate role if being updated
        if (updates.role) {
            const validRoles = ['employee', 'tl', 'manager', 'head', 'subadmin', 'admin', 'superadmin'];
            if (!validRoles.includes(updates.role)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }
        }

        // Normalize service to backend canonical enum (case-insensitive match)
        const backendServices = ['NGS', 'Drug Discovery', 'Software Development', 'Microbiology', 'Biochemistry', 'Molecular Biology'];
        if (updates.service !== undefined && updates.service !== '') {
            const normalizedInput = updates.service.trim().toLowerCase().replace(/\s+/g, ' ');
            const match = backendServices.find(s => s.toLowerCase().replace(/\s+/g, ' ') === normalizedInput);
            if (match) updates.service = match;
            // If no match, keep as-is (validator won't run — we use save() without re-running validator below)
        }

        // Nullify seniority for non-employee roles
        if (updates.role && updates.role !== 'employee') {
            updates.seniority = null;
        }

        // Update user
        Object.keys(updates).forEach(key => {
            user[key] = updates[key];
        });

        // Use validateBeforeSave:false to bypass strict enum for service/dept mismatches from frontend
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                attendanceVerificationMethod: user.attendanceVerificationMethod,
                biometricScanId: user.biometricScanId,
                profileImage: user.profileImage
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        let message = 'Server error while updating user';
        if (error.name === 'ValidationError') {
            message = 'Invalid user data: ' + Object.values(error.errors).map(e => e.message).join(', ');
        }
        res.status(500).json({
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * DELETE /api/hr/delete-user/:userId
 * Delete a user (soft delete by setting isActive to false)
 */
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting admin
        if (user.role === 'admin' || user.role === 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete admin user'
            });
        }

        // Soft delete - set isActive to false
        user.isActive = false;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user',
            error: error.message
        });
    }
};

/**
 * PUT /api/hr/promote/:userId
 * Promote user to a higher role
 */
const promoteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Trim body for robustness
        const trimmedBody = trimBody(req.body);
        const { targetRole } = trimmedBody;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        if (!targetRole) {
            return res.status(400).json({
                success: false,
                message: 'Target role is required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Define promotion hierarchy
        const roleHierarchy = {
            'employee': ['tl', 'manager', 'head'],
            'tl': ['manager', 'head'],
            'manager': ['head'],
            'head': []
        };

        const currentRole = user.role;

        // Check if promotion is valid
        if (!roleHierarchy[currentRole]) {
            return res.status(400).json({
                success: false,
                message: `Cannot promote user with role: ${currentRole}`
            });
        }

        if (!roleHierarchy[currentRole].includes(targetRole)) {
            return res.status(400).json({
                success: false,
                message: `Cannot promote ${currentRole} to ${targetRole}. Valid promotions: ${roleHierarchy[currentRole].join(', ') || 'none'}`
            });
        }

        user.role = targetRole;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User promoted from ${currentRole} to ${targetRole}`,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                previousRole: currentRole,
                currentRole: user.role
            }
        });
    } catch (error) {
        console.error('Error promoting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while promoting user',
            error: error.message
        });
    }
};

/**
 * PUT /api/hr/demote/:userId
 * Demote user to a lower role
 */
const demoteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Trim body for robustness
        const trimmedBody = trimBody(req.body);
        const { targetRole } = trimmedBody;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        if (!targetRole) {
            return res.status(400).json({
                success: false,
                message: 'Target role is required'
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Define demotion hierarchy
        const roleHierarchy = {
            'head': ['manager', 'tl', 'employee'],
            'manager': ['tl', 'employee'],
            'tl': ['employee'],
            'employee': []
        };

        const currentRole = user.role;

        // Check if demotion is valid
        if (!roleHierarchy[currentRole]) {
            return res.status(400).json({
                success: false,
                message: `Cannot demote user with role: ${currentRole}`
            });
        }

        if (!roleHierarchy[currentRole].includes(targetRole)) {
            return res.status(400).json({
                success: false,
                message: `Cannot demote ${currentRole} to ${targetRole}. Valid demotions: ${roleHierarchy[currentRole].join(', ') || 'none'}`
            });
        }

        user.role = targetRole;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User demoted from ${currentRole} to ${targetRole}`,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                previousRole: currentRole,
                currentRole: user.role
            }
        });
    } catch (error) {
        console.error('Error demoting user:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while demoting user',
            error: error.message
        });
    }
};

/**
 * GET /api/hr/managers
 * Get all managers (for HR subadmin to view recent activity)
 */
const getManagers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            department,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter for managers
        const filter = {
            role: { $in: ['manager'] },
            isActive: true
        };

        if (department) {
            filter.department = department;
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const managers = await User.find(filter)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: managers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching managers:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching managers',
            error: error.message
        });
    }
};

module.exports = {
    assignRoleAndDepartment,
    createUser,
    getUser,
    getUsers,
    updateUser,
    deleteUser,
    promoteUser,
    demoteUser,
    getManagers
};