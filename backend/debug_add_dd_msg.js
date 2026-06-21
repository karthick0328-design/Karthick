const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        // 1. Find the Test Project
        const project = await Project.findOne({ uniqueId: { $regex: /PRJ-TEST/ } });
        if (!project) { console.log('Project not found'); return; }
        console.log(`Project Dept: ${project.department}`);

        // 2. Find explicit Drug Discovery Manager
        // Using regex to be safe with casing or spaces
        const ddManager = await User.findOne({
            role: 'manager',
            $or: [
                { service: { $regex: /Drug Discovery/i } },
                { department: { $regex: /Drug Discovery/i } }
            ]
        });

        if (!ddManager) {
            console.log('No Drug Discovery Manager found! Creating one...');
            // Only create if needed, but 'sikki' should exist based on user prompt
        } else {
            console.log(`Found DD Manager: ${ddManager.name}, Service: ${ddManager.service}, Dept: ${ddManager.department}`);

            // 3. Add Message
            project.messages.push({
                senderId: ddManager._id,
                content: 'I am the Drug Discovery Service Manager. This is my official escalation remark.',
                timestamp: new Date()
            });

            await project.save();
            console.log('Added DD Manager message.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
