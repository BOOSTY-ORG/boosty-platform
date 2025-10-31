// Response formatting utility for metrics API

export const formatSuccessResponse = (data, req, meta = {}) => {
  const response = {
    success: true,
    data
  };

  // Add metadata
  response.meta = {
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    ...meta
  };

  // Add pagination info if present
  if (data.pagination) {
    response.meta.pagination = data.pagination;
    response.data = data.data || data;
  } else {
    response.data = data;
  }

  // Add filters info if present
  if (req.queryBuilder) {
    response.meta.filters = {
      dateRange: req.queryBuilder.dateRange ? 
        `${req.queryBuilder.dateRange.startDate.toISOString()} to ${req.queryBuilder.dateRange.endDate.toISOString()}` : 
        undefined,
      status: req.queryBuilder.filters.status?.$in,
      region: req.queryBuilder.filters['personalInfo.state'],
      investorType: req.queryBuilder.filters.investorType?.$in,
      riskProfile: req.queryBuilder.filters.riskProfile?.$in,
      transactionType: req.queryBuilder.filters.type?.$in,
      paymentMethod: req.queryBuilder.filters.paymentMethod?.$in,
      propertyType: req.queryBuilder.filters['propertyDetails.propertyType']?.$in,
      kycStatus: req.queryBuilder.filters.kycStatus?.$in,
      documentType: req.queryBuilder.filters.documentType?.$in,
      verificationStatus: req.queryBuilder.filters.verificationStatus?.$in
    };
  }

  return response;
};

export const formatErrorResponse = (error, req, statusCode = 500) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };

  // Add validation details if present
  if (error.details) {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
};

export const formatValidationError = (field, message, value = null) => {
  return {
    field,
    message,
    value
  };
};

export const formatValidationErrors = (errors) => {
  return errors.map(error => ({
    field: error.field || error.param,
    message: error.msg || error.message,
    value: error.value
  }));
};

export const formatPaginatedResponse = (data, pagination, req, additionalMeta = {}) => {
  return formatSuccessResponse({
    data,
    pagination
  }, req, additionalMeta);
};

export const formatMetricsResponse = (metrics, req, additionalMeta = {}) => {
  return formatSuccessResponse(metrics, req, additionalMeta);
};

export const formatAggregationResponse = (aggregations, req, additionalMeta = {}) => {
  return formatSuccessResponse(aggregations, req, additionalMeta);
};

export const formatFileResponse = (fileInfo, req) => {
  return {
    success: true,
    data: {
      fileId: fileInfo.id,
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      fileType: fileInfo.type,
      downloadUrl: fileInfo.url,
      createdAt: fileInfo.createdAt
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

export const formatStreamResponse = (stream, filename, contentType = 'application/json') => {
  return {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    },
    stream
  };
};

export const formatHealthResponse = (health) => {
  return {
    status: health.status || 'healthy',
    timestamp: new Date().toISOString(),
    services: health.services || {},
    metrics: health.metrics || {},
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime()
  };
};

export const formatCacheResponse = (cacheData) => {
  return {
    success: true,
    data: {
      size: cacheData.size,
      keys: cacheData.keys,
      hitRate: cacheData.hitRate || 0,
      missRate: cacheData.missRate || 0
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
};

export const formatRateLimitResponse = (rateLimitData) => {
  return {
    success: true,
    data: {
      totalKeys: rateLimitData.totalKeys,
      activeKeys: rateLimitData.activeKeys,
      totalRequests: rateLimitData.totalRequests
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
};

export const formatBulkResponse = (results, req, operation = 'update') => {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return {
    success: true,
    data: {
      operation,
      total: results.length,
      successful,
      failed,
      results
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

export const formatExportResponse = (exportData, format, filename) => {
  return {
    success: true,
    data: {
      exportId: exportData.id,
      filename,
      format,
      size: exportData.size,
      downloadUrl: exportData.url,
      expiresAt: exportData.expiresAt
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

export const formatSearchResponse = (results, searchQuery, pagination, req) => {
  return {
    success: true,
    data: {
      query: searchQuery,
      results,
      pagination
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

export const formatAnalyticsResponse = (analytics, req, timeRange) => {
  return {
    success: true,
    data: analytics,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      timeRange,
      modelVersion: analytics.modelVersion || 'v1.0.0'
    }
  };
};

export const formatReportResponse = (report, req) => {
  return {
    success: true,
    data: {
      reportId: report.id,
      type: report.type,
      period: report.period,
      generatedAt: report.generatedAt,
      downloadUrl: report.downloadUrl,
      size: report.size,
      format: report.format
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

export const formatNotificationResponse = (notification, req) => {
  return {
    success: true,
    data: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      recipients: notification.recipients,
      sentAt: notification.sentAt,
      status: notification.status
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };
};

const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const setResponseHeaders = (res, headers = {}) => {
  // Set default headers
  res.set({
    'X-API-Version': '1.0.0',
    'X-Response-Time': Date.now(),
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...headers
  });
};

export const setCORSHeaders = (res, origin = '*') => {
  res.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true'
  });
};

export const formatError = (code, message, details = null) => {
  const error = new Error(message);
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
};

export const handleControllerError = (error, req, res, next) => {
  console.error('Controller Error:', error);
  
  if (error.code) {
    // Known error with specific code
    return res.status(400).json(formatErrorResponse(error, req, 400));
  }
  
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return res.status(400).json(formatErrorResponse({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: validationErrors
    }, req, 400));
  }
  
  if (error.name === 'CastError') {
    // Mongoose cast error
    return res.status(400).json(formatErrorResponse({
      code: 'INVALID_ID',
      message: 'Invalid ID format'
    }, req, 400));
  }
  
  // Default error handling
  return res.status(500).json(formatErrorResponse(error, req, 500));
};

export default {
  formatSuccessResponse,
  formatErrorResponse,
  formatValidationError,
  formatValidationErrors,
  formatPaginatedResponse,
  formatMetricsResponse,
  formatAggregationResponse,
  formatFileResponse,
  formatStreamResponse,
  formatHealthResponse,
  formatCacheResponse,
  formatRateLimitResponse,
  formatBulkResponse,
  formatExportResponse,
  formatSearchResponse,
  formatAnalyticsResponse,
  formatReportResponse,
  formatNotificationResponse,
  setResponseHeaders,
  setCORSHeaders,
  formatError,
  handleControllerError
};