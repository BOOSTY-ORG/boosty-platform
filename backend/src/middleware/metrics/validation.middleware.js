// Validation middleware for metrics endpoints

export const validateDateRange = (req, res, next) => {
  const { startDate, endDate, dateRange } = req.query;
  
  try {
    // Validate custom date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE_FORMAT",
            message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
          }
        });
      }
      
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "Start date cannot be after end date"
          }
        });
      }
      
      const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DATE_RANGE_TOO_LARGE",
            message: "Date range cannot exceed 365 days"
          }
        });
      }
    }
    
    // Validate preset date range
    if (dateRange) {
      const validRanges = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_year', 'last_year'];
      if (!validRanges.includes(dateRange)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_DATE_RANGE_PRESET",
            message: "Invalid date range preset. Valid options: " + validRanges.join(', ')
          }
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    });
  }
};

export const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAGE",
          message: "Page must be a positive integer"
        }
      });
    }
  }
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_LIMIT",
          message: "Limit must be between 1 and 100"
        }
      });
    }
  }
  
  next();
};

export const validateSorting = (req, res, next) => {
  const { sortBy, sortOrder } = req.query;
  
  if (sortBy !== undefined) {
    const validSortFields = [
      'createdAt', 'updatedAt', 'amount', 'status', 'name', 'email',
      'applicationStatus', 'kycStatus', 'totalInvested', 'roi', 'submittedAt',
      'completedAt', 'processedAt', 'reviewedAt'
    ];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SORT_FIELD",
          message: "Invalid sort field. Valid options: " + validSortFields.join(', ')
        }
      });
    }
  }
  
  if (sortOrder !== undefined) {
    if (!['asc', 'desc'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_SORT_ORDER",
          message: "Sort order must be 'asc' or 'desc'"
        }
      });
    }
  }
  
  next();
};

export const validateStatusFilter = (req, res, next) => {
  const { status } = req.query;
  
  if (status !== undefined) {
    const validStatuses = [
      'active', 'inactive', 'pending', 'completed', 'failed', 'cancelled',
      'draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded',
      'installation_scheduled', 'installed', 'verified', 'not_started', 'under_review',
      'processing', 'defaulted', 'terminated'
    ];
    
    const statusArray = Array.isArray(status) ? status : [status];
    const invalidStatuses = statusArray.filter(s => !validStatuses.includes(s));
    
    if (invalidStatuses.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: "Invalid status values: " + invalidStatuses.join(', ')
        }
      });
    }
  }
  
  next();
};

export const validateInvestorFilters = (req, res, next) => {
  const { investorType, riskProfile } = req.query;
  
  if (investorType !== undefined) {
    const validTypes = ['individual', 'institutional', 'corporate'];
    const typeArray = Array.isArray(investorType) ? investorType : [investorType];
    const invalidTypes = typeArray.filter(t => !validTypes.includes(t));
    
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INVESTOR_TYPE",
          message: "Invalid investor types: " + invalidTypes.join(', ')
        }
      });
    }
  }
  
  if (riskProfile !== undefined) {
    const validProfiles = ['conservative', 'moderate', 'aggressive'];
    const profileArray = Array.isArray(riskProfile) ? riskProfile : [riskProfile];
    const invalidProfiles = profileArray.filter(p => !validProfiles.includes(p));
    
    if (invalidProfiles.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_RISK_PROFILE",
          message: "Invalid risk profiles: " + invalidProfiles.join(', ')
        }
      });
    }
  }
  
  next();
};

export const validateTransactionFilters = (req, res, next) => {
  const { transactionType, paymentMethod, currency, minAmount, maxAmount } = req.query;
  
  if (transactionType !== undefined) {
    const validTypes = ['investment', 'repayment', 'fee', 'refund', 'penalty'];
    const typeArray = Array.isArray(transactionType) ? transactionType : [transactionType];
    const invalidTypes = typeArray.filter(t => !validTypes.includes(t));
    
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRANSACTION_TYPE",
          message: "Invalid transaction types: " + invalidTypes.join(', ')
        }
      });
    }
  }
  
  if (paymentMethod !== undefined) {
    const validMethods = ['bank_transfer', 'card', 'wallet', 'auto_debit'];
    const methodArray = Array.isArray(paymentMethod) ? paymentMethod : [paymentMethod];
    const invalidMethods = methodArray.filter(m => !validMethods.includes(m));
    
    if (invalidMethods.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYMENT_METHOD",
          message: "Invalid payment methods: " + invalidMethods.join(', ')
        }
      });
    }
  }
  
  if (minAmount !== undefined) {
    const amount = parseFloat(minAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_MIN_AMOUNT",
          message: "Minimum amount must be a positive number"
        }
      });
    }
  }
  
  if (maxAmount !== undefined) {
    const amount = parseFloat(maxAmount);
    if (isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_MAX_AMOUNT",
          message: "Maximum amount must be a positive number"
        }
      });
    }
  }
  
  next();
};

export const validateReportParameters = (req, res, next) => {
  const { format, includeSections } = req.query;
  
  if (format !== undefined) {
    const validFormats = ['json', 'pdf', 'excel'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPORT_FORMAT",
          message: "Invalid format. Valid options: " + validFormats.join(', ')
        }
      });
    }
  }
  
  if (includeSections !== undefined) {
    const validSections = ['overview', 'investors', 'users', 'transactions', 'kyc'];
    const sectionsArray = Array.isArray(includeSections) ? includeSections : [includeSections];
    const invalidSections = sectionsArray.filter(s => !validSections.includes(s));
    
    if (invalidSections.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REPORT_SECTIONS",
          message: "Invalid sections: " + invalidSections.join(', ')
        }
      });
    }
  }
  
  next();
};