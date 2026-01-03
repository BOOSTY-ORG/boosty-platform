import CrmContact from "../../models/metrics/crm-contact.model.js";
import CrmCommunication from "../../models/metrics/crm-communication.model.js";
import CrmTemplate from "../../models/metrics/crm-template.model.js";
import CrmAutomation from "../../models/metrics/crm-automation.model.js";
import CrmMessage from "../../models/metrics/crm-message.model.js";
import CrmAssignmentMetrics from "../../models/metrics/crm-assignment-metrics.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get comprehensive CRM metrics and analytics
 * 
 * This endpoint provides a unified view of all CRM metrics including:
 * - Contact Metrics: Total contacts, new contacts, active contacts, engagement metrics, lead conversion rates
 * - Communication Metrics: Total communications by type, response rates, channel performance
 * - Assignment Metrics: Agent workload distribution, SLA compliance, transfer and escalation metrics
 * - Message Metrics: Thread activity, message volume, engagement metrics
 * - Template Metrics: Usage statistics, effectiveness rates, A/B test results
 * - Automation Metrics: Execution rates, trigger performance, ROI metrics
 */
export const getCrmMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const baseQuery = buildQuery(req, { startDate, endDate });
    
    // Get pagination options
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const paginationOptions = {
      page,
      limit,
      skip: (page - 1) * limit
    };

    // Get filtering options
    const agentFilter = req.query.agentId ? { agentId: req.query.agentId } : {};
    const teamFilter = req.query.teamId ? { teamId: req.query.teamId } : {};
    
    // Execute all metrics queries in parallel for better performance
    const [
      // Contact Metrics
      contactMetrics,
      contactBreakdowns,
      contactTrends,
      
      // Communication Metrics
      communicationMetrics,
      communicationBreakdowns,
      communicationTrends,
      
      // Assignment Metrics
      assignmentMetrics,
      assignmentBreakdowns,
      
      // Message Metrics
      messageMetrics,
      messageBreakdowns,
      
      // Template Metrics
      templateMetrics,
      templateBreakdowns,
      
      // Automation Metrics
      automationMetrics,
      automationBreakdowns,
      
      // Performance and Financial Metrics
      performanceMetrics,
      financialMetrics
    ] = await Promise.all([
      // Contact Metrics
      getContactMetrics(baseQuery, agentFilter, teamFilter),
      getContactBreakdowns(baseQuery, agentFilter, teamFilter),
      getContactTrends(startDate, endDate, agentFilter, teamFilter),
      
      // Communication Metrics
      getCommunicationMetrics(baseQuery, agentFilter, teamFilter),
      getCommunicationBreakdowns(baseQuery, agentFilter, teamFilter),
      getCommunicationTrends(startDate, endDate, agentFilter, teamFilter),
      
      // Assignment Metrics
      getAssignmentMetrics(baseQuery, agentFilter, teamFilter),
      getAssignmentBreakdowns(baseQuery, agentFilter, teamFilter),
      
      // Message Metrics
      getMessageMetrics(baseQuery, agentFilter, teamFilter),
      getMessageBreakdowns(baseQuery, agentFilter, teamFilter),
      
      // Template Metrics
      getTemplateMetrics(baseQuery, agentFilter, teamFilter),
      getTemplateBreakdowns(baseQuery, agentFilter, teamFilter),
      
      // Automation Metrics
      getAutomationMetrics(baseQuery, agentFilter, teamFilter),
      getAutomationBreakdowns(baseQuery, agentFilter, teamFilter),
      
      // Performance and Financial Metrics
      getPerformanceMetrics(baseQuery, agentFilter, teamFilter),
      getFinancialMetrics(baseQuery, agentFilter, teamFilter)
    ]);

    // Build comprehensive response
    const response = {
      summary: {
        // Contact Summary
        totalContacts: contactMetrics.totalContacts,
        newContacts: contactMetrics.newContacts,
        activeContacts: contactMetrics.activeContacts,
        highValueLeads: contactMetrics.highValueLeads,
        leadConversionRate: contactMetrics.leadConversionRate,
        
        // Communication Summary
        totalCommunications: communicationMetrics.totalCommunications,
        averageResponseTime: communicationMetrics.averageResponseTime,
        responseRate: communicationMetrics.responseRate,
        
        // Assignment Summary
        totalAssignments: assignmentMetrics.totalAssignments,
        activeAssignments: assignmentMetrics.activeAssignments,
        slaComplianceRate: assignmentMetrics.slaComplianceRate,
        
        // Message Summary
        totalMessages: messageMetrics.totalMessages,
        activeThreads: messageMetrics.activeThreads,
        averageEngagementScore: messageMetrics.averageEngagementScore,
        
        // Template Summary
        totalTemplates: templateMetrics.totalTemplates,
        activeTemplates: templateMetrics.activeTemplates,
        averageTemplatePerformance: templateMetrics.averagePerformance,
        
        // Automation Summary
        totalAutomations: automationMetrics.totalAutomations,
        activeAutomations: automationMetrics.activeAutomations,
        automationSuccessRate: automationMetrics.automationSuccessRate,
        
        // Performance Summary
        overallSatisfaction: performanceMetrics.overallSatisfaction,
        agentUtilization: performanceMetrics.agentUtilization,
        
        // Financial Summary
        totalCost: financialMetrics.totalCost,
        totalRevenue: financialMetrics.totalRevenue,
        roi: financialMetrics.roi
      },
      
      breakdowns: {
        contacts: contactBreakdowns,
        communications: communicationBreakdowns,
        assignments: assignmentBreakdowns,
        messages: messageBreakdowns,
        templates: templateBreakdowns,
        automations: automationBreakdowns
      },
      
      trends: {
        contacts: contactTrends,
        communications: communicationTrends
      },
      
      performance: {
        ...performanceMetrics,
        ...financialMetrics
      },
      
      alerts: {
        overdueAssignments: assignmentMetrics.overdueAssignments,
        unassignedContacts: contactMetrics.unassignedContacts,
        lowPerformingTemplates: templateMetrics.lowPerformingTemplates,
        failedAutomations: automationMetrics.failedAutomations,
        slaBreaches: assignmentMetrics.slaBreaches
      },
      
      filters: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        agent: agentFilter.agentId || null,
        team: teamFilter.teamId || null
      }
    };

    // Add pagination if requested
    if (req.query.includePagination === 'true') {
      response.pagination = buildPaginationMeta(
        paginationOptions.page,
        paginationOptions.limit,
        1 // Single comprehensive response
      );
    }

    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get CRM metrics by specific category
 */
