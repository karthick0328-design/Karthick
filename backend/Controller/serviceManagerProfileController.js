const ServiceManagerProfile = require('../models/ServiceManagerProfile');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * GET /api/service-manager-profile/me
 * Get current Service manager's profile
 */
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        let profile = await ServiceManagerProfile.findOne({ userId }).populate('userId', 'name email uniqueId role service branch phone seniority');

        if (!profile) {
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            profile = await ServiceManagerProfile.create({
                userId,
                contactEmail: user.email,
                contactPhone: user.phone || ''
            });
            profile = await profile.populate('userId', 'name email uniqueId role service branch phone seniority');
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Error fetching Service Manager profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
};

/**
 * PUT /api/service-manager-profile/me
 * Update current Service manager's profile
 */
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Prevent direct modification of restricted fields
        const restrictedFields = ['userId', '_id', 'createdAt', 'updatedAt'];
        restrictedFields.forEach(field => delete updates[field]);

        let profile = await ServiceManagerProfile.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true, runValidators: true, upsert: true }
        ).populate('userId', 'name email uniqueId role service branch phone');

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profile
        });
    } catch (error) {
        console.error('Error updating Service Manager profile:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile',
            error: error.message
        });
    }
};

/**
 * GET /api/service-manager-profile/:userId
 * Get profile of a specific Service manager
 */
const getServiceManagerProfileById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const profile = await ServiceManagerProfile.findOne({ userId }).populate('userId', 'name email uniqueId role service branch phone seniority');

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
        console.error('Error fetching Service Manager profile by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile',
            error: error.message
        });
    }
};

/**
 * POST /api/service-manager-profile/upload-image
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

        const profile = await ServiceManagerProfile.findOneAndUpdate(
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
    getServiceManagerProfileById,
    uploadProfileImage
};
