// routes/hrRoutes.js (Updated: Changed middleware to isHRPersonnel for general HR access (allows HR managers and subadmins); Added /managers route protected by isHR (subadmin-only) for viewing all managers as "recent activity")
const express = require('express');
const router = express.Router();
const { authenticateUser, isHR, isHRPersonnel } = require('../Middleware/authMiddleware');
const { assignRoleAndDepartment, createUser, getUser, getUsers, updateUser, deleteUser, promoteUser, demoteUser, getManagers } = require('../Controller/hrController');

// GET /api/hr/internal-users - List users with pagination/search/filters/sorting
router.get(
  '/internal-users',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  getUsers
);

router.get(
  '/get-user/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  getUser
);

router.put(
  '/assign-role/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  assignRoleAndDepartment
);

// PUT /api/hr/promote/:userId - Promote user to allowed role (manager, tl, employee)
router.put(
  '/promote/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  promoteUser
);

// PUT /api/hr/demote/:userId - Demote user to allowed role (tl, employee)
router.put(
  '/demote/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  demoteUser
);

// POST /api/hr/create-user (existing)
router.post(
  '/create-user',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  createUser
);

router.delete(
  '/delete-user/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  deleteUser
);

// Note: Add update-user route if needed (e.g., PUT /update-user/:userId)
router.put(
  '/update-user/:userId',
  authenticateUser,
  isHRPersonnel, // Allows HR subadmin or HR manager
  updateUser
);

// NEW: GET /api/hr/managers - View all managers (HR subadmin-only for "watching recent activity")
router.get(
  '/managers',
  authenticateUser,
  isHR, // Restricts to HR subadmin only
  getManagers
);

// NEW: HR Dashboard Routes
const {
  getDashboardStats,
  getEmployees,
  getRecruitmentData,
  createInitiative,
  toggleEmployeeStatus,
  createVacancy // Add createVacancy
} = require('../Controller/HRDashboardController');

router.get('/dashboard/stats', authenticateUser, isHRPersonnel, getDashboardStats);
router.get('/dashboard/employees', authenticateUser, isHRPersonnel, getEmployees);
router.get('/dashboard/recruitment', authenticateUser, isHRPersonnel, getRecruitmentData);
router.post('/dashboard/initiative', authenticateUser, isHRPersonnel, createInitiative);
router.post('/dashboard/vacancy', authenticateUser, isHRPersonnel, createVacancy); // Correct route for posting jobs
router.put('/dashboard/employee/:id/toggle-status', authenticateUser, isHRPersonnel, toggleEmployeeStatus);

module.exports = router;