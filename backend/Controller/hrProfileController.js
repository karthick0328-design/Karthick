const HRProfile = require('../models/HRProfile');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * GET /api/hr-profile/me
 * Get current HR manager's profile
 */
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        let profile = await HRProfile.findOne({ userId }).populate('userId', 'name email uniqueId role department branch');

        if (!profile) {
            // Create a default profile if it doesn't exist
            const user = await User.findById(userId);
            profile = await HRProfile.create({
                userId,
                contactEmail: user.email,
                contactPhone: user.phone || ''
            });
            profile = await profile.populate('userId', 'name email uniqueId role department branch');
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Error fetching HR profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
};

/**
 * PUT /api/hr-profile/me
 * Update current HR manager's profile
 */
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Prevent direct modification of restricted fields
        const restrictedFields = ['userId', '_id', 'createdAt', 'updatedAt'];
        restrictedFields.forEach(field => delete updates[field]);

        let profile = await HRProfile.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true, runValidators: true, upsert: true }
        ).populate('userId', 'name email uniqueId role department branch');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile
        });
    } catch (error) {
        console.error('Error updating HR profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile',
            error: error.message
        });
    }
};

/**
 * GET /api/hr-profile/:userId
 * Get profile of a specific HR manager (by search/admin)
 */
const getHRProfileById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const profile = await HRProfile.findOne({ userId }).populate('userId', 'name email uniqueId role department branch');

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Error fetching HR profile by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
};

/**
 * POST /api/hr-profile/upload-image
 * Upload profile image
 */
const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/profiles/${req.file.filename}`;

        const profile = await HRProfile.findOneAndUpdate(
            { userId },
            { $set: { profileImage: imageUrl } },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                imageUrl: profile.profileImage
            }
        });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading image',
            error: error.message
        });
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    getHRProfileById,
    uploadProfileImage
};
