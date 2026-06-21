const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

async function generateTokens() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.connection.collection('users');

        const hrManager = await User.findOne({
            role: 'manager',
            department: { $regex: /human|hr/i }
        });

        const financeManager = await User.findOne({
            role: 'manager',
            department: { $regex: /finance|financial/i }
        });

        console.log('\n--- HR Manager ---');
        if (hrManager) {
            const token = jwt.sign({
                id: hrManager._id,
                role: hrManager.role,
                department: hrManager.department,
                email: hrManager.email
            }, process.env.JWT_SECRET, { expiresIn: '7d' });
            console.log(`Name: ${hrManager.name}`);
            console.log(`UniqueId: ${hrManager.uniqueId}`);
            console.log(`Email: ${hrManager.email}`);
            console.log(`Token: ${token}`);
        } else {
            console.log('Not found');
        }

        console.log('\n--- Finance Manager ---');
        if (financeManager) {
            const token = jwt.sign({
                id: financeManager._id,
                role: financeManager.role,
                department: financeManager.department,
                email: financeManager.email
            }, process.env.JWT_SECRET, { expiresIn: '7d' });
            console.log(`Name: ${financeManager.name}`);
            console.log(`UniqueId: ${financeManager.uniqueId}`);
            console.log(`Email: ${financeManager.email}`);
            console.log(`Token: ${token}`);
        } else {
            console.log('Not found');
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

generateTokens();
