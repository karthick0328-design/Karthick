// Salary Controller (updated: Removed Position references; Added department/role-based salary rates managed by HR subadmins)
// NEW: Added support for manual holidayIncrements override in create/update

const asyncHandler = require('express-async-handler');
const Salary = require('../models/Salary');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const DepartmentRate = require('../models/DepartmentRate'); // New model for department/role salary rates
const Holiday = require('../models/Holiday');

// Helper to calculate monthly base salary
const calculateBaseSalary = (monthlyRate, workingDays = 22) => monthlyRate;

// Helper to calculate working days in a month
const getWorkingDaysInMonth = async (year, month) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const holidays = await Holiday.find({
    date: { $gte: startDate, $lte: endDate },
  }).select('date');

  let workingDays = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = holidays.some(h => h.date.toDateString() === d.toDateString());
    if (!isWeekend && !isHoliday) workingDays++;
  }
  return workingDays;
};

// Helper to aggregate attendance deductions and increments
const aggregateAttendanceDeductionsAndIncrements = async (userId, year, month, dailyRate) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendances = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).select('status isApproved salaryDeductionAmount workedOnHoliday holidayType');

  let deductions = 0;
  let increments = 0;
  for (const att of attendances) {
    const amount = att.salaryDeductionAmount;
    if (amount > 0) deductions += amount;
    else if (amount < 0) increments += Math.abs(amount);
  }

  return { deductions, increments };
};

