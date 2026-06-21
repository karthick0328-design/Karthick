// models/Counter.js (UPDATED: Removed { _id: false } to ensure proper handling of custom string _id and defaults; This fixes the undefined sequence issue during upsert)
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence: {
    type: Number,
    default: 0
  }
}, {}); // Removed { _id: false } - custom _id is handled by explicit definition

module.exports = mongoose.model('Counter', counterSchema);