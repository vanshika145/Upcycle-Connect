const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['Chemicals', 'Glassware', 'Electronics', 'Metals', 'Plastics', 'Bio Materials', 'Other'],
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  priceUnit: {
    type: String,
    enum: ['per_unit', 'per_kg', 'per_box', 'per_set', 'total'],
    default: 'per_unit',
  },
  images: {
    type: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
    default: [],
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  status: {
    type: String,
    enum: ['available', 'requested', 'picked'],
    default: 'available',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for geospatial queries
materialSchema.index({ location: '2dsphere' });
// Index for provider queries
materialSchema.index({ providerId: 1, status: 1 });

module.exports = mongoose.model('Material', materialSchema);

