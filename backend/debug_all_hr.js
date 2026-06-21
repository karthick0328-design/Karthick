const mongoose = require('mongoose');
const Project = require('./models/Project');

async function debug() {
    await mongoose.connect('mongodb://localhost:27017/biology');
    const projects = await Project.find({
        'reports.status': { $in: ['Escalated to HR', 'Accepted by HR'] }
    });
    console.log(`Found ${projects.length} projects total with HR status`);
    projects.forEach(p => {
        console.log(`- ${p.uniqueId} | Dept: ${p.department} | Reports: ${p.reports.length}`);
    });
    process.exit(0);
}
debug();
