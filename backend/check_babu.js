const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        console.log('Connected to DB');

        const babu = await User.findOne({ name: 'Babu' }); // Adjust if name is different
        if (babu) {
            console.log(`User Babu: Role=${babu.role}, Service="${babu.service}", Dept="${babu.department}"`);
        } else {
            console.log("User Babu not found.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
