const mongoose = require('mongoose');

const faceVerificationLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    image: { type: String }, // Base64 of the attempt
    similarity: { type: Number },
    status: { type: String, enum: ['success', 'failure'] },
    deviceId: { type: String },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    }
});

const faceDetectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    referenceEmbedding: {
        type: [Number],
        required: true
    },
    referenceImage: {
        type: String, // Base64 or URL
        required: true
    },
    isEnrolled: {
        type: Boolean,
        default: true
    },
    verificationLogs: [faceVerificationLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('FaceDetection', faceDetectionSchema);
