const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
    index: true,
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  // Order flow status: pending → approved → paid → dispatched → received
  orderStatus: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'dispatched', 'received'],
    default: 'pending',
    index: true,
  },
  // Payment tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  paymentId: {
    type: String,
    trim: true,
  },
  paymentAmount: {
    type: Number,
    default: 0,
    min: 0,
  }, // Actual amount paid in ₹ (rupees, not paise)
  // Request details
  quantity: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    trim: true,
  },
  // Invoice
  invoiceUrl: {
    type: String,
    trim: true,
  },
  invoiceNumber: {
    type: String,
    trim: true,
  },
  // Timestamps
  approvedAt: {
    type: Date,
  },
  paidAt: {
    type: Date,
  },
  dispatchedAt: {
    type: Date,
  },
  receivedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt on save
requestSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for efficient queries
requestSchema.index({ materialId: 1, seekerId: 1 });
requestSchema.index({ providerId: 1, status: 1 });
requestSchema.index({ seekerId: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);

