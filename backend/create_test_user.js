const mongoose = require('mongoose');
const User = require('./models/User');
const UserProfile = require('./models/UserProfile'); // Ensure profile exists
require('dotenv').config();

const mongoOptions = {
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
};

async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('Connected to MongoDB');

        const email = 'test@example.com';
        // Clear existing
        await User.deleteMany({ email });
        await UserProfile.deleteMany({ email });

        const user = new User({
            name: 'Test User',
            email: email,
            password: process.env.TEST_USER_PASSWORD || 'Fallback@Test1234', // Using env var for security
            role: 'user',
            branch: 'Main',
            country: 'Indian',
            // uniqueId will be auto-generated
        });

        await user.save();
        console.log('User created:', user.email);
        console.log('User ID:', user._id);
        console.log('User password hash:', user.password);

        // Create profile
        await UserProfile.create({
            userId: user._id,
            email: user.email,
            country: 'Indian',
            membershipType: ''
        });
        console.log('User Profile created');

        process.exit(0);
    } catch (error) {
        console.error('Error creating user:', error);
        process.exit(1);
    }
}

createTestUser();
