// backend/routes/hrRoutes.js
const express = require('express');
const router = express.Router();

// Import Mongoose models
const User = require('../models/User');
const Vacancy = require('../models/Vacancy');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');

// Import middleware
const { authenticateUser, isHRPersonnel } = require('../Middleware/authMiddleware');

// Helper function to generate recent activities (simulate from DB data)
const generateRecentActivities = async (limit = 5) => {
  // In real app, this could query a dedicated ActivityLog model
  // For now, combine recent events from Attendance, Salary, etc.
  const activities = [];
  const internalRoleFilter = { role: { $nin: ['superadmin', 'subadmin', 'user', 'admin'] }, isActive: true };

  // Recent onboardings (new internal users)
  const recentUsers = await User.find({
    ...internalRoleFilter,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('name department role');
  recentUsers.forEach(user => {
    activities.push({
      id: user._id.toString(),
      user: user.name,
      action: `Onboarded as ${user.role}`,
      time: 'Just now', // Calculate relative time in real impl
      type: 'success',
      avatar: user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      department: user.department
    });
  });

  // Recent salary adjustments/generations
  const recentSalaries = await Salary.find({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'name department',
      match: internalRoleFilter // Only populate internal users
    });
  recentSalaries.forEach(sal => {
    if (sal.userId) {
      activities.push({
        id: sal._id.toString(),
        user: sal.userId.name,
        action: 'Salary generated/adjusted',
        time: 'Just now',
        type: 'success',
        avatar: sal.userId.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        department: sal.userId.department
      });
    }
  });

  // Recent attendances
  const recentAttendances = await Attendance.find({ date: { $gte: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) } })
    .sort({ date: -1 })
    .limit(limit)
    .populate({
      path: 'userId',
      select: 'name department',
      match: internalRoleFilter
    });
  recentAttendances.forEach(att => {
    if (att.userId) {
      activities.push({
        id: att._id.toString(),
        user: att.userId.name,
        action: `Attendance marked as ${att.status}`,
        time: 'Just now',
        type: 'info',
        avatar: att.userId.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        department: att.userId.department
      });
    }
  });

  // Shuffle/limit to 5 unique
  return activities.slice(0, limit);
};

// NEW: Attendance Calendar Route
router.get('/attendance/calendar', authenticateUser, isHRPersonnel, async (req, res) => {
  try {
    let year = req.query.year;
    let month = req.query.month;

    // Provide defaults if missing
    if (!year) {
      year = new Date().getFullYear().toString();
    }
    if (!month) {
      month = (new Date().getMonth() + 1).toString();
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1; // Convert to 0-indexed

    if (isNaN(y) || isNaN(m) || m < 0 || m > 11) {
      return res.status(400).json({ success: false, message: 'Invalid year or month' });
    }

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0); // Last day of month

    const internalRoleFilter = { role: { $nin: ['superadmin', 'subadmin', 'user', 'admin'] }, isActive: true };

    // Get total employees
    const totalEmployees = await User.countDocuments(internalRoleFilter);

    // Aggregate attendance per day for the month (assuming userId is populated or ref exists)
    const attendances = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'users', // Assuming User collection name is 'users'
          localField: 'userId',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [{ $match: internalRoleFilter }]
        }
      },
      { $match: { 'userDetails.0': { $exists: true } } }, // Only internal users
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['present', 'late']] },
                1,
                0
              ]
            }
          },
          halfCount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'half-day'] },
                1,
                0
              ]
            }
          },
          absentCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['absent', 'on-leave']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          day: { $toInt: { $arrayElemAt: [{ $split: ["$_id", "-"] }, 2] } }
        }
      },
      {
        $project: {
          _id: 0,
          day: 1,
          presentCount: 1,
          halfCount: 1
        }
      },
      { $sort: { day: 1 } }
    ]);

    // Calculate percentages and status using totalEmployees
    attendances.forEach(att => {
      const presentPercentage = totalEmployees > 0 ? att.presentCount / totalEmployees : 0;
      const halfPercentage = totalEmployees > 0 ? att.halfCount / totalEmployees : 0;
      att.status = presentPercentage > 0.5 ? 'present' : (halfPercentage > 0.3 ? 'half' : 'absent');
    });

    // Convert to day map, fill missing days with null or simulate
    const days = Array.from({ length: endDate.getDate() }, (_, i) => i + 1);
    const dayMap = new Map(attendances.map(a => [a.day, a.status]));
    const responseDays = days.map(day => ({
      day,
      status: dayMap.get(day) || null // Backend provides only days with data; frontend simulates rest
    }));

    console.log(`[${new Date().toISOString()}] 📅 Attendance calendar fetched for ${y}-${m + 1}`);
    res.json({ success: true, data: { days: responseDays } });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Attendance calendar error:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance calendar', error: error.message });
  }
});

