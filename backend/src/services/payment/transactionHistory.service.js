import PaymentTransaction from '../../models/payment/paymentTransaction.model.js';
import Transaction from '../../models/metrics/transaction.model.js';
import { buildPagination, buildCursorPagination, applyPaginationToQuery, applyCursorPagination, processCursorResults } from '../../utils/metrics/pagination.util.js';
import { parseDateRange } from '../../utils/metrics/dateRange.util.js';
import { paymentLogger } from '../../utils/payment/paymentLogger.util.js';

/**
 * Transaction History Service
 * Provides comprehensive transaction history with advanced filtering, pagination, and analytics
 */
class TransactionHistoryService {
  /**
   * Get comprehensive transaction history with advanced filtering
   * @param {Object} filters - Filter options
   * @param {Object} paginationOptions - Pagination options
   * @param {Object} sortOptions - Sort options
   * @returns {Promise<Object>} Transaction history with metadata
   */
  async getTransactionHistory(filters = {}, paginationOptions = {}, sortOptions = {}) {
    try {
      paymentLogger.info('Fetching transaction history', { filters, paginationOptions, sortOptions });
      
      // Build query based on filters
      const query = this.buildTransactionQuery(filters);
      
      // Set default sort options
      const defaultSort = { createdAt: -1 };
      const sort = { ...defaultSort, ...sortOptions };
      
      // Handle pagination
      const { type = 'offset', ...paginationParams } = paginationOptions;
      
      let result;
      if (type === 'cursor') {
        result = await this.getCursorBasedTransactions(query, paginationParams, sort);
      } else {
        result = await this.getOffsetBasedTransactions(query, paginationParams, sort);
      }
      
      // Add summary statistics
      const summary = await this.getTransactionSummary(filters);
      
      paymentLogger.info('Transaction history fetched successfully', { 
        count: result.data.length, 
        total: result.pagination?.total || result.total,
        hasMore: result.hasMore 
      });
      
      return {
        ...result,
        summary
      };
    } catch (error) {
      paymentLogger.error('Error fetching transaction history', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a specific user
   * @param {string} userId - User ID
   * @param {Object} filters - Additional filters
   * @param {Object} paginationOptions - Pagination options
   * @returns {Promise<Object>} User transaction history
   */
  async getUserTransactionHistory(userId, filters = {}, paginationOptions = {}) {
    try {
      paymentLogger.info('Fetching user transaction history', { userId, filters });
      
      // Add user filter to existing filters
      const userFilters = {
        ...filters,
        userEntity: userId
      };
      
      return this.getTransactionHistory(userFilters, paginationOptions);
    } catch (error) {
      paymentLogger.error('Error fetching user transaction history', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a specific investor
   * @param {string} investorId - Investor ID
   * @param {Object} filters - Additional filters
   * @param {Object} paginationOptions - Pagination options
   * @returns {Promise<Object>} Investor transaction history
   */
  async getInvestorTransactionHistory(investorId, filters = {}, paginationOptions = {}) {
    try {
      paymentLogger.info('Fetching investor transaction history', { investorId, filters });
      
      // Add investor filter to existing filters
      const investorFilters = {
        ...filters,
        investorEntity: investorId
      };
      
      return this.getTransactionHistory(investorFilters, paginationOptions);
    } catch (error) {
      paymentLogger.error('Error fetching investor transaction history', error);
      throw error;
    }
  }

  /**
   * Get chronological timeline of transactions
   * @param {Object} filters - Filter options
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Transaction timeline
   */
  async getTransactionTimeline(filters = {}, options = {}) {
    try {
      paymentLogger.info('Fetching transaction timeline', { filters, options });
      
      const { 
        granularity = 'day', 
        startDate, 
        endDate,
        includeMetrics = true 
      } = options;
      
      // Build query
      const query = this.buildTransactionQuery(filters);
      
      // Add date range if provided
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
      
      // Build aggregation pipeline based on granularity
      const pipeline = this.buildTimelinePipeline(query, granularity);
      
      // Execute aggregation
      const timeline = await PaymentTransaction.aggregate(pipeline);
      
      // Add additional metrics if requested
      let metrics = null;
      if (includeMetrics) {
        metrics = await this.getTransactionTimelineMetrics(filters, options);
      }
      
      paymentLogger.info('Transaction timeline fetched successfully', { 
        dataPoints: timeline.length,
        granularity 
      });
      
      return {
        timeline,
        metrics,
        granularity
      };
    } catch (error) {
      paymentLogger.error('Error fetching transaction timeline', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for transaction history
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Transaction summary statistics
   */
  async getTransactionSummary(filters = {}) {
    try {
      paymentLogger.info('Fetching transaction summary', { filters });
      
      const query = this.buildTransactionQuery(filters);
      
      // Execute summary aggregation
      const [summary] = await PaymentTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$totalFees' },
            successfulTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            pendingTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processingTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            },
            averageAmount: { $avg: '$amount' },
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' },
            averageProcessingTime: { $avg: '$processingDuration' }
          }
        },
        {
          $addFields: {
            successRate: {
              $multiply: [
                { $divide: ['$successfulTransactions', '$totalTransactions'] },
                100
              ]
            },
            failureRate: {
              $multiply: [
                { $divide: ['$failedTransactions', '$totalTransactions'] },
                100
              ]
            }
          }
        }
      ]);
      
      // Get breakdown by various dimensions
      const [typeBreakdown, methodBreakdown, statusBreakdown] = await Promise.all([
        this.getTransactionBreakdown(filters, 'type'),
        this.getTransactionBreakdown(filters, 'paymentMethod'),
        this.getTransactionBreakdown(filters, 'status')
      ]);
      
      const result = {
        totalTransactions: 0,
        totalAmount: 0,
        totalFees: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        processingTransactions: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        averageProcessingTime: 0,
        successRate: 0,
        failureRate: 0,
        ...summary,
        breakdowns: {
          type: typeBreakdown,
          paymentMethod: methodBreakdown,
          status: statusBreakdown
        }
      };
      
      paymentLogger.info('Transaction summary fetched successfully', result);
      
      return result;
    } catch (error) {
      paymentLogger.error('Error fetching transaction summary', error);
      throw error;
    }
  }

  /**
   * Export transaction history to different formats
   * @param {Object} filters - Filter options
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export data
   */
  async exportTransactionHistory(filters = {}, options = {}) {
    try {
      paymentLogger.info('Exporting transaction history', { filters, options });
      
      const { 
        format = 'csv', 
        fields = null,
        limit = 10000,
        includeHeaders = true
      } = options;
      
      // Build query
      const query = this.buildTransactionQuery(filters);
      
      // Get transactions for export
      const transactions = await PaymentTransaction.find(query)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      
      // Transform data based on format
      let exportData;
      switch (format.toLowerCase()) {
        case 'csv':
          exportData = await this.formatForCSV(transactions, fields, includeHeaders);
          break;
        case 'excel':
          exportData = await this.formatForExcel(transactions, fields, includeHeaders);
          break;
        case 'json':
          exportData = this.formatForJSON(transactions, fields);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      paymentLogger.info('Transaction history exported successfully', { 
        format,
        recordCount: transactions.length 
      });
      
      return {
        data: exportData,
        format,
        filename: `transaction_history_${new Date().toISOString().split('T')[0]}.${format}`,
        recordCount: transactions.length,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      paymentLogger.error('Error exporting transaction history', error);
      throw error;
    }
  }

  /**
   * Build transaction query from filters
   * @param {Object} filters - Filter options
   * @returns {Object} MongoDB query object
   */
  buildTransactionQuery(filters) {
    const query = {};
    
    // Date range filtering
    if (filters.startDate || filters.endDate || filters.dateRange) {
      const { startDate, endDate } = parseDateRange(filters);
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }
    
    // Status filtering
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      query.status = { $in: statuses };
    }
    
    // Transaction type filtering
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      query.type = { $in: types };
    }
    
    // Payment method filtering
    if (filters.paymentMethod) {
      const methods = Array.isArray(filters.paymentMethod) ? filters.paymentMethod : [filters.paymentMethod];
      query.paymentMethod = { $in: methods };
    }
    
    // Amount range filtering
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) query.amount.$gte = parseFloat(filters.minAmount);
      if (filters.maxAmount !== undefined) query.amount.$lte = parseFloat(filters.maxAmount);
    }
    
    // Entity filtering
    if (filters.userEntity) {
      query.$or = [
        { fromEntityId: filters.userEntity, fromEntity: 'user' },
        { toEntityId: filters.userEntity, toEntity: 'user' }
      ];
    }
    
    if (filters.investorEntity) {
      const investorFilter = {
        $or: [
          { fromEntityId: filters.investorEntity, fromEntity: 'investor' },
          { toEntityId: filters.investorEntity, toEntity: 'investor' }
        ]
      };
      
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: investorFilter.$or }
        ];
        delete query.$or;
      } else {
        query.$or = investorFilter.$or;
      }
    }
    
