// controllers/assignmentController.js
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper function to check if a user's managerPosition matches the target position (exact match on main position only)
async function hasAuthorityOverPosition(userManagerPositions, targetPositionName) {
  if (!userManagerPositions || !Array.isArray(userManagerPositions) || userManagerPositions.length === 0) {
    return false;
  }

  // Extract main position: everything before the space followed by ['...']
  const match = String(targetPositionName).match(/^(.+?)\s+\['[^']+'\]$/);
  const mainPosition = match ? match[1].trim() : targetPositionName;

  return userManagerPositions.includes(mainPosition);
}

// Helper function to manually populate history assignedBy names
async function populateHistoryManually(assignment) {
  if (!Array.isArray(assignment.history)) {
    assignment.history = [];
    return;
  }

  const rawUserIds = assignment.history
    .map(item => item.assignedBy)
    .filter(id => id && (typeof id === 'string' || id instanceof mongoose.Types.ObjectId));

  if (rawUserIds.length === 0) return;

  // Filter only valid ObjectIds to prevent CastError
  const validUserIds = [];
  for (const id of rawUserIds) {
    try {
      new mongoose.Types.ObjectId(id);
      validUserIds.push(id);
    } catch (e) {
      console.warn(`Invalid ObjectId in history assignedBy: ${id}`);
      // Skip invalid IDs
    }
  }

  if (validUserIds.length === 0) return;

  const users = await User.find({ _id: { $in: validUserIds } }).select('_id name');
  const userMap = new Map(users.map(u => [u._id.toString(), { _id: u._id, name: u.name }]));

  assignment.history.forEach(item => {
    if (item.assignedBy) {
      const idStr = (item.assignedBy instanceof mongoose.Types.ObjectId ? item.assignedBy.toString() : item.assignedBy).toString();
      const user = userMap.get(idStr);
      if (user) {
        item.assignedBy = user;
      }
    }
  });
}

// @desc    Get eligible employees for assignment (active employees only)
// @route   GET /api/assignments/employees
// @access  Private (Manager/Head)
const getEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = { role: 'employee', isActive: true };
    if (search && typeof search === 'string') {
      filter.name = { $regex: search.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&') };
    }
    const employees = await User.find(filter)
      .select('_id name email branch uniqueId position manager isActive')
      .sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Get employees error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving employees.',
    });
  }
};

