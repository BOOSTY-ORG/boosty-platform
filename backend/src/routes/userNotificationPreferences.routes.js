/**
 * User Notification Preferences Routes
 *
 * API endpoints for managing user notification preferences:
 * - Get user notification preferences
 * - Update user notification preferences
 * - Reset user preferences to defaults
 * - Get available notification types and channels
 * - Validate preference combinations
 * - Handle preference migration
 * - Manage device tokens
 * - Verify email and phone
 * - Get preference statistics
 */

import express from 'express';
import {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  getAvailableOptions,
  validatePreferences,
  migratePreferences,
  bulkMigratePreferences,
  getPreferenceStats,
  updateDeviceToken,
  removeDeviceToken,
  verifyEmail,
  verifyPhone,
} from '../controllers/userNotificationPreferences.controller.js';
import { requireSignin } from '../middleware/auth.middleware.js';
import { validatePreferencesUpdate } from '../middleware/notification/notificationValidation.middleware.js';
import {
  validateUserAccess,
  validateAdminAccess,
  validateMigrationRequest,
} from '../middleware/notification/userPreferencesValidation.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/users/:userId/preferences
 * @desc    Get user notification preferences
 * @access  Private (user or admin)
 */
router.get('/:userId/preferences', requireSignin, getUserPreferences);

/**
 * @route   PUT /api/users/:userId/preferences
 * @desc    Update user notification preferences
 * @access  Private (user or admin)
 */
router.put(
  '/:userId/preferences',
  requireSignin,
  validateUserAccess,
  validatePreferencesUpdate,
  updateUserPreferences
);

/**
 * @route   POST /api/users/:userId/preferences/reset
 * @desc    Reset user preferences to defaults
 * @access  Private (user or admin)
 */
router.post('/:userId/preferences/reset', requireSignin, resetUserPreferences);

/**
 * @route   GET /api/users/preferences/options
 * @desc    Get available notification types and channels
 * @access  Public
 */
router.get('/preferences/options', getAvailableOptions);

/**
 * @route   POST /api/users/preferences/validate
 * @desc    Validate preference combinations
 * @access  Public
 */
router.post('/preferences/validate', validatePreferences);

/**
 * @route   POST /api/users/:userId/preferences/migrate
 * @desc    Migrate user preferences
 * @access  Private (admin only)
 */
router.post(
  '/:userId/preferences/migrate',
  requireSignin,
  validateAdminAccess,
  validateMigrationRequest,
  migratePreferences
);

/**
 * @route   POST /api/users/preferences/bulk-migrate
 * @desc    Bulk migrate user preferences
 * @access  Private (admin only)
 */
router.post(
  '/preferences/bulk-migrate',
  requireSignin,
  validateAdminAccess,
  validateMigrationRequest,
  bulkMigratePreferences
);

/**
 * @route   GET /api/users/preferences/stats
 * @desc    Get preference statistics
 * @access  Private (admin only)
 */
router.get(
  '/preferences/stats',
  requireSignin,
  validateAdminAccess,
  getPreferenceStats
);

/**
 * @route   PUT /api/users/:userId/device-token
 * @desc    Update device token for push notifications
 * @access  Private (user or admin)
 */
router.put('/:userId/device-token', requireSignin, updateDeviceToken);

/**
 * @route   DELETE /api/users/:userId/device-token
 * @desc    Remove device token
 * @access  Private (user or admin)
 */
router.delete('/:userId/device-token', requireSignin, removeDeviceToken);

/**
 * @route   POST /api/users/:userId/verify-email
 * @desc    Verify email address
 * @access  Private (user or admin)
 */
router.post('/:userId/verify-email', requireSignin, verifyEmail);

/**
 * @route   POST /api/users/:userId/verify-phone
 * @desc    Verify phone number
 * @access  Private (user or admin)
 */
router.post('/:userId/verify-phone', requireSignin, verifyPhone);

export default router;
