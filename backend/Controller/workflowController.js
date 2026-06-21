// Controller/workflowController.js - Workflow management for project assignment and approvals
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

// Helper: Create notification
const createNotification = async (recipientId, type, title, message, projectId, metadata = {}) => {
    try {
        await Notification.createNotification({
            recipientId,
            type,
            title,
            message,
            projectId,
            metadata
        });
        console.log(`[${new Date().toISOString()}] Notification created: ${type} for user ${recipientId}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error creating notification:`, error.message);
    }
};

// 1. Assign project to service manager (Sales & Customer Services manager with matching service)
const assignToServiceManager = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { managerId } = req.body; // Optional: specific manager ID

        const project = await Project.findById(projectId).populate('userId', 'name email');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (!project.service) {
            return res.status(400).json({ success: false, message: 'Project service not specified' });
        }

        // Find eligible managers: Sales & Customer Services department + matching service
        const query = {
            role: 'manager',
            department: 'Sales and Customer Services',
            service: project.service,
            isActive: true
        };

        if (managerId) {
            query._id = managerId;
        }

        const managers = await User.find(query).sort({ reviewedAt: 1 });

        if (managers.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No active managers found for service: ${project.service}`
            });
        }

        const assignedManager = managers[0];

        // Update assignment chain
        project.assignmentChain.push({
            userId: assignedManager._id,
            role: 'manager',
            service: project.service,
            department: assignedManager.department,
            assignedBy: req.user.id
        });

        project.currentAssignee = {
            userId: assignedManager._id,
            role: 'manager',
            service: project.service,
            assignedAt: new Date()
        };

        project.assignedTo = [assignedManager._id]; // Legacy field
        project.status = 'Under Review';

        await project.save();
        await project.logActivity(
            `Assigned to ${assignedManager.name} (${project.service} Manager)`,
            req.user.id,
            { statusChange: 'Under Review' }
        );

        // Create notification
        await createNotification(
            assignedManager._id,
            'assignment',
            'New Project Assigned',
            `Project ${project.uniqueId} has been assigned to you for ${project.service} service`,
            project._id,
            { service: project.service }
        );

        res.status(200).json({
            success: true,
            data: { project, assignedManager },
            message: `Project assigned to ${assignedManager.name}`
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in assignToServiceManager:`, error.message);
        res.status(500).json({ success: false, message: 'Server error assigning project' });
    }
};

