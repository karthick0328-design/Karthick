const asyncHandler = require('express-async-handler');
const FaceDetection = require('../models/FaceDetection');
const User = require('../models/User');
const winston = require('winston');

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'face-detection.log' }),
    ],
});

// Helper for Cosine Similarity
const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * @desc    Enroll user's face
 * @route   POST /api/face-detection/enroll
 * @access  Private
 */
const enrollFace = asyncHandler(async (req, res) => {
    const { embedding, image } = req.body;
    const userId = req.user.id;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Invalid face embedding data provided.'
        });
    }

    if (!image) {
        return res.status(400).json({
            success: false,
            message: 'Reference image is required for enrollment.'
        });
    }

    try {
        let faceData = await FaceDetection.findOne({ userId });

        if (faceData) {
            faceData.referenceEmbedding = embedding;
            faceData.referenceImage = image;
            faceData.isEnrolled = true;
            await faceData.save();
            logger.info(`Updated face enrollment for user ${req.user.email}`);
        } else {
            faceData = await FaceDetection.create({
                userId,
                referenceEmbedding: embedding,
                referenceImage: image,
                isEnrolled: true
            });
            logger.info(`Created face enrollment for user ${req.user.email}`);
        }

        // Sync with User model for backward compatibility
        await User.findByIdAndUpdate(userId, {
            faceEmbedding: embedding,
            profileImage: image
        });

        res.status(200).json({
            success: true,
            message: 'Face enrolled successfully',
            data: { isEnrolled: true }
        });
    } catch (error) {
        logger.error(`Enrollment Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Server error during face enrollment'
        });
    }
});

/**
 * @desc    Verify face against enrolled data
 * @route   POST /api/face-detection/verify
 * @access  Private
 */
const verifyFace = asyncHandler(async (req, res) => {
    const { embedding, image, deviceId, location } = req.body;
    const userId = req.user.id;

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Face embedding required for verification.'
        });
    }

    try {
        const faceData = await FaceDetection.findOne({ userId });

        if (!faceData || !faceData.isEnrolled) {
            return res.status(404).json({
                success: false,
                errorCode: 'NOT_ENROLLED',
                message: 'No face data found. Please enroll your face first.'
            });
        }

        const similarity = cosineSimilarity(embedding, faceData.referenceEmbedding);
        const THRESHOLD = 0.75; // Industry standard for face-api.js embeddings
        const isMatch = similarity >= THRESHOLD;

        // Log the attempt
        faceData.verificationLogs.push({
            image,
            similarity,
            status: isMatch ? 'success' : 'failure',
            deviceId,
            location
        });

        // Keep last 50 logs
        if (faceData.verificationLogs.length > 50) {
            faceData.verificationLogs.shift();
        }

        await faceData.save();

        if (isMatch) {
            logger.info(`Successful face verification for user ${req.user.email} (Score: ${similarity.toFixed(4)})`);
            res.status(200).json({
                success: true,
                message: 'Face verified successfully',
                similarity
            });
        } else {
            logger.warn(`Failed face verification for user ${req.user.email} (Score: ${similarity.toFixed(4)})`);
            res.status(401).json({
                success: false,
                errorCode: 'FACE_MISMATCH',
                message: 'Face verification failed. Please try again.',
                similarity
            });
        }
    } catch (error) {
        logger.error(`Verification Error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Server error during face verification'
        });
    }
});

/**
 * @desc    Get enrollment status
 * @route   GET /api/face-detection/status
 * @access  Private
 */
const getEnrollmentStatus = asyncHandler(async (req, res) => {
    try {
        const faceData = await FaceDetection.findOne({ userId: req.user.id }).select('isEnrolled updatedAt');
        res.status(200).json({
            success: true,
            data: {
                isEnrolled: faceData ? faceData.isEnrolled : false,
                lastUpdated: faceData ? faceData.updatedAt : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = {
    enrollFace,
    verifyFace,
    getEnrollmentStatus
};
