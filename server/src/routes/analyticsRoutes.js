const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCategoryBreakdown,
  getCO2Monthly,
  getProviderMonthly,
} = require('../controllers/analyticsController');

/**
 * @route   GET /api/analytics/category-breakdown
 * @desc    Get category-wise waste reuse breakdown (global, all reused materials)
 * @access  Public (or Private if you want to restrict)
 */
router.get('/category-breakdown', getCategoryBreakdown);

/**
 * @route   GET /api/analytics/co2-monthly
 * @desc    Get month-wise CO₂ reduction (global, all reused materials)
 * @access  Public (or Private if you want to restrict)
 */
router.get('/co2-monthly', getCO2Monthly);

/**
 * @route   GET /api/analytics/provider/:providerId/monthly
 * @desc    Get provider-specific monthly impact data
 * @access  Private (authenticated users can view any provider's analytics)
 */
router.get('/provider/:providerId/monthly', authMiddleware, getProviderMonthly);

module.exports = router;

