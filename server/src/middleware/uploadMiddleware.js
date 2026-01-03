const multer = require('multer');
const path = require('path');

/**
 * Configure multer for memory storage (no disk writes)
 * Files are stored in memory as buffers for direct upload to Cloudinary
 */
const storage = multer.memoryStorage();

/**
 * File filter to accept only image files
 */
const fileFilter = (req, file, cb) => {
  // Allowed MIME types for images
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only image files are allowed (JPEG, PNG, GIF, WebP, SVG). Received: ${file.mimetype}`
      ),
      false
    );
  }
};

/**
 * Multer configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5, // Max 5 files
  },
});

/**
 * Middleware to handle multiple image uploads
 * Accepts up to 5 images with field name 'images'
 */
const uploadImages = upload.array('images', 5);

/**
 * Error handling wrapper for multer
 */
const handleUpload = (req, res, next) => {
  uploadImages(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File size too large. Maximum size is 5MB per file.',
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files. Maximum 5 images allowed.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Unexpected file field. Use "images" as the field name.',
        });
      }
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      // Other errors (e.g., file type validation)
      return res.status(400).json({
        message: err.message || 'File upload error',
      });
    }

    // Validate that at least one file was uploaded (optional - remove if images are optional)
    // if (!req.files || req.files.length === 0) {
    //   return res.status(400).json({
    //     message: 'At least one image is required',
    //   });
    // }

    // Files are available in req.files as an array
    next();
  });
};

module.exports = {
  uploadImages,
  handleUpload,
};

