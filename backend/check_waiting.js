const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const User = require('./models/User');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/biology');
    const waitingAttendances = await Attendance.find({ status: 'on-leave', isApproved: false });
    console.log('Waiting Attendances:', waitingAttendances.length);
    waitingAttendances.forEach(a => {
        console.log(`ID: ${a._id}, Status: ${a.status}, isApproved: ${a.isApproved}, User: ${a.userId}`);
    });
    process.exit();
}

check();
