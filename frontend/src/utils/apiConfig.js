// Base API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Request configuration
export const REQUEST_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
};

// Response configuration
export const RESPONSE_CONFIG = {
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
};

// Error codes mapping
export const ERROR_CODES = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// HTTP status messages
export const HTTP_MESSAGES = {
  [ERROR_CODES.BAD_REQUEST]: 'Bad Request - The server could not understand the request',
  [ERROR_CODES.UNAUTHORIZED]: 'Unauthorized - Authentication is required',
  [ERROR_CODES.FORBIDDEN]: 'Forbidden - You do not have permission to access this resource',
  [ERROR_CODES.NOT_FOUND]: 'Not Found - The requested resource was not found',
  [ERROR_CODES.METHOD_NOT_ALLOWED]: 'Method Not Allowed - The request method is not supported',
  [ERROR_CODES.CONFLICT]: 'Conflict - The request conflicts with the current state of the resource',
  [ERROR_CODES.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity - The request could not be processed',
  [ERROR_CODES.TOO_MANY_REQUESTS]: 'Too Many Requests - Rate limit exceeded',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Internal Server Error - An unexpected error occurred',
  [ERROR_CODES.BAD_GATEWAY]: 'Bad Gateway - The server received an invalid response',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service Unavailable - The service is temporarily unavailable',
  [ERROR_CODES.GATEWAY_TIMEOUT]: 'Gateway Timeout - The server took too long to respond',
};

// API endpoints configuration
export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
    UPDATE_PASSWORD: '/auth/update-password',
  },
  
  // Dashboard endpoints
  DASHBOARD: {
    OVERVIEW: '/metrics/dashboard/overview',
    METRICS: '/metrics/dashboard',
    REALTIME: '/metrics/dashboard/realtime',
    SUMMARY: '/metrics/dashboard/summary',
    PERFORMANCE: '/metrics/dashboard/performance',
    ACTIVITY: '/metrics/dashboard/activity',
    HEALTH: '/metrics/dashboard/health',
  },
  
  // User endpoints
  USERS: {
    LIST: '/metrics/users',
    DETAIL: '/metrics/users/:id',
    CREATE: '/metrics/users',
    UPDATE: '/metrics/users/:id',
    DELETE: '/metrics/users/:id',
    METRICS: '/metrics/users/metrics',
    SEARCH: '/metrics/users/search',
  },
  
  // Investor endpoints
  INVESTORS: {
    LIST: '/metrics/investors',
    DETAIL: '/metrics/investors/:id',
    CREATE: '/metrics/investors',
    UPDATE: '/metrics/investors/:id',
    DELETE: '/metrics/investors/:id',
    METRICS: '/metrics/investors/metrics',
    SEARCH: '/metrics/investors/search',
    KYC: '/metrics/investors/:id/kyc',
  },
  
  // Payment endpoints
  PAYMENTS: {
    LIST: '/metrics/transactions',
    DETAIL: '/metrics/transactions/:id',
    CREATE: '/metrics/transactions',
    UPDATE: '/metrics/transactions/:id',
    DELETE: '/metrics/transactions/:id',
    METRICS: '/metrics/transactions/metrics',
    LEDGER: '/metrics/transactions/ledger',
    SEARCH: '/metrics/transactions/search',
    EXPORT: '/metrics/transactions/export',
  },
  
  // CRM endpoints
  CRM: {
    TICKETS: '/metrics/crm/tickets',
    TICKET_DETAIL: '/metrics/crm/tickets/:id',
    CREATE_TICKET: '/metrics/crm/tickets',
    UPDATE_TICKET: '/metrics/crm/tickets/:id',
    DELETE_TICKET: '/metrics/crm/tickets/:id',
    COMMUNICATIONS: '/metrics/crm/communications',
    ASSIGNMENTS: '/metrics/crm/assignments',
    METRICS: '/metrics/crm/metrics',
    SEARCH: '/metrics/crm/tickets/search',
  },
  
  // Reports endpoints
  REPORTS: {
    LIST: '/metrics/reports',
    DETAIL: '/metrics/reports/:id',
    GENERATE: '/metrics/reports/generate',
    TEMPLATES: '/metrics/reports/templates',
    METRICS: '/metrics/reports/metrics',
    EXPORT: '/metrics/reports/:id/export',
    SCHEDULE: '/metrics/reports/schedule',
    SEARCH: '/metrics/reports/search',
  },
};

// Build URL with parameters
export const buildUrl = (baseUrl, params = {}) => {
  let url = baseUrl;
  
  // Replace path parameters
  Object.keys(params).forEach(key => {
    const placeholder = `:${key}`;
    if (url.includes(placeholder)) {
      url = url.replace(placeholder, encodeURIComponent(params[key]));
    }
  });
  
  return url;
};

// Build query string
export const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, item));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  
  return searchParams.toString();
};

// Full URL builder
export const buildFullUrl = (endpoint, params = {}, queryParams = {}) => {
  const url = buildUrl(endpoint, params);
  const queryString = buildQueryString(queryParams);
  
  return queryString ? `${url}?${queryString}` : url;
};

// Request interceptor configuration
export const REQUEST_INTERCEPTORS = {
  // Add auth token to requests
  auth: (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  
  // Add request timestamp
  timestamp: (config) => {
    config.metadata = { startTime: new Date() };
    return config;
  },
  
  // Add request ID for tracking
  requestId: (config) => {
    config.headers['X-Request-ID'] = generateRequestId();
    return config;
  },
};

// Response interceptor configuration
export const RESPONSE_INTERCEPTORS = {
  // Log response time
  logResponseTime: (response) => {
    const { startTime } = response.config.metadata || {};
    if (startTime) {
      const duration = new Date() - startTime;
      console.log(`Request to ${response.config.url} took ${duration}ms`);
    }
    return response;
  },
  
  // Handle common errors
  handleErrors: (error) => {
    const { status, data } = error.response || {};
    
    if (status === ERROR_CODES.UNAUTHORIZED) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/auth/login';
    }
    
    if (status === ERROR_CODES.FORBIDDEN) {
      // Handle forbidden access
      console.error('Access forbidden:', data?.message || 'Insufficient permissions');
    }
    
    return Promise.reject(error);
  },
};

// Generate unique request ID
export const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Default pagination parameters
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

// Default date range parameters
export const DEFAULT_DATE_RANGE = {
  start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0],
};

// Cache configuration
export const CACHE_CONFIG = {
  ENABLED: true,
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Maximum number of cached responses
};

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  RETRY_CONDITION: (error) => {
    // Retry on network errors and 5xx server errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  },
};

// File upload configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
};

// WebSocket configuration
export const WS_CONFIG = {
  URL: import.meta.env.VITE_WS_URL || 'ws://localhost:7000',
  RECONNECT_INTERVAL: 5000,
  MAX_RECONNECT_ATTEMPTS: 10,
  HEARTBEAT_INTERVAL: 30000,
};

// Export all configurations
export default {
  API_CONFIG,
  REQUEST_CONFIG,
  RESPONSE_CONFIG,
  ERROR_CODES,
  HTTP_MESSAGES,
  ENDPOINTS,
  buildUrl,
  buildQueryString,
  buildFullUrl,
  REQUEST_INTERCEPTORS,
  RESPONSE_INTERCEPTORS,
  generateRequestId,
  DEFAULT_PAGINATION,
  DEFAULT_DATE_RANGE,
  CACHE_CONFIG,
  RETRY_CONFIG,
  UPLOAD_CONFIG,
  WS_CONFIG,
};