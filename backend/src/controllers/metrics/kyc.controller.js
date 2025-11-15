import KYCDocument from "../../models/metrics/kycDocument.model.js";
import User from "../../models/user.model.js";
import SolarApplication from "../../models/metrics/solarApplication.model.js";
import Investor from "../../models/metrics/investor.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { getPaginationOptions, buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

export const getKYCMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic KYC metrics
    const [
      totalDocuments,
      verifiedDocuments,
      pendingDocuments,
      rejectedDocuments,
      underReviewDocuments,
      documentTypeBreakdown,
      verificationStatusBreakdown,
      processingTimeStats,
      verificationScoreStats
    ] = await Promise.all([
      KYCDocument.countDocuments(query),
      KYCDocument.countDocuments({ ...query, verificationStatus: 'verified' }),
      KYCDocument.countDocuments({ ...query, verificationStatus: 'pending' }),
      KYCDocument.countDocuments({ ...query, verificationStatus: 'rejected' }),
      KYCDocument.countDocuments({ ...query, verificationStatus: 'under_review' }),
      KYCDocument.aggregate([
        { $match: query },
        { $group: { _id: "$documentType", count: { $sum: 1 } } }
      ]),
      KYCDocument.aggregate([
        { $match: query },
        { $group: { _id: "$verificationStatus", count: { $sum: 1 } } }
      ]),
      getProcessingTimeStats(startDate, endDate),
      getVerificationScoreStats(startDate, endDate)
    ]);
    
    // Calculate growth metrics
    const previousPeriodStart = new Date(startDate.getTime() - (endDate - startDate));
    const previousPeriodEnd = new Date(startDate.getTime() - 1);
    
    const [previousDocuments, previousVerified] = await Promise.all([
      KYCDocument.countDocuments({ 
        uploadedAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd } 
      }),
      KYCDocument.countDocuments({ 
        verificationStatus: 'verified',
        reviewedAt: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
      })
    ]);
    
    const documentGrowth = calculateGrowth(totalDocuments, previousDocuments);
    const verificationGrowth = calculateGrowth(verifiedDocuments, previousVerified);
    
    // Get performance metrics
    const performanceMetrics = await getKYCPerformanceMetrics(query, startDate, endDate);
    
    const response = {
      summary: {
        totalDocuments,
        verifiedDocuments,
        pendingDocuments,
        rejectedDocuments,
        underReviewDocuments,
        verificationRate: totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0,
        rejectionRate: totalDocuments > 0 ? (rejectedDocuments / totalDocuments) * 100 : 0,
        averageProcessingTime: processingTimeStats.average,
        averageVerificationScore: verificationScoreStats.average
      },
      growth: {
        documentGrowth,
        verificationGrowth
      },
      breakdowns: {
        documentType: formatBreakdown(documentTypeBreakdown),
        verificationStatus: formatBreakdown(verificationStatusBreakdown)
      },
      performance: performanceMetrics,
      processingTime: processingTimeStats,
      verificationScores: verificationScoreStats,
      trends: await getKYCTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getKYCDetails = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await KYCDocument.findById(documentId)
      .populate('userId', 'name email')
      .populate('applicationId', 'applicationId')
      .populate('reviewedBy', 'name email');
    
    if (!document) {
      return res.status(404).json(formatErrorResponse({
        code: 'KYC_DOCUMENT_NOT_FOUND',
        message: 'KYC document not found'
      }, req, 404));
    }
    
    // Get related user information
    const user = await User.findById(document.userId);
    const userApplications = await SolarApplication.find({ userId: document.userId });
    const userInvestments = await Investment.find({ 
      userId: document.userId 
    }).populate('applicationId', 'applicationId');
    
    // Get document history if available
    const documentHistory = await getDocumentHistory(document);
    
    const response = {
      document: {
        id: document._id,
        documentType: document.documentType,
        documentUrl: document.documentUrl,
        documentNumber: document.documentNumber,
        issuingAuthority: document.issuingAuthority,
        issueDate: document.issueDate,
        expiryDate: document.expiryDate,
        verificationStatus: document.verificationStatus,
        verificationScore: document.verificationScore,
        rejectionReason: document.rejectionReason,
        uploadedAt: document.uploadedAt,
        reviewedAt: document.reviewedAt,
        processingTime: document.processingTime,
        isExpired: document.isExpired,
        daysUntilExpiry: document.daysUntilExpiry,
        hasHighConfidence: document.hasHighConfidence,
        hasFlags: document.hasFlags
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      relatedApplication: document.applicationId,
      reviewer: document.reviewedBy,
      aiAnalysis: document.aiAnalysis,
      userApplications: userApplications.map(app => ({
        id: app._id,
        applicationId: app.applicationId,
        status: app.applicationStatus,
        kycStatus: app.kycStatus
      })),
      userInvestments: userInvestments.map(inv => ({
        id: inv._id,
        investmentId: inv.investmentId,
        applicationId: inv.applicationId?.applicationId,
        status: inv.status,
        amount: inv.amount
      })),
      documentHistory
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getKYCList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = getPaginationOptions(req.query);
    
    const documents = await KYCDocument.find(query)
      .populate('userId', 'name email')
      .populate('applicationId', 'applicationId')
      .populate('reviewedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await KYCDocument.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: documents.map(doc => ({
        id: doc._id,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus,
        verificationScore: doc.verificationScore,
        user: doc.userId,
        applicationId: doc.applicationId?.applicationId,
        reviewer: doc.reviewedBy,
        uploadedAt: doc.uploadedAt,
        reviewedAt: doc.reviewedAt,
        processingTime: doc.processingTime,
        isExpired: doc.isExpired,
        hasFlags: doc.hasFlags
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getKYCPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    const performanceMetrics = await getKYCPerformanceMetrics(query, startDate, endDate);
    
    // Get processing time distribution
    const processingTimeDistribution = await KYCDocument.aggregate([
      { $match: { ...query, processingTime: { $exists: true } } },
      {
        $bucket: {
          groupBy: "$processingTime",
          boundaries: [0, 1, 2, 3, 5, 7, 14, 30],
          default: "other",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Get verification score distribution
    const scoreDistribution = await KYCDocument.aggregate([
      { $match: { ...query, verificationScore: { $exists: true } } },
      {
        $bucket: {
          groupBy: "$verificationScore",
          boundaries: [0, 50, 70, 80, 90, 95, 100],
          default: "other",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Get reviewer performance
    const reviewerPerformance = await KYCDocument.aggregate([
      { $match: { ...query, reviewedBy: { $exists: true } } },
      {
        $group: {
          _id: "$reviewedBy",
          totalReviewed: { $sum: 1 },
          verified: {
            $sum: {
              $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["verificationStatus", "rejected"] }, 1, 0]
            }
          },
          avgProcessingTime: { $avg: "$processingTime" },
          avgScore: { $avg: "$verificationScore" }
        }
      },
      {
        $addFields: {
          approvalRate: {
            $multiply: [
              { $divide: ["$verified", "$totalReviewed"] },
              100
            ]
          }
        }
      },
      { $sort: { totalReviewed: -1 } }
    ]);
    
    // Populate reviewer information
    const populatedReviewerPerformance = await KYCDocument.populate(reviewerPerformance, {
      path: '_id',
      select: 'name email'
    });
    
    const response = {
      ...performanceMetrics,
      processingTimeDistribution: processingTimeDistribution.map(bucket => ({
        range: bucket._id === 'other' ? 'Other' : `${bucket._id - 1}-${bucket._id} days`,
        count: bucket.count
      })),
      scoreDistribution: scoreDistribution.map(bucket => ({
        range: bucket._id === 'other' ? 'Other' : `${bucket._id - 1}-${bucket._id}`,
        count: bucket.count
      })),
      reviewerPerformance: populatedReviewerPerformance.map(item => ({
        reviewer: item._id,
        totalReviewed: item.totalReviewed,
        verified: item.verified,
        rejected: item.rejected,
        approvalRate: Math.round(item.approvalRate * 10) / 10,
        avgProcessingTime: Math.round(item.avgProcessingTime * 10) / 10,
        avgScore: Math.round(item.avgScore * 10) / 10
      }))
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getKYCAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get document type success rates
    const typeSuccessRates = await KYCDocument.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            type: "$documentType",
            status: "$verificationStatus"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.type",
          total: { $sum: "$count" },
          verified: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "verified"] }, "$count", 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ["$_id.status", "rejected"] }, "$count", 0]
            }
          }
        }
      },
      {
        $addFields: {
          successRate: {
            $multiply: [
              { $divide: ["$verified", "$total"] },
              100
            ]
          },
          rejectionRate: {
            $multiply: [
              { $divide: ["$rejected", "$total"] },
              100
            ]
          }
        }
      }
    ]);
    
    // Get AI analysis insights
    const aiInsights = await KYCDocument.aggregate([
      { $match: { ...query, "aiAnalysis.flags": { $exists: true, $ne: [] } } },
      {
        $group: {
          _id: "$aiAnalysis.flags",
          count: { $sum: 1 },
          avgAuthenticityScore: { $avg: "$aiAnalysis.authenticityScore" }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get expiry analysis
    const expiryAnalysis = await KYCDocument.aggregate([
      { $match: { ...query, expiryDate: { $exists: true } } },
      {
        $bucket: {
          groupBy: {
            $divide: [
              { $subtract: ["$expiryDate", new Date()] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          },
          boundaries: [-30, 0, 30, 90, 180, 365],
          default: "other",
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);
    
    // Get document quality trends
    const qualityTrends = await KYCDocument.aggregate([
      {
        $match: {
          uploadedAt: { $gte: startDate, $lte: endDate },
          verificationScore: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$uploadedAt" },
            month: { $month: "$uploadedAt" }
          },
          avgScore: { $avg: "$verificationScore" },
          count: { $sum: 1 },
          highConfidence: {
            $sum: {
              $cond: [{ $gte: ["$verificationScore", 90] }, 1, 0]
            }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    const response = {
      typeSuccessRates: typeSuccessRates.map(item => ({
        documentType: item._id,
        total: item.total,
        verified: item.verified,
        rejected: item.rejected,
        successRate: Math.round(item.successRate * 10) / 10,
        rejectionRate: Math.round(item.rejectionRate * 10) / 10
      })),
      aiInsights: aiInsights.map(item => ({
        flags: item._id,
        count: item.count,
        avgAuthenticityScore: Math.round(item.avgAuthenticityScore * 10) / 10
      })),
      expiryAnalysis: expiryAnalysis.map(bucket => ({
        range: bucket._id === 'other' ? 'Other' : getExpiryRangeLabel(bucket._id),
        count: bucket.count
      })),
      qualityTrends: qualityTrends.map(item => ({
        month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
        avgScore: Math.round(item.avgScore * 10) / 10,
        count: item.count,
        highConfidenceRate: item.count > 0 ? (item.highConfidence / item.count) * 100 : 0
      }))
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getProcessingTimeStats = async (startDate, endDate) => {
  const processingTimes = await KYCDocument.aggregate([
    {
      $match: {
        uploadedAt: { $gte: startDate, $lte: endDate },
        processingTime: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$processingTime" },
        minimum: { $min: "$processingTime" },
        maximum: { $max: "$processingTime" }
      }
    }
  ]);
  
  return {
    average: processingTimes[0]?.average || 0,
    minimum: processingTimes[0]?.minimum || 0,
    maximum: processingTimes[0]?.maximum || 0
  };
};

const getVerificationScoreStats = async (startDate, endDate) => {
  const scores = await KYCDocument.aggregate([
    {
      $match: {
        uploadedAt: { $gte: startDate, $lte: endDate },
        verificationScore: { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$verificationScore" },
        minimum: { $min: "$verificationScore" },
        maximum: { $max: "$verificationScore" }
      }
    }
  ]);
  
  return {
    average: scores[0]?.average || 0,
    minimum: scores[0]?.minimum || 0,
    maximum: scores[0]?.maximum || 0
  };
};

const getKYCPerformanceMetrics = async (query, startDate, endDate) => {
  const [totalDocuments, verifiedDocuments, rejectedDocuments, avgProcessingTime] = await Promise.all([
    KYCDocument.countDocuments(query),
    KYCDocument.countDocuments({ ...query, verificationStatus: 'verified' }),
    KYCDocument.countDocuments({ ...query, verificationStatus: 'rejected' }),
    KYCDocument.aggregate([
      { $match: { ...query, processingTime: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: "$processingTime" } } }
    ])
  ]);
  
  const verificationRate = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;
  const rejectionRate = totalDocuments > 0 ? (rejectedDocuments / totalDocuments) * 100 : 0;
  
  return {
    totalDocuments,
    verifiedDocuments,
    rejectedDocuments,
    verificationRate: Math.round(verificationRate * 10) / 10,
    rejectionRate: Math.round(rejectionRate * 10) / 10,
    averageProcessingTime: avgProcessingTime[0]?.avgTime || 0
  };
};

const getKYCTrends = async (startDate, endDate) => {
  // Get daily document uploads
  const dailyUploads = await KYCDocument.aggregate([
    {
      $match: {
        uploadedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$uploadedAt" },
          month: { $month: "$uploadedAt" },
          day: { $dayOfMonth: "$uploadedAt" }
        },
        count: { $sum: 1 },
        verified: {
          $sum: {
            $cond: [{ $eq: ["$verificationStatus", "verified"] }, 1, 0]
          }
        }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);
  
  // Get monthly verification trends
  const monthlyVerification = await KYCDocument.aggregate([
    {
      $match: {
        reviewedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$reviewedAt" },
          month: { $month: "$reviewedAt" },
          status: "$verificationStatus"
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.status": 1 } }
  ]);
  
  return {
    dailyUploads: dailyUploads.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      count: item.count,
      verified: item.verified,
      verificationRate: item.count > 0 ? (item.verified / item.count) * 100 : 0
    })),
    monthlyVerification: monthlyVerification.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      status: item._id.status,
      count: item.count
    }))
  };
};

const getDocumentHistory = async (document) => {
  // This would typically come from an audit log or document version history
  // For now, we'll return a mock structure
  return [
    {
      action: 'uploaded',
      timestamp: document.uploadedAt,
      performedBy: document.userId,
      details: 'Document uploaded by user'
    },
    ...(document.reviewedAt ? [{
      action: 'reviewed',
      timestamp: document.reviewedAt,
      performedBy: document.reviewedBy,
      details: `Document ${document.verificationStatus} by reviewer`
    }] : [])
  ];
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
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

const getExpiryRangeLabel = (days) => {
  if (days < 0) return 'Expired';
  if (days <= 30) return 'Expiring Soon';
  if (days <= 90) return 'Expiring in 3 months';
  if (days <= 180) return 'Expiring in 6 months';
  if (days <= 365) return 'Expiring in 1 year';
  return 'Valid for over 1 year';
};

export default {
  getKYCMetrics,
  getKYCDetails,
  getKYCList,
  getKYCPerformanceReport,
  getKYCAnalytics
};