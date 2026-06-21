// PositionController - controllers/PositionController.js (Full Corrected Version)

const mongoose = require('mongoose');
const User = require('../models/User');
const Position = require('../models/Position');
const History = require('../models/History');

exports.createPosition = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const isSubadminUserMgmt = role === 'subadmin' && req.user.subadminCategory?.includes('User Management');
    
    if (role !== 'admin' && role !== 'superadmin' && !isSubadminUserMgmt) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    if (!name) {
      console.error(`[${new Date().toISOString()}] Missing required field: name`);
      return res.status(400).json({ success: false, message: 'Position name is required' });
    }
    const existingPosition = await Position.findOne({ name });
    if (existingPosition) {
      console.error(`[${new Date().toISOString()}] Position already exists: ${name}`);
      return res.status(400).json({ success: false, message: 'Position already exists' });
    }
    const position = await Position.create({
      name,
      createdBy: req.user.id,
    });
    // Log to history
    await History.create({
      action: 'create',
      positionName: position.name,
      changedBy: req.user.id,
      changedByName: req.user.name,
      details: 'Top-level position',
    });
    console.log(`[${new Date().toISOString()}] Position created successfully: ${name}`);
    return res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: {
        id: position._id.toString(),
        name: position.name,
        createdBy: position.createdBy,
        createdAt: position.createdAt,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating position:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while creating position: ${error.message}` });
  }
};

exports.editPosition = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const isSubadminUserMgmt = role === 'subadmin' && req.user.subadminCategory?.includes('User Management');
    
    if (role !== 'admin' && role !== 'superadmin' && !isSubadminUserMgmt) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    const positionId = typeof req.body.positionId === 'string' ? req.body.positionId : undefined;
    if (!mongoose.isValidObjectId(positionId)) {
      console.error(`[${new Date().toISOString()}] Invalid positionId format:`, positionId);
      return res.status(400).json({ success: false, message: 'Invalid positionId format' });
    }
    const position = await Position.findById(positionId);
    if (!position) {
      console.error(`[${new Date().toISOString()}] Position not found: ${positionId}`);
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
    let details = [];
    if (name && name !== position.name) {
      const existingPosition = await Position.findOne({ name });
      if (existingPosition && existingPosition._id.toString() !== positionId) {
        return res.status(400).json({ success: false, message: 'Position name already exists' });
      }
      // Update users with the old position name to the new name
      await User.updateMany(
        { managerPosition: position.name },
        { $set: { 'managerPosition.$': name } }
      );
      console.log(`[${new Date().toISOString()}] Updated user managerPositions from ${position.name} to ${name}`);
      details.push(`Name changed from "${position.name}" to "${name}"`);
      position.name = name;
    }
    await position.save();
    // Log to history
    await History.create({
      action: 'edit',
      positionName: position.name,
      changedBy: req.user.id,
      changedByName: req.user.name,
      details: details.length > 0 ? details.join('; ') : 'No changes',
    });
    console.log(`[${new Date().toISOString()}] Position edited successfully: ${position.name}`);
    return res.status(200).json({
      success: true,
      message: 'Position edited successfully',
      data: {
        id: position._id.toString(),
        name: position.name,
        createdBy: position.createdBy,
        createdAt: position.createdAt,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error editing position:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while editing position: ${error.message}` });
  }
};

