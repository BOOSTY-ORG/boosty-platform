import User from "../../models/user.model.js";
import SolarApplication from "../../models/metrics/solarApplication.model.js";
import KYCDocument from "../../models/metrics/kycDocument.model.js";
import Transaction from "../../models/metrics/transaction.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { getPaginationOptions, getPaginationMeta } from "../../utils/metrics/pagination.util.js";

export const getUserMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic user metrics
    const [
      totalUsers,
      activeUsers,
      newUsers,
      userActivity,
      userApplications,
      userKYCStatus,
      userTransactions,
      regionalDistribution
    ] = await Promise.all([
      User.countDocuments(query),
      User.countDocuments({ 
        ...query,
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      User.countDocuments({ 
        ...query, 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      getUserActivityStats(startDate, endDate),
      getUserApplicationStats(startDate, endDate),
      getUserKYCStats(startDate, endDate),
      getUserTransactionStats(startDate, endDate),
      getUserRegionalDistribution(startDate, endDate)
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate.getTime() - (endDate - startDate));
    const previousPeriodEnd = new Date(startDate.getTime() - 1);
    
    const [previousUsers] = await Promise.all([
      User.countDocuments({ 
        createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } 
      })
    ]);
    
    const userGrowth = calculateGrowth(newUsers, previousUsers);
    
    const response = {
      summary: {
        totalUsers,
        activeUsers,
        newUsers,
        userGrowth,
        averageApplicationsPerUser: userApplications.totalApplications / totalUsers || 0,
        kycCompletionRate: userKYCStats.completionRate,
        averageTransactionValue: userTransactions.averageValue
      },
      activity: userActivity,
      applications: userApplications,
      kycStatus: userKYCStatus,
      transactions: userTransactions,
      regionalDistribution,
      trends: await getUserTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = parseDateRange(req.query);
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json(formatErrorResponse({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, req, 404));
    }
    
    // Get user's applications
    const applications = await SolarApplication.find({ 
      userId: user._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Get user's KYC documents
    const kycDocuments = await KYCDocument.find({ 
      userId: user._id,
      uploadedAt: { $gte: startDate, $lte: endDate }
    });
    
    // Get user's transactions
    const transactions = await Transaction.find({
      $or: [
        { fromEntityId: user._id },
        { toEntityId: user._id }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });
    
    // Calculate detailed metrics
    const detailedMetrics = await calculateDetailedUserMetrics(user, applications, kycDocuments, transactions);
    
    const response = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      applications: applications.map(app => ({
        id: app._id,
        applicationId: app.applicationId,
        status: app.applicationStatus,
        kycStatus: app.kycStatus,
        propertyType: app.propertyDetails.propertyType,
        estimatedCost: app.systemRequirements.estimatedCost,
        submittedAt: app.submittedAt,
        approvedAt: app.approvedAt,
        installedAt: app.installedAt
      })),
      kycDocuments: kycDocuments.map(doc => ({
        id: doc._id,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus,
        uploadedAt: doc.uploadedAt,
        reviewedAt: doc.reviewedAt,
        verificationScore: doc.verificationScore
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

export const getUserList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = getPaginationOptions(req.query);
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await User.countDocuments(query);
    const paginationMeta = getPaginationMeta(total, paginationOptions);
    
    // Get additional metrics for each user
    const usersWithMetrics = await Promise.all(
      users.map(async (user) => {
        const [applicationCount, kycCount, transactionCount] = await Promise.all([
          SolarApplication.countDocuments({ userId: user._id }),
          KYCDocument.countDocuments({ userId: user._id }),
          Transaction.countDocuments({
            $or: [
              { fromEntityId: user._id },
              { toEntityId: user._id }
            ]
          })
        ]);
        
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          applicationCount,
          kycCount,
          transactionCount
        };
      })
    );
    
    const response = {
      data: usersWithMetrics,
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getUserActivityMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    const activityMetrics = await getUserActivityStats(startDate, endDate);
    
    // Get daily activity patterns
    const dailyActivity = await User.aggregate([
      {
        $match: {
          lastLoginAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$lastLoginAt" },
            month: { $month: "$lastLoginAt" },
            day: { $dayOfMonth: "$lastLoginAt" }
          },
          activeUsers: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);
    
    // Get hourly activity patterns
    const hourlyActivity = await User.aggregate([
      {
        $match: {
          lastLoginAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $hour: "$lastLoginAt" },
          activeUsers: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);
    
    // Get user engagement metrics
    const engagementMetrics = await getUserEngagementMetrics(startDate, endDate);
    
    const response = {
      ...activityMetrics,
      dailyActivity: dailyActivity.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        activeUsers: item.activeUsers
      })),
      hourlyActivity: hourlyActivity.map(item => ({
        hour: item._id,
        activeUsers: item.activeUsers
      })),
      engagement: engagementMetrics
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getUserActivityStats = async (startDate, endDate) => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
    User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: oneWeekAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: oneMonthAgo } })
  ]);
  
  return {
    dailyActive,
    weeklyActive,
    monthlyActive
  };
};

const getUserApplicationStats = async (startDate, endDate) => {
  const [totalApplications, approvedApplications, pendingApplications, rejectedApplications] = await Promise.all([
    SolarApplication.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'approved',
      approvedAt: { $gte: startDate, $lte: endDate }
    }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'pending',
      submittedAt: { $gte: startDate, $lte: endDate }
    }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'rejected',
      reviewedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const approvalRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;
  
  return {
    totalApplications,
    approvedApplications,
    pendingApplications,
    rejectedApplications,
    approvalRate: Math.round(approvalRate * 10) / 10
  };
};

const getUserKYCStats = async (startDate, endDate) => {
  const [totalDocuments, verifiedDocuments, pendingDocuments, rejectedDocuments] = await Promise.all([
    KYCDocument.countDocuments({ uploadedAt: { $gte: startDate, $lte: endDate } }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'verified',
      reviewedAt: { $gte: startDate, $lte: endDate }
    }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'pending',
      uploadedAt: { $gte: startDate, $lte: endDate }
    }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'rejected',
      reviewedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const completionRate = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;
  
  return {
    totalDocuments,
    verifiedDocuments,
    pendingDocuments,
    rejectedDocuments,
    completionRate: Math.round(completionRate * 10) / 10
  };
};

const getUserTransactionStats = async (startDate, endDate) => {
  const [transactionCount, totalVolume, completedTransactions] = await Promise.all([
    Transaction.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Transaction.countDocuments({ 
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const averageValue = transactionCount > 0 ? (totalVolume[0]?.total || 0) / transactionCount : 0;
  const completionRate = transactionCount > 0 ? (completedTransactions / transactionCount) * 100 : 0;
  
  return {
    transactionCount,
    totalVolume: totalVolume[0]?.total || 0,
    averageValue: Math.round(averageValue * 100) / 100,
    completionRate: Math.round(completionRate * 10) / 10
  };
};

const getUserRegionalDistribution = async (startDate, endDate) => {
  const applications = await SolarApplication.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$personalInfo.state",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return applications.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getUserTrends = async (startDate, endDate) => {
  // Get monthly new user signups
  const monthlySignups = await User.aggregate([
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
  
  // Get monthly application submissions
  const monthlyApplications = await SolarApplication.aggregate([
    {
      $match: {
        submittedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$submittedAt" },
          month: { $month: "$submittedAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    signups: monthlySignups.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    })),
    applications: monthlyApplications.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.count
    }))
  };
};

const getUserEngagementMetrics = async (startDate, endDate) => {
  const [usersWithApplications, usersWithKYC, usersWithTransactions] = await Promise.all([
    SolarApplication.distinct('userId', { createdAt: { $gte: startDate, $lte: endDate } }),
    KYCDocument.distinct('userId', { uploadedAt: { $gte: startDate, $lte: endDate } }),
    Transaction.distinct('fromEntityId', { createdAt: { $gte: startDate, $lte: endDate } })
  ]);
  
  const totalUsers = await User.countDocuments({ createdAt: { $lte: endDate } });
  
  return {
    applicationEngagement: totalUsers > 0 ? (usersWithApplications.length / totalUsers) * 100 : 0,
    kycEngagement: totalUsers > 0 ? (usersWithKYC.length / totalUsers) * 100 : 0,
    transactionEngagement: totalUsers > 0 ? (usersWithTransactions.length / totalUsers) * 100 : 0
  };
};

const calculateDetailedUserMetrics = async (user, applications, kycDocuments, transactions) => {
  const investmentTransactions = transactions.filter(t => t.type === 'investment');
  const repaymentTransactions = transactions.filter(t => t.type === 'repayment');
  
  const totalInvestmentAmount = investmentTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalRepaymentAmount = repaymentTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  const approvedApplications = applications.filter(app => app.applicationStatus === 'approved').length;
  const installedApplications = applications.filter(app => app.applicationStatus === 'installed').length;
  
  const verifiedDocuments = kycDocuments.filter(doc => doc.verificationStatus === 'verified').length;
  const pendingDocuments = kycDocuments.filter(doc => doc.verificationStatus === 'pending').length;
  
  const applicationSuccessRate = applications.length > 0 ? (approvedApplications / applications.length) * 100 : 0;
  const kycCompletionRate = kycDocuments.length > 0 ? (verifiedDocuments / kycDocuments.length) * 100 : 0;
  
  return {
    totalApplications: applications.length,
    approvedApplications,
    installedApplications,
    applicationSuccessRate: Math.round(applicationSuccessRate * 10) / 10,
    totalKYCDocuments: kycDocuments.length,
    verifiedDocuments,
    pendingDocuments,
    kycCompletionRate: Math.round(kycCompletionRate * 10) / 10,
    totalTransactions: transactions.length,
    totalInvestmentAmount,
    totalRepaymentAmount,
    lastActivity: transactions.length > 0 ? 
      new Date(Math.max(...transactions.map(t => new Date(t.createdAt)))) : null
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

export default {
  getUserMetrics,
  getUserDetails,
  getUserList,
  getUserActivityMetrics
};