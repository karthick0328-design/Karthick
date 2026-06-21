const fs = require('fs');
const path = require('path');

/**
 * Securely deletes an evidence file from the system.
 * Throttling and authorization are handled by the caller.
 * @param {string} rootDir - The base directory for uploads.
 * @param {string} filename - The validated filename to remove.
 */
const secureEvidenceRemoval = (rootDir, filename) => {
    if (!filename || typeof filename !== 'string') return;
    
    // Final boundary check to prevent path traversal
    const safeFilename = path.basename(filename);
    const targetFile = path.join(rootDir, safeFilename);

    if (targetFile.startsWith(rootDir)) {
        fs.unlink(targetFile, (err) => {
            if (err) {
                // Skip logging if file is already gone
                if (err.code !== 'ENOENT') {
                    console.warn(`[SECURE-FS] Disk removal skipped for ${safeFilename}: ${err.message}`);
                }
            }
        });
    }
};

module.exports = { secureEvidenceRemoval };
