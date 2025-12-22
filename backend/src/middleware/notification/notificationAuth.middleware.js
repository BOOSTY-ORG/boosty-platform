/**
 * Notification Authentication Middleware
 *
 * Provides authentication and authorization for notification endpoints:
 * - Authentication for notification endpoints
 * - Authorization for accessing specific notifications
 * - Rate limiting for notification operations
 * - Input validation and sanitization
 */

import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import Notification from '../../models/notification.model.js';
import { formatErrorResponse } from '../../utils/metrics/responseFormatter.util.js';

/**
 * Authenticate notification requests
 */
export const authenticateNotificationRequest = async (req, res, next) => {
  try {
    const token = req.cookies.t || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json(
        formatErrorResponse({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required',
        })
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id).select('role email name');

    if (!user) {
      return res.status(401).json(
        formatErrorResponse({
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        })
      );
    }

    req.auth = decoded;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(
      formatErrorResponse({
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
      })
    );
  }
};

/**
 * Role-based access control for notification endpoints
 */
export const requireNotificationRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        formatErrorResponse({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
        })
      );
    }
    next();
  };
};

/**
 * Admin role requirement
 */
export const requireNotificationAdmin = requireNotificationRole([
  'admin',
  'superadmin',
]);

/**
 * Manager role requirement
 */
export const requireNotificationManager = requireNotificationRole([
  'admin',
  'manager',
  'superadmin',
]);

/**
 * User role requirement (includes all roles)
 */
export const requireNotificationUser = requireNotificationRole([
  'admin',
  'manager',
  'user',
  'superadmin',
]);

/**
 * Check if user can access specific notification
 */
export const requireNotificationAccess = (req, res, next) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;

      // Get notification
      const notification = await Notification.findById(id);

      if (!notification) {
        return res.status(404).json(
          formatErrorResponse({
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found',
          })
        );
      }

      // Check ownership or admin access
      const isOwner =
        notification.userId.toString() === req.user._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse({
            code: 'ACCESS_DENIED',
            message: 'You can only access your own notifications',
          })
        );
      }

      // Add notification to request for later use
      req.notification = notification;
      next();
    } catch (error) {
      return res.status(500).json(
        formatErrorResponse({
          code: 'ACCESS_CHECK_ERROR',
          message: 'Error checking notification access',
        })
      );
    }
  };
};

/**
 * Check if user can access user preferences
 */
export const requirePreferencesAccess = (req, res, next) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.params;

      // Check ownership or admin access
      const isOwner = userId === req.user._id.toString();
      const isAdmin = ['admin', 'manager', 'superadmin'].includes(
        req.user.role
      );

      if (!isOwner && !isAdmin) {
        return res.status(403).json(
          formatErrorResponse({
            code: 'ACCESS_DENIED',
            message: 'You can only access your own preferences',
          })
        );
      }

      next();
    } catch (error) {
      return res.status(500).json(
        formatErrorResponse({
          code: 'ACCESS_CHECK_ERROR',
          message: 'Error checking preferences access',
        })
      );
    }
  };
};

/**
 * Check if user can manage templates
 */
export const requireTemplateManagement = (req, res, next) => {
  const allowedRoles = ['admin', 'manager', 'superadmin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json(
      formatErrorResponse({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to manage templates',
      })
    );
  }

  next();
};

/**
 * Rate limiting for notification operations
 */
