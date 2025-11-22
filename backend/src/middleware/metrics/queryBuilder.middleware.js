// Query builder middleware for consistent query handling across metrics endpoints

const buildQuery = (req, res, next) => {
  req.queryBuilder = {
    filters: {},
    options: {},
    sort: {},
    pagination: {}
  };

  // Build date range filter
  if (req.query.startDate || req.query.endDate || req.query.dateRange) {
    const dateRange = parseDateRange(req.query);
    req.queryBuilder.filters.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate
    };
    req.queryBuilder.dateRange = dateRange;
  }

  // Build status filter
  if (req.query.status) {
    const statuses = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
    req.queryBuilder.filters.status = { $in: statuses };
  }

  // Build region filter
  if (req.query.region) {
    req.queryBuilder.filters['personalInfo.state'] = req.query.region;
  }

  // Build investor type filter
  if (req.query.investorType) {
    const types = Array.isArray(req.query.investorType) ? req.query.investorType : [req.query.investorType];
    req.queryBuilder.filters.investorType = { $in: types };
  }

  // Build risk profile filter
  if (req.query.riskProfile) {
    const profiles = Array.isArray(req.query.riskProfile) ? req.query.riskProfile : [req.query.riskProfile];
    req.queryBuilder.filters.riskProfile = { $in: profiles };
  }

  // Build transaction type filter
  if (req.query.transactionType) {
    const types = Array.isArray(req.query.transactionType) ? req.query.transactionType : [req.query.transactionType];
    req.queryBuilder.filters.type = { $in: types };
  }

  // Build payment method filter
  if (req.query.paymentMethod) {
    const methods = Array.isArray(req.query.paymentMethod) ? req.query.paymentMethod : [req.query.paymentMethod];
    req.queryBuilder.filters.paymentMethod = { $in: methods };
  }

  // Build amount range filter
  if (req.query.minAmount || req.query.maxAmount) {
    req.queryBuilder.filters.amount = {};
    if (req.query.minAmount) {
      req.queryBuilder.filters.amount.$gte = parseFloat(req.query.minAmount);
    }
    if (req.query.maxAmount) {
      req.queryBuilder.filters.amount.$lte = parseFloat(req.query.maxAmount);
    }
  }

  // Build property type filter
  if (req.query.propertyType) {
    const types = Array.isArray(req.query.propertyType) ? req.query.propertyType : [req.query.propertyType];
    req.queryBuilder.filters['propertyDetails.propertyType'] = { $in: types };
  }

  // Build KYC status filter
  if (req.query.kycStatus) {
    const statuses = Array.isArray(req.query.kycStatus) ? req.query.kycStatus : [req.query.kycStatus];
    req.queryBuilder.filters.kycStatus = { $in: statuses };
  }

  // Build document type filter
  if (req.query.documentType) {
    const types = Array.isArray(req.query.documentType) ? req.query.documentType : [req.query.documentType];
    req.queryBuilder.filters.documentType = { $in: types };
  }

  // Build verification status filter
  if (req.query.verificationStatus) {
    const statuses = Array.isArray(req.query.verificationStatus) ? req.query.verificationStatus : [req.query.verificationStatus];
    req.queryBuilder.filters.verificationStatus = { $in: statuses };
  }

  // Build sort options - handle both frontend format (field:direction) and backend format
  if (req.query.sort) {
    // Handle frontend format: sort=field:direction,field2:direction2
    const sortParams = Array.isArray(req.query.sort) ? req.query.sort : [req.query.sort];
    sortParams.forEach(sortParam => {
      if (typeof sortParam === 'string') {
        const [field, direction] = sortParam.split(':');
        if (field) {
          req.queryBuilder.sort[field] = direction === 'asc' ? 1 : -1;
        }
      }
    });
  } else {
    // Fallback to backend format
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    req.queryBuilder.sort[sortBy] = sortOrder;
  }

  // Build pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  
  req.queryBuilder.pagination = { page, limit, skip };
  req.queryBuilder.options.limit = limit;
  req.queryBuilder.options.skip = skip;

  // Build field selection
  if (req.query.fields) {
    const fields = Array.isArray(req.query.fields) ? req.query.fields.join(' ') : req.query.fields;
    req.queryBuilder.options.select = fields;
  }

  // Build search filter
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    req.queryBuilder.filters.$or = buildSearchFields(searchRegex, req.path);
  }

  // Build group by for aggregations
  if (req.query.groupBy) {
    req.queryBuilder.groupBy = req.query.groupBy;
  }

  // Build aggregation functions
  if (req.query.aggregate) {
    const aggregates = Array.isArray(req.query.aggregate) ? req.query.aggregate : [req.query.aggregate];
    req.queryBuilder.aggregate = aggregates;
  }

  next();
};

// Helper function to get query builder object for use in controllers
const getQueryBuilder = (req) => {
  return req.queryBuilder || {
    filters: {},
    options: {},
    sort: {},
    pagination: {}
  };
};

