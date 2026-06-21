// Attendance Controller
const asyncHandler = require('express-async-handler');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');
const { DateTime } = require('luxon');
const winston = require('winston');
const mongoose = require('mongoose');
// Configure Winston logger
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
  ],
});

// Helper for Cosine Similarity
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
// Validate environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_EXPIRES_IN'];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is not defined`);
  }
});
// Allowed roles for attendance
const allowedAttendanceRoles = ['admin', 'superadmin', 'subadmin', 'head', 'manager', 'tl', 'team manager', 'employee'];
// Helper to calculate salary deduction (positive for bonuses, negative for deductions)
// Helper to calculate salary deduction (positive for bonuses, negative for deductions)
const calculateSalary = (status, isApproved, dailyRate, workedOnHoliday, holidayType, overtimeHours) => {
  const deductionRates = {
    absent: 1.0,
    'on-leave-approved': 0.5, // Half pay for approved leave (adjust if policy is full pay: set to 0.0)
    'on-leave-unapproved': 1.0, // Full deduction for unapproved leave (fixed)
  };
  const holidayIncrements = {
    government: 1.0,
    regular: 0.3,
  };
  const overtimeRate = 1.5;
  let deduction = 0;
  if (status === 'absent') {
    deduction = dailyRate * deductionRates.absent;
  } else if (status === 'on-leave') {
    deduction = isApproved
      ? dailyRate * deductionRates['on-leave-approved']
      : dailyRate * deductionRates['on-leave-unapproved'];
  }
  let holidayBonus = 0;
  if (workedOnHoliday && status === 'present') {
    const rate = holidayIncrements[holidayType] || 0;
    holidayBonus = dailyRate * rate;
    logger.info(`Applied holiday bonus: ${holidayBonus} for ${holidayType} holiday`);
  }
  let overtimePay = 0;
  if (overtimeHours && status === 'present') {
    overtimePay = (dailyRate / 8) * overtimeRate * overtimeHours;
    logger.info(`Applied overtime pay: ${overtimePay} for ${overtimeHours} hours`);
  }
  const total = holidayBonus + overtimePay - deduction;
  logger.info(`Calculated: deduction: ${deduction}, holiday bonus: ${holidayBonus}, overtime pay: ${overtimePay} (status: ${status}, approved: ${isApproved}, holiday: ${workedOnHoliday}, overtime: ${overtimeHours}). Total: ${total}`);
  return total;
};
// Helper to sanitize attendance data (omit holidayType and workedOnHoliday if not workedOnHoliday, omit overtimeHours if 0)
const sanitizeAttendance = (attendance) => {
  const copy = { ...attendance };
  if (!copy.workedOnHoliday) {
    delete copy.holidayType;
    delete copy.workedOnHoliday;
  }
  if (copy.overtimeHours === 0) {
    delete copy.overtimeHours;
  }
  return copy;
};
// Helper to auto-detect holiday
const autoDetectHoliday = async (attendanceDate) => {
  const holiday = await Holiday.findOne({
    date: {
      $eq: attendanceDate.toJSDate(),
    },
  }).lean();
  if (holiday) {
    logger.info(`Auto-detected holiday on ${attendanceDate.toISODate()}: ${holiday.name} (${holiday.type})`);
    return { workedOnHoliday: true, holidayType: holiday.type };
  }
  return { workedOnHoliday: false, holidayType: null };
};
// Create a new attendance record (Admin/HR/Dept Manager only)
const createAttendance = asyncHandler(async (req, res) => {
  try {
    // SEC-FIX: Sanitize logs (don't log full req.body or req.user)
    logger.info(`[${new Date().toISOString()}] Creating attendance record for user: ${req.body.uniqueId || 'unknown'}`);
    // Authorization check using middleware flags
    const isFullAccess = req.isFullAttendanceAccess || req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager && !req.isServiceAttendanceManager) {
      logger.error(`User ${req.user.email} not authorized for creating attendance. Role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, department managers, service managers, or financial personnel can create attendance records',
      });
    }
    // Handle case-insensitive uniqueId
    let uniqueId = req.body.uniqueId || req.body.UniqueId;
    let date = req.body.date;
    let checkIn = req.body.checkIn;
    const { checkOut, status, notes, environment, sleepDuration, cursorMovements, biometricScanId, verificationMethod, signatureData, punchCardId, scanData, overtimeHours, workedOnHoliday, holidayType, virtualVerificationImage } = req.body;
    if (!uniqueId || !checkIn) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Unique ID and check-in time are required',
      });
    }
    // Derive date from checkIn if not provided
    const dateProvided = !!date;
    if (!date) {
      date = DateTime.fromISO(checkIn).toISODate();
      logger.info(`Derived date from checkIn: ${date}`);
    }
    const attendanceDate = DateTime.fromISO(date, { zone: 'UTC' }).startOf('day');
    const user = await User.findOne({ uniqueId: typeof uniqueId === 'string' ? uniqueId : '' }).lean();
    if (!user) {
      logger.error(`User not found for uniqueId: ${typeof uniqueId === 'string' ? uniqueId : 'invalid-type'}`);
      return res.status(404).json({
        success: false,
        errorCode: 'USER_NOT_FOUND',
        message: 'User not found with provided unique ID',
      });
    }
    // Restrict attendance to allowed roles
    if (!allowedAttendanceRoles.includes(user.role.toLowerCase())) {
      logger.error(`Attendance not allowed for role: ${user.role}`);
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }

    // Enforce User's Attendance Mode (Virtual vs Physical)
    // "they only select the one Attendance alone"
    const userMode = user.attendanceMode || (user.attendanceVerificationMethod && ['Physical', 'Virtual'].includes(user.attendanceVerificationMethod) ? user.attendanceVerificationMethod.toLowerCase() : 'physical'); // Support Physical/Virtual from verificationMethod fallback
    let finalEnvironment = environment || userMode; // Default to user's mode if not specified

    if (finalEnvironment !== userMode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_MODE',
        message: `User is configured for '${userMode}' attendance. Cannot create '${finalEnvironment}' attendance.`,
      });
    }
    // Department/Service check for non-full access users
    if (req.isDepartmentAttendanceManager && user.department !== req.user.department) {
      logger.error(`Department mismatch for user ${uniqueId}: ${user.department} != ${req.user.department}`);
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Can only create attendance for users in your department',
      });
    }
    if (req.isServiceAttendanceManager && user.service !== req.user.service) {
      logger.error(`Service mismatch for user ${uniqueId}: ${user.service} != ${req.user.service}`);
      return res.status(403).json({
        success: false,
        errorCode: 'SERVICE_MISMATCH',
        message: 'Can only create attendance for users in your service',
      });
    }
    const userId = user._id;
    const dailyRate = user.dailySalaryRate || 50;
    const existingAttendance = await Attendance.findOne({
      userId,
      date: attendanceDate.toJSDate(),
    }).lean();
    if (existingAttendance) {
      logger.info(`Attendance already exists for user ${userId} on ${date}`);
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Attendance record already exists for this user and date',
      });
    }
    const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave', 'waiting'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }
    let finalStatus = status || 'present';
    let isApproved = true;
    if (!['virtual', 'physical'].includes(finalEnvironment)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ENVIRONMENT',
        message: 'Environment must be "virtual" or "physical"',
      });
    }
    if (finalEnvironment === 'virtual' && finalStatus !== 'on-leave') {
      if (sleepDuration === undefined || !Array.isArray(cursorMovements)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_FIELDS',
          message: 'For virtual environment: sleepDuration (minutes) and cursorMovements (array) are required',
        });
      }
      if (sleepDuration >= 480 || cursorMovements.length === 0) {
        finalStatus = 'absent';
      }
    }
    // Validate Physical Attendance Verification Methods
    const requiredMethod = user.attendanceVerificationMethod || 'none';
    let finalVerificationMethod = verificationMethod || requiredMethod;

    if (finalEnvironment === 'physical' && finalStatus === 'present') {
      // Enforcement check: if a specific method is required, it MUST be used
      if (requiredMethod !== 'none' && verificationMethod && verificationMethod !== requiredMethod) {
        logger.warn(`Verification method mismatch for user ${uniqueId}: expected ${requiredMethod}, got ${verificationMethod}. Marking as absent.`);
        finalStatus = 'absent';
      }

      if (finalStatus === 'present') {
        const validMethods = ['biometric', 'signature', 'punch-card', 'rfid-qr', 'Physical', 'Virtual', 'none'];
        if (!validMethods.includes(finalVerificationMethod)) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_VERIFICATION_METHOD',
            message: `Invalid verification method. Must be one of: ${validMethods.join(', ')}`,
          });
        }

        // Check required data for the selected method and COMPARE with registered user ID
        if (finalVerificationMethod === 'biometric') {
          if (!biometricScanId || biometricScanId !== user.biometricScanId) {
            logger.warn(`Biometric ID mismatch for user ${uniqueId}: expected ${user.biometricScanId}, got ${biometricScanId}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'signature') {
          if (!signatureData || signatureData !== user.signatureData) {
            logger.warn(`Signature ID mismatch for user ${uniqueId}: expected ${user.signatureData}, got ${signatureData}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'punch-card') {
          if (!punchCardId || punchCardId !== user.punchCardId) {
            logger.warn(`Punch Card ID mismatch for user ${uniqueId}: expected ${user.punchCardId}, got ${punchCardId}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'rfid-qr') {
          if (!scanData || scanData !== user.scanData) {
            logger.warn(`Scan data mismatch for user ${uniqueId}: expected ${user.scanData}, got ${scanData}. Marking as absent.`);
            finalStatus = 'absent';
          }
        }
      }
    }
    // Handle holiday: explicit override first, then auto-detect only if date was explicitly provided
    let finalWorkedOnHoliday = false;
    let finalHolidayType = null;
    if (workedOnHoliday !== undefined) {
      if (typeof workedOnHoliday !== 'boolean') {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY',
          message: 'workedOnHoliday must be a boolean',
        });
      }
      finalWorkedOnHoliday = workedOnHoliday;
      if (finalWorkedOnHoliday && !['government', 'regular'].includes(holidayType)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY_TYPE',
          message: 'If workedOnHoliday is true, holidayType must be "government" or "regular"',
        });
      }
      finalHolidayType = holidayType || null;
      logger.info(`Admin explicitly set holiday: workedOnHoliday=${finalWorkedOnHoliday}, holidayType=${finalHolidayType}`);
    } else if (dateProvided) {
      // Auto-detect only if date was explicitly provided in request
      const autoHoliday = await autoDetectHoliday(attendanceDate);
      finalWorkedOnHoliday = autoHoliday.workedOnHoliday;
      finalHolidayType = autoHoliday.holidayType;
    } // If derived date, no auto-detection; defaults to false
    if (finalStatus === 'on-leave') {
      // If created by Admin/HR (which createAttendance is), we assume it is approved unless specified otherwise
      // Only set to false if it was explicitly passed as false in body, otherwise default (true) stands
      if (req.body.isApproved === false) {
        isApproved = false;
      }
      finalWorkedOnHoliday = false;
      finalHolidayType = null;
    }
    if (overtimeHours && (overtimeHours < 0 || overtimeHours > 8)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_OVERTIME',
        message: 'Overtime hours must be between 0 and 8',
      });
    }
    const salaryDeduction = calculateSalary(finalStatus, isApproved, dailyRate, finalWorkedOnHoliday, finalHolidayType, overtimeHours);
    const newAttendance = new Attendance({
      userId,
      date: attendanceDate.toJSDate(),
      checkIn: new Date(checkIn),
      checkOut: checkOut ? new Date(checkOut) : undefined,
      status: finalStatus,
      environment: finalEnvironment,
      ...(finalEnvironment === 'virtual' && finalStatus !== 'on-leave' && { sleepDuration, cursorMovements }),
      ...(finalEnvironment === 'physical' && finalStatus !== 'on-leave' && {
        verificationMethod: finalVerificationMethod,
        ...(finalVerificationMethod === 'biometric' && { biometricScanId }),
        ...(finalVerificationMethod === 'signature' && { signatureData }),
        ...(finalVerificationMethod === 'punch-card' && { punchCardId }),
        ...(finalVerificationMethod === 'rfid-qr' && { scanData }),
      }),
      virtualVerificationImage: finalEnvironment === 'virtual' && finalStatus === 'present' ? virtualVerificationImage : undefined,
      notes: notes || '',
      approvedBy: isApproved ? req.user._id : undefined,
      isApproved,
      salaryDeductionAmount: salaryDeduction,
      workedOnHoliday: finalWorkedOnHoliday,
      holidayType: finalHolidayType,
      overtimeHours: overtimeHours || 0,
      // Store snapshots
      employeeName: user.name,
      employeeUniqueId: user.uniqueId,
      employeeRole: user.role,
      employeeService: user.service,
    });
    await newAttendance.save();
    logger.info(`Created attendance ${newAttendance._id} for user ${userId} in ${finalEnvironment} environment`);
    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role')
      .populate('approvedBy', 'name email')
      .lean();
    const sanitizedAttendance = sanitizeAttendance(populatedAttendance);
    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`createAttendance Error: ${error.message}`); // SEC-FIX: Avoid stack trace in production logs
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this user and date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: `Server error while creating attendance: ${error.message}`,
    });
  }
});
// New: Self-create attendance (for allowed roles only)
const selfCreateAttendance = asyncHandler(async (req, res) => {
  try {
    // SEC-FIX: Sanitize logs
    logger.info(`[${new Date().toISOString()}] Self-creating attendance: user: ${req.user.uniqueId}`);
    // Role already checked in middleware, but verify
    const userRole = req.user.role.toLowerCase();
    if (!allowedAttendanceRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only allowed roles can create their own attendance',
      });
    }
    // Fixed to self user
    const uniqueId = req.user.uniqueId;
    const userId = req.user._id;
    const dailyRate = req.user.dailySalaryRate || 50;
    let date = req.body.date;
    let checkIn = req.body.checkIn;
    const { checkOut, status, notes, leaveReason, environment, sleepDuration, cursorMovements, biometricScanId, verificationMethod, signatureData, punchCardId, scanData, overtimeHours, workedOnHoliday, holidayType, virtualVerificationImage } = req.body;
    if (!checkIn) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Check-in time is required',
      });
    }
    // Derive date from checkIn if not provided
    const dateProvided = !!date;
    if (!date) {
      date = DateTime.fromISO(checkIn).toISODate();
      logger.info(`Derived date from checkIn: ${date}`);
    }
    const attendanceDate = DateTime.fromISO(date, { zone: 'UTC' }).startOf('day');
    const existingAttendance = await Attendance.findOne({
      userId,
      date: attendanceDate.toJSDate(),
    }).lean();
    if (existingAttendance) {
      logger.info(`Attendance already exists for user ${userId} on ${date}`);
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Attendance record already exists for this date',
      });
    }
    const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave', 'waiting'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }
    let finalStatus = status || 'present';
    let isApproved = true; // Self-marked as approved, except on-leave

    // Enforce User's Attendance Mode
    const userMode = req.user.attendanceMode || (req.user.attendanceVerificationMethod && ['Physical', 'Virtual'].includes(req.user.attendanceVerificationMethod) ? req.user.attendanceVerificationMethod.toLowerCase() : 'physical');
    let finalEnvironment = environment || userMode;



    // So I should replace lines 413-416 to consolidate.

    // BUT! For createAttendance (Chunk 1 above), the duplicate was at line 192 vs line 142.
    // Line 142 (new block): let finalEnvironment = ...
    // Line 192 (old block): let finalEnvironment = ...
    // My Chunk 1 removed the one at 192. Correct.

    // For selfCreateAttendance:
    // Line 413: let finalEnvironment = environment || 'physical';
    // Line 416: let finalEnvironment = environment || userMode;
    // Actually, I want the logic at 416 (using userMode).

    // So for this chunk, I will remove the FIRST declaration at 413 and keep the logic around 416, but remove the 'let' keyword since I'm targeting the block.
    // Ah, wait. I can just remove the first one and ensure the variable is declared properly.

    // Let's look at the file content again for selfCreateAttendance (lines 411-416).
    // 411: let finalStatus = status || 'present';
    // 412: let isApproved = true; 
    // 413: let finalEnvironment = environment || 'physical';
    // 414: // Enforce User's Attendance Mode
    // 415: const userMode = req.user.attendanceMode || 'physical';
    // 416: let finalEnvironment = environment || userMode;

    // I will replace lines 413-416 with the correct logic.

    if (finalEnvironment !== userMode) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_MODE',
        message: `You are configured for '${userMode}' attendance. Cannot create '${finalEnvironment}' attendance.`,
      });
    }

    if (!['virtual', 'physical'].includes(finalEnvironment)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ENVIRONMENT',
        message: 'Environment must be "virtual" or "physical"',
      });
    }
    if (finalEnvironment === 'virtual' && finalStatus !== 'on-leave') {
      if (sleepDuration === undefined || !Array.isArray(cursorMovements)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_FIELDS',
          message: 'For virtual environment: sleepDuration (minutes) and cursorMovements (array) are required',
        });
      }
      if (sleepDuration >= 480 || cursorMovements.length === 0) {
        finalStatus = 'absent';
      }
    }
    // Validate Physical Attendance Verification Methods
    const requiredMethod = req.user.attendanceVerificationMethod || 'none';
    let finalVerificationMethod = verificationMethod || requiredMethod;

    if (finalEnvironment === 'physical' && finalStatus === 'present') {
      // Enforcement check: if a specific method is required, it MUST be used
      if (requiredMethod !== 'none' && verificationMethod && verificationMethod !== requiredMethod) {
        logger.warn(`Verification method mismatch for user ${req.user.uniqueId}: expected ${requiredMethod}, got ${verificationMethod}. Marking as absent.`);
        finalStatus = 'absent';
      }

      if (finalStatus === 'present') {
        const validMethods = ['biometric', 'signature', 'punch-card', 'rfid-qr', 'Physical', 'Virtual', 'none'];
        if (!validMethods.includes(finalVerificationMethod)) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_VERIFICATION_METHOD',
            message: `Invalid verification method. Must be one of: ${validMethods.join(', ')}`,
          });
        }

        if (finalVerificationMethod === 'biometric') {
          if (!biometricScanId || biometricScanId !== req.user.biometricScanId) {
            logger.warn(`Biometric ID mismatch for user ${req.user.uniqueId}: expected ${req.user.biometricScanId}, got ${biometricScanId}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'signature') {
          if (!signatureData || signatureData !== req.user.signatureData) {
            logger.warn(`Signature ID mismatch for user ${req.user.uniqueId}: expected ${req.user.signatureData}, got ${signatureData}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'punch-card') {
          if (!punchCardId || punchCardId !== req.user.punchCardId) {
            logger.warn(`Punch Card ID mismatch for user ${req.user.uniqueId}: expected ${req.user.punchCardId}, got ${punchCardId}. Marking as absent.`);
            finalStatus = 'absent';
          }
        } else if (finalVerificationMethod === 'rfid-qr') {
          if (!scanData || scanData !== req.user.scanData) {
            logger.warn(`Scan data mismatch for user ${req.user.uniqueId}: expected ${req.user.scanData}, got ${scanData}. Marking as absent.`);
            finalStatus = 'absent';
          }
        }
      }
    }  // Handle holiday: explicit override first, then auto-detect only if date was explicitly provided
    let finalWorkedOnHoliday = false;
    let finalHolidayType = null;
    if (workedOnHoliday !== undefined) {
      if (typeof workedOnHoliday !== 'boolean') {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY',
          message: 'workedOnHoliday must be a boolean',
        });
      }
      finalWorkedOnHoliday = workedOnHoliday;
      if (finalWorkedOnHoliday && !['government', 'regular'].includes(holidayType)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY_TYPE',
          message: 'If workedOnHoliday is true, holidayType must be "government" or "regular"',
        });
      }
      finalHolidayType = holidayType || null;
      logger.info(`User explicitly set holiday: workedOnHoliday=${finalWorkedOnHoliday}, holidayType=${finalHolidayType}`);
    } else if (dateProvided) {
      // Auto-detect only if date was explicitly provided in request
      const autoHoliday = await autoDetectHoliday(attendanceDate);
      finalWorkedOnHoliday = autoHoliday.workedOnHoliday;
      finalHolidayType = autoHoliday.holidayType;
    } // If derived date, no auto-detection; defaults to false
    if (finalStatus === 'on-leave') {
      finalStatus = 'waiting'; // Initial state for user-requested leave
      isApproved = false;
      finalWorkedOnHoliday = false;
      finalHolidayType = null;
      logger.info(`New leave request created (waiting) for user ${userId} on ${date}`);
    }
    if (overtimeHours && (overtimeHours < 0 || overtimeHours > 8)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_OVERTIME',
        message: 'Overtime hours must be between 0 and 8',
      });
    }
    const salaryDeduction = calculateSalary(finalStatus, isApproved, dailyRate, finalWorkedOnHoliday, finalHolidayType, overtimeHours);
    const newAttendance = new Attendance({
      userId,
      date: attendanceDate.toJSDate(),
      checkIn: new Date(checkIn),
      checkOut: checkOut ? new Date(checkOut) : undefined,
      status: finalStatus,
      environment: finalEnvironment,
      ...(finalEnvironment === 'virtual' && finalStatus !== 'on-leave' && { sleepDuration, cursorMovements }),
      ...(finalEnvironment === 'physical' && finalStatus !== 'on-leave' && {
        verificationMethod: finalVerificationMethod,
        ...(finalVerificationMethod === 'biometric' && { biometricScanId }),
        ...(finalVerificationMethod === 'signature' && { signatureData }),
        ...(finalVerificationMethod === 'punch-card' && { punchCardId }),
        ...(finalVerificationMethod === 'rfid-qr' && { scanData }),
      }),
      virtualVerificationImage: finalEnvironment === 'virtual' && finalStatus === 'present' ? virtualVerificationImage : undefined,
      notes: notes || '',
      leaveReason: finalStatus === 'on-leave' ? leaveReason || '' : undefined,
      approvedBy: isApproved ? req.user._id : undefined,
      isApproved,
      salaryDeductionAmount: salaryDeduction,
      workedOnHoliday: finalWorkedOnHoliday,
      holidayType: finalHolidayType,
      overtimeHours: overtimeHours || 0,
      // Store snapshots
      employeeName: req.user.name,
      employeeUniqueId: req.user.uniqueId,
      employeeRole: req.user.role,
      employeeService: req.user.service,
    });
    await newAttendance.save();
    logger.info(`Self-created attendance ${newAttendance._id} for user ${userId} in ${finalEnvironment} environment`);
    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate phone')
      .populate('approvedBy', 'name email')
      .lean();
    const sanitizedAttendance = sanitizeAttendance(populatedAttendance);
    res.status(201).json({
      success: true,
      message: 'Your attendance record created successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`selfCreateAttendance Error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: `Server error while creating attendance: ${error.message}`,
    });
  }
});
// Get all attendances (Admin/HR/Dept Manager only)
const getAttendances = asyncHandler(async (req, res) => {
  try {
    // SEC-FIX: Sanitize logs
    logger.info(`[${new Date().toISOString()}] getAttendances requested by: ${req.user.id}`);
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager && !req.isServiceAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}. Role: ${req.user.role}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, department managers, service managers, or financial personnel can view attendance records',
      });
    }
    const { uniqueId, startDate, endDate, status, isApproved, environment, service, department, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {};

    // Apply service/department filters if provided and user has full access
    if (isFullAccess) {
      if (service && typeof service === 'string') {
        const serviceUsers = await User.find({ service: { $regex: new RegExp(String(service).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]+/g, '.*'), 'i') } }).select('_id').lean();
        query.userId = { $in: serviceUsers.map(u => u._id) };
      } else if (department && typeof department === 'string') {
        const deptUsers = await User.find({ department: { $regex: new RegExp(department.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[-\s]+/g, '.*'), 'i') } }).select('_id').lean();
        query.userId = { $in: deptUsers.map(u => u._id) };
      }
    }

    if (uniqueId && typeof uniqueId === 'string') {
      const targetUser = await User.findOne({ uniqueId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          errorCode: 'USER_NOT_FOUND',
          message: 'User not found with provided unique ID',
        });
      }
      // Role and department/service check for uniqueId
      if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_USER_ROLE',
          message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
        });
      }
      if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          errorCode: 'DEPARTMENT_MISMATCH',
          message: 'Not authorized to view attendance for this user',
        });
      }
      if (req.isServiceAttendanceManager && targetUser.service !== req.user.service) {
        return res.status(403).json({
          success: false,
          errorCode: 'SERVICE_MISMATCH',
          message: 'Not authorized to view attendance for this user',
        });
      }
      query.userId = targetUser._id;
    } else if (req.isDepartmentAttendanceManager) {
      // Filter to department users with allowed roles
      const deptUsers = await User.find({
        department: req.user.department,
        role: { $in: allowedAttendanceRoles.map(r => r.toLowerCase()) }
      }).select('_id').lean();
      if (deptUsers.length === 0) {
        return res.status(404).json({
          success: false,
          errorCode: 'NO_USERS',
          message: 'No eligible users in your department',
        });
      }
      query.userId = { $in: deptUsers.map(u => u._id) };
    } else if (req.isServiceAttendanceManager) {
      // Filter to service users with allowed roles
      const serviceUsers = await User.find({
        service: req.user.service,
        role: { $in: allowedAttendanceRoles.map(r => r.toLowerCase()) }
      }).select('_id').lean();
      if (serviceUsers.length === 0) {
        return res.status(404).json({
          success: false,
          errorCode: 'NO_USERS',
          message: 'No eligible users in your service',
        });
      }
      query.userId = { $in: serviceUsers.map(u => u._id) };
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = DateTime.fromISO(startDate, { zone: 'UTC' }).toJSDate();
      if (endDate) query.date.$lte = DateTime.fromISO(endDate, { zone: 'UTC' }).toJSDate();
    }
    if (status) query.status = status;
    if (isApproved !== undefined) {
      query.isApproved = (isApproved === 'true' || isApproved === true);
    }
    if (environment) query.environment = environment;
    // SEC-FIX: Avoid logging full query objects
    logger.info(`[${new Date().toISOString()}] Executing attendance search query`);
    const attendances = await Attendance.find(query)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role phone')
      .populate('approvedBy', 'name email')
      .sort({ date: -1, checkIn: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    const sanitizedAttendances = attendances.map(sanitizeAttendance);
    const total = await Attendance.countDocuments(query);
    logger.info(`Fetched ${attendances.length} attendances`);
    res.status(200).json({
      success: true,
      message: 'Attendances retrieved successfully',
      data: sanitizedAttendances,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    logger.error(`getAttendances Error: ${error.message}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching attendances',
    });
  }
});
// Get attendance summary statistics (Admin/HR/Dept Manager only) - Enhanced with total holiday bonuses
const getAttendanceSummary = asyncHandler(async (req, res) => {
  try {
    // SEC-FIX: Do not log raw query params
    logger.info(`getAttendanceSummary: Fetching summary (filters count: ${Object.keys(req.query).length})`);
    // Authorization check (same as getAttendances)
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, department managers, or financial personnel can view attendance summary',
      });
    }
    const { uniqueId, startDate, endDate } = req.query;
    const query = {};
    if (uniqueId) {
      const targetUser = await User.findOne({ uniqueId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          errorCode: 'USER_NOT_FOUND',
          message: 'User not found with provided unique ID',
        });
      }
      if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_USER_ROLE',
          message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
        });
      }
      if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          errorCode: 'DEPARTMENT_MISMATCH',
          message: 'Not authorized for this user',
        });
      }
      query.userId = targetUser._id;
    } else if (req.isDepartmentAttendanceManager) {
      const deptUsers = await User.find({
        department: req.user.department,
        role: { $in: allowedAttendanceRoles.map(r => r.toLowerCase()) }
      }).select('_id').lean();
      query.userId = { $in: deptUsers.map(u => u._id) };
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = DateTime.fromISO(startDate, { zone: 'UTC' }).toJSDate();
      if (endDate) query.date.$lte = DateTime.fromISO(endDate, { zone: 'UTC' }).toJSDate();
    }
    const summary = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalOvertimeHours: { $sum: '$overtimeHours' },
          totalWaitingDays: {
            $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] },
          },
          totalSalaryDeductions: { $sum: '$salaryDeductionAmount' },
          // New: Total holiday bonuses (positive amounts from holidays)
          totalHolidayBonuses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$workedOnHoliday', true] },
                    { $eq: ['$status', 'present'] },
                    { $gt: ['$salaryDeductionAmount', 0] }
                  ]
                },
                '$salaryDeductionAmount',
                0
              ]
            }
          },
        },
      },
    ]);
    const totalRecords = await Attendance.countDocuments(query);
    logger.info(`Fetched attendance summary for query: ${JSON.stringify(query)}`);
    res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: {
        summary,
        totalRecords,
      },
    });
  } catch (error) {
    logger.error(`getAttendanceSummary Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching attendance summary',
    });
  }
});
// New: Get calendar data with work days, holidays, and government holidays (Admin/HR only)
const getCalendar = asyncHandler(async (req, res) => {
  try {
    logger.info(`getCalendar: Query params: ${JSON.stringify(req.query)}`);

    const { startDate, endDate, uniqueId } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'startDate and endDate are required',
      });
    }

    // Determine Access Level for Calendar
    const role = req.user.role?.toLowerCase();
    const dept = (req.user.department || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-');
    const isHRSubadmin = role === 'subadmin' && (dept.includes('human-resources') || dept === 'hr' || dept === 'human-resource');
    // Pre-calculate full access status
    const isFullAccess = req.isFullAttendanceAccess || role === 'admin' || role === 'superadmin' || isHRSubadmin;

    let targetUserId = null;
    let targetUser = null;

    if (uniqueId) {
      targetUser = await User.findOne({ uniqueId });
      if (!targetUser) {
        return res.status(404).json({ success: false, errorCode: 'USER_NOT_FOUND', message: 'User not found' });
      }
      targetUserId = targetUser._id;

      // Check permissions
      // 1. Admin/HR (Full Access) -> OK
      // 2. Self -> OK
      // 3. Dept Manager (same dept) -> OK
      // 4. Service Manager (same service) -> OK

      // req.user might be undefined if auth middleware failed (but we assume authenticateUser wraps this)
      const isSelf = req.user._id.toString() === targetUser._id.toString();
      // isFullAccess is now defined above
      const isDeptManager = req.isDepartmentAttendanceManager && req.user.department === targetUser.department;
      const isServiceManager = req.isServiceAttendanceManager && req.user.service === targetUser.service;

      if (!isSelf && !isFullAccess && !isDeptManager && !isServiceManager) {
        return res.status(403).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not authorized to view this user calendar' });
      }
    } else {
      // Original Logic: General Calendar View
      // isFullAccess is now defined above
      if (!isFullAccess) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Only admins and HR subadmins can view general calendar stats',
        });
      }
    }

    const start = DateTime.fromISO(startDate, { zone: 'UTC' }).startOf('day');
    const end = DateTime.fromISO(endDate, { zone: 'UTC' }).endOf('day');
    if (start > end) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_DATE_RANGE',
        message: 'startDate must be before or equal to endDate',
      });
    }

    // Fetch all holidays in the range
    const holidays = await Holiday.find({
      date: {
        $gte: start.toJSDate(),
        $lte: end.toJSDate(),
      },
    }).lean();

    let attendanceDateSet = new Set();
    let userAttendances = [];

    if (targetUserId) {
      // Fetch User Attendance
      userAttendances = await Attendance.find({
        userId: targetUserId,
        date: { $gte: start.toJSDate(), $lte: end.toJSDate() }
      }).lean();
    } else {
      // Fetch all dates with attendance records (to identify active work days for general view)
      const attendanceDates = await Attendance.aggregate([
        {
          $match: {
            date: {
              $gte: start.toJSDate(),
              $lte: end.toJSDate(),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
              },
            },
          },
        },
      ]);
      attendanceDateSet = new Set(attendanceDates.map(ad => ad._id));
    }

    // Build calendar array
    let calendar = [];
    let current = start;
    while (current <= end) {
      const dateStr = current.toISODate();
      const isHoliday = holidays.some(h => DateTime.fromJSDate(h.date).toISODate() === dateStr);
      const holiday = isHoliday ? holidays.find(h => DateTime.fromJSDate(h.date).toISODate() === dateStr) : null;

      let type = 'workday'; // Default
      let userStatus = null;
      let attendanceDetails = null;

      if (isHoliday) {
        type = `holiday-${holiday.type}`; // e.g., 'holiday-government', 'holiday-regular'
      } else if (!targetUserId && !attendanceDateSet.has(dateStr)) {
        type = 'non-workday'; // No attendance record in general view
      }

      if (targetUserId) {
        // Find attendance for this day
        const att = userAttendances.find(a => DateTime.fromJSDate(a.date).toISODate() === dateStr);
        if (att) {
          userStatus = att.status; // present, absent, on-leave
          attendanceDetails = sanitizeAttendance(att);
        }
      }

      calendar.push({
        date: dateStr,
        type,
        ...(isHoliday && { holidayName: holiday.name, holidayType: holiday.type }),
        ...(targetUserId && { userStatus, attendanceDetails }),
        hasAttendance: targetUserId ? !!userStatus : attendanceDateSet.has(dateStr),
      });
      current = current.plus({ days: 1 });
    }

    logger.info(`Generated calendar for ${startDate} to ${endDate} (User: ${targetUserId || 'General'})`);

    // Calculate Summary
    const summary = {
      totalDays: calendar.length,
      workDays: calendar.filter(c => c.type === 'workday').length,
      regularHolidays: calendar.filter(c => c.type === 'holiday-regular').length,
      governmentHolidays: calendar.filter(c => c.type === 'holiday-government').length,
      // For general view
      nonWorkDays: !targetUserId ? calendar.filter(c => c.type === 'non-workday').length : 0,
      // For user view
      presentDays: targetUserId ? calendar.filter(c => c.userStatus === 'present').length : 0,
      absentDays: targetUserId ? calendar.filter(c => c.userStatus === 'absent').length : 0,
      leaveDays: targetUserId ? calendar.filter(c => c.userStatus === 'on-leave').length : 0,
      waitingDays: targetUserId ? calendar.filter(c => c.userStatus === 'waiting').length : 0,
    };

    res.status(200).json({
      success: true,
      message: 'Calendar data retrieved successfully',
      data: {
        calendar,
        summary,
      },
    });
  } catch (error) {
    logger.error(`getCalendar Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching calendar data',
    });
  }
});
// Export attendance report as CSV (Admin/HR/Dept Manager only)
const exportAttendanceReport = asyncHandler(async (req, res) => {
  try {
    // SEC-FIX: Do not log raw query params
    logger.info(`exportAttendanceReport: Exporting report for user ${req.user.id}`);
    // Authorization check (same as getAttendances)
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, department managers, or financial personnel can export attendance reports',
      });
    }
    const { uniqueId, startDate, endDate } = req.query;
    const query = {};
    if (uniqueId) {
      const targetUser = await User.findOne({ uniqueId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          errorCode: 'USER_NOT_FOUND',
          message: 'User not found with provided unique ID',
        });
      }
      if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_USER_ROLE',
          message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
        });
      }
      if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          errorCode: 'DEPARTMENT_MISMATCH',
          message: 'Not authorized to export for this user',
        });
      }
      query.userId = targetUser._id;
    } else if (req.isDepartmentAttendanceManager) {
      const deptUsers = await User.find({
        department: req.user.department,
        role: { $in: allowedAttendanceRoles.map(r => r.toLowerCase()) }
      }).select('_id').lean();
      query.userId = { $in: deptUsers.map(u => u._id) };
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = DateTime.fromISO(startDate, { zone: 'UTC' }).toJSDate();
      if (endDate) query.date.$lte = DateTime.fromISO(endDate, { zone: 'UTC' }).toJSDate();
    }
    const attendances = await Attendance.find(query)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role')
      .populate('approvedBy', 'name email')
      .sort({ date: -1, checkIn: -1 })
      .lean();
    // Generate CSV - Enhanced with holiday info, but use sanitized values
    let csv = 'Unique ID,Name,Email,Department,Date,Status,Environment,Overtime Hours,Salary Deduction,Holiday Work,Holiday Type,Approved\n';
    attendances.forEach(att => {
      const sanitized = sanitizeAttendance(att);
      const holidayWork = sanitized.workedOnHoliday !== undefined ? (sanitized.workedOnHoliday ? 'Yes' : 'No') : 'No';
      const holidayType = sanitized.holidayType || 'None';
      const overtime = sanitized.overtimeHours || 0;
      csv += `${sanitized.userId.uniqueId},${sanitized.userId.name},${sanitized.userId.email},${sanitized.userId.department || 'N/A'},${DateTime.fromJSDate(att.date).toISODate()},${sanitized.status},${sanitized.environment},${overtime},${sanitized.salaryDeductionAmount},${holidayWork},${holidayType},${sanitized.isApproved ? 'Yes' : 'No'}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    res.status(200).send(csv);
    logger.info(`Exported attendance report for query: ${JSON.stringify(query)}`);
  } catch (error) {
    logger.error(`exportAttendanceReport Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while exporting attendance report',
    });
  }
});
// Get single attendance by ID (Admin/HR/Dept Manager only)
const getAttendanceById = asyncHandler(async (req, res) => {
  try {
    logger.info(`getAttendanceById: ID: ${req.params.id}`);
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.isHRManager;
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, department managers, or financial personnel can view attendance details',
      });
    }
    const attendance = await Attendance.findById(req.params.id)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role profileImage')
      .populate('approvedBy', 'name email')
      .lean();
    if (!attendance) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }
    // Post-fetch checks
    const targetUser = attendance.userId;
    if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    const sanitizedAttendance = sanitizeAttendance(attendance);
    res.status(200).json({
      success: true,
      message: 'Attendance retrieved successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`getAttendanceById Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching attendance',
    });
  }
});
// Get attendances by user ID (Admin/HR/Dept Manager or self)
const getAttendanceByUserId = asyncHandler(async (req, res) => {
  try {
    logger.info(`getAttendanceByUserId: User ID: ${req.params.userId}, Query: ${JSON.stringify(req.query)}`);
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).select('_id name email uniqueId employeeType dailySalaryRate department role');
    } else {
      user = await User.findOne({ uniqueId: userId }).select('_id name email uniqueId employeeType dailySalaryRate department role');
    }
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return res.status(404).json({ success: false, errorCode: 'USER_NOT_FOUND', message: 'User not found' });
    }
    // Role check
    if (!allowedAttendanceRoles.includes(user.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    // Auth check (beyond self)
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && req.user._id.toString() !== user._id.toString()) {
      if (req.isDepartmentAttendanceManager && user.department !== req.user.department) {
        return res.status(403).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not authorized to view attendances for this user' });
      }
      // If not dept manager, deny
      return res.status(403).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not authorized to view attendances for this user' });
    }
    const query = { userId: user._id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = DateTime.fromISO(startDate, { zone: 'UTC' }).toJSDate();
      if (endDate) query.date.$lte = DateTime.fromISO(endDate, { zone: 'UTC' }).toJSDate();
    }
    const attendances = await Attendance.find(query)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role')
      .populate('approvedBy', 'name email')
      .sort({ date: -1, checkIn: -1 })
      .lean();
    const processedAttendances = attendances.map(att => ({
      ...att,
      environment: att.environment || 'physical',
    })).map(sanitizeAttendance);
    if (processedAttendances.length === 0) {
      logger.warn(`No attendances found for user ${user.uniqueId} (${user.name}) from ${startDate || 'all time'} to ${endDate || 'all time'}`);
    } else {
      logger.info(`Fetched ${processedAttendances.length} attendances for user ${userId} (${user.name}, ${user.uniqueId}) by ${req.user.email || req.user.name}`);
    }
    res.status(200).json({
      success: true,
      message: 'Attendances retrieved successfully',
      data: processedAttendances,
    });
  } catch (error) {
    logger.error(`getAttendanceByUserId Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching attendances',
    });
  }
});
// Get attendance for edit (Admin/HR/Dept Manager only)
const getAttendanceForEdit = asyncHandler(async (req, res) => {
  try {
    logger.info(`getAttendanceForEdit: ID: ${req.params.id}`);
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Only admins, HR subadmins, department managers, or financial personnel can edit attendance records' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.error(`Invalid attendance ID format: ${req.params.id}`);
      return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid attendance ID format' });
    }
    const attendance = await Attendance.findById(req.params.id)
      .populate('userId', 'name email uniqueId employeeType dailySalaryRate department role')
      .populate('approvedBy', 'name email')
      .lean();
    if (!attendance) {
      logger.error(`Attendance not found for ID: ${req.params.id}`);
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Attendance not found' });
    }
    // Post-fetch checks
    const targetUser = attendance.userId;
    if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    const users = await User.find({
      role: { $in: allowedAttendanceRoles.map(r => r.toLowerCase()) },
      isActive: true
    })
      .select('name email uniqueId employeeType dailySalaryRate department role')
      .lean();
    if (users.length === 0) {
      logger.warn(`No active users found`);
      return res.status(404).json({ success: false, errorCode: 'NO_USERS', message: 'No active users found' });
    }
    logger.info(`Attendance ${attendance._id} fetched for editing by admin ${req.user.email || req.user.name}`);
    res.status(200).json({
      success: true,
      message: 'Attendance and users retrieved successfully for editing',
      data: {
        attendance: { ...attendance, createdAt: attendance.createdAt, updatedAt: attendance.updatedAt },
        users,
      },
    });
  } catch (error) {
    logger.error(`getAttendanceForEdit Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching attendance for edit',
    });
  }
});
// Updated: Self-update attendance (for allowed roles only)
const selfUpdateAttendance = asyncHandler(async (req, res) => {
  try {
    logger.info(`selfUpdateAttendance: ID: ${req.params.id}, Body: ${JSON.stringify(req.body, null, 2)}`);
    // Role already checked in middleware
    const userRole = req.user.role.toLowerCase();
    if (!allowedAttendanceRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only allowed roles can update their own attendance',
      });
    }
    const { checkOut, status, notes, environment, sleepDuration, cursorMovements, biometricScanId, overtimeHours, workedOnHoliday, holidayType } = req.body;
    const attendance = await Attendance.findById(req.params.id).populate('userId', 'dailySalaryRate');
    if (!attendance) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }
    // Role check
    if (!allowedAttendanceRoles.includes(attendance.userId.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance updates are only for allowed roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (attendance.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'You can only update your own attendance records',
      });
    }
    // Allow update only if date is today or future (prevent backdating)
    const today = DateTime.now().setZone('UTC').startOf('day');
    if (DateTime.fromJSDate(attendance.date).startOf('day') < today) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_DATE',
        message: 'Can only update attendance for today or future dates',
      });
    }
    const dailyRate = attendance.userId.dailySalaryRate || 50;
    if (status) {
      const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_STATUS',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      attendance.status = status;
      let isApproved = attendance.isApproved;
      if (status === 'on-leave') {
        isApproved = false;
        attendance.approvedBy = undefined;
        attendance.workedOnHoliday = false;
        attendance.holidayType = null;
        logger.info(`Notify admins of updated leave request for user ${attendance.userId} on ${attendance.date}`);
      } else {
        // For other statuses, self-approve
        isApproved = true;
        attendance.approvedBy = req.user._id;
      }
      attendance.isApproved = isApproved;
    }
    // Handle holiday for self: similar to create
    let finalWorkedOnHoliday = attendance.workedOnHoliday;
    let finalHolidayType = attendance.holidayType;
    if (workedOnHoliday !== undefined) {
      if (typeof workedOnHoliday !== 'boolean') {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY',
          message: 'workedOnHoliday must be a boolean',
        });
      }
      finalWorkedOnHoliday = workedOnHoliday;
      if (finalWorkedOnHoliday && !['government', 'regular'].includes(holidayType)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY_TYPE',
          message: 'If workedOnHoliday is true, holidayType must be "government" or "regular"',
        });
      }
      finalHolidayType = holidayType || null;
    } else if (attendance.status === 'present') {
      const attendanceDate = DateTime.fromJSDate(attendance.date).startOf('day');
      const autoHoliday = await autoDetectHoliday(attendanceDate);
      finalWorkedOnHoliday = autoHoliday.workedOnHoliday;
      finalHolidayType = autoHoliday.holidayType;
    }
    if (attendance.status === 'on-leave') {
      finalWorkedOnHoliday = false;
      finalHolidayType = null;
    }
    attendance.workedOnHoliday = finalWorkedOnHoliday;
    attendance.holidayType = finalHolidayType;
    if (environment) {
      if (!['virtual', 'physical'].includes(environment)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_ENVIRONMENT',
          message: 'Environment must be "virtual" or "physical"',
        });
      }
      attendance.environment = environment;
      if (environment === 'virtual' && attendance.status !== 'on-leave') {
        if (sleepDuration !== undefined) attendance.sleepDuration = sleepDuration;
        if (cursorMovements !== undefined) {  // Use !== undefined to allow empty array
          let parsedMovements;
          if (Array.isArray(cursorMovements)) {
            // Already an array (from frontend)
            parsedMovements = cursorMovements;
          } else if (typeof cursorMovements === 'string') {
            // String JSON (fallback for other clients)
            try {
              parsedMovements = JSON.parse(cursorMovements);
            } catch (error) {
              return res.status(400).json({
                success: false,
                errorCode: 'INVALID_CURSOR_MOVEMENTS',
                message: 'Invalid cursor movements format. Must be a JSON array of ISO date strings',
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be an array or valid JSON string',
            });
          }

          // Validate array
          if (!Array.isArray(parsedMovements)) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be a valid JSON array',
            });
          }
          const invalidDates = parsedMovements.some(
            (date) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(date)
          );
          if (invalidDates) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be valid ISO date strings',
            });
          }
          if (attendance.status === 'present' && parsedMovements.length === 0) {
            attendance.status = 'absent';  // Auto-set absent if no movements
          }
          attendance.cursorMovements = parsedMovements;
        }
        if (attendance.status === 'present' && (attendance.sleepDuration >= 480 || attendance.cursorMovements.length === 0)) {
          attendance.status = 'absent';
        }
      } else if (environment === 'physical' && attendance.status !== 'on-leave') {
        if (biometricScanId !== undefined) {
          if (!/^BIO-\d{9}$/.test(biometricScanId)) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_BIOMETRIC',
              message: 'Biometric scan ID must follow format BIO-<9 digits>',
            });
          }
          attendance.biometricScanId = biometricScanId;
        }
        if (attendance.status === 'present' && !attendance.biometricScanId) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_BIOMETRIC',
            message: 'Biometric scan ID required for present in physical',
          });
        }
      }
    }
    if (overtimeHours !== undefined) {
      if (overtimeHours < 0 || overtimeHours > 8) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_OVERTIME',
          message: 'Overtime hours must be between 0 and 8',
        });
      }
      attendance.overtimeHours = overtimeHours;
    }
    if (checkOut !== undefined) attendance.checkOut = checkOut ? new Date(checkOut) : undefined;
    if (notes !== undefined) attendance.notes = notes;
    attendance.salaryDeductionAmount = calculateSalary(attendance.status, attendance.isApproved, dailyRate, finalWorkedOnHoliday, finalHolidayType, attendance.overtimeHours);
    await attendance.save();
    logger.info(`Self-updated attendance ${attendance._id}`);
    await attendance.populate('userId', 'name email uniqueId employeeType dailySalaryRate');
    await attendance.populate('approvedBy', 'name email');
    const sanitizedAttendance = sanitizeAttendance(attendance.toObject());
    res.status(200).json({
      success: true,
      message: 'Your attendance updated successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`selfUpdateAttendance Error: ${error.stack}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while updating attendance',
    });
  }
});
// Update attendance status (Admin/HR/Dept Manager only, except on-leave)
const updateAttendanceStatus = asyncHandler(async (req, res) => {
  try {
    logger.info(`updateAttendanceStatus: ID: ${req.params.id}, Body: ${JSON.stringify(req.body)}`);
    const { id } = req.params;
    const { status } = req.body;
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Only admins, HR subadmins, or department managers can update attendance status' });
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.error(`Invalid attendance ID format: ${id}`);
      return res.status(400).json({ success: false, errorCode: 'INVALID_ID', message: 'Invalid attendance ID format' });
    }
    const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave'];
    if (!validStatuses.includes(status)) {
      logger.error(`Invalid status: ${status}`);
      return res.status(400).json({ success: false, errorCode: 'INVALID_STATUS', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    if (status === 'on-leave') {
      logger.error('Admins cannot set "on-leave" status');
      return res.status(403).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Admins cannot set "on-leave" status. Users must request leave.',
      });
    }
    const attendance = await Attendance.findById(id).populate('userId', 'dailySalaryRate');
    if (!attendance) {
      logger.error(`Attendance not found: ${id}`);
      return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'Attendance not found' });
    }
    // Post-fetch checks
    const targetUser = attendance.userId;
    if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    const dailyRate = attendance.userId.dailySalaryRate || 50;
    attendance.status = status;
    // Auto-detect holiday if changing to 'present' and not explicitly set
    if (status === 'present' && !attendance.workedOnHoliday) {
      const attendanceDate = DateTime.fromJSDate(attendance.date).startOf('day');
      const autoHoliday = await autoDetectHoliday(attendanceDate);
      attendance.workedOnHoliday = autoHoliday.workedOnHoliday;
      attendance.holidayType = autoHoliday.holidayType;
    }
    attendance.salaryDeductionAmount = calculateSalary(status, attendance.isApproved, dailyRate, attendance.workedOnHoliday, attendance.holidayType, attendance.overtimeHours);
    await attendance.save();
    await attendance.populate('userId', 'name email uniqueId employeeType dailySalaryRate department role');
    await attendance.populate('approvedBy', 'name email');
    const sanitizedAttendance = sanitizeAttendance(attendance.toObject());
    logger.info(`Status updated to ${status} for attendance ${attendance._id} by admin ${req.user.email || req.user.name}`);
    res.status(200).json({
      success: true,
      message: 'Attendance status updated successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`updateAttendanceStatus Error: ${error.stack}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this user and date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while updating attendance status',
    });
  }
});
// Approve leave (Admin/HR/Dept Manager only)
const approveLeave = asyncHandler(async (req, res) => {
  try {
    logger.info(`approveLeave: ID: ${req.params.id}`);
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess) {
      logger.error(`Unauthorized leave approval attempt by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only HR Managers or Admins can approve leave requests',
      });
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.error(`Invalid attendance ID format: ${id}`);
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ID',
        message: 'Invalid attendance ID format',
      });
    }
    const attendance = await Attendance.findById(id).populate('userId', 'name email uniqueId employeeType dailySalaryRate department role service');
    if (!attendance) {
      logger.error(`Attendance not found: ${id}`);
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }
    // Post-fetch checks
    const targetUser = attendance.userId;
    const targetRole = targetUser.role.toLowerCase();
    const targetDept = (targetUser.department || '').toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
    const approverRole = req.user.role.toLowerCase();
    const isApproverFullAccess = req.isFullAttendanceAccess || approverRole === 'admin' || approverRole === 'superadmin';

    // RULE 1: If target is a Manager, ONLY HR Manager (or Admin) can approve
    if (targetRole === 'manager') {
      if (!isApproverFullAccess) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Only HR Managers or Admins can approve leave for other Managers',
        });
      }
    } else if (targetRole === 'tl' || targetRole === 'employee') {
      // RULE 2: If target is TL or Employee, Service Manager or HR Manager can approve
      const isServiceManager = req.isServiceAttendanceManager && targetUser.service === req.user.service;
      if (!isApproverFullAccess && !isServiceManager) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Only Service Managers or HR Managers can approve leave for TLs/Employees',
        });
      }
    } else {
      // Fallback for other roles if any
      if (!isApproverFullAccess && !req.isDepartmentAttendanceManager) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Not authorized to approve this leave request',
        });
      }
    }
    if (attendance.status !== 'waiting' && attendance.status !== 'on-leave') {
      logger.error(`Cannot approve non-leave/waiting record: ${id}`);
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Only waiting or on-leave records can be approved',
      });
    }
    if (attendance.isApproved) {
      logger.error(`Attendance already approved: ${id}`);
      return res.status(400).json({
        success: false,
        errorCode: 'ALREADY_APPROVED',
        message: 'This leave request is already approved',
      });
    }
    const dailyRate = attendance.userId.dailySalaryRate || 50;
    attendance.status = 'on-leave'; // Mark as on-leave once approved
    attendance.isApproved = true;
    attendance.approvedBy = req.user._id;
    attendance.salaryDeductionAmount = calculateSalary('on-leave', true, dailyRate, attendance.workedOnHoliday, attendance.holidayType, attendance.overtimeHours);
    await attendance.save();
    logger.info(`Leave approved for attendance ${id} by admin ${req.user.email || req.user.name}`);
    await attendance.populate('userId', 'name email uniqueId employeeType dailySalaryRate department role phone');
    await attendance.populate('approvedBy', 'name email');
    const sanitizedAttendance = sanitizeAttendance(attendance.toObject());
    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`approveLeave Error: ${error.stack}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this user and date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while approving leave',
    });
  }
});

