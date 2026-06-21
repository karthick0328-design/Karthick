const mongoose = require('mongoose');
require('dotenv').config();

const Drive = require('./models/Drive');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await Drive.countDocuments({ userId: '691adb1f7d723d6f19e24974' });
        console.log(`Count for Manager 691adb1f7d723d6f19e24974: ${count}`);
        
        const allCount = await Drive.countDocuments();
        console.log(`Total Drive Entries: ${allCount}`);

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkData();
