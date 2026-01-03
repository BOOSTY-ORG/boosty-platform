/**
 * Mailgun Utility Functions
 *
 * This utility module provides helper functions for:
 * - Email address validation and formatting
 * - Email content validation and sanitization
 * - HTML content processing
 * - Attachment processing
 * - Email template helpers
 * - Rate limiting helpers
 * - Cost calculation utilities
 */

import {
  emailServiceConfig,
  templateConfig,
  developmentConfig,
} from '../../config/mailgun.config.js';

/**
 * Email address validation and formatting utilities
 */
export const emailUtils = {
  /**
   * Validates an email address
   * @param {string} email - Email address to validate
   * @returns {object} - Validation result
   */
  validate: (email) => {
    if (!email || typeof email !== 'string') {
      return {
        valid: false,
        error: 'Email address is required and must be a string',
        formatted: null,
      };
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        error: 'Invalid email address format',
        formatted: null,
      };
    }

    // Additional validation
    const [localPart, domain] = email.split('@');

    // Check local part length
    if (localPart.length > 64) {
      return {
        valid: false,
        error: 'Email local part exceeds 64 characters',
        formatted: null,
      };
    }

    // Check domain length
    if (domain.length > 253) {
      return {
        valid: false,
        error: 'Email domain exceeds 253 characters',
        formatted: null,
      };
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return {
        valid: false,
        error: 'Email address cannot contain consecutive dots',
        formatted: null,
      };
    }

    // Normalize and format
    const formatted = email.toLowerCase().trim();

    return {
      valid: true,
      error: null,
      formatted,
    };
  },

  /**
   * Validates multiple email addresses
   * @param {array|string} emails - Email addresses to validate
   * @returns {object} - Validation result with valid and invalid emails
   */
  validateMultiple: (emails) => {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const validEmails = [];
    const invalidEmails = [];

    emailArray.forEach((email) => {
      const validation = emailUtils.validate(email);
      if (validation.valid) {
        validEmails.push(validation.formatted);
      } else {
        invalidEmails.push({
          email,
          error: validation.error,
        });
      }
    });

    return {
      valid: invalidEmails.length === 0,
      validEmails,
      invalidEmails,
      error:
        invalidEmails.length > 0 ? 'Some email addresses are invalid' : null,
    };
  },

  /**
   * Extracts domain from email address
   * @param {string} email - Email address
   * @returns {string|null} - Domain or null if invalid
   */
  extractDomain: (email) => {
    const validation = emailUtils.validate(email);
    if (!validation.valid) {
      return null;
    }

    const parts = validation.formatted.split('@');
    return parts.length > 1 ? parts[1] : null;
  },
};

/**
 * Email content validation and processing utilities
 */
