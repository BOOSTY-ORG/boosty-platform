import Investor from "../../models/metrics/investor.model.js";
import Investment from "../../models/metrics/investment.model.js";
import Transaction from "../../models/metrics/transaction.model.js";
import User from "../../models/user.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery, getQueryBuilder } from "../../middleware/metrics/queryBuilder.middleware.js";
import { getPaginationOptions, buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

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
    
    // Use the query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { createdAt: -1 };
    
    const investors = await Investor.find(query)
      .populate('userId', 'name email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Investor.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: investors.map(investor => ({
        id: investor._id,
        firstName: investor.firstName,
        lastName: investor.lastName,
        email: investor.email,
        phone: investor.phone,
        investorId: investor.investorId,
        status: investor.status || 'active',
        kycStatus: investor.kycStatus || 'not_submitted',
        totalInvestment: investor.totalInvested || 0,
        joinedDate: investor.createdAt,
        user: investor.userId,
        investorType: investor.investorType,
        verificationStatus: investor.verificationStatus,
        riskProfile: investor.riskProfile,
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

// Search investors
export const searchInvestors = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = getPaginationOptions(req.query);
    
    // Add search term to query if provided
    if (req.query.q) {
      const searchRegex = new RegExp(req.query.q, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { investorId: searchRegex }
      ];
    }
    
    const investors = await Investor.find(query)
      .populate('userId', 'name email')
      .sort(req.queryBuilder.sort || { createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Investor.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: investors.map(investor => ({
        id: investor._id,
        firstName: investor.firstName,
        lastName: investor.lastName,
        email: investor.email,
        phone: investor.phone,
        investorId: investor.investorId,
        status: investor.status,
        kycStatus: investor.kycStatus,
        totalInvestment: investor.totalInvested || 0,
        joinedDate: investor.createdAt,
        user: investor.userId
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
    
    // Get total count for percentage calculation
    const totalInvestors = await Investor.countDocuments(query);
    
    const response = {
      ...performanceMetrics,
      roiDistribution: roiDistribution.map(bucket => ({
        range: `${bucket._id}%`,
        count: bucket.count,
        percentage: (bucket.count / totalInvestors) * 100
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

// Create new investor
export const createInvestor = async (req, res) => {
  try {
    const investorData = {
      ...req.body,
      userId: req.user?.id || req.body.userId, // Use authenticated user ID or provided ID
      createdAt: new Date(),
      isActive: true,
      verificationStatus: 'pending'
    };

    const investor = new Investor(investorData);
    await investor.save();

    return res.status(201).json(formatSuccessResponse(investor, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Update investor
export const updateInvestor = async (req, res) => {
  try {
    const { investorId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const investor = await Investor.findByIdAndUpdate(
      investorId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!investor) {
      return res.status(404).json(formatErrorResponse({
        code: 'INVESTOR_NOT_FOUND',
        message: 'Investor not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(investor, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Delete investor
export const deleteInvestor = async (req, res) => {
  try {
    const { investorId } = req.params;
    
    const investor = await Investor.findByIdAndDelete(investorId);
    
    if (!investor) {
      return res.status(404).json(formatErrorResponse({
        code: 'INVESTOR_NOT_FOUND',
        message: 'Investor not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(
      { message: 'Investor deleted successfully' },
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Upload KYC document
export const uploadKYCDocument = async (req, res) => {
  try {
    const { investorId } = req.params;
    
    // Check if investor exists
    const investor = await Investor.findById(investorId);
    if (!investor) {
      return res.status(404).json(formatErrorResponse({
        code: 'INVESTOR_NOT_FOUND',
        message: 'Investor not found'
      }, req, 404));
    }

    // Handle file upload
    if (!req.file) {
      return res.status(400).json(formatErrorResponse({
        code: 'NO_FILE_UPLOADED',
        message: 'No file uploaded'
      }, req, 400));
    }

    const documentData = {
      userId: investor.userId,
      documentType: req.body.documentType,
      documentUrl: `/uploads/kyc/${req.file.filename}`,
      documentNumber: req.body.documentNumber,
      issuingAuthority: req.body.issuingAuthority,
      issueDate: req.body.issueDate ? new Date(req.body.issueDate) : undefined,
      expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : undefined,
      verificationStatus: 'pending',
      uploadedAt: new Date()
    };

    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    const document = new KYCDocument(documentData);
    await document.save();

    return res.status(201).json(formatSuccessResponse(document, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Verify KYC document
export const verifyKYCDocument = async (req, res) => {
  try {
    const { investorId, documentId } = req.params;
    const { verificationScore, notes } = req.body;

    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const document = await KYCDocument.findOneAndUpdate(
      { _id: documentId, userId: investorId },
      {
        verificationStatus: 'verified',
        verificationScore,
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        aiAnalysis: {
          ...notes,
          verifiedAt: new Date()
        }
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json(formatErrorResponse({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'KYC document not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(document, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Reject KYC document
export const rejectKYCDocument = async (req, res) => {
  try {
    const { investorId, documentId } = req.params;
    const { rejectionReason, notes } = req.body;

    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const document = await KYCDocument.findOneAndUpdate(
      { _id: documentId, userId: investorId },
      {
        verificationStatus: 'rejected',
        rejectionReason,
        reviewedBy: req.user?.id,
        reviewedAt: new Date(),
        aiAnalysis: {
          ...notes,
          rejectedAt: new Date()
        }
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json(formatErrorResponse({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'KYC document not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(document, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Flag KYC document for review
export const flagKYCDocument = async (req, res) => {
  try {
    const { investorId, documentId } = req.params;
    const { flagReason, notes } = req.body;

    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const document = await KYCDocument.findOneAndUpdate(
      { _id: documentId, userId: investorId },
      {
        verificationStatus: 'under_review',
        aiAnalysis: {
          flags: [flagReason],
          ...notes,
          flaggedAt: new Date()
        }
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json(formatErrorResponse({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'KYC document not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(document, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Get investor KYC documents
export const getInvestorKYCDocuments = async (req, res) => {
  try {
    const { investorId } = req.params;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const documents = await KYCDocument.find({ userId: investorId })
      .sort({ uploadedAt: -1 });
    
    return res.json(formatSuccessResponse(documents, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Get document history
export const getDocumentHistory = async (req, res) => {
  try {
    const { investorId, documentId } = req.params;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const document = await KYCDocument.findOne({ _id: documentId, userId: investorId });
    
    if (!document) {
      return res.status(404).json(formatErrorResponse({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'KYC document not found'
      }, req, 404));
    }
    
    // Mock history - in a real implementation, this would come from an audit log
    const history = [
      {
        action: 'uploaded',
        timestamp: document.uploadedAt,
        performedBy: document.userId,
        details: 'Document uploaded by user'
      },
      ...(document.reviewedAt ? [{
        action: document.verificationStatus,
        timestamp: document.reviewedAt,
        performedBy: document.reviewedBy,
        details: `Document ${document.verificationStatus} by reviewer`
      }] : [])
    ];
    
    return res.json(formatSuccessResponse(history, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Compare documents
export const compareDocuments = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { documentIds } = req.body;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const documents = await KYCDocument.find({
      _id: { $in: documentIds },
      userId: investorId
    });
    
    if (documents.length < 2) {
      return res.status(400).json(formatErrorResponse({
        code: 'INSUFFICIENT_DOCUMENTS',
        message: 'At least 2 documents are required for comparison'
      }, req, 400));
    }
    
    // Mock comparison logic - in a real implementation, this would use AI/ML
    const comparison = {
      similarityScore: Math.floor(Math.random() * 30) + 70, // 70-100%
      differences: [],
      matches: [
        { field: 'Document Type', value: documents[0].documentType },
        { field: 'User ID', value: documents[0].userId }
      ]
    };
    
    return res.json(formatSuccessResponse(comparison, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk verify documents
export const bulkVerifyDocuments = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { documentIds, verificationData } = req.body;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const result = await KYCDocument.updateMany(
      { _id: { $in: documentIds }, userId: investorId },
      {
        verificationStatus: 'verified',
        ...verificationData,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id
      }
    );
    
    return res.json(formatSuccessResponse({
      verifiedCount: result.modifiedCount,
      message: `Successfully verified ${result.modifiedCount} KYC documents`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk reject documents
export const bulkRejectDocuments = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { documentIds, rejectionData } = req.body;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const result = await KYCDocument.updateMany(
      { _id: { $in: documentIds }, userId: investorId },
      {
        verificationStatus: 'rejected',
        ...rejectionData,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id
      }
    );
    
    return res.json(formatSuccessResponse({
      rejectedCount: result.modifiedCount,
      message: `Successfully rejected ${result.modifiedCount} KYC documents`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk operations
export const bulkUpdateInvestors = async (req, res) => {
  try {
    const { investorIds, updateData } = req.body;
    
    const result = await Investor.updateMany(
      { _id: { $in: investorIds } },
      { ...updateData, updatedAt: new Date() }
    );

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} investors`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkVerifyKYC = async (req, res) => {
  try {
    const { investorIds, verificationData } = req.body;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const result = await KYCDocument.updateMany(
      { userId: { $in: investorIds }, verificationStatus: 'pending' },
      {
        verificationStatus: 'verified',
        ...verificationData,
        reviewedAt: new Date()
      }
    );

    return res.json(formatSuccessResponse({
      verifiedCount: result.modifiedCount,
      message: `Successfully verified ${result.modifiedCount} KYC documents`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkRejectKYC = async (req, res) => {
  try {
    const { investorIds, rejectionData } = req.body;
    
    // Import KYCDocument model
    const { default: KYCDocument } = await import('../../models/metrics/kycDocument.model.js');
    
    const result = await KYCDocument.updateMany(
      { userId: { $in: investorIds }, verificationStatus: 'pending' },
      {
        verificationStatus: 'rejected',
        ...rejectionData,
        reviewedAt: new Date()
      }
    );

    return res.json(formatSuccessResponse({
      rejectedCount: result.modifiedCount,
      message: `Successfully rejected ${result.modifiedCount} KYC documents`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk send communication
export const bulkSendCommunication = async (req, res) => {
  try {
    const { investorIds, type, subject, message, template, sendImmediately, scheduledDateTime } = req.body;
    
    // In a real implementation, this would integrate with an email/SMS service
    // For now, we'll just return a success response
    const communicationData = {
      investorIds,
      type,
      subject,
      message,
      template,
      sendImmediately,
      scheduledDateTime,
      sentAt: sendImmediately ? new Date() : null,
      status: sendImmediately ? 'sent' : 'scheduled'
    };
    
    // Here you would integrate with your communication service
    // await communicationService.sendBulkCommunication(communicationData);
    
    return res.json(formatSuccessResponse({
      sentCount: investorIds.length,
      message: `Communication sent to ${investorIds.length} investor(s)`,
      communicationData
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkExportInvestors = async (req, res) => {
  try {
    const { investorIds, format = 'xlsx' } = req.body;
    
    const investors = await Investor.find({ _id: { $in: investorIds } })
      .populate('userId', 'name email')
      .lean();

    // Format data based on requested format
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(investors);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="investors_export.csv"`);
      return res.send(csv);
    } else if (format === 'xlsx') {
      // Convert to Excel (would need a library like xlsx)
      // For now, return JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="investors_export.json"`);
      return res.json(investors);
    } else {
      return res.status(400).json(formatErrorResponse({
        code: 'INVALID_FORMAT',
        message: 'Unsupported export format'
      }, req, 400));
    }
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkDeleteInvestors = async (req, res) => {
  try {
    const { investorIds } = req.body;
    
    const result = await Investor.deleteMany({ _id: { $in: investorIds } });

    return res.json(formatSuccessResponse({
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} investors`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};


// Export functionality controllers
export const getExportTemplates = async (req, res) => {
  try {
    // Mock templates - in a real implementation, these would come from a database
    const templates = [
      {
        _id: 'template1',
        name: 'Standard Investor Export',
        description: 'Basic investor information with contact details',
        format: 'xlsx',
        columns: ['investorId', 'firstName', 'lastName', 'email', 'phone', 'status', 'kycStatus', 'totalInvestment', 'joinedDate'],
        includeRelatedData: {
          investments: false,
          transactions: false,
          kycDocuments: false
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        _id: 'template2',
        name: 'Complete Investor Portfolio',
        description: 'Full investor data including investments and transactions',
        format: 'xlsx',
        columns: ['investorId', 'firstName', 'lastName', 'email', 'phone', 'status', 'kycStatus', 'totalInvestment', 'joinedDate'],
        includeRelatedData: {
          investments: true,
          transactions: true,
          kycDocuments: true
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      },
      {
        _id: 'template3',
        name: 'KYC Compliance Report',
        description: 'KYC document status and verification details',
        format: 'pdf',
        columns: ['investorId', 'firstName', 'lastName', 'email', 'kycStatus'],
        includeRelatedData: {
          investments: false,
          transactions: false,
          kycDocuments: true
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
      }
    ];
    
    return res.json(formatSuccessResponse(templates, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const createExportTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // In a real implementation, save to database
    const template = {
      _id: `template_${Date.now()}`,
      ...templateData
    };
    
    return res.status(201).json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const updateExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // In a real implementation, update in database
    const template = {
      _id: templateId,
      ...updateData
    };
    
    return res.json(formatSuccessResponse(template, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const deleteExportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    // In a real implementation, delete from database
    
    return res.json(formatSuccessResponse({
      message: 'Export template deleted successfully'
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const exportInvestorsAdvanced = async (req, res) => {
  try {
    const {
      format = 'xlsx',
      scope = 'all',
      investorIds,
      filters,
      columns,
      includeRelatedData,
      csvOptions,
      excelOptions,
      pdfOptions
    } = req.body;
    
    let query = {};
    
    // Apply scope filters
    if (scope === 'selected' && investorIds && investorIds.length > 0) {
      query._id = { $in: investorIds };
    } else if (scope === 'filtered' && filters) {
      query = buildQuery(req, filters);
    }
    
    // Get investors
    const investors = await Investor.find(query)
      .populate('userId', 'name email')
      .lean();
    
    // Format data based on selected columns
    const formattedData = investors.map(investor => {
      const row = {};
      columns.forEach(column => {
        row[column] = investor[column] || '';
      });
      return row;
    });
    
    // Handle different export formats
    if (format === 'csv') {
      const csv = convertToCSV(formattedData, csvOptions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="investors_export_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csv);
    } else if (format === 'xlsx') {
      // For Excel, we'll return JSON for now (would need xlsx library)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="investors_export_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(formattedData);
    } else if (format === 'pdf') {
      // For PDF, we'll return JSON for now (would need PDF library)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="investors_export_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(formattedData);
    } else {
      return res.status(400).json(formatErrorResponse({
        code: 'INVALID_FORMAT',
        message: 'Unsupported export format'
      }, req, 400));
    }
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getExportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, format, dateFrom, dateTo } = req.query;
    const paginationOptions = getPaginationOptions({ page, limit });
    
    // Mock export history - in a real implementation, this would come from a database
    const mockExports = [
      {
        _id: 'export1',
        fileName: 'investors_export_2023-11-15.xlsx',
        format: 'xlsx',
        scope: 'all',
        status: 'completed',
        recordCount: 1250,
        fileSize: 2048576,
        createdAt: new Date('2023-11-15T10:30:00Z'),
        completedAt: new Date('2023-11-15T10:32:15Z')
      },
      {
        _id: 'export2',
        fileName: 'kyc_compliance_report.pdf',
        format: 'pdf',
        scope: 'filtered',
        status: 'completed',
        recordCount: 847,
        fileSize: 1536789,
        createdAt: new Date('2023-11-14T14:15:00Z'),
        completedAt: new Date('2023-11-14T14:18:42Z')
      },
      {
        _id: 'export3',
        fileName: 'investors_export_2023-11-13.csv',
        format: 'csv',
        scope: 'selected',
        status: 'failed',
        recordCount: 0,
        fileSize: 0,
        createdAt: new Date('2023-11-13T09:45:00Z'),
        completedAt: new Date('2023-11-13T09:47:30Z')
      }
    ];
    
    // Apply filters
    let filteredExports = mockExports;
    if (status) {
      filteredExports = filteredExports.filter(exp => exp.status === status);
    }
    if (format) {
      filteredExports = filteredExports.filter(exp => exp.format === format);
    }
    if (dateFrom) {
      filteredExports = filteredExports.filter(exp => exp.createdAt >= new Date(dateFrom));
    }
    if (dateTo) {
      filteredExports = filteredExports.filter(exp => exp.createdAt <= new Date(dateTo));
    }
    
    // Apply pagination
    const total = filteredExports.length;
    const paginatedExports = filteredExports
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const paginationMeta = buildPaginationMeta(
      paginationOptions.page,
      paginationOptions.limit,
      total
    );
    
    const response = {
      exports: paginatedExports,
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getExportStatus = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // Mock export status - in a real implementation, this would come from a database or job queue
    const mockStatus = {
      _id: exportId,
      status: 'processing', // pending, processing, completed, failed, cancelled
      progress: 65,
      processedRecords: 812,
      totalRecords: 1250,
      currentStage: 'Formatting data',
      estimatedTimeRemaining: 45,
      format: 'xlsx',
      scope: 'all',
      fileName: `investors_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      createdAt: new Date(),
      completedAt: null
    };
    
    return res.json(formatSuccessResponse(mockStatus, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const downloadExportFile = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // Mock file download - in a real implementation, this would retrieve the actual file
    const mockFileData = 'Mock export file data';
    const fileName = `investors_export_${exportId}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(mockFileData);
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const cancelExport = async (req, res) => {
  try {
    const { exportId } = req.params;
    
    // In a real implementation, this would cancel the export job
    
    return res.json(formatSuccessResponse({
      message: 'Export cancelled successfully'
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const scheduleExport = async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      createdAt: new Date(),
      id: `schedule_${Date.now()}`
    };
    
    // In a real implementation, this would save to a scheduled jobs system
    
    return res.status(201).json(formatSuccessResponse(scheduleData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getScheduledExports = async (req, res) => {
  try {
    // Mock scheduled exports - in a real implementation, this would come from a database
    const scheduledExports = [
      {
        id: 'schedule1',
        name: 'Weekly Investor Report',
        frequency: 'weekly',
        emailRecipients: ['admin@example.com'],
        nextRunDate: new Date('2023-11-22T09:00:00Z'),
        isActive: true,
        createdAt: new Date('2023-11-01T10:00:00Z')
      },
      {
        id: 'schedule2',
        name: 'Monthly KYC Compliance',
        frequency: 'monthly',
        emailRecipients: ['compliance@example.com', 'admin@example.com'],
        nextRunDate: new Date('2023-12-01T09:00:00Z'),
        isActive: true,
        createdAt: new Date('2023-11-01T10:30:00Z')
      }
    ];
    
    return res.json(formatSuccessResponse(scheduledExports, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const updateScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // In a real implementation, this would update in the database
    
    return res.json(formatSuccessResponse({
      id: scheduleId,
      ...updateData
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const deleteScheduledExport = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    // In a real implementation, this would delete from the database
    
    return res.json(formatSuccessResponse({
      message: 'Scheduled export deleted successfully'
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getExportQueueStatus = async (req, res) => {
  try {
    // Mock queue status - in a real implementation, this would check the job queue
    const queueStatus = {
      active: 2,
      waiting: 5,
      completed: 150,
      failed: 3,
      lastProcessed: new Date(),
      estimatedWaitTime: 120 // seconds
    };
    
    return res.json(formatSuccessResponse(queueStatus, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getExportAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    
    // Mock analytics - in a real implementation, this would aggregate export data
    const analytics = {
      totalExports: 245,
      successfulExports: 235,
      failedExports: 10,
      averageProcessingTime: 180, // seconds
      mostCommonFormat: 'xlsx',
      exportTrends: [
        { date: '2023-11-01', count: 12 },
        { date: '2023-11-02', count: 8 },
        { date: '2023-11-03', count: 15 },
        { date: '2023-11-04', count: 10 },
        { date: '2023-11-05', count: 18 }
      ],
      formatBreakdown: {
        xlsx: 180,
        csv: 45,
        pdf: 20
      },
      scopeBreakdown: {
        all: 120,
        filtered: 85,
        selected: 40
      }
    };
    
    return res.json(formatSuccessResponse(analytics, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Performance analytics controllers
export const getInvestorPerformanceAnalytics = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { period = '1y' } = req.query;
    
    // Mock performance analytics data
    const analyticsData = {
      period,
      performance: {
        totalROI: 18.5,
        annualizedROI: 15.2,
        monthlyReturns: [1.2, 2.1, 1.8, 2.5, 2.8, 3.1, 2.4, 2.9, 3.2, 2.7, 3.0],
        volatility: 12.5,
        sharpeRatio: 1.8,
        maxDrawdown: -8.3,
        alpha: 2.1,
        beta: 0.85
      },
      benchmark: {
        name: 'S&P 500 Solar Index',
        return: 14.2,
        outperformance: 4.3
      },
      trends: [
        { date: '2023-01', value: 10000 },
        { date: '2023-02', value: 10250 },
        { date: '2023-03', value: 10500 },
        { date: '2023-04', value: 10800 },
        { date: '2023-05', value: 11200 },
        { date: '2023-06', value: 11500 }
      ]
    };
    
    return res.json(formatSuccessResponse(analyticsData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getPortfolioAnalysis = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { period = '1y' } = req.query;
    
    // Mock portfolio analysis data
    const portfolioData = {
      period,
      distribution: [
        { name: 'Solar Farm A', value: 15000, percentage: 30, risk: 'low', returns: 8.5, status: 'active' },
        { name: 'Solar Farm B', value: 12000, percentage: 24, risk: 'medium', returns: 12.3, status: 'active' },
        { name: 'Rooftop Solar C', value: 8000, percentage: 16, risk: 'low', returns: 7.2, status: 'active' },
        { name: 'Community Solar D', value: 7000, percentage: 14, risk: 'medium', returns: 10.1, status: 'active' },
        { name: 'Commercial Solar E', value: 5000, percentage: 10, risk: 'high', returns: 15.7, status: 'pending' },
        { name: 'Residential Solar F', value: 3000, percentage: 6, risk: 'low', returns: 6.8, status: 'active' }
      ],
      sectors: [
        { name: 'Utility Scale', value: 27000, percentage: 54, projects: 2 },
        { name: 'Commercial', value: 12000, percentage: 24, projects: 2 },
        { name: 'Residential', value: 8000, percentage: 16, projects: 1 },
        { name: 'Community', value: 3000, percentage: 6, projects: 1 }
      ],
      riskProfile: {
        low: { value: 26000, percentage: 52, projects: 3 },
        medium: { value: 19000, percentage: 38, projects: 2 },
        high: { value: 5000, percentage: 10, projects: 1 }
      },
      geographic: [
        { name: 'California', value: 20000, percentage: 40, projects: 3 },
        { name: 'Texas', value: 15000, percentage: 30, projects: 2 },
        { name: 'Florida', value: 10000, percentage: 20, projects: 1 },
        { name: 'Arizona', value: 5000, percentage: 10, projects: 1 }
      ],
      performance: {
        totalInvested: 50000,
        currentValue: 58500,
        totalReturns: 8500,
        averageReturn: 10.2,
        bestPerformer: { name: 'Commercial Solar E', return: 15.7 },
        worstPerformer: { name: 'Residential Solar F', return: 6.8 }
      }
    };
    
    return res.json(formatSuccessResponse(portfolioData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getRiskAssessment = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { period = '1y' } = req.query;
    
    // Mock risk assessment data
    const riskData = {
      period,
      overview: {
        riskScore: 65,
        riskLevel: 'moderate',
        volatility: 12.5,
        sharpeRatio: 1.8,
        maxDrawdown: -8.3,
        var95: 5.2,
        beta: 0.85,
        alpha: 2.1,
        rSquared: 0.72,
        informationRatio: 0.9,
        sortinoRatio: 2.4,
        calmarRatio: 1.6,
        trackingError: 4.8
      },
      riskFactors: [
        { name: 'Market Risk', value: 35, percentage: 35, impact: 'high', trend: 'stable' },
        { name: 'Credit Risk', value: 25, percentage: 25, impact: 'medium', trend: 'decreasing' },
        { name: 'Liquidity Risk', value: 20, percentage: 20, impact: 'low', trend: 'stable' },
        { name: 'Operational Risk', value: 12, percentage: 12, impact: 'medium', trend: 'increasing' },
        { name: 'Regulatory Risk', value: 8, percentage: 8, impact: 'low', trend: 'stable' }
      ],
      scenarioAnalysis: [
        { scenario: 'Best Case', probability: 10, return: 25.5, description: 'Optimal market conditions' },
        { scenario: 'Good Case', probability: 25, return: 18.2, description: 'Favorable market conditions' },
        { scenario: 'Base Case', probability: 40, return: 12.8, description: 'Expected market conditions' },
        { scenario: 'Poor Case', probability: 20, return: 5.3, description: 'Unfavorable market conditions' },
        { scenario: 'Worst Case', probability: 5, return: -8.7, description: 'Severe market downturn' }
      ],
      riskAdjustedReturns: [
        { period: '1M', return: 2.1, risk: 3.2, riskAdjustedReturn: 0.66 },
        { period: '3M', return: 6.8, risk: 5.1, riskAdjustedReturn: 1.33 },
        { period: '6M', return: 12.5, risk: 8.7, riskAdjustedReturn: 1.44 },
        { period: '1Y', return: 18.5, risk: 12.5, riskAdjustedReturn: 1.48 },
        { period: '2Y', return: 32.4, risk: 18.2, riskAdjustedReturn: 1.78 }
      ],
      recommendations: [
        {
          priority: 'high',
          title: 'Diversify Portfolio',
          description: 'Consider adding investments in different sectors to reduce concentration risk',
          impact: 'Reduce overall risk by 15%'
        },
        {
          priority: 'medium',
          title: 'Monitor Market Volatility',
          description: 'Current market conditions show increased volatility, consider defensive positions',
          impact: 'Protect against downside risk'
        },
        {
          priority: 'low',
          title: 'Rebalance Quarterly',
          description: 'Regular portfolio rebalancing can help maintain optimal risk-return profile',
          impact: 'Improve risk-adjusted returns by 5%'
        }
      ]
    };
    
    return res.json(formatSuccessResponse(riskData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getInvestmentTimeline = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { period = '1y' } = req.query;
    
    // Mock investment timeline data
    const timelineData = {
      period,
      investments: [
        {
          id: 1,
          date: '2023-01-15',
          type: 'investment',
          projectName: 'Solar Farm A',
          amount: 15000,
          status: 'active',
          description: 'Initial investment in utility-scale solar farm',
          category: 'utility',
          returns: 8.5,
          currentValue: 16275,
          documents: ['investment_agreement.pdf', 'due_diligence.pdf']
        },
        {
          id: 2,
          date: '2023-03-22',
          type: 'investment',
          projectName: 'Rooftop Solar C',
          amount: 8000,
          status: 'active',
          description: 'Commercial rooftop solar installation',
          category: 'commercial',
          returns: 7.2,
          currentValue: 8576,
          documents: ['investment_agreement.pdf']
        },
        {
          id: 3,
          date: '2023-05-10',
          type: 'return',
          projectName: 'Solar Farm A',
          amount: 637.50,
          status: 'completed',
          description: 'Quarterly return distribution',
          category: 'utility',
          returns: 0,
          currentValue: 0,
          documents: ['return_statement.pdf']
        },
        {
          id: 4,
          date: '2023-06-18',
          type: 'investment',
          projectName: 'Community Solar D',
          amount: 7000,
          status: 'active',
          description: 'Community solar project investment',
          category: 'community',
          returns: 10.1,
          currentValue: 7707,
          documents: ['investment_agreement.pdf', 'project_plan.pdf']
        },
        {
          id: 5,
          date: '2023-08-05',
          type: 'return',
          projectName: 'Rooftop Solar C',
          amount: 144,
          status: 'completed',
          description: 'Quarterly return distribution',
          category: 'commercial',
          returns: 0,
          currentValue: 0,
          documents: ['return_statement.pdf']
        },
        {
          id: 6,
          date: '2023-09-12',
          type: 'milestone',
          projectName: 'Solar Farm A',
          amount: 0,
          status: 'completed',
          description: 'Project reached 50% completion',
          category: 'utility',
          returns: 0,
          currentValue: 0,
          documents: ['completion_report.pdf']
        },
        {
          id: 7,
          date: '2023-10-28',
          type: 'investment',
          projectName: 'Commercial Solar E',
          amount: 5000,
          status: 'pending',
          description: 'Pending commercial solar investment',
          category: 'commercial',
          returns: 15.7,
          currentValue: 5000,
          documents: ['term_sheet.pdf']
        },
        {
          id: 8,
          date: '2023-11-15',
          type: 'return',
          projectName: 'Solar Farm A',
          amount: 637.50,
          status: 'completed',
          description: 'Quarterly return distribution',
          category: 'utility',
          returns: 0,
          currentValue: 0,
          documents: ['return_statement.pdf']
        }
      ],
      summary: {
        totalInvested: 35000,
        totalReturns: 1419,
        activeProjects: 4,
        pendingProjects: 1,
        completedProjects: 0,
        averageReturn: 9.2,
        bestPerformingProject: { name: 'Commercial Solar E', return: 15.7 },
        worstPerformingProject: { name: 'Rooftop Solar C', return: 7.2 }
      },
      monthlyActivity: [
        { month: 'Jan', investments: 15000, returns: 0, net: 15000 },
        { month: 'Feb', investments: 0, returns: 0, net: 0 },
        { month: 'Mar', investments: 8000, returns: 0, net: 8000 },
        { month: 'Apr', investments: 0, returns: 0, net: 0 },
        { month: 'May', investments: 0, returns: 637.50, net: -637.50 },
        { month: 'Jun', investments: 7000, returns: 0, net: 7000 },
        { month: 'Jul', investments: 0, returns: 0, net: 0 },
        { month: 'Aug', investments: 0, returns: 144, net: -144 },
        { month: 'Sep', investments: 0, returns: 0, net: 0 },
        { month: 'Oct', investments: 5000, returns: 0, net: 5000 },
        { month: 'Nov', investments: 0, returns: 637.50, net: -637.50 },
        { month: 'Dec', investments: 0, returns: 0, net: 0 }
      ]
    };
    
    return res.json(formatSuccessResponse(timelineData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getFinancialSummary = async (req, res) => {
  try {
    const { investorId } = req.params;
    const { period = '1y' } = req.query;
    
    // Mock financial summary data
    const financialData = {
      period,
      overview: {
        totalInvested: 50000,
        currentValue: 58500,
        totalReturns: 8500,
        totalDeposits: 50000,
        totalWithdrawals: 0,
        netCashFlow: 50000,
        unrealizedGains: 8500,
        realizedGains: 0,
        totalGains: 8500
      },
      performance: {
        totalROI: 17.0,
        annualizedROI: 15.2,
        yield: 8.5,
        incomeYield: 6.2,
        capitalGainsYield: 2.3,
        totalReturn: 17.0,
        riskAdjustedReturn: 12.8,
        benchmarkReturn: 14.2,
        alpha: 2.8,
        beta: 0.85
      },
      cashFlow: [
        { date: '2023-01-15', type: 'deposit', amount: 15000, description: 'Initial investment in Solar Farm A' },
        { date: '2023-03-22', type: 'deposit', amount: 8000, description: 'Investment in Rooftop Solar C' },
        { date: '2023-05-10', type: 'withdrawal', amount: 637.50, description: 'Quarterly return from Solar Farm A' },
        { date: '2023-06-18', type: 'deposit', amount: 7000, description: 'Investment in Community Solar D' },
        { date: '2023-08-05', type: 'withdrawal', amount: 144, description: 'Quarterly return from Rooftop Solar C' },
        { date: '2023-10-28', type: 'deposit', amount: 5000, description: 'Investment in Commercial Solar E' },
        { date: '2023-11-15', type: 'withdrawal', amount: 637.50, description: 'Quarterly return from Solar Farm A' }
      ],
      projections: {
        expectedMonthlyReturn: 425,
        expectedQuarterlyReturn: 1275,
        expectedAnnualReturn: 5100,
        projectedValue1Year: 63600,
        projectedValue3Years: 78000,
        projectedValue5Years: 95000
      }
    };
    
    return res.json(formatSuccessResponse(financialData, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Enhanced CSV converter with options
const convertToCSV = (data, options = {}) => {
  if (!data || data.length === 0) return '';
  
  const {
    delimiter = ',',
    includeHeaders = true,
    encoding = 'utf-8'
  } = options;
  
  const headers = Object.keys(data[0]);
  const headerRow = includeHeaders ? headers.join(delimiter) + '\n' : '';
  
  const rows = data.map(obj =>
    headers.map(header => {
      let value = obj[header] || '';
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(delimiter)
  ).join('\n');
  
  return headerRow + rows;
};

export default {
  getInvestorMetrics,
  getInvestorDetails,
  getInvestorList,
  searchInvestors,
  getInvestorPerformanceMetrics,
  createInvestor,
  updateInvestor,
  deleteInvestor,
  uploadKYCDocument,
  getInvestorKYCDocuments,
  verifyKYCDocument,
  rejectKYCDocument,
  flagKYCDocument,
  getDocumentHistory,
  compareDocuments,
  bulkVerifyDocuments,
  bulkRejectDocuments,
  bulkUpdateInvestors,
  bulkVerifyKYC,
  bulkRejectKYC,
  bulkExportInvestors,
  bulkDeleteInvestors,
  bulkSendCommunication,
  // Export functionality
  getExportTemplates,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  exportInvestorsAdvanced,
  getExportHistory,
  getExportStatus,
  downloadExportFile,
  cancelExport,
  scheduleExport,
  getScheduledExports,
  updateScheduledExport,
  deleteScheduledExport,
  getExportQueueStatus,
  getExportAnalytics
};