// Reject leave (Admin/HR/Dept Manager only)
const rejectLeave = asyncHandler(async (req, res) => {
  try {
    logger.info(`rejectLeave: ID: ${req.params.id}`);
    const { id } = req.params;
    const { reason } = req.body;

    // Authorization check
    const isApproverFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';

    if (!isApproverFullAccess && !req.isDepartmentAttendanceManager && !req.isServiceAttendanceManager) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR managers, department managers, or service managers can reject leave',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ID',
        message: 'Invalid attendance ID format',
      });
    }

    const attendance = await Attendance.findById(id).populate('userId', 'dailySalaryRate role department service');
    if (!attendance) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }

    const targetUser = attendance.userId;
    const targetRole = targetUser.role.toLowerCase();

    // Verification logic (same as approve)
    if (targetRole === 'manager') {
      if (!isApproverFullAccess) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Only HR Managers or Admins can reject leave for Managers',
        });
      }
    } else if (targetRole === 'tl' || targetRole === 'employee') {
      const isServiceManager = req.isServiceAttendanceManager && targetUser.service === req.user.service;
      if (!isApproverFullAccess && !isServiceManager) {
        return res.status(403).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          message: 'Only Service Managers or HR Managers can reject leave for TLs/Employees',
        });
      }
    }

    if (attendance.status !== 'on-leave') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_STATUS',
        message: 'Only on-leave records can be rejected',
      });
    }

    attendance.status = 'absent';
    attendance.isApproved = false;
    attendance.rejectionReason = reason || 'Rejected by ' + req.user.name;
    attendance.approvedBy = req.user._id;

    const dailyRate = targetUser.dailySalaryRate || 50;
    attendance.salaryDeductionAmount = calculateSalary('absent', false, dailyRate, attendance.workedOnHoliday, attendance.holidayType, attendance.overtimeHours);

    await attendance.save();

    await attendance.populate('userId', 'name email uniqueId employeeType dailySalaryRate department role phone');
    await attendance.populate('approvedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Leave request rejected successfully',
      data: sanitizeAttendance(attendance.toObject()),
    });
  } catch (error) {
    logger.error(`rejectLeave Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while rejecting leave',
    });
  }
});
// Admin-only update attendance (Admin/HR/Dept Manager only)
const updateAttendanceAdmin = asyncHandler(async (req, res) => {
  try {
    logger.info(`updateAttendanceAdmin: ID: ${req.params.id}, Body: ${JSON.stringify(req.body, null, 2)}`);
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      logger.error(`Unauthorized access by ${req.user?.email || 'unknown'}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, or department managers can update attendance records via this endpoint',
      });
    }
    const { uniqueId, date: inputDate, checkIn, checkOut, status, notes, isApproved, environment, sleepDuration, cursorMovements, biometricScanId, overtimeHours, workedOnHoliday, holidayType } = req.body;
    const attendance = await Attendance.findById(req.params.id).populate('userId', 'dailySalaryRate department role');
    if (!attendance) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }
    // Post-fetch checks
    let targetUser = attendance.userId;
    if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    // Handle date update
    if (inputDate) {
      const newDate = DateTime.fromISO(inputDate, { zone: 'UTC' }).startOf('day');
      if (newDate.invalid) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_DATE',
          message: 'Invalid date format',
        });
      }
      attendance.date = newDate.toJSDate();
    }
    // Handle uniqueId update
    if (uniqueId) {
      const user = await User.findOne({ uniqueId }).lean();
      if (!user) {
        return res.status(404).json({
          success: false,
          errorCode: 'USER_NOT_FOUND',
          message: 'User not found with provided unique ID',
        });
      }
      if (!allowedAttendanceRoles.includes(user.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_USER_ROLE',
          message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
        });
      }
      if (req.isDepartmentAttendanceManager && user.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          errorCode: 'DEPARTMENT_MISMATCH',
          message: 'Can only update for users in your department',
        });
      }
      attendance.userId = user._id;
      targetUser = user; // Update for post-fetch check
    }
    // Re-check department after potential user change
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    // Handle checkIn and checkOut updates
    if (checkIn !== undefined) {
      const checkInDate = new Date(checkIn);
      if (isNaN(checkInDate.getTime())) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_CHECKIN',
          message: 'Invalid check-in time format',
        });
      }
      attendance.checkIn = checkInDate;
    }
    if (checkOut !== undefined) {
      if (checkOut) {
        const checkOutDate = new Date(checkOut);
        if (isNaN(checkOutDate.getTime())) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_CHECKOUT',
            message: 'Invalid check-out time format',
          });
        }
        attendance.checkOut = checkOutDate;
      } else {
        attendance.checkOut = undefined;
      }
    }
    if (status) {
      const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_STATUS',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      attendance.status = status;
      if (status === 'on-leave' && isApproved === undefined) {
        attendance.isApproved = false;
        attendance.approvedBy = undefined;
      }
    }
    // Handle holiday: explicit override first, then auto-detect if not provided and status is 'present'
    let finalWorkedOnHoliday = attendance.workedOnHoliday;
    let finalHolidayType = attendance.holidayType;
    if (workedOnHoliday !== undefined) {
      if (typeof workedOnHoliday !== 'boolean') {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY',
          message: 'workedOnHoliday must be a boolean',
        });
      }
      finalWorkedOnHoliday = workedOnHoliday;
      if (finalWorkedOnHoliday && !['government', 'regular'].includes(holidayType)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_HOLIDAY_TYPE',
          message: 'If workedOnHoliday is true, holidayType must be "government" or "regular"',
        });
      }
      finalHolidayType = holidayType || null;
      logger.info(`Admin explicitly set holiday: workedOnHoliday=${finalWorkedOnHoliday}, holidayType=${finalHolidayType}`);
    } else if (attendance.status === 'present') {
      // Auto-detect if not explicitly provided
      const attendanceDate = DateTime.fromJSDate(attendance.date).startOf('day');
      const autoHoliday = await autoDetectHoliday(attendanceDate);
      finalWorkedOnHoliday = autoHoliday.workedOnHoliday;
      finalHolidayType = autoHoliday.holidayType;
    }
    if (attendance.status === 'on-leave') {
      finalWorkedOnHoliday = false;
      finalHolidayType = null;
    }
    attendance.workedOnHoliday = finalWorkedOnHoliday;
    attendance.holidayType = finalHolidayType;
    if (isApproved !== undefined && (attendance.status === 'on-leave' || status === 'on-leave')) {
      attendance.isApproved = isApproved;
      attendance.approvedBy = isApproved ? req.user._id : undefined;
      logger.info(`Leave ${isApproved ? 'approved' : 'rejected'} for attendance ${attendance._id} by admin ${req.user.email || req.user.name}`);
    }
    if (environment) {
      if (!['virtual', 'physical'].includes(environment)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_ENVIRONMENT',
          message: 'Environment must be "virtual" or "physical"',
        });
      }
      attendance.environment = environment;
      if (environment === 'virtual' && attendance.status !== 'on-leave') {
        if (sleepDuration !== undefined) attendance.sleepDuration = sleepDuration;
        if (cursorMovements !== undefined) {  // Use !== undefined to allow empty array
          let parsedMovements;
          if (Array.isArray(cursorMovements)) {
            // Already an array (from frontend)
            parsedMovements = cursorMovements;
          } else if (typeof cursorMovements === 'string') {
            // String JSON (fallback for other clients)
            try {
              parsedMovements = JSON.parse(cursorMovements);
            } catch (error) {
              return res.status(400).json({
                success: false,
                errorCode: 'INVALID_CURSOR_MOVEMENTS',
                message: 'Invalid cursor movements format. Must be a JSON array of ISO date strings',
              });
            }
          } else {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be an array or valid JSON string',
            });
          }

          // Validate array
          if (!Array.isArray(parsedMovements)) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be a valid JSON array',
            });
          }
          const invalidDates = parsedMovements.some(
            (date) => !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(date)
          );
          if (invalidDates) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_CURSOR_MOVEMENTS',
              message: 'Cursor movements must be valid ISO date strings',
            });
          }
          if (attendance.status === 'present' && parsedMovements.length === 0) {
            attendance.status = 'absent';  // Auto-set absent if no movements
          }
          attendance.cursorMovements = parsedMovements;
        }
        if (attendance.status === 'present' && (attendance.sleepDuration >= 480 || (attendance.cursorMovements && attendance.cursorMovements.length === 0))) {
          attendance.status = 'absent';
        }
      } else if (environment === 'physical' && attendance.status !== 'on-leave') {
        if (biometricScanId !== undefined) {
          if (!/^BIO-\d{9}$/.test(biometricScanId)) {
            return res.status(400).json({
              success: false,
              errorCode: 'INVALID_BIOMETRIC',
              message: 'Biometric scan ID must follow format BIO-<9 digits>',
            });
          }
          attendance.biometricScanId = biometricScanId;
        }
        if (attendance.status === 'present' && !attendance.biometricScanId) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_BIOMETRIC',
            message: 'Biometric scan ID required for present status in physical environment',
          });
        }
      }
    }
    if (overtimeHours !== undefined) {
      if (overtimeHours < 0 || overtimeHours > 8) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_OVERTIME',
          message: 'Overtime hours must be between 0 and 8',
        });
      }
      attendance.overtimeHours = overtimeHours;
    }
    if (notes !== undefined) attendance.notes = notes;
    // Check for duplicate before save
    const duplicateQuery = {
      userId: attendance.userId,
      date: attendance.date,
    };
    if (attendance._id) {
      duplicateQuery._id = { $ne: attendance._id };
    }
    const existingDuplicate = await Attendance.findOne(duplicateQuery).lean();
    if (existingDuplicate) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Attendance record already exists for this user and date',
      });
    }
    // Fetch current user for dailyRate after all updates
    const currentUserDoc = await User.findById(attendance.userId).select('dailySalaryRate').lean();
    const dailyRate = currentUserDoc ? currentUserDoc.dailySalaryRate || 50 : 50;
    attendance.salaryDeductionAmount = calculateSalary(attendance.status, attendance.isApproved, dailyRate, finalWorkedOnHoliday, finalHolidayType, attendance.overtimeHours);
    await attendance.save();
    logger.info(`Updated attendance ${attendance._id} by admin ${req.user.email || req.user.name}`);
    await attendance.populate('userId', 'name email uniqueId employeeType dailySalaryRate department role phone');
    await attendance.populate('approvedBy', 'name email');
    const sanitizedAttendance = sanitizeAttendance(attendance.toObject());
    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: sanitizedAttendance,
    });
  } catch (error) {
    logger.error(`updateAttendanceAdmin Error: ${error.stack}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate attendance record for this user and date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while updating attendance',
    });
  }
});
// Delete attendance (Admin/HR/Dept Manager only)
const deleteAttendance = asyncHandler(async (req, res) => {
  try {
    logger.info(`deleteAttendance: ID: ${req.params.id}`);
    // Authorization check
    const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin' || req.user.role?.toLowerCase() === 'superadmin';
    if (!isFullAccess && !req.isDepartmentAttendanceManager) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins, HR subadmins, or department managers can delete attendance records',
      });
    }
    const attendance = await Attendance.findById(req.params.id).populate('userId', 'department role');
    if (!attendance) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Attendance record not found',
      });
    }
    // Post-fetch checks
    const targetUser = attendance.userId;
    if (!allowedAttendanceRoles.includes(targetUser.role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_USER_ROLE',
        message: `Attendance records are only for roles: ${allowedAttendanceRoles.join(', ')}`,
      });
    }
    if (req.isDepartmentAttendanceManager && targetUser.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        errorCode: 'DEPARTMENT_MISMATCH',
        message: 'Not authorized for this attendance record',
      });
    }
    await Attendance.findByIdAndDelete(req.params.id);
    logger.info(`Deleted attendance ${req.params.id}`);
    res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully',
    });
  } catch (error) {
    logger.error(`deleteAttendance Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while deleting attendance',
    });
  }
});

