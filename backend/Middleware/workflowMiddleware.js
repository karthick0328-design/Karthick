// Middleware/workflowMiddleware.js - New middleware for workflow system
const mongoose = require('mongoose');

// Check for service manager (manager with specific service)
const isServiceManager = (req, res, next) => {
    if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Manager role required.'
        });
    }

    const requiredService = req.body.service || req.params.service || req.query.service;
    const userService = (req.user.service || '').trim();

    if (requiredService && userService !== requiredService) {
        console.warn(`[${new Date().toISOString()}] isServiceManager denied: service mismatch "${userService}" vs "${requiredService}" for user ${req.user.id}`);
        return res.status(403).json({
            success: false,
            message: `Access denied. Only ${requiredService} managers can access this resource.`
        });
    }

    console.log(`[${new Date().toISOString()}] isServiceManager passed for user ${req.user.id} with service ${userService}`);
    next();
};

// Check for financial manager (manager in Financial department, or admin/superadmin)
const isFinancialManager = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const role = (req.user.role || '').toLowerCase();

    // Superadmin and Admin bypass department check
    if (role === 'admin' || role === 'superadmin') {
        console.log(`[${new Date().toISOString()}] isFinancialManager passed (${role}) for user ${req.user.id}`);
        return next();
    }

    if (role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Manager role required.'
        });
    }

    const userDept = (req.user.department || '').trim().toLowerCase();
    const expectedDept = 'financial';

    if (userDept !== expectedDept) {
        console.warn(`[${new Date().toISOString()}] isFinancialManager denied: department mismatch "${req.user.department}" for user ${req.user.id}`);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only Financial managers can access this resource.'
        });
    }

    console.log(`[${new Date().toISOString()}] isFinancialManager passed for user ${req.user.id}`);
    next();
};

// Check for TL role
const isTL = (req, res, next) => {
    if (!req.user || !req.user.role) {
        return res.status(401).json({ success: false, message: 'Not authorized, user or role not found' });
    }

    const userRole = req.user.role.toLowerCase();
    if (userRole === 'tl') {
        console.log(`[${new Date().toISOString()}] TL access granted for user: ${req.user.id}`);
        return next();
    }

    console.error(`[${new Date().toISOString()}] Access denied for user: ${req.user.id} (Role: ${userRole})`);
    return res.status(403).json({ success: false, message: 'Access denied. TL access required.' });
};

// Check if user can view project progress (50% payment rule)
const canViewProgress = async (req, res, next) => {
    try {
        const Project = require('../models/Project');
        const projectId = req.params.id || req.params.projectId;

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Project ID required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Check if user can view progress
        if (project.canUserViewProgress(req.user.id)) {
            return next();
        }

        // User cannot view - check payment status
        const paidAmount = project.paymentDetails?.paidAmount || 0;
        const totalAmount = project.paymentDetails?.amount || 0;
        const paidPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

        return res.status(403).json({
            success: false,
            message: `Please pay at least 50% to view progress. Current: ${paidPercentage.toFixed(1)}%`,
            paidPercentage: paidPercentage.toFixed(1)
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in canViewProgress:`, error.message);
        return res.status(500).json({ success: false, message: 'Server error checking progress access' });
    }
};

module.exports = {
    isServiceManager,
    isFinancialManager,
    isTL,
    canViewProgress
};
