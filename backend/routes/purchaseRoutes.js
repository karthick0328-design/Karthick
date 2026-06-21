const express = require('express');
const router = express.Router();
const { authenticateUser, isFinancialManager, isManager, isFinancialPersonnel } = require('../Middleware/authMiddleware');
const {
    createPurchaseOrder,
    approvePurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderDetail,
    getMyPurchaseOrders
} = require('../Controller/purchaseController');

// All routes are protected by auth
router.use(authenticateUser);

const financialUpload = require('../Middleware/financialUploadMiddleware');

// Any manager can view their own purchase requests
router.get('/my', isManager, getMyPurchaseOrders);

// Anyone with manager role can view details (controller handles ownership check)
router.get('/all', (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    const dept = (req.user?.department || '').toLowerCase();
    const isFinDept = dept.includes('financial') || dept.includes('finance');
    if (role === 'admin' || role === 'superadmin' || (role === 'manager' && isFinDept)) return next();
    return res.status(403).json({ success: false, message: 'Access denied. Oversight authority required.' });
}, getAllPurchaseOrders);

router.get('/:id', isManager, getPurchaseOrderDetail);

// Only financial manager, Superadmin, or Financial Personnel can approve/assign
router.post('/:id/approve', isFinancialPersonnel, approvePurchaseOrder);

// Any manager can create a purchase request
router.post('/create', isManager, (req, res, next) => {
    financialUpload.array('attachments', 10)(req, res, (err) => {
        if (err) {
            console.error(`[${new Date().toISOString()}] ❌ Multer Error:`, err.message);
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }
        next();
    });
}, createPurchaseOrder);

module.exports = router;
