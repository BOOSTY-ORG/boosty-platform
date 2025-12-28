import mongoose from 'mongoose';

/**
 * Field Selection Utility for MongoDB Queries
 *
 * Provides utilities for optimizing MongoDB queries by selecting only necessary fields,
 * reducing data transfer and improving query performance.
 */

/**
 * Build projection object from field array
 * @param {Array} fields - Array of field names to include
 * @returns {Object} MongoDB projection object
 */
export const buildProjection = (fields = []) => {
  if (!fields || fields.length === 0) {
    return null; // Return all fields if none specified
  }

  const projection = {};
  fields.forEach((field) => {
    if (typeof field === 'string') {
      projection[field] = 1;
    } else if (typeof field === 'object' && field.include) {
      projection[field.include] = 1;
      if (field.exclude) {
        projection[field.exclude] = 0;
      }
    }
  });

  return projection;
};

/**
 * Build projection with nested field support
 * @param {Array} fields - Array of field paths (supports dot notation)
 * @returns {Object} MongoDB projection object
 */
export const buildNestedProjection = (fields = []) => {
  if (!fields || fields.length === 0) {
    return null;
  }

  const projection = {};
  fields.forEach((fieldPath) => {
    projection[fieldPath] = 1;
  });

  return projection;
};

/**
 * Build field selection for common entity patterns
 * @param {string} entityType - Type of entity (user, transaction, notification, etc.)
 * @param {string} operationType - Type of operation (list, details, summary, etc.)
 * @returns {Array} Array of recommended fields
 */
export const getRecommendedFields = (entityType, operationType = 'list') => {
  const fieldMappings = {
    user: {
      list: ['_id', 'name', 'email', 'status', 'createdAt', 'lastLoginAt'],
      details: [
        '_id',
        'name',
        'email',
        'status',
        'createdAt',
        'lastLoginAt',
        'profile',
      ],
      summary: ['_id', 'name', 'email', 'status', 'createdAt', 'lastLoginAt'],
    },
    transaction: {
      list: [
        '_id',
        'transactionId',
        'type',
        'status',
        'amount',
        'currency',
        'paymentMethod',
        'createdAt',
        'completedAt',
        'fromEntity',
        'toEntity',
      ],
      details: [
        '_id',
        'transactionId',
        'type',
        'status',
        'amount',
        'currency',
        'paymentMethod',
        'createdAt',
        'completedAt',
        'fromEntity',
        'toEntity',
        'fees',
        'totalFees',
        'netAmount',
        'metadata',
      ],
      summary: [
        '_id',
        'type',
        'status',
        'amount',
        'currency',
        'paymentMethod',
        'createdAt',
        'completedAt',
      ],
      analytics: ['type', 'status', 'amount', 'paymentMethod', 'createdAt'],
    },
    notification: {
      list: [
        '_id',
        'type',
        'status',
        'category',
        'priority',
        'subject',
        'recipient',
        'createdAt',
        'readAt',
      ],
      details: [
        '_id',
        'type',
        'status',
        'category',
        'priority',
        'subject',
        'recipient',
        'content',
        'htmlContent',
        'createdAt',
        'readAt',
        'metadata',
        'deliveryStatus',
      ],
      summary: [
        '_id',
        'type',
        'status',
        'category',
        'priority',
        'createdAt',
        'readAt',
      ],
    },
    investor: {
      list: [
        '_id',
        'userId',
        'isActive',
        'totalInvested',
        'totalReturns',
        'createdAt',
        'lastLoginAt',
      ],
      details: [
        '_id',
        'userId',
        'isActive',
        'totalInvested',
        'totalReturns',
        'createdAt',
        'lastLoginAt',
        'profile',
        'kycStatus',
      ],
      summary: [
        '_id',
        'userId',
        'isActive',
        'totalInvested',
        'totalReturns',
        'createdAt',
      ],
    },
    solarApplication: {
      list: [
        '_id',
        'applicationId',
        'applicationStatus',
        'submittedAt',
        'approvedAt',
        'installedAt',
        'userId',
      ],
      details: [
        '_id',
        'applicationId',
        'applicationStatus',
        'submittedAt',
        'approvedAt',
        'installedAt',
        'userId',
        'systemSize',
        'location',
        'documents',
      ],
      summary: [
        '_id',
        'applicationStatus',
        'submittedAt',
        'approvedAt',
        'installedAt',
        'userId',
      ],
    },
  };

  return fieldMappings[entityType]?.[operationType] || [];
};

