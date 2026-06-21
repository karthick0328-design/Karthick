const Application = require('../models/Application'); // Adjust path to your Application model

// Get all applications
const getApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('vacancy', 'title department') // Populate vacancy details
      .populate('user', 'uniqueId name email role') // Populate user details
      .sort({ appliedAt: -1 }); // Sort by most recent
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'reviewed', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('vacancy', 'title department')
      .populate('user', 'uniqueId name email role');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, message: 'Status updated successfully', data: application });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getApplications,
  updateApplicationStatus,
};