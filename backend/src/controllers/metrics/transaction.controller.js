import Transaction from '../../models/metrics/transaction.model.js';
import PaymentTransaction from '../../models/payment/paymentTransaction.model.js';
import Investor from '../../models/metrics/investor.model.js';
import User from '../../models/user.model.js';
import {
  formatSuccessResponse,
  formatErrorResponse,
  handleControllerError,
} from '../../utils/metrics/responseFormatter.util.js';
import { parseDateRange } from '../../utils/metrics/dateRange.util.js';
import { buildQuery } from '../../middleware/metrics/queryBuilder.middleware.js';
import { buildPaginationMeta } from '../../utils/metrics/pagination.util.js';
import transactionHistoryService from '../../services/payment/transactionHistory.service.js';
import {
  transformTransactionList,
  buildFilterSummary,
  parseSortOptions,
  validateExportParameters,
  generateExportFilename,
} from '../../utils/payment/transactionHistory.util.js';
import {
  getRecommendedFields,
  applyFieldSelection,
  buildLeanQuery,
  optimizeForCount,
} from '../../utils/metrics/fieldSelection.util.js';
import {
  cacheTransactionAnalytics,
  cacheQueryResult,
  invalidateTransactionCache,
} from '../../utils/metrics/cache.util.js';

export const getTransactionMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const cacheKey = `metrics:${startDate.toISOString()}:${endDate.toISOString()}:${JSON.stringify(req.query)}`;

    // Use cache-aside pattern for transaction metrics
    return await cacheTransactionAnalytics(
      'metrics',
      async () => {
        const query = buildQuery(req, { startDate, endDate });
        const previousPeriodStart = new Date(
          startDate.getTime() - (endDate - startDate)
        );
        const previousPeriodEnd = new Date(startDate.getTime() - 1);

        // Optimized aggregation pipeline to get all metrics in fewer database calls
        const [currentPeriodMetrics, previousPeriodMetrics] = await Promise.all(
          [
            // Current period metrics aggregation with field selection
            Transaction.aggregate([
              { $match: query },
              {
                $facet: {
                  totalTransactions: [{ $count: 'count' }],
                  completedTransactions: [
                    { $match: { status: 'completed' } },
                    { $count: 'count' },
                  ],
                  pendingTransactions: [
                    { $match: { status: 'pending' } },
                    { $count: 'count' },
                  ],
                  failedTransactions: [
                    { $match: { status: 'failed' } },
                    { $count: 'count' },
                  ],
                  transactionVolume: [
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                    { $project: { _id: 0, total: 1 } },
                  ],
                  transactionFees: [
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$totalFees' } } },
                    { $project: { _id: 0, total: 1 } },
                  ],
                  transactionTypeBreakdown: [
                    {
                      $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        volume: { $sum: '$amount' },
                      },
                    },
                  ],
                  paymentMethodBreakdown: [
                    {
                      $group: {
                        _id: '$paymentMethod',
                        count: { $sum: 1 },
                        volume: { $sum: '$amount' },
                      },
                    },
                  ],
                  statusBreakdown: [
                    {
                      $group: { _id: '$status', count: { $sum: 1 } },
                    },
                  ],
                },
              },
            ]),

            // Previous period metrics for growth calculation
            Transaction.aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: previousPeriodStart,
                    $lte: previousPeriodEnd,
                  },
                },
              },
              {
                $facet: {
                  previousTransactions: [{ $count: 'count' }],
                  previousVolume: [
                    {
                      $match: { status: 'completed' },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                    { $project: { _id: 0, total: 1 } },
                  ],
                },
              },
            ]),
          ]
        );

        // Extract values from aggregation results
        const totalTransactions =
          currentPeriodMetrics[0]?.totalTransactions[0]?.count || 0;
        const completedTransactions =
          currentPeriodMetrics[0]?.completedTransactions[0]?.count || 0;
        const pendingTransactions =
          currentPeriodMetrics[0]?.pendingTransactions[0]?.count || 0;
        const failedTransactions =
          currentPeriodMetrics[0]?.failedTransactions[0]?.count || 0;
        const transactionVolume =
          currentPeriodMetrics[0]?.transactionVolume[0]?.total || 0;
        const transactionFees =
          currentPeriodMetrics[0]?.transactionFees[0]?.total || 0;
        const transactionTypeBreakdown =
          currentPeriodMetrics[0]?.transactionTypeBreakdown || [];
        const paymentMethodBreakdown =
          currentPeriodMetrics[0]?.paymentMethodBreakdown || [];
        const statusBreakdown = currentPeriodMetrics[0]?.statusBreakdown || [];

        const previousTransactions =
          previousPeriodMetrics[0]?.previousTransactions[0]?.count || 0;
        const previousVolume =
          previousPeriodMetrics[0]?.previousVolume[0]?.total || 0;

        const transactionGrowth = calculateGrowth(
          totalTransactions,
          previousTransactions
        );
        const volumeGrowth = calculateGrowth(transactionVolume, previousVolume);

        // Get performance metrics
        const performanceMetrics =
          await getTransactionPerformanceMetrics(query);

        const response = {
          summary: {
            totalTransactions,
            completedTransactions,
            pendingTransactions,
            failedTransactions,
            totalVolume: transactionVolume,
            totalFees: transactionFees,
            averageTransactionValue:
              totalTransactions > 0 ? transactionVolume / totalTransactions : 0,
            completionRate:
              totalTransactions > 0
                ? (completedTransactions / totalTransactions) * 100
                : 0,
          },
          growth: {
            transactionGrowth,
            volumeGrowth,
          },
          breakdowns: {
            transactionType: formatTransactionBreakdown(
              transactionTypeBreakdown
            ),
            paymentMethod: formatTransactionBreakdown(paymentMethodBreakdown),
            status: formatStatusBreakdown(statusBreakdown),
          },
          performance: performanceMetrics,
          trends: await getTransactionTrends(),
        };

        return response;
      },
      {
        params: { startDate, endDate, query: req.query },
        tags: ['transaction', 'metrics', 'summary'],
      }
    ).then((data) => res.json(formatSuccessResponse(data, req)));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTransactionDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .populate('relatedInvestment', 'investmentId');

    if (!transaction) {
      return res.status(404).json(
        formatErrorResponse(
          {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
          },
          req,
          404
        )
      );
    }

    // Get related entities information
    let fromEntityInfo = null;
    let toEntityInfo = null;

    if (transaction.fromEntity === 'investor') {
      fromEntityInfo = await Investor.findById(
        transaction.fromEntityId
      ).populate('userId', 'name email');
    } else if (transaction.fromEntity === 'user') {
      fromEntityInfo = await User.findById(
        transaction.fromEntityId,
        'name email'
      );
    }

    if (transaction.toEntity === 'investor') {
      toEntityInfo = await Investor.findById(transaction.toEntityId).populate(
        'userId',
        'name email'
      );
    } else if (transaction.toEntity === 'user') {
      toEntityInfo = await User.findById(transaction.toEntityId, 'name email');
    }

    const response = {
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId,
        type: transaction.type,
        fromEntity: transaction.fromEntity,
        toEntity: transaction.toEntity,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
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
      },
      relatedEntities: {
        from: fromEntityInfo,
        to: toEntityInfo,
      },
      relatedApplication: transaction.relatedApplication,
      relatedInvestment: transaction.relatedInvestment,
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTransactionList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      skip:
        (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 10),
    };

    const transactions = await Transaction.find(query)
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .sort({ createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);

    const total = await Transaction.countDocuments(query);
    const paginationMeta = buildPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );

    const response = {
      data: transactions.map((txn) => ({
        id: txn._id,
        transactionId: txn.transactionId,
        type: txn.type,
        fromEntity: txn.fromEntity,
        toEntity: txn.toEntity,
        fromEntityName: txn.fromEntityId?.name || 'System',
        toEntityName: txn.toEntityId?.name || 'System',
        amount: txn.amount,
        status: txn.status,
        paymentMethod: txn.paymentMethod,
        createdAt: txn.createdAt,
        completedAt: txn.completedAt,
        relatedApplicationId: txn.relatedApplication?.applicationId,
      })),
      pagination: paginationMeta,
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTransactionPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });

    const performanceMetrics = await getTransactionPerformanceMetrics(query);

    // Get processing time analysis
    const processingTimeAnalysis = await Transaction.aggregate([
      { $match: { ...query, processingDuration: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingDuration' },
          minProcessingTime: { $min: '$processingDuration' },
          maxProcessingTime: { $max: '$processingDuration' },
        },
      },
    ]);

    // Get success rate by payment method
    const successRateByMethod = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            method: '$paymentMethod',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.method',
          total: { $sum: '$count' },
          successful: {
            $sum: {
              $cond: [{ $eq: ['$_id.status', 'completed'] }, '$count', 0],
            },
          },
        },
      },
      {
        $addFields: {
          successRate: {
            $multiply: [{ $divide: ['$successful', '$total'] }, 100],
          },
        },
      },
    ]);

    // Get transaction value distribution
    const valueDistribution = await Transaction.aggregate([
      { $match: { ...query, status: 'completed' } },
      {
        $bucket: {
          groupBy: '$amount',
          boundaries: [0, 1000, 5000, 10000, 25000, 50000, 100000, 500000],
          default: 'other',
          output: {
            count: { $sum: 1 },
            totalVolume: { $sum: '$amount' },
          },
        },
      },
    ]);

    const response = {
      ...performanceMetrics,
      processingTime: {
        average: processingTimeAnalysis[0]?.avgProcessingTime || 0,
        minimum: processingTimeAnalysis[0]?.minProcessingTime || 0,
        maximum: processingTimeAnalysis[0]?.maxProcessingTime || 0,
      },
      successRateByMethod: successRateByMethod.map((item) => ({
        paymentMethod: item._id,
        totalTransactions: item.total,
        successRate: Math.round(item.successRate * 10) / 10,
      })),
      valueDistribution: valueDistribution.map((bucket) => ({
        range:
          bucket._id === 'other'
            ? 'Other'
            : `${formatCurrency(bucket._id - 1)} - ${formatCurrency(bucket._id)}`,
        count: bucket.count,
        totalVolume: bucket.totalVolume,
      })),
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTransactionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const cacheKey = `analytics:${startDate.toISOString()}:${endDate.toISOString()}:${JSON.stringify(req.query)}`;

    // Use cache-aside pattern for transaction analytics
    return await cacheTransactionAnalytics(
      'analytics',
      async () => {
        const query = buildQuery(req, { startDate, endDate });

        // Optimized aggregation pipeline to get all analytics in fewer database calls
        const analyticsData = await Transaction.aggregate([
          { $match: query },
          {
            $facet: {
              transactionFlow: [
                {
                  $group: {
                    _id: {
                      from: '$fromEntity',
                      to: '$toEntity',
                      type: '$type',
                    },
                    count: { $sum: 1 },
                    volume: { $sum: '$amount' },
                  },
                },
                { $sort: { volume: -1 } },
              ],
              hourlyPatterns: [
                {
                  $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 },
                    volume: { $sum: '$amount' },
                  },
                },
                { $sort: { _id: 1 } },
              ],
              dailyPatterns: [
                {
                  $group: {
                    _id: {
                      year: { $year: '$createdAt' },
                      month: { $month: '$createdAt' },
                      day: { $dayOfMonth: '$createdAt' },
                    },
                    count: { $sum: 1 },
                    volume: { $sum: '$amount' },
                  },
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
              ],
              failureAnalysis: [
                { $match: { status: 'failed' } },
                {
                  $group: {
                    _id: {
                      type: '$type',
                      paymentMethod: '$paymentMethod',
                      failureReason: '$failureReason',
                    },
                    count: { $sum: 1 },
                  },
                },
                { $sort: { count: -1 } },
              ],
            },
          },
        ]);

        const response = {
          transactionFlow:
            analyticsData[0]?.transactionFlow?.map((item) => ({
              from: item._id.from,
              to: item._id.to,
              type: item._id.type,
              count: item.count,
              volume: item.volume,
            })) || [],
          hourlyPatterns:
            analyticsData[0]?.hourlyPatterns?.map((item) => ({
              hour: item._id,
              count: item.count,
              volume: item.volume,
            })) || [],
          dailyPatterns:
            analyticsData[0]?.dailyPatterns?.map((item) => ({
              date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
              count: item.count,
              volume: item.volume,
            })) || [],
          failureAnalysis:
            analyticsData[0]?.failureAnalysis?.map((item) => ({
              type: item._id.type,
              paymentMethod: item._id.paymentMethod,
              failureReason: item._id.failureReason,
              count: item.count,
            })) || [],
        };

        return response;
      },
      {
        params: { startDate, endDate, query: req.query },
        tags: ['transaction', 'analytics', 'patterns'],
      }
    ).then((data) => res.json(formatSuccessResponse(data, req)));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions with caching