/**
 * Apply field selection to a MongoDB query
 * @param {Query} query - Mongoose query object
 * @param {Array} fields - Fields to select
 * @returns {Query} Query with field selection applied
 */
export const applyFieldSelection = (query, fields = []) => {
  if (!fields || fields.length === 0) {
    return query;
  }

  const projection = buildProjection(fields);
  return query.select(projection);
};

/**
 * Apply nested field selection with include/exclude patterns
 * @param {Query} query - Mongoose query object
 * @param {Object} fieldConfig - Field configuration with include/exclude
 * @returns {Query} Query with field selection applied
 */
export const applyAdvancedFieldSelection = (query, fieldConfig = {}) => {
  const projection = buildNestedProjection(
    fieldConfig.include || [],
    fieldConfig.exclude
      ? fieldConfig.exclude.map((field) => ({ field, exclude: true }))
      : []
  );

  return query.select(projection);
};

/**
 * Optimize query for count operations (excludes large fields)
 * @param {Query} query - Mongoose query object
 * @returns {Query} Query optimized for counting
 */
export const optimizeForCount = (query) => {
  // For count operations, only select indexed fields and exclude large data
  return query.select('_id status createdAt');
};

/**
 * Build lean query for better performance
 * @param {Query} query - Mongoose query object
 * @param {boolean} lean - Whether to use lean mode
 * @returns {Query} Optimized lean query
 */
export const buildLeanQuery = (query, lean = true) => {
  return lean ? query.lean() : query;
};

/**
 * Create field selection middleware for Express routes
 * @param {Array} allowedFields - Array of allowed field names
 * @returns {Function} Middleware function
 */
export const createFieldSelectionMiddleware = (allowedFields = []) => {
  return (req, res, next) => {
    // Extract fields from query parameters
    const requestedFields = req.query.fields
      ? Array.isArray(req.query.fields)
        ? req.query.fields
        : [req.query.fields]
      : [];

    // Filter requested fields against allowed fields
    const validFields = requestedFields.filter((field) =>
      allowedFields.includes(field)
    );

    // Attach field selection to request object
    req.fieldSelection = {
      fields: validFields,
      projection: buildProjection(validFields),
      hasFieldSelection: validFields.length > 0,
    };

    next();
  };
};

/**
 * Validate field selection against allowed fields
 * @param {Array} requestedFields - Fields requested by client
 * @param {Array} allowedFields - Fields that are allowed
 * @returns {Object} Validation result
 */
export const validateFieldSelection = (requestedFields, allowedFields) => {
  const invalidFields = requestedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  return {
    isValid: invalidFields.length === 0,
    invalidFields,
    validFields: requestedFields.filter((field) =>
      allowedFields.includes(field)
    ),
  };
};

/**
 * Get field selection statistics for monitoring
 * @param {Object} fieldSelection - Field selection object
 * @returns {Object} Statistics about field usage
 */
export const getFieldSelectionStats = (fieldSelection) => {
  return {
    fieldCount: fieldSelection.fields?.length || 0,
    hasProjection: !!fieldSelection.projection,
    projectionSize: fieldSelection.projection
      ? Object.keys(fieldSelection.projection).length
      : 0,
    timestamp: new Date().toISOString(),
  };
};

export default {
  buildProjection,
  buildNestedProjection,
  getRecommendedFields,
  applyFieldSelection,
  applyAdvancedFieldSelection,
  optimizeForCount,
  buildLeanQuery,
  createFieldSelectionMiddleware,
  validateFieldSelection,
  getFieldSelectionStats,
};
