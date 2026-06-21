const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        // 1. Check the test project details
        const project = await Project.findOne({ uniqueId: { $regex: /PRJ-TEST/ } });
        if (project) {
            console.log(`Test Project Dept: "${project.department}"`);
        } else {
            console.log("Test Project not found.");
        }

        // 2. Check the manager 'Babu' (or whoever sent the message)
        // We get the senderId from the message we added
        if (project && project.messages.length > 0) {
            // The last message was added by manager
            const lastMsg = project.messages[project.messages.length - 1];
            const managerId = lastMsg.senderId;

            const manager = await User.findById(managerId);
            if (manager) {
                console.log(`Manager Name: ${manager.name}`);
                console.log(`Manager Role: ${manager.role}`);
                console.log(`Manager Service: "${manager.service}"`);
                console.log(`Manager Dept: "${manager.department}"`);

                // Test the matching logic
                const projectDept = (project.department || '').toLowerCase();
                const senderService = (manager.service || '').toLowerCase();
                const senderDept = (manager.department || '').toLowerCase();

                const match = (senderService && senderService.includes(projectDept)) ||
                    (projectDept && projectDept.includes(senderService)) ||
                    (senderDept && senderDept.includes(projectDept));

                console.log(`Match Result (frontend logic simulation): ${match}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
