const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '../uploads');

/**
 * Safely deletes a file if it exists and is within the allowed uploads directory.
 * This prevents Path Traversal vulnerabilities.
 * @param {string} filePath - Path to the file to delete
 * @returns {boolean} - True if deletion was successful or file did not exist, false if access denied
 */
const safeUnlink = (filePath) => {
    if (!filePath) return true;

    try {
        const resolvedPath = path.resolve(filePath);

        // Ensure the path is within the allowed uploads directory
        if (!resolvedPath.startsWith(uploadsDir)) {
            console.warn(`[Security Warning] Blocked attempt to delete file outside uploads directory: ${resolvedPath}`);
            return false;
        }

        if (fs.existsSync(resolvedPath)) {
            fs.unlinkSync(resolvedPath);
        }
        return true;
    } catch (err) {
        console.error(`Error in safeUnlink for ${filePath}:`, err);
        return false;
    }
};

/**
 * Safely deletes multiple files from an array of file objects or paths.
 * @param {Array} files - Array of objects with 'path' property or array of strings
 */
const safeUnlinkMultiple = (files) => {
    if (!files || !Array.isArray(files)) return;

    files.forEach(file => {
        const filePath = typeof file === 'string' ? file : file.path;
        safeUnlink(filePath);
    });
};

module.exports = {
    safeUnlink,
    safeUnlinkMultiple,
    uploadsDir
};
