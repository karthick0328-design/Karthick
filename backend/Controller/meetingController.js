// file deepcode ignore NoRateLimitingForExpensiveWebOperation: uploadLimiter handles rate limit
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const { AccessToken } = require('livekit-server-sdk');
const { safeUnlink } = require('../utils/fileUtils');



/**
 * Escape special characters for use in a regular expression
 */
const escapeRegExp = (string) => {
    return String(string ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Generate a random meeting code (format: abc-defg-hij)
 */
const generateMeetingCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}-${part3}`;
};

/**
 * POST /api/meetings
 * Create a new meeting for a service
 */
exports.createMeeting = async (req, res) => {
    try {
        const { title, description, service, department, startTime, endTime } = req.body;
        const managerId = req.user.id;

        if (!title || (!service && !department) || !startTime) {
            return res.status(400).json({
                success: false,
                message: 'Title, (service or department), and start time are required'
            });
        }

        // Verify if user is a manager or head
        if (req.user.role === 'manager') {
            const userServ = req.user.service?.toLowerCase() || '';
            const targetServ = String(service || '').toLowerCase();

            if (service && userServ !== targetServ) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. You are the manager of ${req.user.service}, not ${service}.`
                });
            }
        } else if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'head') {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to create meetings'
            });
        }

        const meetingCode = generateMeetingCode();
        // Use the request origin (e.g., http://localhost:3000) if available, or fallback to a relative path
        const origin = req.headers.origin || 'http://localhost:3000';
        const meetingLink = `${origin}/meeting/${meetingCode}`;

        // Find all members of this service or department
        const filterValue = service || department;
        if (!filterValue) {
            return res.status(400).json({ success: false, message: 'Service or department required for invitations' });
        }

        let userQuery = { isActive: true };
        const userRole = (req.user.role || '').toLowerCase();
        const userDept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
        const userService = (req.user.service || '').toLowerCase();
        const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

        // A Sales Manager is someone in the Sales department who DOES NOT have a specific service focus.
        // Service Managers (assigned to NGS, DD, etc.) should be restricted to their own project teams.
        const isSalesDept = userDept.includes('sale') || 
                            userDept === 'services' || 
                            userDept === 'customer services' ||
                            ['sales and customer services', 'sales and customer support', 'customer services'].includes(userDept);
        
        const isSales = isSalesDept && !userService;

        // UPDATED: Restrict invitation scope for non-admin/non-sales managers
        if (userRole === 'manager' && !isSales && !isGlobalAdmin) {
            const Project = require('../models/Project');
            // Find all projects assigned to this manager
            const myProjects = await Project.find({ assignedTo: req.user.id })
                .select('teamLeadId teamMembers userId');
            
            const memberIds = new Set();
            myProjects.forEach(p => {
                if (p.teamLeadId) memberIds.add(p.teamLeadId.toString());
                if (p.teamMembers) p.teamMembers.forEach(id => memberIds.add(id.toString()));
                if (p.userId) memberIds.add(p.userId.toString()); // Client
            });
            
            userQuery._id = { $in: Array.from(memberIds) };
        } else {
            userQuery.$or = [
                { service: { $regex: new RegExp('^' + escapeRegExp(filterValue) + '$', 'i') } },
                { department: { $regex: new RegExp('^' + escapeRegExp(filterValue) + '$', 'i') } }
            ];
        }

        const members = await User.find(userQuery).select('_id name email');
        const participantIds = Array.from(new Set(members.map(m => m._id.toString())));

        const attendance = participantIds.map(uid => ({
            user: uid,
            status: 'pending'
        }));

        const meeting = new Meeting({
            title,
            description,
            service: service || null,
            department: department || null,
            managerId,
            startTime,
            endTime,
            meetingCode,
            meetingLink,
            participants: participantIds,
            attendance,
            status: 'scheduled'
        });

        await meeting.save();

        // Create notifications for all participants
        const notifications = members.map(member => ({
            recipientId: member._id,
            senderId: managerId,
            type: 'meeting_invite',
            title: `New Meeting: ${title}`,
            message: `You are invited to a meeting for ${filterValue} at ${new Date(startTime).toLocaleString()}. Link: ${meetingLink}`,
            metadata: {
                meetingId: meeting._id,
                meetingCode: meetingCode,
                meetingLink: meetingLink,
                startTime: startTime,
                service: service || null,
                department: department || null
            },
            actionUrl: `/meeting/${meetingCode}`
        }));

        await Notification.insertMany(notifications);

        // Emit real-time socket notification to each participant
        const io = req.app.get('io');
        if (io) {
            members.forEach(member => {
                io.to(`user_${member._id}`).emit('newNotification', {
                    type: 'meeting_invite',
                    title: `New Meeting: ${title}`,
                    message: `You are invited to a ${filterValue} meeting scheduled at ${new Date(startTime).toLocaleString()}. Code: ${meetingCode}`,
                    metadata: {
                        meetingId: meeting._id,
                        meetingCode: meetingCode,
                        meetingLink: meetingLink,
                        startTime: startTime,
                        service: service || null,
                        department: department || null
                    },
                    actionUrl: `/meeting/${meetingCode}`,
                    createdAt: new Date()
                });
            });
        }

        res.status(201).json({
            success: true,
            data: meeting,
            message: 'Meeting created and notifications sent to all service members'
        });

    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating meeting'
        });
    }
};

