/**
 * Audit Log Service
 *
 * This service handles all audit logging operations including logging,
 * retrieval, analysis, and management of audit logs.
 */

import { v4 as uuidv4 } from 'uuid';
import AuditLog from '../models/auditLog.model.js';
import auditLogConfig from '../config/auditLog.config.js';
import encryptionService from './encryption.service.js';
import logger from '../helpers/logger.js';

class AuditLogService {
  constructor() {
    this.logBuffer = [];
    this.flushTimer = null;
    this.isProcessing = false;

    // Initialize async logging if enabled
    if (auditLogConfig.performance.asyncLogging) {
      this.initializeAsyncLogging();
    }
  }

  /**
   * Initialize async logging with buffer and flush interval
   */
  initializeAsyncLogging() {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, auditLogConfig.performance.flushInterval);
  }

  /**
   * Log an audit event
   * @param {Object} logData - The log data
   * @returns {Promise<Object>} The created log entry
   */
  async log(logData) {
    try {
      // Validate required fields
      if (!logData.action || !logData.category || !logData.message) {
        throw new Error('Missing required fields: action, category, message');
      }

      // Create log entry
      const auditLogEntry = this.createLogEntry(logData);

      // Process sensitive data
      await this.processSensitiveData(auditLogEntry);

      // Check if async logging is enabled
      if (auditLogConfig.performance.asyncLogging) {
        this.addToBuffer(auditLogEntry);
        return auditLogEntry;
      }

      // Synchronous logging
      return await this.saveLog(auditLogEntry);
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      throw error;
    }
  }

  /**
   * Create a structured log entry
   * @param {Object} logData - The raw log data
   * @returns {Object} The structured log entry
   */
  createLogEntry(logData) {
    return {
      timestamp: new Date(),
      correlationId: logData.correlationId || uuidv4(),
      userId: logData.userId,
      userRole: logData.userRole,
      userName: logData.userName,
      userEmail: logData.userEmail,
      action: logData.action,
      category: logData.category,
      resource: logData.resource,
      resourceId: logData.resourceId,
      resourceType: logData.resourceType,
      method: logData.method,
      endpoint: logData.endpoint,
      httpStatus: logData.httpStatus,
      ipAddress: this.anonymizeIpAddress(logData.ipAddress),
      userAgent: logData.userAgent,
      sessionId: logData.sessionId,
      outcome: logData.outcome || 'SUCCESS',
      severity: logData.severity || 'INFO',
      message: logData.message,
      metadata: logData.metadata || {},
      error: logData.error,
      duration: logData.duration,
      responseSize: logData.responseSize,
      source: logData.source || {
        service: 'boosty-api',
        module: 'audit-log',
      },
      securityContext: logData.securityContext,
      dataClassification: logData.dataClassification || 'INTERNAL',
      complianceFlags: logData.complianceFlags || {},
    };
  }

  /**
   * Process and encrypt sensitive data in log entry
   * @param {Object} logEntry - The log entry to process
   */
  async processSensitiveData(logEntry) {
    if (!auditLogConfig.privacy.encryptSensitiveData) {
      return;
    }

    try {
      // Encrypt sensitive metadata fields
      if (logEntry.metadata) {
        for (const field of auditLogConfig.privacy.sensitiveFields) {
          if (logEntry.metadata[field]) {
            logEntry.metadata[field] = await encryptionService.encrypt(
              logEntry.metadata[field]
            );
          }
        }
      }

      // Encrypt error message if it contains sensitive data
      if (logEntry.error && logEntry.error.message) {
        for (const field of auditLogConfig.privacy.sensitiveFields) {
          if (
            logEntry.error.message.toLowerCase().includes(field.toLowerCase())
          ) {
            logEntry.error.message = await encryptionService.encrypt(
              logEntry.error.message
            );
            break;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to process sensitive data in audit log:', error);
    }
  }

  /**
   * Anonymize IP address for privacy
   * @param {string} ipAddress - The IP address to anonymize
   * @returns {string} The anonymized IP address
   */
  anonymizeIpAddress(ipAddress) {
    if (!ipAddress || !auditLogConfig.privacy.anonymizeIpAddresses) {
      return ipAddress;
    }

    try {
      // For IPv4, replace last octet with 0
      if (ipAddress.includes('.')) {
        const parts = ipAddress.split('.');
        if (parts.length === 4) {
          parts[3] = '0';
          return parts.join('.');
        }
      }

      // For IPv6, replace last 64 bits with zeros
      if (ipAddress.includes(':')) {
        const parts = ipAddress.split(':');
        if (parts.length === 8) {
          parts[6] = '0';
          parts[7] = '0';
          return parts.join(':');
        }
      }

      return ipAddress;
    } catch (error) {
      logger.error('Failed to anonymize IP address:', error);
      return ipAddress;
    }
  }

  /**
   * Add log entry to buffer for async processing
   * @param {Object} logEntry - The log entry to buffer
   */
  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);

    // Flush buffer if it reaches max size
    if (this.logBuffer.length >= auditLogConfig.performance.bufferSize) {
      this.flushBuffer();
    }
  }

  /**
   * Flush the buffer to database
   */
  async flushBuffer() {
    if (this.isProcessing || this.logBuffer.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await AuditLog.insertMany(logsToProcess, { ordered: false });
      logger.debug(`Flushed ${logsToProcess.length} audit logs to database`);
    } catch (error) {
      logger.error('Failed to flush audit log buffer:', error);

      // Retry logic
      let retryCount = 0;
      while (retryCount < auditLogConfig.performance.maxRetries) {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, auditLogConfig.performance.retryDelay)
          );
          await AuditLog.insertMany(logsToProcess, { ordered: false });
          logger.debug(
            `Retry ${retryCount + 1} successful for audit log buffer`
          );
          break;
        } catch (retryError) {
          retryCount++;
          if (retryCount >= auditLogConfig.performance.maxRetries) {
            logger.error(
              'Max retries reached for audit log buffer:',
              retryError
            );
            // Add back to buffer for future retry
            this.logBuffer.unshift(...logsToProcess);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Save log entry to database
   * @param {Object} logEntry - The log entry to save
   * @returns {Promise<Object>} The saved log entry
   */
  async saveLog(logEntry) {
    try {
      const auditLog = new AuditLog(logEntry);
      const savedLog = await auditLog.save();

      // Check for security alerts
      await this.checkSecurityAlerts(savedLog);

      // Send to external systems if configured
      await this.sendToExternalSystems(savedLog);

      return savedLog;
    } catch (error) {
      logger.error('Failed to save audit log:', error);
      throw error;
    }
  }

  /**
   * Check if log entry triggers any security alerts
   * @param {Object} logEntry - The log entry to check
   */
  async checkSecurityAlerts(logEntry) {
    if (!auditLogConfig.alerts.enabled) {
      return;
    }

    try {
      // Check for failed login attempts
      if (logEntry.action === 'LOGIN' && logEntry.outcome === 'FAILURE') {
        const recentFailures = await AuditLog.countDocuments({
          userId: logEntry.userId,
          action: 'LOGIN',
          outcome: 'FAILURE',
          timestamp: {
            $gte: new Date(Date.now() - 60 * 1000), // Last minute
          },
        });

        if (recentFailures >= auditLogConfig.alerts.failedLoginThreshold) {
          await this.triggerSecurityAlert({
            type: 'MULTIPLE_FAILED_LOGINS',
            userId: logEntry.userId,
            count: recentFailures,
            timestamp: new Date(),
          });
        }
      }

      // Check for privilege escalation
      if (
        logEntry.action === 'ROLE_ASSIGN' &&
        logEntry.metadata?.privilegeEscalation
      ) {
        await this.triggerSecurityAlert({
          type: 'PRIVILEGE_ESCALATION',
          userId: logEntry.userId,
          targetUserId: logEntry.resourceId,
          newRole: logEntry.metadata.newRole,
          timestamp: new Date(),
        });
      }

      // Check for security events
      if (logEntry.severity === 'SECURITY') {
        const recentSecurityEvents = await AuditLog.countDocuments({
          severity: 'SECURITY',
          timestamp: {
            $gte: new Date(Date.now() - 60 * 1000), // Last minute
          },
        });

        if (
          recentSecurityEvents >= auditLogConfig.alerts.securityEventsThreshold
        ) {
          await this.triggerSecurityAlert({
            type: 'HIGH_SECURITY_EVENT_RATE',
            count: recentSecurityEvents,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check security alerts:', error);
    }
  }

  /**
   * Trigger a security alert
   * @param {Object} alertData - The alert data
   */
  async triggerSecurityAlert(alertData) {
    try {
      // Log the alert
      await this.log({
        action: 'SECURITY_ALERT',
        category: 'SECURITY',
        severity: 'SECURITY',
        message: `Security alert triggered: ${alertData.type}`,
        metadata: alertData,
        source: {
          service: 'boosty-api',
          module: 'audit-log-service',
          function: 'triggerSecurityAlert',
        },
      });

      // Here you could integrate with external alerting systems
      // like email, SMS, Slack, etc.
      logger.warn('Security alert triggered:', alertData);
    } catch (error) {
      logger.error('Failed to trigger security alert:', error);
    }
  }

  /**
   * Send log entry to external systems
   * @param {Object} logEntry - The log entry to send
   */
  async sendToExternalSystems(logEntry) {
    try {
      // Send to external logger if configured
      if (auditLogConfig.integrations.externalLogger.enabled) {
        // Implementation would depend on the external logger service
        logger.debug('Sending log to external logger:', logEntry.id);
      }

      // Send to SIEM if configured
      if (auditLogConfig.integrations.siem.enabled) {
        // Implementation would depend on the SIEM system
        logger.debug('Sending log to SIEM:', logEntry.id);
      }
    } catch (error) {
      logger.error('Failed to send log to external systems:', error);
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   * @param {Object} filters - The filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} The filtered logs with pagination info
   */
  async getLogs(filters = {}, options = {}) {
    try {
      const {
        userId,
        action,
        category,
        severity,
        outcome,
        resource,
        startDate,
        endDate,
        correlationId,
        ipAddress,
      } = filters;

      const {
        page = 1,
        limit = 100,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = options;

      // Build query
      const query = {};

      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (category) query.category = category;
      if (severity) query.severity = severity;
      if (outcome) query.outcome = outcome;
      if (resource) query.resource = resource;
      if (correlationId) query.correlationId = correlationId;
      if (ipAddress) query.ipAddress = ipAddress;

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        AuditLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(query),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit analytics
   * @param {Date} startDate - Start date for analytics
   * @param {Date} endDate - End date for analytics
   * @returns {Promise<Object>} The analytics data
   */
  async getAnalytics(startDate, endDate) {
    try {
      const analytics = await AuditLog.getAnalytics(startDate, endDate);

      // Get additional analytics
      const [
        categoryBreakdown,
        severityBreakdown,
        outcomeBreakdown,
        topUsers,
        topResources,
        recentSecurityEvents,
      ] = await Promise.all([
        this.getCategoryBreakdown(startDate, endDate),
        this.getSeverityBreakdown(startDate, endDate),
        this.getOutcomeBreakdown(startDate, endDate),
        this.getTopUsers(startDate, endDate),
        this.getTopResources(startDate, endDate),
        this.getRecentSecurityEvents(),
      ]);

      return {
        summary: analytics[0] || {},
        categoryBreakdown,
        severityBreakdown,
        outcomeBreakdown,
        topUsers,
        topResources,
        recentSecurityEvents,
      };
    } catch (error) {
      logger.error('Failed to get audit analytics:', error);
      throw error;
    }
  }

  /**
   * Get category breakdown for analytics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Category breakdown data
   */
  async getCategoryBreakdown(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get severity breakdown for analytics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Severity breakdown data
   */
  async getSeverityBreakdown(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get outcome breakdown for analytics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Outcome breakdown data
   */
  async getOutcomeBreakdown(startDate, endDate) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get top users by activity
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Top users data
   */
  async getTopUsers(startDate, endDate, limit = 10) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          userId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get top resources by access
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Top resources data
   */
  async getTopResources(startDate, endDate, limit = 10) {
    return await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          resource: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$resource',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get recent security events
   * @param {number} limit - Number of events to retrieve
   * @returns {Promise<Array>} Recent security events
   */
  async getRecentSecurityEvents(limit = 50) {
    return await AuditLog.find({
      $or: [
        { severity: 'SECURITY' },
        { severity: 'COMPLIANCE' },
        { outcome: 'FAILURE' },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Export audit logs
   * @param {Object} filters - Export filters
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data
   */
  async exportLogs(filters = {}, options = {}) {
    try {
      const { format = 'json', includeSensitive = false } = options;

      // Get logs matching filters
      const { logs } = await this.getLogs(filters, { limit: 10000 });

      // Process logs for export
      const exportData = logs.map((log) => {
        const exportLog = { ...log };

        // Remove sensitive data if not included
        if (!includeSensitive) {
          delete exportLog.metadata;
          delete exportLog.error;
          delete exportLog.securityContext;
        }

        return exportLog;
      });

      // Format based on requested format
      switch (format.toLowerCase()) {
        case 'csv':
          return this.formatAsCSV(exportData);
        case 'json':
        default:
          return {
            data: exportData,
            exportedAt: new Date(),
            count: exportData.length,
            format: 'json',
          };
      }
    } catch (error) {
      logger.error('Failed to export audit logs:', error);
      throw error;
    }
  }

  /**
   * Format logs as CSV
   * @param {Array} logs - The logs to format
   * @returns {Object} CSV export data
   */
  formatAsCSV(logs) {
    if (logs.length === 0) {
      return {
        data: '',
        exportedAt: new Date(),
        count: 0,
        format: 'csv',
      };
    }

    // Get headers from first log
    const headers = Object.keys(logs[0]).filter(
      (key) => typeof logs[0][key] !== 'object' || Array.isArray(logs[0][key])
    );

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...logs.map((log) =>
        headers
          .map((header) => {
            const value = log[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(',')
      ),
    ].join('\n');

    return {
      data: csvContent,
      exportedAt: new Date(),
      count: logs.length,
      format: 'csv',
    };
  }

  /**
   * Apply retention policies
   * @returns {Promise<Object>} Retention results
   */
  async applyRetentionPolicies() {
    try {
      const now = new Date();
      const results = {};

      // Process each severity level
      for (const [severity, days] of Object.entries(auditLogConfig.retention)) {
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const result = await AuditLog.deleteMany({
          severity,
          timestamp: { $lt: cutoffDate },
          archived: false,
        });

        results[severity] = {
          deletedCount: result.deletedCount,
          cutoffDate,
        };
      }

      return results;
    } catch (error) {
      logger.error('Failed to apply retention policies:', error);
      throw error;
    }
  }

  /**
   * Get compliance report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Compliance report
   */
  async getComplianceReport(startDate, endDate) {
    try {
      const [
        gdprEvents,
        soxEvents,
        hipaaEvents,
        pciEvents,
        dataAccessEvents,
        modificationEvents,
        deletionEvents,
      ] = await Promise.all([
        this.getComplianceEvents('gdpr', startDate, endDate),
        this.getComplianceEvents('sox', startDate, endDate),
        this.getComplianceEvents('hipaa', startDate, endDate),
        this.getComplianceEvents('pci', startDate, endDate),
        this.getEventsByAction('ACCESS', startDate, endDate),
        this.getEventsByAction(['CREATE', 'UPDATE'], startDate, endDate),
        this.getEventsByAction('DELETE', startDate, endDate),
      ]);

      return {
        period: { startDate, endDate },
        compliance: {
          gdpr: gdprEvents,
          sox: soxEvents,
          hipaa: hipaaEvents,
          pci: pciEvents,
        },
        dataOperations: {
          access: dataAccessEvents,
          modification: modificationEvents,
          deletion: deletionEvents,
        },
        generatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Get compliance events by flag
   * @param {string} flag - The compliance flag
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Compliance events
   */
  async getComplianceEvents(flag, startDate, endDate) {
    const query = {
      [`complianceFlags.${flag}`]: true,
      timestamp: { $gte: startDate, $lte: endDate },
    };

    const [events, count] = await Promise.all([
      AuditLog.find(query).limit(100).lean(),
      AuditLog.countDocuments(query),
    ]);

    return { events, count };
  }

  /**
   * Get events by action type
   * @param {string|Array} actions - Action(s) to filter by
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Events by action
   */
  async getEventsByAction(actions, startDate, endDate) {
    const actionArray = Array.isArray(actions) ? actions : [actions];
    const query = {
      action: { $in: actionArray },
      timestamp: { $gte: startDate, $lte: endDate },
    };

    const [events, count] = await Promise.all([
      AuditLog.find(query).limit(100).lean(),
      AuditLog.countDocuments(query),
    ]);

    return { events, count };
  }

  /**
   * Get a specific audit log by ID
   * @param {string} id - The log ID
   * @returns {Promise<Object>} The audit log
   */
  async getLogById(id) {
    try {
      const log = await AuditLog.findById(id).lean();
      return log;
    } catch (error) {
      logger.error('Failed to get audit log by ID:', error);
      throw error;
    }
  }

  /**
   * Get security events
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Number of events to retrieve
   * @returns {Promise<Array>} Security events
   */
  async getSecurityEvents(startDate, endDate, limit = 50) {
    try {
      return await this.getRecentSecurityEvents(limit);
    } catch (error) {
      logger.error('Failed to get security events:', error);
      throw error;
    }
  }

  /**
   * Get logs by correlation ID
   * @param {string} correlationId - The correlation ID
   * @returns {Promise<Array>} The audit logs
   */
  async getLogsByCorrelationId(correlationId) {
    try {
      return await AuditLog.findByCorrelationId(correlationId);
    } catch (error) {
      logger.error('Failed to get logs by correlation ID:', error);
      throw error;
    }
  }

  /**
   * Search logs with text query
   * @param {Object} filters - Search filters
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchLogs(filters, options) {
    try {
      const {
        searchText,
        userId,
        action,
        category,
        severity,
        outcome,
        resource,
        startDate,
        endDate,
      } = filters;

      const {
        page = 1,
        limit = 100,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = options;

      // Build query
      const query = {};

      // Text search
      if (searchText) {
        query.$text = { $search: searchText };
      }

      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (category) query.category = category;
      if (severity) query.severity = severity;
      if (outcome) query.outcome = outcome;
      if (resource) query.resource = resource;

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Sort options
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query with pagination
      const skip = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        AuditLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(query),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Failed to search audit logs:', error);
      throw error;
    }
  }

  /**
   * Get log count for statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Log count
   */
  async getLogCount(startDate, endDate) {
    try {
      return await AuditLog.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate },
      });
    } catch (error) {
      logger.error('Failed to get log count:', error);
      throw error;
    }
  }

  /**
   * Get security event count
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Security event count
   */
  async getSecurityEventCount(startDate, endDate) {
    try {
      return await AuditLog.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate },
        $or: [{ severity: 'SECURITY' }, { severity: 'COMPLIANCE' }],
      });
    } catch (error) {
      logger.error('Failed to get security event count:', error);
      throw error;
    }
  }

  /**
   * Get failed login count
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Failed login count
   */
  async getFailedLoginCount(startDate, endDate) {
    try {
      return await AuditLog.countDocuments({
        timestamp: { $gte: startDate, $lte: endDate },
        action: 'LOGIN',
        outcome: 'FAILURE',
      });
    } catch (error) {
      logger.error('Failed to get failed login count:', error);
      throw error;
    }
  }

  /**
   * Get unique user count
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Unique user count
   */
  async getUniqueUserCount(startDate, endDate) {
    try {
      const result = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            userId: { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            count: { $size: '$uniqueUsers' },
          },
        },
      ]);

      return result.length > 0 ? result[0].count : 0;
    } catch (error) {
      logger.error('Failed to get unique user count:', error);
      throw error;
    }
  }

  /**
   * Get unique IP count
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<number>} Unique IP count
   */
  async getUniqueIPCount(startDate, endDate) {
    try {
      const result = await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            ipAddress: { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            uniqueIPs: { $addToSet: '$ipAddress' },
          },
        },
        {
          $project: {
            count: { $size: '$uniqueIPs' },
          },
        },
      ]);

      return result.length > 0 ? result[0].count : 0;
    } catch (error) {
      logger.error('Failed to get unique IP count:', error);
      throw error;
    }
  }

  /**
   * Get top actions
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {number} limit - Number of actions to return
   * @returns {Promise<Array>} Top actions
   */
  async getTopActions(startDate, endDate, limit = 10) {
    try {
      return await AuditLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            action: { $exists: true },
          },
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);
    } catch (error) {
      logger.error('Failed to get top actions:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources on service shutdown
   */
  async cleanup() {
    try {
      // Flush any remaining logs in buffer
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }

      // Clear flush timer
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      logger.info('Audit log service cleaned up successfully');
    } catch (error) {
      logger.error('Error during audit log service cleanup:', error);
    }
  }
}

// Create and export singleton instance
const auditLogService = new AuditLogService();

export default auditLogService;
