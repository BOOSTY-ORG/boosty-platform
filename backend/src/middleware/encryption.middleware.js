import encryptionService from '../services/encryption.service.js';
import { FIELD_ENCRYPTION_SETTINGS } from '../config/encryption.config.js';
import logger from '../helpers/logger.js';

/**
 * Encryption Middleware
 *
 * Provides middleware functions for encrypting and decrypting sensitive data
 * in requests and responses, with automatic field-level encryption.
 */

/**
 * Middleware to encrypt sensitive data in request body
 * @param {string} modelName - Model name for field configuration
 * @returns {Function} Express middleware function
 */
export const encryptRequestData = (modelName) => {
  return async (req, res, next) => {
    try {
      // Skip if no request body
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      // Get field configuration for the model
      const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};
      const encryptedBody = { ...req.body };

      // Encrypt each configured field
      for (const [fieldName, config] of Object.entries(fieldConfig)) {
        if (config.encrypted && encryptedBody[fieldName] !== undefined) {
          encryptedBody[fieldName] = await encryptionService.encryptField(
            encryptedBody[fieldName],
            modelName,
            fieldName
          );
        }
      }

      // Replace request body with encrypted version
      req.body = encryptedBody;

      // Log encryption activity
      logger.info(`Encrypted request data for model: ${modelName}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        encryptedFields: Object.keys(fieldConfig).filter(
          (field) =>
            fieldConfig[field].encrypted && req.body[field] !== undefined
        ),
      });

      next();
    } catch (error) {
      logger.error(`Request encryption failed for model: ${modelName}`, {
        error: error.message,
        ip: req.ip,
      });
      return res.status(500).json({
        success: false,
        message: 'Data encryption failed',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to decrypt sensitive data in response
 * @param {string} modelName - Model name for field configuration
 * @returns {Function} Express middleware function
 */
export const decryptResponseData = (modelName) => {
  return async (req, res, next) => {
    try {
      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to decrypt data before sending
      res.json = async function (data) {
        try {
          // Only process if data is an object
          if (data && typeof data === 'object') {
            const decryptedData = await decryptObject(data, modelName);
            return originalJson.call(this, decryptedData);
          }
          return originalJson.call(this, data);
        } catch (error) {
          logger.error(`Response decryption failed for model: ${modelName}`, {
            error: error.message,
          });
          return originalJson.call(this, data);
        }
      };

      next();
    } catch (error) {
      logger.error(
        `Response decryption middleware failed for model: ${modelName}`,
        {
          error: error.message,
        }
      );
      next();
    }
  };
};

/**
 * Helper function to recursively decrypt objects
 * @param {Object} obj - Object to decrypt
 * @param {string} modelName - Model name for field configuration
 * @returns {Promise<Object>} Decrypted object
 */
async function decryptObject(obj, modelName) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};
  const decryptedObj = { ...obj };

  // Handle arrays
  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => decryptObject(item, modelName)));
  }

  // Decrypt each configured field
  for (const [fieldName, config] of Object.entries(fieldConfig)) {
    if (config.encrypted && decryptedObj[fieldName]?.encrypted) {
      decryptedObj[fieldName] = await encryptionService.decryptField(
        decryptedObj[fieldName],
        modelName,
        fieldName
      );
    }
  }

  // Recursively decrypt nested objects
  for (const [key, value] of Object.entries(decryptedObj)) {
    if (typeof value === 'object' && value !== null) {
      // Skip already decrypted fields
      if (!fieldConfig[key]?.encrypted || !value.encrypted) {
        decryptedObj[key] = await decryptObject(value, modelName);
      }
    }
  }

  return decryptedObj;
}

/**
 * Middleware to encrypt sensitive data in database operations
 * @param {string} modelName - Model name for field configuration
 * @returns {Function} Mongoose middleware function
 */
export const encryptDatabaseFields = (modelName) => {
  return async function (next) {
    try {
      // Only encrypt on save operations
      if (this.isNew || this.isModified()) {
        const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};

        // Encrypt each configured field
        for (const [fieldName, config] of Object.entries(fieldConfig)) {
          if (config.encrypted && this.isModified(fieldName)) {
            this[fieldName] = await encryptionService.encryptField(
              this[fieldName],
              modelName,
              fieldName
            );
          }
        }
      }

      next();
    } catch (error) {
      logger.error(`Database encryption failed for model: ${modelName}`, {
        error: error.message,
        documentId: this._id,
      });
      next(error);
    }
  };
};

/**
 * Middleware to decrypt sensitive data in database queries
 * @param {string} modelName - Model name for field configuration
 * @returns {Function} Mongoose post-find middleware
 */
export const decryptDatabaseFields = (modelName) => {
  return async function (result) {
    try {
      // Handle single document
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        return await encryptionService.decryptDocumentFields(result, modelName);
      }

      // Handle array of documents
      if (Array.isArray(result)) {
        return await Promise.all(
          result.map((doc) =>
            encryptionService.decryptDocumentFields(doc, modelName)
          )
        );
      }

      return result;
    } catch (error) {
      logger.error(`Database decryption failed for model: ${modelName}`, {
        error: error.message,
      });
      return result;
    }
  };
};

/**
 * Middleware to log encryption/decryption activities for audit
 * @param {string} action - Action type (encrypt/decrypt)
 * @returns {Function} Express middleware function
 */
export const auditEncryptionActivity = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();

    // Store original end method
    const originalEnd = res.end;

    // Override res.end to log after response
    res.end = function (...args) {
      const duration = Date.now() - startTime;

      logger.info(`Encryption audit: ${action}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString(),
      });

      originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Middleware to validate encryption requirements
 * @param {string} modelName - Model name for field configuration
 * @returns {Function} Express middleware function
 */
export const validateEncryptionRequirements = (modelName) => {
  return (req, res, next) => {
    try {
      const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};
      const missingFields = [];

      // Check if required encrypted fields are present
      for (const [fieldName, config] of Object.entries(fieldConfig)) {
        if (config.encrypted && config.required && !req.body[fieldName]) {
          missingFields.push(fieldName);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Required encrypted fields are missing',
          missingFields,
        });
      }

      next();
    } catch (error) {
      logger.error(`Encryption validation failed for model: ${modelName}`, {
        error: error.message,
      });
      return res.status(500).json({
        success: false,
        message: 'Encryption validation failed',
        error: error.message,
      });
    }
  };
};