/**
 * GET /api/meetings
 * Get all meetings for the current user (either as manager or participant)
 */
exports.getMyMeetings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { service, department } = req.query;

        // Build a flexible query to include all meetings that the user should see:
        // 1. Where the user is the manager (host)
        // 2. Where the user is explicitly in the participants list
        const participantsOr = [
            { managerId: userId },
            { participants: userId }
        ];

        const userRole = (req.user.role || '').toLowerCase();
        const userDept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
        const userService = (req.user.service || '').toLowerCase();
        const isSales = (userDept.includes('sale') || userDept.includes('services')) && !userService;
        const isGlobalOversight = userRole === 'admin' || userRole === 'superadmin' || userRole === 'head';

        // 3. Broad service/department match is ONLY for Global Oversight (Admins/Sales Managers)
        if (isGlobalOversight || isSales) {
            if (service) {
                // Normalize service name: replace hyphens with spaces for regex matching
                const flexibleService = escapeRegExp(service).replace(/-/g, '[\\s-]');
                participantsOr.push({ service: { $regex: new RegExp('^' + flexibleService + '$', 'i') } });
            }
            if (department) {
                const flexibleDept = escapeRegExp(department).replace(/-/g, '[\\s-]');
                participantsOr.push({ department: { $regex: new RegExp('^' + flexibleDept + '$', 'i') } });
            }
        }

        const meetings = await Meeting.find({ $or: participantsOr })
            .populate('managerId', 'name email uniqueId')
            .sort({ startTime: -1 });

        // Strip out placeholder/simulated recordings — only return ones with real file URLs
        const cleaned = meetings.map(m => {
            const obj = m.toObject();
            obj.recordings = (obj.recordings || []).filter(
                r => r.url && !r.url.startsWith('#')
            );
            return obj;
        });

        res.status(200).json({
            success: true,
            data: cleaned
        });
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching meetings'
        });
    }
};

/**
 * GET /api/meetings/:code
 * Get meeting details by code
 */
exports.getMeetingByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const meeting = await Meeting.findOne({ meetingCode: code })
            .populate('managerId', 'name email uniqueId role department service')
            .populate('participants', 'name email uniqueId service role')
            .populate('attendance.user', 'name email uniqueId role service');

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // --- ENFORCE RESTRICTION ---
        const userId = req.user.id.toString();
        const userRole = (req.user.role || '').toLowerCase();
        const isHost = meeting.managerId._id.toString() === userId;
        const isParticipant = meeting.participants.some(p => p._id.toString() === userId);
        const isGlobalOversight = userRole === 'admin' || userRole === 'superadmin' || userRole === 'head';

        if (!isHost && !isParticipant && !isGlobalOversight) {
            // Check if it's a global sales manager who has oversight
            const hostRole = (meeting.managerId.role || '').toLowerCase();
            const hostDept = (meeting.managerId.department || '').toLowerCase().replace(/&/g, 'and');
            const hostService = (meeting.managerId.service || '').toLowerCase();
            const hostIsSales = (hostDept.includes('sale') || hostDept.includes('services')) && !hostService;

            if (!hostIsSales) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You are not invited to this private project meeting.'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: meeting
        });
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * GET /api/meetings/service-members/:service
 * Get all members of a specific service or department
 */
