const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        // Find the test project
        const project = await Project.findOne({ uniqueId: { $regex: /PRJ-TEST/ } });
        if (!project) {
            console.log("No test project found to add manager message to.");
            return;
        }

        // Find a manager
        const manager = await User.findOne({ role: 'manager' });
        if (!manager) {
            console.log("No manager found.");
            return;
        }

        console.log(`Adding manager message to project ${project.uniqueId}`);

        // Add a message from the manager
        project.messages.push({
            senderId: manager._id,
            content: 'This escalation requires urgent attention from the HR department regarding the safety protocol violation.',
            timestamp: new Date()
        });

        await project.save();
        console.log(`Added manager message to ${project.uniqueId}`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
