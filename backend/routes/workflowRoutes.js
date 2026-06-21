// routes/workflowRoutes.js - Routes for project workflow system
const express = require('express');
const router = express.Router();

// Import controllers
const {
    assignToServiceManager,
    pushToManager,
    requestFinancialApproval,
    approveAmount,
    fixAmount,
    assignToTL,
    assignToEmployee,
    notifyNoEmployee,
    escalateToHR,
    addEmployeeUpdate,
    getEmployeeUpdates,
    getMyNotifications,
    markNotificationRead
    
} = require('../Controller/workflowController');

// Import middleware
const { authenticateUser, isSalesManager, isManager } = require('../Middleware/authMiddleware');
const { isServiceManager, isFinancialManager, isTL, canViewProgress } = require('../Middleware/workflowMiddleware');

// ===== Assignment Routes =====

// Assign project to service manager (Sales Manager only)
router.post('/projects/:projectId/assign-to-service-manager',
    authenticateUser,
    isSalesManager,
    assignToServiceManager
);

// Push project to another manager (Current manager only, same service)
router.post('/projects/:projectId/push-to-manager',
    authenticateUser,
    isManager,
    pushToManager
);

// Assign to TL (Service Manager only, after amount fixed)
router.post('/projects/:projectId/assign-to-tl',
    authenticateUser,
    isServiceManager,
    assignToTL
);

// Assign to Employee (TL only)
router.post('/projects/:projectId/assign-to-employee',
    authenticateUser,
    isTL,
    assignToEmployee
);

// ===== Financial Approval Routes =====

// Request financial approval (Service Manager only)
router.post('/projects/:projectId/request-financial-approval',
    authenticateUser,
    isServiceManager,
    requestFinancialApproval
);

// Approve/reject amount (Financial Manager only)
router.post('/projects/:projectId/approve-amount',
    authenticateUser,
    isFinancialManager,
    approveAmount
);

// Fix final amount (Service Manager only, after financial approval)
router.post('/projects/:projectId/fix-amount',
    authenticateUser,
    isServiceManager,
    fixAmount
);

// ===== Alerts and Escalations =====

// Notify manager about no employee available (TL only)
router.post('/projects/:projectId/notify-no-employee',
    authenticateUser,
    isTL,
    notifyNoEmployee
);

// Escalate to HR (Manager only)
router.post('/projects/:projectId/escalate-to-hr',
    authenticateUser,
    isManager,
    escalateToHR
);

// ===== Employee Updates =====

// Add employee update (Employee only)
router.post('/projects/:projectId/employee-update',
    authenticateUser,
    addEmployeeUpdate
);

// Get employee updates (TL, Manager, or User with 50% payment)
router.get('/projects/:projectId/employee-updates',
    authenticateUser,
    canViewProgress,
    getEmployeeUpdates
);

// ===== Notifications =====

// Get my notifications
router.get('/notifications',
    authenticateUser,
    getMyNotifications
);

// Mark notification as read
router.put('/notifications/:id/read',
    authenticateUser,
    markNotificationRead
);

module.exports = router;
