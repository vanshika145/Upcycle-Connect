const Request = require('../models/Request');
const Material = require('../models/Material');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const ImpactLog = require('../models/ImpactLog');
const {
  calculateCO2Saved,
  calculateWasteDiverted,
  calculateMoneySaved,
  parseQuantityToKg,
} = require('../utils/impactCalculator');

/**
 * Create a new material request (Seeker sends request to Provider)
 */
const createRequest = async (req, res) => {
  try {
    const { materialId, message, quantity } = req.body;

    // Validate required fields
    if (!materialId) {
      return res.status(400).json({ message: 'Material ID is required' });
    }
    if (!quantity || quantity.trim() === '') {
      return res.status(400).json({ message: 'Quantity is required' });
    }

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (seeker.role !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can send requests' });
    }

    // Get material and verify it exists and is available
    const material = await Material.findById(materialId)
      .populate('providerId', 'name email organization');
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.status !== 'available') {
      return res.status(400).json({ 
        message: `Material is ${material.status}. Cannot send request.` 
      });
    }

    // Check if request already exists
    const existingRequest = await Request.findOne({
      materialId: material._id,
      seekerId: seeker._id,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending request for this material' 
      });
    }

    // Create request
    const request = new Request({
      materialId: material._id,
      seekerId: seeker._id,
      providerId: material.providerId._id,
      quantity: quantity.trim(),
      message: message ? message.trim() : '',
      status: 'pending',
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    // Save request to MongoDB
    await request.save();

    // Update material status to 'requested'
    material.status = 'requested';
    await material.save();

    // Populate request for response
    await request.populate('materialId', 'title category quantity price priceUnit images location');
    await request.populate('seekerId', 'name email college');
    await request.populate('providerId', 'name email organization');

    console.log(`✅ Request created: ${seeker.name} requested "${material.title}"`);

    // Emit Socket.IO event to provider (after DB save success)
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const providerId = material.providerId._id.toString();
        socketIO.emitToUser(providerId, 'requestSent', {
          request: {
            id: request._id.toString(),
            material: {
              id: material._id.toString(),
              title: material.title,
              category: material.category,
              quantity: material.quantity,
            },
            seeker: {
              id: seeker._id.toString(),
              name: seeker.name,
              email: seeker.email,
              college: seeker.college,
            },
            message: request.message,
            status: request.status,
            createdAt: request.createdAt,
          },
          message: `New request for "${material.title}"`,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify provider via Socket.IO:', socketError);
    }

    res.status(201).json({
      message: 'Request sent successfully',
      request: {
        id: request._id,
        material: {
          id: request.materialId._id,
          title: request.materialId.title,
          category: request.materialId.category,
          quantity: request.materialId.quantity,
        },
        seeker: {
          id: request.seekerId._id,
          name: request.seekerId.name,
          email: request.seekerId.email,
        },
        provider: {
          id: request.providerId._id,
          name: request.providerId.name,
          organization: request.providerId.organization,
        },
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('Create request error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all requests for a provider (incoming requests)
 */
const getProviderRequests = async (req, res) => {
  try {
    const provider = await User.findOne({ email: req.user.email });
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requests = await Request.find({ providerId: provider._id })
      .populate('materialId', 'title category quantity price priceUnit images location status')
      .populate('seekerId', 'name email college location')
      .sort({ createdAt: -1 });

    res.json({
      requests: requests.map((req) => ({
        id: req._id,
        material: {
          id: req.materialId._id,
          title: req.materialId.title,
          category: req.materialId.category,
          quantity: req.materialId.quantity,
          images: req.materialId.images,
          location: req.materialId.location,
          status: req.materialId.status,
        },
        seeker: {
          id: req.seekerId._id,
          name: req.seekerId.name,
          email: req.seekerId.email,
          college: req.seekerId.college,
          location: req.seekerId.location,
        },
        quantity: req.quantity,
        message: req.message,
        status: req.status,
        orderStatus: req.orderStatus,
        paymentStatus: req.paymentStatus,
        paymentId: req.paymentId,
        invoiceNumber: req.invoiceNumber,
        invoiceUrl: req.invoiceUrl,
        approvedAt: req.approvedAt,
        paidAt: req.paidAt,
        dispatchedAt: req.dispatchedAt,
        receivedAt: req.receivedAt,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get provider requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all requests for a seeker (outgoing requests)
 */
const getSeekerRequests = async (req, res) => {
  try {
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requests = await Request.find({ seekerId: seeker._id })
      .populate('materialId', 'title category quantity price priceUnit images location status')
      .populate('providerId', 'name email organization location')
      .sort({ createdAt: -1 });

    res.json({
      requests: requests.map((req) => ({
        id: req._id,
        material: {
          id: req.materialId._id,
          title: req.materialId.title,
          category: req.materialId.category,
          quantity: req.materialId.quantity,
          images: req.materialId.images,
          location: req.materialId.location,
          status: req.materialId.status,
        },
        provider: {
          id: req.providerId._id,
          name: req.providerId.name,
          email: req.providerId.email,
          organization: req.providerId.organization,
          location: req.providerId.location,
        },
        quantity: req.quantity,
        message: req.message,
        status: req.status,
        orderStatus: req.orderStatus,
        paymentStatus: req.paymentStatus,
        paymentId: req.paymentId,
        invoiceNumber: req.invoiceNumber,
        invoiceUrl: req.invoiceUrl,
        approvedAt: req.approvedAt,
        paidAt: req.paidAt,
        dispatchedAt: req.dispatchedAt,
        receivedAt: req.receivedAt,
        createdAt: req.createdAt,
        updatedAt: req.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get seeker requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update request status (approve or reject)
 */
const updateRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status must be either "approved" or "rejected"' 
      });
    }

    // Get provider from authenticated user
    const provider = await User.findOne({ email: req.user.email });
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category price priceUnit status')
      .populate('seekerId', 'name email college')
      .populate('providerId', 'name email organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify provider owns this request
    if (request.providerId._id.toString() !== provider._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only update requests for your own materials' 
      });
    }

    // Update request status
    request.status = status;
    
    // Update order status if approved
    if (status === 'approved') {
      request.orderStatus = 'approved';
      request.approvedAt = new Date();
      request.materialId.status = 'picked';
      await request.materialId.save();
    } else if (status === 'rejected') {
      // If rejected, set material back to available
      request.materialId.status = 'available';
      await request.materialId.save();
    }
    
    await request.save();

    console.log(`✅ Request ${status}: ${request.materialId.title} by ${request.seekerId.name}`);

    // Emit Socket.IO event to seeker (after DB save success)
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const seekerId = request.seekerId._id.toString();
        const eventName = status === 'approved' ? 'requestApproved' : 'requestRejected';
        
        socketIO.emitToUser(seekerId, eventName, {
          request: {
            id: request._id.toString(),
            material: {
              id: request.materialId._id.toString(),
              title: request.materialId.title,
              category: request.materialId.category,
            },
            provider: {
              id: request.providerId._id.toString(),
              name: request.providerId.name,
              organization: request.providerId.organization,
            },
            status: request.status,
            updatedAt: request.updatedAt,
          },
          message: status === 'approved' 
            ? `Your request for "${request.materialId.title}" has been approved!`
            : `Your request for "${request.materialId.title}" has been rejected.`,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify seeker via Socket.IO:', socketError);
    }

    res.json({
      message: `Request ${status} successfully`,
      request: {
        id: request._id,
        material: {
          id: request.materialId._id,
          title: request.materialId.title,
          category: request.materialId.category,
          status: request.materialId.status,
        },
        seeker: {
          id: request.seekerId._id,
          name: request.seekerId.name,
          email: request.seekerId.email,
        },
        status: request.status,
        updatedAt: request.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update request status error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark payment as complete (after seeker pays)
 */
const markPaymentComplete = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { paymentId } = req.body;

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category price priceUnit')
      .populate('providerId', 'name email organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify seeker owns this request
    if (request.seekerId.toString() !== seeker._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only update your own requests' 
      });
    }

    // Verify request is approved
    if (request.status !== 'approved' || request.orderStatus !== 'approved') {
      return res.status(400).json({ 
        message: 'Request must be approved before payment' 
      });
    }

    // Update payment status
    request.paymentStatus = 'paid';
    request.paymentId = paymentId || `PAY-${Date.now()}`;
    request.orderStatus = 'paid';
    request.paidAt = new Date();
    await request.save();

    console.log(`✅ Payment completed for request: ${request.materialId.title}`);

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
      message: 'Payment recorded successfully',
      request: {
        id: request._id,
        orderStatus: request.orderStatus,
        paymentStatus: request.paymentStatus,
        paymentId: request.paymentId,
      },
    });
  } catch (error) {
    console.error('Mark payment complete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Dispatch order (provider dispatches after payment)
 */
const dispatchOrder = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get provider from authenticated user
    const provider = await User.findOne({ email: req.user.email });
    if (!provider) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category price priceUnit')
      .populate('seekerId', 'name email college');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify provider owns this request
    if (request.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only dispatch your own orders' 
      });
    }

    // Verify payment is complete
    if (request.paymentStatus !== 'paid' || request.orderStatus !== 'paid') {
      return res.status(400).json({ 
        message: 'Payment must be completed before dispatch' 
      });
    }

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${request._id.toString().slice(-6)}`;
    const invoiceUrl = `/api/requests/${requestId}/invoice`; // Will be generated on demand
    
    // Update order status
    request.orderStatus = 'dispatched';
    request.dispatchedAt = new Date();
    request.invoiceNumber = invoiceNumber;
    request.invoiceUrl = invoiceUrl;
    await request.save();

    console.log(`✅ Order dispatched: ${request.materialId.title} to ${request.seekerId.name}`);

    // Emit Socket.IO event to seeker
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const seekerId = request.seekerId._id.toString();
        
        socketIO.emitToUser(seekerId, 'orderDispatched', {
          request: {
            id: request._id.toString(),
            material: {
              id: request.materialId._id.toString(),
              title: request.materialId.title,
            },
            provider: {
              id: provider._id.toString(),
              name: provider.name,
              organization: provider.organization,
            },
            invoiceNumber: request.invoiceNumber,
            invoiceUrl: request.invoiceUrl,
          },
          message: `Your order for "${request.materialId.title}" has been dispatched!`,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify seeker via Socket.IO:', socketError);
    }

    res.json({
      message: 'Order dispatched successfully',
      request: {
        id: request._id,
        orderStatus: request.orderStatus,
        dispatchedAt: request.dispatchedAt,
        invoiceNumber: request.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Dispatch order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Mark order as received (seeker confirms receipt)
 */
const receiveOrder = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get seeker from authenticated user
    const seeker = await User.findOne({ email: req.user.email });
    if (!seeker) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category price priceUnit')
      .populate('providerId', 'name email organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify seeker owns this request
    if (request.seekerId.toString() !== seeker._id.toString()) {
      return res.status(403).json({ 
        message: 'You can only mark your own orders as received' 
      });
    }

    // Verify order is dispatched
    if (request.orderStatus !== 'dispatched') {
      return res.status(400).json({ 
        message: 'Order must be dispatched before marking as received' 
      });
    }

    // Get material to update quantity
    const material = await Material.findById(request.materialId._id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Parse and update material quantity
    // Material quantity format: "10 kg", "5 pieces", etc.
    // Requested quantity format: "3 kg", "2 pieces", etc.
    const materialQtyStr = material.quantity || '0';
    const requestedQtyStr = request.quantity || '0';
    
    // Extract numeric values from quantity strings
    const materialQtyMatch = materialQtyStr.match(/(\d+(?:\.\d+)?)/);
    const requestedQtyMatch = requestedQtyStr.match(/(\d+(?:\.\d+)?)/);
    
    if (materialQtyMatch && requestedQtyMatch) {
      const materialQty = parseFloat(materialQtyMatch[1]);
      const requestedQty = parseFloat(requestedQtyMatch[1]);
      const remainingQty = Math.max(0, materialQty - requestedQty);
      
      // Extract unit from material quantity (e.g., "kg", "pieces")
      const unitMatch = materialQtyStr.match(/\d+\s*(.+)/);
      const unit = unitMatch ? unitMatch[1].trim() : '';
      
      // Update material quantity
      material.quantity = remainingQty > 0 ? `${remainingQty}${unit ? ' ' + unit : ''}` : '0';
      
      // Update material status based on remaining quantity
      if (remainingQty === 0) {
        material.status = 'picked';
      } else {
        // If there's remaining quantity, set status back to available
        material.status = 'available';
      }
      
      await material.save();
      console.log(`✅ Updated material quantity: ${materialQtyStr} → ${material.quantity}, status: ${material.status}`);
    }

    // Update order status
    request.orderStatus = 'received';
    request.receivedAt = new Date();
    await request.save();

    console.log(`✅ Order received: ${request.materialId.title} by ${seeker.name}`);

    // Calculate and log impact (only once per completed exchange)
    try {
      // Check if ImpactLog already exists for this request
      const existingImpact = await ImpactLog.findOne({ request: request._id });
      
      if (!existingImpact) {
        // Get material details for impact calculation
        const material = await Material.findById(request.materialId._id);
        if (material) {
          // Parse quantity to kg
          const quantityReusedKg = parseQuantityToKg(request.quantity, material.category);
          
          if (quantityReusedKg > 0) {
            // Calculate impact metrics
            const co2Saved = calculateCO2Saved(material.category, quantityReusedKg);
            const wasteDiverted = calculateWasteDiverted(quantityReusedKg);
            
            // Get actual amount paid from payment record (in ₹)
            const actualAmountPaid = request.paymentAmount || 0;
            
            const moneySaved = calculateMoneySaved(material.category, quantityReusedKg, actualAmountPaid);
            
            // Create ImpactLog entry
            const impactLog = new ImpactLog({
              materialType: material.category,
              quantityReused: quantityReusedKg,
              co2Saved: co2Saved,
              wasteDiverted: wasteDiverted,
              moneySaved: moneySaved,
              provider: request.providerId._id,
              seeker: seeker._id,
              material: material._id,
              request: request._id,
              completedAt: new Date(),
            });
            
            await impactLog.save();
            console.log(`✅ Impact logged: ${co2Saved.toFixed(2)} kg CO₂ saved, ₹${moneySaved.toFixed(2)} saved`);
          }
        }
      } else {
        console.log(`ℹ️ Impact already logged for request ${request._id}`);
      }
    } catch (impactError) {
      // Don't fail the request if impact logging fails
      console.error('⚠️ Failed to log impact:', impactError);
    }

    // Emit Socket.IO event to provider
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.emitToUser) {
        const providerId = request.providerId._id.toString();
        
        socketIO.emitToUser(providerId, 'orderReceived', {
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
          },
          message: `Order for "${request.materialId.title}" has been successfully received by ${seeker.name}`,
        });
      }
    } catch (socketError) {
      console.error('⚠️ Failed to notify provider via Socket.IO:', socketError);
    }

    res.json({
      message: 'Order marked as received successfully',
      request: {
        id: request._id,
        orderStatus: request.orderStatus,
        receivedAt: request.receivedAt,
      },
    });
  } catch (error) {
    console.error('Receive order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Generate and download invoice as PDF
 */
const generateInvoice = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get request
    const request = await Request.findById(requestId)
      .populate('materialId', 'title category quantity price priceUnit')
      .populate('seekerId', 'name email college')
      .populate('providerId', 'name email organization');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Verify request is dispatched or received
    if (!['dispatched', 'received'].includes(request.orderStatus)) {
      return res.status(400).json({ 
        message: 'Invoice can only be generated for dispatched or received orders' 
      });
    }

    // Calculate total amount
    const materialPrice = request.materialId.price || 0;
    const priceUnit = request.materialId.priceUnit || 'total';
    const quantityStr = request.quantity || '1';
    const quantityMatch = quantityStr.match(/(\d+(?:\.\d+)?)/);
    const requestedQty = quantityMatch ? parseFloat(quantityMatch[1]) : 1;
    
    let totalAmount = 0;
    if (priceUnit === 'total') {
      totalAmount = materialPrice;
    } else {
      totalAmount = materialPrice * requestedQty;
    }

    // Generate invoice number if not exists
    const invoiceNumber = request.invoiceNumber || `INV-${Date.now()}-${request._id.toString().slice(-6)}`;

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Invoice Header
    doc.fontSize(24).text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Invoice #: ${invoiceNumber}`, { align: 'center' });
    doc.text(`Date: ${new Date(request.dispatchedAt || request.createdAt).toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Provider Information
    doc.fontSize(14).text('From:', { underline: true });
    doc.fontSize(11);
    doc.text(request.providerId.name || 'Provider');
    if (request.providerId.organization) {
      doc.text(request.providerId.organization);
    }
    if (request.providerId.email) {
      doc.text(request.providerId.email);
    }
    doc.moveDown();

    // Seeker Information
    doc.fontSize(14).text('To:', { underline: true });
    doc.fontSize(11);
    doc.text(request.seekerId.name || 'Seeker');
    if (request.seekerId.college) {
      doc.text(request.seekerId.college);
    }
    if (request.seekerId.email) {
      doc.text(request.seekerId.email);
    }
    doc.moveDown(2);

    // Material Details Table
    doc.fontSize(14).text('Material Details:', { underline: true });
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const priceX = 400;
    const totalX = 500;

    // Table Header
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', itemX, tableTop);
    doc.text('Quantity', quantityX, tableTop);
    doc.text('Unit Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);

    // Table Line
    doc.moveTo(50, doc.y + 5)
       .lineTo(550, doc.y + 5)
       .stroke();

    // Table Row
    doc.font('Helvetica').fontSize(10);
    const rowY = doc.y + 10;
    doc.text(request.materialId.title, itemX, rowY);
    doc.text(request.quantity, quantityX, rowY);
    
    if (priceUnit === 'total') {
      doc.text(`₹${materialPrice.toFixed(2)}`, priceX, rowY);
    } else {
      doc.text(`₹${materialPrice.toFixed(2)} / ${priceUnit.replace('per_', '')}`, priceX, rowY);
    }
    doc.text(`₹${totalAmount.toFixed(2)}`, totalX, rowY);

    // Table Bottom Line
    doc.moveTo(50, doc.y + 15)
       .lineTo(550, doc.y + 15)
       .stroke();

    doc.moveDown(2);

    // Total Amount
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, { align: 'right' });
    doc.moveDown(2);

    // Payment Information
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Information:', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Payment ID: ${request.paymentId || 'N/A'}`);
    doc.text(`Payment Status: ${request.paymentStatus.toUpperCase()}`);
    if (request.paidAt) {
      doc.text(`Paid At: ${new Date(request.paidAt).toLocaleString('en-IN')}`);
    }
    doc.moveDown();

    // Order Information
    doc.fontSize(12).font('Helvetica-Bold').text('Order Information:', { underline: true });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Order Status: ${request.orderStatus.toUpperCase()}`);
    if (request.dispatchedAt) {
      doc.text(`Dispatched At: ${new Date(request.dispatchedAt).toLocaleString('en-IN')}`);
    }
    if (request.receivedAt) {
      doc.text(`Received At: ${new Date(request.receivedAt).toLocaleString('en-IN')}`);
    }
    doc.moveDown(2);

    // Footer
    doc.fontSize(8).text('Thank you for using UpCycle Connect!', { align: 'center' });
    doc.text('This is an automated invoice generated by the system.', { align: 'center' });

    // Finalize PDF
    doc.end();

    console.log(`✅ PDF invoice generated: ${invoiceNumber}`);
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRequest,
  getProviderRequests,
  getSeekerRequests,
  updateRequestStatus,
  markPaymentComplete,
  dispatchOrder,
  receiveOrder,
  generateInvoice,
};

