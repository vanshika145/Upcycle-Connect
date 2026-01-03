const mongoose = require('mongoose');
const ImpactLog = require('../models/ImpactLog');
const User = require('../models/User');

/**
 * Get Category-wise Waste Reuse Breakdown (Global)
 * GET /api/analytics/category-breakdown
 * 
 * Aggregation Pipeline:
 * 1. Match all ImpactLog entries (all reused materials)
 * 2. Group by materialType (category)
 * 3. Sum quantityReused for each category
 * 4. Sort by total descending
 */
const getCategoryBreakdown = async (req, res) => {
  try {
    const categoryBreakdown = await ImpactLog.aggregate([
      // Stage 1: Match all ImpactLog entries (all are reused by definition)
      {
        $match: {},
      },
      // Stage 2: Group by materialType and sum quantities
      {
        $group: {
          _id: '$materialType',
          total: { $sum: '$quantityReused' },
          count: { $sum: 1 }, // Number of materials in this category
        },
      },
      // Stage 3: Sort by total descending
      {
        $sort: { total: -1 },
      },
      // Stage 4: Rename _id to category for cleaner response
      {
        $project: {
          _id: 0,
          category: '$_id',
          total: 1,
          count: 1,
        },
      },
    ]);

    res.json(categoryBreakdown);
  } catch (error) {
    console.error('Get category breakdown error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get Month-wise CO₂ Reduction (Global)
 * GET /api/analytics/co2-monthly
 * 
 * Aggregation Pipeline:
 * 1. Match all ImpactLog entries
 * 2. Extract year and month from completedAt
 * 3. Group by year-month
 * 4. Sum co2Saved for each month
 * 5. Sort chronologically
 */
const getCO2Monthly = async (req, res) => {
  try {
    const co2Monthly = await ImpactLog.aggregate([
      // Stage 1: Match all ImpactLog entries
      {
        $match: {},
      },
      // Stage 2: Extract year and month from completedAt
      {
        $project: {
          co2Saved: 1,
          year: { $year: '$completedAt' },
          month: { $month: '$completedAt' },
        },
      },
      // Stage 3: Group by year and month, sum CO₂ saved
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
          },
          co2: { $sum: '$co2Saved' },
          count: { $sum: 1 }, // Number of transactions
        },
      },
      // Stage 4: Sort chronologically (year first, then month)
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      // Stage 5: Format response
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          co2: { $round: ['$co2', 2] }, // Round to 2 decimal places
          count: 1,
        },
      },
    ]);

    res.json(co2Monthly);
  } catch (error) {
    console.error('Get CO₂ monthly error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get Provider-Specific Monthly Impact
 * GET /api/analytics/provider/:providerId/monthly
 * 
 * Aggregation Pipeline:
 * 1. Match ImpactLog entries for specific provider
 * 2. Extract year and month from completedAt
 * 3. Group by year-month
 * 4. Count reused materials and sum quantities
 * 5. Sort chronologically
 */
const getProviderMonthly = async (req, res) => {
  try {
    const { providerId } = req.params;

    // Validate providerId format
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ message: 'Invalid provider ID' });
    }

    // Verify provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(400).json({ message: 'User is not a provider' });
    }

    const providerMonthly = await ImpactLog.aggregate([
      // Stage 1: Match ImpactLog entries for this provider
      {
        $match: {
          provider: new mongoose.Types.ObjectId(providerId),
        },
      },
      // Stage 2: Extract year and month from completedAt
      {
        $project: {
          quantityReused: 1,
          year: { $year: '$completedAt' },
          month: { $month: '$completedAt' },
        },
      },
      // Stage 3: Group by year and month
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
          },
          materialsCount: { $sum: 1 }, // Count of reused materials
          totalQuantity: { $sum: '$quantityReused' }, // Sum of quantities
        },
      },
      // Stage 4: Sort chronologically
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      // Stage 5: Format response
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          materialsCount: 1,
          totalQuantity: { $round: ['$totalQuantity', 2] },
        },
      },
    ]);

    res.json(providerMonthly);
  } catch (error) {
    console.error('Get provider monthly error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getCategoryBreakdown,
  getCO2Monthly,
  getProviderMonthly,
};

