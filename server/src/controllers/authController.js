const { admin } = require('../config/firebase');
const User = require('../models/User');

// Register user with email/password (profile creation)
const register = async (req, res) => {
  try {
    const { name, email, role, organization, college, latitude, longitude } = req.body;

    // Validate required fields
    if (!name || !email || !role || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user in MongoDB
    const user = new User({
      name,
      email,
      role,
      authProvider: 'email',
      organization: role === 'provider' ? organization : undefined,
      college: role === 'seeker' ? college : undefined,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude], // Note: MongoDB uses [lng, lat]
      },
    });

    await user.save();
    
    console.log(`✅ User registered in MongoDB: ${user.email} (${user.role})`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        college: user.college,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Login with email/password (verify and return user)
const login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ User logged in from MongoDB: ${user.email} (${user.role})`);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        college: user.college,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google sign-in
const googleSignIn = async (req, res) => {
  try {
    const { name, email, role, organization, college, latitude, longitude } = req.body;

    // Validate required fields
    if (!email || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-create user for Google sign-in
      user = new User({
        name: name || 'Google User',
        email,
        role: role || 'seeker', // Default role
        authProvider: 'google',
        organization: role === 'provider' ? organization : undefined,
        college: role === 'seeker' ? college : undefined,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      });
      await user.save();
      console.log(`✅ Google user created in MongoDB: ${user.email} (${user.role})`);
    } else {
      console.log(`✅ Google user logged in from MongoDB: ${user.email} (${user.role})`);
    }

    res.json({
      message: 'Google sign-in successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        college: user.college,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user (protected route)
const getMe = async (req, res) => {
  try {
    // req.user is set by authMiddleware
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization,
        college: user.college,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  googleSignIn,
  getMe,
};