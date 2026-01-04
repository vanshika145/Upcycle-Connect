const Material = require('../models/Material');
const User = require('../models/User');
const { uploadMultipleImages, deleteMultipleImages } = require('../config/cloudinary');

/**
 * Compliance-Safe Material Listing
 * Restricted materials list - prevents unsafe/restricted materials from being listed
 * This list should be maintained and updated based on safety regulations
 */
const RESTRICTED_MATERIALS = [
  'mercury',
  'radioactive waste',
  'explosive chemicals',
  'biological hazard',
  'cyanide',
  'asbestos',
  'radioactive',
  'explosive',
  'hazardous waste',
  'toxic waste',
];

/**
 * Check if material name contains restricted keywords
 * @param {string} materialName - Material title/name to check
 * @returns {boolean} - True if material is restricted
 */
const isRestrictedMaterial = (materialName) => {
  if (!materialName || typeof materialName !== 'string') {
    return false;
  }

  // Normalize input: lowercase and trim
  const normalizedName = materialName.toLowerCase().trim();

  // Check if any restricted keyword is found in the material name
  return RESTRICTED_MATERIALS.some((restricted) =>
    normalizedName.includes(restricted.toLowerCase())
  );
};

// Create a new material
const createMaterial = async (req, res) => {
  let uploadedImagePublicIds = []; // Track uploaded images for cleanup on error

  try {
    // Get form data from req.body (text fields)
    const { title, category, description, quantity, price, priceUnit, latitude, longitude } = req.body;

    // Validate required fields
    if (!title || !category || !quantity || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Compliance check: Validate material name against restricted materials list
    if (isRestrictedMaterial(title)) {
      console.error(`🚫 Compliance violation: Attempted to list restricted material: "${title}"`);
      return res.status(403).json({
        error: 'This material violates safety and compliance guidelines.',
        message: 'The material you are trying to list is restricted due to safety regulations. Please contact support if you believe this is an error.',
      });
    }

    // Also check description for restricted keywords (optional but recommended)
    if (description && isRestrictedMaterial(description)) {
      console.error(`🚫 Compliance violation: Restricted keyword found in description: "${description}"`);
      return res.status(403).json({
        error: 'This material violates safety and compliance guidelines.',
        message: 'The material description contains restricted keywords. Please contact support if you believe this is an error.',
      });
    }

    // Validate price
    const materialPrice = parseFloat(price);
    if (isNaN(materialPrice) || materialPrice < 0) {
      return res.status(400).json({ message: 'Invalid price. Price must be a positive number.' });
    }

    // Parse and validate latitude and longitude
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Check if parsing failed
    if (isNaN(lat) || isNaN(lng)) {
      console.error('❌ Invalid coordinates (NaN):', { latitude, longitude, parsed: { lat, lng } });
      return res.status(400).json({ message: 'Invalid latitude or longitude: must be valid numbers' });
    }
    
    // Explicitly reject 0,0 coordinates (invalid location)
    if (lat === 0 && lng === 0) {
      console.error('❌ Invalid coordinates (0,0):', { latitude, longitude });
      return res.status(400).json({ message: 'Invalid coordinates: (0,0) is not a valid location' });
    }
    
    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      console.error('❌ Invalid latitude range:', { lat, latitude });
      return res.status(400).json({ message: 'Invalid latitude: must be between -90 and 90' });
    }
    
    if (lng < -180 || lng > 180) {
      console.error('❌ Invalid longitude range:', { lng, longitude });
      return res.status(400).json({ message: 'Invalid longitude: must be between -180 and 180' });
    }
    
    console.log('✅ Material creation coordinates validated:', { lat, lng, source: 'createMaterial' });

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
      price: materialPrice,
      priceUnit: priceUnit || 'per_unit',
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

    // Emit Socket.IO event to matched seekers (after DB save success)
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.notifyMatchedSeekers) {
        // Notify seekers within 10km radius
        await socketIO.notifyMatchedSeekers(material, 10);
      }
    } catch (socketError) {
      // Don't fail the request if socket notification fails
      console.error('⚠️ Failed to notify seekers via Socket.IO:', socketError);
    }

    res.status(201).json({
      message: 'Material created successfully',
      material: {
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
          averageRating: material.providerId.averageRating || 0,
          totalReviews: material.providerId.totalReviews || 0,
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
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
          averageRating: material.providerId.averageRating || 0,
          totalReviews: material.providerId.totalReviews || 0,
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
    const { category } = req.query;

    // Build query
    const query = { status: 'available' };
    
    if (category && category !== 'All') {
      query.category = category;
    }

    // Get all available materials without location filter
    const materials = await Material.find(query)
      .populate('providerId', 'name email organization averageRating totalReviews')
      .sort({ createdAt: -1 });

    res.json({
      materials: materials.map((material) => ({
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
          averageRating: material.providerId.averageRating || 0,
          totalReviews: material.providerId.totalReviews || 0,
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

// Get nearby materials using geospatial query
const getNearbyMaterials = async (req, res) => {
  try {
    const { lat, lng, radius = 10, category } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        message: 'Latitude (lat) and longitude (lng) are required',
      });
    }

    // Parse and validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    // Check if parsing failed
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('❌ Invalid nearby search coordinates (NaN):', { lat, lng, parsed: { latitude, longitude } });
      return res.status(400).json({
        message: 'Invalid latitude or longitude: must be valid numbers',
      });
    }

    // Explicitly reject 0,0 coordinates (invalid location)
    if (latitude === 0 && longitude === 0) {
      console.error('❌ Invalid nearby search coordinates (0,0):', { lat, lng });
      return res.status(400).json({
        message: 'Invalid coordinates: (0,0) is not a valid search location',
      });
    }

    // Validate latitude range
    if (latitude < -90 || latitude > 90) {
      console.error('❌ Invalid latitude range:', { latitude, lat });
      return res.status(400).json({
        message: 'Invalid latitude. Must be between -90 and 90',
      });
    }

    // Validate longitude range
    if (longitude < -180 || longitude > 180) {
      console.error('❌ Invalid longitude range:', { longitude, lng });
      return res.status(400).json({
        message: 'Invalid longitude. Must be between -180 and 180',
      });
    }
    
    console.log('✅ Nearby search coordinates validated:', { latitude, longitude, radius: searchRadius });

    // Validate radius
    if (isNaN(searchRadius) || searchRadius <= 0 || searchRadius > 1000) {
      return res.status(400).json({
        message: 'Invalid radius. Must be between 0 and 1000 kilometers',
      });
    }

    // Build query with geospatial filter
    const query = {
      status: 'available',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // MongoDB GeoJSON: [lng, lat]
          },
          $maxDistance: searchRadius * 1000, // Convert km to meters
        },
      },
    };

    // Add category filter if provided
    if (category && category !== 'All') {
      query.category = category;
    }

    // Execute geospatial query
    const materials = await Material.find(query)
      .populate('providerId', 'name email organization location averageRating totalReviews')
      .sort({ createdAt: -1 })
      .limit(100); // Limit results to prevent excessive data

    console.log(
      `✅ Found ${materials.length} materials within ${searchRadius}km of [${latitude}, ${longitude}]`
    );

    // Calculate distance for each material (optional enhancement)
    const materialsWithDistance = materials.map((material) => {
      const materialCoords = material.location.coordinates;
      const distance = calculateDistance(
        latitude,
        longitude,
        materialCoords[1], // lat
        materialCoords[0]  // lng
      );

      return {
        id: material._id,
        title: material.title,
        category: material.category,
        description: material.description,
        quantity: material.quantity,
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
          location: material.providerId.location,
          averageRating: material.providerId.averageRating || 0,
          totalReviews: material.providerId.totalReviews || 0,
        },
        location: material.location,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
        status: material.status,
        createdAt: material.createdAt,
      };
    });

    res.json({
      materials: materialsWithDistance,
      count: materialsWithDistance.length,
      searchLocation: {
        latitude,
        longitude,
        radius: searchRadius,
      },
    });
  } catch (error) {
    console.error('Get nearby materials error:', error);
    
    // Handle geospatial query errors
    if (error.name === 'CastError' || error.message.includes('coordinates')) {
      return res.status(400).json({
        message: 'Invalid location coordinates',
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
  return (degrees * Math.PI) / 180;
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
        price: material.price,
        priceUnit: material.priceUnit,
        images: material.images,
        providerId: material.providerId._id,
        provider: {
          name: material.providerId.name,
          email: material.providerId.email,
          organization: material.providerId.organization,
          averageRating: material.providerId.averageRating || 0,
          totalReviews: material.providerId.totalReviews || 0,
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
// Update material details
const updateMaterial = async (req, res) => {
  let uploadedImagePublicIds = []; // Track newly uploaded images for cleanup on error

  try {
    const { id } = req.params;
    const { title, category, description, quantity, price, priceUnit, latitude, longitude } = req.body;

    // Get user from MongoDB
    const user = await User.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find material and verify ownership
    const material = await Material.findOne({ _id: id, providerId: user._id })
      .populate('providerId', 'name email organization averageRating totalReviews');

    if (!material) {
      return res.status(404).json({ message: 'Material not found or unauthorized' });
    }

    // Compliance check: Validate material name against restricted materials list
    if (title && isRestrictedMaterial(title)) {
      console.error(`🚫 Compliance violation: Attempted to update to restricted material: "${title}"`);
      return res.status(403).json({
        error: 'This material violates safety and compliance guidelines.',
        message: 'The material you are trying to update is restricted due to safety regulations.',
      });
    }

    // Validate price if provided
    if (price !== undefined) {
      const materialPrice = parseFloat(price);
      if (isNaN(materialPrice) || materialPrice < 0) {
        return res.status(400).json({ message: 'Invalid price. Price must be a positive number.' });
      }
      material.price = materialPrice;
    }

    // Validate and update location if provided
    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: 'Invalid latitude or longitude: must be valid numbers' });
      }
      
      if (lat === 0 && lng === 0) {
        return res.status(400).json({ message: 'Invalid coordinates: (0,0) is not a valid location' });
      }
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ message: 'Invalid coordinate ranges' });
      }

      material.location = {
        type: 'Point',
        coordinates: [lng, lat], // MongoDB GeoJSON: [longitude, latitude]
      };
    }

    // Update fields if provided
    if (title) material.title = title.trim();
    if (category) material.category = category;
    if (description !== undefined) material.description = description ? description.trim() : '';
    if (quantity) material.quantity = quantity.trim();
    if (priceUnit) material.priceUnit = priceUnit;

    // Handle image uploads if new images are provided
    if (req.files && req.files.length > 0) {
      try {
        // Upload new images
        const uploadResults = await uploadMultipleImages(req.files);
        uploadedImagePublicIds = uploadResults.map((result) => result.publicId);

        // Add new images to existing images (or replace if needed)
        const newImages = uploadResults.map((result) => ({
          url: result.secureUrl,
          publicId: result.publicId,
        }));

        // Keep existing images and add new ones (max 5 total)
        const existingImages = material.images || [];
        const allImages = [...existingImages, ...newImages].slice(0, 5); // Limit to 5 images
        material.images = allImages;
      } catch (uploadError) {
        console.error('Error uploading images:', uploadError);
        return res.status(500).json({ message: 'Failed to upload images' });
      }
    }

    // Save updated material
    await material.save();

    // Populate provider for response
    await material.populate('providerId', 'name email organization averageRating totalReviews');

    // Format response
    const updatedMaterial = {
      id: material._id.toString(),
      title: material.title,
      category: material.category,
      description: material.description,
      quantity: material.quantity,
      price: material.price,
      priceUnit: material.priceUnit,
      images: material.images,
      providerId: material.providerId._id.toString(),
      provider: {
        name: material.providerId.name,
        email: material.providerId.email,
        organization: material.providerId.organization,
        averageRating: material.providerId.averageRating || 0,
        totalReviews: material.providerId.totalReviews || 0,
      },
      location: material.location,
      status: material.status,
      createdAt: material.createdAt,
    };

    // Emit Socket.IO event for real-time update
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.io) {
        socketIO.io.emit('materialUpdated', updatedMaterial);
        console.log(`📤 Emitted materialUpdated event for material: ${material._id}`);
      }
    } catch (socketError) {
      console.error('⚠️ Failed to emit materialUpdated event:', socketError);
      // Don't fail the request if Socket.IO fails
    }

    console.log(`✅ Material updated: ${material.title}`);

    res.json({
      message: 'Material updated successfully',
      material: updatedMaterial,
    });
  } catch (error) {
    console.error('Update material error:', error);
    
    // Clean up uploaded images if update failed
    if (uploadedImagePublicIds.length > 0) {
      try {
        await deleteMultipleImages(uploadedImagePublicIds);
      } catch (cleanupError) {
        console.error('Error cleaning up images:', cleanupError);
      }
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

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

    const materialId = material._id.toString();

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

    // Emit Socket.IO event for real-time deletion
    try {
      const socketIO = req.app.get('socketIO');
      if (socketIO && socketIO.io) {
        socketIO.io.emit('materialDeleted', { materialId });
        console.log(`📤 Emitted materialDeleted event for material: ${materialId}`);
      }
    } catch (socketError) {
      console.error('⚠️ Failed to emit materialDeleted event:', socketError);
      // Don't fail the request if Socket.IO fails
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
  getNearbyMaterials,
  getMaterialById,
  updateMaterialStatus,
  updateMaterial,
  deleteMaterial,
};

