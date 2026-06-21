const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../Middleware/authMiddleware');
const { getMyProfile, updateMyProfile, getServiceManagerProfileById, uploadProfileImage } = require('../Controller/serviceManagerProfileController');
const upload = require('../Middleware/uploadMiddleware');

// Check if user is a manager or tl
const isManagerOrTeamLead = (req, res, next) => {
    if (req.user && req.user.role) {
        const role = req.user.role.toLowerCase();
        if (role === 'manager' || role === 'tl' || role === 'employee') {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Access denied. Manager, TL or Employee access required.' });
        }
    } else {
        res.status(403).json({ success: false, message: 'Access denied. No role found.' });
    }
};

// All routes are protected and require Manager or TL access
router.use(authenticateUser);
router.use(isManagerOrTeamLead);

// GET /api/service-manager-profile/me - Get current logged-in Service manager's profile
router.get('/me', getMyProfile);

// PUT /api/service-manager-profile/me - Update current logged-in Service manager's profile
router.put('/me', updateMyProfile);

// POST /api/service-manager-profile/upload-image - Upload profile image
router.post('/upload-image', upload.single('image'), uploadProfileImage);

// GET /api/service-manager-profile/:userId - Get profile of a specific manager
router.get('/:userId', getServiceManagerProfileById);

module.exports = router;
