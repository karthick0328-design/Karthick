const express = require('express');
const { authenticateUser } = require('../Middleware/authMiddleware');

const router = express.Router();

const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getComplianceAnalytics,
  getPerformanceReports
} = require('../Controller/complaintController');

// All routes are protected
router.use(authenticateUser);

// Analytics & Reports (Dashboard data)
router.get('/analytics', getComplianceAnalytics);
router.get('/performance-reports', getPerformanceReports);

// Complaint CRUD
router.post('/', createComplaint); // Any role can create depending on controller rules
router.get('/', getComplaints); // Any role can get, filtered by controller
router.get('/:id', getComplaintById);
router.put('/:id/status', updateComplaintStatus); // Restrict to admin/head inside controller or middleware

module.exports = router;
