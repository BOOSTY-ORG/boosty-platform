/**
 * Twilio Utility Functions
 *
 * This utility module provides helper functions for:
 * - Phone number formatting and validation
 * - SMS content validation
 * - Character counting and splitting
 * - Country code handling
 * - Rate limiting helpers
 */

import {
  regionalConfig,
  contentConfig,
  smsServiceConfig,
} from '../../config/twilio.config.js';

/**
 * Phone number validation and formatting utilities
 */
export const phoneUtils = {
  /**
   * Validates a phone number using Twilio's format
   * @param {string} phoneNumber - Phone number to validate
   * @param {string} defaultCountryCode - Default country code if not specified
   * @returns {object} - Validation result with formatted number and validity
   */
  validateAndFormat: (
    phoneNumber,
    defaultCountryCode = regionalConfig.defaultCountryCode
  ) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return {
        valid: false,
        error: 'Phone number is required and must be a string',
        formatted: null,
      };
    }

    // Remove all non-numeric characters except + at the beginning
    let cleaned = phoneNumber.trim().replace(/[^\d+]/g, '');

    // If no country code, add default
    if (!cleaned.startsWith('+')) {
      cleaned = `+${defaultCountryCode}${cleaned}`;
    }

    // Basic validation for E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(cleaned)) {
      return {
        valid: false,
        error: 'Phone number must be in E.164 format (e.g., +1234567890)',
        formatted: null,
      };
    }

    // Extract country code
    const countryCode = cleaned.substring(1, 3);

    // Check if country is supported
    if (
      regionalConfig.supportedCountries.length > 0 &&
      !regionalConfig.supportedCountries.includes(countryCode)
    ) {
      return {
        valid: false,
        error: `Country code ${countryCode} is not supported`,
        formatted: null,
      };
    }

    // Check if country is restricted
    if (regionalConfig.restrictedCountries.includes(countryCode)) {
      return {
        valid: false,
        error: `SMS delivery to country code ${countryCode} is restricted`,
        formatted: null,
      };
    }

    return {
      valid: true,
      error: null,
      formatted: cleaned,
      countryCode,
    };
  },

  /**
   * Extracts country code from phone number
   * @param {string} phoneNumber - Phone number in E.164 format
   * @returns {string|null} - Country code or null if invalid
   */
  extractCountryCode: (phoneNumber) => {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return null;
    }

    // Common country code lengths (1-3 digits)
    const possibleCodes = [
      phoneNumber.substring(1, 2), // 1-digit codes
      phoneNumber.substring(1, 3), // 2-digit codes
      phoneNumber.substring(1, 4), // 3-digit codes
    ];

    // Return the most specific valid country code
    for (const code of possibleCodes.reverse()) {
      if (regionalConfig.supportedCountries.includes(code)) {
        return code;
      }
    }

    return null;
  },

  /**
   * Checks if a phone number is mobile (not landline)
   * @param {string} phoneNumber - Phone number in E.164 format
   * @returns {boolean} - True if likely mobile
   */
  isMobileNumber: (phoneNumber) => {
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      return false;
    }

    const countryCode = phoneUtils.extractCountryCode(phoneNumber);

    // Basic mobile number patterns by country
    const mobilePatterns = {
      US: /^\+1[2-9]\d{2}[2-9]\d{6}$/, // US mobile pattern
      GB: /^\+44[7]\d{9}$/, // UK mobile pattern
      NG: /^\+234[789]\d{9}$/, // Nigeria mobile pattern
      KE: /^\+254[7]\d{8}$/, // Kenya mobile pattern
    };

    const pattern = mobilePatterns[countryCode];
    return pattern ? pattern.test(phoneNumber) : true; // Assume mobile if no pattern
  },
};

/**
 * SMS content validation and processing utilities
 */
