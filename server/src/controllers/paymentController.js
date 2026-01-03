const { getRazorpayInstance } = require('../config/razorpay');
const Request = require('../models/Request');
const User = require('../models/User');

/**
 * Create a Razorpay order for payment
 */
const createOrder = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category price priceUnit quantity')
      .populate('providerId', 'name organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify seeker owns this request
    if (request.seekerId.toString() !== seeker._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only create orders for your own requests' 
      });
    }

    // Verify request is approved
    if (request.status !== 'approved' || request.orderStatus !== 'approved') {
      return res.status(400).json({ 
        message: 'Request must be approved before payment' 
      });
    }

    // Check if payment already completed
    if (request.paymentStatus === 'paid') {
      return res.status(400).json({ 
        message: 'Payment already completed for this request' 
      });
    }

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ 
        message: 'Payment gateway not configured. Please contact support.' 
      });
    }

    // Calculate payment amount based on material price and requested quantity
    const material = request.materialId;
    const materialPrice = material.price || 0;
    const priceUnit = material.priceUnit || 'total';
    
    // Parse requested quantity to extract numeric value
    // e.g., "5 kg" -> 5, "10 pieces" -> 10, "2 boxes" -> 2
    const requestedQuantityStr = request.quantity || '1';
    const quantityMatch = requestedQuantityStr.match(/(\d+(?:\.\d+)?)/);
    const requestedQuantity = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
    
    // Calculate total amount based on price unit
    let totalAmount = 0;
    if (priceUnit === 'total') {
      // Total price regardless of quantity
      totalAmount = materialPrice;
    } else {
      // Price per unit/kg/box/set * requested quantity
      totalAmount = materialPrice * requestedQuantity;
    }
    
    // Convert to paise (Razorpay uses smallest currency unit)
    // Round to 2 decimal places first, then convert to paise
    const amountInPaise = Math.round(totalAmount * 100);
    
    // Minimum amount is 1 paise (₹0.01)
    const amount = Math.max(1, amountInPaise);
    
    // Generate short receipt (max 40 chars for Razorpay)
    // Format: REQ + last 12 chars of request ID + timestamp (last 6 digits)
    const requestIdShort = request._id.toString().slice(-12);
    const timestampShort = Date.now().toString().slice(-6);
    const receipt = `REQ${requestIdShort}${timestampShort}`; // Max 21 chars
    
    const options = {
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: {
        requestId: request._id.toString(),
        materialTitle: request.materialId.title,
        seekerName: seeker.name,
        providerName: request.providerId.name,
        quantity: request.quantity,
      },
    };

    const order = await razorpay.orders.create(options);

    console.log(`✅ Razorpay order created: ${order.id} for request ${request._id}`);

    res.json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      keyId: process.env.RAZORPAY_KEY_ID, // Send key ID to frontend
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    
    if (error.error && error.error.description) {
      return res.status(400).json({ 
        message: error.error.description 
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Verify Razorpay payment signature and update request
 */
const verifyPayment = async (req, res) => {
  try {
    const { requestId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!requestId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        message: 'Missing required payment details' 
      });
    }

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category')
      .populate('providerId', 'name email organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify seeker owns this request
    if (request.seekerId.toString() !== seeker._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only verify payments for your own requests' 
      });
    }

    // Get Razorpay instance
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return res.status(500).json({ 
        message: 'Payment gateway not configured' 
      });
    }

    // Verify payment signature
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.error('❌ Payment signature verification failed');
      return res.status(400).json({ 
        message: 'Payment verification failed. Invalid signature.' 
      });
    }

    // Get the Razorpay payment to get the actual amount paid
    let paymentAmount = 0;
    
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      // Razorpay returns amount in paise, convert to rupees
      paymentAmount = payment.amount / 100;
    } catch (paymentError) {
      console.warn('⚠️ Could not fetch payment amount from Razorpay, using order amount');
      // Fallback: use order amount if payment fetch fails
      try {
        const order = await razorpay.orders.fetch(razorpay_order_id);
        paymentAmount = order.amount / 100;
      } catch (orderError) {
        console.error('⚠️ Could not fetch order amount, defaulting to 0');
        paymentAmount = 0;
      }
    }

    // Update request with payment details
    request.paymentStatus = 'paid';
    request.paymentId = razorpay_payment_id;
    request.paymentAmount = paymentAmount;
    request.orderStatus = 'paid';
    request.paidAt = new Date();
    await request.save();

    console.log(`✅ Payment verified: ${razorpay_payment_id} for request ${request._id}`);

    // Emit Socket.IO event to provider
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const providerId = request.providerId._id.toString();
        
        socketIO.emitToUser(providerId, 'paymentReceived', {
          request: {
            id: request._id.toString(),
            material: {
              id: request.materialId._id.toString(),
              title: request.materialId.title,
            },
            seeker: {
              id: seeker._id.toString(),
              name: seeker.name,
            },
            paymentId: request.paymentId,
          },
          message: `Payment received for "${request.materialId.title}" from ${seeker.name}`,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify provider via Socket.IO:', socketError);
    }

    res.json({
      message: 'Payment verified successfully',
      request: {
        id: request._id,
        orderStatus: request.orderStatus,
        paymentStatus: request.paymentStatus,
        paymentId: request.paymentId,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};

