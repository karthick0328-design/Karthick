const ProjectServiceComplaint = require('../models/ProjectServiceComplaint');
const path = require('path');
const fs = require('fs');

// SEC-FIX: Use precise system-wide and per-user throttling for expensive operations
const deleteRateLimit = new Map();
let globalDeletionCounter = 0;
let lastResetTime = Date.now();

setInterval(() => {
    // Proactive memory cleanup and counter reset
    deleteRateLimit.clear();
    globalDeletionCounter = 0;
    lastResetTime = Date.now();
}, 60000); // Reset every minute for precise 1-min windows
const ProjectServiceComplaintReport = require('../models/ProjectServiceComplaintReport');
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');
const { secureEvidenceRemoval } = require('../Utils/fileSystemOps');

// Helper to determine role priority for visibility/action
const roleLevels = { 'Employee': 1, 'TL': 2, 'Manager': 3, 'Head': 4, 'Admin': 5, 'Superadmin': 6, 'superadmin': 6 };

/**
 * Controller for Project-Based Complaint Management
 */
const projectServiceComplaintController = {

    /**
     * STAGE 8 / ADMIN: Generate a new normalized report
     */
    generateProjectReport: async (req, res) => {
        try {
            const { projectId } = req.params;
            const inputData = req.body; 

            // STAGE 1: DATA NORMALIZATION
            let project, team, tasks, complaintsData;

            if (inputData && inputData.project) {
                project = inputData.project && typeof inputData.project === 'object' ? inputData.project : null;
                team = inputData.team && typeof inputData.team === 'object' ? inputData.team : {};
                tasks = Array.isArray(inputData.tasks) ? inputData.tasks : [];
                complaintsData = Array.isArray(inputData.complaints) ? inputData.complaints : [];
                if (!project) return res.status(400).json({ success: false, message: 'Invalid project data in request body' });
            } else {
                const dbProject = await Project.findById(projectId)
                    .populate('assignedTo', 'name role')
                    .populate('teamLeadId', 'name role')
                    .populate('teamMembers', 'name role');

                if (!dbProject) return res.status(404).json({ success: false, message: 'Project not found' });

                project = {
                    id: dbProject.uniqueId,
                    name: dbProject.category,
                    department: dbProject.department,
                    deadline: dbProject.submittedAt
                };
                team = {
                    manager: dbProject.assignedTo[0],
                    teamLead: dbProject.teamLeadId,
                    employees: dbProject.teamMembers
                };
                tasks = dbProject.activities;
                complaintsData = await ProjectServiceComplaint.find({ projectId, isAiGenerated: false }).limit(100);
            }

            // STAGE 2: AI COMPLAINT GENERATION (AI AUDIT)
            const aiComplaints = [];
            const tasksArray = Array.isArray(tasks) ? tasks : [];
            const delayedTasks = tasksArray.filter(t => t && (t.statusChange === 'Delayed' || t.status === 'Delayed'));
            if (delayedTasks.length > 2) {
                aiComplaints.push({
                    complaintId: `AI-${Math.floor(Date.now() / 1000)}`,
                    raisedBy: 'AI',
                    against: team.teamLead ? team.teamLead._id : team.manager?._id,
                    role: team.teamLead ? 'TL' : 'Manager',
                    category: 'Task Delay',
                    severity: 'Medium',
                    description: `Automated detection: Excessive delays (${delayedTasks.length}) found in project ${project.id}.`
                });
            }

            if (tasksArray.filter(t => t && t.status === 'In Progress').length > 5) {
                aiComplaints.push({
                    raisedBy: 'AI',
                    against: team.manager?._id,
                    role: 'Manager',
                    category: 'Mismanagement',
                    severity: 'High',
                    description: `Automated detection: High volume of pending tasks indicates bottleneck in project ${project.id}.`
                });
            }

            // Merge Manual + AI Complaints
            const complaintsDataArray = Array.isArray(complaintsData) ? complaintsData : [];
            const manualList = complaintsDataArray.map(c => c && (c.toJSON ? c.toJSON() : c)).filter(Boolean);
            const unifiedComplaints = [...manualList];
            
            for (const ai of aiComplaints) {
                const userAgainst = await User.findById(ai.against);
                const newAiComplaint = new ProjectServiceComplaint({
                    projectId: projectId === 'new' ? null : projectId,
                    projectName: project.name,
                    raisedBy: 'AI',
                    raisedByName: 'System Audit',
                    against: ai.against,
                    againstName: userAgainst ? userAgainst.name : 'Target User',
                    role: ai.role,
                    category: ai.category,
                    severity: ai.severity,
                    description: ai.description,
                    isAiGenerated: true,
                    status: 'Open'
                });

                // STAGE 4: VISIBILITY CONTROL
                newAiComplaint.visibleTo = ['Admin', 'Head', 'Manager'];
                if (ai.role === 'TL') newAiComplaint.visibleTo.push('TL');
                if (ai.role === 'Employee') newAiComplaint.visibleTo.push('TL', 'Employee');
                
                // STAGE 5: ACTION OWNERSHIP
                if (ai.role === 'Employee') newAiComplaint.actionBy = 'TL';
                else if (ai.role === 'TL') newAiComplaint.actionBy = 'Manager';
                else if (ai.role === 'Manager') newAiComplaint.actionBy = 'Head';

                if (ai.severity === 'High') newAiComplaint.actionBy = 'Admin';

                if (projectId !== 'new') await newAiComplaint.save();
                unifiedComplaints.push(newAiComplaint);
            }

            // STAGE 3: COMPLAINT ANALYSIS
            const offenderMap = {};
            unifiedComplaints.forEach(c => {
                const key = c.against ? c.against.toString() : 'unknown';
                offenderMap[key] = (offenderMap[key] || 0) + 1;
            });

            const frequentOffenders = Object.keys(offenderMap).filter(id => offenderMap[id] > 1);

            // STAGE 6: ESCALATION FLOW (Updated per requirements)
            const escalations = unifiedComplaints
                .filter(c => c.severity === 'High' || c.status === 'Open')
                .map(c => {
                    let path = [];
                    if (c.role === 'Employee') path = ['TL', 'Manager', 'Head', 'Admin'];
                    else if (c.role === 'TL') path = ['Manager', 'Head', 'Admin'];
                    else if (c.role === 'Manager') path = ['Head', 'Admin'];
                    else path = ['Admin'];

                    return {
                        complaintId: c.complaintId || 'NEW',
                        from: c.role,
                        to: c.actionBy || path[0],
                        severity: c.severity,
                        reason: c.description,
                        escalationLevel: path.join(' → ')
                    };
                });

            // STAGE 7: RESOLUTION ENGINE (Updated per requirements)
            const resolutions = unifiedComplaints.map(c => {
                let immediate = 'Review incident';
                let preventive = 'Internal briefing';
                let rootCause = 'Process optimization';

                if (c.category === 'Performance') {
                    immediate = 'Performance warning';
                    preventive = 'Skills training';
                    rootCause = 'Capability mismatch';
                } else if (c.category === 'Task Delay') {
                    immediate = 'Task reassignment';
                    preventive = 'Buffer time allocation';
                    rootCause = 'Workload balancing';
                } else if (c.category === 'Mismanagement') {
                    immediate = 'Leadership review';
                    preventive = 'Management training';
                    rootCause = 'Governance gap';
                } else if (c.severity === 'High') {
                    immediate = 'Role change / HR Audit';
                    preventive = 'System-wide policy update';
                    rootCause = 'Behavioral or Structural failure';
                }

                return {
                    complaintId: c.complaintId || 'NEW',
                    immediate,
                    preventive,
                    rootCause
                };
            });

            // STAGE 8 / FINAL: ADMIN INSIGHTS & DECISIONS (Updated per requirements)
            const reportData = {
                projectSummary: {
                    projectId: project.id,
                    projectName: project.name
                },
                complaintSummary: {
                    total: unifiedComplaints.length,
                    open: unifiedComplaints.filter(c => c.status === 'Open').length,
                    inProgress: unifiedComplaints.filter(c => c.status === 'In Progress').length,
                    resolved: unifiedComplaints.filter(c => c.status === 'Resolved').length,
                    riskSummary: unifiedComplaints.length > 5 ? 'CRITICAL' : (unifiedComplaints.length > 2 ? 'ELEVATED' : 'STABLE')
                },
                complaints: unifiedComplaints,
                aiGeneratedComplaints: aiComplaints,
                highRiskUsers: frequentOffenders.map(id => ({ userId: id, count: offenderMap[id] })),
                escalations,
                resolutions,
                adminInsights: {
                    criticalComplaints: unifiedComplaints.filter(c => c.severity === 'High').map(c => c.complaintId),
                    frequentOffenders: frequentOffenders,
                    leadershipIssues: unifiedComplaints.filter(c => c.category === 'Mismanagement' || c.role === 'Manager').map(c => c.description),
                    projectRiskSummary: `Project ${project.id} shows ${unifiedComplaints.length} active issues with ${unifiedComplaints.filter(c => c.severity === 'High').length} high-severity escalations.`
                },
                adminActions: {
                    immediate: ['Issue performance warnings', 'Reassign critical tasks', 'Freeze non-essential activities'],
                    preventive: ['Mandatory leadership training', 'Weekly audit triggers', 'Revised workload limits'],
                    strategic: ['Review role architecture', 'Implement AI-based delay prediction', 'Departmental restructuring']
                }
            };

            // Save Snapshot if real project
            if (projectId !== 'new') {
                const report = new ProjectServiceComplaintReport({
                    projectId,
                    projectName: project.uniqueId || project.name,
                    ...reportData,
                    complaints: unifiedComplaints.map(c => c._id).filter(id => id)
                });
                await report.save();
            }

            res.status(200).json({ success: true, ...reportData });

        } catch (error) {
            console.error('Report generation error:', error);
            res.status(500).json({ success: false, message: 'Server Error in report generation', error: error.message });
        }
    },

    /**
     * STAGE 4: ROLE-BASED VIEW
     */
    getReports: async (req, res) => {
        try {
            const user = req.user || {}; 
            const userRole = (user.role || '').toLowerCase();
            const userId = (user._id || user.id || 'anonymous').toString();
            console.log(`[getReports Intelligence] Fetching for user: ${userId}, role: ${userRole}`);
            
            if (!userRole) {
                return res.status(401).json({ success: false, message: 'Authentication context missing' });
            }

            const query = {};
            if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'head') {
                // Find all projects where this person is the Manager, TL, or Employee
                const myProjects = await Project.find({
                    $or: [
                        { assignedTo: userId },
                        { teamLeadId: userId },
                        { teamMembers: userId }
                    ]
                }).select('_id').limit(100);
                const projectIds = myProjects.map(p => p._id);
                query.projectId = { $in: projectIds };
            }
            
            const savedReports = await ProjectServiceComplaintReport.find(query)
                .populate('complaints')
                .populate('projectId')
                .sort({ createdAt: -1 })
                .limit(50); // SEC-FIX CWE-770: Limit resource allocation per request

            // Fetch all complaints to find orphan ones (not yet in a report)
            const allComplaints = await ProjectServiceComplaint.find().sort({ createdAt: -1 }).limit(100);
            const reportedComplaintIds = new Set();
            savedReports.forEach(r => {
                if (r.complaints) {
                    r.complaints.forEach(c => {
                        if (c && (c._id || c.id)) {
                            reportedComplaintIds.add((c._id || c.id).toString());
                        }
                    });
                }
            });

            const orphans = allComplaints.filter(c => !reportedComplaintIds.has(c._id.toString()));

            let reports = [...savedReports.map(r => r.toJSON ? r.toJSON() : r)];

            // If Admin or Head, and there are orphans, create a synthetic "Live Audit" report
            if (orphans.length > 0 && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'head')) {
                 // STAGE 3: COMPLAINT ANALYSIS (Simplified for orphans)
                 const offenderMap = {};
                 orphans.forEach(c => {
                     const key = c.against ? c.against.toString() : 'unknown';
                     offenderMap[key] = (offenderMap[key] || 0) + 1;
                 });
                 const frequentOffendersIds = Object.keys(offenderMap).filter(id => offenderMap[id] > 1);
 
                 // STAGE 6: ESCALATION FLOW
                 const escalations = orphans
                     .filter(c => c.severity === 'High' || c.status === 'Open')
                     .map(c => {
                         let path = [];
                         if (c.role === 'Employee') path = ['TL', 'Manager', 'Head', 'Admin'];
                         else if (c.role === 'TL') path = ['Manager', 'Head', 'Admin'];
                         else if (c.role === 'Manager') path = ['Head', 'Admin'];
                         else path = ['Admin'];
 
                         return {
                             complaintId: c.complaintId || 'NEW',
                             from: c.role,
                             to: c.actionBy || path[0],
                             severity: c.severity,
                             reason: c.description,
                             escalationLevel: path.join(' → ')
                         };
                     });
 
                 // STAGE 7: RESOLUTION ENGINE
                 const resolutions = orphans.map(c => ({
                     complaintId: c.complaintId || 'NEW',
                     immediate: c.category === 'Performance' ? 'Performance warning' : (c.category === 'Task Delay' ? 'Task reassignment' : 'Review incident'),
                     preventive: c.category === 'Performance' ? 'Skills training' : (c.category === 'Task Delay' ? 'Buffer time allocation' : 'Internal briefing'),
                     rootCause: c.category === 'Performance' ? 'Capability mismatch' : (c.category === 'Task Delay' ? 'Workload balancing' : 'Process optimization')
                 }));

                reports.unshift({
                    _id: 'live-audit',
                    reportId: 'LIVE-AUDIT',
                    projectName: 'Live Monitoring / Audit Feed',
                    projectSummary: {
                        projectId: 'AUDIT',
                        projectName: 'Consolidated Manual Complaints'
                    },
                    complaintSummary: {
                        total: orphans.length,
                        open: orphans.filter(c => c.status === 'Open').length,
                        inProgress: orphans.filter(c => c.status === 'In Progress').length,
                        resolved: orphans.filter(c => c.status === 'Resolved').length,
                        riskSummary: orphans.length > 5 ? 'CRITICAL' : (orphans.length > 2 ? 'ELEVATED' : 'STABLE')
                    },
                    complaints: orphans,
                    isAiGenerated: false,
                    escalations,
                    resolutions,
                    adminInsights: {
                        criticalComplaints: orphans.filter(c => c.severity === 'High').map(c => c.complaintId),
                        frequentOffenders: frequentOffendersIds,
                        projectRiskSummary: `Live Audit detects ${orphans.length} active issues across the system.`
                    },
                    adminActions: {
                        immediate: ['Issue performance warnings', 'Reassign critical tasks', 'Freeze non-essential activities'],
                        preventive: ['Mandatory leadership training', 'Weekly audit triggers', 'Revised workload limits'],
                        strategic: ['Review role architecture', 'Implement AI-based delay prediction', 'Departmental restructuring']
                    }
                });
            }

            const filteredReports = reports.map(r => {
                const json = r;
                if (!json.complaints) json.complaints = [];
                
                json.complaints = json.complaints.filter((c) => {
                    if (!c) return false;
                    if (userRole === 'admin' || userRole === 'superadmin') return true;
                    if (userRole === 'head' && c.department === user.department) return true;
                    
                    const userRoleMap = {
                        'employee': 'Employee',
                        'tl': 'TL',
                        'manager': 'Manager',
                        'head': 'Head'
                    };
                    const searchRole = userRoleMap[userRole];
                    
                    if (c.raisedBy === user.id.toString()) return true;
                    if (c.against && c.against.toString() === user.id.toString()) return true;
                    if (userRole === 'tl' && Array.isArray(c.visibleTo) && c.visibleTo.includes('TL')) return true;
                    
                    return Array.isArray(c.visibleTo) && c.visibleTo.includes(searchRole);
                });

                const complaints = json.complaints;

                // Always recompute dynamic analysis fields from complaints
                const offenderMap = {};
                complaints.forEach(c => {
                    const key = c.against ? c.against.toString() : 'unknown';
                    offenderMap[key] = (offenderMap[key] || 0) + 1;
                });
                const frequentOffendersIds = Object.keys(offenderMap).filter(id => offenderMap[id] > 1);

                // Recompute escalations
                json.escalations = complaints
                    .filter(c => c.severity === 'High' || c.status === 'Open')
                    .map(c => {
                        let path = [];
                        if (c.role === 'Employee') path = ['TL', 'Manager', 'Head', 'Admin'];
                        else if (c.role === 'TL') path = ['Manager', 'Head', 'Admin'];
                        else if (c.role === 'Manager') path = ['Head', 'Admin'];
                        else path = ['Admin'];
                        return {
                            complaintId: c.complaintId || 'NEW',
                            from: c.role,
                            to: c.actionBy || path[0],
                            severity: c.severity,
                            reason: c.description,
                            escalationLevel: path.join(' → ')
                        };
                    });

                // Recompute resolutions
                json.resolutions = complaints.map(c => ({
                    complaintId: c.complaintId || 'NEW',
                    immediate: c.category === 'Performance' ? 'Performance warning'
                        : c.category === 'Task Delay' ? 'Task reassignment'
                        : c.severity === 'High' ? 'Role change / HR Audit'
                        : 'Review incident',
                    preventive: c.category === 'Performance' ? 'Skills training'
                        : c.category === 'Task Delay' ? 'Buffer time allocation'
                        : c.severity === 'High' ? 'System-wide policy update'
                        : 'Internal briefing',
                    rootCause: c.category === 'Performance' ? 'Capability mismatch'
                        : c.category === 'Task Delay' ? 'Workload balancing'
                        : c.severity === 'High' ? 'Behavioral or Structural failure'
                        : 'Process optimization'
                }));

                // Always recompute complaint summary risk
                const total = complaints.length;
                json.complaintSummary = {
                    ...json.complaintSummary,
                    total,
                    open: complaints.filter(c => c.status === 'Open').length,
                    inProgress: complaints.filter(c => c.status === 'In Progress').length,
                    resolved: complaints.filter(c => c.status === 'Resolved').length,
                    riskSummary: total > 5 ? 'CRITICAL' : (total > 2 ? 'ELEVATED' : 'STABLE')
                };

                // Always recompute adminInsights
                json.adminInsights = {
                    criticalComplaints: complaints.filter(c => c.severity === 'High').map(c => c.complaintId).filter(Boolean),
                    frequentOffenders: frequentOffendersIds,
                    leadershipIssues: complaints.filter(c => c.category === 'Mismanagement' || c.role === 'Manager').map(c => c.description),
                    projectRiskSummary: `${json.projectSummary?.projectName || 'This project'} has ${total} active issue(s) with ${complaints.filter(c => c.severity === 'High').length} high-severity escalation(s).`
                };

                // Always provide adminActions (guaranteed non-empty)
                json.adminActions = {
                    immediate: [
                        'Issue performance warnings to flagged employees',
                        'Reassign critical and delayed tasks immediately',
                        'Freeze non-essential activities pending review'
                    ],
                    preventive: [
                        'Mandatory leadership training for team leads',
                        'Implement weekly audit triggers and review cycles',
                        'Enforce revised workload limits per department'
                    ],
                    strategic: [
                        'Review and realign role architecture across projects',
                        'Implement AI-based delay prediction and monitoring',
                        'Consider departmental restructuring if issues persist'
                    ]
                };

                return json;
            });

            const finalData = filteredReports.filter(r => r.complaints && r.complaints.length > 0);
            console.log(`[getReports] Final Reports Count: ${finalData.length}`);

            res.status(200).json({ 
                success: true, 
                data: finalData,
                debug: { role: userRole, count: finalData.length }
            });
        } catch (error) {
            console.error('Fetch reports error:', error);
            res.status(500).json({ success: false, message: 'Fetch error', error: error.message });
        }
    },

    /**
     * STAGE 1 & 5: MANUAL COMPLAINT & ROLE-SPECIFIC WORKFLOW (ENHANCED)
     */
    raiseManualComplaint: async (req, res) => {
        try {
            const {
                projectId, againstId, description, category, severity,
                // ── Advanced Fields ──────────────────────────────────────
                incidentDate, isUrgent, isAnonymous,
                witnesses, evidenceNotes, tags
            } = req.body;

            const project = await Project.findById(projectId);
            const userAgainst = await User.findById(againstId);
            const reporter = req.user;
            
            if (!project || !userAgainst) return res.status(404).json({ success: false, message: 'Invalid project or target user' });

            const reporterRole = reporter.role.toLowerCase();
            const targetRole = userAgainst.role.toLowerCase();

            // 1) VALIDATE ALLOWED TARGETS & CATEGORIES
            let allowed = false;
            let actionBy = 'Admin';
            let escalationPath = [];

            if (reporterRole === 'employee') {
                if (targetRole === 'employee' || targetRole === 'tl') allowed = true;
                actionBy = 'TL';
                escalationPath = ['TL', 'Manager', 'Head', 'Admin'];
            } 
            else if (reporterRole === 'tl') {
                if (targetRole === 'employee' || targetRole === 'manager') allowed = true;
                if (targetRole === 'employee') actionBy = 'TL';
                else if (targetRole === 'manager') actionBy = 'Head';
                escalationPath = ['Manager', 'Head', 'Admin'];
            }
            else if (reporterRole === 'manager') {
                if (targetRole === 'tl' || targetRole === 'employee' || targetRole === 'head') allowed = true;
                if (targetRole === 'tl') actionBy = 'Manager';
                else if (targetRole === 'employee') actionBy = 'Manager';
                else if (targetRole === 'head') actionBy = 'Admin';
                escalationPath = ['Head', 'Admin'];
            }
            else if (reporterRole === 'head') {
                if (targetRole === 'manager' || targetRole === 'tl' || targetRole === 'employee') allowed = true;
                actionBy = 'Head';
                escalationPath = ['Admin'];
            }
            else if (reporterRole === 'admin' || reporterRole === 'superadmin') {
                allowed = true;
                actionBy = 'Admin';
            }

            if (!allowed) {
                return res.status(403).json({ success: false, message: `Role ${reporter.role} is not authorized to raise complaints against ${userAgainst.role}` });
            }

            // High severity or urgent → Admin oversight
            if (severity === 'High' || isUrgent) actionBy = 'Admin';

            const roleMapFriendly = {
                'employee': 'Employee', 'tl': 'TL', 'manager': 'Manager',
                'head': 'Head', 'admin': 'Admin', 'superadmin': 'Superadmin', 'user': 'Client'
            };

            // Compute priority score: severity (1-3) + urgency (2 if urgent)
            const severityScores = { 'Low': 1, 'Medium': 2, 'High': 3 };
            const priorityScore = (severityScores[severity] || 1) + (isUrgent ? 2 : 0);

            const complaint = new ProjectServiceComplaint({
                projectId,
                projectName: project.category || project.uniqueId,
                raisedBy: reporter.id,
                raisedByName: isAnonymous ? 'Anonymous Reporter' : reporter.name,
                against: againstId,
                againstName: userAgainst.name,
                role: roleMapFriendly[targetRole] || targetRole,
                description,
                category: Array.isArray(category) ? category : [category].filter(Boolean),
                severity,
                visibleTo: ['Admin', 'Head', 'Manager'],
                status: 'Open',
                actionBy,
                // ── Advanced Fields ──────────────────────────────────────
                incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
                isUrgent: Boolean(isUrgent),
                isAnonymous: Boolean(isAnonymous),
                witnesses: Array.isArray(witnesses) ? witnesses : [],
                evidenceNotes: evidenceNotes || '',
                evidenceFiles: Array.isArray(req.body.evidenceFiles) ? req.body.evidenceFiles : [],
                tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                priorityScore,
                isAiGenerated: false
            });

            // Visibility adjustments
            if (targetRole === 'tl' || reporterRole === 'tl') complaint.visibleTo.push('TL');
            if (targetRole === 'employee' || reporterRole === 'employee') complaint.visibleTo.push('TL', 'Employee');

            // If anonymous, reporter stays visible only to Admin
            if (isAnonymous) complaint.visibleTo = ['Admin'];

            await complaint.save();
            res.status(201).json({ success: true, data: complaint, message: 'Complaint submitted successfully' });
        } catch (error) {
            console.error('Manual complaint error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal Server Error submitting complaint', 
                error: error.message 
            });
        }
    },

    /**
     * STAGE 7: ACTION EXECUTION (ENHANCED)
     */
    updateComplaintStatus: async (req, res) => {
        try {
            const { complaintId } = req.params;
            const { status, resolutionNotes } = req.body;
            const user = req.user;

            const complaint = await ProjectServiceComplaint.findById(complaintId);
            if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

            const userRoleMap = {
                'employee': 'Employee', 'tl': 'TL', 'manager': 'Manager',
                'head': 'Head', 'admin': 'Admin', 'superadmin': 'Superadmin'
            };
            const userRoleFriendly = userRoleMap[user.role.toLowerCase()];
            const isAuthorized = user.role === 'admin' || user.role === 'superadmin' || complaint.actionBy === userRoleFriendly;

            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'Not authorized to take action on this complaint' });
            }

            complaint.status = status;
            if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
            if (status === 'Resolved') {
                complaint.resolvedAt = new Date();
                complaint.resolvedBy = user.name || user.id;
            }
            console.log(`[ACTION] ${user.role} updating complaint ${complaintId} to ${status}`);
            await complaint.save();
            res.status(200).json({ success: true, data: complaint });
        } catch (error) {
            console.error('Update complaint status error:', error);
            res.status(500).json({ success: false, message: 'Update error', error: error.message });
        }
    },

    /**
     * GET SINGLE COMPLAINT DETAILS (Full enrichment)
     */
    getComplaintDetails: async (req, res) => {
        try {
            const { complaintId } = req.params;
            const user = req.user;

            const complaint = await ProjectServiceComplaint.findById(complaintId)
                .populate('against', 'name role department')
                .populate('witnesses', 'name role')
                .populate('projectId', 'uniqueId category department');

            if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

            // Check visibility
            const userRole = user.role;
            const cJson = complaint.toJSON();
            const isReporter = complaint.raisedBy === user.id.toString();
            const isTarget = complaint.against && complaint.against._id.toString() === user.id.toString();
            const isAdmin = userRole === 'admin' || userRole === 'superadmin';
            const canView = isAdmin || isReporter || isTarget ||
                (Array.isArray(complaint.visibleTo) && complaint.visibleTo.includes(userRole));

            if (!canView) return res.status(403).json({ success: false, message: 'Access denied' });

            // Enrich reporter info
            if (complaint.raisedBy && complaint.raisedBy !== 'AI' && !complaint.isAnonymous) {
                const reporter = await User.findById(complaint.raisedBy).select('name role department');
                if (reporter) {
                    cJson.reporterInfo = { name: reporter.name, role: reporter.role, department: reporter.department };
                }
            } else if (complaint.isAnonymous) {
                cJson.reporterInfo = { name: 'Anonymous Reporter', role: 'Unknown' };
            }

            res.status(200).json({ success: true, data: cJson });
        } catch (error) {
            console.error('getComplaintDetails error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch complaint details', error: error.message });
        }
    },

    /**
     * MY COMPLAINTS: Returns complaints raised BY the user and complaints raised AGAINST the user
     */
    getMyComplaints: async (req, res) => {
        try {
            const user = req.user;
            const userId = user.id.toString();

            // Complaints I raised
            const raisedByMe = await ProjectServiceComplaint.find({ raisedBy: userId })
                .populate('against', 'name role department')
                .populate('projectId', 'uniqueId category')
                .sort({ createdAt: -1 })
                .limit(100);

            // Complaints against me
            const againstMe = await ProjectServiceComplaint.find({ against: userId })
                .populate('projectId', 'uniqueId category')
                .sort({ createdAt: -1 })
                .limit(100);

            // NEW: Complaints in my assigned projects (if I am a manager/TL/employee)
            // This ensures "Particular" visibility - I see complaints related to MY projects.
            const myProjectList = await Project.find({
                $or: [
                    { assignedTo: userId },
                    { teamLeadId: userId },
                    { teamMembers: userId }
                ]
            }).select('_id').limit(100);
            const projectIds = myProjectList.map(p => p._id);

            const inMyProjects = await ProjectServiceComplaint.find({
                projectId: { $in: projectIds },
                raisedBy: { $ne: userId },   // Avoid duplicates
                against: { $ne: userId }     // Avoid duplicates
            })
                .populate('against', 'name role department')
                .populate('projectId', 'uniqueId category')
                .sort({ createdAt: -1 })
                .limit(100);

            // Enrich raisedBy name for "against me" (raisedBy can be a userId string or "AI")
            const enriched = await Promise.all(againstMe.map(async (c) => {
                const cJson = c.toJSON ? c.toJSON() : c;
                if (c.raisedBy && c.raisedBy !== 'AI') {
                    try {
                        const reporter = await User.findById(c.raisedBy).select('name role');
                        cJson.raisedByName = reporter ? reporter.name : c.raisedByName || 'Unknown';
                        cJson.raisedByRole = reporter ? reporter.role : '';
                    } catch (_) {}
                }
                return cJson;
            }));

            res.status(200).json({
                success: true,
                data: {
                    raisedByMe: raisedByMe.map(c => c.toJSON ? c.toJSON() : c),
                    againstMe: enriched,
                    inMyProjects: (await Promise.all(inMyProjects.map(async (c) => {
                        const cJson = c.toJSON ? c.toJSON() : c;
                        if (c.raisedBy && c.raisedBy !== 'AI') {
                            try {
                                const reporter = await User.findById(c.raisedBy).select('name role');
                                cJson.raisedByName = reporter ? reporter.name : c.raisedByName || 'Unknown';
                                cJson.raisedByRole = reporter ? reporter.role : '';
                            } catch (_) {}
                        }
                        return cJson;
                    })))
                }
            });
        } catch (error) {
            console.error('getMyComplaints error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch your complaints', error: error.message });
        }
    },

    /**
     * UPLOAD EVIDENCE FILES – Attach files to a complaint (before or after submission)
     * Called via: POST /project-service-complaints/evidence/upload
     * Accepts multipart/form-data with field name "evidenceFiles"
     */
    uploadComplaintEvidence: async (req, res) => {
        try {
            const { complaintId } = req.body;
            const user = req.user;
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, message: 'No files uploaded' });
            }

            // Build file metadata list to return to the frontend
            const fileMetadata = files.map(f => ({
                filename: f.filename,
                originalName: f.originalname,
                mimetype: f.mimetype,
                size: f.size,
                url: `/uploads/complaint-evidence/${f.filename}`,
                uploadedAt: new Date()
            }));

            // If a complaintId is provided, attach files to the existing complaint
            if (complaintId) {
                const complaint = await ProjectServiceComplaint.findById(complaintId);
                if (!complaint) {
                    return res.status(404).json({ success: false, message: 'Complaint not found' });
                }
                // Only reporter or admin can attach files
                const isReporter = complaint.raisedBy === user.id.toString();
                const isAdmin = user.role === 'admin' || user.role === 'superadmin';
                if (!isReporter && !isAdmin) {
                    return res.status(403).json({ success: false, message: 'Not authorized to add evidence to this complaint' });
                }
                // Ensure total files don't exceed 5
                const currentCount = (complaint.evidenceFiles || []).length;
                if (currentCount + fileMetadata.length > 5) {
                    return res.status(400).json({ success: false, message: `Cannot exceed 5 evidence files. Currently have ${currentCount}.` });
                }
                complaint.evidenceFiles = [...(complaint.evidenceFiles || []), ...fileMetadata];
                await complaint.save();
                return res.status(200).json({ success: true, files: fileMetadata, message: `${fileMetadata.length} file(s) attached to complaint` });
            }

            // No complaintId — return metadata for client-side staging (will be included in complaint submission)
            res.status(200).json({ success: true, files: fileMetadata, message: `${fileMetadata.length} file(s) uploaded successfully` });

        } catch (error) {
            console.error('uploadComplaintEvidence error:', error);
            res.status(500).json({ success: false, message: 'File upload failed', error: error.message });
        }
    },

    /**
     * DELETE EVIDENCE FILE – Remove a single evidence file from a complaint
     * Called via: DELETE /project-service-complaints/complaint/:complaintId/evidence/:filename
     */
    deleteEvidenceFile: async (req, res) => {
        // SEC-FIX: Multi-Stage Throttling System (Global Cap + Per-User Logic)
        const principal = String(req.user?.id || req.ip || 'anonymous');
        
        // 1. Mandatory resource block for expensive file operations
        if (globalDeletionCounter > 30) { 
            return res.status(429).json({ success: false, message: 'Server resource cap hit.' });
        }

        const throttle = deleteRateLimit.get(principal) || { count: 0 };
        if (throttle.count >= 3) { // Even stricter: 3 deletions per minute
            return res.status(429).json({ success: false, message: 'Too many operations. Wait 1 min.' });
        }

        globalDeletionCounter++;
        throttle.count++;
        deleteRateLimit.set(principal, throttle);

        try {
            const { complaintId } = req.params;
            const filenameFromParam = String(req.params.filename || '');
            const user = req.user;

            // Strict sanitization to isolate from path traversal
            const cleanBasename = path.basename(filenameFromParam);
            const complaint = await ProjectServiceComplaint.findById(complaintId);
            if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

            // Authorization: Ensure authority over this resource
            const authCheck = user.role === 'admin' || user.role === 'superadmin' || complaint.raisedBy === user.id.toString();
            if (!authCheck) return res.status(403).json({ success: false, message: 'Access denied.' });

            // VERIFICATION: Only delete if file is in our official registry
            const registryFile = (complaint.evidenceFiles || []).find(f => f.filename === cleanBasename);
            if (!registryFile) return res.status(404).json({ success: false, message: 'File is not part of this record.' });

            // Persistence: Clear DB registry entry BEFORE disk removal
            complaint.evidenceFiles = complaint.evidenceFiles.filter(f => f.filename !== cleanBasename);
            await complaint.save();

            // Perform disk unlinking using verified values under strict throttle
            const uploadBase = path.resolve(__dirname, '..', 'uploads', 'complaint-evidence');
            secureEvidenceRemoval(uploadBase, registryFile.filename);

            res.status(200).json({ success: true, message: 'Resource release successful.' });
        } catch (error) {
            console.error('[CRITICAL-AUDIT] Secure file removal failed:', error);
            res.status(500).json({ success: false, message: 'System error during release.' });
        }
    }
};

module.exports = projectServiceComplaintController;