export const contentUtils = {
  /**
   * Validates SMS content
   * @param {string} content - SMS content to validate
   * @returns {object} - Validation result
   */
  validate: (content) => {
    if (!content || typeof content !== 'string') {
      return {
        valid: false,
        error: 'Content is required and must be a string',
        sanitized: null,
      };
    }

    // Check maximum length
    if (content.length > smsServiceConfig.maxMessageLength) {
      return {
        valid: false,
        error: `Content exceeds maximum length of ${smsServiceConfig.maxMessageLength} characters`,
        sanitized: null,
      };
    }

    // Check for blocked content if enabled
    if (contentConfig.validation.enabled) {
      // Check blocked words
      for (const word of contentConfig.validation.blockedWords) {
        if (content.toLowerCase().includes(word.toLowerCase())) {
          return {
            valid: false,
            error: `Content contains blocked word: ${word}`,
            sanitized: null,
          };
        }
      }

      // Check blocked patterns
      for (const pattern of contentConfig.validation.blockedPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            error: 'Content contains blocked pattern',
            sanitized: null,
          };
        }
      }

      // Check link count
      const linkMatches = content.match(/https?:\/\/[^\s]+/gi);
      if (
        linkMatches &&
        linkMatches.length > contentConfig.validation.maxLinks
      ) {
        return {
          valid: false,
          error: `Content exceeds maximum allowed links (${contentConfig.validation.maxLinks})`,
          sanitized: null,
        };
      }

      // Check allowed domains if specified
      if (contentConfig.validation.allowedDomains.length > 0 && linkMatches) {
        for (const link of linkMatches) {
          const domain = link.match(/https?:\/\/([^/]+)/i)?.[1];
          if (
            domain &&
            !contentConfig.validation.allowedDomains.includes(domain)
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
   * Sanitizes SMS content
   * @param {string} content - Content to sanitize
   * @returns {string} - Sanitized content
   */
  sanitize: (content) => {
    // Remove potentially harmful characters
    let sanitized = content
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width characters
      .trim();

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  },

  /**
   * Counts characters and segments for SMS
   * @param {string} content - SMS content
   * @returns {object} - Character count and segmentation info
   */
  countCharacters: (content) => {
    if (!content) {
      return {
        totalCharacters: 0,
        segments: 0,
        charactersPerSegment: 160,
        isUnicode: false,
      };
    }

    // Check if content contains Unicode characters
    // eslint-disable-next-line no-control-regex
    const isUnicode = /[^\x00-\x7F]/.test(content);
    const charactersPerSegment = isUnicode ? 70 : 160;
    const maxCharactersPerSegment = isUnicode ? 67 : 153;

    // Calculate segments
    let segments;
    if (content.length <= charactersPerSegment) {
      segments = 1;
    } else {
      segments = Math.ceil(content.length / maxCharactersPerSegment);
    }

    return {
      totalCharacters: content.length,
      segments,
      charactersPerSegment:
        segments === 1 ? charactersPerSegment : maxCharactersPerSegment,
      isUnicode,
    };
  },

  /**
   * Splits content into SMS segments if needed
   * @param {string} content - Content to split
   * @returns {array} - Array of content segments
   */
  splitIntoSegments: (content) => {
    const { segments, charactersPerSegment } =
      contentUtils.countCharacters(content);

    if (segments === 1) {
      return [content];
    }

    const contentSegments = [];
    for (let i = 0; i < segments; i++) {
      const start = i * charactersPerSegment;
      const end = Math.min(start + charactersPerSegment, content.length);
      contentSegments.push(content.substring(start, end));
    }

    return contentSegments;
  },

  /**
   * Replaces template variables in content
   * @param {string} content - Content with template variables
   * @param {object} variables - Variables to replace
   * @returns {string} - Content with variables replaced
   */
  replaceVariables: (content, variables = {}) => {
    if (!content || !contentConfig.templates.enabled) {
      return content;
    }

    let processedContent = content;

    // Add default variables
    const allVariables = {
      ...contentConfig.personalization.defaultVariables,
      ...variables,
    };

    // Replace variables using regex pattern
    processedContent = processedContent.replace(
      contentConfig.templates.variablePattern,
      (match, variableName) => {
        return allVariables[variableName] || match;
      }
    );

    return processedContent;
  },
};

/**
 * Rate limiting utilities
 */
export const rateLimitUtils = {
  /**
   * Generates a rate limit key for a phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} type - Type of rate limit (second, minute, hour, day)
   * @returns {string} - Rate limit key
   */
  generateKey: (phoneNumber, type) => {
    return `twilio:rate_limit:${type}:${phoneNumber}`;
  },

  /**
   * Checks if a request is allowed based on rate limits
   * @param {string} phoneNumber - Phone number
   * @param {object} rateLimitConfig - Rate limit configuration
   * @param {object} redisClient - Redis client for tracking
   * @returns {Promise<object>} - Rate limit check result
   */
  checkLimit: async (phoneNumber, rateLimitConfig, redisClient) => {
    if (!redisClient) {
      return { allowed: true, remaining: Infinity, resetTime: null };
    }

    const key = rateLimitUtils.generateKey(
      phoneNumber,
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

  /**
   * Resets rate limit for a phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} type - Type of rate limit to reset
   * @param {object} redisClient - Redis client
   * @returns {Promise<boolean>} - Success status
   */
  resetLimit: async (phoneNumber, type, redisClient) => {
    if (!redisClient) {
      return false;
    }

    const key = rateLimitUtils.generateKey(phoneNumber, type);

    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return false;
    }
  },
};

/**
 * Cost calculation utilities
 */
export const costUtils = {
  /**
   * Estimates SMS cost based on destination and content
   * @param {string} phoneNumber - Destination phone number
   * @param {string} content - SMS content
   * @returns {object} - Cost estimate
   */
  estimateCost: (phoneNumber, content) => {
    const countryCode = phoneUtils.extractCountryCode(phoneNumber);
    const { segments } = contentUtils.countCharacters(content);

    // Base rates per segment (these would be updated with actual Twilio pricing)
    const baseRates = {
      US: 0.0079, // United States
      GB: 0.045, // United Kingdom
      NG: 0.058, // Nigeria
      KE: 0.058, // Kenya
      ZA: 0.058, // South Africa
      GH: 0.058, // Ghana
      UG: 0.058, // Uganda
      TZ: 0.058, // Tanzania
    };

    const ratePerSegment = baseRates[countryCode] || 0.08; // Default international rate
    const totalCost = ratePerSegment * segments;

    return {
      currency: smsServiceConfig.defaultCurrency,
      ratePerSegment,
      segments,
      totalCost,
      countryCode,
    };
  },

  /**
   * Calculates actual cost from Twilio response
   * @param {object} twilioResponse - Twilio message response
   * @returns {object} - Cost information
   */
  calculateActualCost: (twilioResponse) => {
    if (!twilioResponse || !twilioResponse.price) {
      return null;
    }

    // Twilio returns price in decimal format (e.g., -0.0079 for USD)
    const price = parseFloat(twilioResponse.price);
    const currency =
      twilioResponse.currency || smsServiceConfig.defaultCurrency;

    return {
      amount: Math.abs(price),
      currency,
      segments: twilioResponse.numSegments || 1,
    };
  },
};

/**
 * Error classification utilities
 */
export const errorUtils = {
  /**
   * Classifies Twilio error as retryable or non-retryable
   * @param {object} error - Twilio error object
   * @returns {object} - Error classification
   */
  classifyError: (error) => {
    const errorCode = error.code || error.status;

    // Check if error is retryable
    const isRetryable =
      errorCode &&
      (errorCode >= 500 || // Server errors
        errorCode === 429 || // Rate limited
        errorCode === 21610 || // Temporarily unavailable
        errorCode === 21611 || // Too many requests
        errorCode === 30001 || // Queue overflow
        errorCode === 30002 || // Account suspended
        errorCode === 30003 || // Unreachable destination handset
        errorCode === 30004 || // Message blocked
        errorCode === 30005); // Unknown destination handset

    // Determine error category
    let category = 'unknown';
    if (errorCode >= 400 && errorCode < 500) {
      category = 'client_error';
    } else if (errorCode >= 500) {
      category = 'server_error';
    } else if (errorCode === 429) {
      category = 'rate_limit';
    } else if (errorCode >= 30000) {
      category = 'twilio_error';
    }

    return {
      isRetryable,
      category,
      code: errorCode,
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
  phone: phoneUtils,
  content: contentUtils,
  rateLimit: rateLimitUtils,
  cost: costUtils,
  error: errorUtils,
};
