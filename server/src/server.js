require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const { initializeCloudinary } = require('./config/cloudinary');
const { initializeSocket } = require('./config/socket');
const { initializeRazorpay } = require('./config/razorpay');

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

// Initialize Razorpay
try {
  initializeRazorpay();
} catch (error) {
  console.error('❌ Failed to initialize Razorpay:', error.message);
  // Razorpay is not critical for server startup, but log the error
  console.warn('⚠️ Server will continue without Razorpay. Payments will fail.');
}

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Create HTTP server
    const httpServer = http.createServer(app);
    
    // Initialize Socket.IO
    const socketIO = initializeSocket(httpServer);
    
    // Make socketIO available globally for use in controllers
    app.set('socketIO', socketIO);
    
    // Start the server after MongoDB is connected
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO initialized and ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();