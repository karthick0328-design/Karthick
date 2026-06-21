const mongoose = require('mongoose');

const uiSettingSchema = new mongoose.Schema({
    section: {
        type: String,
        enum: ['HiringSection', 'AdvertisementsSection', 'GlobalTheme'],
        required: true,
        unique: true
    },
    primaryColor: { type: String, default: '#611B9B' }, // Default Purple
    secondaryColor: { type: String, default: '#FFD100' }, // Default Gold
    accentColor: { type: String, default: '#FFFFFF' },
    fontFamily: { type: String, default: 'Inter' },
    backgroundPattern: { 
        type: String, 
        enum: ['None', 'Dots', 'Waves', 'Grid', 'Abstract'],
        default: 'Dots'
    },
    cardStyle: {
        type: String,
        enum: ['Curved', 'Sharp', 'Glass', 'Gradient'],
        default: 'Curved'
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('UISetting', uiSettingSchema);
