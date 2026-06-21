const mongoose = require('mongoose');
require('dotenv').config();
const PSC = require('./models/ProjectServiceComplaint');
const PSCR = require('./models/ProjectServiceComplaintReport');
const User = require('./models/User');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate what getReports does
    const admin = await User.findOne({ role: 'admin' });
    const user = { id: admin._id, role: admin.role };
    
    console.log('DEBUG: User Role:', user.role);
    
    const savedReports = await PSCR.find().populate('complaints').sort({ createdAt: -1 });
    console.log('DEBUG: Saved Reports Count:', savedReports.length);
    
    const allComplaints = await PSC.find().sort({ createdAt: -1 });
    console.log('DEBUG: Total Complaints Count:', allComplaints.length);
    if (allComplaints.length > 0) {
        console.log('DEBUG: First Complaint Status:', allComplaints[0].status);
    }
    
    const reportedComplaintIds = new Set();
    savedReports.forEach(r => {
        if (r.complaints) {
            r.complaints.forEach(c => {
                if (c && (c._id || c.id)) {
                    reportedComplaintIds.add((c._id || c.id).toString());
                }
            });
        }
    });
    console.log('DEBUG: Reported IDs Count:', reportedComplaintIds.size);
    
    const orphans = allComplaints.filter(c => !reportedComplaintIds.has(c._id.toString()));
    console.log('DEBUG: Orphans Count:', orphans.length);
    
    let reports = [...savedReports.map(r => r.toJSON ? r.toJSON() : r)];
    const isPriorityRole = user.role === 'admin' || user.role === 'head';
    
    if (orphans.length > 0 && isPriorityRole) {
        console.log('DEBUG: Creating synthetic report');
        reports.unshift({
            _id: 'live-audit',
            complaints: orphans
        });
    }
    
    const filteredReports = reports.map(r => {
        const json = r;
        if (!json.complaints) json.complaints = [];
        json.complaints = json.complaints.filter((c) => {
            if (!c) return false;
            if (user.role === 'admin') return true;
            return false;
        });
        return json;
    });
    
    const finalData = filteredReports.filter(r => r.complaints && r.complaints.length > 0);
    console.log('DEBUG: Final Data Reports Count:', finalData.length);
    if (finalData.length > 0) {
        console.log('DEBUG: First Report Complaints Count:', finalData[0].complaints.length);
    }

    process.exit(0);
}
debug();