exports.getServiceMembers = async (req, res) => {
    try {
        const { service } = req.params;
        const { type } = req.query;

        // Decode to handle potential encoded spaces
        const decodedValue = decodeURIComponent(service).trim();

        console.log(`[Meeting Info] Searching for members. Type: ${type}, Value: "${decodedValue}"`);

        let query = { isActive: true };
        const userRole = (req.user.role || '').toLowerCase();
        
        // UPDATED: If the user is a non-sales Manager, restrict members to their own project teams
        if (userRole === 'manager') {
            const userDept = (req.user.department || '').toLowerCase().replace(/&/g, 'and');
            const userService = (req.user.service || '').toLowerCase();
            
            const isSalesDept = userDept.includes('sale') || 
                                userDept === 'services' || 
                                userDept === 'customer services' ||
                                ['sales and customer services', 'sales and customer support', 'customer services'].includes(userDept);
            
            const isSales = isSalesDept && !userService;
            const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';
            
            if (!isSales && !isGlobalAdmin) {
                const Project = require('../models/Project');
                // Find all projects assigned to this manager
                const myProjects = await Project.find({ assignedTo: req.user.id })
                    .select('teamLeadId teamMembers userId');
                
                const memberIds = new Set();
                myProjects.forEach(p => {
                    if (p.teamLeadId) memberIds.add(p.teamLeadId.toString());
                    if (p.teamMembers) p.teamMembers.forEach(id => memberIds.add(id.toString()));
                    if (p.userId) memberIds.add(p.userId.toString()); // Client/Reporter
                });
                
                query._id = { $in: Array.from(memberIds) };
            } else if (type === 'department') {
                query.department = { $regex: new RegExp('^' + escapeRegExp(decodedValue) + '$', 'i') };
            } else {
                query.service = { $regex: new RegExp('^' + escapeRegExp(decodedValue) + '$', 'i') };
            }
        } else {
            if (type === 'department') {
                query.department = { $regex: new RegExp('^' + escapeRegExp(decodedValue) + '$', 'i') };
            } else {
                query.service = { $regex: new RegExp('^' + escapeRegExp(decodedValue) + '$', 'i') };
            }
        }

        const members = await User.find(query).select('name email uniqueId role service department');

        const filterDesc = query._id ? 'project-restricted list' : (type || 'service');
        console.log(`[Meeting Info] Found ${members.length} members for ${filterDesc} "${decodedValue}"`);

        res.status(200).json({
            success: true,
            data: members
        });
    } catch (error) {
        console.error('Error fetching service members:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * GET /api/meetings/token/:code
 * Generate LiveKit token for the meeting
 */
exports.getMeetingToken = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;
        const userName = req.user.name || 'Anonymous';

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting not found'
            });
        }

        // --- TIME OVER CHECK ---
        const now = new Date();
        const startTime = new Date(meeting.startTime);
        // Use endTime if provided, otherwise default to 2 hours after start
        const endTime = meeting.endTime ? new Date(meeting.endTime) : new Date(startTime.getTime() + (2 * 60 * 60 * 1000));

        if (now > endTime || meeting.status === 'completed') {
            return res.status(403).json({
                success: false,
                message: 'This meeting has already ended.'
            });
        }
        // ------------------------

        // Security Check: Date/Time and Status check
        // We already have 'now' defined above
        if (meeting.status === 'completed' || meeting.status === 'cancelled') {
            return res.status(403).json({
                success: false,
                message: `The meeting has ${meeting.status}. You can no longer join.`
            });
        }

        if (meeting.endTime && now > new Date(meeting.endTime)) {
            // Buffer to allow finishing up (10 mins)
            if (now > new Date(new Date(meeting.endTime).getTime() + 10 * 60 * 1000)) {
                meeting.status = 'completed';
                await meeting.save();
                return res.status(403).json({
                    success: false,
                    message: 'The meeting time has expired. It is now closed.'
                });
            }
        }

        // SECURITY: Strict Join Logic (Particularly for separated services)
        const isHost = meeting.managerId.toString() === userId.toString();
        const isParticipant = meeting.participants.some(p => p.toString() === userId.toString());
        const userRole = (req.user.role || '').toLowerCase();
        const isGlobalOversight = userRole === 'admin' || userRole === 'superadmin' || userRole === 'head';

        if (!isHost && !isParticipant && !isGlobalOversight) {
            // Deny join if not invited, even if in same service/department
            const Host = await User.findById(meeting.managerId);
            const hostDept = (Host.department || '').toLowerCase().replace(/&/g, 'and');
            const hostService = (Host.service || '').toLowerCase();
            const hostIsSales = (hostDept.includes('sale') || hostDept.includes('services')) && !hostService;

            if (!hostIsSales) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This meeting is restricted to project invitees.'
                });
            }
        }


        const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !livekitUrl) {
            return res.status(200).json({
                success: true,
                isDemo: true,
                message: 'LiveKit configuration is missing in .env.'
            });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            // Append a suffix to ensure unique sessions even for the same user account
            identity: `${userId}_${Math.random().toString(36).substring(7)}`,
            name: userName,
        });



        at.addGrant({
            roomJoin: true,
            room: code,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            canUpdateOwnMetadata: true,
            canUpdateMetadata: isHost,
            roomAdmin: isHost, // Grant admin rights only to the meeting host
        });

        res.status(200).json({
            success: true,
            token: await at.toJwt(),
            serverUrl: livekitUrl
        });

    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating meeting token'
        });
    }
};
/**
 * POST /api/meetings/end/:code
 * End meeting for everyone (Host only)
 */
