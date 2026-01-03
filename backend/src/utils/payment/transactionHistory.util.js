/**
 * Transaction History Utilities
 * Helper functions for transaction history processing, formatting, and analysis
 */

/**
 * Format transaction amount with currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
export const formatAmount = (amount, currency = 'NGN') => {
  if (typeof amount !== 'number') return '0.00';

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) return '';

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-NG');
    case 'long':
      return dateObj.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'iso':
      return dateObj.toISOString();
    case 'time':
      return dateObj.toLocaleTimeString('en-NG');
    default:
      return dateObj.toLocaleDateString('en-NG');
  }
};

/**
 * Format transaction status for display
 * @param {string} status - Transaction status
 * @returns {Object} Formatted status with label and color
 */
export const formatTransactionStatus = (status) => {
  const statusMap = {
    pending: { label: 'Pending', color: '#FFA500', variant: 'warning' },
    processing: { label: 'Processing', color: '#1E90FF', variant: 'info' },
    completed: { label: 'Completed', color: '#32CD32', variant: 'success' },
    failed: { label: 'Failed', color: '#FF4500', variant: 'danger' },
    cancelled: { label: 'Cancelled', color: '#808080', variant: 'secondary' },
    refunded: { label: 'Refunded', color: '#9370DB', variant: 'info' },
  };

  return (
    statusMap[status] || {
      label: status,
      color: '#808080',
      variant: 'secondary',
    }
  );
};

/**
 * Format transaction type for display
 * @param {string} type - Transaction type
 * @returns {Object} Formatted type with label and icon
 */
export const formatTransactionType = (type) => {
  const typeMap = {
    investment: { label: 'Investment', icon: 'trending-up', color: '#28a745' },
    repayment: { label: 'Repayment', icon: 'arrow-down', color: '#17a2b8' },
    fee: { label: 'Fee', icon: 'receipt', color: '#ffc107' },
    refund: { label: 'Refund', icon: 'refresh-cw', color: '#6f42c1' },
    penalty: { label: 'Penalty', icon: 'alert-triangle', color: '#dc3545' },
  };

  return (
    typeMap[type] || { label: type, icon: 'help-circle', color: '#6c757d' }
  );
};

/**
 * Format payment method for display
 * @param {string} method - Payment method
 * @returns {Object} Formatted method with label and icon
 */
export const formatPaymentMethod = (method) => {
  const methodMap = {
    card: { label: 'Card', icon: 'credit-card', color: '#007bff' },
    bank_transfer: { label: 'Bank Transfer', icon: 'bank', color: '#28a745' },
    wallet: { label: 'Wallet', icon: 'wallet', color: '#ffc107' },
    auto_debit: { label: 'Auto Debit', icon: 'repeat', color: '#17a2b8' },
    mobile_money: {
      label: 'Mobile Money',
      icon: 'smartphone',
      color: '#6f42c1',
    },
    ussd: { label: 'USSD', icon: 'phone', color: '#fd7e14' },
  };

  return (
    methodMap[method] || {
      label: method,
      icon: 'help-circle',
      color: '#6c757d',
    }
  );
};

/**
 * Calculate processing duration in human-readable format
 * @param {number} duration - Duration in milliseconds
 * @returns {string} Human-readable duration
 */
