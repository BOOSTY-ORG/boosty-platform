/**
 * Audit Log Middleware
 *
 * This middleware provides automatic audit logging for HTTP requests,
 * user actions, and sensitive operations throughout the application.
 */

import { v4 as uuidv4 } from 'uuid';
import auditLogService from '../services/auditLog.service.js';
import auditLogConfig from '../config/auditLog.config.js';
import { LOG_CATEGORIES } from '../config/auditLog.config.js';
import logger from '../helpers/logger.js';

/**
 * Generate correlation ID for request tracking
 */
const generateCorrelationId = () => {
  return uuidv4();
};

/**
 * Extract user information from request
 * @param {Object} req - Express request object
 * @returns {Object} User information
 */
const extractUserInfo = (req) => {
  const user = req.user || {};
  return {
    userId: user.id || user._id,
    userRole: user.role,
    userName: user.name || user.fullName,
    userEmail: user.email,
  };
};

/**
 * Extract client information from request
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const extractClientInfo = (req) => {
  return {
    ipAddress:
      req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    sessionId: req.sessionID || req.headers['x-session-id'],
  };
};

/**
 * Determine if request should be logged based on configuration
 * @param {Object} req - Express request object
 * @returns {boolean} Whether to log the request
 */
const shouldLogRequest = (req) => {
  // Skip health checks if configured
  if (req.path.includes('/health') || req.path.includes('/ping')) {
    return false;
  }

  // Skip static assets if configured
  if (req.path.includes('/static') || req.path.includes('/assets')) {
    return false;
  }

  // Skip successful GET requests if configured
  if (req.method === 'GET' && req.statusCode < 400) {
    return false;
  }

  return true;
};

/**
 * Determine the audit category based on request
 * @param {Object} req - Express request object
 * @returns {string} Audit category
 */
const determineCategory = (req) => {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();

  // Authentication endpoints
  if (
    path.includes('/auth') ||
    path.includes('/login') ||
    path.includes('/logout')
  ) {
    return LOG_CATEGORIES.AUTHENTICATION;
  }

  // Authorization/role endpoints
  if (
    path.includes('/role') ||
    path.includes('/permission') ||
    path.includes('/authorization')
  ) {
    return LOG_CATEGORIES.AUTHORIZATION;
  }

  // Security-related endpoints
  if (
    path.includes('/security') ||
    path.includes('/encryption') ||
    path.includes('/audit')
  ) {
    return LOG_CATEGORIES.SECURITY;
  }

  // System endpoints
  if (
    path.includes('/system') ||
    path.includes('/config') ||
    path.includes('/admin')
  ) {
    return LOG_CATEGORIES.SYSTEM;
  }

  // Default to data operations
  return LOG_CATEGORIES.DATA_OPERATIONS;
};

/**
 * Determine the action based on request method and path
 * @param {Object} req - Express request object
 * @returns {string} Action description
 */