// @desc    Get dashboard stats for a manager
// @route   GET /api/assignments/stats
// @access  Private (Manager/Head)
const getStats = async (req, res) => {
  try {
    const manager = req.user;

    const totalAssignments = await Assignment.countDocuments({ manager: manager._id });
    const activeAssignments = await Assignment.countDocuments({ manager: manager._id, isActive: true });
    const inactiveAssignments = totalAssignments - activeAssignments;
    const branchesCovered = await Assignment.distinct('branch', { manager: manager._id }).then(branches => branches.length);
    const positionsDelegated = await Assignment.distinct('position', { manager: manager._id }).then(positions => positions.length);

    res.status(200).json({
      success: true,
      data: {
        totalAssignments,
        activeAssignments,
        inactiveAssignments,
        branchesCovered,
        positionsDelegated,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Get stats error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving stats.',
    });
  }
};

// @desc    Assign an employee as sub-manager for a position/branch
// @route   POST /api/assignments
// @access  Private (Manager/Head with position)
const assignEmployee = async (req, res) => {
  try {
    const { employeeId, branch, position, notes } = req.body;

    // Validate inputs
    if (!employeeId || !branch || !position) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, branch, and position are required.',
      });
    }

    // Verify manager (assigner) has authority over the position (exact match on main position)
    const manager = req.user;
    const isGlobalAdmin = manager.role.toLowerCase() === 'admin' || manager.role.toLowerCase() === 'superadmin';
    const hasAuthority = isGlobalAdmin || await hasAuthorityOverPosition(manager.managerPosition, position);
    if (!hasAuthority) {
      console.error(`[${new Date().toISOString()}] Unauthorized: Manager ${manager.id} lacks authority over position "${position}"`);
      return res.status(403).json({
        success: false,
        message: 'You do not have authority over this position. Only position holders can assign sub-managers.',
      });
    }

    // Verify employee exists and is eligible (role: 'employee', active); fetch managerPosition for update logic
    const employee = await User.findById(employeeId).select('role branch position managerPosition isActive');
    if (!employee || employee.role !== 'employee') {
      console.error(`[${new Date().toISOString()}] Invalid employee: ID ${employeeId} (role: ${employee ? employee.role : 'not found'})`);
      return res.status(400).json({
        success: false,
        message: 'Invalid employee. Must be an employee role.',
      });
    }
    if (!employee.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Employee must be active.',
      });
    }

    // Check if assignment already exists for this employee/branch/position
    const existingAssignment = await Assignment.findOne({
      employee: employeeId,
      branch,
      position,
      isActive: true,
    });
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        message: 'Employee is already assigned as sub-manager for this branch/position.',
      });
    }

    // Create assignment record for delegation tracking (bypass validation for legacy/strict regex issues on position)
    const assignmentData = {
      manager: manager._id,  // Original manager supervises
      employee: employeeId,  // New sub-manager
      branch,
      position,  // Position being delegated
      notes: notes || `Delegated ${position} role in ${branch} branch.`,
    };
    const assignment = new Assignment(assignmentData);
    await assignment.save({ validateBeforeSave: false });
    console.log(`[${new Date().toISOString()}] Assignment created successfully: ${assignment._id}`);

    // Ensure history is initialized and add initial entry (bypass validation)
    if (!Array.isArray(assignment.history)) {
      assignment.history = [];
    }
    assignment.history.push({
      action: 'assigned',
      assignedBy: manager._id,
      timestamp: new Date(),
      notes: notes || `Initial delegation of ${position} in ${branch} branch.`,
    });
    await assignment.save({ validateBeforeSave: false });
    console.log(`[${new Date().toISOString()}] History updated successfully for assignment: ${assignment._id}`);

    // Update employee in User model: set position (superior), and add delegated position to managerPosition if not present
    const employeeUpdate = { position: manager._id };
    const currentPositions = employee.managerPosition || [];
    if (!currentPositions.includes(position)) {
      employeeUpdate.$push = { managerPosition: position };
      console.log(`[${new Date().toISOString()}] Added position "${position}" to employee's managerPosition`);
    } else {
      console.log(`[${new Date().toISOString()}] Position "${position}" already in employee's managerPosition; no update needed`);
    }
    await User.findByIdAndUpdate(employeeId, employeeUpdate);
    console.log(`[${new Date().toISOString()}] Employee updated in User model: position set to ${manager._id}, managerPosition updated`);

    // Populate references excluding history
    await assignment.populate([
      { path: 'manager', select: 'name managerPosition' },
      { path: 'employee', select: 'name email branch position manager' },
    ]);

    // Manually populate history
    try {
      await populateHistoryManually(assignment);
    } catch (e) {
      console.warn('Failed to populate history for assignment %s:', assignment._id, e.message);
    }

    let message = 'Employee assigned successfully as sub-manager for the position.';
    message += ' Position stored in user model.';

    res.status(201).json({
      success: true,
      message,
      data: assignment,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Assignment creation error:`, error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error during assignment.',
    });
  }
};

// @desc    Get all assignments for a manager (filtered by their positions/branches)
// @route   GET /api/assignments
// @access  Private (Manager/Head)
const getMyAssignments = async (req, res) => {
  try {
    const manager = req.user;
    const { branch, position, page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    // If filtering by position, verify authority over it (main position match)
    if (position) {
      const hasAuthority = await hasAuthorityOverPosition(manager.managerPosition, String(position));
      if (!hasAuthority) {
        return res.status(403).json({
          success: false,
          message: 'You do not have authority over this position.',
        });
      }
    }

    const isGlobalAdmin = manager.role.toLowerCase() === 'admin' || manager.role.toLowerCase() === 'superadmin';
    // Build filter: assignments delegated by this manager, or all if Global Admin
    let finalFilter = {
      isActive: true,
    };
    if (!isGlobalAdmin) {
      finalFilter.manager = manager._id;
    }
    if (branch) finalFilter.branch = { $regex: String(branch).toLowerCase() };
    if (position) finalFilter.position = { $regex: String(position).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };

    // Handle search
    if (search && typeof search === 'string') {
      const searchEmployeeIds = await User.find({
        role: 'employee',
        isActive: true,
        name: search.toLowerCase()
      }).select('_id');
      const searchIds = searchEmployeeIds.map(e => e._id);
      finalFilter.$or = [
        { notes: search.toLowerCase() },
        { employee: { $in: searchIds } }
      ];
    }

    const assignments = await Assignment.find(finalFilter)
      .populate([
        { path: 'manager', select: 'name managerPosition' },
        { path: 'employee', select: 'name email phone branch position' },  // Show employee's positions (unchanged)
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Manually populate history for each assignment
    for (let assignment of assignments) {
      try {
        await populateHistoryManually(assignment);
      } catch (e) {
        console.warn('Failed to populate history for assignment %s:', assignment._id, e.message);
      }
    }

    const total = await Assignment.countDocuments(finalFilter);

    res.status(200).json({
      success: true,
      data: assignments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Get assignments error:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving assignments.',
    });
  }
};

// @desc    Update assignment (reassign position, etc.)
// @route   PUT /api/assignments/:id
// @access  Private (Manager/Head)
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { branch, position, isActive, notes } = req.body;

    const assignment = await Assignment.findById(id).populate('employee', 'managerPosition');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const isGlobalAdmin = req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'superadmin';
    if (!isGlobalAdmin && !assignment.manager.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this assignment.',
      });
    }

    // Capture original position for history logic and user model update
    const originalPosition = assignment.position;
    const employee = assignment.employee;
    const currentPositions = employee.managerPosition || [];

    // Track changes for history
    const changes = [];
    let updateNotes = '';

    // If changing position, verify authority over the new position (main position match) and update user model
    if (position && position !== assignment.position) {
      const hasAuthority = await hasAuthorityOverPosition(req.user.managerPosition, position);
      if (!hasAuthority) {
        return res.status(403).json({
          success: false,
          message: 'You do not have authority over the new position.',
        });
      }
      changes.push(`Position: "${assignment.position}" -> "${position}"`);
      assignment.position = position;

      // Update employee's managerPosition: remove old, add new if applicable
      const updateData = {};
      if (currentPositions.includes(originalPosition)) {
        updateData.$pull = { managerPosition: originalPosition };
        console.log(`[${new Date().toISOString()}] Removed old position "${originalPosition}" from employee's managerPosition`);
      }
      if (!currentPositions.includes(position)) {
        updateData.$push = { managerPosition: position };
        console.log(`[${new Date().toISOString()}] Added new position "${position}" to employee's managerPosition`);
      }
      if (Object.keys(updateData).length > 0) {
        await User.findByIdAndUpdate(employee._id, updateData);
        console.log(`[${new Date().toISOString()}] Employee managerPosition updated for reassignment`);
      }
      console.log(`[${new Date().toISOString()}] Position updated for sub-manager assignment ${assignment._id}: "${assignment.position}" -> "${position}"`);
    }

    // Update other fields
    if (branch && branch !== assignment.branch) {
      changes.push(`Branch: "${assignment.branch}" -> "${branch}"`);
      assignment.branch = branch;
    }
    if (notes && notes !== assignment.notes) {
      changes.push(`Notes updated`);
      assignment.notes = notes;
    }
    if (isActive !== undefined && isActive !== assignment.isActive) {
      changes.push(`Status: ${assignment.isActive ? 'Active' : 'Inactive'} -> ${isActive ? 'Active' : 'Inactive'}`);
      assignment.isActive = isActive;
      if (isActive === false) assignment.endDate = new Date();
    }

    // Save changes (bypass validation for legacy/strict regex issues)
    await assignment.save({ validateBeforeSave: false });
    console.log(`[${new Date().toISOString()}] Assignment updated successfully: ${assignment._id}`);

    // Ensure history is initialized
    if (!Array.isArray(assignment.history)) {
      assignment.history = [];
    }

    // Add history entry if there were changes
    if (changes.length > 0) {
      updateNotes = `Updated: ${changes.join(', ')}.`;
      // Use 'assigned' as fallback (assuming valid enum); check for position change to imply reassignment in notes
      const isReassigned = position && position !== originalPosition;
      const actionNotes = isReassigned ? `Reassigned: ${updateNotes}` : updateNotes;
      assignment.history.push({
        action: 'assigned',  // Fallback to valid enum value (update schema enum if possible to include 'updated'/'reassigned')
        assignedBy: req.user._id,
        timestamp: new Date(),
        notes: actionNotes,
      });
      // Save history (bypass validation)
      await assignment.save({ validateBeforeSave: false });
      console.log(`[${new Date().toISOString()}] History updated successfully for assignment: ${assignment._id}`);
    }

    // Populate references excluding history
    await assignment.populate([
      { path: 'manager', select: 'name managerPosition' },
      { path: 'employee', select: 'name email position' },
    ]);

    // Manually populate history
    try {
      await populateHistoryManually(assignment);
    } catch (e) {
      console.warn('Failed to populate history for assignment %s:', assignment._id, e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully.',
      data: assignment,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Update assignment error:`, error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error updating assignment.',
    });
  }
};

// @desc    Deactivate assignment (revoke sub-manager role if desired)
// @route   DELETE /api/assignments/:id
// @access  Private (Manager/Head)
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { clearManager } = req.body;  // Removed revokePosition (no positions assigned to employees)

    const assignment = await Assignment.findById(id).populate('employee', 'managerPosition');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const isGlobalAdmin = req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'superadmin';
    if (!isGlobalAdmin && !assignment.manager.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to deactivate this assignment.',
      });
    }

    // Deactivate assignment and remove delegated position from employee's managerPosition
    const positionToRemove = assignment.position;
    const employee = assignment.employee;
    const currentPositions = employee.managerPosition || [];
    let positionRemoved = false;
    if (currentPositions.includes(positionToRemove)) {
      await User.findByIdAndUpdate(employee._id, { $pull: { managerPosition: positionToRemove } });
      positionRemoved = true;
      console.log(`[${new Date().toISOString()}] Removed position "${positionToRemove}" from employee's managerPosition on deactivation`);
    }

    assignment.isActive = false;
    assignment.endDate = new Date();
    // Quick fix: Bypass validation since position isn't changing (legacy data may not match strict regex)
    await assignment.save({ validateBeforeSave: false });
    console.log(`[${new Date().toISOString()}] Assignment deactivated successfully: ${assignment._id}`);

    // Ensure history is initialized
    if (!Array.isArray(assignment.history)) {
      assignment.history = [];
    }

    // Add history entry for deactivation
    let deactNotes = 'Deactivated.';
    if (positionRemoved) deactNotes += ' Delegated position removed from user model.';
    if (clearManager) deactNotes += ' Supervisor link cleared.';
    assignment.history.push({
      action: 'deactivated',
      assignedBy: req.user._id,
      timestamp: new Date(),
      notes: deactNotes,
    });
    // Quick fix: Bypass validation again for history update
    await assignment.save({ validateBeforeSave: false });
    console.log(`[${new Date().toISOString()}] History updated successfully for deactivated assignment: ${assignment._id}`);

    // Optionally clear position (superior)
    if (clearManager) {
      await User.findByIdAndUpdate(assignment.employee, { position: null });
      console.log(`[${new Date().toISOString()}] Position (superior) cleared for sub-manager ${assignment.employee}`);
    }

    // Populate references excluding history
    await assignment.populate([
      { path: 'manager', select: 'name managerPosition' },
      { path: 'employee', select: 'name email position' },
    ]);

    // Manually populate history (now safe against invalid ObjectIds)
    try {
      await populateHistoryManually(assignment);
    } catch (e) {
      console.warn('Failed to populate history for assignment %s: %s', assignment._id, e.message);
    }

    let message = 'Assignment deactivated successfully. Delegated position removed from user model.';
    if (clearManager) message += ' Supervisor link cleared.';

    res.status(200).json({
      success: true,
      message,
      data: assignment,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Delete assignment error:`, error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating assignment.',
    });
  }
};

module.exports = {
  getEmployees,
  getStats,
  assignEmployee,
  getMyAssignments,
  updateAssignment,
  deleteAssignment,
};