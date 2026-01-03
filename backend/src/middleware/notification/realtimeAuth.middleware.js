/**
 * Real-time Authentication Middleware
 *
 * This middleware handles authentication for real-time connections:
 * - WebSocket connection authentication
 * - Server-Sent Events (SSE) authentication
 * - Token validation and refresh
 * - Connection security checks
 * - Rate limiting for connections
 * - Device fingerprinting for security
 */

import jwt from 'jsonwebtoken';
import User from '../../models/user.model.js';
import UserNotificationPreferences from '../../models/userNotificationPreferences.model.js';
import rateLimit from 'express-rate-limit';

class RealtimeAuthMiddleware {
  constructor() {
    this.logger = this.createLogger();
    this.connectionAttempts = new Map(); // IP -> { count, lastAttempt }
    this.blockedIPs = new Set(); // Blocked IPs
    this.maxAttemptsPerIP = 10; // Max connection attempts per IP per hour
    this.blockDuration = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  /**
   * Create a logger instance
   * @returns {object} - Logger instance
   */
  createLogger() {
    return {
      info: (message, data = {}) => {
        console.log(`[RealtimeAuth] INFO: ${message}`, data);
      },
      warn: (message, data = {}) => {
        console.warn(`[RealtimeAuth] WARN: ${message}`, data);
      },
      error: (message, error) => {
        console.error(`[RealtimeAuth] ERROR: ${message}`, error);
      },
    };
  }

  /**
   * Rate limiting middleware for real-time connections
   * @returns {function} - Express middleware function
   */
  createRateLimitMiddleware() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // Limit each IP to 30 connection attempts per minute
      message: {
        success: false,
        error: 'Too many connection attempts, please try again later',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  /**
   * Authenticate WebSocket connection
   * @param {object} socket - Socket.IO socket instance
   * @param {function} next - Next middleware function
   */
  async authenticateWebSocket(socket, next) {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user information
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      // Check if user is active
      if (!user.isActive) {
        return next(new Error('User account is not active'));
      }

      // Get user preferences
      const preferences = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      // Store user info in socket
      socket.user = user;
      socket.preferences = preferences;
      socket.connectionType = 'websocket';
      socket.authenticatedAt = new Date();

      // Log successful authentication
      this.logger.info('WebSocket connection authenticated', {
        userId: user._id,
        socketId: socket.id,
        ip: socket.handshake.address,
      });

      next();
    } catch (error) {
      this.logger.error('WebSocket authentication failed', {
        error: error.message,
        socketId: socket?.id,
      });
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Authenticate SSE connection
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @returns {Promise<object>} - Authentication result
   */
  async authenticateSSE(req, res) {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;

      // Check rate limiting
      if (!this.checkRateLimit(clientIP)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          statusCode: 429,
        };
      }

      // Check if IP is blocked
      if (this.blockedIPs.has(clientIP)) {
        return {
          success: false,
          error: 'IP address blocked',
          statusCode: 403,
        };
      }

      const token =
        req.query.token || req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return {
          success: false,
          error: 'Authentication token required',
          statusCode: 401,
        };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user information
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          statusCode: 404,
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'User account is not active',
          statusCode: 403,
        };
      }

      // Get user preferences
      const preferences = await UserNotificationPreferences.findOne({
        userId: user._id,
      });

      // Update connection attempts tracking
      this.updateConnectionAttempts(clientIP, true);

      this.logger.info('SSE connection authenticated', {
        userId: user._id,
        ip: clientIP,
        userAgent: req.headers['user-agent'],
      });

      return {
        success: true,
        user,
        preferences,
        userId: user._id.toString(),
      };
    } catch (error) {
      // Update failed connection attempts
      const clientIP = req.ip || req.connection.remoteAddress;
      this.updateConnectionAttempts(clientIP, false);

      this.logger.error('SSE authentication failed', {
        error: error.message,
        ip: clientIP,
      });

      return {
        success: false,
        error: 'Authentication failed',
        statusCode: 401,
      };
    }
  }

  /**
   * Check rate limit for connection attempts
   * @param {string} ip - Client IP address
   * @returns {boolean} - Is rate limited
   */
  checkRateLimit(ip) {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(ip);

    if (!attempts) {
      return true; // First attempt
    }

    // Check if attempts exceed limit within time window
    const timeSinceLastAttempt = now - attempts.lastAttempt;
    const isWithinTimeWindow = timeSinceLastAttempt < 60 * 60 * 1000; // Within last hour

    return attempts.count >= this.maxAttemptsPerIP && isWithinTimeWindow;
  }

  /**
   * Update connection attempts tracking
   * @param {string} ip - Client IP address
   * @param {boolean} success - Was connection successful
   */
  updateConnectionAttempts(ip, success) {
    const now = Date.now();
    const attempts = this.connectionAttempts.get(ip) || {
      count: 0,
      lastAttempt: 0,
    };

    if (success) {
      // Reset count on successful connection
      this.connectionAttempts.set(ip, { count: 0, lastAttempt: now });

      // Remove from blocked IPs if previously blocked
      if (this.blockedIPs.has(ip)) {
        this.blockedIPs.delete(ip);
        this.logger.info('IP unblocked after successful connection', { ip });
      }
    } else {
      // Increment failed attempts
      attempts.count++;
      attempts.lastAttempt = now;
      this.connectionAttempts.set(ip, attempts);

      // Block IP if too many failed attempts
      if (attempts.count >= this.maxAttemptsPerIP) {
        this.blockedIPs.add(ip);
        this.logger.warn('IP blocked due to too many failed attempts', {
          ip,
          attempts: attempts.count,
        });

        // Unblock after block duration
        setTimeout(() => {
          this.blockedIPs.delete(ip);
          this.connectionAttempts.delete(ip);
          this.logger.info('IP block expired', { ip });
        }, this.blockDuration);
      }
    }
  }

  /**
   * Validate device fingerprint for additional security
   * @param {object} req - Express request object
   * @returns {object} - Device fingerprint
   */
  generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    // Simple fingerprint based on headers
    const fingerprint = {
      userAgent: this.hashString(userAgent),
      language: acceptLanguage.split(',')[0] || 'en',
      encoding: acceptEncoding.split(',')[0] || 'identity',
      timestamp: Date.now(),
    };

    return fingerprint;
  }

  /**
   * Simple string hashing for fingerprinting
   * @param {string} str - String to hash
   * @returns {string} - Hashed string
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get connection statistics
   * @returns {object} - Connection statistics
   */
  getConnectionStats() {
    return {
      totalAttempts: Array.from(this.connectionAttempts.values()).reduce(
        (sum, attempts) => sum + attempts.count,
        0
      ),
      blockedIPs: this.blockedIPs.size,
      activeConnections: this.connectionAttempts.size,
      maxAttemptsPerIP: this.maxAttemptsPerIP,
      blockDuration: this.blockDuration,
    };
  }

  /**
   * Clear old connection attempts
   */
  cleanupOldAttempts() {
    const now = Date.now();
    const cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours ago

    this.connectionAttempts.forEach((attempts, ip) => {
      if (attempts.lastAttempt < cutoffTime) {
        this.connectionAttempts.delete(ip);
      }
    });

    this.logger.info('Cleaned up old connection attempts', {
      remainingAttempts: this.connectionAttempts.size,
    });
  }

  /**
   * Reset all connection attempts (for testing/admin)
   */
  resetConnectionAttempts() {
    this.connectionAttempts.clear();
    this.blockedIPs.clear();
    this.logger.info('Reset all connection attempts');
  }
}

// Create singleton instance
const realtimeAuthMiddleware = new RealtimeAuthMiddleware();

export default realtimeAuthMiddleware;

export const authenticateWebSocket =
  realtimeAuthMiddleware.authenticateWebSocket.bind(realtimeAuthMiddleware);
export const authenticateSSE = realtimeAuthMiddleware.authenticateSSE.bind(
  realtimeAuthMiddleware
);
export const createRateLimitMiddleware =
  realtimeAuthMiddleware.createRateLimitMiddleware.bind(realtimeAuthMiddleware);
export const getConnectionStats =
  realtimeAuthMiddleware.getConnectionStats.bind(realtimeAuthMiddleware);
export const cleanupOldAttempts =
  realtimeAuthMiddleware.cleanupOldAttempts.bind(realtimeAuthMiddleware);
export const resetConnectionAttempts =
  realtimeAuthMiddleware.resetConnectionAttempts.bind(realtimeAuthMiddleware);