export const getCrmMetricsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { startDate, endDate } = parseDateRange(req.query);
    const baseQuery = buildQuery(req, { startDate, endDate });
    
    const agentFilter = req.query.agentId ? { agentId: req.query.agentId } : {};
    const teamFilter = req.query.teamId ? { teamId: req.query.teamId } : {};
    
    let response;
    
    switch (category) {
      case 'contacts':
        response = await getDetailedContactMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      case 'communications':
        response = await getDetailedCommunicationMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      case 'assignments':
        response = await getDetailedAssignmentMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      case 'messages':
        response = await getDetailedMessageMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      case 'templates':
        response = await getDetailedTemplateMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      case 'automations':
        response = await getDetailedAutomationMetrics(baseQuery, agentFilter, teamFilter, startDate, endDate);
        break;
      default:
        return res.status(400).json(formatErrorResponse({
          code: 'INVALID_CATEGORY',
          message: 'Invalid category. Must be one of: contacts, communications, assignments, messages, templates, automations'
        }, req, 400));
    }
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get real-time CRM metrics dashboard data
 */
export const getCrmRealtimeMetrics = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const [
      // Last 24 hours metrics
      last24hContacts,
      last24hCommunications,
      last24hMessages,
      last24hAssignments,
      
      // Last hour metrics (for activity rate)
      lastHourCommunications,
      lastHourMessages,
      
      // Current active items
      activeAssignments,
      overdueAssignments,
      activeAutomations,
      failedAutomations
    ] = await Promise.all([
      // Last 24 hours
      CrmContact.countDocuments({ createdAt: { $gte: last24Hours }, deleted: false }),
      CrmCommunication.countDocuments({ createdAt: { $gte: last24Hours }, deleted: false }),
      CrmMessage.countDocuments({ sentAt: { $gte: last24Hours }, deleted: false }),
      CrmAssignmentMetrics.countDocuments({ assignedAt: { $gte: last24Hours }, deleted: false }),
      
      // Last hour
      CrmCommunication.countDocuments({ createdAt: { $gte: lastHour }, deleted: false }),
      CrmMessage.countDocuments({ sentAt: { $gte: lastHour }, deleted: false }),
      
      // Current active items
      CrmAssignmentMetrics.countDocuments({ status: 'active', deleted: false }),
      CrmAssignmentMetrics.findOverdueAssignments(),
      CrmAutomation.countDocuments({ enabled: true, status: 'active', deleted: false }),
      CrmAutomation.find({ status: 'error', deleted: false })
    ]);
    
    const response = {
      timestamp: now.toISOString(),
      last24Hours: {
        newContacts: last24hContacts,
        newCommunications: last24hCommunications,
        newMessages: last24hMessages,
        newAssignments: last24hAssignments
      },
      lastHour: {
        communications: lastHourCommunications,
        messages: lastHourMessages,
        activityRate: lastHourCommunications + lastHourMessages
      },
      current: {
        activeAssignments,
        overdueAssignments: overdueAssignments.length,
        activeAutomations,
        failedAutomations: failedAutomations.length
      },
      alerts: {
        overdueAssignments: overdueAssignments.length > 0,
        failedAutomations: failedAutomations.length > 0,
        highActivityRate: (lastHourCommunications + lastHourMessages) > 100
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions for getting metrics from different models

/**
 * Contact Metrics Functions
 */
const getContactMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalContacts,
    newContacts,
    activeContacts,
    highValueLeads,
    assignedContacts,
    unassignedContacts,
    conversionMetrics
  ] = await Promise.all([
    CrmContact.countDocuments(query),
    CrmContact.countDocuments({ ...query, createdAt: { $gte: baseQuery.startDate || new Date(0) } }),
    CrmContact.countDocuments({ ...query, status: 'active' }),
    CrmContact.countDocuments({ ...query, leadScore: { $gte: 80 }, status: 'active' }),
    CrmContact.countDocuments({ ...query, assignedTo: { $exists: true } }),
    CrmContact.countDocuments({ ...query, assignedTo: { $exists: false } }),
    CrmContact.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: { $cond: [{ $eq: ['$contactType', 'lead'] }, 1, 0] } },
          convertedLeads: { $sum: { $cond: [{ $eq: ['$qualificationStatus', 'converted'] }, 1, 0] } },
          avgLeadScore: { $avg: '$leadScore' },
          avgEngagementScore: { $avg: '$engagement.engagementScore' }
        }
      }
    ])
  ]);
  
  const conversionResult = conversionMetrics[0] || {};
  const leadConversionRate = conversionResult.totalLeads > 0 
    ? (conversionResult.convertedLeads / conversionResult.totalLeads) * 100 
    : 0;
  
  return {
    totalContacts,
    newContacts,
    activeContacts,
    highValueLeads,
    assignedContacts,
    unassignedContacts,
    leadConversionRate,
    averageLeadScore: conversionResult.avgLeadScore || 0,
    averageEngagementScore: conversionResult.avgEngagementScore || 0
  };
};

const getContactBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byType,
    byStatus,
    bySource,
    byQualification,
    byLeadScore
  ] = await Promise.all([
    CrmContact.aggregate([
      { $match: query },
      { $group: { _id: '$contactType', count: { $sum: 1 } } }
    ]),
    CrmContact.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CrmContact.aggregate([
      { $match: query },
      { $group: { _id: '$contactSource', count: { $sum: 1 } } }
    ]),
    CrmContact.aggregate([
      { $match: query },
      { $group: { _id: '$qualificationStatus', count: { $sum: 1 } } }
    ]),
    CrmContact.aggregate([
      { $match: query },
      {
        $bucket: {
          groupBy: '$leadScore',
          boundaries: [0, 25, 50, 75, 100],
          default: 'other',
          output: { count: { $sum: 1 } }
        }
      }
    ])
  ]);
  
  return {
    byType: formatBreakdown(byType),
    byStatus: formatBreakdown(byStatus),
    bySource: formatBreakdown(bySource),
    byQualification: formatBreakdown(byQualification),
    byLeadScore: formatBreakdown(byLeadScore)
  };
};

const getContactTrends = async (startDate, endDate, agentFilter, teamFilter) => {
  const query = { 
    ...agentFilter, 
    ...teamFilter,
    createdAt: { $gte: startDate, $lte: endDate },
    deleted: false 
  };
  
  const monthlyTrends = await CrmContact.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        total: { $sum: 1 },
        leads: { $sum: { $cond: [{ $eq: ['$contactType', 'lead'] }, 1, 0] } },
        customers: { $sum: { $cond: [{ $eq: ['$contactType', 'customer'] }, 1, 0] } },
        qualified: { $sum: { $cond: [{ $eq: ['$qualificationStatus', 'qualified'] }, 1, 0] } }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    monthly: monthlyTrends.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      leads: item.leads,
      customers: item.customers,
      qualified: item.qualified
    }))
  };
};

