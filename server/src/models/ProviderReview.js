const mongoose = require('mongoose');

const providerReviewSchema = new mongoose.Schema({
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
  exchange: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    unique: true, // One review per exchange
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true,
  },
  review: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient queries
providerReviewSchema.index({ provider: 1, createdAt: -1 });
providerReviewSchema.index({ seeker: 1, exchange: 1 }, { unique: true });

module.exports = mongoose.model('ProviderReview', providerReviewSchema);

