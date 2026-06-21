const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const fs = require('fs');
        const allUsers = await User.find({}).select('name role uniqueId department service').lean();
        fs.writeFileSync('users_dump.json', JSON.stringify(allUsers, null, 2));
        console.log('Saved to users_dump.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

check();
