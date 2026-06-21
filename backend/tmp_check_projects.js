const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('_id uniqueId category department status workflowStep projectProgress paymentDetails createdAt')
      .lean();
    
    console.log(JSON.stringify(projects, null, 2));
    process.exit(0);
}
main();
