// routes/projectRoutes.js (UPDATED: Removed isEmployee middleware from employee routes; controller handles role validation internally to prevent access issues for senior employees with 'employee' role)
const express = require('express');
const router = express.Router();
const { authenticateUser, isSalesManager, isDepartmentManager, isTL, isFinancialManager, isFinancialPersonnel, isHR, isHRPersonnel } = require('../Middleware/authMiddleware');
const {
  createProject,
  getMyProjects,
  updateProject,
  assignProjectToDepartmentManager,
  getUnassignedProjects,
  getAssignedProjects,
  getProject,
  getFormConfig,
  startTask,
  updateProgress,
  pushProgress,
  completeProject,
  getDrugDiscoveryManagers,
  getSalesManagerActivities,
  getSalesAllAssignedProjects,
  getProjectMessages,
  sendProjectMessage,
  submitProject,
  quoteAmount,
  createPaymentForm,
  submitPayment,
  submitBalancePayment,
  approvePayment,
  generateReceipt,
  assignToTeamLead,
  assignTeamMembers,
  getDrugDiscoveryTLs,
  getDrugDiscoveryEmployees,
  reviewProjectByServiceManager,
  reviewProjectByFinancial,
  reviewProjectByHR,
  submitEmployeeReport,
  reviewReportByManager,
  hrHiringAction,
  sendMessageToManager,
  requestFinancialReview,         // NEW
  requestPurchase,         // NEW
  approveFinancialReview,         // NEW
  getFinancialReviewProjects,     // NEW
  getAllProjectPayments,          // NEW
  getHREscalatedProjects,         // NEW
  sendMessageToHR,                 // NEW
  sendPaymentWarning,
  toggleProjectHold,
  initiateBrandPurchase,          // NEW
  generatePurchaseBill,           // NEW
  completePurchaseDelivery,        // NEW
  getPurchaseProjects,             // NEW
  addProfessionalFee,              // NEW
  updateProfessionalFee,           // NEW
  addProjectAttachments,           // NEW
  updateReceipt                    // NEW
} = require('../Controller/projectController');

// All routes require authentication
router.use(authenticateUser);

// Form config
router.get('/form-config', getFormConfig);

// Managers by department (for SalesManager assignment modal)
router.get('/managers', isSalesManager, getDrugDiscoveryManagers); // FIXED: Removed isSalesManager middleware - uses internal check

// Sales manager assigned projects archive
router.get('/assigned-projects', isSalesManager, getSalesAllAssignedProjects);

// Sales manager activities (includes recent and full history)
router.get('/sales-manager-activities', isSalesManager, getSalesManagerActivities);

const projectUpload = require('../Middleware/projectUploadMiddleware');

// User-specific routes
router.post('/', projectUpload.array('attachments', 5), createProject);  // Now directly submits with files
router.get('/my-projects', getMyProjects);
router.put('/:id', projectUpload.array('attachments', 5), updateProject);  // Only for unassigned Submitted with files
router.post('/:id/submit', projectUpload.array('attachments', 5), submitProject);  // For "Submit for Review" with files

// UPDATED: Payment flow routes (SalesManager creates form after Quote Sent) - renamed and restricted to SalesManager (internal checks)
router.post('/:id/quote', quoteAmount);
router.post('/:id/create-payment-form', createPaymentForm);  // FIXED: Removed middleware - uses internal check
router.post('/:id/submit-payment', submitPayment);  // Owner only (auth checks in controller)
router.post('/:id/submit-balance-payment', submitBalancePayment);  // NEW: Owner balance payment
router.post('/:id/approve-payment', approvePayment);  // FIXED: Removed middleware - uses internal check
router.post('/:id/receipt', generateReceipt);  // FIXED: Removed middleware - uses internal check
router.put('/:id/receipt', updateReceipt);     // NEW: SalesManager can update receipt items

// SalesManager routes - unassigned projects and assignment
router.get('/unassigned-projects', isSalesManager, getUnassignedProjects);
router.post('/assign-to-department/:projectId', assignProjectToDepartmentManager);  // FIXED: Removed middleware - uses internal check

// Department manager routes
router.get('/department/assigned-projects', isDepartmentManager, getAssignedProjects);
router.post('/department/message-hr', isDepartmentManager, sendMessageToHR); // NEW: Escalate specific message to HR
router.post('/department/assigned-projects/:id/start-task', isDepartmentManager, startTask);
router.post('/department/assigned-projects/:id/complete', isDepartmentManager, completeProject);
router.post('/department/assigned-projects/:id/assign-tl', isDepartmentManager, assignToTeamLead); // NEW
router.get('/department/tls', isDepartmentManager, getDrugDiscoveryTLs); // NEW: Fetch TLs for dropdown
router.post('/:id/payment-warning', sendPaymentWarning); // Sales or Dept Manager can warn overdue
router.post('/:id/toggle-hold', isDepartmentManager, toggleProjectHold); // NEW: Stop/Resume project
const progressUpload = require('../Middleware/progressUploadMiddleware');
router.post('/department/assigned-projects/:id/update-progress', isDepartmentManager, progressUpload.array('attachments', 5), updateProgress); // NEW: Allow Manager to update progress
router.post('/department/assigned-projects/:id/push-progress/:activityId', isDepartmentManager, pushProgress); // NEW: Manager pushes to client