export const contentUtils = {
  /**
   * Validates email content
   * @param {object} content - Email content object
   * @returns {object} - Validation result
   */
  validate: (content) => {
    const { subject, text, html } = content;

    // Validate subject
    if (!subject || typeof subject !== 'string') {
      return {
        valid: false,
        error: 'Subject is required and must be a string',
        sanitized: null,
      };
    }

    if (subject.length > 200) {
      return {
        valid: false,
        error: 'Subject cannot exceed 200 characters',
        sanitized: null,
      };
    }

    // Validate content
    if (!text && !html) {
      return {
        valid: false,
        error: 'Either text or HTML content is required',
        sanitized: null,
      };
    }

    // Check for blocked content if enabled
    if (templateConfig.validation.enabled) {
      const contentToCheck = text || html || '';

      // Check blocked words
      for (const word of templateConfig.validation.blockedWords) {
        if (contentToCheck.toLowerCase().includes(word.toLowerCase())) {
          return {
            valid: false,
            error: `Content contains blocked word: ${word}`,
            sanitized: null,
          };
        }
      }

      // Check blocked patterns
      for (const pattern of templateConfig.validation.blockedPatterns) {
        if (pattern.test(contentToCheck)) {
          return {
            valid: false,
            error: 'Content contains blocked pattern',
            sanitized: null,
          };
        }
      }

      // Check link count
      const linkMatches = contentToCheck.match(/https?:\/\/[^\s]+/gi);
      if (
        linkMatches &&
        linkMatches.length > templateConfig.validation.maxLinks
      ) {
        return {
          valid: false,
          error: `Content exceeds maximum allowed links (${templateConfig.validation.maxLinks})`,
          sanitized: null,
        };
      }

      // Check allowed domains if specified
      if (templateConfig.validation.allowedDomains.length > 0 && linkMatches) {
        for (const link of linkMatches) {
          const domain = link.match(/https?:\/\/([^/]+)/i)?.[1];
          if (
            domain &&
            !templateConfig.validation.allowedDomains.includes(domain)
          ) {
            return {
              valid: false,
              error: `Link to domain ${domain} is not allowed`,
              sanitized: null,
            };
          }
        }
      }
    }

    // Sanitize content
    const sanitized = contentUtils.sanitize(content);

    return {
      valid: true,
      error: null,
      sanitized,
    };
  },

  /**
   * Sanitizes email content
   * @param {object} content - Content to sanitize
   * @returns {object} - Sanitized content
   */
  sanitize: (content) => {
    const { subject, text, html } = content;

    // Sanitize subject
    const sanitizedSubject = subject
      ? subject
          // eslint-disable-next-line no-control-regex
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
          .trim()
      : '';

    // Sanitize text content
    const sanitizedText = text
      ? text
          // eslint-disable-next-line no-control-regex
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
          .trim()
      : '';

    // Sanitize HTML content
    const sanitizedHtml = html ? contentUtils.sanitizeHtml(html) : '';

    return {
      subject: sanitizedSubject,
      text: sanitizedText,
      html: sanitizedHtml,
    };
  },

  /**
   * Sanitizes HTML content
   * @param {string} html - HTML content to sanitize
   * @returns {string} - Sanitized HTML
   */
  sanitizeHtml: (html) => {
    if (!templateConfig.html.enabled || !templateConfig.html.sanitize) {
      return html;
    }

    // Basic HTML sanitization
    let sanitized = html;

    // Remove potentially dangerous tags
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
    dangerousTags.forEach((tag) => {
      const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove potentially dangerous attributes
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'javascript:'];
    dangerousAttrs.forEach((attr) => {
      const regex = new RegExp(`\\b${attr}\\s*=\\s*["'][^"']*["']`, 'gis');
      sanitized = sanitized.replace(regex, '');
    });

    // Remove control characters
    sanitized = sanitized
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    return sanitized.trim();
  },

  /**
   * Replaces template variables in content
   * @param {object} content - Content with template variables
   * @param {object} variables - Variables to replace
   * @returns {object} - Content with variables replaced
   */
  replaceVariables: (content, variables = {}) => {
    if (!content || !templateConfig.templates.enabled) {
      return content;
    }

    const { subject, text, html } = content;

    // Add default variables
    const allVariables = {
      ...templateConfig.personalization.defaultVariables,
      ...variables,
    };

    // Replace variables using regex pattern
    const replaceInString = (str) => {
      if (!str) return str;
      return str.replace(
        templateConfig.templates.variablePattern,
        (match, variableName) => {
          return allVariables[variableName] !== undefined
            ? String(allVariables[variableName])
            : match;
        }
      );
    };

    return {
      subject: replaceInString(subject),
      text: replaceInString(text),
      html: replaceInString(html),
    };
  },
};

/**
 * Attachment processing utilities
 */
export const attachmentUtils = {
  /**
   * Validates attachment
   * @param {object} attachment - Attachment object
   * @returns {object} - Validation result
   */
  validate: (attachment) => {
    if (!attachment || typeof attachment !== 'object') {
      return {
        valid: false,
        error: 'Attachment must be an object',
      };
    }

    const { filename, content, contentType } = attachment;

    if (!filename || typeof filename !== 'string') {
      return {
        valid: false,
        error: 'Attachment filename is required',
      };
    }

    if (!content) {
      return {
        valid: false,
        error: 'Attachment content is required',
      };
    }

    // Check file size
    const contentSize = Buffer.isBuffer(content)
      ? content.length
      : Buffer.byteLength(content, 'base64');

    if (contentSize > emailServiceConfig.maxAttachmentsSize) {
      return {
        valid: false,
        error: `Attachment size exceeds maximum allowed size of ${emailServiceConfig.maxAttachmentsSize} bytes`,
      };
    }

    // Check content type
    if (
      contentType &&
      !emailServiceConfig.allowedAttachmentTypes.includes(contentType)
    ) {
      return {
        valid: false,
        error: `Attachment content type ${contentType} is not allowed`,
      };
    }

    return {
      valid: true,
      error: null,
    };
  },

  /**
   * Validates multiple attachments
   * @param {array} attachments - Array of attachment objects
   * @returns {object} - Validation result
   */
  validateMultiple: (attachments) => {
    if (!Array.isArray(attachments)) {
      return {
        valid: false,
        error: 'Attachments must be an array',
        validAttachments: [],
        invalidAttachments: [],
      };
    }

    const validAttachments = [];
    const invalidAttachments = [];
    let totalSize = 0;

    attachments.forEach((attachment, index) => {
      const validation = attachmentUtils.validate(attachment);

      if (validation.valid) {
        validAttachments.push(attachment);

        // Calculate total size
        const contentSize = Buffer.isBuffer(attachment.content)
          ? attachment.content.length
          : Buffer.byteLength(attachment.content, 'base64');
        totalSize += contentSize;
      } else {
        invalidAttachments.push({
          index,
          filename: attachment.filename,
          error: validation.error,
        });
      }
    });

    // Check total size
    if (totalSize > emailServiceConfig.maxAttachmentsSize) {
      return {
        valid: false,
        error: `Total attachment size exceeds maximum allowed size of ${emailServiceConfig.maxAttachmentsSize} bytes`,
        validAttachments: [],
        invalidAttachments,
      };
    }

    return {
      valid: invalidAttachments.length === 0,
      validAttachments,
      invalidAttachments,
      error:
        invalidAttachments.length > 0 ? 'Some attachments are invalid' : null,
    };
  },

  /**
   * Prepares attachment for Mailgun API
   * @param {object} attachment - Attachment object
   * @returns {object} - Prepared attachment
   */
  prepare: (attachment) => {
    const { filename, content, contentType } = attachment;

    return {
      filename,
      data: Buffer.isBuffer(content) ? content.toString('base64') : content,
      contentType: contentType || 'application/octet-stream',
    };
  },
};

/**
 * Rate limiting utilities
 */
export const rateLimitUtils = {
  /**
   * Generates a rate limit key for an email address
   * @param {string} email - Email address
   * @param {string} type - Type of rate limit (second, minute, hour, day)
   * @returns {string} - Rate limit key
   */
  generateKey: (email, type) => {
    return `mailgun:rate_limit:${type}:${email}`;
  },

  /**
   * Checks if a request is allowed based on rate limits
   * @param {string} email - Email address
   * @param {object} rateLimitConfig - Rate limit configuration
   * @param {object} redisClient - Redis client for tracking
   * @returns {Promise<object>} - Rate limit check result
   */
  checkLimit: async (email, rateLimitConfig, redisClient) => {
    if (!redisClient) {
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    const key = rateLimitUtils.generateKey(
      email,
      rateLimitConfig.windowMs === 1000
        ? 'second'
        : rateLimitConfig.windowMs === 60000
          ? 'minute'
          : rateLimitConfig.windowMs === 3600000
            ? 'hour'
            : 'day'
    );

    try {
      const current = await redisClient.get(key);
      const count = parseInt(current) || 0;

      if (count >= rateLimitConfig.maxRequests) {
        const ttl = await redisClient.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Date.now() + ttl * 1000),
        };
      }

      // Increment counter
      const newCount = await redisClient.incr(key);

      // Set expiry if this is the first request
      if (newCount === 1) {
        await redisClient.expire(
          key,
          Math.ceil(rateLimitConfig.windowMs / 1000)
        );
      }

      return {
        allowed: true,
        remaining: rateLimitConfig.maxRequests - newCount,
        resetTime: new Date(Date.now() + rateLimitConfig.windowMs),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request if rate limiting fails
      return { allowed: true, remaining: Infinity, resetTime: null };
    }
  },
};

/**
 * Cost calculation utilities
 */
export const costUtils = {
  /**
   * Estimates email cost based on destination and content
   * @param {string} email - Destination email address
   * @param {object} content - Email content
   * @param {array} attachments - Email attachments
   * @returns {object} - Cost estimate
   */
  estimateCost: (email, content, attachments = []) => {
    const domain = emailUtils.extractDomain(email);

    // Base rates per email (these would be updated with actual Mailgun pricing)
    const baseRates = {
      default: 0.0005, // Default rate per email
    };

    // Calculate attachment cost
    let attachmentCost = 0;
    if (attachments.length > 0) {
      const totalSize = attachments.reduce((total, attachment) => {
        const contentSize = Buffer.isBuffer(attachment.content)
          ? attachment.content.length
          : Buffer.byteLength(attachment.content, 'base64');
        return total + contentSize;
      }, 0);

      // Additional cost for attachments (per MB)
      const sizeInMB = totalSize / (1024 * 1024);
      attachmentCost = sizeInMB * 0.001; // $0.001 per MB
    }

    const ratePerEmail = baseRates[domain] || baseRates['default'];
    const totalCost = ratePerEmail + attachmentCost;

    return {
      currency: emailServiceConfig.defaultCurrency,
      ratePerEmail,
      attachmentCost,
      totalCost,
      domain,
    };
  },
};

/**
 * Error classification utilities
 */
export const errorUtils = {
  /**
   * Classifies Mailgun error as retryable or non-retryable
   * @param {object} error - Mailgun error object
   * @returns {object} - Error classification
   */
  classifyError: (error) => {
    const statusCode = error.statusCode || error.status;
    const errorCode = error.code;

    // Check if error is retryable
    const isRetryable =
      statusCode &&
      (statusCode >= 500 || // Server errors
        statusCode === 429 || // Rate limited
        errorCode === 'timeout' || // Request timeout
        errorCode === 'network'); // Network error

    // Determine error category
    let category = 'unknown';
    if (statusCode >= 400 && statusCode < 500) {
      category = 'client_error';
    } else if (statusCode >= 500) {
      category = 'server_error';
    } else if (statusCode === 429) {
      category = 'rate_limit';
    } else if (errorCode) {
      category = 'mailgun_error';
    }

    return {
      isRetryable,
      category,
      code: errorCode || statusCode,
      message: error.message || 'Unknown error',
    };
  },

  /**
   * Calculates retry delay based on error type and attempt count
   * @param {object} errorClassification - Error classification from classifyError
   * @param {number} attemptCount - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateRetryDelay: (errorClassification, attemptCount) => {
    const baseDelay = 5000; // 5 seconds base delay

    if (errorClassification.category === 'rate_limit') {
      // Exponential backoff for rate limit errors
      return baseDelay * Math.pow(2, attemptCount);
    } else if (errorClassification.category === 'server_error') {
      // Longer delay for server errors
      return baseDelay * Math.pow(2.5, attemptCount);
    } else {
      // Standard exponential backoff
      return baseDelay * Math.pow(2, attemptCount);
    }
  },
};

export default {
  email: emailUtils,
  content: contentUtils,
  attachment: attachmentUtils,
  rateLimit: rateLimitUtils,
  cost: costUtils,
  error: errorUtils,
};
