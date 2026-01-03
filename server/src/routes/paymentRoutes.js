const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
} = require('../controllers/paymentController');

/**
 * @route   POST /api/payments/create-order
 * @desc    Create a Razorpay order
 * @access  Private (Seeker only)
 */
router.post('/create-order', authMiddleware, createOrder);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify Razorpay payment signature
 * @access  Private (Seeker only)
 */
router.post('/verify', authMiddleware, verifyPayment);

module.exports = router;

