const cloudinary = require('cloudinary').v2;

/**
 * Initialize Cloudinary with credentials from environment variables
 */
const initializeCloudinary = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('CLOUDINARY_CLOUD_NAME is required in .env file');
  }
  if (!process.env.CLOUDINARY_API_KEY) {
    throw new Error('CLOUDINARY_API_KEY is required in .env file');
  }
  if (!process.env.CLOUDINARY_API_SECRET) {
    throw new Error('CLOUDINARY_API_SECRET is required in .env file');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true, // Use HTTPS
  });

  console.log('✅ Cloudinary initialized');
};

/**
 * Upload an image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Optional folder path in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = async (fileBuffer, folder = 'upcycle-connect/materials') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
          { quality: 'auto' }, // Auto optimize quality
          { format: 'auto' }, // Auto format (webp when supported)
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload multiple images to Cloudinary in parallel
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {string} folder - Optional folder path in Cloudinary
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
const uploadMultipleImages = async (fileBuffers, folder = 'upcycle-connect/materials') => {
  try {
    const uploadPromises = fileBuffers.map((buffer) => uploadImage(buffer, folder));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Delete an image from Cloudinary using publicId
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<void>}
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
    
    if (result.result === 'ok') {
      console.log(`✅ Image deleted from Cloudinary: ${publicId}`);
      return true;
    } else if (result.result === 'not found') {
      console.warn(`⚠️ Image not found in Cloudinary: ${publicId}`);
      return false;
    } else {
      console.error(`❌ Failed to delete image from Cloudinary: ${publicId}`, result);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting image from Cloudinary: ${publicId}`, error);
    throw error;
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Array<boolean>>} - Array of deletion results
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

module.exports = {
  initializeCloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  cloudinary,
};

