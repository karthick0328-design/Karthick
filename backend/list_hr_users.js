const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb://localhost:27017/biology';

async function listUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const hrManager = await User.findOne({ email: 'hr.manager@maduraibioscience.org' });
        const serviceManager = await User.findOne({ email: 'manager.drugdiscovery@maduraibioscience.org' });

        console.log('=== HR MANAGER ===');
        if (hrManager) {
            console.log('Name:', hrManager.name);
            console.log('Email:', hrManager.email);
            console.log('UniqueID:', hrManager.uniqueId);
            console.log('Role:', hrManager.role);
            console.log('Department:', hrManager.department);
        } else {
            console.log('NOT FOUND');
        }

        console.log('\n=== SERVICE MANAGER ===');
        if (serviceManager) {
            console.log('Name:', serviceManager.name);
            console.log('Email:', serviceManager.email);
            console.log('UniqueID:', serviceManager.uniqueId);
            console.log('Role:', serviceManager.role);
            console.log('Service:', serviceManager.service);
        } else {
            console.log('NOT FOUND');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listUsers();
