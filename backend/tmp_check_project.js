const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Project = require('./models/Project');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const latestProjects = await Project.find().sort({ updatedAt: -1 }).limit(10);
        fs.writeFileSync('project_check_output.json', JSON.stringify(latestProjects.map(p => ({
            id: p._id,
            uniqueId: p.uniqueId,
            updatedAt: p.updatedAt,
            attachments: p.attachments
        })), null, 2));
        mongoose.connection.close();
        console.log('DONE');
    } catch (err) {
        console.error(err);
    }
}

checkData();
