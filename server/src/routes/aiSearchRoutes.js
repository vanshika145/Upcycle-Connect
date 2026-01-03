const express = require('express');
const router = express.Router();
const { aiSearch } = require('../controllers/aiSearchController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   POST /api/search/ai
 * @desc    AI-powered material search using Gemini
 * @access  Private (requires auth for location-based search)
 */
router.post('/ai', authMiddleware, aiSearch);

module.exports = router;

