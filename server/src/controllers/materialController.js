const Material = require('../models/Material');
const User = require('../models/User');
const { uploadMultipleImages, deleteMultipleImages } = require('../config/cloudinary');

// Create a new material
const createMaterial = async (req, res) => {
  let uploadedImagePublicIds = []; // Track uploaded images for cleanup on error

  try {
    // Get form data from req.body (text fields)
    const { title, category, description, quantity, latitude, longitude } = req.body;

    // Validate required fields
    if (!title || !category || !quantity || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate latitude and longitude are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }

    // Get provider ID from authenticated user
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle image uploads
    let imageData = [];
    
    if (req.files && req.files.length > 0) {
      try {
        // Extract file buffers from multer
        const fileBuffers = req.files.map((file) => file.buffer);
        
        // Upload all images to Cloudinary in parallel
        const uploadResults = await uploadMultipleImages(fileBuffers);
        
        // Store image data with URL and publicId
        imageData = uploadResults.map((result) => ({
          url: result.url,
          publicId: result.publicId,
        }));

        // Track public IDs for cleanup if DB save fails
        uploadedImagePublicIds = uploadResults.map((result) => result.publicId);

        console.log(`✅ Uploaded ${imageData.length} image(s) to Cloudinary`);
      } catch (uploadError) {
        console.error('Error uploading images to Cloudinary:', uploadError);
        return res.status(500).json({
          message: 'Failed to upload images. Please try again.',
          error: uploadError.message,
        });
      }
    }

    // Create material with uploaded image data
    const material = new Material({
      title: title.trim(),
      category,
      description: description ? description.trim() : '',
      quantity: quantity.trim(),
      images: imageData,
      providerId: user._id, // MongoDB ObjectId
      location: {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
      },
      status: 'available',
    });

    // Save material to MongoDB
    await material.save();
    
    // Populate provider info for response
    await material.populate('providerId', 'name email organization');

    console.log(`✅ Material created in MongoDB: ${material.title} by ${user.email}`);

    res.status(201).json({
      message: 'Material created successfully',
      material: {
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
        },
        location: material.location,
        status: material.status,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    console.error('Create material error:', error);
    
    // Clean up uploaded images from Cloudinary if DB save failed
    if (uploadedImagePublicIds.length > 0) {
      try {
        console.log(`🧹 Cleaning up ${uploadedImagePublicIds.length} uploaded image(s) from Cloudinary...`);
        await deleteMultipleImages(uploadedImagePublicIds);
      } catch (cleanupError) {
        console.error('Error cleaning up images from Cloudinary:', cleanupError);
        // Don't fail the request if cleanup fails, just log it
      }
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all materials for a provider (My Listings)
const getMyMaterials = async (req, res) => {
  try {
    // Get user from MongoDB
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get all materials for this provider
    const materials = await Material.find({ providerId: user._id })
      .sort({ createdAt: -1 }) // Newest first
      .populate('providerId', 'name email organization');

    console.log(`✅ Fetched ${materials.length} materials for provider: ${user.email}`);

    res.json({
      materials: materials.map((material) => ({
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
        },
        location: material.location,
        status: material.status,
        createdAt: material.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get my materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all available materials (for seekers to browse)
const getAvailableMaterials = async (req, res) => {
  try {
    const { category, latitude, longitude, radius = 50 } = req.query; // radius in km

    // Build query
    const query = { status: 'available' };
    
    if (category && category !== 'All') {
      query.category = category;
    }

    let materials;
    
    // If location provided, find materials within radius
    if (latitude && longitude) {
      materials = await Material.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
            $maxDistance: radius * 1000, // Convert km to meters
          },
        },
      })
        .populate('providerId', 'name email organization')
        .sort({ createdAt: -1 });
    } else {
      // Get all available materials without location filter
      materials = await Material.find(query)
        .populate('providerId', 'name email organization')
        .sort({ createdAt: -1 });
    }

    res.json({
      materials: materials.map((material) => ({
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
        },
        location: material.location,
        status: material.status,
        createdAt: material.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get available materials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single material by ID
const getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await Material.findById(id)
      .populate('providerId', 'name email organization');

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.json({
      material: {
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
        },
        location: material.location,
        status: material.status,
        createdAt: material.createdAt,
      },
    });
  } catch (error) {
    console.error('Get material by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update material status
const updateMaterialStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'requested', 'picked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get user from MongoDB
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const material = await Material.findOne({ _id: id, providerId: user._id });

    if (!material) {
      return res.status(404).json({ message: 'Material not found or unauthorized' });
    }

    material.status = status;
    await material.save();

    res.json({
      message: 'Material status updated',
      material: {
        id: material._id,
        status: material.status,
      },
    });
  } catch (error) {
    console.error('Update material status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a material
const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user from MongoDB
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find material (don't delete yet - need to get image publicIds first)
    const material = await Material.findOne({ _id: id, providerId: user._id });

    if (!material) {
      return res.status(404).json({ message: 'Material not found or unauthorized' });
    }

    // Extract publicIds from material images
    const publicIds = material.images
      .map((img) => img.publicId)
      .filter((id) => id); // Filter out any null/undefined values

    // Delete material from MongoDB
    await Material.findByIdAndDelete(id);

    // Delete images from Cloudinary (don't fail if this fails)
    if (publicIds.length > 0) {
      try {
        console.log(`🧹 Deleting ${publicIds.length} image(s) from Cloudinary...`);
        await deleteMultipleImages(publicIds);
      } catch (cloudinaryError) {
        console.error('Error deleting images from Cloudinary:', cloudinaryError);
        // Material is already deleted from DB, so we continue
        // In production, you might want to log this for manual cleanup
      }
    }

    console.log(`✅ Material deleted: ${material.title}`);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createMaterial,
  getMyMaterials,
  getAvailableMaterials,
  getMaterialById,
  updateMaterialStatus,
  deleteMaterial,
};