// Helper to get monthly rate based on department, service (optional), and role
// Helper to get monthly rate based on department, service (optional), and role
const getMonthlyRateByDepartmentAndRole = async (department, service, role) => {
  const allowedRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
  if (!role || typeof role !== 'string' || !allowedRoles.includes(role.toLowerCase())) {
    return 1100; // Default for non-eligible or missing roles
  }

  const deptLower = department ? department.trim() : null;
  const serviceLower = service ? service.trim() : null;
  const roleLower = role.toLowerCase();

  try {
    // 1. Try finding specific rate for department + service + role
    if (deptLower && serviceLower) {
      const specificRate = await DepartmentRate.findOne({
        department: deptLower,
        service: serviceLower,
        role: roleLower
      }).select('monthlyRate');
      if (specificRate) return specificRate.monthlyRate;
    }

    // 2. Fallback to Global Service Rate (department is null, but service is specific)
    if (serviceLower) {
      const globalServiceRate = await DepartmentRate.findOne({
        $or: [{ department: null }, { department: '' }],
        service: serviceLower,
        role: roleLower
      }).select('monthlyRate');
      if (globalServiceRate) return globalServiceRate.monthlyRate;
    }

    // 3. Fallback to generic department + role rate (service is null)
    if (deptLower) {
      const deptRate = await DepartmentRate.findOne({
        department: deptLower,
        $or: [{ service: null }, { service: '' }], // Check for null or empty string
        role: roleLower
      }).select('monthlyRate');
      if (deptRate) return deptRate.monthlyRate;
    }

    // 4. Fallback to global role rate (department is null)
    const globalRate = await DepartmentRate.findOne({
      $or: [{ department: null }, { department: '' }],
      $or: [{ service: null }, { service: '' }],
      role: roleLower
    }).select('monthlyRate');

    return globalRate ? globalRate.monthlyRate : 1100; // Final fallback if no rate defined
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching rate for ${department}/${service}/${role}:`, error.message);
    return 1100;
  }
};

// Create/Update department salary rate (Admin, HR subadmin, or Financial Manager)
const createOrUpdateDepartmentRate = asyncHandler(async (req, res) => {
  // Access Control: Admin, HR Subadmin, OR Financial Manager
  const isAdminUser = req.isAdminUser || req.user?.role?.toLowerCase() === 'superadmin' || false;
  const isHRSubadmin = req.isHRSubadmin || false;
  const isFinancialManager = req.user && req.user.role === 'manager' && (req.user.department === 'Financial' || req.user.department === 'Finance');

  if (!isAdminUser && !isHRSubadmin && !isFinancialManager) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin, HR subadmins, or Financial Managers can manage salary rates.' });
  }

  const { department, service, role, monthlyRate } = req.body;

  if (!role || monthlyRate === undefined) {
    return res.status(400).json({ success: false, message: 'Role and monthlyRate are required' });
  }

  if (monthlyRate < 0) {
    return res.status(400).json({ success: false, message: 'Monthly rate must be non-negative' });
  }

  const allowedRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
  if (!allowedRoles.includes(String(role).toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Role must be one of: head, manager, team manager, tl, employee' });
  }

  try {
    // Construct filter based on provided fields
    const filter = {
      role: String(role).toLowerCase()
    };

    if (department && typeof department === 'string') {
      filter.department = department.trim();
    } else {
      filter.$or = [{ department: null }, { department: '' }];
    }

    // Include service in filter if provided, otherwise explicitly look for no service
    if (service && typeof service === 'string' && service.trim()) {
      filter.service = service.trim();
    } else {
      // Use $and only if we already have an $or for department to avoid conflict, or just merge properly.
      // Easiest is to handle 'service' part separately. The query object structure:
      // If we already have $or for department, we must be careful adding another $or at top level for service.
      // But actually, we can have multiple fields.
      // Wait, Mongoose/MongoDB query object top level keys are ANDed.
      // But we can't have duplicate keys ($or).
      // So if department is missing, we used $or. If service is missing we need another condition.
      // Better to check 'service' logic:
      const serviceCondition = { $or: [{ service: null }, { service: '' }] };
      if (filter.$or) {
        // We have a department $or. We need to AND it with service condition.
        // { $and: [ { $or: ...dept... }, { $or: ...service... } ] }
        // OR simply:
        delete filter.$or;
        filter.$and = [
          { $or: [{ department: null }, { department: '' }] },
          serviceCondition
        ];
      } else {
        // No department $or (meaning department is specific), so filter.department is set.
        // We can just add the service condition:
        // But wait, we can't add $or if we want to be safe, filtering by null/empty is standard.
        // Actually, let's just use $and for everything to be clean if complex.
        // Or cleaner: normalize data before query.
        // But we are querying existing data which might be mixed null/empty? Default is null now.
        // Ideally we standardise to null on save, but query must be robust.

        // Re-thinking filter construction for clarity:
        filter.$and = [];
        if (department && department.trim()) {
          filter.department = department.trim();
        } else {
          filter.$and.push({ $or: [{ department: null }, { department: '' }] });
        }

        // This is safe but "filter.department" combined with "$and" works? Yes.
        // But let's build a clean object.
        const safeRole = typeof role === 'string' ? role.toLowerCase() : '';
        const newFilter = { role: safeRole };
        if (department && typeof department === 'string' && department.trim()) newFilter.department = department.trim();
        else newFilter.$or = [{ department: null }, { department: '' }]; // This uses header $or

        // Wait, if I use $or for service too, I overwrite $or for department.
        // So I must use $and if both are optional/missing.
      }
    }

    // Let's simplify:
    const safeRoleForQuery = typeof role === 'string' ? role.toLowerCase() : '';
    const query = { role: safeRoleForQuery };
    if (department && department.trim()) {
      query.department = department.trim();
    } else {
      query.$or = [{ department: null }, { department: '' }];
    }

    // For service
    if (service && typeof service === 'string' && service.trim()) {
      query.service = service.trim();
    } else {
      // If we already have $or (from department being empty), we need to be careful.
      if (query.$or) {
        // We have an existing $or for department.
        // Move it to $and
        const deptCondition = { $or: query.$or };
        delete query.$or;
        const serviceCondition = { $or: [{ service: null }, { service: '' }] };
        query.$and = [deptCondition, serviceCondition];
      } else {
        // No existing $or, so department is specific. We can add $or for service.
        query.$or = [{ service: null }, { service: '' }];
      }
    }

    // Check existence
    let rate = await DepartmentRate.findOne(query);

    if (rate) {
      rate.monthlyRate = monthlyRate;
      rate.updatedBy = req.user.id;
      // Ensure specific fields are set correctly (though they matched query)
      // If we are updating, we just update the rate and updatedBy.
      await rate.save();
    } else {
      rate = await DepartmentRate.create({
        department: (department && typeof department === 'string') ? department.trim() : null,
        service: (service && typeof service === 'string') ? service.trim() : null,
        role: typeof role === 'string' ? role.toLowerCase() : '',
        monthlyRate,
        updatedBy: req.user.id
      });
    }

    console.log(`[${new Date().toISOString()}] User ${req.user.id} created/updated rate: ${department || 'Global'}/${service || 'All'}/${role} = ${monthlyRate}`);

    return res.status(200).json({
      success: true,
      message: 'Rate created/updated successfully',
      data: rate,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error managing department rate:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error while managing department rate' });
  }
});

// Get all department rates (Admin, HR subadmin, or Financial Manager)
const getDepartmentRates = asyncHandler(async (req, res) => {
  const isAdminUser = req.isAdminUser || req.user?.role?.toLowerCase() === 'superadmin' || false;
  const isHRSubadmin = req.isHRSubadmin || false;
  const isFinancialPersonnel = req.user && (req.user.role === 'manager' || req.user.role === 'employee') &&
    ((req.user.department || '').toLowerCase().includes('finance') || (req.user.department || '').toLowerCase().includes('financial') || (req.user.financeAccess || []).includes('salary'));

  if (!isAdminUser && !isHRSubadmin && !isFinancialPersonnel) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin, HR subadmins, or Authorized Financial Personnel can view department rates.' });
  }

  const { department, service, role, page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * parseInt(limit);

  const query = {};
  if (department && typeof department === 'string') query.department = department.trim();
  if (service && typeof service === 'string') query.service = service.trim();
  if (role && typeof role === 'string') query.role = role.toLowerCase();

  try {
    // Sort by department (nulls first usually), then service, then role
    const rates = await DepartmentRate.find(query)
      .populate('updatedBy', 'name')
      .sort({ department: 1, service: 1, role: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await DepartmentRate.countDocuments(query);

    console.log(`[${new Date().toISOString()}] User ${req.user.id} fetched ${rates.length} department rates`);

    return res.status(200).json({
      success: true,
      message: 'Department rates retrieved successfully',
      data: rates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching department rates:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error while fetching department rates' });
  }
});

// Delete department rate (Admin, HR subadmin, or Financial Manager)
const deleteDepartmentRate = asyncHandler(async (req, res) => {
  const isAdminUser = req.isAdminUser || req.user?.role?.toLowerCase() === 'superadmin' || false;
  const isHRSubadmin = req.isHRSubadmin || false;
  const isFinancialManager = req.user && req.user.role === 'manager' && (req.user.department === 'Financial' || req.user.department === 'Finance');

  if (!isAdminUser && !isHRSubadmin && !isFinancialManager) {
    return res.status(403).json({ success: false, message: 'Access denied. Only Admin, HR subadmins, or Financial Managers can delete department rates.' });
  }

  const { id } = req.params;

  try {
    const rate = await DepartmentRate.findByIdAndDelete(id);
    if (!rate) {
      return res.status(404).json({ success: false, message: 'Department rate not found' });
    }

    console.log(`[${new Date().toISOString()}] User ${req.user.id} deleted department rate: ${rate.department}/${rate.service || ''}/${rate.role}`);

    return res.status(200).json({
      success: true,
      message: 'Department rate deleted successfully',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting department rate:`, error.message);
    return res.status(500).json({ success: false, message: 'Server error while deleting department rate' });
  }
});

