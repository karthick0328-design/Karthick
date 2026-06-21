const express = require('express');
const router = express.Router();
const { authenticateUser, isHRPersonnel, isFinancialPersonnel } = require('../Middleware/authMiddleware');
const { getMyProfile, updateMyProfile, getHRProfileById, uploadProfileImage } = require('../Controller/hrProfileController');
const upload = require('../Middleware/uploadMiddleware');

// Base protection
router.use(authenticateUser);

// Profile management (Self)
router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/upload-image', upload.single('image'), uploadProfileImage);

// Admin/HR/Finance can view specific profiles
router.get('/:userId', (req, res, next) => {
    // Custom check: If NOT HR and NOT Finance, deny
    const isHR = (req.user.department || '').toLowerCase().includes('hr') || (req.user.department || '').toLowerCase().includes('human-resource');
    const isFinance = (req.user.department || '').toLowerCase().includes('finance') || (req.user.department || '').toLowerCase().includes('financial') || (req.user.financeAccess || []).includes('salary');
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    
    if (isAdmin || isHR || isFinance) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Access denied. HR or Financial access required.' });
    }
}, getHRProfileById);

module.exports = router;