// Team Lead routes
router.get('/tl/assigned-projects', isTL, getAssignedProjects);
router.post('/tl/assigned-projects/:id/assign-team', isTL, assignTeamMembers);
router.get('/tl/employees', isTL, getDrugDiscoveryEmployees);
router.post('/tl/assigned-projects/:id/start-task', isTL, startTask);
router.post('/tl/assigned-projects/:id/complete', isTL, completeProject);
router.post('/tl/assigned-projects/:id/push-progress/:activityId', isTL, pushProgress); // NEW: TL pushes to manager
router.post('/tl/assigned-projects/:id/update-progress', isTL, progressUpload.array('attachments', 5), updateProgress);
router.post('/tl/message-manager', isTL, sendMessageToManager);

// Financial Review routes
const financialUpload = require('../Middleware/financialUploadMiddleware');
router.post('/:id/request-financial-review', financialUpload.array('attachments', 10), requestFinancialReview); // Service Manager or Sales Manager requests review
router.post('/:id/request-purchase', financialUpload.array('attachments', 10), requestPurchase); // NEW
router.post('/:id/approve-financial-review', isFinancialManager, approveFinancialReview); // Financial Manager approves/rejects
router.get('/financial/reviews', isFinancialPersonnel, getFinancialReviewProjects); // Get all reviews (Pending/Approved/Rejected) - now accessible by Fin Employees
router.get('/financial/all-payments', isFinancialPersonnel, getAllProjectPayments); // NEW: Get all project payments for Financial Personnel

// NEW: Brand Purchase Workflow (Financial Manager -> Financial Employee)
router.post('/:id/purchase/initiate', isFinancialManager, initiateBrandPurchase);
router.post('/:id/purchase/bill', isFinancialPersonnel, financialUpload.single('file'), generatePurchaseBill);
router.post('/:id/purchase/deliver', isFinancialPersonnel, completePurchaseDelivery);
router.get('/purchase/projects', isFinancialPersonnel, getPurchaseProjects);

// NEW: Professional Fee Routes (Sales Manager adds after service completion)
router.post('/:id/professional-fee', addProfessionalFee); // Sales Manager adds professional fee (internal check)
router.put('/:id/professional-fee', updateProfessionalFee); // Sales Manager updates professional fee

// Project Attachments (General upload)
router.post('/:id/attachments', projectUpload.array('attachments', 5), addProjectAttachments);

// HR Routes
router.get('/hr/escalations', isHRPersonnel, getHREscalatedProjects); // Get escalated reports

// Employee routes (UPDATED: Removed isEmployee middleware; controller handles role checks internally)
router.get('/employee/assigned-projects', getAssignedProjects); // Re-use controller (role-aware)
router.post('/employee/assigned-projects/:id/start-task', startTask); // NEW
router.post('/employee/assigned-projects/:id/update-progress', progressUpload.array('attachments', 5), updateProgress); // NEW: Add progress notes
router.post('/employee/assigned-projects/:id/complete', completeProject); // NEW


// NEW: Workflow Approval Routes
router.post('/:id/review/service-manager', isDepartmentManager, reviewProjectByServiceManager);
router.post('/:id/review/financial', isFinancialManager, reviewProjectByFinancial);
router.post('/:id/review/hr', isHR, reviewProjectByHR); // or isAdminOrHR

// NEW: Reporting Routes
router.post('/:id/report', submitEmployeeReport); // Any team member
router.post('/:id/report/:reportId/review', isDepartmentManager, reviewReportByManager); // Service Manager
router.post('/:id/report/:reportId/hr-action', isHRPersonnel, hrHiringAction); // HR Action (Updated to allow HR Manager)

// NEW: Global Approvals (Fin/HR)
const { getProjectsForApproval } = require('../Controller/projectController');
router.get('/approvals', isDepartmentManager, getProjectsForApproval);



// Project messages routes (chat) - accessible by owner, SalesManager, or assigned manager (before catch-all /:id)
router.get('/:id/messages', getProjectMessages);
router.post('/:id/messages', sendProjectMessage);

// Catch-all for project ID (updated for SalesManager access)
router.get('/:id', getProject);

// 404 handler
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 404 in projects router: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: 'Route not found in projects API' });
});

// Error handler
router.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Route error:`, err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = router;