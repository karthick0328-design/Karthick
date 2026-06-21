const mongoose = require('mongoose');
require('dotenv').config();
const ProjectServiceComplaint = require('./models/ProjectServiceComplaint');
const ProjectServiceComplaintReport = require('./models/ProjectServiceComplaintReport');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const complaints = await ProjectServiceComplaint.find();
        const reports = await ProjectServiceComplaintReport.find();
        console.log('Total Complaints:', complaints.length);
        console.log('Total Reports:', reports.length);
        if (complaints.length > 0) {
            console.log('Sample Complaint against:', complaints[0].againstName);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