// Create/Generate a new salary record (updated: Uses department/role rates; no Position; supports manual holidayIncrements)
const createSalary = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    console.log(`[${new Date().toISOString()}] ${isHRSubadmin ? 'HR Subadmin' : 'Admin'} ${req.user.id} attempting to create salary for uniqueId: ${req.body.uniqueId}, month: ${req.body.month}, year: ${req.body.year}`);

    const { uniqueId, month, year, workingDays, notes, totalAllowances = 0, tds = 0, professionalTax = 0, epf = 0, esi = 0, holidayIncrements: manualHolidayIncrements = 0 } = req.body;

    if (!uniqueId || !month || !year) {
      console.error(`[${new Date().toISOString()}] Missing required fields: uniqueId=${uniqueId}, month=${month}, year=${year}`);
      return res.status(400).json({ success: false, message: 'Unique ID, month, and year are required' });
    }

    if (month < 1 || month > 12 || year < 2020) {
      console.error(`[${new Date().toISOString()}] Invalid month/year: month=${month}, year=${year}`);
      return res.status(400).json({ success: false, message: 'Invalid month (1-12) or year (>=2020)' });
    }

    if (totalAllowances < 0 || tds < 0 || professionalTax < 0 || epf < 0 || esi < 0 || manualHolidayIncrements < 0) {
      return res.status(400).json({ success: false, message: 'Allowances, increments, and deductions must be non-negative' });
    }

    const user = await User.findOne({ uniqueId }).select('department service role monthlySalaryRate'); // Removed position populate
    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found with provided unique ID' });
    }

    const userId = user._id;
    // Determine monthly rate based on department and role (overrides user.monthlySalaryRate if department rate exists)
    let monthlyRate = await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
    if (monthlyRate === 1100 && user.monthlySalaryRate) {
      monthlyRate = user.monthlySalaryRate; // Fallback to user-specific if no department rate
    }

    const actualWorkingDays = workingDays || (await getWorkingDaysInMonth(year, month));
    const dailyRate = monthlyRate / actualWorkingDays;

    let deductions = 0;
    let increments = manualHolidayIncrements; // Use manual if provided
    if (increments === 0) {
      // Else aggregate from attendance
      const { deductions: attDeductions, increments: autoIncrements } = await aggregateAttendanceDeductionsAndIncrements(userId, year, month, dailyRate);
      deductions = attDeductions;
      increments = autoIncrements;
    } else {
      // If manual, still aggregate deductions
      const { deductions: attDeductions } = await aggregateAttendanceDeductionsAndIncrements(userId, year, month, dailyRate);
      deductions = attDeductions;
    }

    const existingSalary = await Salary.findOne({ userId, month, year });
    const basicSalary = calculateBaseSalary(monthlyRate, actualWorkingDays);
    const grossSalary = basicSalary + totalAllowances + increments;
    const otherDeductions = tds + professionalTax + epf + esi;
    const totalDeductions = deductions + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    if (existingSalary) {
      console.log(`[${new Date().toISOString()}] Salary exists for user ${uniqueId}, month ${month}, year ${year}; updating...`);

      existingSalary.basicSalary = basicSalary;
      existingSalary.totalAllowances = totalAllowances;
      existingSalary.grossSalary = grossSalary;
      existingSalary.attendanceDeductions = deductions;
      existingSalary.holidayIncrements = increments;
      existingSalary.tds = tds;
      existingSalary.professionalTax = professionalTax;
      existingSalary.epf = epf;
      existingSalary.esi = esi;
      existingSalary.otherDeductions = otherDeductions;
      existingSalary.totalDeductions = totalDeductions;
      existingSalary.netSalary = netSalary;
      existingSalary.workingDays = actualWorkingDays;
      existingSalary.notes = notes || '';
      existingSalary.isGenerated = true;

      await existingSalary.save();
      await existingSalary.populate('userId', 'name email uniqueId department role monthlySalaryRate');

      return res.status(200).json({
        success: true,
        message: 'Salary record updated successfully',
        data: existingSalary,
      });
    }

    const salary = await Salary.create({
      userId,
      month,
      year,
      basicSalary,
      totalAllowances,
      grossSalary,
      attendanceDeductions: deductions,
      holidayIncrements: increments,
      tds,
      professionalTax,
      epf,
      esi,
      otherDeductions,
      totalDeductions,
      netSalary,
      workingDays: actualWorkingDays,
      notes: notes || '',
      isGenerated: true,
    });

    console.log(`[${new Date().toISOString()}] Salary created successfully: ${salary._id} for user ${uniqueId} (${month}/${year}) with monthlyRate: ${monthlyRate}, gross: ${grossSalary}, net: ${netSalary}, manualIncrements: ${manualHolidayIncrements}`);

    await salary.populate('userId', 'name email uniqueId department service role monthlySalaryRate');

    return res.status(201).json({
      success: true,
      message: 'Salary record generated successfully',
      data: salary,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error creating salary:`, error.message, error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate salary record for this user and month/year' });
    }
    return res.status(500).json({ success: false, message: `Server error while creating salary: ${error.message}` });
  }
});

// Get all salaries (Admin or HR subadmin; department-wise filtering possible via query)
const getSalaries = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    console.log(`[${new Date().toISOString()}] Fetching salaries for ${isHRSubadmin ? 'HR Subadmin' : 'Admin'}: ${req.user.id}, query:`, JSON.stringify(req.query, null, 2));

    const { uniqueId, department, year, month, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * parseInt(limit);

    const query = {};
    if (uniqueId && typeof uniqueId === 'string') {
      const user = await User.findOne({ uniqueId });
      if (!user) {
        console.error(`[${new Date().toISOString()}] User not found: ${uniqueId}`);
        return res.status(404).json({ success: false, message: 'User not found with provided unique ID' });
      }
      query.userId = user._id;
    }
    if (department && typeof department === 'string') {
      const usersInDept = await User.find({ department }).select('_id');
      if (usersInDept.length === 0) {
        return res.status(200).json({ success: true, data: [], pagination: { current: parseInt(page), pages: 0, total: 0 } });
      }
      query.userId = { $in: usersInDept.map(u => u._id) };
    }
    if (year) query.year = parseInt(String(year));
    if (month) query.month = parseInt(String(month));

    console.log(`[${new Date().toISOString()}] MongoDB query:`, JSON.stringify(query, null, 2));

    const salaries = await Salary.find(query)
      .populate('userId', 'name email uniqueId department service role monthlySalaryRate') // Removed position; added department/role
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // For HR subadmin without specific filters, limit to allowed roles
    let filteredSalaries = salaries;
    if (isHRSubadmin && (!uniqueId && !department)) {
      const allowedTargetRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
      filteredSalaries = salaries.filter(salary => allowedTargetRoles.includes(salary.userId.role.toLowerCase()));
      console.log(`[${new Date().toISOString()}] Filtered ${filteredSalaries.length} salaries for HR subadmin (allowed roles only)`);
    }

    // FIXED: Await rates in parallel for each salary (async map)
    const salariesWithRates = await Promise.all(
      filteredSalaries.map(async (salary) => {
        const user = salary.userId;
        // Always try to fetch rate (handles optional department/service internally)
        const rate = await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
        user.assignedRate = rate !== 1100 ? rate : (user.monthlySalaryRate || 1100);
        return salary;
      })
    );

    const total = await Salary.countDocuments(query);

    console.log(`[${new Date().toISOString()}] Retrieved ${salariesWithRates.length} salaries`);

    return res.status(200).json({
      success: true,
      message: 'Salaries retrieved successfully',
      data: salariesWithRates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching salaries:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while fetching salaries: ${error.message}` });
  }
});

