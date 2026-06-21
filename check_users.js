
const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String
}, { collection: 'users' });
const User = mongoose.model('User', UserSchema);

const checkUsers = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/biology');
        const roles = ['subadmin', 'employee', 'head', 'manager', 'tl', 'admin', 'superadmin'];
        const counts = await User.aggregate([
            { $match: { role: { $in: roles } } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        console.log('User counts by role:');
        console.log(JSON.stringify(counts, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