// Real-Time Attendance: Request attendance (Fingerprint/Virtual Photo)
const requestAttendance = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = DateTime.now().setZone('UTC').startOf('day');

  // DEBUG LOGGING
  logger.info(`[requestAttendance] Received request from user ${req.user.email}`);
  logger.info(`[requestAttendance] Body keys: ${Object.keys(req.body).join(', ')}`);
  if (req.body.virtualVerificationImage) {
    logger.info(`[requestAttendance] virtualVerificationImage length: ${String(req.body.virtualVerificationImage).length}`);
  } else {
    logger.info(`[requestAttendance] virtualVerificationImage is MISSING or falsy`);
  }

  const { virtualVerificationImage, environment, faceEmbedding, location, deviceId } = req.body;

  // Check if already exists for today
  const existing = await Attendance.findOne({ userId, date: today.toJSDate() });
  if (existing) {
    return res.status(400).json({
      success: false,
      errorCode: 'DUPLICATE_RECORD',
      message: 'Attendance already recorded for today',
    });
  }

  // Detect if today is holiday
  const holiday = await Holiday.findOne({ date: today.toJSDate() });

  // ---------------------------------------------------------
  // FACIAL VERIFICATION LOGIC (Simulated/Basic Check)
  // ---------------------------------------------------------
  // If environment is virtual, verify 
  const isVirtual = environment === 'virtual' || req.user.attendanceVerificationMethod === 'Virtual';
  if (isVirtual) {
    if (!virtualVerificationImage) {
      return res.status(400).json({
        success: false,
        message: 'Virtual verification requires a photo capture.'
      });
    }

    // ADVANCED FACE VERIFICATION
    if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: 'FACE_DATA_MISSING',
        message: 'Face verification data is missing. Please ensure your face is clearly visible.'
      });
    }

    if (req.user.faceEmbedding && req.user.faceEmbedding.length > 0) {
      const similarity = cosineSimilarity(faceEmbedding, req.user.faceEmbedding);
      const THRESHOLD = 0.75; // As per requirement

      logger.info(`[Face Verification] Similarity score: ${similarity.toFixed(4)} for user ${req.user.email}`);

      if (similarity < THRESHOLD) {
        return res.status(401).json({
          success: false,
          errorCode: 'FACE_MISMATCH',
          message: 'Face verification failed. Captured face does not match your registered profile.',
          score: similarity
        });
      }
    } else {
      // If user has no embedding but we are in virtual mode, we allow the FIRST one to be the reference
      // or we just log it. For now, let's be safe and log it, but REQUIRE the embedding from frontend.
      logger.warn(`User ${req.user.email} has NO reference faceEmbedding in profile. Marking attendance but reference should be set.`);
    }
  }

  const newAttendance = new Attendance({
    userId,
    date: today.toJSDate(),
    checkIn: new Date(),
    status: 'present', // Directly marked as present
    monitoringStatus: 'active', // Monitoring starts immediately
    isApproved: true,
    approvedBy: userId, // Auto-approved
    environment: environment || 'virtual',
    virtualVerificationImage: virtualVerificationImage,
    faceEmbedding: faceEmbedding, // Store the vector used for verification
    location: location,
    deviceId: deviceId,
    isHolidayWork: !!holiday,
    holidayType: holiday ? holiday.type : undefined,
    lastActivityAt: new Date(),
    cursorMovements: [], // Required for virtual environment
    sleepDuration: 0,    // Required for virtual environment
    // Snapshots
    employeeName: req.user.name,
    employeeUniqueId: req.user.uniqueId,
    employeeRole: req.user.role,
    employeeService: req.user.service,
  });

  await newAttendance.save();

  // Broadcast approval immediately to start the user's tracking
  const io = req.app.get('io');
  if (io) {
    io.emit(`attendance_approved_${userId}`, {
      attendanceId: newAttendance._id,
      message: 'Attendance approved automatically'
    });

    // Notify HR Managers that monitoring has started
    io.emit('attendance_started', {
      attendanceId: newAttendance._id,
      userId: req.user.id,
      name: req.user.name,
      uniqueId: req.user.uniqueId,
      role: req.user.role,
      phone: req.user.phone,
      isHolidayWork: !!holiday,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Attendance verified and marked successfully.',
    data: newAttendance,
    user: {
      id: req.user._id,
      name: req.user.name,
      uniqueId: req.user.uniqueId,
      role: req.user.role,
      department: req.user.department,
      service: req.user.service,
      seniority: req.user.seniority,
      profileImage: req.user.profileImage // Return this if needed for UI comparison
    }
  });
});

