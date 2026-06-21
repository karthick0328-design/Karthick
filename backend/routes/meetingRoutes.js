const express = require('express');
const router = express.Router();
const meetingController = require('../Controller/meetingController');
const { authenticateUser, isManager } = require('../Middleware/authMiddleware');

// Create meeting (only managers)
router.post('/', authenticateUser, isManager, meetingController.createMeeting);

// Get my meetings (manager or participant)
router.get('/', authenticateUser, meetingController.getMyMeetings);

// Get members of a specific service (MUST be before /:code to avoid conflict)
router.get('/service-members/:service', authenticateUser, meetingController.getServiceMembers);

// Get specific meeting by code
router.get('/:code', authenticateUser, meetingController.getMeetingByCode);

// Get LiveKit token for joining a room
router.get('/token/:code', authenticateUser, meetingController.getMeetingToken);

// End meeting for everyone (only manager)
router.post('/end/:code', authenticateUser, meetingController.endMeeting);

// Kick participant (Host only)
router.post('/kick/:code', authenticateUser, meetingController.kickParticipant);

// Update participant tracks (Mute/Camera off - Host only)
router.post('/update-track/:code', authenticateUser, meetingController.updateParticipantTrack);

// Recording routes
router.post('/recording/start/:code', authenticateUser, meetingController.startRecording);
router.post('/recording/stop/:code', authenticateUser, meetingController.stopRecording);

// Broadcast route
router.post('/broadcast/:code', authenticateUser, meetingController.broadcastData);

// Attendance monitoring
router.post('/attendance/mark/:code', authenticateUser, meetingController.markAttendance);

const RateLimit = require('express-rate-limit');

// Rate limiter for recording uploads (SEC-FIX: Allocation of Resources Without Limits)
const uploadLimiter = RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 uploads per 15 minutes
    message: { success: false, message: 'Too many recording uploads, please try again later.' }
});

// Upload a browser-recorded file and save it as a recording
router.post('/recording/upload/:code', authenticateUser, uploadLimiter, meetingController.uploadRecording);

module.exports = router;
