require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find({ department: /drug.*discovery/i }).toArray();
    console.log('Drug Discovery projects total:', projects.length);
    projects.forEach(p => console.log(p.uniqueId, p.department, p.status, p.paymentStatus, p.assignedTo));
    process.exit(0);
}).catch(console.error);