export const notificationRateLimit = (
  maxRequests = 100,
  windowMs = 15 * 60 * 1000
) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [userKey, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(
        (timestamp) => timestamp > windowStart
      );
      if (validTimestamps.length === 0) {
        requests.delete(userKey);
      } else {
        requests.set(userKey, validTimestamps);
      }
    }

    // Get user's request history
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(
      (timestamp) => timestamp > windowStart
    );

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json(
        formatErrorResponse({
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Maximum ${maxRequests} requests per ${windowMs / 60000} minutes.`,
        })
      );
    }

    // Add current request
    recentRequests.push(now);
    requests.set(key, recentRequests);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - recentRequests.length),
      'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
    });

    next();
  };
};

/**
 * Rate limiting for sending notifications (more restrictive)
 */
export const sendNotificationRateLimit = notificationRateLimit(
  50,
  15 * 60 * 1000
); // 50 per 15 minutes

/**
 * Rate limiting for bulk operations (even more restrictive)
 */
export const bulkOperationRateLimit = notificationRateLimit(10, 60 * 60 * 1000); // 10 per hour

/**
 * Rate limiting for template operations
 */
export const templateOperationRateLimit = notificationRateLimit(
  20,
  15 * 60 * 1000
); // 20 per 15 minutes

/**
 * Webhook authentication for Twilio
 */
export const authenticateTwilioWebhook = (req, res, next) => {
  try {
    // Get Twilio signature from headers
    const signature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.headers.host}${req.originalUrl}`;

    if (!signature) {
      return res.status(401).json(
        formatErrorResponse({
          code: 'MISSING_SIGNATURE',
          message: 'Missing Twilio signature',
        })
      );
    }

    // In production, verify the signature using Twilio's validation
    // For now, we'll just check if the signature exists
    // TODO: Implement proper Twilio signature verification

    req.webhookProvider = 'twilio';
    next();
  } catch (error) {
    return res.status(401).json(
      formatErrorResponse({
        code: 'WEBHOOK_AUTH_ERROR',
        message: 'Webhook authentication failed',
      })
    );
  }
};

/**
 * Webhook authentication for Mailgun
 */
export const authenticateMailgunWebhook = (req, res, next) => {
  try {
    // Get Mailgun signature from headers
    const signature = req.headers['x-mailgun-signature'];
    const timestamp = req.headers['x-mailgun-timestamp'];
    const token = req.headers['x-mailgun-token'];

    if (!signature || !timestamp || !token) {
      return res.status(401).json(
        formatErrorResponse({
          code: 'MISSING_SIGNATURE',
          message: 'Missing Mailgun signature components',
        })
      );
    }

    // In production, verify the signature using Mailgun's validation
    // For now, we'll just check if the signature exists
    // TODO: Implement proper Mailgun signature verification

    req.webhookProvider = 'mailgun';
    next();
  } catch (error) {
    return res.status(401).json(
      formatErrorResponse({
        code: 'WEBHOOK_AUTH_ERROR',
        message: 'Webhook authentication failed',
      })
    );
  }
};

/**
 * Check if user can send notifications to specific user
 */
export const canSendToUser = (req, res, next) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.body;

      // Users can always send to themselves
      if (userId === req.user._id.toString()) {
        return next();
      }

      // Admins and managers can send to anyone
      if (['admin', 'manager', 'superadmin'].includes(req.user.role)) {
        return next();
      }

      // Regular users cannot send to other users
      return res.status(403).json(
        formatErrorResponse({
          code: 'CANNOT_SEND_TO_OTHERS',
          message: 'You can only send notifications to yourself',
        })
      );
    } catch (error) {
      return res.status(500).json(
        formatErrorResponse({
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Error checking send permissions',
        })
      );
    }
  };
};

/**
 * Check if user can access analytics
 */
export const requireAnalyticsAccess = (req, res, next) => {
  const allowedRoles = ['admin', 'manager', 'analyst', 'superadmin'];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json(
      formatErrorResponse({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access analytics',
      })
    );
  }

  next();
};

export default {
  authenticateNotificationRequest,
  requireNotificationRole,
  requireNotificationAdmin,
  requireNotificationManager,
  requireNotificationUser,
  requireNotificationAccess,
  requirePreferencesAccess,
  requireTemplateManagement,
  notificationRateLimit,
  sendNotificationRateLimit,
  bulkOperationRateLimit,
  templateOperationRateLimit,
  authenticateTwilioWebhook,
  authenticateMailgunWebhook,
  canSendToUser,
  requireAnalyticsAccess,
};