const determineAction = (req) => {
  const method = req.method.toUpperCase();
  const path = req.path.toLowerCase();

  // Map HTTP methods to actions
  const methodActions = {
    GET: 'ACCESS',
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  let action = methodActions[method] || method;

  // Add more specific action based on path
  if (path.includes('/auth/login')) {
    action = 'LOGIN';
  } else if (path.includes('/auth/logout')) {
    action = 'LOGOUT';
  } else if (path.includes('/auth/register')) {
    action = 'REGISTER';
  } else if (path.includes('/auth/password')) {
    action = 'PASSWORD_CHANGE';
  } else if (path.includes('/role/assign')) {
    action = 'ROLE_ASSIGN';
  } else if (path.includes('/role/revoke')) {
    action = 'ROLE_REVOKE';
  } else if (path.includes('/export')) {
    action = 'DATA_EXPORT';
  } else if (path.includes('/import')) {
    action = 'DATA_IMPORT';
  }

  return action;
};

/**
 * Extract resource information from request
 * @param {Object} req - Express request object
 * @returns {Object} Resource information
 */
const extractResourceInfo = (req) => {
  const path = req.path;
  const pathParts = path.split('/').filter((part) => part && part !== 'api');

  // Determine resource type from path
  let resource = 'UNKNOWN';
  let resourceId = null;
  let resourceType = null;

  if (pathParts.length > 0) {
    resource = pathParts[0].toUpperCase();
    resourceType = pathParts[0];

    // Extract resource ID if available
    if (pathParts.length > 1 && /^[0-9a-fA-F]{24}$/.test(pathParts[1])) {
      resourceId = pathParts[1];
    }
  }

  // Special cases
  if (path.includes('/auth')) {
    resource = 'AUTH';
    resourceType = 'AUTHENTICATION';
  } else if (path.includes('/user')) {
    resource = 'USER';
    resourceType = 'USER_ACCOUNT';
  } else if (path.includes('/payment')) {
    resource = 'PAYMENT';
    resourceType = 'PAYMENT_TRANSACTION';
  } else if (path.includes('/kyc')) {
    resource = 'KYC';
    resourceType = 'KYC_DOCUMENT';
  }

  return { resource, resourceId, resourceType };
};

/**
 * Determine the severity of the event
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string} Severity level
 */
const determineSeverity = (req, res) => {
  const statusCode = res.statusCode || 200;
  const path = req.path.toLowerCase();

  // Security-related operations are high severity
  if (
    path.includes('/auth') ||
    path.includes('/role') ||
    path.includes('/security')
  ) {
    return 'SECURITY';
  }

  // Error status codes
  if (statusCode >= 500) {
    return 'ERROR';
  }

  // Client errors
  if (statusCode >= 400) {
    return 'WARN';
  }

  // Data operations
  if (
    path.includes('/export') ||
    path.includes('/import') ||
    path.includes('/delete')
  ) {
    return 'INFO';
  }

  // Default
  return 'INFO';
};

/**
 * Extract metadata from request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Metadata
 */
const extractMetadata = (req, res) => {
  const metadata = {
    method: req.method,
    endpoint: req.path,
    httpStatus: res.statusCode,
    requestSize: req.headers['content-length'] || 0,
    responseSize: res.get('content-length') || 0,
  };

  // Add request parameters
  if (req.params && Object.keys(req.params).length > 0) {
    metadata.params = { ...req.params };
  }

  // Add query parameters (excluding sensitive ones)
  if (req.query && Object.keys(req.query).length > 0) {
    const safeQuery = { ...req.query };
    delete safeQuery.password;
    delete safeQuery.token;
    delete safeQuery.apiKey;
    metadata.query = safeQuery;
  }

  // Add request body for non-GET requests (size limited)
  if (req.method !== 'GET' && req.body) {
    const bodyString = JSON.stringify(req.body);
    if (bodyString.length <= 1024) {
      // 1KB limit
      // Remove sensitive fields
      const safeBody = { ...req.body };
      delete safeBody.password;
      delete safeBody.token;
      delete safeBody.apiKey;
      delete safeBody.secret;
      metadata.requestBody = safeBody;
    }
  }

  // Add response time if available
  if (res.responseTime) {
    metadata.responseTime = res.responseTime;
  }

  return metadata;
};

/**
 * Main audit logging middleware
 */
const auditLogMiddleware = (req, res, next) => {
  // Skip logging if audit logging is disabled
  if (!auditLogConfig.enabled) {
    return next();
  }

  // Generate correlation ID if not already present
  const correlationId =
    req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Record start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to log after response
  res.end = function (chunk, encoding) {
    // Calculate response time
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    req.responseTime = responseTime;
    res.responseTime = responseTime;

    // Restore original end function
    res.end = originalEnd;
    res.end(chunk, encoding);

    // Log the request if it meets criteria
    if (shouldLogRequest(req)) {
      logRequest(req, res);
    }
  };

  next();
};

/**
 * Log the request/response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logRequest = async (req, res) => {
  try {
    // Extract information
    const userInfo = extractUserInfo(req);
    const clientInfo = extractClientInfo(req);
    const resourceInfo = extractResourceInfo(req);
    const metadata = extractMetadata(req, res);

    // Determine outcome
    const outcome = res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

    // Create log entry
    const logData = {
      correlationId: req.correlationId,
      ...userInfo,
      ...clientInfo,
      ...resourceInfo,
      action: determineAction(req),
      category: determineCategory(req),
      severity: determineSeverity(req, res),
      outcome,
      message: `${req.method} ${req.path} - ${outcome} (${res.statusCode})`,
      metadata: {
        ...metadata,
        duration: req.responseTime,
      },
      source: {
        service: 'boosty-api',
        module: 'http-middleware',
        endpoint: req.path,
      },
    };

    // Add error information if applicable
    if (res.statusCode >= 400 && res.locals.error) {
      logData.error = {
        name: res.locals.error.name,
        message: res.locals.error.message,
        stack: res.locals.error.stack,
      };
    }

    // Add security context if user is authenticated
    if (req.user) {
      logData.securityContext = {
        isAuthenticated: true,
        hasValidToken: true,
        permissions: req.user.permissions || [],
        riskScore: calculateRiskScore(req, res),
      };
    } else {
      logData.securityContext = {
        isAuthenticated: false,
        hasValidToken: false,
        permissions: [],
        riskScore: calculateRiskScore(req, res),
      };
    }

    // Add compliance flags
    logData.complianceFlags = determineComplianceFlags(req, res);

    // Log the event
    await auditLogService.log(logData);
  } catch (error) {
    logger.error('Failed to log audit event:', error);
  }
};

/**
 * Calculate risk score for the request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {number} Risk score (0-10)
 */
const calculateRiskScore = (req, res) => {
  let riskScore = 0;

  // Base risk for unauthenticated requests
  if (!req.user) {
    riskScore += 2;
  }

  // Higher risk for certain endpoints
  const highRiskPaths = ['/auth', '/admin', '/role', '/security'];
  if (highRiskPaths.some((path) => req.path.includes(path))) {
    riskScore += 3;
  }

  // Higher risk for certain methods
  if (['DELETE', 'PUT', 'PATCH'].includes(req.method)) {
    riskScore += 2;
  }

  // Higher risk for failed requests
  if (res.statusCode >= 400) {
    riskScore += 2;
  }

  // Higher risk for requests from certain IP ranges (simplified)
  const clientInfo = extractClientInfo(req);
  if (clientInfo.ipAddress) {
    // Check for private/internal IPs (lower risk)
    if (
      clientInfo.ipAddress.startsWith('192.168.') ||
      clientInfo.ipAddress.startsWith('10.') ||
      clientInfo.ipAddress.startsWith('172.')
    ) {
      riskScore -= 1;
    }
  }

  return Math.max(0, Math.min(10, riskScore));
};

/**
 * Determine compliance flags for the request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Compliance flags
 */
const determineComplianceFlags = (req, res) => {
  const flags = {
    gdpr: false,
    sox: false,
    hipaa: false,
    pci: false,
  };

  const path = req.path.toLowerCase();

  // GDPR flags for personal data operations
  if (
    path.includes('/user') ||
    path.includes('/personal') ||
    path.includes('/profile')
  ) {
    flags.gdpr = true;
  }

  // SOX flags for financial operations
  if (
    path.includes('/payment') ||
    path.includes('/transaction') ||
    path.includes('/financial')
  ) {
    flags.sox = true;
  }

  // HIPAA flags for health-related data (if applicable)
  if (path.includes('/health') || path.includes('/medical')) {
    flags.hipaa = true;
  }

  // PCI flags for payment card operations
  if (
    path.includes('/payment') ||
    path.includes('/card') ||
    path.includes('/credit')
  ) {
    flags.pci = true;
  }

  return flags;
};

/**
 * Middleware for logging specific user actions
 * @param {string} action - The action being performed
 * @param {string} resource - The resource being acted upon
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
const logUserAction = (action, resource, options = {}) => {
  return async (req, res, next) => {
    if (!auditLogConfig.enabled) {
      return next();
    }

    try {
      const userInfo = extractUserInfo(req);
      const clientInfo = extractClientInfo(req);
      const resourceInfo = extractResourceInfo(req);

      const logData = {
        correlationId: req.correlationId,
        ...userInfo,
        ...clientInfo,
        action,
        category: options.category || LOG_CATEGORIES.DATA_OPERATIONS,
        resource: resource || resourceInfo.resource,
        resourceId: req.params.id || resourceInfo.resourceId,
        resourceType: options.resourceType || resourceInfo.resourceType,
        severity: options.severity || 'INFO',
        message: options.message || `${action} on ${resource}`,
        metadata: {
          ...options.metadata,
          method: req.method,
          endpoint: req.path,
        },
        source: {
          service: 'boosty-api',
          module: options.module || 'user-action',
          function: action.toLowerCase(),
        },
      };

      await auditLogService.log(logData);
    } catch (error) {
      logger.error('Failed to log user action:', error);
    }

    next();
  };
};

/**
 * Middleware for logging sensitive operations
 * @param {string} operation - The sensitive operation
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
const logSensitiveOperation = (operation, options = {}) => {
  return async (req, res, next) => {
    if (!auditLogConfig.enabled) {
      return next();
    }

    try {
      const userInfo = extractUserInfo(req);
      const clientInfo = extractClientInfo(req);

      const logData = {
        correlationId: req.correlationId,
        ...userInfo,
        ...clientInfo,
        action: operation,
        category: LOG_CATEGORIES.SECURITY,
        resource: options.resource || 'SENSITIVE_DATA',
        severity: 'SECURITY',
        message: `Sensitive operation: ${operation}`,
        metadata: {
          ...options.metadata,
          operation,
          method: req.method,
          endpoint: req.path,
        },
        source: {
          service: 'boosty-api',
          module: 'sensitive-operation',
          function: operation.toLowerCase(),
        },
        complianceFlags: {
          gdpr: true, // Sensitive operations often fall under GDPR
        },
      };

      await auditLogService.log(logData);
    } catch (error) {
      logger.error('Failed to log sensitive operation:', error);
    }

    next();
  };
};

/**
 * Middleware for logging CRUD operations
 * @param {string} resourceType - The type of resource
 * @returns {Function} Express middleware
 */
const logCrudOperation = (resourceType) => {
  return async (req, res, next) => {
    if (!auditLogConfig.enabled) {
      return next();
    }

    // Store original end function
    const originalEnd = res.end;

    res.end = async function (chunk, encoding) {
      res.end = originalEnd;
      res.end(chunk, encoding);

      try {
        const userInfo = extractUserInfo(req);
        const clientInfo = extractClientInfo(req);
        const action = determineAction(req);
        const outcome = res.statusCode < 400 ? 'SUCCESS' : 'FAILURE';

        const logData = {
          correlationId: req.correlationId,
          ...userInfo,
          ...clientInfo,
          action,
          category: LOG_CATEGORIES.DATA_OPERATIONS,
          resource: resourceType.toUpperCase(),
          resourceId: req.params.id || req.body._id,
          resourceType,
          method: req.method,
          endpoint: req.path,
          httpStatus: res.statusCode,
          outcome,
          severity: outcome === 'SUCCESS' ? 'INFO' : 'WARN',
          message: `${action} ${resourceType} - ${outcome}`,
          metadata: {
            requestBody: req.method !== 'GET' ? req.body : undefined,
            params: req.params,
            query: req.query,
          },
          source: {
            service: 'boosty-api',
            module: 'crud-operation',
            function: `${action.toLowerCase()}_${resourceType}`,
          },
        };

        await auditLogService.log(logData);
      } catch (error) {
        logger.error('Failed to log CRUD operation:', error);
      }
    };

    next();
  };
};

export {
  auditLogMiddleware,
  logUserAction,
  logSensitiveOperation,
  logCrudOperation,
  generateCorrelationId,
};

export default auditLogMiddleware;
