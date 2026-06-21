const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JobApplication = require('../models/JobApplication');
const Announcement = require('../models/Announcement');

// Multer Storage for Resumes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/resumes/');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `Resume-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Invalid file type. Only PDF/DOC/DOCX allowed.'));
    }
});

// GET Public Job Openings
router.get('/job-openings', async (req, res) => {
  try {
    const jobs = await Announcement.find({ category: 'Job Opening', status: 'Active' }).sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Applying to a Job (Candidate)
router.post('/apply-job', upload.single('resume'), async (req, res) => {
  try {
    const { jobId, candidateName, candidateEmail, notes } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Resume is required' });

    const application = new JobApplication({
        jobId,
        candidateName,
        candidateEmail,
        resumeUrl: `/uploads/resumes/${req.file.filename}`,
        notes
    });

    await application.save();

    // Increment applicationsCount in Announcement
    await Announcement.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });

    res.status(201).json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error applying for job:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