// Get single salary by ID (Admin or HR subadmin; validate target role for HR)
const getSalaryById = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    console.log(`[${new Date().toISOString()}] Fetching salary by ID for ${isHRSubadmin ? 'HR Subadmin' : 'Admin'}: ${req.user.id}, ID: ${req.params.id}`);

    const salary = await Salary.findById(req.params.id)
      .populate('userId', 'name email uniqueId department service role monthlySalaryRate') // Removed position; added department/role
      .lean();

    if (!salary) {
      console.error(`[${new Date().toISOString()}] Salary not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    // For HR, validate target role
    if (isHRSubadmin) {
      const targetRole = salary.userId.role.toLowerCase();
      const allowedTargetRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
      if (!allowedTargetRoles.includes(targetRole)) {
        console.error(`[${new Date().toISOString()}] Access denied: HR subadmin cannot view salary for role ${targetRole}`);
        return res.status(403).json({ success: false, message: 'HR subadmins can only manage salaries for Head, Manager, Team Manager, TL, or Employee roles.' });
      }
    }

    const user = salary.userId;
    // Set monthlySalaryRate from department/role (including global)
    const rate = await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
    if (rate !== 1100) {
      user.monthlySalaryRate = rate;
    } else {
      user.monthlySalaryRate = user.monthlySalaryRate || 1100;
    }

    return res.status(200).json({
      success: true,
      message: 'Salary retrieved successfully',
      data: salary,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching salary:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while fetching salary: ${error.message}` });
  }
});

