require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const sam = await db.collection('users').findOne({ name: /sam/i });
    const fs = require('fs');
    fs.writeFileSync('sam_user.json', JSON.stringify(sam, null, 2));
    console.log('Sam user:', JSON.stringify({ name: sam?.name, role: sam?.role, department: sam?.department, service: sam?.service, uniqueId: sam?.uniqueId }, null, 2));
    process.exit(0);
}).catch(console.error);
