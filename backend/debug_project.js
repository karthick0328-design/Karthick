const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function checkProject() {
    await mongoose.connect(process.env.MONGODB_URI);
    const id = '692a8ebb477bae4387e1154d';
    const project = await Project.findById(id);
    if (project) {
        console.log('Project found:');
        console.log(JSON.stringify({
            _id: project._id,
            uniqueId: project.uniqueId,
            status: project.status,
            paymentStatus: project.paymentStatus,
            assignedTo: project.assignedTo,
            department: project.department
        }, null, 2));
    } else {
        console.log('Project not found with ID: ' + id);
    }
    await mongoose.disconnect();
}

checkProject();
