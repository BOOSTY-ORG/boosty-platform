// Simple in-memory rate limiting for development
// In production, this should be replaced with Redis-based rate limiting

class RateLimitService {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      // Remove entries older than 1 hour
      if (now - data.resetTime > 3600000) {
        this.requests.delete(key);
      }
    }
  }

  isAllowed(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
        requests: [now]
      });
      return { allowed: true, remaining: limit - 1 };
    }
    
    const data = this.requests.get(key);
    
    // Filter requests within the current window
    data.requests = data.requests.filter(timestamp => timestamp > windowStart);
    
    if (data.requests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.resetTime
      };
    }
    
    data.requests.push(now);
    data.count = data.requests.length;
    
    return {
      allowed: true,
      remaining: limit - data.count
    };
  }

  reset(key) {
    this.requests.delete(key);
  }
}

const rateLimitService = new RateLimitService();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    
    // Skip based on response status if configured
    if (skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
      return next();
    }
    
    if (skipFailedRequests && res.statusCode >= 400) {
      return next();
    }

    const result = rateLimitService.isAllowed(key, max, windowMs);
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': max,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
    });

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: generateRequestId()
        }
      });
    }

    next();
  };
};

// Predefined rate limit configurations for different endpoint types
export const adminRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: 'Too many admin requests, please try again later.'
});

export const standardRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 requests per hour
  message: 'Too many requests, please try again later.'
});

export const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 reports per hour
  message: 'Too many report generation requests, please try again later.'
});

export const realtimeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 real-time requests per hour
  message: 'Too many real-time requests, please try again later.'
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 authentication attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true
});

// User-based rate limiting
export const userRateLimit = (options = {}) => {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      if (req.auth && req.auth._id) {
        return `user:${req.auth._id}`;
      }
      return req.ip || req.connection.remoteAddress;
    }
  });
};

// Role-based rate limiting
export const roleBasedRateLimit = (req, res, next) => {
  const userRole = req.user?.role;
  
  switch (userRole) {
    case 'admin':
    case 'superadmin':
      return adminRateLimit(req, res, next);
    case 'investor':
      return userRateLimit({
        windowMs: 60 * 60 * 1000,
        max: 200,
        message: 'Too many investor requests, please try again later.'
      })(req, res, next);
    default:
      return standardRateLimit(req, res, next);
  }
};

// Endpoint-specific rate limiting based on path
export const smartRateLimit = (req, res, next) => {
  const path = req.path;
  
  if (path.includes('/reports')) {
    return reportRateLimit(req, res, next);
  }
  
  if (path.includes('/realtime')) {
    return realtimeRateLimit(req, res, next);
  }
  
  if (path.includes('/auth')) {
    return authRateLimit(req, res, next);
  }
  
  // Default to role-based rate limiting
  return roleBasedRateLimit(req, res, next);
};

// Utility function to generate request IDs
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get rate limit statistics
export const getRateLimitStats = () => {
  return {
    totalKeys: rateLimitService.requests.size,
    activeKeys: Array.from(rateLimitService.requests.keys()).map(key => ({
      key,
      count: rateLimitService.requests.get(key).count,
      resetTime: new Date(rateLimitService.requests.get(key).resetTime).toISOString()
    }))
  };
};

// Reset rate limit for a specific key
export const resetRateLimit = (key) => {
  rateLimitService.reset(key);
};

export default rateLimitService;