// Get user details with salary and attendance (updated: Removed Position; uses department/role rates)
const getUserSalaryAndAttendance = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    const { uniqueId } = req.params;
    const { month, year } = req.query;
    console.log(`[${new Date().toISOString()}] Fetching user salary and attendance details for ${isHRSubadmin ? 'HR Subadmin' : 'Admin'}: ${req.user.id}, uniqueId: ${uniqueId}, month: ${month}, year: ${year}`);

    if (!uniqueId) {
      return res.status(400).json({ success: false, message: 'Unique ID is required' });
    }

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ success: false, message: 'Invalid month (1-12)' });
    }

    if (year && year < 2020) {
      return res.status(400).json({ success: false, message: 'Invalid year (>=2020)' });
    }

    const user = await User.findOne({ uniqueId })
      .select('uniqueId name email department service isActive monthlySalaryRate role'); // Removed position

    if (!user) {
      console.error(`[${new Date().toISOString()}] User not found: ${uniqueId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // For HR, validate target role
    if (isHRSubadmin) {
      const targetRole = user.role.toLowerCase();
      const allowedTargetRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
      if (!allowedTargetRoles.includes(targetRole)) {
        console.error(`[${new Date().toISOString()}] Access denied: HR subadmin cannot view details for role ${targetRole}`);
        return res.status(403).json({ success: false, message: 'HR subadmins can only manage salaries for Head, Manager, Team Manager, TL, or Employee roles.' });
      }
    }

    // Determine assigned monthly rate from department/role
    const assignedMonthlyRate = await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
    if (assignedMonthlyRate === 1100 && user.monthlySalaryRate) {
      assignedMonthlyRate = user.monthlySalaryRate; // Fallback
    }

    const salaryHistory = await Salary.find({ userId: user._id })
      .populate('userId', 'name uniqueId department')
      .sort({ year: -1, month: -1 })
      .limit(12)
      .lean();

    let attendanceRecords = [];
    let attendanceDeductions = 0;
    let holidayIncrements = 0;
    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

      attendanceRecords = await Attendance.find({
        userId: user._id,
        date: { $gte: startDate, $lte: endDate }
      }).select('date status salaryDeductionAmount workedOnHoliday holidayType').sort({ date: 1 }).lean();

      const dailyRate = assignedMonthlyRate / (await getWorkingDaysInMonth(year, month));
      for (const att of attendanceRecords) {
        const amount = att.salaryDeductionAmount;
        if (amount > 0) attendanceDeductions += amount;
        else if (amount < 0) holidayIncrements += Math.abs(amount);
      }
    }

    let currentSalary = null;
    let salaryPreview = null;
    if (month && year) {
      currentSalary = await Salary.findOne({ userId: user._id, month: parseInt(month), year: parseInt(year) })
        .populate('userId', 'name uniqueId department')
        .lean();

      if (!currentSalary) {
        const workingDays = await getWorkingDaysInMonth(year, month);
        const basicSalary = calculateBaseSalary(assignedMonthlyRate, workingDays);
        const totalAllowances = 0;
        const grossSalary = basicSalary + totalAllowances + holidayIncrements;
        const otherDeductions = 0;
        const totalDeductions = attendanceDeductions + otherDeductions;
        const netSalary = grossSalary - totalDeductions;

        salaryPreview = {
          month: parseInt(month),
          year: parseInt(year),
          basicSalary,
          totalAllowances,
          grossSalary,
          attendanceDeductions,
          holidayIncrements,
          otherDeductions,
          totalDeductions,
          netSalary,
          workingDays,
          isPreview: true
        };
      }
    }

    return res.status(200).json({
      success: true,
      message: 'User details with salary and attendance retrieved successfully',
      data: {
        user: {
          uniqueId: user.uniqueId,
          name: user.name,
          email: user.email,
          department: user.department,
          role: user.role,
          isActive: user.isActive,
          assignedMonthlyRate
        },
        salaryHistory,
        currentSalary,
        salaryPreview,
        attendanceRecords,
        attendanceDeductions,
        holidayIncrements
      }
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching user salary and attendance:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error: ${error.message}` });
  }
});

