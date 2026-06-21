const express = require('express');
const router = express.Router();
const controller = require('../Controller/EmailCampaignController');
const { authenticateUser, canManageCampaigns } = require('../Middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for attachments
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/email-attachments';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedName = path.basename(file.originalname).replace(/\s+/g, '-');
        cb(null, `attachment-${Date.now()}-${sanitizedName}`);
    }
});

const upload = multer({ storage });

// All routes require authentication and specific role check
router.use(authenticateUser);
router.use(canManageCampaigns);

// Campaign Routes
router.post('/campaign', upload.array('attachments'), controller.sendCampaign);
router.get('/history', controller.listHistory);
router.get('/template/default', controller.getTemplate);

// Contact Management
router.get('/contacts', controller.listContacts);
router.get('/project-emails', controller.listAllProjectEmails);
router.post('/contacts', controller.createContact);
router.delete('/contacts/:id', controller.deleteContact);

// System
router.get('/test-connection', controller.testConnection);

// SMTP Profiles
router.get('/smtp-profiles', controller.listSmtpProfiles);
router.post('/smtp-profiles', controller.createSmtpProfile);
router.delete('/smtp-profiles/:id', controller.deleteSmtpProfile);

module.exports = router;
