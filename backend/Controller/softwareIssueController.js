const SoftwareIssue = require('../models/SoftwareIssue');

// Create a new software issue
exports.createIssue = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const {
            title, description, projectTitle, projectId, projectService,
            issueType, priority, department, service, seniority
        } = req.body;

        const attachments = req.files ? req.files.map(f => f.filename) : [];

        // UPDATED: Check if manager is assigned to the project before creating issue
        const Project = require('../models/Project');
        const userRole = (req.user.role || '').toLowerCase();
        
        if (projectId && userRole === 'manager') {
            const project = await Project.findById(projectId);
            if (project) {
                const isAssigned = project.assignedTo && project.assignedTo.some(id => id.toString() === req.user.id.toString());
                const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';
                const isSales = (project.department || '').toLowerCase().includes('sale'); // Simplified
                
                if (!isAssigned && !isGlobalAdmin && !isSales) {
                    return res.status(403).json({ success: false, message: 'Denied: You are not assigned to this project.' });
                }
            }
        }

        const newIssue = new SoftwareIssue({
            title, description, projectTitle, projectId, projectService,
            issueType, priority, department, service, seniority,
            reportedBy: userId,
            attachments,
            activityLogs: [{
                action: 'Issue Created',
                user: userId
            }]
        });

        const savedIssue = await newIssue.save();
        res.status(201).json({ success: true, count: 1, data: savedIssue });
    } catch (err) {
        console.error('Create issue error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all issues with filtering
exports.getIssues = async (req, res) => {
    try {
        const { department, service, issueType, priority, status } = req.query;
        let query = {};

        if (department) query.department = department;
        if (service) query.service = service;
        if (issueType) query.issueType = issueType;
        if (priority) query.priority = priority;
        if (status) query.status = status;

        const userRole = (req.user.role || '').toLowerCase();
        const userId = req.user.id || req.user._id;

        // UPDATED: Restrict Manager access to only their assigned projects' issues
        if (userRole === 'manager') {
            const Project = require('../models/Project');
            // Check if current manager is a Service Manager or a Global Sales Manager
            const userDept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
            const userService = (req.user.service || '').toLowerCase();
            
            const isSalesDept = userDept.includes('sale') || 
                                userDept === 'services' || 
                                userDept === 'customer services' ||
                                ['sales and customer services', 'sales and customer support', 'customer services'].includes(userDept);
            
            const isSales = isSalesDept && !userService;
            const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

            if (!isSales && !isGlobalAdmin) {
                // Find IDs of projects assigned to this manager
                const myProjects = await Project.find({ assignedTo: userId }).select('_id');
                const projectIds = myProjects.map(p => p._id.toString());
                query.projectId = { $in: projectIds };
            }
        }

        const limit = parseInt(req.query.limit) || 20;

        const issues = await SoftwareIssue.find(query)
            .populate('reportedBy', 'name email role')
            .populate('comments.user', 'name email role')
            .populate('activityLogs.user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json({ success: true, count: issues.length, data: issues });
    } catch (err) {
        console.error('Get issues error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get single issue
exports.getIssueById = async (req, res) => {
    try {
        const issue = await SoftwareIssue.findById(req.params.id)
            .populate('reportedBy', 'name email role department service')
            .populate('comments.user', 'name email role')
            .populate('activityLogs.user', 'name email role');

        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        res.status(200).json({ success: true, data: issue });
    } catch (err) {
        console.error('Get issue by error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update issue status
exports.updateIssueStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.user.id || req.user._id;
        const userRole = (req.user.role || '').toLowerCase();

        const issue = await SoftwareIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        // Authorization: Admin, Superadmin, or the Reporter
        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        const isReporter = issue.reportedBy.toString() === userId.toString();

        if (!isAdmin && !isReporter) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this issue' });
        }

        issue.status = status;
        issue.activityLogs.push({
            action: `Status changed to ${status}`,
            user: userId
        });

        await issue.save();

        const updatedIssue = await SoftwareIssue.findById(issue._id)
            .populate('reportedBy', 'name email role')
            .populate('comments.user', 'name email role')
            .populate('activityLogs.user', 'name email role');

        res.status(200).json({ success: true, data: updatedIssue });
    } catch (err) {
        console.error('Update issue status error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Add comment
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id || req.user._id;
        const userRole = (req.user.role || '').toLowerCase();
        const attachments = req.files ? req.files.map(f => f.filename) : [];

        const issue = await SoftwareIssue.findById(req.params.id);
        if (!issue) {
            return res.status(404).json({ success: false, message: 'Issue not found' });
        }

        // Authorization: Admin, Superadmin, or the Reporter
        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        const isReporter = issue.reportedBy.toString() === userId.toString();

        if (!isAdmin && !isReporter) {
            return res.status(403).json({ success: false, message: 'Not authorized to comment on this issue' });
        }

        issue.comments.push({
            text,
            user: userId,
            attachments
        });

        issue.activityLogs.push({
            action: 'Added a comment',
            user: userId
        });

        await issue.save();
        const updatedIssue = await SoftwareIssue.findById(req.params.id)
            .populate('comments.user', 'name email role')
            .populate('activityLogs.user', 'name email role');

        res.status(200).json({ success: true, data: updatedIssue });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