// Update salary (Admin or HR subadmin; updated: Uses department/role rates; no Position; supports manual holidayIncrements)
const updateSalary = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    console.log(`[${new Date().toISOString()}] ${isHRSubadmin ? 'HR Subadmin' : 'Admin'} ${req.user.id} attempting to update salary ID: %s, body:`, JSON.stringify(req.body, null, 2));

    const { uniqueId, totalAllowances, tds, professionalTax, epf, esi, holidayIncrements: manualHolidayIncrements = undefined, totalDeductions, netSalary, workingDays, notes, monthlySalaryRate } = req.body;

    const salary = await Salary.findById(req.params.id).populate('userId', 'department service role monthlySalaryRate'); // Removed position
    if (!salary) {
      console.error(`[${new Date().toISOString()}] Salary not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    // For HR, validate target role
    if (isHRSubadmin) {
      const targetRole = salary.userId.role.toLowerCase();
      const allowedTargetRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
      if (!allowedTargetRoles.includes(targetRole)) {
        console.error(`[${new Date().toISOString()}] Access denied: HR subadmin cannot update salary for role ${targetRole}`);
        return res.status(403).json({ success: false, message: 'HR subadmins can only manage salaries for Head, Manager, Team Manager, TL, or Employee roles.' });
      }
    }

    let monthlyRate = await getMonthlyRateByDepartmentAndRole(salary.userId.department, salary.userId.service, salary.userId.role);
    if (monthlyRate === 1100 && salary.userId.monthlySalaryRate) {
      monthlyRate = salary.userId.monthlySalaryRate; // Fallback
    }

    if (uniqueId) {
      const user = await User.findOne({ uniqueId }).select('department service role monthlySalaryRate');
      if (!user) {
        console.error(`[${new Date().toISOString()}] User not found: ${uniqueId}`);
        return res.status(404).json({ success: false, message: 'User not found with provided unique ID' });
      }
      salary.userId = user._id;
      monthlyRate = await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
      if (monthlyRate === 1100 && user.monthlySalaryRate) {
        monthlyRate = user.monthlySalaryRate;
      }
    }

    const actualWorkingDays = workingDays || (await getWorkingDaysInMonth(salary.year, salary.month));
    const dailyRate = monthlyRate / actualWorkingDays;

    if (monthlySalaryRate !== undefined) {
      if (typeof monthlySalaryRate !== 'number' || monthlySalaryRate < 0) {
        return res.status(400).json({ success: false, message: 'Monthly salary rate must be a non-negative number' });
      }
      await User.findByIdAndUpdate(salary.userId, { monthlySalaryRate });
      monthlyRate = monthlySalaryRate;
    }

    let increments = manualHolidayIncrements;
    let deductions = 0;
    if (manualHolidayIncrements === undefined) {
      // If not manual, aggregate both
      const { deductions: attDeductions, increments: autoIncrements } = await aggregateAttendanceDeductionsAndIncrements(salary.userId, salary.year, salary.month, dailyRate);
      deductions = attDeductions;
      increments = autoIncrements;
    } else {
      // If manual, aggregate only deductions
      const { deductions: attDeductions } = await aggregateAttendanceDeductionsAndIncrements(salary.userId, salary.year, salary.month, dailyRate);
      deductions = attDeductions;
    }

    salary.basicSalary = calculateBaseSalary(monthlyRate, actualWorkingDays);
    if (totalAllowances !== undefined) salary.totalAllowances = Math.max(0, totalAllowances);
    salary.grossSalary = salary.basicSalary + salary.totalAllowances + increments;
    salary.attendanceDeductions = deductions;
    salary.holidayIncrements = increments;
    if (tds !== undefined) salary.tds = Math.max(0, tds);
    if (professionalTax !== undefined) salary.professionalTax = Math.max(0, professionalTax);
    if (epf !== undefined) salary.epf = Math.max(0, epf);
    if (esi !== undefined) salary.esi = Math.max(0, esi);
    salary.otherDeductions = salary.tds + salary.professionalTax + salary.epf + salary.esi;
    salary.totalDeductions = salary.attendanceDeductions + salary.otherDeductions;
    salary.netSalary = salary.grossSalary - salary.totalDeductions;

    if (totalDeductions !== undefined) {
      salary.totalDeductions = Math.max(0, totalDeductions);
      salary.netSalary = salary.grossSalary - salary.totalDeductions;
    }

    if (netSalary !== undefined) {
      salary.netSalary = Math.max(0, netSalary);
      salary.totalDeductions = salary.grossSalary - salary.netSalary;
    }

    if (workingDays !== undefined) salary.workingDays = Math.max(1, workingDays);
    if (notes !== undefined) salary.notes = notes;

    await salary.save();
    console.log(`[${new Date().toISOString()}] Salary updated successfully: ${salary._id}, manualIncrements: ${manualHolidayIncrements}`);

    await salary.populate('userId', 'name email uniqueId department role monthlySalaryRate');

    return res.status(200).json({
      success: true,
      message: 'Salary updated successfully',
      data: salary,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating salary:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while updating salary: ${error.message}` });
  }
});