export const formatProcessingDuration = (duration) => {
  if (!duration || duration < 0) return 'N/A';

  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Transform transaction data for API response
 * @param {Object} transaction - Transaction object
 * @returns {Object} Transformed transaction
 */
export const transformTransactionData = (transaction) => {
  if (!transaction) return null;

  const transformed = {
    id: transaction._id,
    transactionId: transaction.transactionId,
    type: transaction.type,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    paymentMethod: transaction.paymentMethod,
    paymentReference: transaction.paymentReference,
    fees: transaction.fees,
    totalFees: transaction.totalFees,
    netAmount: transaction.netAmount,
    metadata: transaction.metadata,
    createdAt: transaction.createdAt,
    processedAt: transaction.processedAt,
    completedAt: transaction.completedAt,
    failedAt: transaction.failedAt,
    failureReason: transaction.failureReason,
    processingDuration: transaction.processingDuration,
  };

  // Add formatted fields
  transformed.formattedAmount = formatAmount(
    transaction.amount,
    transaction.currency
  );
  transformed.formattedStatus = formatTransactionStatus(transaction.status);
  transformed.formattedType = formatTransactionType(transaction.type);
  transformed.formattedPaymentMethod = formatPaymentMethod(
    transaction.paymentMethod
  );
  transformed.formattedCreatedAt = formatDate(transaction.createdAt, 'long');
  transformed.formattedCompletedAt = formatDate(
    transaction.completedAt,
    'long'
  );
  transformed.formattedProcessingDuration = formatProcessingDuration(
    transaction.processingDuration
  );

  // Add Paystack-specific fields if available
  if (transaction.paystackReference) {
    transformed.paystack = {
      reference: transaction.paystackReference,
      transactionId: transaction.paystackTransactionId,
      authorizationCode: transaction.authorizationCode,
      last4: transaction.last4,
      channel: transaction.channel,
    };
  }

  // Add related entities
  transformed.fromEntity = {
    type: transaction.fromEntity,
    id: transaction.fromEntityId,
    name: transaction.fromEntityId?.name || 'System',
  };

  transformed.toEntity = {
    type: transaction.toEntity,
    id: transaction.toEntityId,
    name: transaction.toEntityId?.name || 'System',
  };

  // Add related application and investment
  if (transaction.relatedApplication) {
    transformed.relatedApplication = {
      id: transaction.relatedApplication._id,
      applicationId: transaction.relatedApplication.applicationId,
    };
  }

  if (transaction.relatedInvestment) {
    transformed.relatedInvestment = {
      id: transaction.relatedInvestment._id,
      investmentId: transaction.relatedInvestment.investmentId,
    };
  }

  return transformed;
};

/**
 * Transform an array of transactions
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} Array of transformed transactions
 */
export const transformTransactionList = (transactions) => {
  if (!Array.isArray(transactions)) return [];

  return transactions.map((transaction) =>
    transformTransactionData(transaction)
  );
};

/**
 * Build filter summary for display
 * @param {Object} filters - Applied filters
 * @returns {Array} Array of filter descriptions
 */
export const buildFilterSummary = (filters) => {
  const summary = [];

  if (filters.dateRange || filters.startDate || filters.endDate) {
    if (filters.dateRange) {
      summary.push(`Date Range: ${filters.dateRange}`);
    } else {
      const start = filters.startDate
        ? formatDate(filters.startDate, 'short')
        : 'Start';
      const end = filters.endDate
        ? formatDate(filters.endDate, 'short')
        : 'End';
      summary.push(`Date Range: ${start} - ${end}`);
    }
  }

  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    summary.push(`Status: ${statuses.join(', ')}`);
  }

  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    summary.push(`Type: ${types.join(', ')}`);
  }

  if (filters.paymentMethod) {
    const methods = Array.isArray(filters.paymentMethod)
      ? filters.paymentMethod
      : [filters.paymentMethod];
    summary.push(`Payment Method: ${methods.join(', ')}`);
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    const min =
      filters.minAmount !== undefined ? formatAmount(filters.minAmount) : '0';
    const max =
      filters.maxAmount !== undefined ? formatAmount(filters.maxAmount) : '∞';
    summary.push(`Amount: ${min} - ${max}`);
  }

  if (filters.search) {
    summary.push(`Search: "${filters.search}"`);
  }

  return summary;
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {Object} Percentage change with trend
 */
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) {
    return {
      value: 0,
      trend: 'stable',
      isPositive: false,
      isNegative: false,
    };
  }

  const change = ((current - previous) / previous) * 100;

  return {
    value: Math.round(change * 100) / 100,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    isPositive: change > 0,
    isNegative: change < 0,
  };
};

/**
 * Generate transaction report summary
 * @param {Object} summaryData - Transaction summary data
 * @returns {Object} Formatted report summary
 */
export const generateReportSummary = (summaryData) => {
  const {
    totalTransactions,
    totalAmount,
    totalFees,
    successfulTransactions,
    failedTransactions,
    pendingTransactions,
    processingTransactions,
    successRate,
    failureRate,
    averageAmount,
    breakdowns,
  } = summaryData;

  return {
    overview: {
      totalTransactions,
      totalVolume: formatAmount(totalAmount),
      totalFees: formatAmount(totalFees),
      averageTransaction: formatAmount(averageAmount),
      completionRate: `${successRate.toFixed(1)}%`,
      failureRate: `${failureRate.toFixed(1)}%`,
    },
    statusBreakdown: {
      successful: {
        count: successfulTransactions,
        percentage:
          totalTransactions > 0
            ? ((successfulTransactions / totalTransactions) * 100).toFixed(1)
            : 0,
      },
      failed: {
        count: failedTransactions,
        percentage:
          totalTransactions > 0
            ? ((failedTransactions / totalTransactions) * 100).toFixed(1)
            : 0,
      },
      pending: {
        count: pendingTransactions,
        percentage:
          totalTransactions > 0
            ? ((pendingTransactions / totalTransactions) * 100).toFixed(1)
            : 0,
      },
      processing: {
        count: processingTransactions,
        percentage:
          totalTransactions > 0
            ? ((processingTransactions / totalTransactions) * 100).toFixed(1)
            : 0,
      },
    },
    breakdowns: breakdowns || {},
  };
};

