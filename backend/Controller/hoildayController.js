// Holiday Controller
const asyncHandler = require('express-async-handler');
const Holiday = require('../models/Holiday');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { DateTime } = require('luxon');
const winston = require('winston');

// Configure Winston logger (reuse from attendance if possible)
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
  ],
});

// Create a new holiday (Admin or HR Subadmin only)
const createHoliday = asyncHandler(async (req, res) => {
  try {
    logger.info(`Creating holiday: Request body: ${JSON.stringify(req.body, null, 2)}`);

    if (!req.user) {
      logger.error('User not authenticated');
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const role = req.user.role?.toLowerCase();
    const isFullAccess = req.isFullAttendanceAccess || role === 'admin' || role === 'superadmin';
    if (!isFullAccess) {
      logger.error(`Unauthorized access by ${req.user.email || 'unknown'}: Role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins or HR subadmins can create holidays',
      });
    }

    const { date, name, type } = req.body;

    if (!date || !name || !type) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_FIELDS',
        message: 'Date, name, and type are required',
      });
    }

    if (!['government', 'regular'].includes(type)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_TYPE',
        message: 'Type must be "government" or "regular"',
      });
    }

    const holidayDate = DateTime.fromISO(date, { zone: 'UTC' }).startOf('day').toJSDate();

    const existingHoliday = await Holiday.findOne({
      date: holidayDate,
    }).lean();
    if (existingHoliday) {
      logger.info(`Holiday already exists for date ${date}`);
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Holiday record already exists for this date',
      });
    }

    const newHoliday = new Holiday({
      date: holidayDate,
      name: String(name).trim(),
      type,
    });

    await newHoliday.save();
    logger.info(`Created holiday ${newHoliday._id} for date ${date}`);

    // Create notifications for all active users
    const users = await User.find({ isActive: true }).select('_id');
    if (users.length > 0) {
      const notifications = users.map(user => ({
        recipientId: user._id,
        senderId: req.user._id,
        type: 'holiday_alert',
        title: 'New Holiday Announced',
        message: `Holiday announced: ${name} on ${new Date(date).toLocaleDateString()}`,
        read: false,
        priority: 'medium',
        metadata: {
          holidayId: newHoliday._id,
          holidayDate: newHoliday.date
        }
      }));
      await Notification.insertMany(notifications);
      logger.info(`Created holiday notifications for ${users.length} users`);
    }

    res.status(201).json({
      success: true,
      message: 'Holiday record created successfully',
      data: newHoliday,
    });
  } catch (error) {
    logger.error(`createHoliday Error: ${error.message}, Stack: ${error.stack}`);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errorCode: 'DUPLICATE_RECORD',
        message: 'Duplicate holiday record for this date',
      });
    }
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: `Server error while creating holiday: ${error.message}`,
    });
  }
});

// Get all holidays (Admin or HR Subadmin only)
const getHolidays = asyncHandler(async (req, res) => {
  try {
    logger.info(`getHolidays: Query params: ${JSON.stringify(req.query)}`);

    if (!req.user) {
      logger.error('User not authenticated');
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    // Allow all authenticated users to view holidays for announcements
    // const isFullAccess = req.isFullAttendanceAccess || req.user.role?.toLowerCase() === 'admin';
    // if (!isFullAccess) {
    //   logger.error(`Unauthorized access by ${req.user.email || 'unknown'}: Role ${req.user.role}`);
    //   return res.status(403).json({
    //     success: false,
    //     errorCode: 'UNAUTHORIZED',
    //     message: 'Only admins or HR subadmins can view holidays',
    //   });
    // }

    const { startDate, endDate, type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = DateTime.fromISO(startDate, { zone: 'UTC' });
        if (!start.isValid) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_DATE',
            message: 'Invalid start date format',
          });
        }
        query.date.$gte = start.startOf('day').toJSDate();
      }
      if (endDate) {
        const end = DateTime.fromISO(endDate, { zone: 'UTC' });
        if (!end.isValid) {
          return res.status(400).json({
            success: false,
            errorCode: 'INVALID_DATE',
            message: 'Invalid end date format',
          });
        }
        query.date.$lte = end.startOf('day').toJSDate();
      }
    }
    if (type && !['government', 'regular'].includes(type)) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_TYPE',
        message: 'Type must be "government" or "regular"',
      });
    }
    if (type) query.type = type;

    const holidays = await Holiday.find(query)
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Holiday.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Holidays retrieved successfully',
      data: holidays,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    logger.error(`getHolidays Error: ${error.message}, Stack: ${error.stack}`);
    if (error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        errorCode: 'DATABASE_ERROR',
        message: 'Database error while fetching holidays',
      });
    }
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching holidays',
    });
  }
});

// Get single holiday by ID (Admin or HR Subadmin only)
const getHolidayById = asyncHandler(async (req, res) => {
  try {
    logger.info(`getHolidayById: ID: ${req.params.id}`);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const role = req.user.role?.toLowerCase();
    const isFullAccess = req.isFullAttendanceAccess || role === 'admin' || role === 'superadmin';
    if (!isFullAccess) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins or HR subadmins can view holiday details',
      });
    }

    const holiday = await Holiday.findById(req.params.id).lean();

    if (!holiday) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Holiday record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Holiday retrieved successfully',
      data: holiday,
    });
  } catch (error) {
    logger.error(`getHolidayById Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while fetching holiday',
    });
  }
});

// Update holiday (Admin or HR Subadmin only)
const updateHoliday = asyncHandler(async (req, res) => {
  try {
    logger.info(`updateHoliday: ID: ${req.params.id}, Body: ${JSON.stringify(req.body, null, 2)}`);

    if (!req.user) {
      logger.error('User not authenticated');
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const role = req.user.role?.toLowerCase();
    const isFullAccess = req.isFullAttendanceAccess || role === 'admin' || role === 'superadmin';
    if (!isFullAccess) {
      logger.error(`Unauthorized access by ${req.user.email || 'unknown'}: Role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins or HR subadmins can update holidays',
      });
    }

    const { date, name, type } = req.body;

    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Holiday record not found',
      });
    }

    if (date) {
      const newDate = DateTime.fromISO(date, { zone: 'UTC' }).startOf('day').toJSDate();
      const existingHoliday = await Holiday.findOne({
        date: newDate,
        _id: { $ne: holiday._id },  // Exclude current record
      }).lean();
      if (existingHoliday) {
        return res.status(400).json({
          success: false,
          errorCode: 'DUPLICATE_DATE',
          message: 'Another holiday already exists for this date',
        });
      }
      holiday.date = newDate;
    }

    if (name !== undefined) {
      holiday.name = String(name).trim();
    }

    if (type !== undefined) {
      if (!['government', 'regular'].includes(type)) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_TYPE',
          message: 'Type must be "government" or "regular"',
        });
      }
      holiday.type = type;
    }

    await holiday.save();
    logger.info(`Updated holiday ${holiday._id}`);

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday,
    });
  } catch (error) {
    logger.error(`updateHoliday Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while updating holiday',
    });
  }
});

// Delete holiday (Admin or HR Subadmin only)
const deleteHoliday = asyncHandler(async (req, res) => {
  try {
    logger.info(`deleteHoliday: ID: ${req.params.id}`);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const role = req.user.role?.toLowerCase();
    const isFullAccess = req.isFullAttendanceAccess || role === 'admin' || role === 'superadmin';
    if (!isFullAccess) {
      return res.status(403).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Only admins or HR subadmins can delete holidays',
      });
    }

    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Holiday record not found',
      });
    }

    logger.info(`Deleted holiday ${req.params.id}`);

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    logger.error(`deleteHoliday Error: ${error.stack}`);
    res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'Server error while deleting holiday',
    });
  }
});

module.exports = {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
};