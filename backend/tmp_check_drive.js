const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Drive = require('./models/Drive');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const latestDrive = await Drive.find().sort({ createdAt: -1 }).limit(10);
        fs.writeFileSync('drive_check_output.json', JSON.stringify(latestDrive, null, 2));
        mongoose.connection.close();
        console.log('DONE');
    } catch (err) {
        console.error(err);
    }
}

checkData();
