/**
 * User Preferences Validation Middleware
 *
 * Middleware for validating user notification preferences:
 * - Validate preference data structure
 * - Check for logical conflicts
 * - Ensure required fields are present
 * - Validate data types and formats
 * - Check for permission issues
 */

import PreferencesValidationService from '../../services/notification/preferencesValidation.service.js';

const validationService = new PreferencesValidationService();

/**
 * Validate user notification preferences
 */
export const validateNotificationPreferences = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const preferencesData = req.body;

    // Check if preferences data is provided
    if (!preferencesData || Object.keys(preferencesData).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_PREFERENCES_DATA',
          message: 'No preferences data provided',
        },
      });
    }

    // Validate preferences structure
    const validation =
      await validationService.validatePreferences(preferencesData);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid preferences data',
          details: validation.errors,
        },
        warnings: validation.warnings,
      });
    }

    // Add validation result to request for later use
    req.validationResult = validation;

    next();
  } catch (error) {
    console.error('Preferences validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Preferences validation failed',
      },
    });
  }
};

/**
 * Validate device token data
 */
export const validateDeviceToken = (req, res, next) => {
  try {
    const { token, platform } = req.body;

    // Check if token is provided
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Device token is required and must be a non-empty string',
        },
      });
    }

    // Check if platform is valid
    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PLATFORM',
          message: 'Platform is required and must be one of: ios, android, web',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Device token validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Device token validation failed',
      },
    });
  }
};

/**
 * Validate email verification data
 */
export const validateEmailVerification = (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Email is required and must be a string',
        },
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Email must be a valid email address',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Email verification validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Email verification validation failed',
      },
    });
  }
};

/**
 * Validate phone verification data
 */
export const validatePhoneVerification = (req, res, next) => {
  try {
    const { phone } = req.body;

    // Check if phone is provided
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: 'Phone number is required and must be a string',
        },
      });
    }

    // Validate phone format (E.164)
    const cleanPhone = phone.trim();
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE_FORMAT',
          message: 'Phone number must be in E.164 format (e.g., +1234567890)',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Phone verification validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Phone verification validation failed',
      },
    });
  }
};

/**
 * Validate migration request
 */
export const validateMigrationRequest = (req, res, next) => {
  try {
    const { targetVersion, batchSize, force } = req.body;

    // Check if target version is provided
    if (!targetVersion || typeof targetVersion !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TARGET_VERSION',
          message: 'Target version is required and must be a string',
        },
      });
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+$/.test(targetVersion)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_VERSION_FORMAT',
          message:
            'Target version must be in semantic version format (e.g., 2.0.0)',
        },
      });
    }

    // Validate batch size if provided
    if (batchSize !== undefined) {
      if (typeof batchSize !== 'number' || batchSize < 1 || batchSize > 1000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BATCH_SIZE',
            message: 'Batch size must be a number between 1 and 1000',
          },
        });
      }
    }

    // Validate force flag if provided
    if (force !== undefined && typeof force !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FORCE_FLAG',
          message: 'Force flag must be a boolean',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Migration request validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Migration request validation failed',
      },
    });
  }
};

/**
 * Validate user access to preferences
 */
export const validateUserAccess = (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    // Check if user ID is provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'User ID is required',
        },
      });
    }

    // Check if user has access to the preferences
    if (currentUser.role !== 'admin' && userId !== currentUser._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own preferences',
        },
      });
    }

    next();
  } catch (error) {
    console.error('User access validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'User access validation failed',
      },
    });
  }
};

/**
 * Validate admin access
 */
export const validateAdminAccess = (req, res, next) => {
  try {
    const currentUser = req.user;

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access this endpoint',
        },
      });
    }

    next();
  } catch (error) {
    console.error('Admin access validation middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Admin access validation failed',
      },
    });
  }
};

export default {
  validateNotificationPreferences,
  validateDeviceToken,
  validateEmailVerification,
  validatePhoneVerification,
  validateMigrationRequest,
  validateUserAccess,
  validateAdminAccess,
};
