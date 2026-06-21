
// NEW: Send message from Service Manager to HR Manager
const sendMessageToHR = async (req, res) => {
    try {
        const { subject, message, projectId } = req.body;
        const managerId = req.user.id;

        console.log(`[${new Date().toISOString()}] Service Manager ${managerId} sending message to HR`);

        // Validation
        if (!subject || !message || String(subject).trim().length === 0 || String(message).trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Subject and message (min 10 chars) are required'
            });
        }

        const manager = await User.findById(managerId).select('name email uniqueId service department role');

        // Find HR Manager(s)
        // Looking for active managers in Human Resources department
        const hrManagers = await User.find({
            role: 'manager',
            isActive: true,
            $or: [
                { department: { $regex: /human\s*resources/i } },
                { department: { $regex: /^hr$/i } },
                { service: { $regex: /human\s*resources/i } } // Fallback
            ]
        }).select('_id name email uniqueId service department');

        if (hrManagers.length === 0) {
            console.warn(`[${new Date().toISOString()}] No HR Manager found.`);
            return res.status(404).json({
                success: false,
                message: 'No HR Manager found to receive this message.'
            });
        }

        // Pick the first available HR Manager (or broadcast? For now, pick first)
        const hrManager = hrManagers[0];
        console.log(`[${new Date().toISOString()}] Found HR Manager: ${hrManager.name}`);

        // Create Audit Event
        await AuditEvent.create({
            actorId: managerId,
            action: 'MANAGER_ESCALATE_TO_HR',
            targetType: 'User',
            targetId: hrManager._id,
            metadata: {
                subject,
                messagePreview: String(message).substring(0, 100),
                projectId: projectId || null
            }
        });

        // Chat Integration
        try {
            const conversation = await Conversation.findOne({
                type: 'direct',
                members: {
                    $all: [
                        { $elemMatch: { userId: managerId } },
                        { $elemMatch: { userId: hrManager._id } }
                    ]
                }
            });

            let conversationId;
            if (!conversation) {
                const newConv = new Conversation({
                    type: 'direct',
                    name: `Manager-HR: ${manager.name} ↔ ${hrManager.name}`,
                    members: [
                        { userId: managerId, role: 'member' },
                        { userId: hrManager._id, role: 'member' }
                    ],
                    contextStringType: 'Escalation',
                    contextStringValue: 'HR'
                });
                await newConv.save();
                conversationId = newConv._id;
            } else {
                conversationId = conversation._id;
            }

            const newMessage = new Message({
                conversationId,
                senderId: managerId,
                content: `**[ESCALATION] ${subject}**\n\n${message}${projectId ? `\n\n_Related to Project: ${projectId}_` : ''}`,
                contentType: 'text',
                metadata: {
                    subject,
                    projectId: projectId || null,
                    isEscalation: true
                }
            });
            await newMessage.save();

            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: newMessage._id,
                lastMessageAt: new Date()
            });

        } catch (chatError) {
            console.error('Chat creation error during HR escalation:', chatError);
        }

        res.status(200).json({
            success: true,
            message: 'Escalation message sent to HR Manager successfully.',
            data: { hrManager: { name: hrManager.name } }
        });

    } catch (error) {
        console.error('Error sending message to HR:', error);
        res.status(500).json({ success: false, message: 'Server error sending message to HR' });
    }
};

module.exports = {
    sendMessageToHR,
};
