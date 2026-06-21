const mongoose = require('mongoose');

const hrProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    bio: { type: String, trim: true, default: '' },
    specialization: [{ type: String, trim: true }],
    certifications: [{
        name: { type: String, trim: true },
        issuer: { type: String, trim: true },
        year: { type: String, trim: true }
    }],
    experienceYears: { type: Number, default: 0 },
    education: [{
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true }
    }],
    skills: [{ type: String, trim: true }],
    achievements: [{ type: String, trim: true }],
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    profileImage: { type: String, trim: true, default: '' },
    socialLinks: {
        linkedin: { type: String, trim: true, default: '' },
        twitter: { type: String, trim: true, default: '' }
    },
    bankingDetails: {
        bankName: { type: String, trim: true, default: '' },
        accountHolder: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        ifscCode: { type: String, trim: true, default: '' },
        branchName: { type: String, trim: true, default: '' }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

hrProfileSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('HRProfile', hrProfileSchema);