// Delete salary (Admin or HR subadmin)
const deleteSalary = asyncHandler(async (req, res) => {
  try {
    const isHRSubadmin = req.isHRSubadmin;
    console.log(`[${new Date().toISOString()}] ${isHRSubadmin ? 'HR Subadmin' : 'Admin'} ${req.user.id} attempting to delete salary ID: ${req.params.id}`);

    const salary = await Salary.findById(req.params.id).populate('userId', 'role');
    if (!salary) {
      console.error(`[${new Date().toISOString()}] Salary not found for deletion: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    // For HR, validate target role
    if (isHRSubadmin) {
      const targetRole = salary.userId.role.toLowerCase();
      const allowedTargetRoles = ['head', 'manager', 'team manager', 'tl', 'employee'];
      if (!allowedTargetRoles.includes(targetRole)) {
        console.error(`[${new Date().toISOString()}] Access denied: HR subadmin cannot delete salary for role ${targetRole}`);
        return res.status(403).json({ success: false, message: 'HR subadmins can only manage salaries for Head, Manager, Team Manager, TL, or Employee roles.' });
      }
    }

    await Salary.findByIdAndDelete(req.params.id);

    console.log(`[${new Date().toISOString()}] Salary deleted successfully: ${req.params.id}`);

    return res.status(200).json({
      success: true,
      message: 'Salary deleted successfully',
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deleting salary:`, error.message, error.stack);
    return res.status(500).json({ success: false, message: `Server error while deleting salary: ${error.message}` });
  }
});

// NEW: HR Manager submits attendance to Finance
const submitAttendanceToFinance = asyncHandler(async (req, res) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({ success: false, message: 'Month and year are required' });
  }

  console.log(`[Salary Workflow Debug] HR Submitting Attendance: Month=${month}, Year=${year} by ${req.user.email}`);

  // Mark all attendance records for this month as sentToFinance
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Mark attendance records for this month as sentToFinance
  // We use $ne: true to include documents where the field is missing or false
  const result = await Attendance.updateMany(
    {
      date: { $gte: startDate, $lte: endDate },
      // isApproved: true, // Removed strict check: HR should be able to submit whatever status is there. 
      // Unapproved leave/absence will be processed as full deduction by Finance.
      sentToFinance: { $ne: true }
    },
    { $set: { sentToFinance: true } }
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('attendance_submitted_to_finance', {
      month,
      year,
      submittedBy: req.user.id,
      count: result.modifiedCount
    });
  }

  return res.status(200).json({
    success: true,
    message: `Successfully submitted ${result.modifiedCount} attendance records to Finance`,
    data: result
  });
});

// NEW: Financial Manager gets submitted attendance records
const getFinanceSubmissions = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  const query = { sentToFinance: true };
  if (month && year) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    query.date = { $gte: startDate, $lte: endDate };
  }

  console.log(`[Salary Workflow Debug] Finance Fetching Submissions: Query=${JSON.stringify(query)}`);

  const submissions = await Attendance.find(query)
    .populate('userId', 'name uniqueId department service role monthlySalaryRate')
    .sort({ date: -1 })
    .lean();

  // Filter out any records where userId is null
  const validSubmissions = submissions.filter(s => s.userId);
  console.log(`[Salary Debug] Total submissions: ${submissions.length}, Valid: ${validSubmissions.length}`);

  // Attach the fixed monthly rate based on DepartmentRate configuration
  const submissionsWithRates = await Promise.all(
    validSubmissions.map(async (sub) => {
      const rate = await getMonthlyRateByDepartmentAndRole(
        sub.userId.department,
        sub.userId.service,
        sub.userId.role
      );
      sub.userId.assignedRate = rate !== 1100 ? rate : (sub.userId.monthlySalaryRate || 1100);
      return sub;
    })
  );

  console.log(`[Salary Debug] Sample assignedRate: ${submissionsWithRates[0]?.userId?.assignedRate}`);

  return res.status(200).json({
    success: true,
    data: submissionsWithRates
  });
});

