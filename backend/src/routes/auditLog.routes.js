/**
 * Audit Log Routes
 *
 * This file defines all the routes for audit log management,
 * including retrieval, searching, analytics, and compliance reporting.
 */

import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditAnalytics,
  getComplianceReport,
  exportAuditLogs,
  applyRetentionPolicies,
  getSecurityEvents,
  getAuditStats,
  searchAuditLogs,
  getAuditLogsByCorrelationId,
  getUserActivityLogs,
  getAuditLogMetadata,
} from '../controllers/auditLog.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/roleManagement.middleware.js';
import { body, query, param, validationResult } from 'express-validator';

const router = Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Apply authentication to all audit log routes
router.use(authenticate);

/**
 * @route   GET /api/audit/logs
 * @desc    Get audit logs with filtering and pagination
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/logs',
  authorize('audit:read'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('category')
      .optional()
      .isIn([
        'AUTHENTICATION',
        'AUTHORIZATION',
        'DATA_OPERATIONS',
        'SECURITY',
        'SYSTEM',
      ])
      .withMessage('Invalid category'),
    query('severity')
      .optional()
      .isIn(['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'COMPLIANCE'])
      .withMessage('Invalid severity'),
    query('outcome')
      .optional()
      .isIn(['SUCCESS', 'FAILURE', 'PARTIAL', 'TIMEOUT'])
      .withMessage('Invalid outcome'),
  ],
  handleValidationErrors,
  getAuditLogs
);

/**
 * @route   GET /api/audit/logs/:id
 * @desc    Get a specific audit log by ID
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/logs/:id',
  authorize('audit:read'),
  [param('id').isMongoId().withMessage('Invalid audit log ID')],
  handleValidationErrors,
  getAuditLogById
);

/**
 * @route   GET /api/audit/logs/correlation/:correlationId
 * @desc    Get audit logs by correlation ID
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/logs/correlation/:correlationId',
  authorize('audit:read'),
  [param('correlationId').isUUID().withMessage('Invalid correlation ID')],
  handleValidationErrors,
  getAuditLogsByCorrelationId
);

/**
 * @route   GET /api/audit/users/:userId/activity
 * @desc    Get user activity logs
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/users/:userId/activity',
  authorize('audit:read'),
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  getUserActivityLogs
);

/**
 * @route   GET /api/audit/analytics
 * @desc    Get audit analytics and metrics
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/analytics',
  authorize('audit:read'),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  getAuditAnalytics
);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit log statistics
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/stats',
  authorize('audit:read'),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  getAuditStats
);

/**
 * @route   GET /api/audit/compliance
 * @desc    Get compliance report
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/compliance',
  authorize('audit:read'),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  getComplianceReport
);

/**
 * @route   GET /api/audit/security
 * @desc    Get security events and alerts
 * @access  Private (requires audit:read permission)
 */
router.get(
  '/security',
  authorize('audit:read'),
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
  ],
  handleValidationErrors,
  getSecurityEvents
);

/**
 * @route   POST /api/audit/search
 * @desc    Search audit logs by text
 * @access  Private (requires audit:read permission)
 */
router.post(
  '/search',
  authorize('audit:read'),
  [
    body('query')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters'),
    body('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    body('sortBy')
      .optional()
      .isIn(['timestamp', 'action', 'category', 'severity', 'outcome'])
      .withMessage('Invalid sort field'),
    body('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc'),
  ],
  handleValidationErrors,
  searchAuditLogs
);

/**
 * @route   POST /api/audit/export
 * @desc    Export audit logs
 * @access  Private (requires audit:export permission)
 */
router.post(
  '/export',
  authorize('audit:export'),
  [
    body('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    body('includeSensitive')
      .optional()
      .isBoolean()
      .withMessage('Include sensitive must be a boolean'),
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    body('filters.startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('filters.endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    body('filters.category')
      .optional()
      .isIn([
        'AUTHENTICATION',
        'AUTHORIZATION',
        'DATA_OPERATIONS',
        'SECURITY',
        'SYSTEM',
      ])
      .withMessage('Invalid category'),
    body('filters.severity')
      .optional()
      .isIn(['DEBUG', 'INFO', 'WARN', 'ERROR', 'SECURITY', 'COMPLIANCE'])
      .withMessage('Invalid severity'),
    body('filters.outcome')
      .optional()
      .isIn(['SUCCESS', 'FAILURE', 'PARTIAL', 'TIMEOUT'])
      .withMessage('Invalid outcome'),
  ],
  handleValidationErrors,
  exportAuditLogs
);

/**
 * @route   DELETE /api/audit/retention
 * @desc    Apply retention policies to audit logs
 * @access  Private (requires audit:manage permission)
 */
router.delete('/retention', authorize('audit:manage'), applyRetentionPolicies);

/**
 * @route   GET /api/audit/metadata
 * @desc    Get available audit log categories, actions, severities, and outcomes
 * @access  Private (requires audit:read permission)
 */
router.get('/metadata', authorize('audit:read'), getAuditLogMetadata);

export default router;