    // Search functionality
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { transactionId: searchRegex },
        { paymentReference: searchRegex },
        { paystackReference: searchRegex }
      ];
      
      if (query.$or && query.$or.length > 1) {
        query.$and = [
          { $or: query.$or.slice(0, -3) },
          { $or: query.$or.slice(-3) }
        ];
      }
    }
    
    // Additional specific filters
    if (filters.kycVerified !== undefined) {
      query.kycVerified = filters.kycVerified === 'true';
    }
    
    if (filters.amlScreeningPassed !== undefined) {
      query.amlScreeningPassed = filters.amlScreeningPassed === 'true';
    }
    
    if (filters.fraudFlag !== undefined) {
      query.fraudFlag = filters.fraudFlag === 'true';
    }
    
    return query;
  }

  /**
   * Get offset-based paginated transactions
   * @param {Object} query - MongoDB query
   * @param {Object} paginationOptions - Pagination options
   * @param {Object} sort - Sort options
   * @returns {Promise<Object>} Paginated transactions
   */
  async getOffsetBasedTransactions(query, paginationOptions, sort) {
    const { page = 1, limit = 20 } = paginationOptions;
    const pagination = buildPagination(page, limit);
    
    // Get total count
    const total = await PaymentTransaction.countDocuments(query);
    
    // Get transactions
    const transactions = await PaymentTransaction.find(query)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .populate('relatedInvestment', 'investmentId');
    
    return {
      data: transactions,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: pagination.page < Math.ceil(total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    };
  }

  /**
   * Get cursor-based paginated transactions
   * @param {Object} query - MongoDB query
   * @param {Object} paginationOptions - Pagination options
   * @param {Object} sort - Sort options
   * @returns {Promise<Object>} Cursor-paginated transactions
   */
  async getCursorBasedTransactions(query, paginationOptions, sort) {
    const { cursor, limit = 20 } = paginationOptions;
    const cursorPagination = buildCursorPagination(cursor, limit);
    
    // Build query with cursor
    let cursorQuery = { ...query };
    if (cursorPagination.cursor) {
      cursorQuery._id = { $gt: cursorPagination.cursor };
    }
    
    // Get transactions with +1 to check for more
    const transactions = await PaymentTransaction.find(cursorQuery)
      .sort(sort)
      .limit(cursorPagination.limit + 1)
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .populate('relatedInvestment', 'investmentId');
    
    // Process results
    const { data, hasMore, nextCursor } = processCursorResults(transactions, limit);
    
    return {
      data,
      cursor: {
        current: cursor,
        next: nextCursor,
        hasMore
      }
    };
  }

  /**
   * Build timeline aggregation pipeline
   * @param {Object} query - Base query
   * @param {string} granularity - Time granularity (hour, day, week, month)
   * @returns {Array} Aggregation pipeline
   */
  buildTimelinePipeline(query, granularity) {
    const dateFormats = {
      hour: { format: '%Y-%m-%d %H:00:00', groupId: { $dateToString: { format: '%Y-%m-%d %H', date: '$createdAt' } } },
      day: { format: '%Y-%m-%d', groupId: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
      week: { format: '%Y-%U', groupId: { $dateToString: { format: '%Y-%U', date: '$createdAt' } } },
      month: { format: '%Y-%m', groupId: { $dateToString: { format: '%Y-%m', date: '$createdAt' } } }
    };
    
    const dateFormat = dateFormats[granularity] || dateFormats.day;
    
    return [
      { $match: query },
      {
        $group: {
          _id: dateFormat.groupId,
          timestamp: { $first: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$totalFees' },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          averageAmount: { $avg: '$amount' },
          uniqueUsers: { $addToSet: '$fromEntityId' },
          uniqueInvestors: { $addToSet: '$toEntityId' }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$successfulTransactions', '$count'] },
              100
            ]
          },
          uniqueUserCount: { $size: '$uniqueUsers' },
          uniqueInvestorCount: { $size: '$uniqueInvestors' }
        }
      },
      {
        $project: {
          uniqueUsers: 0,
          uniqueInvestors: 0
        }
      },
      { $sort: { _id: 1 } }
    ];
  }

  /**
   * Get transaction breakdown by field
   * @param {Object} filters - Filter options
   * @param {string} field - Field to breakdown by
   * @returns {Promise<Array>} Breakdown data
   */
  async getTransactionBreakdown(filters, field) {
    const query = this.buildTransactionQuery(filters);
    
    const breakdown = await PaymentTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$totalFees' },
          successfulTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ['$successfulTransactions', '$count'] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    return breakdown.map(item => ({
      [field]: item._id,
      count: item.count,
      totalAmount: item.totalAmount,
      totalFees: item.totalFees,
      successRate: Math.round(item.successRate * 10) / 10
    }));
  }

  /**
   * Get timeline metrics
   * @param {Object} filters - Filter options
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Timeline metrics
   */
  async getTransactionTimelineMetrics(filters, options) {
    const query = this.buildTransactionQuery(filters);
    
    // Get peak transaction times
    const peakHours = await PaymentTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get peak transaction days
    const peakDays = await PaymentTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);
    
    // Get growth metrics
    const growthMetrics = await this.calculateGrowthMetrics(query);
    
    return {
      peakHours,
      peakDays,
      growth: growthMetrics
    };
  }

  /**
   * Calculate growth metrics
   * @param {Object} query - Base query
   * @returns {Promise<Object>} Growth metrics
   */
  async calculateGrowthMetrics(query) {
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const [currentMetrics, previousMetrics] = await Promise.all([
      PaymentTransaction.aggregate([
        { $match: { ...query, createdAt: { $gte: currentPeriodStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ]),
      PaymentTransaction.aggregate([
        { $match: { ...query, createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: '$amount' }
          }
        }
      ])
    ]);
    
    const current = currentMetrics[0] || { count: 0, amount: 0 };
    const previous = previousMetrics[0] || { count: 0, amount: 0 };
    
    return {
      count: {
        current: current.count,
        previous: previous.count,
        growth: previous.count > 0 ? ((current.count - previous.count) / previous.count) * 100 : 0
      },
      amount: {
        current: current.amount,
        previous: previous.amount,
        growth: previous.amount > 0 ? ((current.amount - previous.amount) / previous.amount) * 100 : 0
      }
    };
  }

  /**
   * Format transactions for CSV export
   * @param {Array} transactions - Transaction data
   * @param {Array} fields - Fields to include
   * @param {boolean} includeHeaders - Include headers
   * @returns {Promise<string>} CSV data
   */
  async formatForCSV(transactions, fields = null, includeHeaders = true) {
    const csvWriter = await import('csv-writer');
    const createCsvWriter = csvWriter.createObjectCsvWriter;
    
    const defaultFields = [
      { id: 'transactionId', title: 'Transaction ID' },
      { id: 'type', title: 'Type' },
      { id: 'status', title: 'Status' },
      { id: 'amount', title: 'Amount' },
      { id: 'currency', title: 'Currency' },
      { id: 'paymentMethod', title: 'Payment Method' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'completedAt', title: 'Completed At' }
    ];
    
    const selectedFields = fields || defaultFields;
    
    // Transform data
    const transformedData = transactions.map(txn => {
      const item = {};
      selectedFields.forEach(field => {
        let value = txn[field.id || field];
        if (value instanceof Date) {
          value = value.toISOString();
        }
        item[field.id || field] = value;
      });
      return item;
    });
    
    // Create CSV content
    let csvContent = '';
    
    if (includeHeaders) {
      const headers = selectedFields.map(field => field.title || field.id || field).join(',');
      csvContent += headers + '\n';
    }
    
    transformedData.forEach(item => {
      const row = selectedFields.map(field => {
        const value = item[field.id || field] || '';
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(',');
      csvContent += row + '\n';
    });
    
    return csvContent;
  }

  /**
   * Format transactions for Excel export
   * @param {Array} transactions - Transaction data
   * @param {Array} fields - Fields to include
   * @param {boolean} includeHeaders - Include headers
   * @returns {Promise<Buffer>} Excel data
   */
  async formatForExcel(transactions, fields = null, includeHeaders = true) {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transaction History');
    
    const defaultFields = [
      { id: 'transactionId', title: 'Transaction ID' },
      { id: 'type', title: 'Type' },
      { id: 'status', title: 'Status' },
      { id: 'amount', title: 'Amount' },
      { id: 'currency', title: 'Currency' },
      { id: 'paymentMethod', title: 'Payment Method' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'completedAt', title: 'Completed At' }
    ];
    
    const selectedFields = fields || defaultFields;
    
    // Add headers
    if (includeHeaders) {
      const headerRow = selectedFields.map(field => field.title || field.id || field);
      worksheet.addRow(headerRow);
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }
    
    // Add data
    transactions.forEach(txn => {
      const row = selectedFields.map(field => {
        let value = txn[field.id || field];
        if (value instanceof Date) {
          value = value.toISOString();
        }
        return value;
      });
      worksheet.addRow(row);
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    // Generate buffer
    return workbook.xlsx.writeBuffer();
  }

  /**
   * Format transactions for JSON export
   * @param {Array} transactions - Transaction data
   * @param {Array} fields - Fields to include
   * @returns {string} JSON data
   */
  formatForJSON(transactions, fields = null) {
    if (!fields) {
      return JSON.stringify(transactions, null, 2);
    }
    
    const filteredData = transactions.map(txn => {
      const item = {};
      fields.forEach(field => {
        item[field] = txn[field];
      });
      return item;
    });
    
    return JSON.stringify(filteredData, null, 2);
  }
}

export default new TransactionHistoryService();