const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['REQUEST', 'PAYMENT', 'ORDER', 'APPROVED', 'DISPATCHED'],
    required: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  // Additional metadata for different notification types
  metadata: {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Material',
    },
    paymentId: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Compound index for efficient queries (unread notifications for a user)
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Compound index for user notifications sorted by date
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

