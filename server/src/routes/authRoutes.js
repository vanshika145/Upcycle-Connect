const express = require('express');
const { register, login, googleSignIn, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleSignIn);

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;