const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function checkProject() {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692a8ebb477bae4387e1154d';
    const project = await Project.findById(id);
    if (project) {
        console.log('PAYMENT_STATUS=' + project.paymentStatus);
        console.log('STATUS=' + project.status);
        console.log('ASSIGNED_TO_COUNT=' + (project.assignedTo ? project.assignedTo.length : 0));
    } else {
        console.log('NOT FOUND');
    }
    await mongoose.disconnect();
}

checkProject();
