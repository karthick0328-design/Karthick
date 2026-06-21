const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');

async function debug() {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        const validServicesRegex = /ngs|drug-discovery|drug\sdiscovery|software\sdevelopment|software\sdevelope|microbiology|biochemistry|molecular\sbiology|modecular\sbiology/i;

        const projects = await Project.find({
            department: { $regex: validServicesRegex },
            'reports': {
                $elemMatch: { status: { $in: ['Escalated to HR', 'Accepted by HR'] } }
            }
        }).populate({
            path: 'messages.senderId',
            select: 'name email role department service'
        });

        console.log(`Found ${projects.length} projects`);

        projects.forEach(p => {
            console.log(`Project: ${p.uniqueId} (${p.department})`);
            console.log(`  Messages: ${p.messages.length}`);
            p.messages.forEach((msg, i) => {
                const sender = msg.senderId;
                console.log(`    [${i}] From: ${sender?.name} | Role: ${sender?.role} | Dept: ${sender?.department} | Service: ${sender?.service}`);
                console.log(`        Content: ${msg.content.substring(0, 50)}...`);
            });
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
