const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for authenticated user
 * @access  Private
 */
router.get('/', authMiddleware, getNotifications);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read for authenticated user
 * @access  Private
 * @note    This route must come before /:id/read to avoid route conflicts
 */
router.patch('/read-all', authMiddleware, markAllAsRead);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.patch('/:id/read', authMiddleware, markAsRead);

module.exports = router;

