const express = require('express');
const router = express.Router();
const { authenticateUser, isAdmin } = require('../Middleware/authMiddleware');
const { 
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
} = require('../Controller/adminController');
const upload = require('../Middleware/announcementUploadMiddleware');
const financialUpload = require('../Middleware/financialUploadMiddleware');

// All Projects
router.get('/projects/all', authenticateUser, isAdmin, getAllProjects);
router.get('/projects/all/:id', authenticateUser, isAdmin, getAdminProjectById);

// Dashboard & Analytics
router.get('/dashboard', authenticateUser, isAdmin, getAdminDashboard);
router.get('/projects/:department', authenticateUser, isAdmin, getAdminProjectsByDept);
router.get('/analytics', authenticateUser, isAdmin, getAdminAnalytics);

// Recruitment
router.get('/recruitment-data', authenticateUser, isAdmin, getRecruitmentData);

// Internal User Management
router.post('/create-internal-user', authenticateUser, isAdmin, createInternalUser);
router.get('/internal-users', authenticateUser, isAdmin, getAllInternalUsers);
router.get('/internal-users/:id', authenticateUser, isAdmin, getInternalUser);
router.put('/internal-users/:id', authenticateUser, isAdmin, updateInternalUser);
router.delete('/internal-users/:id', authenticateUser, isAdmin, deleteInternalUser);
router.get('/internal-users/:id/history', authenticateUser, isAdmin, getUserHistory);
router.get('/history', authenticateUser, isAdmin, getAdminHistory);

// Client Management
router.get('/clients', authenticateUser, isAdmin, getAllClients);

// Drive Usage
router.get('/drive/usage', authenticateUser, isAdmin, getDriveUsage);

// Announcements (Advertisements, Job Openings, etc.)
router.get('/announcements', authenticateUser, isAdmin, getAnnouncements);

// Payments & Finance
router.get('/payments/all', authenticateUser, isAdmin, getAllPayments);
router.get('/service-profit', authenticateUser, isAdmin, getServiceProfit);
router.get('/finance/cashbook', authenticateUser, isAdmin, getCashBook);
router.get('/finance/summary', authenticateUser, isAdmin, getFinancialSummary);
router.get('/finance/expenses', authenticateUser, isAdmin, getExpenses);
router.post('/finance/expenses', authenticateUser, isAdmin, (req, res, next) => {
  financialUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] ❌ Expense Upload Error:`, err.message);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    next();
  });
}, createExpense);
router.delete('/finance/expenses/:id', authenticateUser, isAdmin, deleteExpense);
router.get('/finance/salaries', authenticateUser, isAdmin, getSalaries);
router.get('/finance/salary/:id', authenticateUser, isAdmin, getSalaryById);
router.put('/finance/salary/:id', authenticateUser, isAdmin, updateSalary);
router.delete('/finance/salary/:id', authenticateUser, isAdmin, deleteSalary);
router.get('/finance/gst', authenticateUser, isAdmin, getGSTReport);

// Operations
router.get('/meetings/all', authenticateUser, isAdmin, getAllMeetings);
router.get('/attendance/all', authenticateUser, isAdmin, getAttendance);

// Updates
router.put('/projects/:id/status', authenticateUser, isAdmin, updateProjectStatus);
router.put('/internal-users/:id/status', authenticateUser, isAdmin, updateMemberStatus);
router.put('/internal-users/:id/role', authenticateUser, isAdmin, updateMemberRole);
router.put('/attendance/:id', authenticateUser, isAdmin, updateAttendanceRecord);

// Creation
router.post('/finance/salary', authenticateUser, isAdmin, createSalary);
router.post('/announcements', authenticateUser, isAdmin, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]), createAnnouncement);
router.put('/announcements/:id', authenticateUser, isAdmin, upload.fields([{ name: 'images', maxCount: 10 }, { name: 'attachments', maxCount: 10 }]), updateAnnouncement);
router.delete('/announcements/:id', authenticateUser, isAdmin, deleteAnnouncement);

// Job Applications Management
router.get('/job-applications', authenticateUser, isAdmin, getJobApplications);
router.put('/job-applications/:id/status', authenticateUser, isAdmin, updateJobApplicationStatus);

// Special Data
router.get('/drive/quota', authenticateUser, isAdmin, getDriveQuota);

module.exports = router;