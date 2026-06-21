const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const fs = require('fs');

async function go() {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
        process.exit(1);
    }
    const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET);
    fs.writeFileSync('admin_token.txt', token);
    process.exit(0);
}
go();