// Real-Time Attendance: Approve attendance (HR clicks "Mark Present")
const approveAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attendance = await Attendance.findById(id);

  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Attendance request not found' });
  }

  attendance.status = 'present';
  attendance.monitoringStatus = 'active';
  attendance.isApproved = true;
  attendance.approvedBy = req.user.id;
  attendance.hrMarkedBy = req.user.id;
  attendance.lastActivityAt = new Date();

  // Calculate salary deduction (present means 0 deduction or bonus)
  const user = await User.findById(attendance.userId);
  const dailyRate = user?.dailySalaryRate || 50;
  attendance.salaryDeductionAmount = calculateSalary(
    'present',
    true,
    dailyRate,
    attendance.isHolidayWork,
    attendance.holidayType,
    0
  );

  await attendance.save();

  // Notify User via Socket.io
  const io = req.app.get('io');
  io.emit(`attendance_approved_${attendance.userId}`, {
    attendanceId: attendance._id,
    status: 'present',
  });

  res.status(200).json({
    success: true,
    message: 'Attendance approved and monitoring started',
    data: attendance,
  });
});

// Real-Time Attendance: Heartbeat update (Cursor movement)
const updateHeartbeat = asyncHandler(async (req, res) => {
  const { attendanceId } = req.body;
  const attendance = await Attendance.findOne({
    _id: attendanceId,
    userId: req.user.id,
    monitoringStatus: 'active'
  });

  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Active attendance session not found' });
  }

  attendance.lastActivityAt = new Date();
  attendance.cursorMovements.push(new Date());

  // Keep only last 100 movements to avoid massive doc
  if (attendance.cursorMovements.length > 100) {
    attendance.cursorMovements.shift();
  }

  await attendance.save();

  res.status(200).json({ success: true, message: 'Activity recorded' });
});

