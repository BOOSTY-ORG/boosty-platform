import Investor from "../../models/metrics/investor.model.js";
import Investment from "../../models/metrics/investment.model.js";
import Transaction from "../../models/metrics/transaction.model.js";
import User from "../../models/user.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { getPaginationOptions, getPaginationMeta } from "../../utils/metrics/pagination.util.js";

export const getInvestorMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic investor metrics
    const [
      totalInvestors,
      activeInvestors,
      newInvestors,
      investorTypeBreakdown,
      riskProfileBreakdown,
      verificationStatusBreakdown,
      topInvestors,
      regionalDistribution
    ] = await Promise.all([
      Investor.countDocuments(query),
      Investor.countDocuments({ ...query, isActive: true }),
      Investor.countDocuments({ 
        ...query, 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      Investor.aggregate([
        { $match: query },
        { $group: { _id: "$investorType", count: { $sum: 1 } } }
      ]),
      Investor.aggregate([
        { $match: query },
        { $group: { _id: "$riskProfile", count: { $sum: 1 } } }
      ]),
      Investor.aggregate([
        { $match: query },
        { $group: { _id: "$verificationStatus", count: { $sum: 1 } } }
      ]),
      Investor.find(query)
        .sort({ totalInvested: -1 })
        .limit(10)
        .populate('userId', 'name email'),
      Investor.aggregate([
        { $match: query },
        { $group: { _id: "$investmentPreferences.preferredRegions", count: { $sum: 1 } } }
      ])
    ]);
    
    // Calculate investment metrics
    const investmentMetrics = await getInvestmentMetrics(query, startDate, endDate);
    
    // Calculate performance metrics
    const performanceMetrics = await getPerformanceMetrics(query, startDate, endDate);
    
    const response = {
      summary: {
        totalInvestors,
        activeInvestors,
        newInvestors,
        averageInvestmentPerInvestor: investmentMetrics.totalInvestments / totalInvestors || 0,
        totalInvestmentVolume: investmentMetrics.totalInvestments,
        totalReturns: investmentMetrics.totalReturns
      },
      breakdowns: {
        investorType: formatBreakdown(investorTypeBreakdown),
        riskProfile: formatBreakdown(riskProfileBreakdown),
        verificationStatus: formatBreakdown(verificationStatusBreakdown),
        regionalDistribution: formatBreakdown(regionalDistribution)
      },
      performance: performanceMetrics,
      topInvestors: topInvestors.map(investor => ({
        id: investor._id,
        name: investor.userId?.name || 'Unknown',
        email: investor.userId?.email || 'Unknown',
        investorType: investor.investorType,
        totalInvested: investor.totalInvested,
        actualReturns: investor.actualReturns,
        roi: investor.roi,
        activeInvestments: investor.performance.activeInvestments
      })),
      trends: await getInvestorTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getInvestorDetails = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { startDate, endDate } = parseDateRange(req.query);
    
    const investor = await Investor.findById(investorId)
      .populate('userId', 'name email createdAt')
      .populate('verificationDocuments.type');
    
    if (!investor) {
      return res.status(404).json(formatErrorResponse({
        code: 'INVESTOR_NOT_FOUND',
        message: 'Investor not found'
      }, req, 404));
    }
    
    // Get investment history
    const investments = await Investment.find({ 
      investorId: investor._id,
      startDate: { $gte: startDate, $lte: endDate }
    }).populate('applicationId', 'applicationId propertyDetails.propertyType');
    
    // Get transaction history
    const transactions = await Transaction.find({
      $or: [
        { fromEntityId: investor._id },
        { toEntityId: investor._id }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
    
    // Calculate detailed metrics
    const detailedMetrics = await calculateDetailedInvestorMetrics(investor, investments, transactions);
    
    const response = {
      investor: {
        id: investor._id,
        user: investor.userId,
        investorType: investor.investorType,
        verificationStatus: investor.verificationStatus,
        riskProfile: investor.riskProfile,
        joinedAt: investor.joinedAt,
        isActive: investor.isActive
      },
      financials: {
        totalInvested: investor.totalInvested,
        availableFunds: investor.availableFunds,
        expectedReturns: investor.expectedReturns,
        actualReturns: investor.actualReturns,
        roi: investor.roi,
        totalValue: investor.totalValue
      },
      performance: investor.performance,
      preferences: investor.investmentPreferences,
      bankAccounts: investor.bankAccounts,
      verificationDocuments: investor.verificationDocuments,
      investments: investments.map(inv => ({
        id: inv._id,
        applicationId: inv.applicationId?.applicationId,
        propertyType: inv.applicationId?.propertyDetails?.propertyType,
        amount: inv.amount,
        expectedReturn: inv.expectedReturn,
        actualReturn: inv.actualReturn,
        status: inv.status,
        startDate: inv.startDate,
        endDate: inv.endDate,
        roi: inv.currentROI
      })),
      transactions: transactions.map(txn => ({
        id: txn._id,
        transactionId: txn.transactionId,
        type: txn.type,
        amount: txn.amount,
        status: txn.status,
        paymentMethod: txn.paymentMethod,
        createdAt: txn.createdAt,
        completedAt: txn.completedAt
      })),
      detailedMetrics
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getInvestorList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = getPaginationOptions(req.query);
    
    const investors = await Investor.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Investor.countDocuments(query);
    const paginationMeta = getPaginationMeta(total, paginationOptions);
    
    const response = {
      data: investors.map(investor => ({
        id: investor._id,
        user: investor.userId,
        investorType: investor.investorType,
        verificationStatus: investor.verificationStatus,
        riskProfile: investor.riskProfile,
        totalInvested: investor.totalInvested,
        actualReturns: investor.actualReturns,
        roi: investor.roi,
        isActive: investor.isActive,
        joinedAt: investor.joinedAt
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getInvestorPerformanceMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    const performanceMetrics = await getPerformanceMetrics(query, startDate, endDate);
    
    // Get ROI distribution
    const roiDistribution = await Investor.aggregate([
      { $match: query },
      {
        $bucket: {
          groupBy: { $multiply: ["$roi", 100] },
          boundaries: [0, 5, 10, 15, 20, 25, 30, 100],
          default: "other",
          output: {
            count: { $sum: 1 },
            investors: { $push: "$_id" }
          }
        }
      }
    ]);
    
    // Get investment duration analysis
    const durationAnalysis = await Investment.aggregate([
      { $match: { investorId: { $in: await Investor.find(query).distinct('_id') } } },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: { $subtract: ["$endDate", "$startDate"] } },
          minDuration: { $min: { $subtract: ["$endDate", "$startDate"] } },
          maxDuration: { $max: { $subtract: ["$endDate", "$startDate"] } }
        }
      }
    ]);
    
    const response = {
      ...performanceMetrics,
      roiDistribution: roiDistribution.map(bucket => ({
        range: `${bucket._id}%`,
        count: bucket.count,
        percentage: (bucket.count / await Investor.countDocuments(query)) * 100
      })),
      investmentDuration: {
        average: durationAnalysis[0]?.avgDuration || 0,
        minimum: durationAnalysis[0]?.minDuration || 0,
        maximum: durationAnalysis[0]?.maxDuration || 0
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getInvestmentMetrics = async (query, startDate, endDate) => {
  const investorIds = await Investor.find(query).distinct('_id');
  
  const [totalInvestments, totalReturns, activeInvestments] = await Promise.all([
    Investor.aggregate([
      { $match: { _id: { $in: investorIds } } },
      { $group: { _id: null, total: { $sum: "$totalInvested" } } }
    ]),
    Investor.aggregate([
      { $match: { _id: { $in: investorIds } } },
      { $group: { _id: null, total: { $sum: "$actualReturns" } } }
    ]),
    Investment.countDocuments({
      investorId: { $in: investorIds },
      status: 'active'
    })
  ]);
  
  return {
    totalInvestments: totalInvestments[0]?.total || 0,
    totalReturns: totalReturns[0]?.total || 0,
    activeInvestments
  };
};

const getPerformanceMetrics = async (query, startDate, endDate) => {
  const investorIds = await Investor.find(query).distinct('_id');
  
  const [avgROI, totalInvestments, completedInvestments, defaultedInvestments] = await Promise.all([
    Investor.aggregate([
      { $match: { _id: { $in: investorIds } } },
      { $group: { _id: null, avgROI: { $avg: "$roi" } } }
    ]),
    Investment.countDocuments({
      investorId: { $in: investorIds },
      startDate: { $gte: startDate, $lte: endDate }
    }),
    Investment.countDocuments({
      investorId: { $in: investorIds },
      status: 'completed',
      endDate: { $gte: startDate, $lte: endDate }
    }),
    Investment.countDocuments({
      investorId: { $in: investorIds },
      status: 'defaulted',
      endDate: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const completionRate = totalInvestments > 0 ? (completedInvestments / totalInvestments) * 100 : 0;
  const defaultRate = totalInvestments > 0 ? (defaultedInvestments / totalInvestments) * 100 : 0;
  
  return {
    averageROI: avgROI[0]?.avgROI || 0,
    totalInvestments,
    completionRate: Math.round(completionRate * 10) / 10,
    defaultRate: Math.round(defaultRate * 10) / 10
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getInvestorTrends = async (startDate, endDate) => {
  // Get monthly new investor signups
  const monthlySignups = await Investor.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  // Get monthly investment volume
  const monthlyInvestments = await Transaction.aggregate([
    {
      $match: {
        type: 'investment',
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$completedAt" },
          month: { $month: "$completedAt" }
        },
        volume: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    signups: monthlySignups.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    })),
    investments: monthlyInvestments.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      volume: item.volume
    }))
  };
};

const calculateDetailedInvestorMetrics = async (investor, investments, transactions) => {
  const investmentTransactions = transactions.filter(t => t.type === 'investment');
  const repaymentTransactions = transactions.filter(t => t.type === 'repayment');
  
  const totalInvestmentAmount = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalRepaymentAmount = repaymentTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const activeInvestments = investments.filter(inv => inv.status === 'active').length;
  const completedInvestments = investments.filter(inv => inv.status === 'completed').length;
  const defaultedInvestments = investments.filter(inv => inv.status === 'defaulted').length;
  
  const avgInvestmentSize = investments.length > 0 ? 
    investments.reduce((sum, inv) => sum + inv.amount, 0) / investments.length : 0;
  
  const onTimePayments = investments.reduce((sum, inv) => 
    sum + inv.performance.onTimePayments, 0);
  const latePayments = investments.reduce((sum, inv) => 
    sum + inv.performance.latePayments, 0);
  
  const totalPayments = onTimePayments + latePayments;
  const onTimePaymentRate = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 0;
  
  return {
    totalTransactions: transactions.length,
    totalInvestmentAmount,
    totalRepaymentAmount,
    activeInvestments,
    completedInvestments,
    defaultedInvestments,
    avgInvestmentSize,
    onTimePaymentRate: Math.round(onTimePaymentRate * 10) / 10,
    investmentDiversity: investments.length,
    lastActivity: transactions.length > 0 ?
        new Date(Math.max(...transactions.map(t => new Date(t.createdAt)))) : null
  };
};

export default {
  getInvestorMetrics,
  getInvestorDetails,
  getInvestorList,
  getInvestorPerformanceMetrics
};