const getTransactionPerformanceMetrics = async (query) => {
  const cacheKey = `performance:${JSON.stringify(query)}`;

  return await cacheQueryResult(
    cacheKey,
    async () => {
      const [
        totalTransactions,
        completedTransactions,
        failedTransactions,
        avgProcessingTime,
      ] = await Promise.all([
        Transaction.countDocuments(query),
        Transaction.countDocuments({ ...query, status: 'completed' }),
        Transaction.countDocuments({ ...query, status: 'failed' }),
        Transaction.aggregate([
          { $match: { ...query, processingDuration: { $exists: true } } },
          { $group: { _id: null, avgTime: { $avg: '$processingDuration' } } },
        ]),
      ]);

      const successRate =
        totalTransactions > 0
          ? (completedTransactions / totalTransactions) * 100
          : 0;
      const failureRate =
        totalTransactions > 0
          ? (failedTransactions / totalTransactions) * 100
          : 0;

      return {
        totalTransactions,
        completedTransactions,
        failedTransactions,
        successRate: Math.round(successRate * 10) / 10,
        failureRate: Math.round(failureRate * 10) / 10,
        averageProcessingTime: avgProcessingTime[0]?.avgTime || 0,
      };
    },
    {
      tags: ['transaction', 'performance', 'metrics'],
    }
  );
};

const formatTransactionBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = {
      count: item.count,
      volume: item.volume || 0,
    };
    return acc;
  }, {});
};

const formatStatusBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getTransactionTrends = async () => {
  const cacheKey = `trends:30days`;

  return await cacheQueryResult(
    cacheKey,
    async () => {
      // Get daily transaction trends
      const dailyTrends = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]);

      // Get monthly transaction trends by type
      const monthlyTypeTrends = await Transaction.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              type: '$type',
            },
            count: { $sum: 1 },
            volume: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.type': 1 } },
      ]);

      return {
        daily: dailyTrends.map((item) => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count,
          volume: item.volume,
          completed: item.completed,
          successRate: item.count > 0 ? (item.completed / item.count) * 100 : 0,
        })),
        monthlyByType: monthlyTypeTrends.map((item) => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          type: item._id.type,
          count: item.count,
          volume: item.volume,
        })),
      };
    },
    {
      ttl: 60 * 60, // 1 hour cache for trends
      tags: ['transaction', 'trends', 'analytics'],
    }
  );
};

const calculateGrowth = (current, previous) => {
  if (previous === 0)
    return { current, previous, percentage: 0, trend: 'stable' };
  const percentage = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    percentage: Math.round(percentage * 100) / 100,
    trend: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable',
  };
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get comprehensive transaction history with advanced filtering
 */
