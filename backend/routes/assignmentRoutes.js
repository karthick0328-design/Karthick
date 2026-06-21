const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getStats,
  assignEmployee,
  getMyAssignments,
  updateAssignment,
  deleteAssignment,
} = require('../Controller/assignmentController');
const { authenticateUser, isManager } = require('../Middleware/authMiddleware');

// Debug: Log types to confirm exports (remove after fixing)
console.log('Loaded middleware:', { authenticateUser: typeof authenticateUser, isManager: typeof isManager });

// Authenticate all routes
router.use(authenticateUser);

// Enforce manager-like role for all routes (defensive: skip if undefined)
if (typeof isManager === 'function') {
  router.use(isManager);
} else {
  console.warn('isManager middleware is undefined — skipping. Check authMiddleware.js exports.');
}

// Updated: Strict managerPosition check for allowed roles (admin, superadmin, subadmin, manager)
router.use((req, res, next) => {
  const user = req.user;
  const userRole = user.role.toLowerCase();
  
  if (!['admin', 'superadmin', 'subadmin', 'manager'].includes(userRole)) {
    console.error(`[${new Date().toISOString()}] Access denied: Invalid role ${userRole} for user ${user.id} on ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin, Superadmin, Subadmin, or Manager access required.',
    });
  }

  // Bypass managerPosition check for admin/superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    return next();
  }

  if (!user.managerPosition || !Array.isArray(user.managerPosition) || user.managerPosition.length === 0) {
    console.error(`[${new Date().toISOString()}] Access denied: No managerPositions for ${userRole} ${user.id} on ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Subadmin or Manager with position authority required.',
    });
  }
  console.log(`[${new Date().toISOString()}] ManagerPosition access granted for user: ${user.id} (Role: ${userRole}) with managerPositions: [${user.managerPosition.join(', ')}] on ${req.method} ${req.originalUrl}`);
  return next();
});

// Routes
router.get('/employees', getEmployees); // NEW: Eligible employees for assignment

router.get('/stats', getStats); // NEW: Dashboard stats

router
  .route('/')
  .post(assignEmployee) // POST /api/assignments - Assign employee
  .get(getMyAssignments); // GET /api/assignments - Get my assignments

router
  .route('/:id')
  .put(updateAssignment) // PUT /api/assignments/:id - Update assignment
  .delete(deleteAssignment); // DELETE /api/assignments/:id - Deactivate assignment

module.exports = router;