const mongoose = require('mongoose');

const vacancySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    service: { type: String, trim: true }, // Optional service field for specific hires
    description: { type: String },
    requirements: [{ type: String }],
    salaryRange: { type: String },               // e.g. "$70K-$90K"
    status: {
      type: String,
      enum: ['open', 'closed', 'interviewing'],
      default: 'open',
    },
    applicationsCount: { type: Number, default: 0 },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vacancy', vacancySchema);