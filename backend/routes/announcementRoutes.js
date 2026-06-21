const express = require('express');
const router = express.Router();
const announcementController = require('../Controller/announcementController');
const { authenticateUser, isSuperAdmin } = require('../Middleware/authMiddleware');
const upload = require('../Middleware/announcementUploadMiddleware');

// Get filtered active public announcements for Homepage (No auth required)
router.route('/public')
    .get(announcementController.getPublicAnnouncements);

router.route('/')
    .post(authenticateUser, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), announcementController.createAnnouncement)
    .get(authenticateUser, announcementController.getAnnouncements);

// UI Settings (Public view, Admin update)
router.get('/ui-settings', announcementController.getUISettings);
router.put('/ui-settings/:section', authenticateUser, isSuperAdmin, announcementController.updateUISetting);

router.route('/:id')
    .put(authenticateUser, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), announcementController.updateAnnouncement)
    .delete(authenticateUser, announcementController.deleteAnnouncement);

router.patch('/:id/view', announcementController.trackView);
router.patch('/:id/apply', announcementController.trackApply);

module.exports = router;
