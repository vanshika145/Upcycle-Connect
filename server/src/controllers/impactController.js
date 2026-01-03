const ImpactLog = require('../models/ImpactLog');
const User = require('../models/User');

/**
 * Get Seeker Impact Summary
 * GET /api/impact/seeker/summary
 */
const getSeekerImpactSummary = async (req, res) => {
  try {
    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can access this endpoint' });
    }

    // Aggregate impact data for seeker
    const summary = await ImpactLog.aggregate([
      {
        $match: {
          seeker: seeker._id,
        },
      },
      {
        $group: {
          _id: null,
          totalMaterialsReused: { $sum: 1 },
          totalCO2Saved: { $sum: '$co2Saved' },
          totalMoneySaved: { $sum: '$moneySaved' },
          totalWasteDiverted: { $sum: '$wasteDiverted' },
        },
      },
    ]);

    // Category-wise breakdown
    const categoryBreakdown = await ImpactLog.aggregate([
      {
        $match: {
          seeker: seeker._id,
        },
      },
      {
        $group: {
          _id: '$materialType',
          materialsReused: { $sum: 1 },
          co2Saved: { $sum: '$co2Saved' },
          moneySaved: { $sum: '$moneySaved' },
          wasteDiverted: { $sum: '$wasteDiverted' },
          quantityReused: { $sum: '$quantityReused' },
        },
      },
      {
        $sort: { wasteDiverted: -1 },
      },
    ]);

    // Category distribution (for charts)
    const categoryDistribution = categoryBreakdown.map((cat) => ({
      category: cat._id,
      percentage: summary[0]?.totalWasteDiverted > 0
        ? (cat.wasteDiverted / summary[0].totalWasteDiverted) * 100
        : 0,
      wasteDiverted: cat.wasteDiverted,
    }));

    const result = {
      totalMaterialsReused: summary[0]?.totalMaterialsReused || 0,
      totalCO2Saved: summary[0]?.totalCO2Saved || 0,
      totalMoneySaved: summary[0]?.totalMoneySaved || 0,
      categoryWiseBreakdown: categoryBreakdown.map((cat) => ({
        category: cat._id,
        materialsReused: cat.materialsReused,
        co2Saved: cat.co2Saved,
        moneySaved: cat.moneySaved,
        wasteDiverted: cat.wasteDiverted,
        quantityReused: cat.quantityReused,
      })),
      categoryDistribution,
    };

    res.json(result);
  } catch (error) {
    console.error('Get seeker impact summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get Provider Impact Summary
 * GET /api/impact/provider/summary
 */
const getProviderImpactSummary = async (req, res) => {
  try {
    // Get provider from authenticated user
    const provider = await User.findOne({ email: req.user.email });
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can access this endpoint' });
    }

    // Aggregate impact data for provider
    const summary = await ImpactLog.aggregate([
      {
        $match: {
          provider: provider._id,
        },
      },
      {
        $group: {
          _id: null,
          totalWasteDiverted: { $sum: '$wasteDiverted' },
          totalCO2Saved: { $sum: '$co2Saved' },
          peopleHelped: { $addToSet: '$seeker' }, // Unique seekers
        },
      },
    ]);

    // Category-wise waste diverted
    const categoryWiseWaste = await ImpactLog.aggregate([
      {
        $match: {
          provider: provider._id,
        },
      },
      {
        $group: {
          _id: '$materialType',
          wasteDiverted: { $sum: '$wasteDiverted' },
          co2Saved: { $sum: '$co2Saved' },
          materialsCount: { $sum: 1 },
        },
      },
      {
        $sort: { wasteDiverted: -1 },
      },
    ]);

    // Category-wise CO₂ saved
    const categoryWiseCO2 = await ImpactLog.aggregate([
      {
        $match: {
          provider: provider._id,
        },
      },
      {
        $group: {
          _id: '$materialType',
          co2Saved: { $sum: '$co2Saved' },
        },
      },
      {
        $sort: { co2Saved: -1 },
      },
    ]);

    const result = {
      totalWasteDiverted: summary[0]?.totalWasteDiverted || 0,
      totalCO2Saved: summary[0]?.totalCO2Saved || 0,
      peopleHelped: summary[0]?.peopleHelped?.length || 0,
      categoryWiseWaste: categoryWiseWaste.map((cat) => ({
        category: cat._id,
        wasteDiverted: cat.wasteDiverted,
        materialsCount: cat.materialsCount,
      })),
      categoryWiseCO2: categoryWiseCO2.map((cat) => ({
        category: cat._id,
        co2Saved: cat.co2Saved,
      })),
    };

    res.json(result);
  } catch (error) {
    console.error('Get provider impact summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get CO₂ Reduction Trend Over Time (Provider)
 * GET /api/impact/provider/co2-trend
 */
const getProviderCO2Trend = async (req, res) => {
  try {
    // Get provider from authenticated user
    const provider = await User.findOne({ email: req.user.email });
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (provider.role !== 'provider') {
      return res.status(403).json({ message: 'Only providers can access this endpoint' });
    }

    // Aggregate CO₂ saved by month/year
    const co2Trend = await ImpactLog.aggregate([
      {
        $match: {
          provider: provider._id,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
          },
          co2Saved: { $sum: '$co2Saved' },
          wasteDiverted: { $sum: '$wasteDiverted' },
          materialsCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Format for frontend
    const formattedTrend = co2Trend.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      monthName: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'long' }),
      label: `${new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short' })} ${item._id.year}`,
      co2Saved: item.co2Saved,
      wasteDiverted: item.wasteDiverted,
      materialsCount: item.materialsCount,
    }));

    res.json({
      trend: formattedTrend,
      totalCO2Saved: formattedTrend.reduce((sum, item) => sum + item.co2Saved, 0),
    });
  } catch (error) {
    console.error('Get provider CO₂ trend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSeekerImpactSummary,
  getProviderImpactSummary,
  getProviderCO2Trend,
};

