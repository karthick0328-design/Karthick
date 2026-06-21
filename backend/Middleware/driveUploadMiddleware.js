const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure drive upload directory exists
const driveUploadDir = path.join(__dirname, '../uploads/drive');
if (!fs.existsSync(driveUploadDir)) {
    fs.mkdirSync(driveUploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, driveUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'drive-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB per file
    }
});

module.exports = upload;
