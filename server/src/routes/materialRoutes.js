const express = require('express');
const {
  createMaterial,
  getMyMaterials,
  getAvailableMaterials,
  getMaterialById,
  updateMaterialStatus,
  deleteMaterial,
} = require('../controllers/materialController');
const authMiddleware = require('../middleware/authMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// Protected routes (require authentication)
// Use handleUpload middleware before createMaterial to process file uploads
router.post('/', authMiddleware, handleUpload, createMaterial);
router.get('/my-materials', authMiddleware, getMyMaterials);
router.get('/available', getAvailableMaterials); // Public route for browsing
router.get('/:id', getMaterialById); // Public route
router.patch('/:id/status', authMiddleware, updateMaterialStatus);
router.delete('/:id', authMiddleware, deleteMaterial);

module.exports = router;