exports.endMeeting = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

        // Only the host or an admin can end the meeting for everyone
        if (meeting.managerId.toString() !== userId.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only host can end meeting for everyone' });
        }

        const { RoomServiceClient } = require('livekit-server-sdk');

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL;

        if (apiKey && apiSecret && livekitUrl) {
            try {
                const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
                await svc.deleteRoom(code);
                console.log(`[Meeting] Room ${code} deleted via LiveKit API`);
            } catch (lkErr) {
                console.error('[Meeting] Warning: Could not delete room on LiveKit server:', lkErr.message);
                // Continue anyway to update meeting status in DB
            }
        }

        meeting.status = 'completed';
        meeting.endTime = new Date();
        await meeting.save();

        res.status(200).json({ success: true, message: 'Meeting ended for everyone' });
    } catch (error) {
        console.error('Error ending meeting:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * POST /api/meetings/kick/:code
 * Kick a participant from the room (Host only)
 */
exports.kickParticipant = async (req, res) => {
    try {
        const { code } = req.params;
        const { identity } = req.body;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        if (meeting.managerId.toString() !== userId.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { RoomServiceClient } = require('livekit-server-sdk');
        const svc = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

        await svc.removeParticipant(code, identity);
        res.status(200).json({ success: true, message: 'Participant removed' });
    } catch (error) {
        console.error('Error kicking participant:', error);
        res.status(500).json({ success: false, message: 'Failed to kick participant' });
    }
};

/**
 * POST /api/meetings/update-track/:code
 * Mute/Unmute/Camera off a participant via server (Host only)
 */
exports.updateParticipantTrack = async (req, res) => {
    try {
        const { code } = req.params;
        const { identity, trackSid, muted } = req.body;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        if (meeting.managerId.toString() !== userId.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { RoomServiceClient } = require('livekit-server-sdk');
        const svc = new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

        if (muted) {
            await svc.mutePublishedTrack(code, identity, trackSid, true);
        } else {
            // Server side forced unmute is often restricted for privacy. 
            // We'll send a signal via data packet or socket to the client to request unmute.
            const io = req.app.get('io');
            if (io && typeof identity === 'string' && typeof trackSid === 'string') {
                const baseUserId = identity.split('_')[0];
                io.to(`user_${baseUserId}`).emit('meetingRequest', {
                    type: 'unmute_request',
                    meetingCode: code,
                    trackType: trackSid.includes('TR_A') ? 'audio' : 'video'
                });
            }
        }

        res.status(200).json({ success: true, message: `Action ${muted ? 'muted' : 'requested unmute'} initiated` });
    } catch (error) {
        console.error('Error updating track:', error);
        res.status(500).json({ success: false, message: 'Failed to update track' });
    }
};

/**
 * POST /api/meetings/recording/start/:code
 * Start recording (Host only)
 */
exports.startRecording = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        if (meeting.managerId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Only host can start recording' });

        if (meeting.isRecording) return res.status(400).json({ success: false, message: 'Meeting is already being recorded' });

        const livekitUrl = process.env.LIVEKIT_URL;
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        // If LiveKit is not configured, simulate it
        if (!livekitUrl || !apiKey || !apiSecret) {
            meeting.isRecording = true;
            meeting.recordings.push({
                startedAt: new Date(),
                url: '#simulated_no_config'
            });
            await meeting.save();
            return res.status(200).json({ success: true, message: 'Recording started (Simulated)', isSimulated: true });
        }

        try {
            const { EgressClient } = require('livekit-server-sdk');
            const path = require('path');
            const fs = require('fs');
            const egress = new EgressClient(livekitUrl, apiKey, apiSecret);

            const fileName = `${code}_${Date.now()}.mp4`;
            const recordingsDir = path.join(__dirname, '..', 'recordings');
            if (!fs.existsSync(recordingsDir)) {
                fs.mkdirSync(recordingsDir, { recursive: true });
            }
            const absoluteFilePath = path.join(recordingsDir, fileName);

            // Correct LiveKit Egress SDK v2 format:
            // Second arg must be { file: { filepath, fileType } } 
            const info = await egress.startRoomCompositeEgress(code, {
                file: {
                    filepath: absoluteFilePath,
                    fileType: 0 // 0 = DEFAULT (MP4)
                }
            });

            meeting.isRecording = true;
            meeting.recordings.push({
                egressId: info.egressId,
                startedAt: new Date(),
                url: `/api/recordings/${fileName}`
            });
            await meeting.save();
            res.status(200).json({ success: true, message: 'Recording started via Egress', egressId: info.egressId });
        } catch (egressErr) {
            console.error('Egress error details:', egressErr.message);
            // Fallback: browser-based recording handles the actual capture.
            // We still mark the session so the UI responds correctly.
            meeting.isRecording = true;
            meeting.recordings.push({
                startedAt: new Date(),
                url: '#simulated'
            });
            await meeting.save();
            return res.status(200).json({ success: true, message: 'Recording started (Browser-based fallback)', isSimulated: true });
        }
    } catch (error) {
        console.error('Error starting recording:', error);
        res.status(500).json({ success: false, message: 'Failed to start recording' });
    }
};

/**
 * POST /api/meetings/recording/stop/:code
 * Stop recording (Host only)
 */
exports.stopRecording = async (req, res) => {
    try {
        const { code } = req.params;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        if (meeting.managerId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Only host can stop recording' });

        if (!meeting.isRecording) return res.status(400).json({ success: false, message: 'Meeting is not being recorded' });

        const livekitUrl = process.env.LIVEKIT_URL;
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (livekitUrl && apiKey && apiSecret) {
            try {
                const { EgressClient } = require('livekit-server-sdk');
                const egress = new EgressClient(livekitUrl, apiKey, apiSecret);
                const lastRec = meeting.recordings[meeting.recordings.length - 1];
                if (lastRec && lastRec.egressId) {
                    await egress.stopEgress(lastRec.egressId);
                    lastRec.endedAt = new Date();
                }
            } catch (egressErr) {
                console.warn('Could not stop egress via SDK:', egressErr.message);
            }
        }

        meeting.isRecording = false;
        if (meeting.recordings.length > 0 && !meeting.recordings[meeting.recordings.length - 1].endedAt) {
            meeting.recordings[meeting.recordings.length - 1].endedAt = new Date();
        }
        await meeting.save();

        res.status(200).json({ success: true, message: 'Recording stopped' });
    } catch (error) {
        console.error('Error stopping recording:', error);
        res.status(500).json({ success: false, message: 'Failed to stop recording' });
    }
};

/**
 * POST /api/meetings/broadcast/:code
 * Send special data packet via Host (to all)
 */
exports.broadcastData = async (req, res) => {
    try {
        const { code } = req.params;
        const { data } = req.body;
        const userId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
        if (meeting.managerId.toString() !== userId.toString()) return res.status(403).json({ success: false, message: 'Only host can broadcast data' });

        const io = req.app.get('io');
        if (io) {
            io.to(`meeting_${code}`).emit('meetingUpdate', data);
        }

        res.status(200).json({ success: true, message: 'Data broadcasted' });
    } catch (error) {
        console.error('Error broadcasting data:', error);
        res.status(500).json({ success: false, message: 'Broadcast failed' });
    }
};

/**
 * POST /api/meetings/attendance/mark/:code
 * Mark a participant as present/absent (Host only)
 */
exports.markAttendance = async (req, res) => {
    try {
        const { code } = req.params;
        const { userId, status } = req.body; // status: 'present', 'absent', 'pending'
        const managerId = req.user.id;

        const meeting = await Meeting.findOne({ meetingCode: code });
        if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

        // Security check: only host can mark
        if (meeting.managerId.toString() !== managerId.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Only host can mark attendance' });
        }

        if (!meeting.attendance) meeting.attendance = [];

        if (!userId) return res.status(400).json({ success: false, message: 'User ID is required' });
        const targetUserId = String(userId);

        const index = meeting.attendance.findIndex(a => a.user.toString() === targetUserId);
        if (index === -1) {
            meeting.attendance.push({
                user: userId,
                status,
                markedAt: new Date(),
                markedBy: managerId
            });
        } else {
            meeting.attendance[index].status = status;
            meeting.attendance[index].markedAt = new Date();
            meeting.attendance[index].markedBy = managerId;
        }

        await meeting.save();
        res.status(200).json({ success: true, message: 'Attendance status updated' });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to update attendance' });
    }
};

// deepcode ignore NoRateLimitingForExpensiveWebOperation: rate limiter is applied on route level
const rateLimit = require('express-rate-limit');
const controllerRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

exports.uploadRecording = (req, res) => {
    controllerRateLimiter(req, res, async () => {
        try {
            const { code } = req.params;
            const userId = req.user.id;
            const durationMs = parseInt(req.query.durationMs || '0', 10);

            console.log(`[Meeting] 📥 Upload started for code: ${code} from user: ${userId}`);

            const meeting = await Meeting.findOne({ meetingCode: code });
            if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
            if (meeting.managerId.toString() !== userId.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
                return res.status(403).json({ success: false, message: 'Only host can upload recordings' });
            }

            const fs = require('fs');
            const path = require('path');

            const recordingsDir = path.join(__dirname, '..', 'recordings');
            if (!fs.existsSync(recordingsDir)) {
                fs.mkdirSync(recordingsDir, { recursive: true });
            }

            const contentType = req.get('Content-Type') || 'video/webm';
            const contentLength = parseInt(req.get('Content-Length') || '0', 10);

            // Limit upload size to 500MB
            const MAX_SIZE = 500 * 1024 * 1024;
            if (contentLength > MAX_SIZE) {
                return res.status(413).json({ success: false, message: 'Recording exceeds size limit (500MB)' });
            }

            const ext = contentType.includes('mp4') ? 'mp4' : 'webm';
            // Sanitize code and filename to prevent path traversal
            const safeCode = String(code).replace(/[^a-zA-Z0-9-]/g, '');
            const fileName = path.basename(`${safeCode}_${Date.now()}.${ext}`);
            const filePath = path.join(recordingsDir, fileName);

            // Security check: Ensure filePath is still within recordingsDir
            if (!filePath.startsWith(recordingsDir)) {
                return res.status(400).json({ success: false, message: 'Invalid file path' });
            }

            // deepcode ignore NoRateLimitingForExpensiveWebOperation: uploadLimiter handles rate limit
            const writeStream = fs.createWriteStream(filePath);
            let bytesReceived = 0;

            req.on('data', (chunk) => {
                bytesReceived += chunk.length;
                if (bytesReceived > MAX_SIZE) {
                    req.destroy();
                    writeStream.destroy();
                    safeUnlink(filePath);
                    if (!res.headersSent) res.status(413).json({ success: false, message: 'Upload terminated: Size limit exceeded' });

                }
            });

            req.pipe(writeStream);

            writeStream.on('finish', async () => {
                try {
                    if (bytesReceived === 0) {
                        safeUnlink(filePath);
                        if (!res.headersSent) res.status(400).json({ success: false, message: 'No file data received' });
                        return;
                    }


                    const recordingUrl = `/api/recordings/${fileName}`;
                    meeting.recordings = meeting.recordings || [];
                    meeting.recordings.push({
                        startedAt: new Date(Date.now() - durationMs),
                        endedAt: new Date(),
                        url: recordingUrl
                    });

                    // Clear simulated entries for this specific session if they exist
                    meeting.recordings = meeting.recordings.filter(r => r.url !== '#simulated' || (Date.now() - new Date(r.startedAt).getTime()) > 3600000);

                    await meeting.save();

                    console.log(`[Meeting] ✅ Browser recording saved: ${fileName} (${(bytesReceived / 1024 / 1024).toFixed(2)} MB)`);
                    if (!res.headersSent) res.status(200).json({ success: true, url: recordingUrl, message: 'Recording saved successfully' });
                } catch (saveErr) {
                    console.error('Error updating meeting with recording:', saveErr);
                    if (!res.headersSent) res.status(500).json({ success: false, message: 'Failed to update meeting metadata' });
                }
            });

            writeStream.on('error', (err) => {
                console.error('File write error:', err);
                if (!res.headersSent) res.status(500).json({ success: false, message: 'Disk write error' });
            });

            req.on('error', (err) => {
                console.error('Upload stream error:', err);
                writeStream.end();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                if (!res.headersSent) res.status(500).json({ success: false, message: 'Upload stream error' });
            });

        } catch (error) {
            console.error('Error in uploadRecording controller:', error);
            if (!res.headersSent) res.status(500).json({ success: false, message: 'Server error during upload initiation' });
        }
    });
};
