const User = require('../models/User');
const Conversation = require('../models/Conversation');

/**
 * GET /api/members
 * Get all members with specific fields
 */
exports.getAllMembers = async (req, res) => {
    try {
        const members = await User.find({ isActive: true })
            .select('uniqueId service department name phone email role')
            .sort({ name: 1 })
            .lean();


        res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching members'
        });
    }
};

/**
 * POST /api/members/start-chat
 * Get or create a direct conversation with a member
 */
exports.startDirectChat = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const currentUserId = req.user.id;

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: 'Target user ID is required' });
        }

        // Check if direct conversation already exists
        let conversation = await Conversation.findOne({
            type: 'direct',
            'members.userId': { $all: [currentUserId, targetUserId] }
        });

        if (!conversation) {
            // Create new direct conversation
            conversation = new Conversation({
                type: 'direct',
                members: [
                    { userId: currentUserId, role: 'member' },
                    { userId: targetUserId, role: 'member' }
                ],
                createdBy: currentUserId,
                name: 'Direct Chat' // Name is usually ignored for direct chats in UI
            });
            await conversation.save();
        }

        res.status(200).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Error starting direct chat:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
