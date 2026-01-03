const mongoose = require('mongoose');

const impactLogSchema = new mongoose.Schema({
  materialType: {
    type: String,
    required: true,
    enum: ['Chemicals', 'Glassware', 'Electronics', 'Metals', 'Plastics', 'Bio Materials', 'Other'],
    index: true,
  },
  quantityReused: {
    type: Number,
    required: true,
    min: 0,
  },
  co2Saved: {
    type: Number,
    required: true,
    min: 0,
  },
  wasteDiverted: {
    type: Number,
    required: true,
    min: 0,
  },
  moneySaved: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  seeker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true,
  },
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    unique: true, // One ImpactLog per request
  },
  completedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique constraint: one ImpactLog per completed request
impactLogSchema.index({ request: 1 }, { unique: true });

// Compound indexes for efficient queries
impactLogSchema.index({ seeker: 1, completedAt: -1 });
impactLogSchema.index({ provider: 1, completedAt: -1 });
impactLogSchema.index({ materialType: 1, seeker: 1 });
impactLogSchema.index({ materialType: 1, provider: 1 });

module.exports = mongoose.model('ImpactLog', impactLogSchema);

