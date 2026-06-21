const Project = require('../models/Project');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Create a new Purchase Order
// @route   POST /api/purchase/create
// @access  Private (Financial Manager)
const createPurchaseOrder = asyncHandler(async (req, res) => {
    const {
        description,
        software,
        consumable,
        kits,
        others,
        quality,
        vendors,
        requestedAmount,
        projectTitle,
        projectId,
        service
    } = req.body;

    // Process files
    let attachments = [];
    if (req.files && req.files.length > 0) {
        attachments = req.files.map(file => ({
            path: file.path,
            filename: file.originalname,
            mimetype: file.mimetype
        }));
    }

    // Parse vendors if it's a string
    let parsedVendors = [];
    if (vendors) {
        try {
            parsedVendors = typeof vendors === 'string' ? JSON.parse(vendors) : vendors;
        } catch (e) {
            console.error('Error parsing vendors:', e);
        }
    }

    const role = req.user.role ? req.user.role.toLowerCase() : '';
    const isSuperadmin = role === 'superadmin' || role === 'admin';

    // Create a new project record for this purchase order
    const project = new Project({
        userId: req.user._id, // Created by the manager
        department: 'Financial',
        category: 'Purchase Order',
        status: isSuperadmin ? 'In Progress' : 'Under Review',
        paymentStatus: 'Pending',
        formData: {
            projectTitle: projectTitle || 'Generic Purchase',
            referenceId: projectId || '',
            productName: projectTitle || 'Generic Purchase',
            service: service || '',
            isSuperadminPurchase: isSuperadmin // Flag to separate superadmin purchases easily
        },
        financialReview: {
            requested: true,
            status: isSuperadmin ? 'Approved' : 'Pending',
            requestedBy: req.user._id,
            requestReason: description,
            software,
            consumable,
            kits,
            others,
            quality,
            vendors: parsedVendors.map(v => {
                const vendorData = {
                    details: v.details,
                    amount: Number(v.amount) || 0
                };
                // Check for attachments if index is provided
                if (typeof v.attachmentIndex === 'number' && v.attachmentIndex >= 0 && req.files[v.attachmentIndex]) {
                    const file = req.files[v.attachmentIndex];
                    vendorData.attachment = {
                        path: file.path,
                        filename: file.originalname,
                        mimetype: file.mimetype
                    };
                }
                return vendorData;
            }),
            attachments: attachments,
            requestedAmount: Number(requestedAmount) || 0,
            requestedAt: new Date(),
            ...(isSuperadmin && {
                reviewedBy: req.user._id,
                reviewedAt: new Date(),
                approvedAmount: Number(requestedAmount) || 0,
                remarks: 'Auto-approved by Superadmin/Admin'
            })
        },
        ...(isSuperadmin && {
            purchaseDetails: {
                productName: projectTitle || description || 'Generic Purchase',
                amountSent: Number(requestedAmount) || 0,
                assignedEmployee: null, // Any purchase employee can pick it up
                status: 'Order Placing',
                description: 'Superadmin initiated purchase.',
                updatedAt: new Date()
            }
        })
    });

    // Advance workflow to step 2 automatically for purchase orders
    project.workflowStep = 2;

    const savedProject = await project.save();

    res.status(201).json({
        success: true,
        message: 'Purchase order created successfully',
        data: savedProject
    });
});

// @desc    Approve Purchase Order and assign to Financial Employee
// @route   POST /api/purchase/:id/approve
// @access  Private (Financial Manager)
const approvePurchaseOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { assignedEmployeeId, remarks, approvedAmount } = req.body;

    if (!assignedEmployeeId) {
        return res.status(400).json({
            success: false,
            message: 'Please assign a financial employee'
        });
    }

    const project = await Project.findById(id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Purchase order not found'
        });
    }

    // Update financial review status
    project.financialReview.status = 'Approved';
    project.financialReview.reviewedBy = req.user._id;
    project.financialReview.reviewedAt = new Date();
    project.financialReview.remarks = remarks;
    project.financialReview.approvedAmount = approvedAmount || project.financialReview.requestedAmount;

    // Initialize purchase details for the employee
    project.purchaseDetails = {
        productName: project.financialReview.requestReason.substring(0, 50),
        amountSent: project.financialReview.approvedAmount,
        assignedEmployee: assignedEmployeeId,
        status: 'Order Placing',
        description: remarks,
        updatedAt: new Date()
    };

    // Update overall status
    project.status = 'In Progress';

    await project.save();

    res.status(200).json({
        success: true,
        message: 'Purchase order approved and assigned to employee',
        data: project
    });
});

