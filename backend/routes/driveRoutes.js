const express = require('express');
const router = express.Router();
const driveController = require('../Controller/driveController');
const { authenticateUser } = require('../Middleware/authMiddleware');
const driveUpload = require('../Middleware/driveUploadMiddleware');

// All drive routes are protected
router.use(authenticateUser);

// Upload files
router.post('/upload', driveUpload.array('files', 10), driveController.uploadFile);

// Get all files and storage info
router.get('/files', driveController.getFiles);

// Get storage stats only
router.get('/storage', driveController.getStorageStats);

// Delete a file
router.delete('/:id', driveController.deleteFile);

module.exports = router;