export const getTransactionHistory = async (req, res) => {
  try {
    // Build filters from query parameters
    const filters = {
      ...req.query,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      search: req.query.search,
      userEntity: req.query.userEntity,
      investorEntity: req.query.investorEntity,
      kycVerified: req.query.kycVerified,
      amlScreeningPassed: req.query.amlScreeningPassed,
      fraudFlag: req.query.fraudFlag,
    };

    // Build pagination options with cursor-based support
    const paginationOptions = {
      type: req.query.paginationType || 'cursor', // Default to cursor-based pagination
      page: parseInt(req.query.page) || 1,
      limit: Math.min(parseInt(req.query.limit) || 20, 100), // Cap at 100 for performance
      cursor: req.query.cursor,
    };

    // Build sort options
    const sortOptions = parseSortOptions(req.query);

    // Apply field selection optimization based on operation type
    const fields = getRecommendedFields('transaction', 'list');
    const optimizedQuery = applyFieldSelection(
      buildQuery(filters, { startDate, endDate }),
      fields
    );

    // Get transaction history with optimized field selection
    const result = await transactionHistoryService.getTransactionHistory(
      filters,
      paginationOptions,
      sortOptions
    );

    // Transform data for response
    const transformedData = transformTransactionList(result.data);

    // Build response with field selection metadata
    const response = {
      data: transformedData,
      pagination: result.pagination || result.cursor,
      summary: result.summary,
      filters: {
        applied: filters,
        summary: buildFilterSummary(filters),
      },
      fieldSelection: {
        applied: fields,
        projection: optimizedQuery.getProjection(),
        stats: {
          fieldCount: fields.length,
          estimatedDataReduction: Math.round((1 - fields.length / 20) * 100), // Assuming 20 total fields max
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get transaction history for a specific user
 */
export const getUserTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!userId) {
      return res.status(400).json(
        formatErrorResponse(
          {
            code: 'INVALID_USER_ID',
            message: 'User ID is required',
          },
          req,
          400
        )
      );
    }

    // Build filters from query parameters
    const filters = {
      ...req.query,
      userEntity: userId,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      search: req.query.search,
    };

    // Build pagination options
    const paginationOptions = {
      type: req.query.paginationType || 'offset',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      cursor: req.query.cursor,
    };

    // Build sort options
    const sortOptions = parseSortOptions(req.query);

    // Get user transaction history
    const result = await transactionHistoryService.getUserTransactionHistory(
      userId,
      filters,
      paginationOptions,
      sortOptions
    );

    // Transform data for response
    const transformedData = transformTransactionList(result.data);

    // Build response
    const response = {
      userId,
      data: transformedData,
      pagination: result.pagination || result.cursor,
      summary: result.summary,
      filters: {
        applied: filters,
        summary: buildFilterSummary(filters),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get transaction history for a specific investor
 */
export const getInvestorTransactionHistory = async (req, res) => {
  try {
    const { investorId } = req.params;

    // Validate investor ID
    if (!investorId) {
      return res.status(400).json(
        formatErrorResponse(
          {
            code: 'INVALID_INVESTOR_ID',
            message: 'Investor ID is required',
          },
          req,
          400
        )
      );
    }

    // Build filters from query parameters
    const filters = {
      ...req.query,
      investorEntity: investorId,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      search: req.query.search,
    };

    // Build pagination options
    const paginationOptions = {
      type: req.query.paginationType || 'offset',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      cursor: req.query.cursor,
    };

    // Build sort options
    const sortOptions = parseSortOptions(req.query);

    // Get investor transaction history
    const result =
      await transactionHistoryService.getInvestorTransactionHistory(
        investorId,
        filters,
        paginationOptions,
        sortOptions
      );

    // Transform data for response
    const transformedData = transformTransactionList(result.data);

    // Build response
    const response = {
      investorId,
      data: transformedData,
      pagination: result.pagination || result.cursor,
      summary: result.summary,
      filters: {
        applied: filters,
        summary: buildFilterSummary(filters),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get chronological timeline of transactions
 */
export const getTransactionTimeline = async (req, res) => {
  try {
    // Build filters from query parameters
    const filters = {
      ...req.query,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
    };

    // Build timeline options
    const options = {
      granularity: req.query.granularity || 'day',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      includeMetrics: req.query.includeMetrics !== 'false',
    };

    // Get transaction timeline
    const result = await transactionHistoryService.getTransactionTimeline(
      filters,
      options
    );

    // Build response
    const response = {
      timeline: result.timeline,
      metrics: result.metrics,
      granularity: result.granularity,
      filters: {
        applied: filters,
        summary: buildFilterSummary(filters),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get summary statistics for transaction history
 */
export const getTransactionSummary = async (req, res) => {
  try {
    // Build filters from query parameters
    const filters = {
      ...req.query,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      userEntity: req.query.userEntity,
      investorEntity: req.query.investorEntity,
    };

    // Get transaction summary
    const summary =
      await transactionHistoryService.getTransactionSummary(filters);

    // Build response
    const response = {
      summary,
      filters: {
        applied: filters,
        summary: buildFilterSummary(filters),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    };

    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Export transaction history to different formats
 */
export const exportTransactionHistory = async (req, res) => {
  try {
    // Build filters from query parameters
    const filters = {
      ...req.query,
      startDate: req.query.startDate || undefined,
      endDate: req.query.endDate || undefined,
      dateRange: req.query.dateRange || undefined,
      status: req.query.status
        ? Array.isArray(req.query.status)
          ? req.query.status
          : [req.query.status]
        : undefined,
      type: req.query.type
        ? Array.isArray(req.query.type)
          ? req.query.type
          : [req.query.type]
        : undefined,
      paymentMethod: req.query.paymentMethod
        ? Array.isArray(req.query.paymentMethod)
          ? req.query.paymentMethod
          : [req.query.paymentMethod]
        : undefined,
      minAmount: req.query.minAmount,
      maxAmount: req.query.maxAmount,
      search: req.query.search,
    };

    // Build export options
    const exportOptions = {
      format: req.query.format || 'csv',
      fields: req.query.fields
        ? Array.isArray(req.query.fields)
          ? req.query.fields
          : [req.query.fields]
        : null,
      limit: parseInt(req.query.limit) || 10000,
      includeHeaders: req.query.includeHeaders !== 'false',
    };

    // Validate export parameters
    const validation = validateExportParameters(exportOptions);
    if (!validation.isValid) {
      return res.status(400).json(
        formatErrorResponse(
          {
            code: 'INVALID_EXPORT_PARAMETERS',
            message: 'Invalid export parameters',
            details: validation.errors,
          },
          req,
          400
        )
      );
    }

    // Get export data
    const exportResult =
      await transactionHistoryService.exportTransactionHistory(
        filters,
        exportOptions
      );

    // Set appropriate headers for file download
    const filename = generateExportFilename(exportOptions.format, filters);

    let contentType;
    switch (exportOptions.format.toLowerCase()) {
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'excel':
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      default:
        contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Record-Count', exportResult.recordCount);
    res.setHeader('X-Export-Format', exportResult.format);
    res.setHeader('X-Export-Timestamp', exportResult.exportedAt);

    return res.send(exportResult.data);
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper function to invalidate transaction cache when data changes
export const invalidateTransactionData = async () => {
  try {
    await invalidateTransactionCache();
  } catch (error) {
    console.error('Error invalidating transaction cache:', error);
  }
};

export default {
  getTransactionMetrics,
  getTransactionDetails,
  getTransactionList,
  getTransactionPerformanceReport,
  getTransactionAnalytics,
  // New transaction history methods
  getTransactionHistory,
  getUserTransactionHistory,
  getInvestorTransactionHistory,
  getTransactionTimeline,
  getTransactionSummary,
  exportTransactionHistory,
  invalidateTransactionData,
};
