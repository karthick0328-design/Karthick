const Drive = require('../models/Drive');
const fs = require('fs');
const path = require('path');

const MAX_STORAGE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const checkStorageLimit = async (userId, newFilesSize) => {
    const files = await Drive.find({ userId });
    const currentUsage = files.reduce((acc, f) => acc + (Number(f.size) || 0), 0);

    if (currentUsage + newFilesSize > MAX_STORAGE_BYTES) {
        return {
            allowed: false,
            remainingMB: ((MAX_STORAGE_BYTES - currentUsage) / (1024 * 1024)).toFixed(2)
        };
    }
    return { allowed: true };
};

const registerFilesToDrive = async (userId, files, category = 'General', projectId = null, targetUserId = null) => {
    const driveRecords = [];
    const userIds = [userId];
    const baseDir = path.dirname(__dirname); // e:\biology\backend

    if (targetUserId && targetUserId.toString() !== userId.toString()) {
        userIds.push(targetUserId);
    }
    console.log(`[Drive Utils] Processing ${files.length} files for users: ${userIds.join(', ')}`);

    for (const file of files) {
        // Ensure path is relative for the frontend
        const normalizedInputPath = file.path.replace(/\\/g, '/');
        const relativePath = normalizedInputPath.includes('uploads/') 
            ? 'uploads/' + normalizedInputPath.split('uploads/')[1] 
            : normalizedInputPath;

        // For file size check, we need the actual absolute path
        let fullPath = file.path;
        if (!path.isAbsolute(fullPath)) {
            fullPath = path.join(baseDir, fullPath);
        }

        let fileSize = Number(file.size) || 0;
        if (fileSize === 0 && fs.existsSync(fullPath)) {
            fileSize = fs.statSync(fullPath).size;
        }

        for (const uid of userIds) {
            // Check if this file is already registered for this user to avoid duplication
            const existing = await Drive.findOne({ userId: uid, path: relativePath });
            if (existing) continue;

            const driveEntry = new Drive({
                userId: uid,
                filename: file.filename || file.originalname || 'Document',
                originalName: file.originalname || file.filename || 'Document',
                mimetype: file.mimetype || 'application/octet-stream',
                size: fileSize,
                path: relativePath,
                category,
                projectId: projectId
            });
            await driveEntry.save();
            if (uid.toString() === userId.toString()) {
                driveRecords.push(driveEntry);
            }
        }
    }
    return driveRecords;
};

module.exports = {
    checkStorageLimit,
    registerFilesToDrive,
    MAX_STORAGE_BYTES
};
