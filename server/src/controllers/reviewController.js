const ProviderReview = require('../models/ProviderReview');
const Request = require('../models/Request');
const User = require('../models/User');

/**
 * Create a review for a provider after completed exchange
 * POST /api/reviews
 */
const createReview = async (req, res) => {
  try {
    const { exchangeId, rating, review } = req.body;

    // Validate required fields
    if (!exchangeId || !rating) {
      return res.status(400).json({ 
        message: 'Exchange ID and rating are required' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5 || !Number.isInteger(parseFloat(rating))) {
      return res.status(400).json({ 
        message: 'Rating must be an integer between 1 and 5' 
      });
    }

    // Validate review length
    if (review && review.length > 200) {
      return res.status(400).json({ 
        message: 'Review must be 200 characters or less' 
      });
    }

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the exchange (Request)
    const exchange = await Request.findById(exchangeId)
      .populate('providerId', 'name email organization');

    if (!exchange) {
      return res.status(404).json({ message: 'Exchange not found' });
    }

    // Verify exchange ownership
    if (exchange.seekerId.toString() !== seeker._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only review exchanges you participated in' 
      });
    }

    // Verify exchange is completed (orderStatus === 'received')
    if (exchange.orderStatus !== 'received') {
      return res.status(400).json({ 
        message: 'You can only review completed exchanges' 
      });
    }

    // Check if review already exists for this exchange
    const existingReview = await ProviderReview.findOne({ exchange: exchangeId });
    if (existingReview) {
      return res.status(400).json({ 
        message: 'You have already reviewed this exchange' 
      });
    }

    // Create review
    const providerReview = new ProviderReview({
      provider: exchange.providerId._id,
      seeker: seeker._id,
      exchange: exchange._id,
      rating: parseInt(rating),
      review: review ? review.trim() : undefined,
    });

    await providerReview.save();

    // Recalculate provider's average rating
    await updateProviderRating(exchange.providerId._id);

    console.log(`✅ Review created: ${rating} stars for provider ${exchange.providerId.name}`);

    // Emit Socket.IO event to provider (optional bonus)
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const providerId = exchange.providerId._id.toString();
        socketIO.emitToUser(providerId, 'ratingUpdated', {
          averageRating: (await User.findById(exchange.providerId._id)).averageRating,
          totalReviews: (await User.findById(exchange.providerId._id)).totalReviews,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify provider via Socket.IO:', socketError);
    }

    res.status(201).json({
      message: 'Review submitted successfully',
      review: {
        id: providerReview._id.toString(),
        rating: providerReview.rating,
        review: providerReview.review,
        createdAt: providerReview.createdAt,
      },
    });
  } catch (error) {
    console.error('Create review error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error (unique constraint violation)
      return res.status(400).json({ 
        message: 'You have already reviewed this exchange' 
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get reviews for a provider
 * GET /api/reviews/provider/:providerId
 */
const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    const reviews = await ProviderReview.find({ provider: providerId })
      .populate('seeker', 'name college')
      .populate('exchange', 'materialId')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      reviews: reviews.map((review) => ({
        id: review._id.toString(),
        rating: review.rating,
        review: review.review,
        seeker: {
          name: review.seeker.name,
          college: review.seeker.college,
        },
        createdAt: review.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Helper function to recalculate provider's average rating
 */
const updateProviderRating = async (providerId) => {
  try {
    const reviews = await ProviderReview.find({ provider: providerId });
    
    if (reviews.length === 0) {
      // No reviews, set to default
      await User.findByIdAndUpdate(providerId, {
        averageRating: 0,
        totalReviews: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    const totalReviews = reviews.length;

    await User.findByIdAndUpdate(providerId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: totalReviews,
    });

    console.log(`✅ Updated provider ${providerId} rating: ${averageRating.toFixed(1)} (${totalReviews} reviews)`);
  } catch (error) {
    console.error('Error updating provider rating:', error);
  }
};

module.exports = {
  createReview,
  getProviderReviews,
  updateProviderRating,
};

