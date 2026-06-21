// routes/authRoutes.js (updated)
const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');
const { authenticateUser, isAdminOrHR } = require('../Middleware/authMiddleware');
const User = require('../models/User');
// Middleware to check for admin, subadmin, or employee with position
router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);

router.post('/send-login-otp', authenticateUser, authController.sendLoginOtp);
router.post('/verify-login-otp', authenticateUser, authController.verifyLoginOtp);

router.get('/profile', authenticateUser, authController.getUserProfile);
router.patch('/profile', authenticateUser, authController.updateUserProfile);
// Admin/HR route: List staff members with internal roles
router.get('/admin/staff', authenticateUser, isAdminOrHR, authController.getStaffMembers);
router.get('/admin/users', authenticateUser, isAdminOrHR, authController.getUsers);
// Authorized staff viewing (Service Managers, Employee with position, etc.)
router.get('/staff-members', authenticateUser, authController.getStaffMembers);
module.exports = router;
