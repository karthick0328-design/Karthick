// Holiday Model (updated from provided snippet)
const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Holiday date is required'],
  },
  name: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['government', 'regular'],
    required: [true, 'Holiday type is required'],
  },
}, { timestamps: true });

holidaySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);