const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get all employees in Finance Department
// @route   GET /api/finance/team
// @access  Private (Financial Manager)
const getFinanceTeam = asyncHandler(async (req, res) => {
    // Only fetch employees belonging to Finance/Financial department or service
    // Exclude manager roles if necessary, user strictly requested 'employee' roles
    const employees = await User.find({
        role: 'employee',
        $or: [
            { department: { $regex: 'finance', $options: 'i' } },
            { department: { $regex: 'financial', $options: 'i' } },
            { service: { $regex: 'finance', $options: 'i' } }
        ]
    })
        .select('name uniqueId department role financeAccess email photo')
        .sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: employees.length,
        data: employees
    });
});

// @desc    Update finance-specific access for an employee
// @route   PUT /api/finance/team/access
// @access  Private (Financial Manager)
const updateEmployeeFinanceAccess = asyncHandler(async (req, res) => {
    const { userId, access } = req.body;

    if (!userId || !Array.isArray(access)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request data. userId and access array required.'
        });
    }

    // Validate access items
    const validAccessPoints = [
        'attendance',
        'salary',
        'service',
        'purchase',
        'service:ngs',
        'service:drug-discovery',
        'service:software-development',
        'service:microbiology',
        'service:biochemistry',
        'service:molecular-biology'
    ];
    const filteredAccess = access.filter(a => validAccessPoints.includes(a));

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update the field
    console.log(`[Finance Access Update] User: ${user.email}, New Access: ${JSON.stringify(filteredAccess)}`);
    user.financeAccess = filteredAccess;
    await user.save();
    console.log(`[Finance Access Update] Save successful for ${user.email}`);

    res.status(200).json({
        success: true,
        message: `Updated finance access for ${user.name}`,
        data: user.financeAccess
    });
});

module.exports = {
    getFinanceTeam,
    updateEmployeeFinanceAccess
};
