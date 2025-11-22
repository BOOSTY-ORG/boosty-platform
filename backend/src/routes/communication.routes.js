import express from 'express';
import {
  getUserCommunications,
  createUserCommunication,
  updateUserCommunication,
  deleteUserCommunication,
  getCommunicationStats,
  scheduleCommunication,
  cancelScheduledCommunication,
  resendCommunication,
  getCommunicationAnalytics,
  searchCommunications,
  exportCommunications
} from '../controllers/communication.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validateCommunication } from '../middleware/validation.middleware.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/users/:userId/communications
 * @desc    Get all communications for a user with filtering and pagination
 * @access   Private
 */
router.get('/:userId/communications', getUserCommunications);

/**
 * @route   POST /api/users/:userId/communications
 * @desc    Create a new communication for a user
 * @access   Private
 */
router.post('/:userId/communications', validateCommunication, createUserCommunication);

/**
 * @route   PUT /api/users/:userId/communications/:communicationId
 * @desc    Update a specific communication
 * @access   Private
 */
router.put('/:userId/communications/:communicationId', updateUserCommunication);

/**
 * @route   DELETE /api/users/:userId/communications/:communicationId
 * @desc    Delete a specific communication
 * @access   Private
 */
router.delete('/:userId/communications/:communicationId', deleteUserCommunication);

/**
 * @route   GET /api/users/:userId/communications/stats
 * @desc    Get communication statistics for a user
 * @access   Private
 */
router.get('/:userId/communications/stats', getCommunicationStats);

/**
 * @route   POST /api/users/:userId/communications/schedule
 * @desc    Schedule a communication for future delivery
 * @access   Private
 */
router.post('/:userId/communications/schedule', validateCommunication, scheduleCommunication);

/**
 * @route   POST /api/users/:userId/communications/:communicationId/cancel
 * @desc    Cancel a scheduled communication
 * @access   Private
 */
router.post('/:userId/communications/:communicationId/cancel', cancelScheduledCommunication);

/**
 * @route   POST /api/users/:userId/communications/:communicationId/resend
 * @desc    Resend a communication
 * @access   Private
 */
router.post('/:userId/communications/:communicationId/resend', resendCommunication);

/**
 * @route   GET /api/users/:userId/communications/analytics
 * @desc    Get communication analytics for a user
 * @access   Private
 */
router.get('/:userId/communications/analytics', getCommunicationAnalytics);

/**
 * @route   GET /api/users/:userId/communications/search
 * @desc    Search communications for a user
 * @access   Private
 */
router.get('/:userId/communications/search', searchCommunications);

/**
 * @route   GET /api/users/:userId/communications/export.:format
 * @desc    Export communications in various formats
 * @access   Private
 */
router.get('/:userId/communications/export.:format', exportCommunications);

export default router;