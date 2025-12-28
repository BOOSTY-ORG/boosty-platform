import User from '../../models/user.model.js';
import Investor from '../../models/metrics/investor.model.js';
import SolarApplication from '../../models/metrics/solarApplication.model.js';
import Transaction from '../../models/metrics/transaction.model.js';
import KYCDocument from '../../models/metrics/kycDocument.model.js';
import {
  formatSuccessResponse,
  handleControllerError,
} from '../../utils/metrics/responseFormatter.util.js';
import { parseDateRange } from '../../utils/metrics/dateRange.util.js';
import {
  cacheDashboardMetrics,
  invalidateDashboardCache,
} from '../../utils/metrics/cache.util.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const cacheKey = `overview:${startDate.toISOString()}:${endDate.toISOString()}`;

    // Use cache-aside pattern for dashboard overview
    return await cacheDashboardMetrics(
      'overview',
      async () => {
        const previousPeriodStart = new Date(
          startDate.getTime() - (endDate - startDate)
        );
        const previousPeriodEnd = new Date(startDate.getTime() - 1);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Optimized aggregation pipeline to get all metrics in fewer database calls
        const [
          userMetrics,
          investorMetrics,
          applicationMetrics,
          transactionMetrics,
          previousPeriodMetrics,
        ] = await Promise.all([
          // User metrics aggregation
          User.aggregate([
            {
              $facet: {
                totalUsers: [
                  { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                  { $count: 'count' },
                ],
                activeUsers: [
                  {
                    $match: {
                      status: 'active',
                      lastLoginAt: { $gte: thirtyDaysAgo },
                    },
                  },
                  { $count: 'count' },
                ],
                previousUsers: [
                  {
                    $match: {
                      createdAt: {
                        $gte: previousPeriodStart,
                        $lte: previousPeriodEnd,
                      },
                    },
                  },
                  { $count: 'count' },
                ],
              },
            },
          ]),

          // Investor metrics aggregation
          Investor.aggregate([
            {
              $facet: {
                totalInvestors: [
                  { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                  { $count: 'count' },
                ],
                activeInvestors: [
                  { $match: { isActive: true } },
                  { $count: 'count' },
                ],
              },
            },
          ]),

          // Application metrics aggregation
          SolarApplication.aggregate([
            {
              $facet: {
                totalApplications: [
                  { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                  { $count: 'count' },
                ],
                pendingApplications: [
                  { $match: { applicationStatus: 'pending' } },
                  { $count: 'count' },
                ],
                approvedApplications: [
                  { $match: { applicationStatus: 'approved' } },
                  { $count: 'count' },
                ],
                installedSystems: [
                  { $match: { applicationStatus: 'installed' } },
                  { $count: 'count' },
                ],
              },
            },
          ]),

          // Transaction metrics aggregation with field selection
          Transaction.aggregate([
            {
              $facet: {
                investmentVolume: [
                  {
                    $match: {
                      type: 'investment',
                      status: 'completed',
                      completedAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
                totalRevenue: [
                  {
                    $match: {
                      status: 'completed',
                      completedAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
                repaymentRevenue: [
                  {
                    $match: {
                      type: 'repayment',
                      status: 'completed',
                      completedAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
                monthlyRecurringRevenue: [
                  {
                    $match: {
                      type: 'repayment',
                      status: 'completed',
                      completedAt: { $gte: thirtyDaysAgo },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
              },
            },
          ]),

          // Previous period metrics for growth calculation
          Transaction.aggregate([
            {
              $facet: {
                previousInvestments: [
                  {
                    $match: {
                      type: 'investment',
                      status: 'completed',
                      completedAt: {
                        $gte: previousPeriodStart,
                        $lte: previousPeriodEnd,
                      },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
                previousRevenue: [
                  {
                    $match: {
                      type: 'repayment',
                      status: 'completed',
                      completedAt: {
                        $gte: previousPeriodStart,
                        $lte: previousPeriodEnd,
                      },
                    },
                  },
                  { $group: { _id: null, total: { $sum: '$amount' } } },
                  { $project: { _id: 0, total: 1 } },
                ],
              },
            },
          ]),
        ]);

        // Extract values from aggregation results with proper null handling
        const totalUsers = userMetrics[0]?.totalUsers[0]?.count || 0;
        const activeUsers = userMetrics[0]?.activeUsers[0]?.count || 0;
        const previousUsers = userMetrics[0]?.previousUsers[0]?.count || 0;

        const totalInvestors =
          investorMetrics[0]?.totalInvestors[0]?.count || 0;
        const activeInvestors =
          investorMetrics[0]?.activeInvestors[0]?.count || 0;

        const totalApplications =
          applicationMetrics[0]?.totalApplications[0]?.count || 0;
        const pendingApplications =
          applicationMetrics[0]?.pendingApplications[0]?.count || 0;
        const approvedApplications =
          applicationMetrics[0]?.approvedApplications[0]?.count || 0;
        const installedSystems =
          applicationMetrics[0]?.installedSystems[0]?.count || 0;

        const investmentVolume =
          transactionMetrics[0]?.investmentVolume[0]?.total || 0;
        const totalRevenue = transactionMetrics[0]?.totalRevenue[0]?.total || 0;
        const monthlyRecurringRevenue =
          transactionMetrics[0]?.monthlyRecurringRevenue[0]?.total || 0;

        const previousInvestments =
          previousPeriodMetrics[0]?.previousInvestments[0]?.total || 0;
        const previousRevenue =
          previousPeriodMetrics[0]?.previousRevenue[0]?.total || 0;

        const response = {
          summary: {
            totalUsers,
            activeUsers,
            totalInvestors,
            activeInvestors,
            totalInvestments: investmentVolume,
            totalApplications,
            pendingApplications,
            approvedApplications,
            installedSystems,
            totalRevenue,
            monthlyRecurringRevenue,
          },
          growth: {
            userGrowth: calculateGrowth(totalUsers, previousUsers),
            investmentGrowth: calculateGrowth(
              investmentVolume,
              previousInvestments
            ),
            revenueGrowth: calculateGrowth(totalRevenue, previousRevenue),
          },
          performance: await getPerformanceMetrics(startDate, endDate),
          recentActivity: await getRecentActivity(),
        };

        return response;
      },
      {
        params: { startDate, endDate },
        tags: ['dashboard', 'overview', 'summary'],
      }
    ).then((data) => res.json(formatSuccessResponse(data, req)));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getRealtimeMetrics = async (req, res) => {
  try {
    // Real-time metrics should have very short cache time or no caching
    const cacheKey = `realtime:${new Date().getHours()}`;

    return await cacheDashboardMetrics(
      'realtime',
      async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Optimized aggregation for real-time metrics
        const [userActivityMetrics, transactionMetrics, applicationMetrics] =
          await Promise.all([
            // User activity aggregation
            User.aggregate([
              {
                $facet: {
                  activeUsers: [
                    { $match: { lastLoginAt: { $gte: oneHourAgo } } },
                    { $count: 'count' },
                  ],
                },
              },
            ]),

            // Transaction metrics aggregation
            Transaction.aggregate([
              {
                $facet: {
                  pendingTransactions: [
                    { $match: { status: 'pending' } },
                    { $count: 'count' },
                  ],
                  currentHourInvestments: [
                    {
                      $match: {
                        type: 'investment',
                        createdAt: { $gte: oneHourAgo },
                      },
                    },
                    { $count: 'count' },
                  ],
                  currentHourRepayments: [
                    {
                      $match: {
                        type: 'repayment',
                        completedAt: { $gte: oneHourAgo },
                      },
                    },
                    { $count: 'count' },
                  ],
                },
              },
            ]),

            // Application metrics aggregation
            SolarApplication.aggregate([
              {
                $facet: {
                  currentHourApplications: [
                    { $match: { createdAt: { $gte: oneHourAgo } } },
                    { $count: 'count' },
                  ],
                },
              },
            ]),
          ]);

        // Get investor activity separately as it requires a different collection
        const onlineInvestors = await Investor.countDocuments({
          isActive: true,
          lastLoginAt: { $gte: oneHourAgo },
        });

        // Extract values from aggregation results
        const activeUsers = userActivityMetrics[0]?.activeUsers[0]?.count || 0;
        const pendingTransactions =
          transactionMetrics[0]?.pendingTransactions[0]?.count || 0;
        const currentHourInvestments =
          transactionMetrics[0]?.currentHourInvestments[0]?.count || 0;
        const currentHourRepayments =
          transactionMetrics[0]?.currentHourRepayments[0]?.count || 0;
        const currentHourApplications =
          applicationMetrics[0]?.currentHourApplications[0]?.count || 0;

        const systemLoad = getSystemLoad();

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
            repayments: currentHourRepayments,
          },
          todayStats: await getTodayStats(),
        };

        return response;
      },
      {
        ttl: 30, // 30 seconds cache for real-time data
        params: { hour: new Date().getHours() },
        tags: ['dashboard', 'realtime'],
      }
    ).then((data) => res.json(formatSuccessResponse(data, req)));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
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

// Optimized performance metrics function using aggregation pipelines
const getPerformanceMetrics = async (startDate, endDate) => {
  const [kycMetrics, applicationMetrics, transactionMetrics] =
    await Promise.all([
      // KYC approval rate aggregation
      KYCDocument.aggregate([
        {
          $facet: {
            total: [
              { $match: { uploadedAt: { $gte: startDate, $lte: endDate } } },
              { $count: 'count' },
            ],
            approved: [
              {
                $match: {
                  verificationStatus: 'verified',
                  reviewedAt: { $gte: startDate, $lte: endDate },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Application metrics aggregation
      SolarApplication.aggregate([
        {
          $facet: {
            submitted: [
              { $match: { submittedAt: { $gte: startDate, $lte: endDate } } },
              { $count: 'count' },
            ],
            approved: [
              {
                $match: {
                  applicationStatus: 'approved',
                  approvedAt: { $gte: startDate, $lte: endDate },
                },
              },
              { $count: 'count' },
            ],
            installed: [
              {
                $match: {
                  applicationStatus: 'installed',
                  installedAt: { $gte: startDate, $lte: endDate },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Transaction metrics for repayment rate
      Transaction.aggregate([
        {
          $facet: {
            totalRepayments: [
              {
                $match: {
                  type: 'repayment',
                  status: 'completed',
                  completedAt: { $gte: startDate, $lte: endDate },
                },
              },
              { $count: 'count' },
            ],
            onTimeRepayments: [
              {
                $match: {
                  type: 'repayment',
                  status: 'completed',
                  completedAt: { $gte: startDate, $lte: endDate },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]),
    ]);

  // Extract and calculate rates
  const kycTotal = kycMetrics[0]?.total[0]?.count || 0;
  const kycApproved = kycMetrics[0]?.approved[0]?.count || 0;
  const kycApprovalRate =
    kycTotal > 0 ? Math.round((kycApproved / kycTotal) * 100 * 10) / 10 : 0;

  const applicationsSubmitted = applicationMetrics[0]?.submitted[0]?.count || 0;
  const applicationsApproved = applicationMetrics[0]?.approved[0]?.count || 0;
  const applicationsInstalled = applicationMetrics[0]?.installed[0]?.count || 0;
  const applicationApprovalRate =
    applicationsSubmitted > 0
      ? Math.round((applicationsApproved / applicationsSubmitted) * 100 * 10) /
        10
      : 0;
  const installationCompletionRate =
    applicationsApproved > 0
      ? Math.round((applicationsInstalled / applicationsApproved) * 100 * 10) /
        10
      : 0;

  const totalRepayments = transactionMetrics[0]?.totalRepayments[0]?.count || 0;
  const onTimeRepayments =
    transactionMetrics[0]?.onTimeRepayments[0]?.count || 0;
  const repaymentRate =
    totalRepayments > 0
      ? Math.round((onTimeRepayments / totalRepayments) * 100 * 10) / 10
      : 0;

  return {
    kycApprovalRate,
    applicationApprovalRate,
    installationCompletionRate,
    repaymentRate,
    customerSatisfactionScore: await calculateCustomerSatisfactionScore(),
  };
};

const calculateCustomerSatisfactionScore = async () => {
  // Mock implementation - in production, this would come from customer surveys
  return 4.2;
};

const getRecentActivity = async () => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  // Optimized aggregation for recent activity
  const [userMetrics, applicationMetrics, transactionMetrics] =
    await Promise.all([
      // User metrics
      User.aggregate([
        {
          $facet: {
            newUsersToday: [
              { $match: { createdAt: { $gte: today } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Application metrics
      SolarApplication.aggregate([
        {
          $facet: {
            newApplicationsToday: [
              { $match: { submittedAt: { $gte: today } } },
              { $count: 'count' },
            ],
            completedInstallationsToday: [
              { $match: { installedAt: { $gte: today } } },
              { $count: 'count' },
            ],
          },
        },
      ]),

      // Transaction metrics
      Transaction.aggregate([
        {
          $facet: {
            newInvestmentsToday: [
              {
                $match: {
                  type: 'investment',
                  completedAt: { $gte: today },
                },
              },
              { $count: 'count' },
            ],
            repaymentsProcessedToday: [
              {
                $match: {
                  type: 'repayment',
                  completedAt: { $gte: today },
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]),
    ]);

  return {
    newUsersToday: userMetrics[0]?.newUsersToday[0]?.count || 0,
    newApplicationsToday:
      applicationMetrics[0]?.newApplicationsToday[0]?.count || 0,
    newInvestmentsToday:
      transactionMetrics[0]?.newInvestmentsToday[0]?.count || 0,
    completedInstallationsToday:
      applicationMetrics[0]?.completedInstallationsToday[0]?.count || 0,
    repaymentsProcessedToday:
      transactionMetrics[0]?.repaymentsProcessedToday[0]?.count || 0,
  };
};

const getTodayStats = async () => {
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  // Optimized aggregation for today's stats
  const [applicationMetrics, transactionMetrics] = await Promise.all([
    // Application metrics
    SolarApplication.aggregate([
      {
        $facet: {
          todayApplications: [
            { $match: { createdAt: { $gte: today } } },
            { $count: 'count' },
          ],
        },
      },
    ]),

    // Transaction metrics
    Transaction.aggregate([
      {
        $facet: {
          todayInvestments: [
            {
              $match: {
                type: 'investment',
                completedAt: { $gte: today },
              },
            },
            { $count: 'count' },
          ],
          todayRepayments: [
            {
              $match: {
                type: 'repayment',
                completedAt: { $gte: today },
              },
            },
            { $count: 'count' },
          ],
          todayRevenue: [
            {
              $match: {
                status: 'completed',
                completedAt: { $gte: today },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
            { $project: { _id: 0, total: 1 } },
          ],
        },
      },
    ]),
  ]);

  return {
    applications: applicationMetrics[0]?.todayApplications[0]?.count || 0,
    investments: transactionMetrics[0]?.todayInvestments[0]?.count || 0,
    repayments: transactionMetrics[0]?.todayRepayments[0]?.count || 0,
    revenue: transactionMetrics[0]?.todayRevenue[0]?.total || 0,
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
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cpu: {
        user: 0,
        system: 0,
      },
    },
    responseTime: Math.round(Math.random() * 200 + 50), // Mock response time
  };
};

// Helper function to invalidate dashboard cache when data changes
export const invalidateDashboardData = async () => {
  try {
    await invalidateDashboardCache();
  } catch (error) {
    console.error('Error invalidating dashboard cache:', error);
  }
};

export default {
  getDashboardOverview,
  getRealtimeMetrics,
  invalidateDashboardData,
};
