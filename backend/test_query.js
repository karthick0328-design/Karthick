const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
require('dotenv').config();

async function testQuery() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/biology');

    const query = {
        status: 'waiting',
        isApproved: false
    };

    const attendances = await Attendance.find(query);
    console.log('Query:', JSON.stringify(query));
    console.log('Results found:', attendances.length);
    attendances.forEach(a => {
        console.log(`ID: ${a._id}, Status: ${a.status}, isApproved: ${a.isApproved}`);
    });
    process.exit();
}

testQuery();
