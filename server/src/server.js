require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const { initializeCloudinary } = require('./config/cloudinary');

const PORT = process.env.PORT || 5000;

// Initialize Firebase
try {
  initializeFirebase();
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// Initialize Cloudinary
try {
  initializeCloudinary();
} catch (error) {
  console.error('❌ Failed to initialize Cloudinary:', error.message);
  // Cloudinary is not critical for server startup, but log the error
  console.warn('⚠️ Server will continue without Cloudinary. Image uploads will fail.');
}

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Start the server after MongoDB is connected
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();