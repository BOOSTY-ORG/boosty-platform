/**
 * Security utilities for the financial dashboard
 * Provides input sanitization, XSS protection, CSRF handling, and secure storage
 */

/**
 * XSS Protection - Sanitize HTML content
 */
export const sanitizeHTML = (html) => {
  if (typeof html !== "string") {
    return "";
  }

  // Basic HTML sanitization - in production, use a library like DOMPurify
  const tempDiv = document.createElement("div");
  tempDiv.textContent = html;
  return tempDiv.innerHTML;
};

/**
 * Sanitize user input for various contexts
 */
export const sanitizeInput = {
  /**
   * Sanitize input for display (HTML context)
   */
  forDisplay: (input) => {
    if (typeof input !== "string") {
      return "";
    }

    return input.replace(/[&<>"']/g, (match) => {
      const escapeMap = {
        "&": "&",
        "<": "<",
        ">": ">",
        '"': '"',
        "'": "&#x27;",
      };
      return escapeMap[match];
    });
  },

  /**
   * Sanitize input for URLs
   */
  forURL: (input) => {
    if (typeof input !== "string") {
      return "";
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[\s<>"'{}|\\^`]/g, "")
      .replace(/javascript:/gi, "")
      .replace(/data:/gi, "")
      .replace(/vbscript:/gi, "");
  },

  /**
   * Sanitize input for numeric values
   */
  forNumber: (input) => {
    if (typeof input === "number") {
      return input;
    }

    if (typeof input !== "string") {
      return 0;
    }

    // Remove non-numeric characters except decimal point and minus sign
    const sanitized = input.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(sanitized);

    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Sanitize input for email addresses
   */
  forEmail: (input) => {
    if (typeof input !== "string") {
      return "";
    }

    // Basic email validation and sanitization
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w@.-]/g, "")
      .replace(/\.+/g, ".")
      .replace(/@+/g, "@");
  },

  /**
   * Sanitize input for alphanumeric values
   */
  forAlphanumeric: (input) => {
    if (typeof input !== "string") {
      return "";
    }

    return input.replace(/[^a-zA-Z0-9]/g, "");
  },

  /**
   * Sanitize input for phone numbers
   */
  forPhone: (input) => {
    if (typeof input !== "string") {
      return "";
    }

    // Keep only digits, plus, minus, parentheses, and spaces
    return input.replace(/[^\d\+\-\(\)\s]/g, "");
  },
};

/**
 * Content Security Policy helpers
 */
export const csp = {
  /**
   * Generate nonce for inline scripts
   */
  generateNonce: () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  },

  /**
   * Validate nonce
   */
  validateNonce: (nonce) => {
    return typeof nonce === "string" && nonce.length > 0;
  },
};

/**
 * CSRF Protection
 */