/**
 * Validate export parameters
 * @param {Object} options - Export options
 * @returns {Object} Validation result
 */
export const validateExportParameters = (options) => {
  const errors = [];
  const validFormats = ['csv', 'excel', 'json'];

  if (options.format && !validFormats.includes(options.format.toLowerCase())) {
    errors.push(`Invalid format. Valid options: ${validFormats.join(', ')}`);
  }

  if (
    options.limit &&
    (isNaN(options.limit) || options.limit < 1 || options.limit > 50000)
  ) {
    errors.push('Limit must be between 1 and 50000');
  }

  if (options.fields && !Array.isArray(options.fields)) {
    errors.push('Fields must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate filename for export
 * @param {string} format - Export format
 * @param {Object} filters - Applied filters
 * @returns {string} Generated filename
 */
export const generateExportFilename = (format, filters = {}) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const prefix = 'transaction_history';

  let suffix = '';
  if (filters.dateRange) {
    suffix = `_${filters.dateRange}`;
  } else if (filters.startDate || filters.endDate) {
    const start = filters.startDate
      ? new Date(filters.startDate).toISOString().split('T')[0]
      : 'start';
    const end = filters.endDate
      ? new Date(filters.endDate).toISOString().split('T')[0]
      : 'end';
    suffix = `_${start}_to_${end}`;
  }

  return `${prefix}${suffix}_${timestamp}.${format}`;
};

/**
 * Cache key generator for transaction history queries
 * @param {Object} filters - Query filters
 * @param {Object} pagination - Pagination options
 * @param {Object} sort - Sort options
 * @returns {string} Cache key
 */
export const generateCacheKey = (filters, pagination, sort) => {
  const keyData = {
    f: filters,
    p: pagination,
    s: sort,
  };

  return `tx_history_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
};

/**
 * Parse sort options from query parameters
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Parsed sort options
 */
export const parseSortOptions = (queryParams) => {
  const { sortBy, sortOrder = 'desc' } = queryParams;

  if (!sortBy) return { createdAt: -1 };

  const validSortFields = [
    'createdAt',
    'updatedAt',
    'amount',
    'status',
    'type',
    'paymentMethod',
    'completedAt',
    'processedAt',
    'totalFees',
    'netAmount',
  ];

  if (!validSortFields.includes(sortBy)) {
    return { createdAt: -1 };
  }

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

  return { [sortBy]: sortDirection };
};

/**
 * Build search query for multiple fields
 * @param {string} searchTerm - Search term
 * @returns {Object} MongoDB search query
 */
export const buildSearchQuery = (searchTerm) => {
  if (!searchTerm || typeof searchTerm !== 'string') return {};

  const searchRegex = new RegExp(searchTerm.trim(), 'i');

  return {
    $or: [
      { transactionId: searchRegex },
      { paymentReference: searchRegex },
      { paystackReference: searchRegex },
      { 'fromEntityId.name': searchRegex },
      { 'toEntityId.name': searchRegex },
      { 'relatedApplication.applicationId': searchRegex },
      { 'relatedInvestment.investmentId': searchRegex },
    ],
  };
};

/**
 * Validate date range for queries
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  const errors = [];

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }

  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }

  if (start > end) {
    errors.push('Start date cannot be after end date');
  }

  // Check if date range is too large (e.g., more than 1 year)
  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDiff > 365) {
    errors.push('Date range cannot exceed 365 days');
  }

  return {
    isValid: errors.length === 0,
    errors,
    startDate: start,
    endDate: end,
  };
};

export default {
  formatAmount,
  formatDate,
  formatTransactionStatus,
  formatTransactionType,
  formatPaymentMethod,
  formatProcessingDuration,
  transformTransactionData,
  transformTransactionList,
  buildFilterSummary,
  calculatePercentageChange,
  generateReportSummary,
  validateExportParameters,
  generateExportFilename,
  generateCacheKey,
  parseSortOptions,
  buildSearchQuery,
  validateDateRange,
};