/**
 * Communication Metrics Functions
 */
const getCommunicationMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalCommunications,
    inboundCommunications,
    outboundCommunications,
    responseMetrics,
    performanceMetrics
  ] = await Promise.all([
    CrmCommunication.countDocuments(query),
    CrmCommunication.countDocuments({ ...query, direction: 'inbound' }),
    CrmCommunication.countDocuments({ ...query, direction: 'outbound' }),
    CrmCommunication.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: { $cond: ['$responseReceived', 1, 0] } },
          avgResponseTime: { $avg: { $subtract: ['$responseReceivedAt', '$createdAt'] } },
          totalOverdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$responseRequired', true] },
                    { $eq: ['$responseReceived', false] },
                    { $lt: ['$responseDeadline', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]),
    CrmCommunication.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgEngagementScore: { $avg: '$engagementScore' },
          avgSatisfaction: { $avg: '$satisfaction' },
          totalCost: { $sum: '$cost' },
          totalRevenue: { $sum: '$revenue' }
        }
      }
    ])
  ]);
  
  const responseResult = responseMetrics[0] || {};
  const performanceResult = performanceMetrics[0] || {};
  const responseRate = totalCommunications > 0 ? (responseResult.totalResponses / totalCommunications) * 100 : 0;
  
  return {
    totalCommunications,
    inboundCommunications,
    outboundCommunications,
    responseRate,
    averageResponseTime: responseResult.avgResponseTime || 0,
    overdueResponses: responseResult.totalOverdue || 0,
    averageEngagementScore: performanceResult.avgEngagementScore || 0,
    averageSatisfaction: performanceResult.avgSatisfaction || 0
  };
};

const getCommunicationBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byChannel,
    byDirection,
    byType,
    bySentiment
  ] = await Promise.all([
    CrmCommunication.aggregate([
      { $match: query },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]),
    CrmCommunication.aggregate([
      { $match: query },
      { $group: { _id: '$direction', count: { $sum: 1 } } }
    ]),
    CrmCommunication.aggregate([
      { $match: query },
      { $group: { _id: '$interactionType', count: { $sum: 1 } } }
    ]),
    CrmCommunication.aggregate([
      { $match: query },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    byChannel: formatBreakdown(byChannel),
    byDirection: formatBreakdown(byDirection),
    byType: formatBreakdown(byType),
    bySentiment: formatBreakdown(bySentiment)
  };
};

const getCommunicationTrends = async (startDate, endDate, agentFilter, teamFilter) => {
  const query = { 
    ...agentFilter, 
    ...teamFilter,
    createdAt: { $gte: startDate, $lte: endDate },
    deleted: false 
  };
  
  const monthlyTrends = await CrmCommunication.aggregate([
    { $match: query },
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
    monthly: monthlyTrends.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      inbound: item.inbound,
      outbound: item.outbound,
      automated: item.automated
    }))
  };
};

