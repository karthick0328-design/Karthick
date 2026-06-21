require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    const projects = await db.collection('projects').find({ department: /drug.*discovery/i }).toArray();
    const fs = require('fs');
    fs.writeFileSync('dd_projects_output.json', JSON.stringify(projects, null, 2));
    console.log('Written', projects.length, 'projects to dd_projects_output.json');
    process.exit(0);
}).catch(console.error);
