const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Project = require('./models/Project');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const project = await Project.findOne({ uniqueId: 'PRJ0037' });
        fs.writeFileSync('prj0037_full.json', JSON.stringify(project, null, 2));
        mongoose.connection.close();
        console.log('DONE');
    } catch (err) {
        console.error(err);
    }
}

checkData();
