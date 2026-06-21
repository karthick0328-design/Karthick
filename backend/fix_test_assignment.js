const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        // 1. Find Sikki (DD Manager)
        const sikki = await User.findOne({ name: 'sikki' });
        if (!sikki) { console.log('Sikki not found'); return; }

        // 2. Find the Test Project
        const project = await Project.findOne({ uniqueId: { $regex: /PRJ-TEST/ } });
        if (!project) { console.log('Project not found'); return; }

        // 3. Update assignedTo
        project.assignedTo = [sikki._id];
        await project.save();

        console.log(`Updated Project ${project.uniqueId} assignedTo -> ${sikki.name} (${sikki.role})`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
