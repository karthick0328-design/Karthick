const CashBookEntry = require('../models/CashBookEntry');
const Expense = require('../models/Expense');
const Project = require('../models/Project');
const Salary = require('../models/Salary');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Add a manual cash book entry
// @route   POST /api/finance/cashbook/entry
// @access  Private (Financial Manager)
const addCashBookEntry = asyncHandler(async (req, res) => {
    const { date, type, amount, description } = req.body;

    if (!type || !amount || !description) {
        return res.status(400).json({
            success: false,
            message: 'Please provide type, amount, and description'
        });
    }

    const entry = await CashBookEntry.create({
        date: date || new Date(),
        type,
        amount: parseFloat(amount),
        description,
        source: 'Manual Entry',
        recordedBy: req.user._id
    });

    res.status(201).json({
        success: true,
        data: entry
    });
});

// @desc    Get all cash book transactions (combined manual + expenses + purchases)
// @route   GET /api/finance/cashbook/transactions
// @access  Private (Financial Manager)
const getCashBookTransactions = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    // 1. Get Manual Entries
    const manualEntries = await CashBookEntry.find(query)
        .populate('recordedBy', 'name uniqueId')
        .lean();

    // Mapping manual entries to standard transaction format
    const formattedManual = manualEntries.map(entry => ({
        _id: entry._id,
        date: entry.date,
        description: entry.description,
        source: entry.source,
        debit: entry.type === 'Cash In' ? entry.amount : 0,
        credit: entry.type === 'Cash Out' ? entry.amount : 0,
        type: 'Manual',
        status: entry.status
    }));

    // 2. Get Expenses
    const expenseQuery = {};
    if (startDate && endDate) {
        expenseQuery.receiptDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const expenses = await Expense.find(expenseQuery).lean();

    const formattedExpenses = expenses.map(exp => ({
        _id: exp._id,
        date: exp.receiptDate,
        description: `Expense: ${exp.category} - ${exp.description || exp.paidTo}`,
        source: 'Expense Module',
        debit: 0,
        credit: exp.totalAmount,
        type: 'Expense',
        status: 'Completed'
    }));

    // 3. Get Purchases & Project Payments (from Project model)
    const projectQuery = {}; // Get all projects within date range
    if (startDate && endDate) {
        projectQuery.updatedAt = { // Use updatedAt to catch status changes/payments
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const projects = await Project.find(projectQuery).lean();

    // 4. Get Salaries (Inclusive - every record counts for accuracy with table view)
    const salaryQuery = {};
    if (startDate && endDate) {
        salaryQuery.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    const salariesData = await Salary.find(salaryQuery).populate('userId', 'name').lean();

    const formattedSalaries = salariesData.map(sal => ({
        _id: sal._id,
        date: sal.createdAt,
        description: `Salary: ${sal.userId?.name || 'Employee'} - ${sal.month}/${sal.year}`,
        source: 'Payroll Module',
        debit: 0,
        credit: sal.grossSalary || sal.netSalary || 0,
        type: 'Salary',
        status: sal.status === 'credited' ? 'Completed' : 'Processed'
    }));

    const projectTransactions = [];
    projects.forEach(prj => {
        // Handle Purchases (Credit Out) - ONLY count Approved ones as spent
        if (prj.category === 'Purchase Order' && prj.financialReview?.status === 'Approved') {
            projectTransactions.push({
                _id: `${prj._id}_purchase`,
                date: prj.createdAt,
                description: `Purchase: ${prj.financialReview?.requestReason || 'Order'}`,
                source: 'Purchase Module',
                debit: 0,
                credit: prj.financialReview?.approvedAmount || prj.financialReview?.requestedAmount || 0,
                type: 'Purchase',
                status: prj.status,
                billUrl: prj.purchaseDetails?.billForm?.filepath
            });
        }

        // Handle Project Payments (Debit In)
        if (prj.paymentDetails?.paidAmount > 0) {
            projectTransactions.push({
                _id: `${prj._id}_payment`,
                date: prj.paidAt || prj.updatedAt,
                description: `Revenue: ${prj.paymentDetails.title || 'Project Payment'} - ${prj.uniqueId}`,
                source: 'Sales/Project',
                debit: prj.paymentDetails.paidAmount,
                credit: 0,
                type: 'Revenue',
                status: 'Completed'
            });
        }
    });

    // Combine all and sort by date descending
    const allTransactions = [
        ...formattedManual,
        ...formattedExpenses,
        ...formattedSalaries,
        ...projectTransactions
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate Summary Stats
    let totalDebit = 0;
    let totalCredit = 0;

    allTransactions.forEach(t => {
        totalDebit += t.debit;
        totalCredit += t.credit;
    });

    const summary = {
        openingBalance: 0, // In a real app, this would be the closing balance of previous period
        netCashFlow: totalDebit - totalCredit,
        closingBalance: (totalDebit - totalCredit) + 0 // + openingBalance
    };

    res.status(200).json({
        success: true,
        summary,
        data: allTransactions
    });
});

module.exports = {
    addCashBookEntry,
    getCashBookTransactions
};
