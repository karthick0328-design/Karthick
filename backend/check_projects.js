const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./models/Project');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const projects = await Project.find({}).lean();
        console.log(`Total Projects: ${projects.length}`);
        
        projects.forEach(p => {
            console.log(`[${p.category}] - Quote: ${p.quotedAmount} | Paid: ${p.paymentDetails?.paidAmount} | Status: ${p.status}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