// 2. Push project to another manager (same service only)
const pushToManager = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { targetManagerId, reason } = req.body;

        if (!targetManagerId) {
            return res.status(400).json({ success: false, message: 'Target manager ID required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify current user is assigned manager
        if (!project.currentAssignee || project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned manager can push project' });
        }

        // Find target manager
        const targetManager = await User.findById(targetManagerId);
        if (!targetManager || targetManager.role !== 'manager' || !targetManager.isActive) {
            return res.status(400).json({ success: false, message: 'Invalid target manager' });
        }

        // Verify same service
        if (targetManager.service !== project.service) {
            return res.status(400).json({
                success: false,
                message: `Can only push to managers with same service (${project.service})`
            });
        }

        // Update assignment
        project.assignmentChain.push({
            userId: targetManager._id,
            role: 'manager',
            service: project.service,
            department: targetManager.department,
            assignedBy: req.user.id
        });

        project.currentAssignee = {
            userId: targetManager._id,
            role: 'manager',
            service: project.service,
            assignedAt: new Date()
        };

        project.assignedTo = [targetManager._id];

        await project.save();
        await project.logActivity(
            `Pushed to ${targetManager.name} by ${req.user.name}. Reason: ${reason || 'Not specified'}`,
            req.user.id
        );

        await createNotification(
            targetManager._id,
            'manager_push',
            'Project Pushed to You',
            `Project ${project.uniqueId} was pushed to you by ${req.user.name}`,
            project._id,
            { reason, previousManager: req.user.name }
        );

        res.status(200).json({
            success: true,
            data: { project, targetManager },
            message: `Project pushed to ${targetManager.name}`
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in pushToManager:`, error.message);
        res.status(500).json({ success: false, message: 'Server error pushing project' });
    }
};

// 3. Request financial approval
const requestFinancialApproval = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { amount, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify current user is assigned manager
        if (!project.currentAssignee || project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned manager can request approval' });
        }

        // Find Financial Manager
        const financialManager = await User.findOne({
            role: 'manager',
            department: 'Financial',
            isActive: true
        });

        if (!financialManager) {
            return res.status(400).json({ success: false, message: 'No Financial Manager found' });
        }

        // Update financial approval
        project.financialApproval = {
            requestedBy: req.user.id,
            requestedAt: new Date(),
            originalAmount: amount,
            notes,
            status: 'pending'
        };

        await project.save();
        await project.logActivity(
            `Financial approval requested for amount: $${amount}`,
            req.user.id
        );

        await createNotification(
            financialManager._id,
            'financial_approval_request',
            'Financial Approval Requested',
            `${req.user.name} requests approval for $${amount} for project ${project.uniqueId}`,
            project._id,
            { amount, notes }
        );

        res.status(200).json({
            success: true,
            data: { project },
            message: 'Financial approval requested successfully'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in requestFinancialApproval:`, error.message);
        res.status(500).json({ success: false, message: 'Server error requesting approval' });
    }
};

// 4. Approve/adjust amount (Financial Manager only)
const approveAmount = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { approvedAmount, notes, status } = req.body; // status: 'approved' or 'rejected'

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status required (approved/rejected)' });
        }

        if (status === 'approved' && (!approvedAmount || approvedAmount <= 0)) {
            return res.status(400).json({ success: false, message: 'Valid approved amount required' });
        }

        const project = await Project.findById(projectId).populate('financialApproval.requestedBy', 'name email');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (!project.financialApproval || project.financialApproval.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'No pending financial approval request' });
        }

        // Update approval
        project.financialApproval.approvedBy = req.user.id;
        project.financialApproval.approvedAt = new Date();
        project.financialApproval.approvedAmount = status === 'approved' ? approvedAmount : null;
        project.financialApproval.notes = notes || project.financialApproval.notes;
        project.financialApproval.status = status;

        await project.save();
        await project.logActivity(
            `Financial approval ${status}: ${status === 'approved' ? `$${approvedAmount}` : 'Rejected'}`,
            req.user.id
        );

        const requestingManager = project.financialApproval.requestedBy;
        await createNotification(
            requestingManager._id,
            'financial_approval_response',
            `Financial Approval ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            status === 'approved'
                ? `Your request for project ${project.uniqueId} was approved at $${approvedAmount}`
                : `Your request for project ${project.uniqueId} was rejected`,
            project._id,
            { status, approvedAmount, notes }
        );

        res.status(200).json({
            success: true,
            data: { project },
            message: `Amount ${status} successfully`
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in approveAmount:`, error.message);
        res.status(500).json({ success: false, message: 'Server error approving amount' });
    }
};

// 5. Fix final amount (Service Manager only, after financial approval)
const fixAmount = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { finalAmount } = req.body;

        if (!finalAmount || finalAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid final amount required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify financial approval exists and is approved
        if (!project.financialApproval || project.financialApproval.status !== 'approved') {
            return res.status(400).json({ success: false, message: 'Financial approval required before fixing amount' });
        }

        // Verify current user is assigned manager
        if (!project.currentAssignee || project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned manager can fix amount' });
        }

        project.amountFixed = true;
        project.amountFixedBy = req.user.id;
        project.amountFixedAt = new Date();
        project.quotedAmount = finalAmount;

        await project.save();
        await project.logActivity(
            `Amount fixed at $${finalAmount} by ${req.user.name}`,
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: { project },
            message: 'Amount fixed successfully. You can now assign to TL.'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in fixAmount:`, error.message);
        res.status(500).json({ success: false, message: 'Server error fixing amount' });
    }
};

// 6. Assign to TL (Manager only, after amount fixed)
const assignToTL = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { tlId } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (!project.amountFixed) {
            return res.status(400).json({ success: false, message: 'Amount must be fixed before assigning to TL' });
        }

        // Find TL with matching service
        const query = {
            role: 'tl',
            service: project.service,
            isActive: true
        };

        if (tlId) {
            query._id = tlId;
        }

        const tls = await User.find(query);

        if (tls.length === 0) {
            return res.status(400).json({
                success: false,
                message: `No active TLs found for service: ${project.service}`
            });
        }

        const assignedTL = tls[0];

        // Update assignment
        project.assignmentChain.push({
            userId: assignedTL._id,
            role: 'tl',
            service: project.service,
            department: assignedTL.department,
            assignedBy: req.user.id
        });

        project.currentAssignee = {
            userId: assignedTL._id,
            role: 'tl',
            service: project.service,
            assignedAt: new Date()
        };

        project.status = 'In Progress';

        await project.save();
        await project.logActivity(
            `Assigned to TL: ${assignedTL.name}`,
            req.user.id,
            { statusChange: 'In Progress' }
        );

        await createNotification(
            assignedTL._id,
            'assignment',
            'Project Assigned to You as TL',
            `Project ${project.uniqueId} has been assigned to you by ${req.user.name}`,
            project._id,
            { service: project.service, managerId: req.user.id }
        );

        res.status(200).json({
            success: true,
            data: { project, assignedTL },
            message: `Project assigned to TL: ${assignedTL.name}`
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in assignToTL:`, error.message);
        res.status(500).json({ success: false, message: 'Server error assigning to TL' });
    }
};

