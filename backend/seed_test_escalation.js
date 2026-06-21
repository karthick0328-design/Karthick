const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

async function seedEscalation() {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology', {
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
        });
        console.log('Connected to DB');

        // 1. Find a Drug Discovery manager to be the sender
        const manager = await User.findOne({ role: 'manager', service: /drug.*discovery/i });
        if (!manager) {
            console.log('No Drug Discovery manager found to act as sender');
            process.exit(1);
        }
        console.log(`Using manager: ${manager.name} (${manager._id})`);

        // 2. Find a Drug Discovery project
        const project = await Project.findOne({ department: 'Drug Discovery' });
        if (!project) {
            console.log('No Drug Discovery project found');
            process.exit(1);
        }
        console.log(`Using project: ${project.uniqueId} (${project._id})`);

        // 3. Add an escalated report
        project.reports.push({
            submittedBy: manager._id,
            title: 'Debug Escalation',
            content: 'This is a test escalation from a service manager.',
            type: 'Issue',
            status: 'Escalated to HR',
            escalatedAt: new Date(),
            managerRemarks: 'Please review this personnel issue.'
        });

        // 4. Add a message from the manager
        project.messages.push({
            senderId: manager._id,
            content: 'This is a critical message regarding the drug discovery project escalation.'
        });

        await project.save();
        console.log('Successfully seeded escalated report and message');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedEscalation();
