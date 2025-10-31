import User from "../../models/user.model.js";
import Investor from "../../models/metrics/investor.model.js";
import SolarApplication from "../../models/metrics/solarApplication.model.js";
import Transaction from "../../models/metrics/transaction.model.js";
import Investment from "../../models/metrics/investment.model.js";
import KYCDocument from "../../models/metrics/kycDocument.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";

export const generateFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const { startDate: parsedStart, endDate: parsedEnd } = parseDateRange(req.query);
    
    // Get financial metrics
    const [
      totalInvestments,
      totalRepayments,
      totalFees,
      investmentVolume,
      repaymentVolume,
      feeVolume,
      monthlyFinancials,
      investorReturns,
      paymentMethodBreakdown
    ] = await Promise.all([
      Transaction.countDocuments({ 
        type: 'investment', 
        status: 'completed',
        completedAt: { $gte: parsedStart, $lte: parsedEnd }
      }),
      Transaction.countDocuments({ 
        type: 'repayment', 
        status: 'completed',
        completedAt: { $gte: parsedStart, $lte: parsedEnd }
      }),
      Transaction.countDocuments({ 
        type: 'fee', 
        status: 'completed',
        completedAt: { $gte: parsedStart, $lte: parsedEnd }
      }),
      Transaction.aggregate([
        { $match: { 
          type: 'investment', 
          status: 'completed',
          completedAt: { $gte: parsedStart, $lte: parsedEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { 
          type: 'repayment', 
          status: 'completed',
          completedAt: { $gte: parsedStart, $lte: parsedEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { 
          type: 'fee', 
          status: 'completed',
          completedAt: { $gte: parsedStart, $lte: parsedEnd }
        }},
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      getMonthlyFinancials(parsedStart, parsedEnd),
      getInvestorReturns(parsedStart, parsedEnd),
      getPaymentMethodBreakdown(parsedStart, parsedEnd)
    ]);
    
    // Calculate financial ratios
    const netRevenue = (repaymentVolume[0]?.total || 0) - (investmentVolume[0]?.total || 0);
    const totalRevenue = (repaymentVolume[0]?.total || 0) + (feeVolume[0]?.total || 0);
    const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0;
    
    const report = {
      reportType: 'financial',
      period: {
        startDate: parsedStart.toISOString(),
        endDate: parsedEnd.toISOString()
      },
      summary: {
        totalInvestments,
        totalRepayments,
        totalFees,
        investmentVolume: investmentVolume[0]?.total || 0,
        repaymentVolume: repaymentVolume[0]?.total || 0,
        feeVolume: feeVolume[0]?.total || 0,
        netRevenue,
        totalRevenue,
        profitMargin: Math.round(profitMargin * 100) / 100
      },
      monthlyBreakdown: monthlyFinancials,
      investorReturns,
      paymentMethodBreakdown,
      generatedAt: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return generateCSVResponse(res, report, 'financial-report');
    }
    
    return res.json(formatSuccessResponse(report, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const generateOperationalReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const { startDate: parsedStart, endDate: parsedEnd } = parseDateRange(req.query);
    
    // Get operational metrics
    const [
      userMetrics,
      applicationMetrics,
      kycMetrics,
      investorMetrics,
      transactionMetrics,
      systemPerformance,
      regionalBreakdown
    ] = await Promise.all([
      getUserOperationalMetrics(parsedStart, parsedEnd),
      getApplicationOperationalMetrics(parsedStart, parsedEnd),
      getKYCOperationalMetrics(parsedStart, parsedEnd),
      getInvestorOperationalMetrics(parsedStart, parsedEnd),
      getTransactionOperationalMetrics(parsedStart, parsedEnd),
      getSystemPerformanceMetrics(parsedStart, parsedEnd),
      getRegionalBreakdown(parsedStart, parsedEnd)
    ]);
    
    const report = {
      reportType: 'operational',
      period: {
        startDate: parsedStart.toISOString(),
        endDate: parsedEnd.toISOString()
      },
      summary: {
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
        totalApplications: applicationMetrics.totalApplications,
        approvedApplications: applicationMetrics.approvedApplications,
        completedInstallations: applicationMetrics.completedInstallations,
        totalInvestors: investorMetrics.totalInvestors,
        activeInvestors: investorMetrics.activeInvestors,
        totalTransactions: transactionMetrics.totalTransactions,
        systemUptime: systemPerformance.uptime
      },
      details: {
        users: userMetrics,
        applications: applicationMetrics,
        kyc: kycMetrics,
        investors: investorMetrics,
        transactions: transactionMetrics,
        systemPerformance,
        regionalBreakdown
      },
      generatedAt: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return generateCSVResponse(res, report, 'operational-report');
    }
    
    return res.json(formatSuccessResponse(report, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const generateComplianceReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const { startDate: parsedStart, endDate: parsedEnd } = parseDateRange(req.query);
    
    // Get compliance metrics
    const [
      kycCompliance,
      transactionCompliance,
      investorCompliance,
      auditTrail,
      riskAssessment,
      regulatoryMetrics
    ] = await Promise.all([
      getKYCComplianceMetrics(parsedStart, parsedEnd),
      getTransactionComplianceMetrics(parsedStart, parsedEnd),
      getInvestorComplianceMetrics(parsedStart, parsedEnd),
      getAuditTrail(parsedStart, parsedEnd),
      getRiskAssessment(parsedStart, parsedEnd),
      getRegulatoryMetrics(parsedStart, parsedEnd)
    ]);
    
    const report = {
      reportType: 'compliance',
      period: {
        startDate: parsedStart.toISOString(),
        endDate: parsedEnd.toISOString()
      },
      summary: {
        overallComplianceScore: calculateOverallComplianceScore([
          kycCompliance.complianceScore,
          transactionCompliance.complianceScore,
          investorCompliance.complianceScore
        ]),
        kycComplianceRate: kycCompliance.complianceRate,
        transactionComplianceRate: transactionCompliance.complianceRate,
        investorComplianceRate: investorCompliance.complianceRate,
        highRiskTransactions: transactionCompliance.highRiskTransactions,
        auditIssues: auditTrail.issues.length
      },
      details: {
        kyc: kycCompliance,
        transactions: transactionCompliance,
        investors: investorCompliance,
        auditTrail,
        riskAssessment,
        regulatory: regulatoryMetrics
      },
      generatedAt: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return generateCSVResponse(res, report, 'compliance-report');
    }
    
    return res.json(formatSuccessResponse(report, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const generatePerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    const { startDate: parsedStart, endDate: parsedEnd } = parseDateRange(req.query);
    
    // Get performance metrics
    const [
      investmentPerformance,
      investorPerformance,
      systemPerformance,
      userEngagement,
      applicationPerformance,
      transactionPerformance
    ] = await Promise.all([
      getInvestmentPerformanceMetrics(parsedStart, parsedEnd),
      getInvestorPerformanceMetrics(parsedStart, parsedEnd),
      getSystemPerformanceMetrics(parsedStart, parsedEnd),
      getUserEngagementMetrics(parsedStart, parsedEnd),
      getApplicationPerformanceMetrics(parsedStart, parsedEnd),
      getTransactionPerformanceMetrics(parsedStart, parsedEnd)
    ]);
    
    const report = {
      reportType: 'performance',
      period: {
        startDate: parsedStart.toISOString(),
        endDate: parsedEnd.toISOString()
      },
      summary: {
        averageROI: investmentPerformance.averageROI,
        totalReturns: investmentPerformance.totalReturns,
        investorSatisfactionScore: investorPerformance.satisfactionScore,
        systemResponseTime: systemPerformance.averageResponseTime,
        userEngagementRate: userEngagement.engagementRate,
        applicationApprovalRate: applicationPerformance.approvalRate,
        transactionSuccessRate: transactionPerformance.successRate
      },
      details: {
        investments: investmentPerformance,
        investors: investorPerformance,
        system: systemPerformance,
        userEngagement,
        applications: applicationPerformance,
        transactions: transactionPerformance
      },
      generatedAt: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return generateCSVResponse(res, report, 'performance-report');
    }
    
    return res.json(formatSuccessResponse(report, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getReportList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    
    // Get available reports
    const reports = [
      {
        id: 'financial',
        name: 'Financial Report',
        description: 'Comprehensive financial metrics including investments, repayments, and revenue',
        category: 'financial',
        availableFormats: ['json', 'csv'],
        lastGenerated: await getLastReportDate('financial'),
        schedule: 'monthly'
      },
      {
        id: 'operational',
        name: 'Operational Report',
        description: 'Daily operational metrics and system performance indicators',
        category: 'operational',
        availableFormats: ['json', 'csv'],
        lastGenerated: await getLastReportDate('operational'),
        schedule: 'daily'
      },
      {
        id: 'compliance',
        name: 'Compliance Report',
        description: 'Regulatory compliance metrics and audit trail information',
        category: 'compliance',
        availableFormats: ['json', 'csv'],
        lastGenerated: await getLastReportDate('compliance'),
        schedule: 'weekly'
      },
      {
        id: 'performance',
        name: 'Performance Report',
        description: 'Investment performance and ROI analysis',
        category: 'performance',
        availableFormats: ['json', 'csv'],
        lastGenerated: await getLastReportDate('performance'),
        schedule: 'monthly'
      }
    ];
    
    const response = {
      reports,
      filters: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const scheduleReport = async (req, res) => {
  try {
    const { reportId, schedule, recipients, format = 'json' } = req.body;
    
    // Validate report exists
    const validReports = ['financial', 'operational', 'compliance', 'performance'];
    if (!validReports.includes(reportId)) {
      return res.status(400).json(formatErrorResponse({
        code: 'INVALID_REPORT_ID',
        message: 'Invalid report ID'
      }, req, 400));
    }
    
    // Validate schedule
    const validSchedules = ['daily', 'weekly', 'monthly', 'quarterly'];
    if (!validSchedules.includes(schedule)) {
      return res.status(400).json(formatErrorResponse({
        code: 'INVALID_SCHEDULE',
        message: 'Invalid schedule frequency'
      }, req, 400));
    }
    
    // In a real implementation, this would save to a database
    const scheduledReport = {
      id: generateReportId(),
      reportId,
      schedule,
      recipients,
      format,
      createdAt: new Date(),
      nextRun: calculateNextRun(schedule),
      isActive: true
    };
    
    const response = {
      message: 'Report scheduled successfully',
      scheduledReport
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getMonthlyFinancials = async (startDate, endDate) => {
  return Transaction.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$completedAt" },
          month: { $month: "$completedAt" },
          type: "$type"
        },
        count: { $sum: 1 },
        volume: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.type": 1 } }
  ]);
};

const getInvestorReturns = async (startDate, endDate) => {
  return Investor.aggregate([
    {
      $match: {
        isActive: true
      }
    },
    {
      $group: {
        _id: null,
        totalInvested: { $sum: "$totalInvested" },
        totalReturns: { $sum: "$actualReturns" },
        averageROI: { $avg: "$roi" },
        totalInvestors: { $sum: 1 }
      }
    }
  ]);
};

const getPaymentMethodBreakdown = async (startDate, endDate) => {
  return Transaction.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        volume: { $sum: "$amount" }
      }
    },
    { $sort: { volume: -1 } }
  ]);
};

const getUserOperationalMetrics = async (startDate, endDate) => {
  const [totalUsers, activeUsers, newUsers] = await Promise.all([
    User.countDocuments({ createdAt: { $lte: endDate } }),
    User.countDocuments({ 
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }),
    User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } })
  ]);
  
  return { totalUsers, activeUsers, newUsers };
};

const getApplicationOperationalMetrics = async (startDate, endDate) => {
  const [totalApplications, approvedApplications, completedInstallations] = await Promise.all([
    SolarApplication.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'approved',
      approvedAt: { $gte: startDate, $lte: endDate }
    }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'installed',
      installedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return { totalApplications, approvedApplications, completedInstallations };
};

const getKYCOperationalMetrics = async (startDate, endDate) => {
  const [totalDocuments, verifiedDocuments] = await Promise.all([
    KYCDocument.countDocuments({ uploadedAt: { $gte: startDate, $lte: endDate } }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'verified',
      reviewedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const complianceRate = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;
  
  return { totalDocuments, verifiedDocuments, complianceRate };
};

const getInvestorOperationalMetrics = async (startDate, endDate) => {
  const [totalInvestors, activeInvestors] = await Promise.all([
    Investor.countDocuments({ createdAt: { $lte: endDate } }),
    Investor.countDocuments({ isActive: true })
  ]);
  
  return { totalInvestors, activeInvestors };
};

const getTransactionOperationalMetrics = async (startDate, endDate) => {
  const totalTransactions = await Transaction.countDocuments({ 
    createdAt: { $gte: startDate, $lte: endDate } 
  });
  
  return { totalTransactions };
};

const getSystemPerformanceMetrics = async (startDate, endDate) => {
  // Mock system performance metrics
  return {
    uptime: 99.9,
    averageResponseTime: 150,
    errorRate: 0.1,
    throughput: 1000
  };
};

const getRegionalBreakdown = async (startDate, endDate) => {
  return SolarApplication.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: "$personalInfo.state",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const getKYCComplianceMetrics = async (startDate, endDate) => {
  const [totalDocuments, verifiedDocuments] = await Promise.all([
    KYCDocument.countDocuments({ uploadedAt: { $gte: startDate, $lte: endDate } }),
    KYCDocument.countDocuments({ 
      verificationStatus: 'verified',
      reviewedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const complianceRate = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;
  const complianceScore = Math.min(complianceRate, 100);
  
  return {
    totalDocuments,
    verifiedDocuments,
    complianceRate: Math.round(complianceRate * 10) / 10,
    complianceScore
  };
};

const getTransactionComplianceMetrics = async (startDate, endDate) => {
  const [totalTransactions, compliantTransactions] = await Promise.all([
    Transaction.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Transaction.countDocuments({ 
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const complianceRate = totalTransactions > 0 ? (compliantTransactions / totalTransactions) * 100 : 0;
  const complianceScore = Math.min(complianceRate, 100);
  
  return {
    totalTransactions,
    compliantTransactions,
    complianceRate: Math.round(complianceRate * 10) / 10,
    complianceScore,
    highRiskTransactions: Math.floor(totalTransactions * 0.05) // Mock calculation
  };
};

const getInvestorComplianceMetrics = async (startDate, endDate) => {
  const [totalInvestors, verifiedInvestors] = await Promise.all([
    Investor.countDocuments({ createdAt: { $lte: endDate } }),
    Investor.countDocuments({ verificationStatus: 'verified' })
  ]);
  
  const complianceRate = totalInvestors > 0 ? (verifiedInvestors / totalInvestors) * 100 : 0;
  const complianceScore = Math.min(complianceRate, 100);
  
  return {
    totalInvestors,
    verifiedInvestors,
    complianceRate: Math.round(complianceRate * 10) / 10,
    complianceScore
  };
};

const getAuditTrail = async (startDate, endDate) => {
  // Mock audit trail data
  return {
    totalAudits: 150,
    issues: [
      {
        severity: 'medium',
        description: 'Delayed KYC verification for some documents',
        count: 5
      }
    ]
  };
};

const getRiskAssessment = async (startDate, endDate) => {
  // Mock risk assessment
  return {
    overallRiskLevel: 'low',
    riskFactors: [
      {
        factor: 'Market volatility',
        level: 'medium',
        impact: 0.3
      }
    ]
  };
};

const getRegulatoryMetrics = async (startDate, endDate) => {
  // Mock regulatory metrics
  return {
    regulatoryComplianceScore: 95,
    pendingRegulatoryChanges: 2,
    lastAuditDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  };
};

const getInvestmentPerformanceMetrics = async (startDate, endDate) => {
  const investments = await Investment.find({
    startDate: { $gte: startDate, $lte: endDate }
  });
  
  const totalReturns = investments.reduce((sum, inv) => sum + inv.actualReturn, 0);
  const averageROI = investments.length > 0 ? 
    investments.reduce((sum, inv) => sum + inv.currentROI, 0) / investments.length : 0;
  
  return {
    totalInvestments: investments.length,
    totalReturns,
    averageROI: Math.round(averageROI * 100) / 100
  };
};

const getInvestorPerformanceMetrics = async (startDate, endDate) => {
  // Mock investor performance metrics
  return {
    satisfactionScore: 4.2,
    retentionRate: 85,
    netPromoterScore: 72
  };
};

const getUserEngagementMetrics = async (startDate, endDate) => {
  const [totalUsers, activeUsers] = await Promise.all([
    User.countDocuments({ createdAt: { $lte: endDate } }),
    User.countDocuments({ 
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);
  
  const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  
  return {
    totalUsers,
    activeUsers,
    engagementRate: Math.round(engagementRate * 10) / 10
  };
};

const getApplicationPerformanceMetrics = async (startDate, endDate) => {
  const [totalApplications, approvedApplications] = await Promise.all([
    SolarApplication.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    SolarApplication.countDocuments({ 
      applicationStatus: 'approved',
      approvedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const approvalRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;
  
  return {
    totalApplications,
    approvedApplications,
    approvalRate: Math.round(approvalRate * 10) / 10
  };
};

const getTransactionPerformanceMetrics = async (startDate, endDate) => {
  const [totalTransactions, completedTransactions] = await Promise.all([
    Transaction.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    Transaction.countDocuments({ 
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0;
  
  return {
    totalTransactions,
    completedTransactions,
    successRate: Math.round(successRate * 10) / 10
  };
};

const calculateOverallComplianceScore = (scores) => {
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

const getLastReportDate = async (reportType) => {
  // Mock implementation - in reality, this would query a reports collection
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
};

const generateReportId = () => {
  return `RPT${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
};

const calculateNextRun = (schedule) => {
  const now = new Date();
  switch (schedule) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    case 'quarterly':
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
};

const generateCSVResponse = (res, data, filename) => {
  // Simplified CSV generation - in production, use a proper CSV library
  const csv = convertToCSV(data);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
  return res.send(csv);
};

const convertToCSV = (data) => {
  // Simplified CSV conversion - in production, use a proper CSV library
  return JSON.stringify(data, null, 2);
};

export default {
  generateFinancialReport,
  generateOperationalReport,
  generateComplianceReport,
  generatePerformanceReport,
  getReportList,
  scheduleReport
};