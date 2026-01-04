const express = require('express');
const {
  createMaterial,
  getMyMaterials,
  getAvailableMaterials,
  getNearbyMaterials,
  getMaterialById,
  updateMaterialStatus,
  updateMaterial,
  deleteMaterial,
} = require('../controllers/materialController');
const authMiddleware = require('../middleware/authMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Protected routes (require authentication)
// Use handleUpload middleware before createMaterial to process file uploads
router.post('/', authMiddleware, handleUpload, createMaterial);
router.get('/my-materials', authMiddleware, getMyMaterials);

// Public routes for browsing
router.get('/nearby', getNearbyMaterials); // Location-based search (requires lat & lng)
router.get('/available', getAvailableMaterials); // All available materials
router.get('/:id', getMaterialById); // Get material by ID

// Protected routes
router.patch('/:id/status', authMiddleware, updateMaterialStatus);
router.put('/:id', authMiddleware, handleUpload, updateMaterial);
router.delete('/:id', authMiddleware, deleteMaterial);

module.exports = router;

