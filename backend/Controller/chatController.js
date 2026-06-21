const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AuditEvent = require('../models/AuditEvent');
const User = require('../models/User');
const Project = require('../models/Project');

// Robust Service Normalization
const normalizeService = (str) => (str || '').toLowerCase().trim().replace(/[-\s]+/g, ' ');

// Get all conversations (Superadmin/Admin)
exports.getAllConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find()
            .sort({ lastMessageAt: -1 })
            .populate('lastMessage')
            .populate({
                path: 'members.userId',
                select: 'name email role service department'
            })
            .populate('relatedId', 'uniqueId category status');

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Error fetching all conversations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const isMember = (conversation, userId) => {
    return conversation.members.some(m => m.userId.toString() === userId.toString() && !m.muted);
};

const canAccessConversation = (conversation, user) => {
    const role = user.role.toLowerCase();
    if (role === 'superadmin' || role === 'admin') return true;
    return isMember(conversation, user.id);
};

// ... (remaining exports)

// Create a new conversation (Group, Direct, etc.)
exports.createConversation = async (req, res) => {
    try {
        const { type, name, members, relatedId, contextStringValue, description } = req.body;
        const creatorId = req.user.id;

        // TODO: Add detailed RBAC checks here based on type (e.g. only Manager can create Project Group)

        // Validate members exist
        const uniqueMemberIds = [...new Set([...members, creatorId])]; // Creator is auto-added

        const newConversation = new Conversation({
            type,
            name,
            description,
            relatedId,
            contextStringValue,
            createdBy: creatorId,
            members: uniqueMemberIds.map(uid => ({ userId: uid, role: uid === creatorId ? 'admin' : 'member' }))
        });

        await newConversation.save();

        // Audit Log
        await AuditEvent.create({
            actorId: creatorId,
            action: 'CREATE_CONVERSATION',
            targetType: 'Conversation',
            targetId: newConversation._id,
            metadata: { type, name }
        });

        res.status(201).json({ success: true, data: newConversation });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get my conversations
exports.getMyConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userService = req.user.service;

        let conversations = await Conversation.find({ 'members.userId': userId })
            .sort({ lastMessageAt: -1 })
            .populate('lastMessage')
            .populate({
                path: 'members.userId',
                select: 'name email role service department'
            })
            .populate('relatedId', 'uniqueId category status'); // Populate project details if linked

        // Deprecated restriction: Manager used to be limited to TLs of their own service.
        // Removed to support global member chat as requested.

        res.json({ success: true, data: conversations.map(c => c.toObject()) });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Send Message
exports.sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { content, attachments, actionType, actionData } = req.body;
        const senderId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

        if (!canAccessConversation(conversation, req.user)) {
            return res.status(403).json({ success: false, message: 'You are not a member of this chat' });
        }

        // HR Manager Check - Previously read-only, now allowed to send messages (Updated: Include human-resource)
        const normalizedDept = (req.user.department || '').toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
        const isHRManager = req.user.role === 'manager' && (normalizedDept.includes('human-resources') || normalizedDept === 'hr' || normalizedDept === 'human-resource');

        // Removed the check that forced HR Managers to be read-only as per user request.

        const newMessage = new Message({
            conversationId,
            senderId,
            content,
            attachments,
            actionRequired: !!actionType,
            actionType,
            actionData
        });

        await newMessage.save();

        conversation.lastMessage = newMessage._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        await newMessage.populate('senderId', 'name email role service');

        // Emit Socket Event
        const io = req.app.get('io');
        if (io) {
            // 1. Emit to the conversation room (for active chat windows)
            io.to(`conversation_${conversationId}`).emit('newMessage', newMessage);

            // 2. Emit to each member's personal room (for global notifications in headers)
            conversation.members.forEach(member => {
                const targetRoom = `user_${member.userId}`;
                io.to(targetRoom).emit('newMessage', newMessage);
            });
        }

        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get Messages
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, beforeId } = req.query;

        // Member check
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
        if (!canAccessConversation(conversation, req.user)) return res.status(403).json({ success: false, message: 'Access denied' });

        const query = { conversationId };
        if (beforeId) {
            query._id = { $lt: beforeId };
        }

        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('senderId', 'name email role service');

        // Filter: If user is manager, filter out messages from TLs of other services (only for non-direct chats)
        if (conversation.type !== 'direct' && req.user.role === 'manager' && req.user.service) {
            const normalizedManagerService = normalizeService(req.user.service);
            messages = messages.filter(msg => {
                const sender = msg.senderId;
                if (sender && sender.role === 'tl') {
                    const senderService = normalizeService(sender.service);
                    if (senderService && senderService !== normalizedManagerService) {
                        return false; // Hide this message
                    }
                }
                return true;
            });
        }

        res.json({ success: true, data: messages.map(m => m.toObject()).reverse() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Approve Action (Financial/HR) - Stub
exports.performAction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { decision } = req.body; // 'approved', 'rejected'
        const userId = req.user.id;

        const message = await Message.findById(messageId);
        if (!message || !message.actionRequired) return res.status(400).json({ success: false, message: 'Invalid action message' });

        // Verify User Role vs Action Type
        if (message.actionType === 'approve_funds') {
            // Check if user is Financial Manager
            // ... verify role ...
        }

        message.actionStatus = decision === 'approved' ? 'completed' : 'rejected';
        message.actionPerformedBy = userId;
        await message.save();

        // Log Audit
        await AuditEvent.create({
            actorId: userId,
            action: `ACTION_${String(decision).toUpperCase()}`,
            targetType: 'Message',
            targetId: messageId,
            metadata: { actionType: message.actionType }
        });

        res.json({ success: true, data: message });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Upload Attachment
exports.uploadAttachment = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Construct URL
        const fileUrl = `/uploads/chat/${req.file.filename}`;

        res.json({
            success: true,
            data: {
                url: fileUrl,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};
