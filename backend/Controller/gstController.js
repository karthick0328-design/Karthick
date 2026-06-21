const Project = require('../models/Project');
const Expense = require('../models/Expense');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Get GST Report for a specific month and year
// @route   GET /api/finance/gst-report
// @access  Private (Financial Manager)
const getGSTReport = asyncHandler(async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({
            success: false,
            message: 'Please provide month and year'
        });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // 1. Calculate Output Tax (Sales)
    // Mirroring Cashbook: Projects updated in this period
    const salesProjects = await Project.find({
        $or: [
            { paidAt: { $gte: startDate, $lte: endDate } },
            { updatedAt: { $gte: startDate, $lte: endDate } }
        ],
        category: { $nin: ['Purchase Order', 'PURCHASE ORDER'] }
    }).populate('userId', 'name').lean();

    let outputGST = 0;
    let outputIGST = 0;
    let outputCGST = 0;
    let outputSGST = 0;

    const salesList = [];
    salesProjects.forEach(prj => {
        // Mirror Cashbook constraint: Only include if paidAmount > 0 or completed
        const amount = prj.paymentDetails?.paidAmount || prj.quotedAmount || 0;
        
        if (amount > 0 || prj.status === 'Completed') {
            const gstAmount = prj.gst || 0;
            outputGST += gstAmount;
            outputIGST += gstAmount; // Assume IGST for simplicity or split

            salesList.push({
                id: prj._id.toString(),
                date: (prj.paidAt || prj.updatedAt || new Date()).toISOString().split('T')[0],
                docNumber: prj.uniqueId || 'INV',
                partyName: prj.userId ? prj.userId.name : 'Client',
                partyGSTIN: 'NA',
                categoryOrState: prj.department || 'General',
                description: prj.paymentDetails?.title || prj.category || 'Service',
                hsnSac: '998111',
                unit: 'Nos',
                quantity: 1,
                costPerUnit: amount,
                gstRate: gstAmount > 0 ? 18 : 0, 
                discount: prj.discount || 0,
                isInterState: true
            });
        }
    });

    // 2. Calculate Input Tax Credit (Purchases & Expenses)
    // A. Expenses
    const expenses = await Expense.find({
        receiptDate: { $gte: startDate, $lte: endDate }
    }).populate('recordedBy', 'name').lean();

    let inputGST = 0;
    let inputIGST = 0;
    let inputCGST = 0;
    let inputSGST = 0;

    const expensesList = expenses.map(exp => {
        const tax = exp.taxAmount || 0;
        inputGST += tax;
        inputIGST += tax; 
        
        return {
            id: exp._id.toString(),
            date: (exp.receiptDate || exp.createdAt || new Date()).toISOString().split('T')[0],
            docNumber: exp.billNumber || exp.uniqueId || 'EXP',
            partyName: exp.vendorName || (exp.recordedBy ? exp.recordedBy.name : 'Vendor'),
            partyGSTIN: 'NA',
            categoryOrState: exp.category || 'Expense',
            description: exp.description || exp.category || 'Inward Supply',
            hsnSac: '998311',
            unit: 'Nos',
            quantity: 1,
            costPerUnit: exp.totalAmount || exp.amount || 0,
            gstRate: tax > 0 ? 18 : 0,
            discount: 0,
            isInterState: true
        };
    });

    // B. Purchases (from Project model)
    const purchases = await Project.find({
        category: { $in: ['Purchase Order', 'PURCHASE ORDER'] },
        updatedAt: { $gte: startDate, $lte: endDate }
    }).lean();

    // Incorporate purchases as expenses
    purchases.forEach(pur => {
        // Mirror Cashbook Purchase Logic
        const amount = pur.financialReview?.approvedAmount || pur.financialReview?.requestedAmount || pur.purchaseDetails?.amountSent || 0;
        
        if (amount > 0 || pur.status === 'Completed' || pur.status === 'Delivered') {
            const tax = 0; // Assuming 0 for now
            inputGST += tax;
            inputIGST += tax;

            expensesList.push({
                id: pur._id.toString(),
                date: (pur.createdAt || new Date()).toISOString().split('T')[0],
                docNumber: pur.uniqueId || 'PO',
                partyName: pur.purchaseDetails?.productName || 'Supplier',
                partyGSTIN: 'NA',
                categoryOrState: 'Procurement',
                description: pur.purchaseDetails?.description || pur.financialReview?.requestReason || 'Purchase Order',
                hsnSac: '840000',
                unit: 'Nos',
                quantity: pur.purchaseDetails?.quantity || 1,
                costPerUnit: pur.purchaseDetails?.quantity && pur.purchaseDetails.quantity > 0 ? amount / pur.purchaseDetails.quantity : amount,
                gstRate: tax > 0 ? 18 : 0,
                discount: 0,
                isInterState: true
            });
        }
    });

    const netGSTPayable = outputGST - inputGST;

    res.status(200).json({
        success: true,
        data: {
            period: { month, year },
            summary: {
                netGSTPayable,
                totalOutputTax: outputGST,
                totalInputTax: inputGST
            },
            outputTax: {
                total: outputGST,
                igst: outputIGST,
                cgst: outputCGST,
                sgst: outputSGST
            },
            inputTax: {
                total: inputGST,
                igst: inputIGST,
                cgst: inputCGST,
                sgst: inputSGST
            },
            salesData: salesList,
            expensesData: expensesList
        }
    });
});

module.exports = {
    getGSTReport
};
