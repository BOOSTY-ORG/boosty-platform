// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    ME: '/auth/me',
    UPDATE_PASSWORD: '/auth/update-password',
  },
  DASHBOARD: {
    OVERVIEW: '/metrics/dashboard/overview',
    METRICS: '/metrics/dashboard',
    REALTIME: '/metrics/dashboard/realtime',
    SUMMARY: '/metrics/dashboard/summary',
    PERFORMANCE: '/metrics/dashboard/performance',
    ACTIVITY: '/metrics/dashboard/activity',
    HEALTH: '/metrics/dashboard/health',
    TRANSACTIONS: '/metrics/dashboard/transactions',
    USER_ACTIVITY: '/metrics/dashboard/users/activity',
    FINANCIAL: '/metrics/dashboard/financial',
  },
  INVESTORS: {
    LIST: '/metrics/investors',
    DETAIL: '/metrics/investors/:id',
    CREATE: '/metrics/investors',
    UPDATE: '/metrics/investors/:id',
    DELETE: '/metrics/investors/:id',
    METRICS: '/metrics/investors/metrics',
    KYC: '/metrics/investors/:id/kyc',
    UPLOAD_KYC: '/metrics/investors/:id/kyc',
    VERIFY_KYC: '/metrics/investors/:id/kyc/:documentId/verify',
    INVESTMENTS: '/metrics/investors/:id/investments',
    TRANSACTIONS: '/metrics/investors/:id/transactions',
    PERFORMANCE: '/metrics/investors/:id/performance',
    STATS: '/metrics/investors/stats',
    SEARCH: '/metrics/investors/search',
  },
  USERS: {
    LIST: '/metrics/users',
    DETAIL: '/metrics/users/:id',
    CREATE: '/metrics/users',
    UPDATE: '/metrics/users/:id',
    DELETE: '/metrics/users/:id',
    METRICS: '/metrics/users/metrics',
    APPLICATIONS: '/metrics/users/:id/applications',
    CREATE_APPLICATION: '/metrics/users/:id/applications',
    UPDATE_APPLICATION: '/metrics/users/:id/applications/:applicationId',
    INSTALLATIONS: '/metrics/users/:id/installations',
    CREATE_INSTALLATION: '/metrics/users/:id/installations',
    UPDATE_INSTALLATION: '/metrics/users/:id/installations/:installationId',
    STATS: '/metrics/users/stats',
    SEARCH: '/metrics/users/search',
    ACTIVITY: '/metrics/users/:id/activity',
    DOCUMENTS: '/metrics/users/:id/documents',
    UPLOAD_DOCUMENT: '/metrics/users/:id/documents',
  },
  PAYMENTS: {
    LIST: '/metrics/transactions',
    DETAIL: '/metrics/transactions/:id',
    CREATE: '/metrics/transactions',
    UPDATE: '/metrics/transactions/:id',
    DELETE: '/metrics/transactions/:id',
    METRICS: '/metrics/transactions/metrics',
    LEDGER: '/metrics/transactions/ledger',
    PAYOUTS: '/metrics/transactions/payouts',
    CONFIRM_PAYOUT: '/metrics/transactions/:id/confirm-payout',
    STATS: '/metrics/transactions/stats',
    INVESTOR_PAYMENTS: '/metrics/transactions/investor/:investorId',
    USER_PAYMENTS: '/metrics/transactions/user/:userId',
    REFUND: '/metrics/transactions/:id/refund',
    HISTORY: '/metrics/transactions/history',
    EXPORT: '/metrics/transactions/export',
    SEARCH: '/metrics/transactions/search',
  },
  CRM: {
    TICKETS: '/metrics/crm/tickets',
    TICKET_DETAIL: '/metrics/crm/tickets/:id',
    CREATE_TICKET: '/metrics/crm/tickets',
    UPDATE_TICKET: '/metrics/crm/tickets/:id',
    DELETE_TICKET: '/metrics/crm/tickets/:id',
    COMMUNICATIONS: '/metrics/crm/communications',
    ADD_COMMUNICATION: '/metrics/crm/communications',
    ASSIGNMENTS: '/metrics/crm/assignments',
    ASSIGN_CASE: '/metrics/crm/tickets/:ticketId/assign',
    METRICS: '/metrics/crm/metrics',
    AGENT_PERFORMANCE: '/metrics/crm/agents/:agentId/performance',
    SATISFACTION: '/metrics/crm/satisfaction',
    RESPONSE_TIMES: '/metrics/crm/response-times',
    SEARCH_TICKETS: '/metrics/crm/tickets/search',
    CATEGORIES: '/metrics/crm/tickets/categories',
    PRIORITIES: '/metrics/crm/tickets/priorities',
    STATUSES: '/metrics/crm/tickets/statuses',
    UPDATE_STATUS: '/metrics/crm/tickets/:id/status',
    ESCALATE: '/metrics/crm/tickets/:id/escalate',
  },
  REPORTS: {
    LIST: '/metrics/reports',
    DETAIL: '/metrics/reports/:id',
    GENERATE: '/metrics/reports/generate',
    TEMPLATES: '/metrics/reports/templates',
    METRICS: '/metrics/reports/metrics',
    FINANCIAL: '/metrics/reports/financial',
    PERFORMANCE: '/metrics/reports/performance',
    USERS: '/metrics/reports/users',
    INVESTORS: '/metrics/reports/investors',
    TRANSACTIONS: '/metrics/reports/transactions',
    ANALYTICS: '/metrics/reports/analytics',
    EXPORT: '/metrics/reports/:id/export',
    SCHEDULE: '/metrics/reports/schedule',
    SCHEDULED: '/metrics/reports/scheduled',
    UPDATE_SCHEDULED: '/metrics/reports/scheduled/:id',
    DELETE_SCHEDULED: '/metrics/reports/scheduled/:id',
    FILTERS: '/metrics/reports/filters/:reportType',
    SEARCH: '/metrics/reports/search',
  },
};

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  FINANCE: 'finance',
  SUPPORT: 'support',
  MANAGER: 'manager',
  USER: 'user',
};

