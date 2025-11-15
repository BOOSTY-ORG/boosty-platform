import Transaction from "../../models/metrics/transaction.model.js";
import Investment from "../../models/metrics/investment.model.js";
import SolarApplication from "../../models/metrics/solarApplication.model.js";
import Investor from "../../models/metrics/investor.model.js";
import User from "../../models/user.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { getPaginationOptions, buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

export const getTransactionMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic transaction metrics
    const [
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      transactionVolume,
      transactionFees,
      transactionTypeBreakdown,
      paymentMethodBreakdown,
      statusBreakdown
    ] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.countDocuments({ ...query, status: 'completed' }),
      Transaction.countDocuments({ ...query, status: 'pending' }),
      Transaction.countDocuments({ ...query, status: 'failed' }),
      Transaction.aggregate([
        { $match: { ...query, status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { ...query, status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$totalFees" } } }
      ]),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: "$type", count: { $sum: 1 }, volume: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: "$paymentMethod", count: { $sum: 1 }, volume: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate.getTime() - (endDate - startDate));
    const previousPeriodEnd = new Date(startDate.getTime() - 1);
    
    const [previousTransactions, previousVolume] = await Promise.all([
      Transaction.countDocuments({ 
        createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } 
      }),
      Transaction.aggregate([
        { $match: { 
          status: 'completed',
          completedAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);
    
    const transactionGrowth = calculateGrowth(totalTransactions, previousTransactions);
    const volumeGrowth = calculateGrowth(
      transactionVolume[0]?.total || 0, 
      previousVolume[0]?.total || 0
    );
    
    // Get performance metrics
    const performanceMetrics = await getTransactionPerformanceMetrics(query, startDate, endDate);
    
    const response = {
      summary: {
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        totalVolume: transactionVolume[0]?.total || 0,
        totalFees: transactionFees[0]?.total || 0,
        averageTransactionValue: totalTransactions > 0 ? (transactionVolume[0]?.total || 0) / totalTransactions : 0,
        completionRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0
      },
      growth: {
        transactionGrowth,
        volumeGrowth
      },
      breakdowns: {
        transactionType: formatTransactionBreakdown(transactionTypeBreakdown),
        paymentMethod: formatTransactionBreakdown(paymentMethodBreakdown),
        status: formatStatusBreakdown(statusBreakdown)
      },
      performance: performanceMetrics,
      trends: await getTransactionTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
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
      return res.status(404).json(formatErrorResponse({
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Transaction not found'
      }, req, 404));
    }
    
    // Get related entities information
    let fromEntityInfo = null;
    let toEntityInfo = null;
    
    if (transaction.fromEntity === 'investor') {
      fromEntityInfo = await Investor.findById(transaction.fromEntityId).populate('userId', 'name email');
    } else if (transaction.fromEntity === 'user') {
      fromEntityInfo = await User.findById(transaction.fromEntityId, 'name email');
    }
    
    if (transaction.toEntity === 'investor') {
      toEntityInfo = await Investor.findById(transaction.toEntityId).populate('userId', 'name email');
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
        processingDuration: transaction.processingDuration
      },
      relatedEntities: {
        from: fromEntityInfo,
        to: toEntityInfo
      },
      relatedApplication: transaction.relatedApplication,
      relatedInvestment: transaction.relatedInvestment
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
    const paginationOptions = getPaginationOptions(req.query);
    
    const transactions = await Transaction.find(query)
      .populate('fromEntityId', 'name email')
      .populate('toEntityId', 'name email')
      .populate('relatedApplication', 'applicationId')
      .sort({ createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Transaction.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: transactions.map(txn => ({
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
        relatedApplicationId: txn.relatedApplication?.applicationId
      })),
      pagination: paginationMeta
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
    
    const performanceMetrics = await getTransactionPerformanceMetrics(query, startDate, endDate);
    
    // Get processing time analysis
    const processingTimeAnalysis = await Transaction.aggregate([
      { $match: { ...query, processingDuration: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: "$processingDuration" },
          minProcessingTime: { $min: "$processingDuration" },
          maxProcessingTime: { $max: "$processingDuration" }
        }
      }
    ]);
    
    // Get success rate by payment method
    const successRateByMethod = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            method: "$paymentMethod",
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.method",
          total: { $sum: "$count" },
          successful: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "completed"] }, "$count", 0]
            }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ["$successful", "$total"] },
              100
            ]
          }
        }
      }
    ]);
    
    // Get transaction value distribution
    const valueDistribution = await Transaction.aggregate([
      { $match: { ...query, status: 'completed' } },
      {
        $bucket: {
          groupBy: "$amount",
          boundaries: [0, 1000, 5000, 10000, 25000, 50000, 100000, 500000],
          default: "other",
          output: {
            count: { $sum: 1 },
            totalVolume: { $sum: "$amount" }
          }
        }
      }
    ]);
    
    const response = {
      ...performanceMetrics,
      processingTime: {
        average: processingTimeAnalysis[0]?.avgProcessingTime || 0,
        minimum: processingTimeAnalysis[0]?.minProcessingTime || 0,
        maximum: processingTimeAnalysis[0]?.maxProcessingTime || 0
      },
      successRateByMethod: successRateByMethod.map(item => ({
        paymentMethod: item._id,
        totalTransactions: item.total,
        successRate: Math.round(item.successRate * 10) / 10
      })),
      valueDistribution: valueDistribution.map(bucket => ({
        range: bucket._id === 'other' ? 'Other' : `${formatCurrency(bucket._id - 1)} - ${formatCurrency(bucket._id)}`,
        count: bucket.count,
        totalVolume: bucket.totalVolume
      }))
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTransactionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get transaction flow analysis
    const transactionFlow = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            from: "$fromEntity",
            to: "$toEntity",
            type: "$type"
          },
          count: { $sum: 1 },
          volume: { $sum: "$amount" }
        }
      },
      { $sort: { volume: -1 } }
    ]);
    
    // Get hourly transaction patterns
    const hourlyPatterns = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
          volume: { $sum: "$amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    // Get daily transaction patterns
    const dailyPatterns = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          count: { $sum: 1 },
          volume: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    
    // Get failure analysis
    const failureAnalysis = await Transaction.aggregate([
      { $match: { ...query, status: 'failed' } },
      {
        $group: {
          _id: {
            type: "$type",
            paymentMethod: "$paymentMethod",
            failureReason: "$failureReason"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    const response = {
      transactionFlow: transactionFlow.map(item => ({
        from: item._id.from,
        to: item._id.to,
        type: item._id.type,
        count: item.count,
        volume: item.volume
      })),
      hourlyPatterns: hourlyPatterns.map(item => ({
        hour: item._id,
        count: item.count,
        volume: item.volume
      })),
      dailyPatterns: dailyPatterns.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        count: item.count,
        volume: item.volume
      })),
      failureAnalysis: failureAnalysis.map(item => ({
        type: item._id.type,
        paymentMethod: item._id.paymentMethod,
        failureReason: item._id.failureReason,
        count: item.count
      }))
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getTransactionPerformanceMetrics = async (query, startDate, endDate) => {
  const [totalTransactions, completedTransactions, failedTransactions, avgProcessingTime] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.countDocuments({ ...query, status: 'completed' }),
    Transaction.countDocuments({ ...query, status: 'failed' }),
    Transaction.aggregate([
      { $match: { ...query, processingDuration: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: "$processingDuration" } } }
    ])
  ]);
  
  const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;
  const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;
  
  return {
    totalTransactions,
    completedTransactions,
    failedTransactions,
    successRate: Math.round(successRate * 10) / 10,
    failureRate: Math.round(failureRate * 10) / 10,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0
  };
};

const formatTransactionBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = {
      count: item.count,
      volume: item.volume || 0
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

const getTransactionTrends = async (startDate, endDate) => {
  // Get daily transaction trends
  const dailyTrends = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        },
        count: { $sum: 1 },
        volume: { $sum: "$amount" },
        completed: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
          }
        }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);
  
  // Get monthly transaction trends by type
  const monthlyTypeTrends = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          type: "$type"
        },
        count: { $sum: 1 },
        volume: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.type": 1 } }
  ]);
  
  return {
    daily: dailyTrends.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      count: item.count,
      volume: item.volume,
      completed: item.completed,
      successRate: item.count > 0 ? (item.completed / item.count) * 100 : 0
    })),
    monthlyByType: monthlyTypeTrends.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      type: item._id.type,
      count: item.count,
      volume: item.volume
    }))
  };
};

const calculateGrowth = (current, previous) => {
  if (previous === 0) return { current, previous, percentage: 0, trend: 'stable' };
  const percentage = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    percentage: Math.round(percentage * 100) / 100,
    trend: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable'
  };
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
};

export default {
  getTransactionMetrics,
  getTransactionDetails,
  getTransactionList,
  getTransactionPerformanceReport,
  getTransactionAnalytics
};