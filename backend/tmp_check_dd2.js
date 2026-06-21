require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find({ department: /drug.*discovery/i }).toArray();
    console.log('Drug Discovery projects total:', projects.length);
    projects.forEach(p => {
        console.log('---');
        console.log('ID:', p.uniqueId);
        console.log('Status:', p.status);
        console.log('PaymentStatus:', p.paymentStatus);
        console.log('AssignedTo:', JSON.stringify(p.assignedTo));
        console.log('UserId:', p.userId);
    });
    process.exit(0);
}).catch(console.error);