export const csrf = {
  /**
   * Get CSRF token from meta tag or cookie
   */
  getToken: () => {
    // Try meta tag first
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      return metaTag.getAttribute("content");
    }

    // Try cookie
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "csrf-token" || name === "_csrf") {
        return decodeURIComponent(value);
      }
    }

    return null;
  },

  /**
   * Add CSRF token to request headers
   */
  addToHeaders: (headers = {}) => {
    const token = csrf.getToken();
    if (token) {
      return {
        ...headers,
        "X-CSRF-Token": token,
        "X-Requested-With": "XMLHttpRequest",
      };
    }
    return headers;
  },

  /**
   * Add CSRF token to form data
   */
  addToFormData: (formData) => {
    const token = csrf.getToken();
    if (token && formData instanceof FormData) {
      formData.append("_csrf", token);
    }
    return formData;
  },

  /**
   * Add CSRF token to URL parameters
   */
  addToURL: (url) => {
    const token = csrf.getToken();
    if (token) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}_csrf=${encodeURIComponent(token)}`;
    }
    return url;
  },
};

/**
 * Secure localStorage utilities
 */
export const secureStorage = {
  /**
   * Encrypt data for storage (simple encryption - use proper encryption in production)
   */
  encrypt: (data) => {
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.error("Failed to encrypt data:", error);
      return null;
    }
  },

  /**
   * Decrypt data from storage
   */
  decrypt: (encryptedData) => {
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Failed to decrypt data:", error);
      return null;
    }
  },

  /**
   * Set item with encryption
   */
  setItem: (key, value, isSensitive = false) => {
    try {
      const dataToStore = isSensitive ? secureStorage.encrypt(value) : value;
      localStorage.setItem(
        key,
        JSON.stringify({
          data: dataToStore,
          encrypted: isSensitive,
          timestamp: Date.now(),
        })
      );
      return true;
    } catch (error) {
      console.error("Failed to set storage item:", error);
      return false;
    }
  },

  /**
   * Get item with decryption
   */
  getItem: (key) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      let data = parsed.data;

      if (parsed.encrypted) {
        data = secureStorage.decrypt(data);
      }

      return data;
    } catch (error) {
      console.error("Failed to get storage item:", error);
      return null;
    }
  },

  /**
   * Remove item
   */
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Failed to remove storage item:", error);
      return false;
    }
  },

  /**
   * Clear all items
   */
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error("Failed to clear storage:", error);
      return false;
    }
  },
};

/**
 * Input validation utilities
 */
export const validate = {
  /**
   * Validate required field
   */
  required: (value) => {
    return value !== null && value !== undefined && value !== "";
  },

  /**
   * Validate email format
   */
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number
   */
  phone: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
  },

  /**
   * Validate numeric range
   */
  range: (value, min, max) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Validate string length
   */
  length: (value, minLength, maxLength) => {
    if (typeof value !== "string") return false;
    return value.length >= minLength && value.length <= maxLength;
  },

  /**
   * Validate password strength
   */
  password: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers,
      isStrong:
        password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumbers &&
        hasSpecialChar,
      score: [
        password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
      ].filter(Boolean).length,
    };
  },

  /**
   * Validate URL
   */
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Security headers utilities
 */
export const securityHeaders = {
  /**
   * Get security headers for API requests
   */
  getHeaders: () => {
    return {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...csrf.addToHeaders(),
    };
  },

  /**
   * Add security headers to fetch options
   */
  addToFetchOptions: (options = {}) => {
    return {
      ...options,
      headers: {
        ...securityHeaders.getHeaders(),
        ...options.headers,
      },
      credentials: "same-origin",
    };
  },
};

/**
 * Rate limiting utilities
 */
export const rateLimit = {
  /**
   * Create a rate limiter
   */
  create: (maxCalls, timeWindow) => {
    const calls = [];

    return () => {
      const now = Date.now();

      // Remove old calls outside the time window
      while (calls.length > 0 && calls[0] <= now - timeWindow) {
        calls.shift();
      }

      if (calls.length >= maxCalls) {
        throw new Error("Rate limit exceeded");
      }

      calls.push(now);
      return true;
    };
  },

  /**
   * Create a rate limiter with promise-based approach
   */
  createAsync: (maxCalls, timeWindow) => {
    const calls = [];
    const queue = [];

    const processQueue = () => {
      while (queue.length > 0 && calls.length < maxCalls) {
        const { resolve, reject } = queue.shift();
        try {
          const now = Date.now();

          // Remove old calls outside the time window
          while (calls.length > 0 && calls[0] <= now - timeWindow) {
            calls.shift();
          }

          if (calls.length < maxCalls) {
            calls.push(now);
            resolve(true);
          } else {
            queue.unshift({ resolve, reject });
            break;
          }
        } catch (error) {
          reject(error);
        }
      }
    };

    return () => {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
        processQueue();
      });
    };
  },
};

/**
 * Content Security Policy validation
 */
export const cspValidator = {
  /**
   * Check if content violates CSP
   */
  validateInlineScript: (content) => {
    // Check for potentially dangerous inline scripts
    const dangerousPatterns = [
      /javascript:/gi,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /on\w+\s*=/gi,
    ];

    return !dangerousPatterns.some((pattern) => pattern.test(content));
  },

  /**
   * Check if URL is safe for navigation
   */
  validateURL: (url) => {
    try {
      const parsedUrl = new URL(url, window.location.origin);

      // Only allow same origin or whitelisted domains
      const allowedOrigins = [
        window.location.origin,
        // Add other allowed origins here
      ];

      return allowedOrigins.includes(parsedUrl.origin);
    } catch {
      return false;
    }
  },
};

/**
 * Security monitoring
 */
export const securityMonitor = {
  /**
   * Log security events
   */
  logEvent: (event, details = {}) => {
    const securityEvent = {
      type: "security",
      event,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.warn("Security Event:", securityEvent);

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === "production") {
      // Send to security monitoring endpoint
    }
  },

  /**
   * Detect suspicious activity
   */
  detectSuspiciousActivity: (activity) => {
    const suspiciousPatterns = [
      // Multiple failed login attempts
      { pattern: "multiple_failed_logins", threshold: 5, timeWindow: 300000 }, // 5 minutes
      // Rapid API calls
      { pattern: "rapid_api_calls", threshold: 100, timeWindow: 60000 }, // 1 minute
      // Unusual data access patterns
      { pattern: "unusual_data_access", threshold: 50, timeWindow: 300000 }, // 5 minutes
    ];

    // Implementation would depend on specific monitoring requirements
    return suspiciousPatterns;
  },
};

/**
 * Initialize security measures
 */
export const initializeSecurity = () => {
  // Add global error handler for security events
  window.addEventListener("error", (event) => {
    if (event.message && event.message.includes("Security")) {
      securityMonitor.logEvent("javascript_error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  });

  // Monitor CSP violations
  if ("SecurityPolicyViolationEvent" in window) {
    document.addEventListener("securitypolicyviolation", (event) => {
      securityMonitor.logEvent("csp_violation", {
        blockedURI: event.blockedURI,
        violatedDirective: event.violatedDirective,
        originalPolicy: event.originalPolicy,
      });
    });
  }

  // Prevent right-click on sensitive elements
  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".sensitive-content")) {
      event.preventDefault();
      securityMonitor.logEvent("context_menu_blocked", {
        element: event.target.tagName,
        className: event.target.className,
      });
    }
  });

  // Prevent copy on sensitive elements
  document.addEventListener("copy", (event) => {
    if (event.target.closest(".sensitive-content")) {
      event.preventDefault();
      securityMonitor.logEvent("copy_blocked", {
        element: event.target.tagName,
        className: event.target.className,
      });
    }
  });
};

// Initialize security when module loads
if (typeof window !== "undefined") {
  initializeSecurity();
}

export default {
  sanitizeHTML,
  sanitizeInput,
  csp,
  csrf,
  secureStorage,
  validate,
  securityHeaders,
  rateLimit,
  cspValidator,
  securityMonitor,
  initializeSecurity,
};
