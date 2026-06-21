const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Adjust path to your User model

// MongoDB connection (replace with your URI)
const MONGO_URI = 'mongodb://localhost:27017/biology';
// Or 'mongodb+srv://...' for Atlas

async function fixUserPassword() {
  try {
    // Connect to DB
    await mongoose.connect(MONGO_URI, {
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
    });
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'jano@example.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user._id}) with current hash length: ${user.password.length}`);

    // Plain password to re-hash
    const plainPassword = process.env.PASSWORD;
    const newSalt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(plainPassword, newSalt);

    console.log(`New single hash: ${newHash.substring(0, 20)}... (length: ${newHash.length})`);

    // Update password directly, bypassing pre-save
    user.password = newHash;
    await user.save({ validateBeforeSave: false }); // Skip validation/middleware

    console.log('✅ Password updated successfully. Test login now.');
  } catch (error) {
    console.error('❌ Error fixing password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB');
  }
}

fixUserPassword();