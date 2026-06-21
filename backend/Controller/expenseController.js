const Expense = require('../models/Expense');
const asyncHandler = require('express-async-handler');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Financial Manager/Personnel)
const getAllExpenses = asyncHandler(async (req, res) => {
    const expenses = await Expense.find({})
        .populate('recordedBy', 'name uniqueId')
        .sort({ receiptDate: -1 });

    res.status(200).json({
        success: true,
        count: expenses.length,
        data: expenses
    });
});

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private (Financial Manager/Personnel)
const createExpense = asyncHandler(async (req, res) => {
    const { receiptDate, category, basicAmount, taxAmount, paidTo, paymentMode, description } = req.body;

    const totalAmount = parseFloat(basicAmount) + (parseFloat(taxAmount) || 0);

    const expenseData = {
        receiptDate,
        category,
        basicAmount: parseFloat(basicAmount),
        taxAmount: parseFloat(taxAmount) || 0,
        totalAmount,
        paidTo,
        paymentMode,
        description,
        recordedBy: req.user._id
    };

    if (req.file) {
        expenseData.receiptUrl = `/uploads/financial/${req.file.filename}`;
    }

    const expense = await Expense.create(expenseData);

    res.status(201).json({
        success: true,
        data: expense
    });
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Financial Manager)
const deleteExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
        return res.status(404).json({
            success: false,
            message: 'Expense not found'
        });
    }

    await expense.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Expense removed'
    });
});

module.exports = {
    getAllExpenses,
    createExpense,
    deleteExpense
};
