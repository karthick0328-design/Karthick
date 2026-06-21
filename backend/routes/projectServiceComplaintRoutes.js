const express = require('express');
const router = express.Router();
const controller = require('../Controller/projectServiceComplaintController');
const { authenticateUser } = require('../Middleware/authMiddleware');
const complaintEvidenceUpload = require('../Middleware/complaintEvidenceUploadMiddleware');
const RateLimit = require('express-rate-limit');

// SEC-FIX: Rate limit expensive file deletions to prevent DoS
const deletionLimiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 deletions per window
  message: { success: false, message: "Too many deletion requests. Please try again later." }
});

router.use(authenticateUser);

// Generate report for a project
router.get('/generate/:projectId', controller.generateProjectReport);

// Get all reports (Role-filtered)
router.get('/reports', controller.getReports);

// Get my personal complaints (raised by me + against me)
router.get('/my-complaints', controller.getMyComplaints);

// Raise manual complaint (JSON body)
router.post('/manual', controller.raiseManualComplaint);

// ── EVIDENCE FILE UPLOAD ──────────────────────────────────────────────────────
// Upload 1-5 evidence files (multipart/form-data, field: "evidenceFiles")
// Optionally include complaintId in form body to auto-attach to existing complaint
router.post(
    '/evidence/upload',
    complaintEvidenceUpload.array('evidenceFiles', 5),
    (err, req, res, next) => {
        // Multer error handler
        if (err) {
            console.error(`[MulterError] ${err.message} for ${req.path}`);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    },
    controller.uploadComplaintEvidence
);

// Delete a single evidence file from a complaint (Rate Limited)
router.delete('/complaint/:complaintId/evidence/:filename', deletionLimiter, controller.deleteEvidenceFile);

// Update complaint status (Action ownership)
router.put('/complaint/:complaintId/status', controller.updateComplaintStatus);

// Get single complaint details (enriched, visibility-checked)
router.get('/complaint/:complaintId', controller.getComplaintDetails);

module.exports = router;
