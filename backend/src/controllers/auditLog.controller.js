/**
 * Audit Log Controller
 *
 * This controller handles all HTTP requests related to audit log management,
 * including retrieval, searching, analytics, and compliance reporting.
 */

import auditLogService from '../services/auditLog.service.js';
import { LOG_CATEGORIES } from '../config/auditLog.config.js';
import logger from '../helpers/logger.js';

/**
 * Get audit logs with filtering and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditLogs = async (req, res) => {
  try {
    // Extract filters from query parameters
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      category: req.query.category,
      severity: req.query.severity,
      outcome: req.query.outcome,
      resource: req.query.resource,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      correlationId: req.query.correlationId,
      ipAddress: req.query.ipAddress,
    };

    // Extract pagination options
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      sortBy: req.query.sortBy || 'timestamp',
      sortOrder: req.query.sortOrder || 'desc',
    };

    // Validate limit
    if (options.limit > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 1000 records',
      });
    }

    // Get logs
    const result = await auditLogService.getLogs(filters, options);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      filters,
    });
  } catch (error) {
    logger.error('Failed to get audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get a specific audit log by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Audit log ID is required',
      });
    }

    // Get the audit log
    const auditLog = await auditLogService.getLogById(id);

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.status(200).json({
      success: true,
      data: auditLog,
    });
  } catch (error) {
    logger.error('Failed to get audit log by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get audit analytics and metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditAnalytics = async (req, res) => {
  try {
    // Extract date range from query parameters
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(); // Default: now

    // Validate date range
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    // Limit date range to prevent performance issues
    const maxDays = 365;
    const daysDiff = (endDate - startDate) / (24 * 60 * 60 * 1000);
    if (daysDiff > maxDays) {
      return res.status(400).json({
        success: false,
        message: `Date range cannot exceed ${maxDays} days`,
      });
    }

    // Get analytics
    const analytics = await auditLogService.getAnalytics(startDate, endDate);

    res.status(200).json({
      success: true,
      data: analytics,
      period: { startDate, endDate },
    });
  } catch (error) {
    logger.error('Failed to get audit analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get compliance report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getComplianceReport = async (req, res) => {
  try {
    // Extract date range from query parameters
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(); // Default: now

    // Validate date range
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date',
      });
    }

    // Get compliance report
    const report = await auditLogService.getComplianceReport(
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Failed to get compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Export audit logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exportAuditLogs = async (req, res) => {
  try {
    // Extract filters from request body
    const filters = req.body.filters || {};

    // Extract export options
    const options = {
      format: req.body.format || 'json',
      includeSensitive: req.body.includeSensitive || false,
    };

    // Validate format
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(options.format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Supported formats: ${validFormats.join(', ')}`,
      });
    }

    // Export logs
    const exportData = await auditLogService.exportLogs(filters, options);

    // Set appropriate headers
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${options.format}`;

    if (options.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      return res.send(exportData.data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      return res.json(exportData);
    }
  } catch (error) {
    logger.error('Failed to export audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Apply retention policies to audit logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const applyRetentionPolicies = async (req, res) => {
  try {
    // Check if user has permission to perform this action
    if (!req.user || !req.user.permissions?.includes('audit:manage')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to manage retention policies',
      });
    }

    // Apply retention policies
    const results = await auditLogService.applyRetentionPolicies();

    res.status(200).json({
      success: true,
      message: 'Retention policies applied successfully',
      data: results,
    });
  } catch (error) {
    logger.error('Failed to apply retention policies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply retention policies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get security events and alerts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getSecurityEvents = async (req, res) => {
  try {
    // Extract options from query parameters
    const limit = parseInt(req.query.limit) || 50;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago

    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(); // Default: now

    // Validate limit
    if (limit > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 1000 records',
      });
    }

    // Get security events
    const events = await auditLogService.getSecurityEvents(
      startDate,
      endDate,
      limit
    );

    res.status(200).json({
      success: true,
      data: events,
      period: { startDate, endDate },
    });
  } catch (error) {
    logger.error('Failed to get security events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get audit log statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditStats = async (req, res) => {
  try {
    // Extract date range from query parameters
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: 24 hours ago

    const endDate = req.query.endDate
      ? new Date(req.query.endDate)
      : new Date(); // Default: now

    // Get basic statistics
    const [
      totalLogs,
      securityEvents,
      failedLogins,
      uniqueUsers,
      uniqueIPs,
      topActions,
      topResources,
    ] = await Promise.all([
      auditLogService.getLogCount(startDate, endDate),
      auditLogService.getSecurityEventCount(startDate, endDate),
      auditLogService.getFailedLoginCount(startDate, endDate),
      auditLogService.getUniqueUserCount(startDate, endDate),
      auditLogService.getUniqueIPCount(startDate, endDate),
      auditLogService.getTopActions(startDate, endDate, 10),
      auditLogService.getTopResources(startDate, endDate, 10),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalLogs,
          securityEvents,
          failedLogins,
          uniqueUsers,
          uniqueIPs,
        },
        topActions,
        topResources,
      },
      period: { startDate, endDate },
    });
  } catch (error) {
    logger.error('Failed to get audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Search audit logs by text
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const searchAuditLogs = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
      });
    }

    // Extract additional filters
    const filters = {
      ...req.body.filters,
      searchText: query,
    };

    // Extract pagination options
    const options = {
      page: parseInt(req.body.page) || 1,
      limit: parseInt(req.body.limit) || 100,
      sortBy: req.body.sortBy || 'timestamp',
      sortOrder: req.body.sortOrder || 'desc',
    };

    // Validate limit
    if (options.limit > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 1000 records',
      });
    }

    // Search logs
    const result = await auditLogService.searchLogs(filters, options);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      query,
      filters,
    });
  } catch (error) {
    logger.error('Failed to search audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get audit log by correlation ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditLogsByCorrelationId = async (req, res) => {
  try {
    const { correlationId } = req.params;

    if (!correlationId) {
      return res.status(400).json({
        success: false,
        message: 'Correlation ID is required',
      });
    }

    // Get logs by correlation ID
    const logs = await auditLogService.getLogsByCorrelationId(correlationId);

    res.status(200).json({
      success: true,
      data: logs,
      correlationId,
    });
  } catch (error) {
    logger.error('Failed to get audit logs by correlation ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs by correlation ID',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user activity logs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    // Extract filters and options
    const filters = {
      userId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      category: req.query.category,
      severity: req.query.severity,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      sortBy: req.query.sortBy || 'timestamp',
      sortOrder: req.query.sortOrder || 'desc',
    };

    // Validate limit
    if (options.limit > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Limit cannot exceed 1000 records',
      });
    }

    // Get user activity logs
    const result = await auditLogService.getLogs(filters, options);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      userId,
    });
  } catch (error) {
    logger.error('Failed to get user activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user activity logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get available audit log categories and actions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAuditLogMetadata = async (req, res) => {
  try {
    // Get available categories
    const categories = Object.values(LOG_CATEGORIES);

    // Get available actions (this would typically come from a database or config)
    const actions = [
      'LOGIN',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGE',
      'ACCESS',
      'CREATE',
      'UPDATE',
      'DELETE',
      'ROLE_ASSIGN',
      'ROLE_REVOKE',
      'PERMISSION_GRANT',
      'PERMISSION_REVOKE',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'DATA_BACKUP',
      'DATA_RESTORE',
      'ENCRYPT',
      'DECRYPT',
      'KEY_GENERATE',
      'KEY_ROTATE',
      'SYSTEM_START',
      'SYSTEM_STOP',
      'CONFIG_CHANGE',
      'ERROR',
    ];

    // Get available severities
    const severities = [
      'DEBUG',
      'INFO',
      'WARN',
      'ERROR',
      'SECURITY',
      'COMPLIANCE',
    ];

    // Get available outcomes
    const outcomes = ['SUCCESS', 'FAILURE', 'PARTIAL', 'TIMEOUT'];

    res.status(200).json({
      success: true,
      data: {
        categories,
        actions,
        severities,
        outcomes,
      },
    });
  } catch (error) {
    logger.error('Failed to get audit log metadata:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export {
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
};