exports.deletePosition = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const isSubadminUserMgmt = role === 'subadmin' && req.user.subadminCategory?.includes('User Management');
    
    if (role !== 'admin' && role !== 'superadmin' && !isSubadminUserMgmt) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    const positionId = typeof req.body.positionId === 'string' ? req.body.positionId : undefined;
    if (!mongoose.isValidObjectId(positionId)) {
      console.error(`[${new Date().toISOString()}] Invalid positionId format:`, positionId);
      return res.status(400).json({ success: false, message: 'Invalid positionId format' });
    }
    const position = await Position.findById(positionId);
    if (!position) {
      console.error(`[${new Date().toISOString()}] Position not found: ${positionId}`);
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
    // Check if position is assigned to any users
    const usersWithPosition = await User.countDocuments({ managerPosition: position.name });
    if (usersWithPosition > 0) {
      console.error(`[${new Date().toISOString()}] Cannot delete position assigned to ${usersWithPosition} users: ${position.name}`);
      return res.status(400).json({ success: false, message: `Cannot delete position "${position.name}". It is assigned to ${usersWithPosition} user(s). Remove assignments first.` });
    }
    await Position.findByIdAndDelete(positionId);
    // Log to history
    await History.create({
      action: 'delete',
      positionName: position.name,
      changedBy: req.user.id,
      changedByName: req.user.name,
      details: 'Position deleted',
    });
    console.log(`[${new Date().toISOString()}] Position deleted successfully: ${position.name}`);
    return res.status(200).json({
      success: true,
      message: 'Position deleted successfully',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting position:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while deleting position: ${error.message}` });
  }
};

exports.assignUserPosition = async (req, res) => {
  try {
    const uniqueId = typeof req.body.uniqueId === 'string' ? req.body.uniqueId : undefined;
    const positionId = typeof req.body.positionId === 'string' ? req.body.positionId : undefined;
    console.log(`[${new Date().toISOString()}] ${req.user.role.toUpperCase()} ${req.user.id} attempting to assign position:`, { positionId, uniqueId });
    // Validate inputs
    if (!uniqueId || uniqueId.trim() === '') {
      console.error(`[${new Date().toISOString()}] Invalid uniqueId:`, uniqueId);
      return res.status(400).json({ success: false, message: 'Invalid uniqueId format' });
    }
    if (!mongoose.isValidObjectId(positionId)) {
      console.error(`[${new Date().toISOString()}] Invalid positionId format: ${positionId}`);
      return res.status(400).json({ success: false, message: 'Invalid positionId format' });
    }
    // Check position existence
    const position = await Position.findById(positionId);
    if (!position) {
      console.error(`[${new Date().toISOString()}] Position not found: ${positionId}`);
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
    // Check user existence
    const user = await User.findOne({ uniqueId }).select('uniqueId name email managerPosition role isActive');
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      console.error(`[${new Date().toISOString()}] User is inactive: ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Cannot assign position to an inactive user' });
    }
    // Only allow assignment to 'manager' role
    if (user.role !== 'manager') {
      console.error(`[${new Date().toISOString()}] Only managers can be assigned positions: ${user.role} for ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Only managers can be assigned positions' });
    }
    // Check if position is already assigned
    if (user.managerPosition.includes(position.name)) {
      console.error(`[${new Date().toISOString()}] Position already assigned: ${position.name} to user ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Position already assigned to this user' });
    }
    // Update user with new position name
    const updatedUser = await User.findOneAndUpdate(
      { uniqueId },
      {
        $addToSet: { managerPosition: position.name },
        $push: {
          activities: {
            description: `Position assigned: "${position.name}" by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).select('uniqueId name email managerPosition isActive role');
    if (!updatedUser) {
      console.error(`[${new Date().toISOString()}] User not found after update: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found after update' });
    }
    // Log to history
    await History.create({
      action: 'assign',
      positionName: position.name,
      userName: updatedUser.name,
      changedBy: req.user.id,
      changedByName: req.user.name,
      details: 'No category',
    });
    console.log(`[${new Date().toISOString()}] Position assigned successfully: ${position.name} to user ${uniqueId}`);
    return res.status(200).json({
      success: true,
      message: 'Position assigned successfully',
      data: {
        uniqueId: updatedUser.uniqueId,
        name: updatedUser.name,
        email: updatedUser.email,
        managerPosition: updatedUser.managerPosition,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error assigning position:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while assigning position: ${error.message}` });
  }
};

exports.removeUserPosition = async (req, res) => {
  try {
    const { uniqueId, positionId } = req.body;
    console.log(`[${new Date().toISOString()}] ${req.user.role.toUpperCase()} ${req.user.id} attempting to remove positionId: ${positionId} from user with uniqueId: ${uniqueId}`);
    if (!uniqueId || !positionId) {
      console.error(`[${new Date().toISOString()}] Missing required fields: uniqueId=${uniqueId}, positionId=${positionId}`);
      return res.status(400).json({ success: false, message: 'Unique ID and position ID are required' });
    }
    if (!mongoose.isValidObjectId(positionId)) {
      console.error(`[${new Date().toISOString()}] Invalid positionId format: ${positionId}`);
      return res.status(400).json({ success: false, message: 'Invalid position ID format' });
    }
    if (!uniqueId || typeof uniqueId !== 'string' || uniqueId.trim() === '') {
      console.error(`[${new Date().toISOString()}] Invalid uniqueId format: ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Invalid uniqueId format' });
    }
    const position = await Position.findById(positionId);
    if (!position) {
      console.error(`[${new Date().toISOString()}] Position not found for positionId: ${positionId}`);
      return res.status(404).json({ success: false, message: 'Position not found' });
    }
    const user = await User.findOne({ uniqueId }).select('uniqueId name email managerPosition role isActive');
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found for uniqueId: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      console.error(`[${new Date().toISOString()}] User is inactive for uniqueId: ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Cannot remove position from an inactive user' });
    }
    // Only allow removal for 'manager' role
    if (user.role !== 'manager') {
      console.error(`[${new Date().toISOString()}] Only managers can have positions removed: ${user.role} for ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Only managers can have positions assigned/removed' });
    }
    if (!user.managerPosition.includes(position.name)) {
      console.error(`[${new Date().toISOString()}] Position not assigned: ${position.name} for uniqueId: ${uniqueId}`);
      return res.status(400).json({ success: false, message: 'Position not assigned to this user' });
    }
    if (!req.user || !req.user.name) {
      console.error(`[${new Date().toISOString()}] Invalid req.user:`, JSON.stringify(req.user, null, 2));
      return res.status(401).json({ success: false, message: 'Authentication error: User not identified' });
    }
    const updatedUser = await User.findOneAndUpdate(
      { uniqueId },
      {
        $pull: { managerPosition: position.name },
        $push: {
          activities: {
            description: `Position removed: "${position.name}" by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).select('uniqueId name email managerPosition isActive role');
    // Log to history
    await History.create({
      action: 'remove',
      positionName: position.name,
      userName: updatedUser.name,
      changedBy: req.user.id,
      changedByName: req.user.name,
      details: 'No category',
    });
    console.log(`[${new Date().toISOString()}] Position removed successfully: ${position.name} from uniqueId: ${uniqueId}`);
    return res.status(200).json({
      success: true,
      message: 'Position removed successfully',
      data: {
        uniqueId: updatedUser.uniqueId,
        name: updatedUser.name,
        email: updatedUser.email,
        managerPosition: updatedUser.managerPosition,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error removing position:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while removing position: ${error.message}` });
  }
};

// Controller (updated getPositionAndUserData in positionController.js)
exports.getPositionAndUserData = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    const isSubadminUserMgmt = role === 'subadmin' && req.user.subadminCategory?.includes('User Management');
    
    if (role !== 'admin' && role !== 'superadmin' && !isSubadminUserMgmt) {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    console.log(`[${new Date().toISOString()}] Fetching positions and user uniqueIds for ${req.user.role.toUpperCase()}: ${req.user.id}`);
    const positions = await Position.find().select('name _id createdBy createdAt');
    const positionData = positions.map(pos => ({
      id: pos._id.toString(),
      name: pos.name,
      createdBy: pos.createdBy,
      createdAt: pos.createdAt,
    }));

    // Filter users based on user role and category
    let userQuery = { isActive: true };
    if (req.user.role.toLowerCase() === 'subadmin' && req.user.subadminCategory && req.user.subadminCategory.includes('User Management')) {
      userQuery.role = { $in: ['user', 'employee', 'manager'] };
      console.log(`[${new Date().toISOString()}] Filtering users to roles 'user/employee/manager' for User Management subadmin`);
    }

    const users = await User.find(userQuery).select('uniqueId name email managerPosition role');
    const userData = users.map(user => ({
      uniqueId: user.uniqueId,
      name: user.name,
      email: user.email,
      managerPosition: user.managerPosition,
      role: user.role, // Include role for display
    }));

    // Separate filter for assignments (managers only)
    const assignmentUsers = users.filter(user => user.role === 'manager');

    console.log(`[${new Date().toISOString()}] Retrieved ${userData.length} active users and ${assignmentUsers.length} managers`);
    return res.status(200).json({
      success: true,
      data: {
        positions: positionData,
        users: userData,  // For roles tab (all promotable)
        assignmentUsers: assignmentUsers.map(u => ({  // For assignments tab (managers only)
          uniqueId: u.uniqueId,
          name: u.name,
          email: u.email,
          managerPosition: u.managerPosition,
          role: u.role,
        })),
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching positions and user data:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while fetching data: ${error.message}` });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const { uniqueId } = req.params;
    console.log(`[${new Date().toISOString()}] Fetching user details for uniqueId: ${uniqueId}`);
    const user = await User.findOne({ uniqueId }).select('uniqueId name email managerPosition isActive role');
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found for uniqueId: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    console.log(`[${new Date().toISOString()}] User details:`, JSON.stringify({ ...user.toObject() }, null, 2));
    return res.status(200).json({
      success: true,
      data: {
        uniqueId: user.uniqueId,
        name: user.name,
        email: user.email,
        managerPosition: user.managerPosition,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching user details:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while fetching user details: ${error.message}` });
  }
};

// controllers/positionController.js (updated getHistory function)
exports.getHistory = async (req, res) => {
  try {
    const role = req.user.role.toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin access required.' });
    }
    console.log(`[${new Date().toISOString()}] Admin ${req.user.id} fetching position change history`);
    const histories = await History.find()
      .populate('changedBy', 'name role')
      .sort({ timestamp: -1 })
      .limit(100);
    const historyData = histories.map(h => ({
      id: h._id.toString(),
      action: h.action,
      positionName: h.positionName,
      userName: h.userName || null,
      changedBy: h.changedBy ? {
        name: h.changedBy.name,
        role: h.changedBy.role || 'Unknown'
      } : {
        name: h.changedByName || 'Unknown',
        role: 'Unknown'
      },
      timestamp: h.timestamp,
      details: h.details || null,
    }));
    console.log(`[${new Date().toISOString()}] Retrieved ${historyData.length} history entries`);
    return res.status(200).json({
      success: true,
      data: historyData,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching history:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while fetching history: ${error.message}` });
  }
};

// New function to assign role (admin-only; supports employee → manager promotion)
exports.assignRole = async (req, res) => {
  try {
    const uniqueId = typeof req.body.uniqueId === 'string' ? req.body.uniqueId : undefined;
    const newRole = typeof req.body.newRole === 'string' ? req.body.newRole : undefined;
    console.log(`[${new Date().toISOString()}] ${req.user.role.toUpperCase()} ${req.user.id} attempting to assign role:`, { newRole, uniqueId });

    // ENFORCED: Only admins can assign roles
    if (req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
      console.error(`[${new Date().toISOString()}] Only admins can assign roles: attempted by ${req.user.role} ${req.user.id}`);
      return res.status(403).json({ success: false, message: 'Only admins can assign roles' });
    }

    // Validate inputs (includes 'employee' for promotion)
    if (!uniqueId || uniqueId.trim() === '') {
      console.error(`[${new Date().toISOString()}] Invalid uniqueId:`, uniqueId);
      return res.status(400).json({ success: false, message: 'Invalid uniqueId format' });
    }
    if (!newRole || !['admin', 'user', 'employee', 'manager', 'subadmin'].includes(newRole)) {
      console.error(`[${new Date().toISOString()}] Invalid newRole:`, newRole);
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    // Check user existence
    const user = await User.findOne({ uniqueId }).select('uniqueId name role isActive');
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found:`, uniqueId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      console.error(`[${new Date().toISOString()}] User is inactive:`, uniqueId);
      return res.status(400).json({ success: false, message: 'Cannot assign role to an inactive user' });
    }
    if (user.role === newRole) {
      console.error(`[${new Date().toISOString()}] Role already assigned:`, { newRole, uniqueId });
      return res.status(400).json({ success: false, message: 'User already has this role' });
    }

    // Update user role (with validation)
    const oldRole = user.role;
    user.role = newRole;
    try {
      await user.save({ runValidators: true });
    } catch (validationError) {
      console.error(`[${new Date().toISOString()}] Validation error assigning role %s to %s:`, newRole, uniqueId, validationError.message);
      return res.status(400).json({
        success: false,
        message: `Invalid role assignment: ${validationError.message}`
      });
    }

    // Log to activities
    await User.findOneAndUpdate(
      { uniqueId },
      {
        $push: {
          activities: {
            description: `Role changed from "${oldRole}" to "${newRole}" by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    console.log(`[${new Date().toISOString()}] Role assigned successfully: ${newRole} to user ${uniqueId} by ${req.user.id}`);
    return res.status(200).json({
      success: true,
      message: 'Role assigned successfully',
      data: {
        uniqueId: user.uniqueId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error assigning role:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while assigning role: ${error.message}` });
  }
};

// New function to remove role (admin-only; supports manager → employee demotion)
exports.removeRole = async (req, res) => {
  try {
    const uniqueId = typeof req.body.uniqueId === 'string' ? req.body.uniqueId : undefined;
    console.log(`[${new Date().toISOString()}] ${req.user.role.toUpperCase()} ${req.user.id} attempting to remove role from user:`, uniqueId);

    // ENFORCED: Only admins can remove roles
    if (req.user.role.toLowerCase() !== 'admin' && req.user.role.toLowerCase() !== 'superadmin') {
      console.error(`[${new Date().toISOString()}] Only admins can remove roles: attempted by ${req.user.role} ${req.user.id}`);
      return res.status(403).json({ success: false, message: 'Only admins can remove roles' });
    }

    // Validate inputs
    if (!uniqueId || uniqueId.trim() === '') {
      console.error(`[${new Date().toISOString()}] Invalid uniqueId:`, uniqueId);
      return res.status(400).json({ success: false, message: 'Invalid uniqueId format' });
    }

    // Check user existence
    const user = await User.findOne({ uniqueId }).select('uniqueId name role isActive');
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found:`, uniqueId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      console.error(`[${new Date().toISOString()}] User is inactive:`, uniqueId);
      return res.status(400).json({ success: false, message: 'Cannot remove role from an inactive user' });
    }

    // Only allow removal/demotion for 'manager' role (to 'employee')
    if (user.role !== 'manager') {
      console.error(`[${new Date().toISOString()}] Only managers can have roles removed (demoted to employee):`, { role: user.role, uniqueId });
      return res.status(400).json({ success: false, message: 'Only managers can be demoted via role removal' });
    }

    const newRole = 'employee';
    if (user.role === newRole) {
      console.error(`[${new Date().toISOString()}] User already has the demoted role:`, { newRole, uniqueId });
      return res.status(400).json({ success: false, message: 'User already has the demoted role' });
    }

    // Update user role (with validation)
    const oldRole = user.role;
    user.role = newRole;
    try {
      await user.save({ runValidators: true });
    } catch (validationError) {
      console.error(`[${new Date().toISOString()}] Validation error removing role for %s:`, uniqueId, validationError.message);
      return res.status(400).json({
        success: false,
        message: `Invalid role removal: ${validationError.message}`
      });
    }

    // Log to activities
    await User.findOneAndUpdate(
      { uniqueId },
      {
        $push: {
          activities: {
            description: `Role removed/demoted from "${oldRole}" to "${newRole}" by ${req.user.role} ${req.user.name}`,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    console.log(`[${new Date().toISOString()}] Role removed successfully: demoted ${uniqueId} from ${oldRole} to ${newRole} by ${req.user.id}`);
    return res.status(200).json({
      success: true,
      message: 'Role removed successfully (demoted to employee)',
      data: {
        uniqueId: user.uniqueId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error removing role:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while removing role: ${error.message}` });
  }
};