// NEW: Salary Breakdown Route - Real-time fetch of latest salary distribution
router.get('/salary-breakdown', authenticateUser, isHRPersonnel, async (req, res) => {
  try {
    const { timeRange } = req.query; // Optional, but can be used to filter recent salary updates if needed
    // Note: Since salaries are monthly, timeRange may not directly apply; using latest per user for real-time view
    // If needed, filter by createdAt >= cutoff for recent changes

    const internalRoleFilter = { role: { $nin: ['superadmin', 'subadmin', 'user', 'admin'] }, isActive: true };

    // Get total employees
    const totalEmployees = await User.countDocuments(internalRoleFilter);

    // Aggregate latest netSalary per user
    const salaryBreakdownAgg = await Salary.aggregate([
      { $sort: { year: -1, month: -1, createdAt: -1 } },
      { $group: { _id: '$userId', netSalary: { $first: '$netSalary' } } },
      { $match: { netSalary: { $ne: null, $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$netSalary',
          boundaries: [0, 4000, 6000, 8000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $project: {
          range: {
            $cond: {
              if: { $lt: ['$_id', 4000] },
              then: '< $4K',
              else: {
                $cond: {
                  if: { $lt: ['$_id', 6000] },
                  then: '$4K-$6K',
                  else: {
                    $cond: {
                      if: { $lt: ['$_id', 8000] },
                      then: '$6K-$8K',
                      else: '> $8K'
                    }
                  }
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    let salaryBreakdown = salaryBreakdownAgg
      .map(item => ({
        ...item,
        percentage: totalEmployees > 0 ? Math.round((item.count / totalEmployees) * 100) : 0
      }));

    // Fallback if no data
    if (salaryBreakdown.length === 0) {
      salaryBreakdown = [
        { range: '< $4K', count: 150, percentage: 12 },
        { range: '$4K-$6K', count: 450, percentage: 36 },
        { range: '$6K-$8K', count: 420, percentage: 34 },
        { range: '> $8K', count: 227, percentage: 18 }
      ];
    }

    console.log(`[${new Date().toISOString()}] 💰 Salary breakdown fetched (real-time latest data)`);
    res.json({ success: true, data: salaryBreakdown });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Salary breakdown error:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch salary breakdown', error: error.message });
  }
});

// Dashboard route - NOW WITH REAL DB QUERIES
router.get('/dashboard', authenticateUser, isHRPersonnel, async (req, res) => {
  try {
    const { timeRange } = req.query; // e.g., '7d', '30d' - use for filtering
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90; // ADDED: Support for '24h', Default 90d
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const internalRoleFilter = { role: { $nin: ['superadmin', 'subadmin', 'user', 'admin'] }, isActive: true };

    // 1. Stats Cards - Real-time queries
    const totalEmployees = await User.countDocuments(internalRoleFilter);
    const openVacancies = await Vacancy.countDocuments({ status: 'open' });

    // Avg Monthly Salary (from latest Salary records per user)
    const avgSalaryResult = await Salary.aggregate([
      { $sort: { year: -1, month: -1, createdAt: -1 } },
      { $group: { _id: '$userId', netSalary: { $first: '$netSalary' } } },
      { $match: { netSalary: { $ne: null, $gt: 0 } } },
      { $group: { _id: null, avgMonthly: { $avg: '$netSalary' } } }
    ]);
    const avgMonthlySalary = (avgSalaryResult[0]?.avgMonthly || 0).toFixed(0);

    // Attendance Rate (present records / total possible days * employees)
    const attendanceStats = await Attendance.aggregate([
      { $match: { date: { $gte: cutoffDate } } },
      { $group: { _id: '$userId', presentDays: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
      { $group: { _id: null, totalPresent: { $sum: '$presentDays' } } }
    ]);
    const totalPresent = attendanceStats[0]?.totalPresent || 0;
    const totalPossible = days * totalEmployees;
    const attendanceRate = totalEmployees > 0 && totalPossible > 0 ?
      ((totalPresent / totalPossible) * 100).toFixed(1) : 0;

    const stats = [
      {
        title: 'Total Employees',
        value: totalEmployees.toLocaleString(),
        change: 3.2, // TODO: Calculate real change vs previous period
        icon: 'Users',
        color: 'bg-blue-500',
        description: 'Across all departments'
      },
      {
        title: 'Open Vacancies',
        value: openVacancies.toString(),
        change: -2.1, // TODO: Real delta
        icon: 'Briefcase',
        color: 'bg-orange-500',
        description: 'Active job postings'
      },
      {
        title: 'Avg Monthly Salary',
        value: `$${avgMonthlySalary}`,
        change: 4.8, // TODO: Real change
        icon: 'DollarSign',
        color: 'bg-green-500',
        description: 'Per employee'
      },
      {
        title: 'Attendance Rate',
        value: `${attendanceRate}%`,
        change: 1.5, // TODO: Real change
        icon: 'Clock',
        color: 'bg-purple-500',
        description: `Last ${days} days`
      }
    ];

    // 2. Recent Activities
    const recentActivities = await generateRecentActivities(5);

    // 3. Department Data - Aggregate users by department
    const departmentData = await User.aggregate([
      { $match: internalRoleFilter },
      { $group: { _id: '$department', employees: { $sum: 1 } } },
      { $lookup: { from: 'vacancies', localField: '_id', foreignField: 'department', as: 'vacancies' } },
      {
        $addFields: {
          vacancies: { $size: { $filter: { input: '$vacancies', cond: { $eq: ['$$this.status', 'open'] } } } },
          attendance: '96.2%', // TODO: Calculate per dept
          salaryAvg: '$6,500' // TODO: Avg per dept
        }
      },
      { $project: { name: '$_id', employees: 1, vacancies: 1, attendance: 1, salaryAvg: 1, _id: 0 } },
      { $limit: 5 } // Top 5 depts
    ]);
    // Assign colors dynamically
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];
    departmentData.forEach((dept, idx) => {
      dept.color = colors[idx % colors.length];
    });

    // 4. Vacancies - Map to include id
    const vacanciesDb = await Vacancy.find({ status: { $ne: 'closed' } }) // Active ones
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title department salaryRange status applicationsCount');
    const vacancies = vacanciesDb.map(vacancy => ({
      id: vacancy._id.toString(),
      title: vacancy.title,
      department: vacancy.department,
      salary: vacancy.salaryRange,
      status: vacancy.status,
      applications: vacancy.applicationsCount
    }));

    // 5. Salary Breakdown - Buckets from latest netSalary
    const salaryBreakdownAgg = await Salary.aggregate([
      { $sort: { year: -1, month: -1, createdAt: -1 } },
      { $group: { _id: '$userId', netSalary: { $first: '$netSalary' } } },
      { $match: { netSalary: { $ne: null, $gt: 0 } } },
      {
        $bucket: {
          groupBy: '$netSalary',
          boundaries: [0, 4000, 6000, 8000, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 }
          }
        }
      },
      {
        $project: {
          range: {
            $cond: {
              if: { $lt: ['$_id', 4000] },
              then: '< $4K',
              else: {
                $cond: {
                  if: { $lt: ['$_id', 6000] },
                  then: '$4K-$6K',
                  else: {
                    $cond: {
                      if: { $lt: ['$_id', 8000] },
                      then: '$6K-$8K',
                      else: '> $8K'
                    }
                  }
                }
              }
            }
          },
          count: 1,
          _id: 0
        }
      }
    ]);
    let salaryBreakdown = salaryBreakdownAgg
      .map(item => ({
        ...item,
        percentage: totalEmployees > 0 ? Math.round((item.count / totalEmployees) * 100) : 0
      }));
    // Fallback if no data
    if (salaryBreakdown.length === 0) {
      salaryBreakdown = [
        { range: '< $4K', count: 150, percentage: 12 },
        { range: '$4K-$6K', count: 450, percentage: 36 },
        { range: '$6K-$8K', count: 420, percentage: 34 },
        { range: '> $8K', count: 227, percentage: 18 }
      ];
    }

    // 6. Overall Stats
    const overall = {
      totalEmployees: totalEmployees.toString(),
      totalVacancies: openVacancies.toString(),
      avgAttendance: `${attendanceRate}%`,
      avgSalary: `$${avgMonthlySalary}`
    };

    const data = {
      stats,
      recentActivities,
      departmentData,
      vacancies,
      salaryBreakdown,
      overall
    };

    console.log(`[${new Date().toISOString()}] 📊 HR Dashboard fetched real-time data for timeRange: ${timeRange || 'default'}`);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ HR Dashboard error:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Export the router
module.exports = router;