const mongoose = require('mongoose');
const Project = require('./models/Project');

async function debugData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        const allProjects = await Project.find({});
        console.log(`Total projects in DB: ${allProjects.length}`);

        allProjects.forEach(p => {
            const hasEscalation = p.reports.some(r => r.status === 'Escalated to HR' || r.status === 'Accepted by HR');
            if (hasEscalation || p.reports.length > 0) {
                console.log(`Project: ${p.uniqueId}`);
                console.log(`  Dept: "${p.department}"`);
                console.log(`  Reports:`);
                p.reports.forEach((r, i) => {
                    console.log(`    [${i}] Title: "${r.title}" | Status: "${r.status}" | EscalatedAt: ${r.escalatedAt}`);
                });
            }
        });

        // Check if regex matches any existing depts
        const validServicesRegex = /ngs|drug.*discovery|software.*develop|microbiology|biochemistry|molec.*biol/i;
        const matchingDepts = await Project.distinct('department', { department: { $regex: validServicesRegex } });
        console.log('Departments matching regex:', matchingDepts);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugData();
