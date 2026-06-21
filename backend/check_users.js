const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/biology');
    const users = await User.find({ department: /hr|human/i });
    users.forEach(u => {
        console.log(`Name: ${u.name}, Role: ${u.role}, Department: '${u.department}'`);
    });
    process.exit();
}

checkUsers();
