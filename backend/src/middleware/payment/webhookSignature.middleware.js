import crypto from 'crypto';
import { PaymentError, PaymentErrorType } from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Webhook signature verification middleware
 * Verifies Paystack webhook signatures for security
 */

/**
 * Allowed IP addresses for Paystack webhooks
 * Paystack webhook IPs (as of documentation)
 */
const PAYSTACK_WEBHOOK_IPS = [
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220'
];

/**
 * Verify webhook signature middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyWebhookSignature = (req, res, next) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers['x-paystack-signature'];
    const payload = JSON.stringify(req.body);
    
    logger.info('Verifying webhook signature', {
      signature: signature ? signature.substring(0, 20) + '...' : 'missing',
      payloadLength: payload.length,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Check if signature is present
    if (!signature) {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'MISSING_SIGNATURE',
        'Webhook signature is missing',
        { ip: req.ip }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new PaymentError(
        PaymentErrorType.SYSTEM_ERROR,
        'WEBHOOK_SECRET_NOT_CONFIGURED',
        'Webhook secret is not configured'
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha512', webhookSecret)
      .update(payload)
      .digest('hex');

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValidSignature) {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'INVALID_SIGNATURE',
        'Webhook signature verification failed',
        { 
          ip: req.ip,
          signature: signature.substring(0, 20) + '...',
          expectedSignature: expectedSignature.substring(0, 20) + '...'
        }
      );
    }

    // Verify IP address (additional security layer)
    const clientIP = getClientIP(req);
    if (!isAllowedIP(clientIP)) {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'UNAUTHORIZED_IP',
        'Webhook request from unauthorized IP address',
        { ip: clientIP }
      );
    }

    // Verify content type
    const contentType = req.headers['content-type'];
    if (contentType !== 'application/json') {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'INVALID_CONTENT_TYPE',
        'Webhook must have application/json content type',
        { contentType }
      );
    }

    // Verify request method
    if (req.method !== 'POST') {
      throw new PaymentError(
        PaymentErrorType.WEBHOOK_ERROR,
        'INVALID_METHOD',
        'Webhook requests must use POST method',
        { method: req.method }
      );
    }

    // Store verified webhook data for later use
    req.webhookVerified = true;
    req.webhookPayload = req.body;
    req.webhookSignature = signature;

    const processingTime = Date.now() - startTime;
    
    logger.info('Webhook signature verified successfully', {
      ip: clientIP,
      processingTime
    });

    next();

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Webhook signature verification failed', {
      error: error.message,
      ip: req.ip,
      processingTime
    });

    return res.status(error.statusCode || 401).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 * @private
 */
const getClientIP = (req) => {
  // Check various headers for IP address
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip;
};

/**
 * Check if IP address is allowed
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is allowed
 * @private
 */
const isAllowedIP = (ip) => {
  // In development, allow all IPs
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Check if IP is in Paystack whitelist
  if (PAYSTACK_WEBHOOK_IPS.includes(ip)) {
    return true;
  }
  
  // Check if IP is private/local
  return isPrivateIP(ip);
};

/**
 * Check if IP address is private
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is private
 * @private
 */
const isPrivateIP = (ip) => {
  // IPv4 private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];
  
  return privateRanges.some(range => range.test(ip));
};

/**
 * Rate limiting for webhook endpoints
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limiting middleware
 */
export const webhookRateLimit = (maxRequests = 100, windowMs = 900000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientIP = getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [ip, timestamps] of requests.entries()) {
      const filtered = timestamps.filter(timestamp => timestamp > windowStart);
      if (filtered.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, filtered);
      }
    }
    
    // Check current IP
    const timestamps = requests.get(clientIP) || [];
    const recentRequests = timestamps.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      const resetTime = Math.max(...recentRequests) + windowMs;
      
      logger.warn('Webhook rate limit exceeded', {
        ip: clientIP,
        requestCount: recentRequests.length,
        maxRequests,
        resetTime: new Date(resetTime).toISOString()
      });
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Webhook rate limit exceeded',
          details: {
            resetTime: new Date(resetTime).toISOString(),
            retryAfter: Math.ceil((resetTime - now) / 1000)
          }
        }
      });
    }
    
    // Add current request
    recentRequests.push(now);
    requests.set(clientIP, recentRequests);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': Math.max(0, maxRequests - recentRequests.length),
      'X-RateLimit-Reset': new Date(Math.max(...recentRequests) + windowMs).toISOString()
    });
    
    next();
  };
};

/**
 * Webhook security headers middleware
 * Adds security headers to webhook responses
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const webhookSecurityHeaders = (req, res, next) => {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  // Limit response size
  res.set('Content-Security-Policy', "default-src 'none'");
  
  next();
};

/**
 * Webhook payload size limit middleware
 * @param {number} maxSize - Maximum payload size in bytes
 * @returns {Function} Size limiting middleware
 */
export const webhookPayloadSizeLimit = (maxSize = 1024 * 1024) => { // 1MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Webhook payload too large', {
        ip: getClientIP(req),
        contentLength,
        maxSize
      });
      
      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Webhook payload exceeds maximum allowed size',
          details: {
            contentLength,
            maxSize
          }
        }
      });
    }
    
    next();
  };
};

export default {
  verifyWebhookSignature,
  webhookRateLimit,
  webhookSecurityHeaders,
  webhookPayloadSizeLimit,
  getClientIP,
  isAllowedIP
};