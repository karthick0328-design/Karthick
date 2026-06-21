const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const managers = await User.find({ role: 'manager' });
        console.log('MANAGERS_START');
        console.log(JSON.stringify(managers.map(m => ({ id: m._id, email: m.email, name: m.name, role: m.role, department: m.department, service: m.service })), null, 2));
        console.log('MANAGERS_END');
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkData();
