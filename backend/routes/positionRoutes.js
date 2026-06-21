// routes/positions.js (New file: Routes for PositionController - Protected by authenticateUser, with role checks in controllers)

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../Middleware/authMiddleware');
const {
  createPosition,
  editPosition,
  deletePosition,
  assignUserPosition,
  removeUserPosition,
  getPositionAndUserData,
  getUserDetails,
  getHistory,
  assignRole,
  removeRole,
} = require('../Controller/PositionController');

// All routes require authentication
router.use(authenticateUser);

// Position CRUD routes (admin/subadmin with User Management)
router.post('/positions', createPosition);
router.put('/positions', editPosition);  // Expects { positionId, name } in body
router.delete('/positions', deletePosition);  // Expects { positionId } in body

// Position assignment routes (admin/subadmin with User Management)
router.post('/assign-position', assignUserPosition);  // Expects { uniqueId, positionId } in body
router.post('/remove-position', removeUserPosition);  // POST for remove with body { uniqueId, positionId }

// Data fetching routes
router.get('/data', getPositionAndUserData);  // Returns positions and users for roles/assignments tabs
router.get('/user/:uniqueId', getUserDetails);  // User details by uniqueId
router.get('/history', getHistory);  // Position change history (admin only, checked in controller)

// Role management routes (admin only, checked in controller)
router.post('/assign-role', assignRole);  // Expects { uniqueId, newRole } in body
router.post('/remove-role', removeRole);  // Expects { uniqueId } in body (demotes manager to employee)

// 404 handler
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 404 in positions router: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: 'Route not found in positions API' });
});

// Error handler
router.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Route error in positions:`, err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;