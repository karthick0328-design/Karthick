const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        const project = await Project.findOne({ uniqueId: { $regex: /PRJ-TEST/ } })
            .populate({
                path: 'messages.senderId',
                select: 'name email role'
            });

        if (!project) {
            console.log("No test project found.");
            return;
        }

        console.log(`Project: ${project.uniqueId}`);
        console.log(`Messages Count: ${project.messages.length}`);

        project.messages.forEach((m, i) => {
            console.log(`Message ${i}:`);
            console.log(`  Content: ${m.content}`);
            console.log(`  Sender Populate:`, m.senderId);
            if (m.senderId) {
                console.log(`  Sender Role: '${m.senderId.role}'`);
            } else {
                console.log(`  Sender ID (Raw): ${m.senderId}`); // If populate failed, this might be null or the ID depending on mongoose version/config
            }
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
