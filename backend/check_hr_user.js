const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUser() {
    await mongoose.connect('mongodb://localhost:27017/biology');
    const users = await User.find({ name: /HR/i });
    console.log('HR Users found:', users.length);
    users.forEach(u => {
        console.log(`- Name: ${u.name} | Role: ${u.role} | Dept: ${u.department}`);
    });
    process.exit(0);
}
checkUser();
