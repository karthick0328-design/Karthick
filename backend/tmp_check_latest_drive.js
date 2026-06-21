const mongoose = require('mongoose');
require('dotenv').config();

const Drive = require('./models/Drive');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const latestFiles = await Drive.find().sort({ createdAt: -1 }).limit(5);
        console.log('Latest Drive Files:', JSON.stringify(latestFiles, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
