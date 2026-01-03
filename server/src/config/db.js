const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('authentication failed')) {
      console.error('💡 Tip: Check your MongoDB Atlas username and password');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Tip: Check your MongoDB Atlas connection string');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Tip: Check your network connection and MongoDB Atlas IP whitelist');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;