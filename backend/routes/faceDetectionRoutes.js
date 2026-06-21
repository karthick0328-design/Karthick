const express = require('express');
const router = express.Router();
const { enrollFace, verifyFace, getEnrollmentStatus } = require('../Controller/faceDetectionController');
const { authenticateUser } = require('../Middleware/authMiddleware');

router.post('/enroll', authenticateUser, enrollFace);
router.post('/verify', authenticateUser, verifyFace);
router.get('/status', authenticateUser, getEnrollmentStatus);

module.exports = router;
