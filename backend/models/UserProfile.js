const mongoose = require('mongoose');

const previousExperienceSchema = new mongoose.Schema({
  prevCompany: { type: String, trim: true, default: '' },
  prevRole: { type: String, trim: true, default: '' },
  prevYearOfExperience: { type: String, trim: true, default: '' },
  category: { type: String, enum: ['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract', ''], default: '' }, // Made '' default for optional
});

const educationSchema = new mongoose.Schema({
  category: { type: String, enum: ["Bachelor's Degree", "Master's Degree", 'PhD', 'Diploma', 'Certificate', ''], default: "Bachelor's Degree" },
  degree: { type: String, trim: true, default: '' },
  institution: { type: String, trim: true, default: '' },
  year: { type: String, trim: true, default: '' },
});

const skillSchema = new mongoose.Schema({
  category: { type: String, enum: ['Technical Skills', 'Soft Skills', 'Certifications', 'Languages', 'Tools', ''], default: 'Technical Skills' },
  name: { type: String, trim: true, default: '' },
  level: { type: Number, min: 0, max: 100, default: 0 },
});

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  email: { type: String, required: true, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  isWhatsApp: { type: Boolean, default: false },
  address: { type: String, trim: true, default: '' },
  country: {
    type: String,
    enum: {
      values: ['Indian', 'Foreign', ''],
      message: 'Country must be either Indian, Foreign or empty',
    },
    trim: true,
    default: '',
  },
  branch: {
    type: String,
    trim: true,
    maxlength: [100, 'Branch must be less than 100 characters'],
    default: '',
  },
  location: { type: String, trim: true, default: '' }, // Added for location validation
  // ==== NEW FIELDS FOR 'OTHER' ACCOUNT TYPE (internal/employee) ====
  accountType: { type: String, enum: ['user', 'other', ''], trim: true, default: '' }, // Allows 'other' from frontend
  category: { type: String, enum: ['sales', 'Customer', 'Payment', 'finance', 'Software', 'Drug', 'NGS', 'Biochemistry', 'Microbiology', 'Moduclear', ''], trim: true, default: '' },
  position: { type: String, enum: ['HR', 'Manager', 'TL', 'Team Manager', 'Employee', ''], trim: true, default: '' },
  hrCertification: { type: String, trim: true, default: '' },
  yearsInHR: { type: String, trim: true, default: '' },
  teamSize: { type: String, trim: true, default: '' },
  managementExperience: { type: String, trim: true, default: '' },
  tlExperience: { type: String, trim: true, default: '' },
  numberOfTeam: { type: String, trim: true, default: '' },
  tmExperience: { type: String, trim: true, default: '' },
  overseenDepartments: { type: String, trim: true, default: '' },
  // ==== END NEW FIELDS ====
  employeeId: { type: String, trim: true, default: '' },
  designation: { type: String, trim: true, default: '' },
  dateOfJoining: { type: String, trim: true, default: '' },
  membershipType: { type: String, enum: ['student', 'scholar', 'faculty', 'industry', 'employee', ''], default: '' },
  department: { type: String, trim: true, default: '' },
  professionalRole: { type: String, trim: true, default: '' },
  company: { type: String, trim: true, default: '' },
  college: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  highestDegree: { type: String, enum: ['', 'Bachelor', 'Master', 'Ph.D.', 'PostDoc'], default: '' },
  currentYear: { type: String, trim: true, default: '' },
  passOutYear: { type: String, trim: true, default: '' },
  yearOfExperience: { type: String, trim: true, default: '' },
  previousExperiences: [previousExperienceSchema],
  education: [educationSchema],
  skills: [skillSchema],
  hubField: { type: String, enum: ['Research', 'Education', 'Industry', 'Healthcare', ''], default: '' },
  specialization: {
    type: String,
    enum: ['Biochemistry', 'Microbiology', 'Genetics', 'Biotechnology', 'Molecular Biology', 'Cell Biology', 'Bioinformatics', 'Immunology', 'Other', ''],
    default: ''
  },
  bio: { type: String, trim: true, default: '' },
  dob: { type: String, trim: true, default: '' },
  imageUrl: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserProfile', userProfileSchema);