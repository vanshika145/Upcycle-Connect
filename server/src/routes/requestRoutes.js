const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createRequest,
  getProviderRequests,
  getSeekerRequests,
  updateRequestStatus,
  markPaymentComplete,
  dispatchOrder,
  receiveOrder,
  generateInvoice,
} = require('../controllers/requestController');

/**
 * @route   POST /api/requests
 * @desc    Create a new material request (Seeker sends request to Provider)
 * @access  Private (Seeker only)
 */
router.post('/', authMiddleware, createRequest);

/**
 * @route   GET /api/requests/provider
 * @desc    Get all requests for a provider (incoming requests)
 * @access  Private (Provider only)
 */
router.get('/provider', authMiddleware, getProviderRequests);

/**
 * @route   GET /api/requests/seeker
 * @desc    Get all requests for a seeker (outgoing requests)
 * @access  Private (Seeker only)
 */
router.get('/seeker', authMiddleware, getSeekerRequests);

/**
 * @route   PATCH /api/requests/:requestId/status
 * @desc    Update request status (approve or reject)
 * @access  Private (Provider only)
 */
router.patch('/:requestId/status', authMiddleware, updateRequestStatus);

/**
 * @route   POST /api/requests/:requestId/payment
 * @desc    Mark payment as complete (after seeker pays)
 * @access  Private (Seeker only)
 */
router.post('/:requestId/payment', authMiddleware, markPaymentComplete);

/**
 * @route   POST /api/requests/:requestId/dispatch
 * @desc    Dispatch order (provider dispatches after payment)
 * @access  Private (Provider only)
 */
router.post('/:requestId/dispatch', authMiddleware, dispatchOrder);

/**
 * @route   POST /api/requests/:requestId/receive
 * @desc    Mark order as received (seeker confirms receipt)
 * @access  Private (Seeker only)
 */
router.post('/:requestId/receive', authMiddleware, receiveOrder);

/**
 * @route   GET /api/requests/:requestId/invoice
 * @desc    Generate and download invoice
 * @access  Private (Seeker or Provider)
 */
router.get('/:requestId/invoice', authMiddleware, generateInvoice);

module.exports = router;

