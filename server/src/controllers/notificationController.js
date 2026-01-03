const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Get all notifications for the authenticated user
 * GET /api/notifications
 */
const getNotifications = async (req, res) => {
  try {
    // Get user from authenticated request
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch notifications for this user, sorted by most recent first
    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 notifications
      .populate('metadata.requestId', 'materialId status orderStatus')
      .populate('metadata.materialId', 'title category');

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      userId: user._id,
      read: false,
    });

    // Format notifications for response
    const formattedNotifications = notifications.map((notif) => ({
      id: notif._id.toString(),
      type: notif.type,
      message: notif.message,
      read: notif.read,
      createdAt: notif.createdAt,
      metadata: {
        requestId: notif.metadata?.requestId?._id?.toString() || notif.metadata?.requestId?.toString() || undefined,
        materialId: notif.metadata?.materialId?._id?.toString() || notif.metadata?.materialId?.toString() || undefined,
        paymentId: notif.metadata?.paymentId || undefined,
      },
    }));

    res.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Mark a notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate notification ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    // Get user from authenticated request
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find notification and verify it belongs to the user
    const notification = await Notification.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or unauthorized' });
    }

    // Mark as read (only if not already read)
    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification._id.toString(),
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
        metadata: notification.metadata,
      },
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Mark all notifications as read for the authenticated user
 * PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    // Get user from authenticated request
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark all unread notifications as read
    const result = await Notification.updateMany(
      { userId: user._id, read: false },
      { read: true }
    );

    res.json({
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Helper function to create a notification
 * This is used by other controllers to create notifications
 */
const createNotification = async (userId, type, message, metadata = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      message,
      metadata,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
};

