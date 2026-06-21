const mongoose = require('mongoose');
const Project = require('./models/Project');

async function checkEscalations() {
    await mongoose.connect('mongodb://localhost:27017/biology');
    const allProjects = await Project.find({});
    console.log('Total Projects:', allProjects.length);

    const escalated = allProjects.filter(p =>
        p.reports.some(r => r.status === 'Escalated to HR' || r.status === 'Accepted by HR')
    );

    console.log('Total Escalated Projects:', escalated.length);
    escalated.forEach(p => {
        console.log(`- ID: ${p.uniqueId} | Dept: "${p.department}"`);
        p.reports.forEach(r => {
            if (r.status === 'Escalated to HR' || r.status === 'Accepted by HR') {
                console.log(`  Report: ${r.title} | Status: ${r.status}`);
            }
        });
    });

    process.exit(0);
}
checkEscalations();