// Parse date range from query parameters
const parseDateRange = (query) => {
  const { startDate, endDate, dateRange } = query;
  const now = new Date();
  
  if (dateRange) {
    const ranges = {
      today: {
        startDate: new Date(now.setHours(0, 0, 0, 0)),
        endDate: new Date(now.setHours(23, 59, 59, 999))
      },
      yesterday: {
        startDate: new Date(now.setDate(now.getDate() - 1)),
        endDate: new Date(now.setHours(23, 59, 59, 999))
      },
      last_7_days: {
        startDate: new Date(now.setDate(now.getDate() - 7)),
        endDate: new Date()
      },
      last_30_days: {
        startDate: new Date(now.setDate(now.getDate() - 30)),
        endDate: new Date()
      },
      this_month: {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date()
      },
      last_month: {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0)
      },
      this_year: {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date()
      },
      last_year: {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31)
      }
    };
    
    return ranges[dateRange] || ranges.last_30_days;
  }
  
  if (startDate && endDate) {
    return {
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    };
  }
  
  // Default to last 30 days
  return {
    startDate: new Date(now.setDate(now.getDate() - 30)),
    endDate: new Date()
  };
};

// Build search fields based on endpoint path
const buildSearchFields = (searchRegex, path) => {
  const searchFields = {
    '/investors': [
      { 'userId.name': searchRegex },
      { 'userId.email': searchRegex },
      { investorType: searchRegex },
      { riskProfile: searchRegex }
    ],
    '/users': [
      { name: searchRegex },
      { email: searchRegex },
      { 'profile.occupation': searchRegex }
    ],
    '/applications': [
      { 'personalInfo.fullName': searchRegex },
      { 'personalInfo.phone': searchRegex },
      { applicationId: searchRegex },
      { 'personalInfo.address': searchRegex }
    ],
    '/transactions': [
      { transactionId: searchRegex },
      { paymentReference: searchRegex },
      { type: searchRegex },
      { status: searchRegex }
    ],
    '/kyc': [
      { documentNumber: searchRegex },
      { documentType: searchRegex },
      { 'aiAnalysis.extractedData.name': searchRegex }
    ]
  };

  // Find matching search fields for the current path
  for (const [key, fields] of Object.entries(searchFields)) {
    if (path.includes(key)) {
      return fields;
    }
  }

  // Default search fields
  return [
    { name: searchRegex },
    { email: searchRegex },
    { status: searchRegex }
  ];
};

// Apply query builder to Mongoose query
const applyQueryBuilder = (model, queryBuilder) => {
  let query = model.find(queryBuilder.filters);

  // Apply sort
  if (Object.keys(queryBuilder.sort).length > 0) {
    query = query.sort(queryBuilder.sort);
  }

  // Apply pagination
  if (queryBuilder.options.skip !== undefined) {
    query = query.skip(queryBuilder.options.skip);
  }
  
  if (queryBuilder.options.limit !== undefined) {
    query = query.limit(queryBuilder.options.limit);
  }

  // Apply field selection
  if (queryBuilder.options.select) {
    query = query.select(queryBuilder.options.select);
  }

  return query;
};

// Build aggregation pipeline from query builder
const buildAggregationPipeline = (queryBuilder) => {
  const pipeline = [];

  // Match stage
  if (Object.keys(queryBuilder.filters).length > 0) {
    pipeline.push({ $match: queryBuilder.filters });
  }

  // Group stage
  if (queryBuilder.groupBy) {
    const groupStage = buildGroupStage(queryBuilder.groupBy, queryBuilder.aggregate);
    pipeline.push(groupStage);
  }

  // Sort stage
  if (Object.keys(queryBuilder.sort).length > 0) {
    pipeline.push({ $sort: queryBuilder.sort });
  }

  // Pagination stage
  if (queryBuilder.pagination.skip !== undefined) {
    pipeline.push({ $skip: queryBuilder.pagination.skip });
  }
  
  if (queryBuilder.pagination.limit !== undefined) {
    pipeline.push({ $limit: queryBuilder.pagination.limit });
  }

  return pipeline;
};

// Build group stage for aggregations
const buildGroupStage = (groupBy, aggregates) => {
  const groupStage = { _id: `$${groupBy}` };

  if (aggregates && aggregates.length > 0) {
    aggregates.forEach(aggregate => {
      switch (aggregate) {
        case 'count':
          groupStage.count = { $sum: 1 };
          break;
        case 'sum':
          groupStage.total = { $sum: '$amount' };
          break;
        case 'avg':
          groupStage.average = { $avg: '$amount' };
          break;
        case 'min':
          groupStage.minimum = { $min: '$amount' };
          break;
        case 'max':
          groupStage.maximum = { $max: '$amount' };
          break;
        default:
          break;
      }
    });
  }

  return { $group: groupStage };
};

module.exports = {
  buildQuery,
  getQueryBuilder,
  parseDateRange,
  buildSearchFields,
  applyQueryBuilder,
  buildAggregationPipeline,
  buildGroupStage
};