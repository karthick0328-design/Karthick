const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function check() {
    await mongoose.connect('mongodb://localhost:27017/biology');
    const pos = await Project.find({
        $or: [
            { category: 'Purchase Order' },
            { 'financialReview.requested': true }
        ]
    }).lean();
    console.log(JSON.stringify(pos, null, 2));
    process.exit(0);
}

check();