// 7. Assign to Employee (TL only)
const assignToEmployee = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: 'Employee ID required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify current user is assigned TL
        if (!project.currentAssignee || project.currentAssignee.role !== 'tl' ||
            project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned TL can assign to employee' });
        }

        // Find employee
        const employee = await User.findOne({
            _id: employeeId,
            role: 'employee',
            service: project.service,
            isActive: true
        });

        if (!employee) {
            return res.status(400).json({ success: false, message: 'Employee not found or invalid' });
        }

        // Update assignment
        project.assignmentChain.push({
            userId: employee._id,
            role: 'employee',
            service: project.service,
            department: employee.department,
            assignedBy: req.user.id
        });

        project.currentAssignee = {
            userId: employee._id,
            role: 'employee',
            service: project.service,
            assignedAt: new Date()
        };

        await project.save();
        await project.logActivity(
            `Assigned to Employee: ${employee.name} by TL ${req.user.name}`,
            req.user.id
        );

        // Notify employee
        await createNotification(
            employee._id,
            'assignment',
            'Project Assigned to You',
            `Project ${project.uniqueId} has been assigned to you by TL ${req.user.name}`,
            project._id,
            { service: project.service, tlId: req.user.id }
        );

        // Notify manager about employee assignment
        const managerAssignment = project.assignmentChain.find(a => a.role === 'manager');
        if (managerAssignment) {
            await createNotification(
                managerAssignment.userId,
                'project_update',
                'Employee Assigned',
                `TL ${req.user.name} assigned ${employee.name} to project ${project.uniqueId}`,
                project._id,
                { employeeName: employee.name, tlName: req.user.name }
            );
        }

        res.status(200).json({
            success: true,
            data: { project, employee },
            message: `Project assigned to employee: ${employee.name}`
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in assignToEmployee:`, error.message);
        res.status(500).json({ success: false, message: 'Server error assigning to employee' });
    }
};

// 8. Notify no employee available (TL to Manager)
const notifyNoEmployee = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { reason } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify current user is assigned TL
        if (!project.currentAssignee || project.currentAssignee.role !== 'tl' ||
            project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned TL can send this alert' });
        }

        // Find manager in assignment chain
        const managerAssignment = project.assignmentChain.find(a => a.role === 'manager');
        if (!managerAssignment) {
            return res.status(400).json({ success: false, message: 'No manager found in assignment chain' });
        }

        await project.logActivity(
            `TL ${req.user.name} reported: No employee available. Reason: ${reason || 'Not specified'}`,
            req.user.id
        );

        await createNotification(
            managerAssignment.userId,
            'no_employee_alert',
            'No Employee Available',
            `TL ${req.user.name} reports no employee available for project ${project.uniqueId}`,
            project._id,
            { reason, tlName: req.user.name, service: project.service }
        );

        res.status(200).json({
            success: true,
            message: 'Manager notified about employee shortage'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in notifyNoEmployee:`, error.message);
        res.status(500).json({ success: false, message: 'Server error sending notification' });
    }
};

