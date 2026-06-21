const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Salary = require('../models/Salary');
const mongoose = require('mongoose');

const authenticateUser = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid token: missing user ID' });
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const userObj = user.toObject();
    req.user = {
      id: user._id,
      ...userObj,
      role: decoded.role || user.role,
      department: decoded.department || user.department,
      service: decoded.service || user.service,
      seniority: decoded.seniority || user.seniority,
    };
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authentication server error' });
  }
};

const isAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Admin access required.' });
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Super Admin access required.' });
};

const isSubadmin = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'subadmin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Subadmin access required.' });
};

const isAdminOrSubadmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'subadmin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Admin/Subadmin access required.' });
};

const isEmployee = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'employee') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Employee access required.' });
};

const isManager = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  // Allow employee role too, as specific route middleware (like in purchaseRoutes) 
  // will handle the department/access specific checks correctly.
  if (role === 'admin' || role === 'superadmin' || role === 'manager' || role === 'employee') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Manager or Authorized personnel access required.' });
};

const isAttendanceUser = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (['admin', 'superadmin', 'subadmin', 'head', 'manager', 'tl', 'team manager', 'employee'].includes(role)) return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

const isAdminOrHR = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const rawDept = req.user?.department || '';
  const dept = rawDept.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
  const isHR = dept.includes('human-resources') || dept === 'hr' || dept === 'human-resource';
  const isFinance = dept.includes('financial') || dept.includes('finance');

  req.userDepartment = rawDept; // Ensure controller can access this consistently

  if (role === 'admin' || role === 'superadmin' || (role === 'subadmin' && isHR)) {
    req.isFullAttendanceAccess = true;
    return next();
  }

  if (role === 'manager' && isHR) {
    req.isHRManager = true;
    req.isFullAttendanceAccess = true; // HR Manager should also have full access to view/manager all attendance
    return next();
  }

  // Allow Financial Manager or Financial Employee to have full access (for payroll processing)
  if (isFinance && (role === 'manager' || role === 'employee')) {
    req.isFinancialPersonnel = true;
    req.isFullAttendanceAccess = true;
    return next();
  }

  if (['head', 'manager', 'tl'].includes(role) && rawDept) {
    req.isDepartmentAttendanceManager = true;
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

const isHR = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  if (role === 'subadmin' && dept === 'human-resources') return next();
  return res.status(403).json({ success: false, message: 'Access denied. HR subadmin access required.' });
};

const isHRPersonnel = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const isHRDept = dept.includes('human-resources') || dept === 'hr' || dept === 'human-resource';
  if (role === 'admin' || role === 'superadmin' || (['manager', 'subadmin'].includes(role) && isHRDept)) return next();
  return res.status(403).json({ success: false, message: 'Access denied. HR personnel access required.' });
};

const isSalaryAuthorized = async (req, res, next) => {
  try {
    const role = req.user?.role?.toLowerCase();
    const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    const isAdminUser = role === 'admin' || role === 'superadmin';
    const isHRSubadmin = role === 'subadmin' && (dept.includes('human-resource') || dept === 'hr' || dept === 'human-resources');
    const isHRManager = role === 'manager' && (dept.includes('human-resource') || dept === 'hr' || dept === 'human-resources');
    const isFinancialManager = role === 'manager' && (dept.includes('financial') || dept.includes('finance'));
    const isFinancialEmployee = role === 'employee' && (dept.includes('financial') || dept.includes('finance'));
    const hasSalaryAccess = (req.user.financeAccess || []).includes('salary');

    console.log(`[Salary Auth Debug] Path: ${req.path}, Method: ${req.method}`);
    console.log(`[Salary Auth Debug] User: ${req.user.email}, Role: ${role}, Dept: ${dept}`);
    console.log(`[Salary Auth Debug] Flags - Admin: ${isAdminUser}, HRSub: ${isHRSubadmin}, HRMan: ${isHRManager}, FinMan: ${isFinancialManager}, FinEmp: ${isFinancialEmployee}, HasSalaryAccess: ${hasSalaryAccess}`);

    if (!isAdminUser && !isHRSubadmin && !isHRManager && !isFinancialManager && !isFinancialEmployee && !hasSalaryAccess) {
      console.warn(`[Salary Auth Debug] Access Denied: Not authorized role/dept for ${req.user.email}`);
      return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to view salary records.' });
    }

    // Allow Admin, HR Subadmin, AND Financial Personnel (Manager/Employee/Access) to manage/view department rates
    if (req.path.includes('department-rate') && !isAdminUser && !isHRSubadmin && !isFinancialManager && !isFinancialEmployee && !hasSalaryAccess) {
      console.warn(`[Salary Auth Debug] Access Denied: Dept Rate management restricted for ${req.user.email}`);
      return res.status(403).json({ success: false, message: 'Access denied. Only Authorized Personnel can access rates.' });
    }

    req.isHRSubadmin = isHRSubadmin;
    req.isAdminUser = isAdminUser;
    req.isFinancialManager = isFinancialManager;
    req.isHRManager = isHRManager;
    console.log(`[Salary Auth Debug] Access Granted for ${req.user.email}`);
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Salary auth error' });
  }
};

const isAdminOrHRSubadmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  if (role === 'admin' || role === 'superadmin' || (role === 'subadmin' && dept === 'human-resources')) return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
};

const isSalesManager = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin') return next();

  if (role === 'manager') {
    const dept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
    
    // Sales Manager: in Sales dept
    const isSalesDept = dept.includes('sales') || 
                        dept === 'services' || 
                        dept === 'customer services' ||
                        ['sales and customer services', 'sales and customer support', 'customer services'].includes(dept);

    if (isSalesDept) return next();
  }

  return res.status(403).json({ success: false, message: 'Access denied. Sales Manager authorization required.' });
};

const isDepartmentManager = async (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'superadmin' || role === 'manager') return next();
  return res.status(403).json({ success: false, message: 'Access denied. Manager required.' });
};

const isFinancialManager = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const isFinDept = dept.includes('financial') || dept.includes('finance');
  console.log(`[Fin Manager Auth Debug] Case: ${req.user.email}, Role: ${role}, Dept: ${dept}`);
  if (role === 'admin' || role === 'superadmin' || (role === 'manager' && isFinDept)) return next();
  console.warn(`[Fin Manager Auth Debug] Denied: ${req.user.email}`);
  return res.status(403).json({ success: false, message: 'Access denied. Finance manager or Super Admin required.' });
};

const isTL = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'tl' || role === 'admin' || role === 'superadmin') return next();
  return res.status(403).json({ success: false, message: 'Access denied. TL required.' });
};

const canViewProgress = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.canUserViewProgress(req.user.id)) return next();
    return res.status(403).json({ success: false, message: 'Progress view restricted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking progress' });
  }
};

const isServiceAttendanceManager = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const service = req.user?.service;
  const rawDept = req.user?.department || '';
  const dept = rawDept.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
  const isFinance = dept.includes('financial') || dept.includes('finance');

  // Admin and HR subadmin have full access
  if (role === 'admin' || role === 'superadmin' || role === 'subadmin') {
    req.isFullAttendanceAccess = true;
    req.userService = null; // No service restriction
    return next();
  }

  // Financial Manager/Employee also have full access to verify for salary
  if (isFinance && (role === 'manager' || role === 'employee')) {
    req.isFullAttendanceAccess = true;
    req.userService = null;
    return next();
  }

  // Managers with a service can manage their service's attendance
  if (role === 'manager' && service) {
    req.isServiceAttendanceManager = true;
    req.userService = service;
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Service manager or Financial personnel access required.'
  });
};

const isFinancialPersonnel = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  const dept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const isFinDept = dept.includes('financial') || dept.includes('finance');

  const hasAccess = (req.user.financeAccess || []).some(a =>
    a === 'salary' ||
    a === 'purchase' ||
    a === 'service' ||
    a.startsWith('service:')
  );

  if (role === 'admin' || role === 'superadmin' || (isFinDept && (role === 'manager' || role === 'employee')) || hasAccess) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Financial personnel, Super Admin, or Authorized access required.' });
};

module.exports = {
  authenticateUser,
  isAdmin,
  isSuperAdmin,
  isSubadmin,
  isAdminOrSubadmin,
  isEmployee,
  isManager,
  isHR,
  isHRPersonnel,
  isAdminOrHR,
  isAttendanceUser,
  isSalaryAuthorized,
  isAdminOrHRSubadmin,
  isSalesManager,
  isDepartmentManager,
  isFinancialManager,
  isFinancialPersonnel,
  isTL,
  canViewProgress,
  isServiceAttendanceManager,
  canManageCampaigns: (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    const dept = (req.user?.department || '').toLowerCase();
    const isFinHead = role === 'head' && (dept.includes('financial') || dept.includes('finance'));
    const isHRHead = role === 'head' && (dept.includes('human-resources') || dept === 'hr' || dept === 'human-resource');
    
    if (['superadmin', 'manager', 'employee', 'admin'].includes(role) || isFinHead || isHRHead) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to manage email campaigns.' });
  }
};