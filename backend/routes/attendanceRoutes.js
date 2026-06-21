// Combined Attendance & Holiday Routes (updated with /self route for self-attendance)
const express = require('express');
const {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceByUserId,
  getAttendanceForEdit,
  updateAttendanceAdmin,
  approveLeave,
  updateAttendanceStatus,
  getAttendanceSummary,
  exportAttendanceReport,
  getCalendar,
  selfCreateAttendance, // New import
  selfUpdateAttendance, // New import
  rejectLeave, // New import
  requestAttendance,
  approveAttendance,
  updateHeartbeat,
  getLiveMonitoring,
  getUserNotifications,
} = require('../Controller/attendanceController');

const { authenticateUser, isAdminOrHR, isAttendanceUser, isServiceAttendanceManager } = require('../Middleware/authMiddleware'); // Updated imports

const router = express.Router();

// Real-Time Attendance Routes
router.post('/request-attendance', authenticateUser, isAttendanceUser, requestAttendance);
router.post('/approve-attendance/:id', authenticateUser, isAdminOrHR, approveAttendance);
router.post('/heartbeat', authenticateUser, updateHeartbeat);
router.get('/live', authenticateUser, isAdminOrHR, getLiveMonitoring);

// Service-specific attendance routes (Must be defined before /:id to prevent routing collisions)
router.post('/service', authenticateUser, isServiceAttendanceManager, createAttendance);
router.get('/service', authenticateUser, isServiceAttendanceManager, getAttendances);
router.get('/service/summary', authenticateUser, isServiceAttendanceManager, getAttendanceSummary);
router.get('/service/export', authenticateUser, isServiceAttendanceManager, exportAttendanceReport);

// Static Routes (Must be defined before /:id)
router.get('/summary', authenticateUser, isAdminOrHR, getAttendanceSummary);
router.get('/export', authenticateUser, isAdminOrHR, exportAttendanceReport);
router.get('/calendar', authenticateUser, isAttendanceUser, getCalendar);

// Self-attendance routes
router.post('/self', authenticateUser, isAttendanceUser, selfCreateAttendance);
router.put('/self/:id', authenticateUser, isAttendanceUser, selfUpdateAttendance);

// General Attendance Routes
router.post('/', authenticateUser, isAdminOrHR, createAttendance);
router.get('/', authenticateUser, isAdminOrHR, getAttendances);
router.get('/user/:userId', authenticateUser, getAttendanceByUserId);

// Notifications
router.get('/notifications', authenticateUser, getUserNotifications);

// Dynamic ID Routes (Must be last so they don't capture specific paths like /service, /summary)
router.get('/:id', authenticateUser, isAdminOrHR, getAttendanceById);
router.get('/:id/edit', authenticateUser, isAdminOrHR, getAttendanceForEdit);
router.put('/:id/approve', authenticateUser, isAdminOrHR, approveLeave);
router.put('/:id/reject', authenticateUser, isAdminOrHR, rejectLeave);
router.put('/:id/admin', authenticateUser, isAdminOrHR, updateAttendanceAdmin);
router.put('/:id/status', authenticateUser, isAdminOrHR, updateAttendanceStatus);
router.delete('/:id', authenticateUser, isAdminOrHR, deleteAttendance);

module.exports = router;