// 9. Escalate to HR (Manager only)
const escalateToHR = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { reason } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Find HR Manager
        const hrManager = await User.findOne({
            role: 'manager',
            department: 'Human Resources',
            isActive: true
        });

        if (!hrManager) {
            return res.status(400).json({ success: false, message: 'No HR Manager found' });
        }

        await project.logActivity(
            `Escalated to HR by ${req.user.name}. Reason: ${reason || 'Employee shortage'}`,
            req.user.id
        );

        await createNotification(
            hrManager._id,
            'hr_escalation',
            'Employee Shortage Escalation',
            `${req.user.name} escalated project ${project.uniqueId} due to employee shortage`,
            project._id,
            { reason, managerName: req.user.name, service: project.service }
        );

        res.status(200).json({
            success: true,
            message: 'Escalated to HR successfully'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in escalateToHR:`, error.message);
        res.status(500).json({ success: false, message: 'Server error escalating to HR' });
    }
};

// 10. Add employee update (Employee only)
const addEmployeeUpdate = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { description, files } = req.body;

        if (!description || String(description).trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Update description required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Verify current user is assigned employee
        if (!project.currentAssignee || project.currentAssignee.role !== 'employee' ||
            project.currentAssignee.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only assigned employee can add updates' });
        }

        // Find TL and Manager to make update visible to them
        const tlAssignment = project.assignmentChain.find(a => a.role === 'tl');
        const managerAssignment = project.assignmentChain.find(a => a.role === 'manager');

        const visibleTo = [];
        if (tlAssignment) visibleTo.push(tlAssignment.userId);
        if (managerAssignment) visibleTo.push(managerAssignment.userId);

        await project.addEmployeeUpdate(description, files || [], req.user.id, visibleTo);
        await project.logActivity(
            `Employee update added by ${req.user.name}`,
            req.user.id
        );

        // Notify TL and Manager
        for (const userId of visibleTo) {
            await createNotification(
                userId,
                'project_update',
                'New Employee Update',
                `${req.user.name} added an update to project ${project.uniqueId}`,
                project._id,
                { employeeName: req.user.name }
            );
        }

        res.status(201).json({
            success: true,
            data: { project },
            message: 'Update added successfully'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in addEmployeeUpdate:`, error.message);
        res.status(500).json({ success: false, message: 'Server error adding update' });
    }
};

// 11. Get employee updates (TL and Manager can view)
const getEmployeeUpdates = async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await Project.findById(projectId)
            .populate('employeeUpdates.updatedBy', 'name email uniqueId role')
            .populate('employeeUpdates.visibleTo', 'name role');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Check if user can view updates
        const isAssigned = project.assignmentChain.some(a => a.userId.toString() === req.user.id);
        const isOwner = project.userId.toString() === req.user.id && project.progressVisibleToUser;

        if (!isAssigned && !isOwner) {
            return res.status(403).json({ success: false, message: 'Access denied to employee updates' });
        }

        res.status(200).json({
            success: true,
            data: { updates: project.employeeUpdates },
            count: project.employeeUpdates.length
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in getEmployeeUpdates:`, error.message);
        res.status(500).json({ success: false, message: 'Server error fetching updates' });
    }
};

// 12. Get my notifications
const getMyNotifications = async (req, res) => {
    try {
        const { limit = 50, unreadOnly = false } = req.query;

        const query = { recipientId: req.user.id };
        if (unreadOnly === 'true') {
            query.read = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('projectId', 'uniqueId department service')
            .populate('senderId', 'name email role');

        const unreadCount = await Notification.getUnreadCount(req.user.id);

        res.status(200).json({
            success: true,
            data: notifications,
            unreadCount,
            count: notifications.length
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in getMyNotifications:`, error.message);
        res.status(500).json({ success: false, message: 'Server error fetching notifications' });
    }
};

// 13. Mark notification as read
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOne({ _id: id, recipientId: req.user.id });
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        await notification.markAsRead();

        res.status(200).json({
            success: true,
            data: notification,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in markNotificationRead:`, error.message);
        res.status(500).json({ success: false, message: 'Server error updating notification' });
    }
};

module.exports = {
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
};