// Real-Time Attendance: Get Live monitoring list (HR only)
const getLiveMonitoring = asyncHandler(async (req, res) => {
  const activeAttendances = await Attendance.find({
    monitoringStatus: { $in: ['active', 'pending-approval'] },
    date: DateTime.now().setZone('UTC').startOf('day').toJSDate()
  })
    .populate('userId', 'name uniqueId role phone department service')
    .populate('hrMarkedBy', 'name')
    .sort({ monitoringStatus: 1, lastActivityAt: -1 });

  res.status(200).json({
    success: true,
    data: activeAttendances,
  });
});

// Background Task: Check for inactivity (Called from server.js)
const checkInactivity = async (io) => {
  try {
    const idleThreshold = 30 * 60 * 1000; // 30 minutes
    const now = new Date();
    const idleLimit = new Date(now.getTime() - idleThreshold);

    const idleAttendances = await Attendance.find({
      monitoringStatus: 'active',
      lastActivityAt: { $lt: idleLimit }
    });

    for (const attendance of idleAttendances) {
      attendance.monitoringStatus = 'failed';
      attendance.status = 'absent'; // Automatically marked as absent per requirement
      attendance.checkOut = new Date();


      // Recalculate salary (absent)
      const user = await User.findById(attendance.userId);
      const dailyRate = user?.dailySalaryRate || 50;
      attendance.salaryDeductionAmount = calculateSalary(
        'absent',
        attendance.isApproved,
        dailyRate,
        attendance.isHolidayWork,
        attendance.holidayType,
        0
      );

      await attendance.save();
      logger.info(`Attendance ${attendance._id} marked as absent due to inactivity`);

      // Notify User and HR
      io.emit(`attendance_failed_${attendance.userId}`, {
        message: 'Attendance failed due to inactivity'
      });
      io.emit('attendance_update', {
        attendanceId: attendance._id,
        status: 'absent',
        monitoringStatus: 'failed'
      });
    }
  } catch (error) {
    console.error('CheckInactivity Error:', error);
  }
};


// Get user notifications (read: false)
const getUserNotifications = asyncHandler(async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id, read: false })
      .sort({ createdAt: -1 })
      .limit(10);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    logger.error(`getUserNotifications Error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

module.exports = {
  createAttendance,
  selfCreateAttendance,
  getAttendances,
  getAttendanceById,
  selfUpdateAttendance,
  deleteAttendance,
  getAttendanceByUserId,
  getAttendanceForEdit,
  updateAttendanceAdmin,
  approveLeave,
  updateAttendanceStatus,
  getAttendanceSummary,
  exportAttendanceReport,
  getCalendar,
  rejectLeave,
  // New real-time functions
  requestAttendance,
  approveAttendance,
  updateHeartbeat,
  getLiveMonitoring,
  checkInactivity,
  getUserNotifications,
};

