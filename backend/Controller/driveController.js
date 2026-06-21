const { checkStorageLimit, registerFilesToDrive, MAX_STORAGE_BYTES } = require('../utils/driveUtils');
const Drive = require('../models/Drive');
const fs = require('fs');
const { safeUnlink, safeUnlinkMultiple } = require('../utils/fileUtils');


// Upload file(s)
const uploadFile = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const userId = req.user.id;
        const newFilesSize = req.files.reduce((acc, f) => acc + f.size, 0);

        const storageCheck = await checkStorageLimit(userId, newFilesSize);
        if (!storageCheck.allowed) {
            // Remove uploaded files safely
            safeUnlinkMultiple(req.files);
            return res.status(400).json({

                success: false,
                message: `Storage limit exceeded. Remaining storage: ${storageCheck.remainingMB} MB.`
            });
        }

        const { category = 'General', projectId = null } = req.body;
        const driveRecords = await registerFilesToDrive(userId, req.files, category, projectId);

        res.status(201).json({
            success: true,
            message: 'Files uploaded successfully',
            data: driveRecords
        });

    } catch (error) {
        console.error('Drive Upload Error:', error);
        res.status(500).json({ success: false, message: 'Server error uploading to drive' });
    }
};

// Get all files for user
const getFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await Drive.find({ userId }).sort({ createdAt: -1 });

        const totalUsed = files.reduce((acc, f) => acc + f.size, 0);

        res.status(200).json({
            success: true,
            count: files.length,
            data: files,
            storage: {
                used: totalUsed,
                limit: MAX_STORAGE_BYTES,
                percent: ((totalUsed / MAX_STORAGE_BYTES) * 100).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Drive Files Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching drive files' });
    }
};

// Delete file
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const file = await Drive.findOne({ _id: id, userId });
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found' });
        }

        // Remove from physical storage safely
        safeUnlink(file.path);


        await Drive.deleteOne({ _id: id });

        res.status(200).json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete Drive File Error:', error);
        res.status(500).json({ success: false, message: 'Server error deleting file' });
    }
};

// Get storage stats
const getStorageStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await Drive.find({ userId });
        const totalUsed = files.reduce((acc, f) => acc + f.size, 0);

        res.status(200).json({
            success: true,
            data: {
                used: totalUsed,
                limit: MAX_STORAGE_BYTES,
                percent: ((totalUsed / MAX_STORAGE_BYTES) * 100).toFixed(2)
            }
        });
    } catch (error) {
        console.error('Get Storage Stats Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching storage stats' });
    }
};

module.exports = {
    uploadFile,
    getFiles,
    deleteFile,
    getStorageStats
};