/**
 * Middleware to add encryption headers to response
 * @returns {Function} Express middleware function
 */
export const addEncryptionHeaders = () => {
  return (req, res, next) => {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );

    // Add encryption metadata header
    res.setHeader(
      'X-Encryption-Version',
      encryptionService.getCurrentKeyVersion()
    );
    res.setHeader('X-Encryption-Algorithm', 'AES-256-GCM');

    next();
  };
};

/**
 * Middleware to handle encryption errors gracefully
 * @returns {Function} Express middleware function
 */
export const handleEncryptionErrors = () => {
  return (error, req, res, next) => {
    if (
      error.message.includes('encryption') ||
      error.message.includes('decryption')
    ) {
      logger.error('Encryption error occurred', {
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        url: req.originalUrl,
      });

      return res.status(500).json({
        success: false,
        message: 'A data processing error occurred',
        // Don't expose detailed encryption errors to clients
        error: 'Internal server error',
      });
    }

    // Pass other errors to next middleware
    next(error);
  };
};

/**
 * Middleware to automatically decrypt user data based on permissions
 * @returns {Function} Express middleware function
 */
export const conditionalDecryption = () => {
  return async (req, res, next) => {
    try {
      // Check if user has permission to view decrypted data
      const canViewDecrypted =
        req.user?.permissions?.includes('data:view_decrypted') ||
        req.user?.role === 'admin' ||
        req.user?.role === 'superadmin';

      // Store permission in request for later use
      req.canViewDecrypted = canViewDecrypted;

      // If user can't view decrypted data, ensure response is encrypted
      if (!canViewDecrypted) {
        // This would be used by response middleware to keep data encrypted
        req.keepEncrypted = true;
      }

      next();
    } catch (error) {
      logger.error('Conditional decryption check failed', {
        error: error.message,
        userId: req.user?._id,
      });
      next();
    }
  };
};

export default {
  encryptRequestData,
  decryptResponseData,
  encryptDatabaseFields,
  decryptDatabaseFields,
  auditEncryptionActivity,
  validateEncryptionRequirements,
  addEncryptionHeaders,
  handleEncryptionErrors,
  conditionalDecryption,
};
