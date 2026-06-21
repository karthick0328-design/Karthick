const mongoose = require('mongoose');

const initiativeSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['active', 'completed', 'pending'],
        default: 'pending'
    },
    deadline: { type: Date, required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    involvedEmployees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    description: { type: String },
    department: { type: String, required: true }, // To filter by department if needed
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Initiative', initiativeSchema);
