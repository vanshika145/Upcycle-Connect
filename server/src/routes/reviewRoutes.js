const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createReview,
  getProviderReviews,
} = require('../controllers/reviewController');

/**
 * @route   POST /api/reviews
 * @desc    Create a review for a provider after completed exchange
 * @access  Private
 */
router.post('/', authMiddleware, createReview);

/**
 * @route   GET /api/reviews/provider/:providerId
 * @desc    Get reviews for a specific provider
 * @access  Public
 */
router.get('/provider/:providerId', getProviderReviews);

module.exports = router;

