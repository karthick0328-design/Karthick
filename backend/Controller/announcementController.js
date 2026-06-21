const Announcement = require('../models/Announcement');

// Create a new announcement/advertisement
exports.createAnnouncement = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const body = { ...req.body, createdBy: userId };

        // Handle uploaded files
        if (req.files) {
            if (req.files['image']) body.image = req.files['image'][0].filename;
            if (req.files['attachment']) body.attachment = req.files['attachment'][0].filename;
        }

        const announcement = new Announcement(body);
        await announcement.save();
        res.status(201).json({ success: true, data: announcement });
    } catch (err) {
        console.error('Create announcement error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get all announcements (Admin view with filters)
exports.getAnnouncements = async (req, res) => {
    try {
        const { category, department, service, status } = req.query;
        let query = {};

        if (category) query.category = category;
        if (department) query.department = department;
        if (service) query.service = service;
        if (status) query.status = status;

        const limit = parseInt(req.query.limit) || 50;

        const announcements = await Announcement.find(query)
            .populate('createdBy', 'name email role')
            .sort({ publishDate: -1 })
            .limit(limit);

        res.status(200).json({ success: true, count: announcements.length, data: announcements });
    } catch (err) {
        console.error('Get announcements error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Get active public announcements for Homepage
exports.getPublicAnnouncements = async (req, res) => {
    try {
        // Find ones where showOnHomepage = true, status = Active, and expiry is null or > now
        const now = new Date();
        const announcements = await Announcement.find({
            status: 'Active', // Both must be active
            $and: [
                {
                    $or: [
                        { category: 'Job Opening' }, // Explicitly show all active jobs
                        { showOnHomepage: true, department: { $ne: 'Without Department' } } // Others follow rules
                    ]
                },
                {
                    $or: [
                        { expiresAt: null },
                        { expiresAt: { $gt: now } }
                    ]
                }
            ]
        }).sort({ publishDate: -1 });

        res.status(200).json({ success: true, count: announcements.length, data: announcements });
    } catch (err) {
        console.error('Get public announcements error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Update an announcement
exports.updateAnnouncement = async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.files) {
            if (req.files['image']) updateData.image = req.files['image'][0].filename;
            if (req.files['attachment']) updateData.attachment = req.files['attachment'][0].filename;
        }

        const announcement = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.status(200).json({ success: true, data: announcement });
    } catch (err) {
        console.error('Update announcement error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Delete an announcement
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Delete announcement error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Increment view count
exports.trackView = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id, 
            { $inc: { views: 1 } }, 
            { new: true }
        );
        if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
        
        // Emit socket update for real-time
        const io = req.app.get('io');
        if (io) {
            io.emit('announcement_update', { id: announcement._id, views: announcement.views });
        }
        
        res.status(200).json({ success: true, views: announcement.views });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Increment applications count
exports.trackApply = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id, 
            { $inc: { applicationsCount: 1 } }, 
            { new: true }
        );
        if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
        
        // Emit socket update for real-time
        const io = req.app.get('io');
        if (io) {
            io.emit('announcement_update', { id: announcement._id, applicationsCount: announcement.applicationsCount });
        }
        
        res.status(200).json({ success: true, applicationsCount: announcement.applicationsCount });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// UI Customization Settings
const UISetting = require('../models/UISetting');

exports.getUISettings = async (req, res) => {
    try {
        const settings = await UISetting.find({});
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        console.error('Get UI Settings error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.updateUISetting = async (req, res) => {
    try {
        const { section } = req.params;
        const updateData = req.body;
        
        const setting = await UISetting.findOneAndUpdate(
            { section }, 
            { ...updateData, updatedBy: req.user.id }, 
            { new: true, upsert: true }
        );
        
        res.status(200).json({ success: true, data: setting });
    } catch (err) {
        console.error('Update UI Setting error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
