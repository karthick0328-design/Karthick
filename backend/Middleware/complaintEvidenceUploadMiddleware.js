const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../uploads/complaint-evidence');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed file types for evidence
const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-zip-compressed',
];

const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.zip'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `evidence-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);

    console.log(`[MulterFilter] Processing file: ${file.originalname}, Mime: ${file.mimetype}, Ext: ${ext}, MimeAllowed: ${mimeAllowed}, ExtAllowed: ${extAllowed}`);

    if (mimeAllowed && extAllowed) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed. Supported: images, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP`), false);
    }
};

const complaintEvidenceUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 5,                    // max 5 files per upload
    }
});

module.exports = complaintEvidenceUpload;
