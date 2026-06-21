const mongoose = require('mongoose');
require('dotenv').config();

const Drive = require('./models/Drive');
const Project = require('./models/Project');
const User = require('./models/User');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const latestDrive = await Drive.find().sort({ createdAt: -1 }).limit(5);
        console.log('Latest Drive Entries:', JSON.stringify(latestDrive, null, 2));

        const managers = await User.find({ role: 'manager' }).limit(5);
        console.log('Managers:', JSON.stringify(managers.map(m => ({ id: m._id, email: m.email, name: m.name })), null, 2));

        const latestProjects = await Project.find().sort({ updatedAt: -1 }).limit(3);
        console.log('Latest Projects:', JSON.stringify(latestProjects.map(p => ({ 
            id: p._id, 
            uniqueId: p.uniqueId, 
            attachmentsCount: p.attachments ? p.attachments.length : 0,
            attachments: p.attachments
        })), null, 2));

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkData();
