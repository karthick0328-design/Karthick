const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Create a new complaint
const createComplaint = async (req, res) => {
  try {
    const { title, description, employeeId, category, evidence } = req.body;
    
    // Validate required fields
    if (!title || !description || !employeeId || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Role-based validation
    // Admin: Full access
    // Head -> Manager, TL, Employee
    // Manager -> TL, Employee
    // TL -> Employee
    // Employee -> Manager, TL, Employee (for reporting concerns)
    const reporterRole = req.user.role;
    const targetRole = employee.role;
    
    let authorized = false;
    // Admin cannot raise complaints
    if (reporterRole === 'admin' || reporterRole === 'superadmin') {
      authorized = false;
    } 
    // Head -> Manager, TL, Employee
    else if (reporterRole === 'head' && ['manager', 'tl', 'employee'].includes(targetRole)) {
      authorized = true;
    } 
    // Manager -> TL, Employee
    else if (reporterRole === 'manager' && ['tl', 'employee'].includes(targetRole)) {
      authorized = true;
    } 
    // TL -> Employee
    else if (reporterRole === 'tl' && targetRole === 'employee') {
      authorized = true;
    }
    // Employee cannot raise complaints (according to latest rules)
    else if (reporterRole === 'employee') {
      authorized = false;
    }
    
    if (!authorized) {
      const message = (reporterRole === 'admin' || reporterRole === 'superadmin') ? 'Admins are not allowed to raise complaints' : 'You are not authorized to report this user role';
      return res.status(403).json({ success: false, message });
    }

    const newComplaint = new Complaint({
      title,
      description,
      employeeId,
      role: employee.role,
      department: employee.department || '',
      service: employee.service || '',
      category,
      evidence: evidence || null,
      reportedBy: req.user.id,
      reportedByDepartment: req.user.department || '',
      reportedByService: req.user.service || ''
    });

    await newComplaint.save();

    // Send notifications to Admins
    try {
      const admins = await User.find({ role: 'admin' });
      const io = req.app.get('io');
      
      for (const admin of admins) {
        const notif = await Notification.create({
          recipientId: admin._id,
          senderId: req.user.id,
          type: 'complaint_filed',
          title: 'New Performance/Compliance Issue',
          message: `A new ${category} has been filed against ${employee.name} by ${req.user.name}.`,
          actionUrl: '/admin-dashboard/reports'
        });
        
        if (io) {
          io.to(`user_${admin._id}`).emit('newNotification', notif);
        }
      }
    } catch (notifErr) {
      console.error("Failed to send complaint notifications:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint: newComplaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get complaints based on user role
const getComplaints = async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === 'admin' || role === 'superadmin') {
      // Full access
      query = {};
    } else if (role === 'head') {
      // Can view complaints within their department or service
      query = { 
        $or: [
          { department: req.user.department },
          { service: req.user.service }
        ]
      };
    } else if (role === 'manager' || role === 'tl') {
      // Simplification: Can view complaints they reported or where they are the assignee tree.
      // To keep it simple, they see what they reported, and what they are involved in.
      // A more robust way is querying assignments.
      const supervisedAssignments = await Assignment.find({ manager: req.user.id });
      const supervisedIds = supervisedAssignments.map(a => a.employee.toString());
      
      query = {
        $or: [
          { reportedBy: req.user.id },
          { employeeId: { $in: supervisedIds } }
        ]
      };
    } else if (role === 'employee') {
      // Can view complaints related to themselves
      query = { employeeId: req.user.id };
    }

    // Apply filters from query params
    const { department, service, filterRole, category, status } = req.query;
    if (department) query.department = department;
    if (service) query.service = service;
    if (filterRole) query.role = filterRole;
    if (category) query.category = category;
    if (status) query.status = status;

    const complaints = await Complaint.find(query)
      .populate('employeeId', 'name uniqueId email')
      .populate('reportedBy', 'name role service department')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('employeeId', 'name uniqueId email role department service')
      .populate('reportedBy', 'name role service department');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    console.error('Error fetching complaint details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateComplaintStatus = async (req, res) => {
  try {
    const { status, adminAction, adminNotes } = req.body;
    
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Restrict who can update status (Admin or Head maybe)
    if (!['admin', 'superadmin', 'head'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update status' });
    }

    if (status) complaint.status = status;
    if (adminAction !== undefined) complaint.adminAction = adminAction;
    if (adminNotes !== undefined) complaint.adminNotes = adminNotes;

    await complaint.save();

    // Notify relevant parties
    try {
      const io = req.app.get('io');
      const targetUserId = complaint.employeeId;
      const reporterId = complaint.reportedBy;
      
      // Target Notification
      const targetNotif = await Notification.create({
        recipientId: targetUserId,
        senderId: req.user.id,
        type: 'complaint_action',
        title: `Compliance Update: ${complaint.title}`,
        message: `Status updated to ${status}.${adminAction ? ` Action: ${adminAction}` : ''}`,
        actionUrl: (req.user.role === 'admin' || req.user.role === 'superadmin') ? '/admin-dashboard/reports' : '/employee-dashboard/reports'
      });
      
      // Reporter Notification
      const reporterNotif = await Notification.create({
        recipientId: reporterId,
        senderId: req.user.id,
        type: 'complaint_action',
        title: `Your Report: ${complaint.title}`,
        message: `The Admin has updated your report status to ${status}.${adminAction ? ` Resolved as: ${adminAction}` : ''}`,
        actionUrl: '/reports'
      });

      if (io) {
        io.to(`user_${targetUserId}`).emit('newNotification', targetNotif);
        io.to(`user_${reporterId}`).emit('newNotification', reporterNotif);
      }
    } catch (notifErr) {
      console.error("Failed to send action notifications:", notifErr);
    }

    res.status(200).json({ success: true, message: 'Complaint updated successfully', complaint });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getComplianceAnalytics = async (req, res) => {
  try {
    // Only Admin / Head have full analytics access ideally
    if (!['admin', 'superadmin', 'head'].includes(req.user.role)) {
       return res.status(403).json({ success: false, message: 'Unauthorized access to analytics' });
    }

    const totalComplaints = await Complaint.countDocuments();
    const underReview = await Complaint.countDocuments({ status: 'Under Review' });
    const resolved = await Complaint.countDocuments({ status: 'Closed' });
    
    // Group by department
    const byDepartment = await Complaint.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);
    
    // Group by service
    const byService = await Complaint.aggregate([
      { $group: { _id: '$service', count: { $sum: 1 } } }
    ]);

    // Group by category
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalComplaints,
        underReview,
        resolved,
        byDepartment,
        byService,
        byCategory
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getPerformanceReports = async (req, res) => {
  try {
    const { department, service, role } = req.query;

    const query = {};
    const userRole = req.user.role;

    if (userRole === 'admin' || userRole === 'superadmin') {
      // No extra restrictions
    } else if (userRole === 'head') {
      query.$or = [{ department: req.user.department }, { service: req.user.service }];
    } else if (userRole === 'manager' || userRole === 'tl') {
      const supervisedAssignments = await Assignment.find({ manager: req.user.id });
      const supervisedIds = supervisedAssignments.map(a => a.employee);
      query._id = { $in: [...supervisedIds, req.user.id] }; // See subordinates + self
    } else if (userRole === 'employee') {
      query._id = req.user.id; // See only self
    }

    if (department) query.department = department;
    if (service) query.service = service;
    if (role) query.role = role;
    else if (!query.role) query.role = { $in: ['admin', 'superadmin', 'head', 'manager', 'tl', 'employee'] };

    // This is a fast approximation for Performance Reports
    // Fetch users based on filter
    const users = await User.find(query).select('name role department service uniqueId');

    const Project = require('../models/Project');
    const Attendance = require('../models/Attendance');

    // Generate performance metrics
    const performanceReports = await Promise.all(users.map(async (user) => {
      // 1. Task/Project completion rate
      // Find projects where user is involved
      const projects = await Project.find({
        $or: [
          { assignedTo: user._id },
          { teamLeadId: user._id },
          { teamMembers: user._id }
        ]
      });

      let taskCompletion = 0;
      if (projects.length > 0) {
        const completedProjects = projects.filter(p => p.status === 'Completed').length;
        taskCompletion = Math.round((completedProjects / projects.length) * 100);
      } else {
        taskCompletion = 100; // Default if no tasks
      }

      // 2. Attendance % (Past 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const attendanceRecords = await Attendance.find({
        userId: user._id,
        date: { $gte: thirtyDaysAgo }
      });

      let attendanceScore = 100;
      if (attendanceRecords.length > 0) {
        const presentDays = attendanceRecords.filter(a => ['present', 'half-day'].includes(a.status)).length;
        attendanceScore = Math.round((presentDays / attendanceRecords.length) * 100);
      }

      // 3. Status determination based on metrics
      let status = 'Good';
      if (taskCompletion < 50 || attendanceScore < 70) {
        status = 'Needs Improvement';
      } else if (taskCompletion < 80 || attendanceScore < 85) {
        status = 'Average';
      }

      // 4. Has existing active complaints?
      const activeComplaints = await Complaint.countDocuments({
        employeeId: user._id,
        status: { $nin: ['Closed'] }
      });
      if (activeComplaints > 0) {
        status = 'Needs Improvement'; // Override
      }

      return {
        _id: user._id,
        name: user.name,
        role: user.role,
        department: user.department,
        service: user.service,
        taskCompletion,
        attendance: attendanceScore,
        status,
        activeComplaints
      };
    }));

    res.status(200).json({ success: true, reports: performanceReports });
  } catch (error) {
    console.error('Error generating performance reports:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getComplianceAnalytics,
  getPerformanceReports
};