// @desc    Get all Purchase Orders
// @route   GET /api/purchase/all
// @access  Private (Financial Manager)
const getAllPurchaseOrders = asyncHandler(async (req, res) => {
    // Only fetch projects that were created as Purchase Orders (department: 'Financial', category: 'Purchase Order')
    const projects = await Project.find({
        category: 'Purchase Order'
    })
        .populate('userId', 'name uniqueId email')
        .populate('financialReview.requestedBy', 'name uniqueId')
        .populate('purchaseDetails.assignedEmployee', 'name uniqueId')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
    });
});

// @desc    Get Purchase Order Details by ID
// @route   GET /api/purchase/:id
// @access  Private (Financial Manager)
const getPurchaseOrderDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await Project.findById(id)
        .populate('userId', 'name uniqueId email role')
        .populate('financialReview.requestedBy', 'name uniqueId role email')
        .populate('purchaseDetails.assignedEmployee', 'name uniqueId role email')
        .populate('purchaseDetails.billForm.generatedBy', 'name uniqueId');

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Purchase order not found'
        });
    }

    // Authorization Check
    const role = req.user.role.toLowerCase();
    const dept = (req.user.department || '').toLowerCase();
    const isFinancial = dept.includes('finance') || dept.includes('financial');
    const isOwner = project.userId?._id.toString() === req.user._id.toString();
    const isRequester = project.financialReview?.requestedBy?._id.toString() === req.user._id.toString();

    if (!isFinancial && !isOwner && !isRequester && role !== 'admin' && role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. You are not authorized to view this purchase order.'
        });
    }

    res.status(200).json({
        success: true,
        data: project
    });
});

// @desc    Get Purchase Orders for the current manager
// @route   GET /api/purchase/my
// @access  Private (Manager)
const getMyPurchaseOrders = asyncHandler(async (req, res) => {
    const { service } = req.query;

    // Build an OR query to catch:
    // 1. Standalone Purchase Orders (category: 'Purchase Order')
    // 2. Projects with active financial review requests (financialReview.requested: true)
    let query = {
        $or: [
            { category: 'Purchase Order' },
            { 'financialReview.requested': true }
        ]
    };

    // Ownership check: If not financial dept, show what they created OR requested
    const dept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
    const userService = (req.user.service || '').toLowerCase();
    const isFinancial = dept.includes('finance') || dept.includes('financial');
    const isSalesDept = dept.includes('sale') || 
                        dept === 'services' || 
                        dept === 'customer services' ||
                        ['sales and customer services', 'sales and customer support', 'customer services'].includes(dept);

    const isSales = isSalesDept && !userService;
    const isGlobalAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'head';

    if (!isFinancial && !isSales && !isGlobalAdmin) {
        query = {
            $and: [
                query,
                {
                    $or: [
                        { userId: req.user._id },
                        { 'financialReview.requestedBy': req.user._id },
                        { 'assignedTo': req.user._id }
                    ]
                }
            ]
        };
    }

    // Apply service filter if provided
    if (service && typeof service === 'string') {
        // Clean up service string (e.g., drug-discovery -> drug discovery) for better matching
        const cleanService = service.replace(/-/g, ' ');
        // Escape special characters to prevent ReDoS
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const serviceRegex = new RegExp(escapeRegExp(cleanService), 'i');
        const originalServiceRegex = new RegExp(escapeRegExp(service), 'i');

        query = {
            $and: [
                query,
                {
                    $or: [
                        { 'formData.service': originalServiceRegex },
                        { 'formData.service': serviceRegex },
                        { department: serviceRegex },
                        { category: serviceRegex },
                        { 'financialReview.requestReason': serviceRegex },
                        { 'formData.projectTitle': serviceRegex },
                        // Legacy support: If it's a standalone PO but has NO service field, show it
                        {
                            $and: [
                                { category: 'Purchase Order' },
                                { 'formData.service': { $exists: false } }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    console.log(`[Purchase Debug] Fetching for user: ${req.user._id} | Service Filter: ${service || 'None'}`);
    const projects = await Project.find(query)
        .populate('userId', 'name uniqueId email')
        .populate('financialReview.requestedBy', 'name uniqueId')
        .populate('purchaseDetails.assignedEmployee', 'name uniqueId')
        .sort({ createdAt: -1 });

    console.log(`[Purchase Debug] Found ${projects.length} matching requests`);

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
    });
});

module.exports = {
    createPurchaseOrder,
    approvePurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderDetail,
    getMyPurchaseOrders
};
