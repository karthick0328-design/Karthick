const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Announcement', 'Advertisement', 'Job Opening'],
        required: true 
    },
    department: { type: String },
    service: { type: String },
    images: [{ type: String }],
    attachments: [{ type: String }],
    
    // For Job Openings
    jobTitle: { type: String },
    employmentType: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Contract'] },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'] },
    links: [{ type: String }],
    requirements: [{ type: String }],
    qualification: { type: String },
    openingsCount: { type: Number, default: 1 },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    currency: { type: String, default: 'INR' },
    expectedJoiningDate: { type: Date },
    autoClose: { type: Boolean, default: false },
    experienceLevel: { type: String },
    location: { type: String },
    applicationDeadline: { type: Date },
    applyLink: { type: String },
    requiredSkills: [{ type: String }],
    salaryRange: { type: String },
    platforms: [{ type: String }],
    budget: { type: String },
    duration: { type: Number },
    
    // New fields for specific Announcements update
    announcementType: { 
        type: String, 
        enum: ['Job opening alerts', 'Interview schedules', 'Policy updates', 'General company notifications'] 
    },
    scheduleType: { type: String, enum: ['Immediate', 'scheduled'] },
    scheduledDate: { type: Date },
    visibilityRole: [{ type: String }],
    visibilityDepartment: [{ type: String }],
    visibilityService: [{ type: String }],
    visibilityUser: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    publishDate: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    endingDate: { type: Date },
    showOnHomepage: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Inactive', 'Published', 'Expired'], default: 'Active' },
    views: { type: Number, default: 0 },
    applicationsCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
