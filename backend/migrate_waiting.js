const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
require('dotenv').config();

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/biology');
    const result = await Attendance.updateMany(
        { status: 'on-leave', isApproved: false },
        { $set: { status: 'waiting' } }
    );
    console.log(`Migrated ${result.modifiedCount} records from 'on-leave' to 'waiting'`);
    process.exit();
}

migrate();
