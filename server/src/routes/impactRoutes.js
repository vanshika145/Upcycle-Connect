const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getSeekerImpactSummary,
  getProviderImpactSummary,
  getProviderCO2Trend,
} = require('../controllers/impactController');

/**
 * @route   GET /api/impact/seeker/summary
 * @desc    Get impact summary for seeker (buyer/receiver)
 * @access  Private (Seeker only)
 */
router.get('/seeker/summary', authMiddleware, getSeekerImpactSummary);

/**
 * @route   GET /api/impact/provider/summary
 * @desc    Get impact summary for provider (seller/donor)
 * @access  Private (Provider only)
 */
router.get('/provider/summary', authMiddleware, getProviderImpactSummary);

/**
 * @route   GET /api/impact/provider/co2-trend
 * @desc    Get CO₂ reduction trend over time for provider
 * @access  Private (Provider only)
 */
router.get('/provider/co2-trend', authMiddleware, getProviderCO2Trend);

module.exports = router;