/**
 * Assignment Metrics Functions
 */
const getAssignmentMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalAssignments,
    activeAssignments,
    completedAssignments,
    slaMetrics,
    overdueAssignments
  ] = await Promise.all([
    CrmAssignmentMetrics.countDocuments(query),
    CrmAssignmentMetrics.countDocuments({ ...query, status: 'active' }),
    CrmAssignmentMetrics.countDocuments({ ...query, status: 'completed' }),
    CrmAssignmentMetrics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          slaMetCount: { $sum: { $cond: ['$slaMet', 1, 0] } },
          avgFirstResponseTime: { $avg: '$firstResponseTime' },
          avgResolutionTime: { $avg: '$resolutionTime' },
          avgSatisfactionScore: { $avg: '$satisfactionScore' }
        }
      }
    ]),
    CrmAssignmentMetrics.findOverdueAssignments()
  ]);
  
  const slaResult = slaMetrics[0] || {};
  const totalWithSla = totalAssignments;
  const slaComplianceRate = totalWithSla > 0 ? (slaResult.slaMetCount / totalWithSla) * 100 : 0;
  
  return {
    totalAssignments,
    activeAssignments,
    completedAssignments,
    slaComplianceRate,
    overdueAssignments: overdueAssignments.length,
    averageFirstResponseTime: slaResult.avgFirstResponseTime || 0,
    averageResolutionTime: slaResult.avgResolutionTime || 0,
    averageSatisfactionScore: slaResult.avgSatisfactionScore || 0
  };
};

const getAssignmentBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byType,
    byStatus,
    byPriority,
    byEntityType
  ] = await Promise.all([
    CrmAssignmentMetrics.aggregate([
      { $match: query },
      { $group: { _id: '$assignmentType', count: { $sum: 1 } } }
    ]),
    CrmAssignmentMetrics.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CrmAssignmentMetrics.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]),
    CrmAssignmentMetrics.aggregate([
      { $match: query },
      { $group: { _id: '$entityType', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    byType: formatBreakdown(byType),
    byStatus: formatBreakdown(byStatus),
    byPriority: formatBreakdown(byPriority),
    byEntityType: formatBreakdown(byEntityType)
  };
};

/**
 * Message Metrics Functions
 */
const getMessageMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalMessages,
    sentMessages,
    readMessages,
    engagementMetrics,
    threadMetrics
  ] = await Promise.all([
    CrmMessage.countDocuments(query),
    CrmMessage.countDocuments({ ...query, status: 'sent' }),
    CrmMessage.countDocuments({ ...query, status: 'read' }),
    CrmMessage.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgEngagementScore: { $avg: '$engagementScore' },
          totalReactions: { $sum: { $size: '$reactions' } },
          totalAttachments: { $sum: { $size: '$attachments' } },
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]),
    CrmMessage.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$threadId',
          messageCount: { $sum: 1 },
          lastActivity: { $max: '$sentAt' }
        }
      },
      {
        $group: {
          _id: null,
          totalThreads: { $sum: 1 },
          avgMessagesPerThread: { $avg: '$messageCount' },
          activeThreads: {
            $sum: {
              $cond: [
                { $gte: [{ $subtract: [new Date(), '$lastActivity'] }, 7 * 24 * 60 * 60 * 1000] },
                1,
                0
              ]
            }
          }
        }
      }
    ])
  ]);
  
  const engagementResult = engagementMetrics[0] || {};
  const threadResult = threadMetrics[0] || {};
  const readRate = totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;
  
  return {
    totalMessages,
    sentMessages,
    readMessages,
    readRate,
    averageEngagementScore: engagementResult.avgEngagementScore || 0,
    totalReactions: engagementResult.totalReactions || 0,
    totalAttachments: engagementResult.totalAttachments || 0,
    averageResponseTime: engagementResult.avgResponseTime || 0,
    totalThreads: threadResult.totalThreads || 0,
    activeThreads: threadResult.activeThreads || 0,
    averageMessagesPerThread: threadResult.avgMessagesPerThread || 0
  };
};

const getMessageBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byType,
    byStatus,
    bySenderRole
  ] = await Promise.all([
    CrmMessage.aggregate([
      { $match: query },
      { $group: { _id: '$messageType', count: { $sum: 1 } } }
    ]),
    CrmMessage.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CrmMessage.aggregate([
      { $match: query },
      { $group: { _id: '$senderRole', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    byType: formatBreakdown(byType),
    byStatus: formatBreakdown(byStatus),
    bySenderRole: formatBreakdown(bySenderRole)
  };
};

/**
 * Template Metrics Functions
 */
const getTemplateMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalTemplates,
    activeTemplates,
    performanceMetrics,
    lowPerformingTemplates
  ] = await Promise.all([
    CrmTemplate.countDocuments(query),
    CrmTemplate.countDocuments({ ...query, status: 'approved', isLatest: true }),
    CrmTemplate.aggregate([
      { $match: { ...query, status: 'approved', isLatest: true } },
      {
        $group: {
          _id: null,
          avgOpenRate: { $avg: '$metrics.averageOpenRate' },
          avgClickRate: { $avg: '$metrics.averageClickRate' },
          avgResponseRate: { $avg: '$metrics.averageResponseRate' },
          totalSent: { $sum: '$metrics.totalSent' },
          totalOpened: { $sum: '$metrics.totalOpened' },
          totalClicked: { $sum: '$metrics.totalClicked' }
        }
      }
    ]),
    CrmTemplate.find({
      ...query,
      status: 'approved',
      isLatest: true,
      'metrics.averageOpenRate': { $lt: 20 }
    }).countDocuments()
  ]);
  
  const performanceResult = performanceMetrics[0] || {};
  const averagePerformance = (performanceResult.avgOpenRate + performanceResult.avgClickRate) / 2;
  
  return {
    totalTemplates,
    activeTemplates,
    averagePerformance,
    averageOpenRate: performanceResult.avgOpenRate || 0,
    averageClickRate: performanceResult.avgClickRate || 0,
    averageResponseRate: performanceResult.avgResponseRate || 0,
    totalSent: performanceResult.totalSent || 0,
    totalOpened: performanceResult.totalOpened || 0,
    totalClicked: performanceResult.totalClicked || 0,
    lowPerformingTemplates
  };
};

const getTemplateBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byCategory,
    byChannel,
    byType,
    byStatus
  ] = await Promise.all([
    CrmTemplate.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    CrmTemplate.aggregate([
      { $match: query },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]),
    CrmTemplate.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    CrmTemplate.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    byCategory: formatBreakdown(byCategory),
    byChannel: formatBreakdown(byChannel),
    byType: formatBreakdown(byType),
    byStatus: formatBreakdown(byStatus)
  };
};

/**
 * Automation Metrics Functions
 */
const getAutomationMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    totalAutomations,
    activeAutomations,
    executionMetrics,
    failedAutomations
  ] = await Promise.all([
    CrmAutomation.countDocuments(query),
    CrmAutomation.countDocuments({ ...query, enabled: true, status: 'active' }),
    CrmAutomation.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: '$metrics.executionCount' },
          totalSuccesses: { $sum: '$metrics.successCount' },
          totalFailures: { $sum: '$metrics.failureCount' },
          avgExecutionTime: { $avg: '$metrics.averageExecutionTime' },
          totalContactsProcessed: { $sum: '$metrics.totalContactsProcessed' }
        }
      }
    ]),
    CrmAutomation.countDocuments({ ...query, status: 'error' })
  ]);
  
  const executionResult = executionMetrics[0] || {};
  const totalExecutions = executionResult.totalExecutions || 0;
  const automationSuccessRate = totalExecutions > 0 ? (executionResult.totalSuccesses / totalExecutions) * 100 : 0;
  
  return {
    totalAutomations,
    activeAutomations,
    totalExecutions,
    totalSuccesses: executionResult.totalSuccesses || 0,
    totalFailures: executionResult.totalFailures || 0,
    automationSuccessRate,
    averageExecutionTime: executionResult.avgExecutionTime || 0,
    totalContactsProcessed: executionResult.totalContactsProcessed || 0,
    failedAutomations
  };
};

