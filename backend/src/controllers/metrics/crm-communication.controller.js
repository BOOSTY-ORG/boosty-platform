import CrmCommunication from "../../models/metrics/crm-communication.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get CRM communication metrics and analytics
 */
export const getCrmCommunicationMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic communication metrics
    const [
      totalCommunications,
      inboundCommunications,
      outboundCommunications,
      automatedCommunications,
      communicationsByChannel,
      communicationsByInteractionType,
      communicationsByDirection,
      overdueResponses,
      overdueFollowUps,
      communicationsBySentiment,
      communicationsByStatus
    ] = await Promise.all([
      CrmCommunication.countDocuments(query),
      CrmCommunication.countDocuments({ ...query, direction: 'inbound' }),
      CrmCommunication.countDocuments({ ...query, direction: 'outbound' }),
      CrmCommunication.countDocuments({ ...query, interactionType: 'automated' }),
      CrmCommunication.aggregate([
        { $match: query },
        { $group: { _id: "$channel", count: { $sum: 1 } } }
      ]),
      CrmCommunication.aggregate([
        { $match: query },
        { $group: { _id: "$interactionType", count: { $sum: 1 } } }
      ]),
      CrmCommunication.aggregate([
        { $match: query },
        { $group: { _id: "$direction", count: { $sum: 1 } } }
      ]),
      CrmCommunication.findOverdueResponses(),
      CrmCommunication.findOverdueFollowUps(),
      CrmCommunication.aggregate([
        { $match: query },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } }
      ]),
      CrmCommunication.aggregate([
        { $match: query },
        { $group: { _id: "$responseReceived", count: { $sum: 1 } } }
      ])
    ]);
    
    // Calculate engagement metrics
    const engagementMetrics = await getEngagementMetrics(query, startDate, endDate);
    
    // Calculate agent performance metrics
    const agentMetrics = await getAgentPerformanceMetrics(query, startDate, endDate);
    
    // Calculate cost and revenue metrics
    const financialMetrics = await getFinancialMetrics(query, startDate, endDate);
    
    const response = {
      summary: {
        totalCommunications,
        inboundCommunications,
        outboundCommunications,
        automatedCommunications,
        overdueResponses: overdueResponses.length,
        overdueFollowUps: overdueFollowUps.length,
        averageEngagementScore: engagementMetrics.averageEngagementScore,
        totalCost: financialMetrics.totalCost,
        totalRevenue: financialMetrics.totalRevenue,
        roi: financialMetrics.roi
      },
      breakdowns: {
        channel: formatBreakdown(communicationsByChannel),
        interactionType: formatBreakdown(communicationsByInteractionType),
        direction: formatBreakdown(communicationsByDirection),
        sentiment: formatBreakdown(communicationsBySentiment),
        status: formatBreakdown(communicationsByStatus)
      },
      performance: {
        ...engagementMetrics,
        ...agentMetrics,
        ...financialMetrics
      },
      alerts: {
        overdueResponses: overdueResponses.length,
        overdueFollowUps: overdueFollowUps.length
      },
      trends: await getCommunicationTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get detailed CRM communication by ID
 */
export const getCrmCommunicationDetails = async (req, res) => {
  try {
    const { communicationId } = req.params;
    
    const communication = await CrmCommunication.findById(communicationId)
      .populate('communicationId')
      .populate('entityId')
      .populate('agentId', 'firstName lastName email')
      .populate('ticketId', 'ticketId title status')
      .populate('campaignId', 'name')
      .populate('automationRule', 'name');
    
    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }
    
    const response = {
      communication: {
        id: communication._id,
        communicationId: communication.communicationId,
        entityType: communication.entityType,
        entityId: communication.entityId,
        ticketId: communication.ticketId,
        agentId: communication.agentId,
        interactionType: communication.interactionType,
        channel: communication.channel,
        direction: communication.direction,
        duration: communication.duration,
        sentiment: communication.sentiment,
        sentimentScore: communication.sentimentScore,
        satisfaction: communication.satisfaction,
        followUpRequired: communication.followUpRequired,
        followUpDate: communication.followUpDate,
        followUpNotes: communication.followUpNotes,
        internalNotes: communication.internalNotes,
        tags: communication.tags,
        campaignId: communication.campaignId,
        automationRule: communication.automationRule,
        responseRequired: communication.responseRequired,
        responseDeadline: communication.responseDeadline,
        responseReceived: communication.responseReceived,
        responseReceivedAt: communication.responseReceivedAt,
        cost: communication.cost,
        revenue: communication.revenue,
        deliveryAttempts: communication.deliveryAttempts,
        lastDeliveryAttempt: communication.lastDeliveryAttempt,
        providerUsed: communication.providerUsed,
        engagementScore: communication.engagementScore,
        openedAt: communication.openedAt,
        clickedAt: communication.clickedAt,
        consentReceived: communication.consentReceived,
        consentRevoked: communication.consentRevoked,
        gdprCompliant: communication.gdprCompliant,
        marketingConsent: communication.marketingConsent,
        customFields: communication.customFields,
        metadata: communication.metadata,
        createdAt: communication.createdAt,
        updatedAt: communication.updatedAt
      },
      virtuals: {
        isOverdue: communication.isOverdue,
        isFollowUpOverdue: communication.isFollowUpOverdue,
        responseTime: communication.responseTime
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get paginated list of CRM communications
 */
export const getCrmCommunicationList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Use the query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { createdAt: -1 };
    
    const communications = await CrmCommunication.findActive(query)
      .populate('agentId', 'firstName lastName email')
      .populate('entityId')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmCommunication.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: communications.map(communication => ({
        id: communication._id,
        communicationId: communication.communicationId,
        entityType: communication.entityType,
        entityId: communication.entityId,
        agentId: communication.agentId,
        interactionType: communication.interactionType,
        channel: communication.channel,
        direction: communication.direction,
        duration: communication.duration,
        sentiment: communication.sentiment,
        satisfaction: communication.satisfaction,
        followUpRequired: communication.followUpRequired,
        followUpDate: communication.followUpDate,
        responseRequired: communication.responseRequired,
        responseDeadline: communication.responseDeadline,
        responseReceived: communication.responseReceived,
        cost: communication.cost,
        revenue: communication.revenue,
        engagementScore: communication.engagementScore,
        tags: communication.tags,
        createdAt: communication.createdAt,
        updatedAt: communication.updatedAt,
        isOverdue: communication.isOverdue,
        isFollowUpOverdue: communication.isFollowUpOverdue
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Search CRM communications
 */
export const searchCrmCommunications = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Add search term to query if provided
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }
    
    const communications = await CrmCommunication.findActive(query)
      .populate('agentId', 'firstName lastName email')
      .populate('entityId')
      .sort(req.queryBuilder.sort || { createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmCommunication.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: communications.map(communication => ({
        id: communication._id,
        communicationId: communication.communicationId,
        entityType: communication.entityType,
        entityId: communication.entityId,
        agentId: communication.agentId,
        interactionType: communication.interactionType,
        channel: communication.channel,
        direction: communication.direction,
        sentiment: communication.sentiment,
        satisfaction: communication.satisfaction,
        followUpRequired: communication.followUpRequired,
        followUpDate: communication.followUpDate,
        responseRequired: communication.responseRequired,
        responseReceived: communication.responseReceived,
        tags: communication.tags,
        createdAt: communication.createdAt
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create a new CRM communication
 */
export const createCrmCommunication = async (req, res) => {
  try {
    const communicationData = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy,
      createdAt: new Date()
    };

    const communication = new CrmCommunication(communicationData);
    await communication.save();

    return res.status(201).json(formatSuccessResponse(communication, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update CRM communication
 */
export const updateCrmCommunication = async (req, res) => {
  try {
    const { communicationId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const communication = await CrmCommunication.findByIdAndUpdate(
      communicationId,
      updateData,
      { new: true, runValidators: true }
    ).populate('agentId', 'firstName lastName email')
     .populate('entityId');

    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(communication, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete CRM communication (soft delete)
 */
export const deleteCrmCommunication = async (req, res) => {
  try {
    const { communicationId } = req.params;
    
    const communication = await CrmCommunication.findById(communicationId);
    
    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }

    await communication.softDelete(req.user?.id);

    return res.json(formatSuccessResponse(
      { message: 'CRM communication deleted successfully' },
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Mark response as received
 */
export const markResponseReceived = async (req, res) => {
  try {
    const { communicationId } = req.params;
    
    const communication = await CrmCommunication.findById(communicationId);
    
    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }

    await communication.markResponseReceived();

    return res.json(formatSuccessResponse(communication, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Add follow-up to communication
 */
export const addFollowUp = async (req, res) => {
  try {
    const { communicationId } = req.params;
    const { followUpDate, notes } = req.body;
    
    const communication = await CrmCommunication.findById(communicationId);
    
    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }

    await communication.addFollowUp(new Date(followUpDate), notes);

    return res.json(formatSuccessResponse(communication, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Complete follow-up
 */
export const completeFollowUp = async (req, res) => {
  try {
    const { communicationId } = req.params;
    
    const communication = await CrmCommunication.findById(communicationId);
    
    if (!communication) {
      return res.status(404).json(formatErrorResponse({
        code: 'COMMUNICATION_NOT_FOUND',
        message: 'CRM communication not found'
      }, req, 404));
    }

    await communication.completeFollowUp();

    return res.json(formatSuccessResponse(communication, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get communications by entity
 */
export const getCommunicationsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort: req.queryBuilder?.sort || { createdAt: -1 }
    };
    
    const communications = await CrmCommunication.findByEntity(entityType, entityId, options);
    
    return res.json(formatSuccessResponse(communications, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get overdue responses
 */
export const getOverdueResponses = async (req, res) => {
  try {
    const communications = await CrmCommunication.findOverdueResponses();
    
    return res.json(formatSuccessResponse(communications, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get overdue follow-ups
 */
export const getOverdueFollowUps = async (req, res) => {
  try {
    const communications = await CrmCommunication.findOverdueFollowUps();
    
    return res.json(formatSuccessResponse(communications, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get agent workload metrics
 */
export const getAgentWorkload = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startDate, endDate } = parseDateRange(req.query);
    
    const dateRange = { start: startDate, end: endDate };
    const workload = await CrmCommunication.getAgentWorkload(agentId, dateRange);
    
    return res.json(formatSuccessResponse(workload, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk operations
export const bulkUpdateCommunications = async (req, res) => {
  try {
    const { communicationIds, updateData } = req.body;
    
    const result = await CrmCommunication.updateMany(
      { _id: { $in: communicationIds }, deleted: false },
      { ...updateData, updatedAt: new Date() }
    );

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} communications`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkDeleteCommunications = async (req, res) => {
  try {
    const { communicationIds } = req.body;
    
    // Soft delete communications
    const communications = await CrmCommunication.find({ _id: { $in: communicationIds }, deleted: false });
    for (const communication of communications) {
      await communication.softDelete(req.user?.id);
    }

    return res.json(formatSuccessResponse({
      deletedCount: communications.length,
      message: `Successfully deleted ${communications.length} communications`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getEngagementMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmCommunication.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        averageEngagementScore: { $avg: '$engagementScore' },
        totalOpened: { $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } },
        totalClicked: { $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] } },
        averageSatisfaction: { $avg: '$satisfaction' },
        totalResponses: { $sum: { $cond: ['$responseReceived', 1, 0] } }
      }
    }
  ]);
  
  const total = await CrmCommunication.countDocuments(query);
  const result = metrics[0] || {};
  
  return {
    averageEngagementScore: result.averageEngagementScore || 0,
    openRate: total > 0 ? (result.totalOpened / total) * 100 : 0,
    clickRate: result.totalOpened > 0 ? (result.totalClicked / result.totalOpened) * 100 : 0,
    averageSatisfaction: result.averageSatisfaction || 0,
    responseRate: total > 0 ? (result.totalResponses / total) * 100 : 0
  };
};

const getAgentPerformanceMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmCommunication.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$agentId',
        totalCommunications: { $sum: 1 },
        averageDuration: { $avg: '$duration' },
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$revenue' },
        averageSatisfaction: { $avg: '$satisfaction' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent'
      }
    },
    { $unwind: '$agent' },
    {
      $project: {
        agentId: '$_id',
        agentName: { $concat: ['$agent.firstName', ' ', '$agent.lastName'] },
        agentEmail: '$agent.email',
        totalCommunications: 1,
        averageDuration: 1,
        totalCost: 1,
        totalRevenue: 1,
        averageSatisfaction: 1
      }
    }
  ]);
  
  return {
    agentPerformance: metrics
  };
};

const getFinancialMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmCommunication.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$revenue' },
        averageCost: { $avg: '$cost' },
        averageRevenue: { $avg: '$revenue' }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  const roi = result.totalCost > 0 ? ((result.totalRevenue - result.totalCost) / result.totalCost) * 100 : 0;
  
  return {
    totalCost: result.totalCost || 0,
    totalRevenue: result.totalRevenue || 0,
    averageCost: result.averageCost || 0,
    averageRevenue: result.averageRevenue || 0,
    roi: Math.round(roi * 100) / 100
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getCommunicationTrends = async (startDate, endDate) => {
  // Get monthly communication trends
  const monthlyCommunications = await CrmCommunication.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        deleted: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        total: { $sum: 1 },
        inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
        outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
        automated: { $sum: { $cond: [{ $eq: ['$interactionType', 'automated'] }, 1, 0] } }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    communications: monthlyCommunications.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      inbound: item.inbound,
      outbound: item.outbound,
      automated: item.automated
    }))
  };
};

export default {
  getCrmCommunicationMetrics,
  getCrmCommunicationDetails,
  getCrmCommunicationList,
  searchCrmCommunications,
  createCrmCommunication,
  updateCrmCommunication,
  deleteCrmCommunication,
  markResponseReceived,
  addFollowUp,
  completeFollowUp,
  getCommunicationsByEntity,
  getOverdueResponses,
  getOverdueFollowUps,
  getAgentWorkload,
  bulkUpdateCommunications,
  bulkDeleteCommunications
};