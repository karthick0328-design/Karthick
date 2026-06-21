require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const hrUsers = await User.find({
            role: { $in: ['manager', 'subadmin'] },
            department: { $regex: /hr|human/i }
        }).select('name email uniqueId role department');

        console.log('\n=== HR Managers/Subadmins ===');
        console.log(JSON.stringify(hrUsers, null, 2));

        const allManagers = await User.find({ role: 'manager' }).select('name email uniqueId role department');
        console.log('\n=== All Managers ===');
        console.log(JSON.stringify(allManagers, null, 2));

        process.exit(0);
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
