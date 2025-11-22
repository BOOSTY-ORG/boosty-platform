import User from "../../models/user.model.js";
import Investor from "../../models/metrics/investor.model.js";
import SolarApplication from "../../models/metrics/solarApplication.model.js";
import Transaction from "../../models/metrics/transaction.model.js";
import KYCDocument from "../../models/metrics/kycDocument.model.js";
import { formatSuccessResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";

export const getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    
    // Parallel execution for better performance
    const [
      totalUsers,
      activeUsers,
      totalInvestors,
      activeInvestors,
      totalApplications,
      pendingApplications,
      approvedApplications,
      installedSystems,
      investmentVolume,
      totalRevenue,
      monthlyRecurringRevenue
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ 
        status: 'active',
        lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      Investor.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      Investor.countDocuments({ isActive: true }),
      SolarApplication.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      SolarApplication.countDocuments({ applicationStatus: 'pending' }),
      SolarApplication.countDocuments({ applicationStatus: 'approved' }),
      SolarApplication.countDocuments({ applicationStatus: 'installed' }),
      Transaction.aggregate([
        { $match: {
          type: 'investment',
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: {
          type: 'repayment',
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      calculateMonthlyRecurringRevenue()
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate.getTime() - (endDate - startDate));
    const previousPeriodEnd = new Date(startDate.getTime() - 1);
    
    const [previousUsers, previousInvestments, previousRevenue] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } }),
      Transaction.aggregate([
        { $match: {
          type: 'investment',
          status: 'completed',
          completedAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: {
          type: 'repayment',
          status: 'completed',
          completedAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);
    
    const response = {
      summary: {
        totalUsers,
        activeUsers,
        totalInvestors,
        activeInvestors,
        totalInvestments: investmentVolume[0]?.total || 0,
        totalApplications,
        pendingApplications,
        approvedApplications,
        installedSystems,
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRecurringRevenue
      },
      growth: {
        userGrowth: calculateGrowth(totalUsers, previousUsers),
        investmentGrowth: calculateGrowth(
          investmentVolume[0]?.total || 0, 
          previousInvestments[0]?.total || 0
        ),
        revenueGrowth: calculateGrowth(
          totalRevenue[0]?.total || 0, 
          previousRevenue[0]?.total || 0
        )
      },
      performance: {
        kycApprovalRate: await calculateKYCApprovalRate(startDate, endDate),
        applicationApprovalRate: await calculateApplicationApprovalRate(startDate, endDate),
        installationCompletionRate: await calculateInstallationCompletionRate(startDate, endDate),
        repaymentRate: await calculateRepaymentRate(startDate, endDate),
        customerSatisfactionScore: await calculateCustomerSatisfactionScore()
      },
      recentActivity: await getRecentActivity()
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getRealtimeMetrics = async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [
      activeUsers,
      onlineInvestors,
      pendingTransactions,
      currentHourApplications,
      currentHourInvestments,
      currentHourRepayments,
      systemLoad
    ] = await Promise.all([
      User.countDocuments({ 
        lastLoginAt: { $gte: oneHourAgo }
      }),
      Investor.countDocuments({ 
        isActive: true,
        lastLoginAt: { $gte: oneHourAgo }
      }),
      Transaction.countDocuments({ 
        status: 'pending'
      }),
      SolarApplication.countDocuments({ 
        createdAt: { $gte: oneHourAgo }
      }),
      Transaction.countDocuments({ 
        type: 'investment',
        createdAt: { $gte: oneHourAgo }
      }),
      Transaction.countDocuments({ 
        type: 'repayment',
        completedAt: { $gte: oneHourAgo }
      }),
      getSystemLoad()
    ]);
    
    const response = {
      activeUsers,
      onlineInvestors,
      pendingTransactions,
      systemStatus: systemLoad.status,
      serverLoad: systemLoad.load,
      responseTime: systemLoad.responseTime,
      currentHourStats: {
        applications: currentHourApplications,
        investments: currentHourInvestments,
        repayments: currentHourRepayments
      },
      todayStats: await getTodayStats()
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
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

const calculateMonthlyRecurringRevenue = async () => {
  // Calculate MRR from active investments
  const result = await Transaction.aggregate([
    { $match: {
      type: 'repayment',
      status: 'completed',
      completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }},
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  return result[0]?.total || 0;
};

const calculateKYCApprovalRate = async (startDate, endDate) => {
  const [total, approved] = await Promise.all([
    KYCDocument.countDocuments({ 
      uploadedAt: { $gte: startDate, $lte: endDate }
    }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'verified',
      reviewedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return total > 0 ? Math.round((approved / total) * 100 * 10) / 10 : 0;
};

const calculateApplicationApprovalRate = async (startDate, endDate) => {
  const [total, approved] = await Promise.all([
    SolarApplication.countDocuments({ 
      submittedAt: { $gte: startDate, $lte: endDate }
    }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'approved',
      approvedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return total > 0 ? Math.round((approved / total) * 100 * 10) / 10 : 0;
};

const calculateInstallationCompletionRate = async (startDate, endDate) => {
  const [approved, installed] = await Promise.all([
    SolarApplication.countDocuments({ 
      applicationStatus: 'approved',
      approvedAt: { $gte: startDate, $lte: endDate }
    }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'installed',
      installedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return approved > 0 ? Math.round((installed / approved) * 100 * 10) / 10 : 0;
};

const calculateRepaymentRate = async (startDate, endDate) => {
  const [totalRepayments, onTimeRepayments] = await Promise.all([
    Transaction.countDocuments({ 
      type: 'repayment',
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    }),
    // This is simplified - in production, you'd compare due dates with actual payment dates
    Transaction.countDocuments({ 
      type: 'repayment',
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return totalRepayments > 0 ? Math.round((onTimeRepayments / totalRepayments) * 100 * 10) / 10 : 0;
};

const calculateCustomerSatisfactionScore = async () => {
  // Mock implementation - in production, this would come from customer surveys
  return 4.2;
};

const getRecentActivity = async () => {
  const now = new Date();
  const today = new Date(now.setHours(0, 0, 0, 0));
  
  const [
    newUsersToday,
    newApplicationsToday,
    newInvestmentsToday,
    completedInstallationsToday,
    repaymentsProcessedToday
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: today } }),
    SolarApplication.countDocuments({ submittedAt: { $gte: today } }),
    Transaction.countDocuments({ 
      type: 'investment',
      completedAt: { $gte: today }
    }),
    SolarApplication.countDocuments({ installedAt: { $gte: today } }),
    Transaction.countDocuments({ 
      type: 'repayment',
      completedAt: { $gte: today }
    })
  ]);
  
  return {
    newUsersToday,
    newApplicationsToday,
    newInvestmentsToday,
    completedInstallationsToday,
    repaymentsProcessedToday
  };
};

const getTodayStats = async () => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  
  const [
    todayApplications,
    todayInvestments,
    todayRepayments,
    todayRevenue
  ] = await Promise.all([
    SolarApplication.countDocuments({ createdAt: { $gte: today } }),
    Transaction.countDocuments({ 
      type: 'investment',
      completedAt: { $gte: today }
    }),
    Transaction.countDocuments({ 
      type: 'repayment',
      completedAt: { $gte: today }
    }),
    Transaction.aggregate([
      { $match: {
        status: 'completed',
        completedAt: { $gte: today }
      }},
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ])
  ]);
  
  return {
    applications: todayApplications,
    investments: todayInvestments,
    repayments: todayRepayments,
    revenue: todayRevenue[0]?.total || 0
  };
};

const getSystemLoad = () => {
  const memUsage = process.memoryUsage();
  
  return {
    status: 'operational',
    load: {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        user: 0,
        system: 0
      }
    },
    responseTime: Math.round(Math.random() * 200 + 50) // Mock response time
  };
};

export default {
  getDashboardOverview,
  getRealtimeMetrics
};