// User permissions
export const PERMISSIONS = {
  // Read permissions
  READ_ALL: 'read:all',
  READ_OWN: 'read:own',
  READ_USERS: 'read:users',
  READ_INVESTORS: 'read:investors',
  READ_PAYMENTS: 'read:payments',
  READ_REPORTS: 'read:reports',
  READ_CRM: 'read:crm',
  
  // Write permissions
  WRITE_ALL: 'write:all',
  WRITE_OWN: 'write:own',
  WRITE_USERS: 'write:users',
  WRITE_INVESTORS: 'write:investors',
  WRITE_PAYMENTS: 'write:payments',
  WRITE_CRM: 'write:crm',
  
  // Delete permissions
  DELETE_ALL: 'delete:all',
  
  // Management permissions
  MANAGE_USERS: 'manage:users',
  MANAGE_INVESTORS: 'manage:investors',
  MANAGE_PAYMENTS: 'manage:payments',
  MANAGE_REPORTS: 'manage:reports',
  MANAGE_CRM: 'manage:crm',
  MANAGE_TRANSACTIONS: 'manage:transactions',
  MANAGE_PAYOUTS: 'manage:payouts',
  MANAGE_TICKETS: 'manage:tickets',
  MANAGE_COMMUNICATIONS: 'manage:communications',
  MANAGE_ANALYTICS: 'manage:analytics',
};

// Status constants
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  APPROVED: 'approved',
  SUSPENDED: 'suspended',
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
};

// KYC status
export const KYC_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// Ticket priorities
export const TICKET_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Ticket categories
export const TICKET_CATEGORY = {
  GENERAL: 'general',
  TECHNICAL: 'technical',
  BILLING: 'billing',
  ACCOUNT: 'account',
  INVESTMENT: 'investment',
  PAYMENT: 'payment',
  KYC: 'kyc',
  OTHER: 'other',
};

// Payment methods
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  CRYPTOCURRENCY: 'cryptocurrency',
  MOBILE_MONEY: 'mobile_money',
};

// Transaction types
export const TRANSACTION_TYPES = {
  INVESTMENT: 'investment',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund',
  PAYOUT: 'payout',
  FEE: 'fee',
  BONUS: 'bonus',
};

// Date range presets
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
  LAST_6_MONTHS: '6m',
  LAST_YEAR: '1y',
  CUSTOM: 'custom',
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  LIMIT_OPTIONS: [10, 25, 50, 100],
};

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#3B82F6',
  SECONDARY: '#10B981',
  SUCCESS: '#059669',
  WARNING: '#D97706',
  DANGER: '#DC2626',
  INFO: '#0891B2',
  LIGHT: '#F3F4F6',
  DARK: '#1F2937',
};

// Theme
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Export formats
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  CSV: 'csv',
  EXCEL: 'xlsx',
  JSON: 'json',
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};