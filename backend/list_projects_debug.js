const mongoose = require('mongoose');
const Project = require('./models/Project');

async function listProjects() {
    await mongoose.connect('mongodb://localhost:27017/biology');
    const projects = await Project.find({});
    console.log(`Total Projects: ${projects.length}`);
    projects.forEach(p => {
        const hrReports = p.reports.filter(r => r.status.includes('HR')).length;
        console.log(`${p.uniqueId} | ${p.department} | Status: ${p.status} | HR Reports: ${hrReports}`);
        if (hrReports > 0) {
            p.reports.forEach(r => console.log(`  - Report Status: ${r.status}`));
        }
    });
    process.exit(0);
}
listProjects();