// NEW: Financial Manager processes salary (calculates deductions/increments)
const processSalaryByFinance = asyncHandler(async (req, res) => {
  const { uniqueId, month, year, initialSalary } = req.body;

  if (!uniqueId || !month || !year) {
    return res.status(400).json({ success: false, message: 'UniqueId, month, and year are required' });
  }

  const user = await User.findOne({ uniqueId });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendances = await Attendance.find({
    userId: user._id,
    date: { $gte: startDate, $lte: endDate },
    sentToFinance: true
  });

  if (attendances.length === 0) {
    return res.status(400).json({ success: false, message: 'No attendance data submitted from HR for this user' });
  }

  // Logic: Reduce for absent/on-leave, Increment for holiday work
  let totalDeductions = 0;
  let totalIncrements = 0;

  // Get daily rate
  const workingDays = await getWorkingDaysInMonth(year, month);
  const monthlyRate = initialSalary || await getMonthlyRateByDepartmentAndRole(user.department, user.service, user.role);
  const dailyRate = monthlyRate / workingDays;

  for (const att of attendances) {
    if (att.status === 'absent' || att.status === 'on-leave') {
      // Reduce salary amount
      totalDeductions += dailyRate;
    }

    if (att.workedOnHoliday) {
      // Increment salary amount
      totalIncrements += dailyRate * 0.5; // Example: 50% extra for holiday work
    }
  }

  const basicSalary = monthlyRate;
  const grossSalary = basicSalary + totalIncrements;
  // Ensure net salary is not negative
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  // Cap deductions if they exceed gross salary
  if (totalDeductions > grossSalary) {
    totalDeductions = grossSalary;
  }

  let salary = await Salary.findOneAndUpdate(
    { userId: user._id, month, year },
    {
      basicSalary,
      grossSalary,
      attendanceDeductions: totalDeductions,
      totalIncrements,
      netSalary,
      status: 'processed',
      isGenerated: true
    },
    { new: true, upsert: true }
  );

  // Mark attendances as processed
  await Attendance.updateMany(
    { userId: user._id, date: { $gte: startDate, $lte: endDate } },
    { $set: { financeProcessed: true } }
  );

  const io = req.app.get('io');
  if (io) {
    io.emit('salary_processed', {
      userId: user._id,
      month,
      year,
      netSalary
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Salary processed successfully',
    data: salary
  });
});

// NEW: Financial Manager credits salary
const creditSalary = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findById(id).populate('userId', 'name email');
    if (!salary) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    salary.status = 'credited';

    // Safety check: Ensure netSalary is non-negative and FINITE before saving
    // This fixes potential validation errors if previous calculations resulted in NaN or Infinity
    if (!Number.isFinite(salary.netSalary) || salary.netSalary < 0) {
      console.warn(`[Credit Salary Warning] Fix invalid netSalary: ${salary.netSalary}`);
      salary.netSalary = 0;
      salary.totalDeductions = Number.isFinite(salary.grossSalary) ? salary.grossSalary : 0;
    }

    if (!Number.isFinite(salary.grossSalary)) {
      salary.grossSalary = 0;
    }
    if (!Number.isFinite(salary.totalDeductions)) {
      salary.totalDeductions = 0;
    }

    console.log(`[Credit Salary Debug] Attempting to save salary ${id}: netSalary=${salary.netSalary}, totalDeductions=${salary.totalDeductions}`);

    await salary.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('salary_credited', {
        userId: salary.userId._id,
        month: salary.month,
        year: salary.year,
        amount: salary.netSalary
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Salary credited successfully',
      data: salary
    });
  } catch (error) {
    console.error(`[Credit Salary Error] Failed to credit salary:`, error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: `Validation Error: ${Object.values(error.errors).map(e => e.message).join(', ')}` });
    }
    throw error;
  }
});

module.exports = {
  createSalary,
  getSalaries,
  getSalaryById,
  getUserSalaryAndAttendance,
  updateSalary,
  deleteSalary,
  createOrUpdateDepartmentRate,
  getDepartmentRates,
  deleteDepartmentRate,
  submitAttendanceToFinance,
  getFinanceSubmissions,
  processSalaryByFinance,
  creditSalary
};