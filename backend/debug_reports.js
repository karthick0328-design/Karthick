const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        // Find a manager and an employee/user
        const manager = await User.findOne({ role: 'manager' });
        const user = await User.findOne({ role: 'employee' }) || await User.findOne({ role: 'manager' }); // Fallback

        if (!manager || !user) {
            console.log('Could not find necessary users (manager/employee).');
            return;
        }

        const uniqueId = `PRJ-TEST-${Date.now()}`;

        const project = new Project({
            uniqueId: uniqueId,
            userId: user._id,
            department: 'Drug Discovery',
            category: 'Test Project',
            status: 'In Progress',
            assignedTo: [manager._id],
            reports: [{
                submittedBy: user._id,
                title: 'Urgent HR Issue',
                content: 'There is a conflict that needs HR attention immediately.',
                type: 'Issue',
                status: 'Escalated to HR',
                escalatedAt: new Date(),
                createdAt: new Date()
            }],
            messages: [{
                senderId: user._id,
                content: 'I have submitted the escalation report. Please check.',
                timestamp: new Date()
            }]
        });

        await project.save();
        console.log(`Created test project ${uniqueId} with escalated report.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
