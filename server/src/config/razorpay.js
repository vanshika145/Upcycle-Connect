const Razorpay = require('razorpay');

/**
 * Initialize Razorpay instance
 * Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 */
let razorpayInstance = null;

const initializeRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️ Razorpay credentials not found in .env file');
    console.warn('   Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments');
    return null;
  }

  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('✅ Razorpay initialized successfully');
    return razorpayInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error);
    return null;
  }
};

const getRazorpayInstance = () => {
  if (!razorpayInstance) {
    razorpayInstance = initializeRazorpay();
  }
  return razorpayInstance;
};

module.exports = {
  initializeRazorpay,
  getRazorpayInstance,
};