const getAutomationBreakdowns = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    byCategory,
    byStatus,
    byTriggerType
  ] = await Promise.all([
    CrmAutomation.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]),
    CrmAutomation.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    CrmAutomation.aggregate([
      { $match: query },
      { $group: { _id: '$trigger.type', count: { $sum: 1 } } }
    ])
  ]);
  
  return {
    byCategory: formatBreakdown(byCategory),
    byStatus: formatBreakdown(byStatus),
    byTriggerType: formatBreakdown(byTriggerType)
  };
};

/**
 * Performance and Financial Metrics Functions
 */
const getPerformanceMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const [
    satisfactionMetrics,
    agentUtilization
  ] = await Promise.all([
    CrmCommunication.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgSatisfaction: { $avg: '$satisfaction' }
        }
      }
    ]),
    CrmAssignmentMetrics.aggregate([
      { $match: { ...query, status: 'active' } },
      {
        $group: {
          _id: '$agentId',
          workload: { $avg: '$workloadScore' },
          capacity: { $avg: '$capacityUtilization' }
        }
      },
      {
        $group: {
          _id: null,
          avgWorkload: { $avg: '$workload' },
          avgCapacity: { $avg: '$capacity' }
        }
      }
    ])
  ]);
  
  const satisfactionResult = satisfactionMetrics[0] || {};
  const utilizationResult = agentUtilization[0] || {};
  
  return {
    overallSatisfaction: satisfactionResult.avgSatisfaction || 0,
    agentUtilization: utilizationResult.avgCapacity || 0,
    averageWorkload: utilizationResult.avgWorkload || 0
  };
};

const getFinancialMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const query = { ...baseQuery, ...agentFilter, ...teamFilter, deleted: false };
  
  const financialMetrics = await CrmCommunication.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCost: { $sum: '$cost' },
        totalRevenue: { $sum: '$revenue' }
      }
    }
  ]);
  
  const result = financialMetrics[0] || {};
  const totalCost = result.totalCost || 0;
  const totalRevenue = result.totalRevenue || 0;
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
  
  return {
    totalCost,
    totalRevenue,
    roi: Math.round(roi * 100) / 100
  };
};

/**
 * Detailed metrics functions for category-specific endpoints
 */
const getDetailedContactMetrics = async (baseQuery, agentFilter, teamFilter, startDate, endDate) => {
  const basicMetrics = await getContactMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getContactBreakdowns(baseQuery, agentFilter, teamFilter);
  const trends = await getContactTrends(startDate, endDate, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns,
    trends
  };
};

const getDetailedCommunicationMetrics = async (baseQuery, agentFilter, teamFilter, startDate, endDate) => {
  const basicMetrics = await getCommunicationMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getCommunicationBreakdowns(baseQuery, agentFilter, teamFilter);
  const trends = await getCommunicationTrends(startDate, endDate, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns,
    trends
  };
};

const getDetailedAssignmentMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const basicMetrics = await getAssignmentMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getAssignmentBreakdowns(baseQuery, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns
  };
};

const getDetailedMessageMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const basicMetrics = await getMessageMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getMessageBreakdowns(baseQuery, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns
  };
};

const getDetailedTemplateMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const basicMetrics = await getTemplateMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getTemplateBreakdowns(baseQuery, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns
  };
};

const getDetailedAutomationMetrics = async (baseQuery, agentFilter, teamFilter) => {
  const basicMetrics = await getAutomationMetrics(baseQuery, agentFilter, teamFilter);
  const breakdowns = await getAutomationBreakdowns(baseQuery, agentFilter, teamFilter);
  
  return {
    ...basicMetrics,
    breakdowns
  };
};

/**
 * Utility function to format breakdown data
 */
const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

export default {
  getCrmMetrics,
  getCrmMetricsByCategory,
  getCrmRealtimeMetrics
};