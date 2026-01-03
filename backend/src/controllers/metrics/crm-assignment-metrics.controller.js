import CrmAssignmentMetrics from "../../models/metrics/crm-assignment-metrics.model.js";
import CrmMessageThread from "../../models/metrics/crm-message-thread.model.js";
import CrmContact from "../../models/metrics/crm-contact.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get comprehensive assignment metrics and analytics
 */
export const getAssignmentMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic assignment metrics
    const [
      totalAssignments,
      activeAssignments,
      completedAssignments,
      transferredAssignments,
      cancelledAssignments,
      assignmentsByAgent,
      assignmentsByEntityType,
      assignmentsByStatus,
      assignmentsByPriority,
      assignmentsByAssignmentType,
      overdueAssignments,
      escalatedAssignments,
      assignmentStats
    ] = await Promise.all([
      CrmAssignmentMetrics.countDocuments(query),
      CrmAssignmentMetrics.countDocuments({ ...query, status: 'active' }),
      CrmAssignmentMetrics.countDocuments({ ...query, status: 'completed' }),
      CrmAssignmentMetrics.countDocuments({ ...query, status: 'transferred' }),
      CrmAssignmentMetrics.countDocuments({ ...query, status: 'cancelled' }),
      CrmAssignmentMetrics.aggregate([
        { $match: query },
        { $group: { _id: "$agentId", count: { $sum: 1 } } },
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
            count: 1
          }
        }
      ]),
      CrmAssignmentMetrics.aggregate([
        { $match: query },
        { $group: { _id: "$entityType", count: { $sum: 1 } } }
      ]),
      CrmAssignmentMetrics.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      CrmAssignmentMetrics.aggregate([
        { $match: query },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      CrmAssignmentMetrics.aggregate([
        { $match: query },
        { $group: { _id: "$assignmentType", count: { $sum: 1 } } }
      ]),
      CrmAssignmentMetrics.findOverdueAssignments(),
      CrmAssignmentMetrics.find({ 
        ...query, 
        escalationLevel: { $gt: 0 },
        deleted: false 
      }),
      CrmAssignmentMetrics.getAssignmentStats(query)
    ]);
    
    // Calculate performance metrics
    const performanceMetrics = await getPerformanceMetrics(query, startDate, endDate);
    
    // Calculate agent workload metrics
    const agentWorkloadMetrics = await getAgentWorkloadMetrics(query, startDate, endDate);
    
    // Calculate trends
    const trends = await getAssignmentTrends(startDate, endDate);
    
    const response = {
      summary: {
        totalAssignments,
        activeAssignments,
        completedAssignments,
        transferredAssignments,
        cancelledAssignments,
        overdueAssignments: overdueAssignments.length,
        escalatedAssignments: escalatedAssignments.length,
        averageFirstResponseTime: performanceMetrics.averageFirstResponseTime,
        averageResolutionTime: performanceMetrics.averageResolutionTime,
        averageSatisfactionScore: performanceMetrics.averageSatisfactionScore,
        slaComplianceRate: performanceMetrics.slaComplianceRate
      },
      breakdowns: {
        byAgent: formatBreakdown(assignmentsByAgent, 'agentId'),
        byEntityType: formatBreakdown(assignmentsByEntityType, 'entityType'),
        byStatus: formatBreakdown(assignmentsByStatus, 'status'),
        byPriority: formatBreakdown(assignmentsByPriority, 'priority'),
        byAssignmentType: formatBreakdown(assignmentsByAssignmentType, 'assignmentType')
      },
      performance: {
        ...performanceMetrics,
        ...agentWorkloadMetrics
      },
      alerts: {
        overdueAssignments: overdueAssignments.length,
        escalatedAssignments: escalatedAssignments.length,
        agentsOverCapacity: agentWorkloadMetrics.agentsOverCapacity,
        highPriorityUnassigned: await getHighPriorityUnassignedCount()
      },
      trends
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get detailed assignment by ID
 */
export const getAssignmentDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId)
      .populate('agentId', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email')
      .populate('transferredFrom', 'firstName lastName email')
      .populate('escalatedTo', 'firstName lastName email');
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    // Get related entity details
    let relatedEntity = null;
    if (assignment.entityType === 'thread') {
      relatedEntity = await CrmMessageThread.findById(assignment.entityId)
        .select('threadId subject status priority');
    } else if (assignment.entityType === 'contact') {
      relatedEntity = await CrmContact.findById(assignment.entityId)
        .select('firstName lastName email contactType status');
    }
    
    const response = {
      assignment: {
        id: assignment._id,
        assignmentId: assignment.assignmentId,
        agentId: assignment.agentId,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        assignmentType: assignment.assignmentType,
        assignmentReason: assignment.assignmentReason,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assignedBy,
        transferredFrom: assignment.transferredFrom,
        transferredAt: assignment.transferredAt,
        transferReason: assignment.transferReason,
        completedAt: assignment.completedAt,
        completionReason: assignment.completionReason,
        workloadScore: assignment.workloadScore,
        capacityUtilization: assignment.capacityUtilization,
        firstResponseTime: assignment.firstResponseTime,
        averageResponseTime: assignment.averageResponseTime,
        resolutionTime: assignment.resolutionTime,
        satisfactionScore: assignment.satisfactionScore,
        totalMessages: assignment.totalMessages,
        totalInteractions: assignment.totalInteractions,
        lastActivityAt: assignment.lastActivityAt,
        slaDeadline: assignment.slaDeadline,
        slaMet: assignment.slaMet,
        slaBreachReason: assignment.slaBreachReason,
        priority: assignment.priority,
        escalationLevel: assignment.escalationLevel,
        escalatedAt: assignment.escalatedAt,
        escalatedTo: assignment.escalatedTo,
        requiredSkills: assignment.requiredSkills,
        agentSkills: assignment.agentSkills,
        skillMatchScore: assignment.skillMatchScore,
        tags: assignment.tags,
        customFields: assignment.customFields,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt
      },
      relatedEntity,
      virtuals: {
        isOverdue: assignment.isOverdue,
        isActive: assignment.isActive,
        isCompleted: assignment.isCompleted,
        isTransferred: assignment.isTransferred,
        isHighPriority: assignment.isHighPriority,
        assignmentDuration: assignment.assignmentDuration,
        isEscalated: assignment.isEscalated
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get paginated list of assignments
 */
export const getAssignmentList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Use query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { assignedAt: -1 };
    
    const assignments = await CrmAssignmentMetrics.findActive(query)
      .populate('agentId', 'firstName lastName email')
      .populate('assignedBy', 'firstName lastName email')
      .populate('transferredFrom', 'firstName lastName email')
      .populate('escalatedTo', 'firstName lastName email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmAssignmentMetrics.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: assignments.map(assignment => ({
        id: assignment._id,
        assignmentId: assignment.assignmentId,
        agentId: assignment.agentId,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        assignmentType: assignment.assignmentType,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        completedAt: assignment.completedAt,
        workloadScore: assignment.workloadScore,
        capacityUtilization: assignment.capacityUtilization,
        firstResponseTime: assignment.firstResponseTime,
        resolutionTime: assignment.resolutionTime,
        satisfactionScore: assignment.satisfactionScore,
        totalMessages: assignment.totalMessages,
        slaDeadline: assignment.slaDeadline,
        slaMet: assignment.slaMet,
        priority: assignment.priority,
        escalationLevel: assignment.escalationLevel,
        tags: assignment.tags,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        virtuals: {
          isOverdue: assignment.isOverdue,
          isActive: assignment.isActive,
          isCompleted: assignment.isCompleted,
          isHighPriority: assignment.isHighPriority,
          assignmentDuration: assignment.assignmentDuration,
          isEscalated: assignment.isEscalated
        }
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create a new assignment
 */
export const createAssignment = async (req, res) => {
  try {
    const {
      agentId,
      entityType,
      entityId,
      assignmentType = 'manual',
      assignmentReason,
      priority = 'medium',
      requiredSkills,
      tags,
      customFields
    } = req.body;
    
    // Validate required fields
    if (!agentId || !entityType || !entityId) {
      return res.status(400).json(formatErrorResponse({
        code: 'REQUIRED_FIELDS_MISSING',
        message: 'Agent ID, entity type, and entity ID are required'
      }, req, 400));
    }
    
    // Check if assignment already exists for this entity
    const existingAssignment = await CrmAssignmentMetrics.findOne({
      entityType,
      entityId,
      status: 'active',
      deleted: false
    });
    
    if (existingAssignment) {
      return res.status(400).json(formatErrorResponse({
        code: 'ASSIGNMENT_EXISTS',
        message: 'Active assignment already exists for this entity'
      }, req, 400));
    }
    
    const assignmentData = {
      agentId,
      entityType,
      entityId,
      assignmentType,
      assignmentReason,
      priority,
      requiredSkills: requiredSkills || [],
      tags: tags || [],
      customFields: customFields || {},
      assignedBy: req.user?.id
    };
    
    const assignment = new CrmAssignmentMetrics(assignmentData);
    await assignment.save();
    
    // Update agent skills if provided
    if (requiredSkills && requiredSkills.length > 0) {
      await assignment.updateSkillMatch(requiredSkills, requiredSkills); // For demo, using same skills
    }
    
    // Populate references for response
    await assignment.populate('agentId', 'firstName lastName email');
    await assignment.populate('assignedBy', 'firstName lastName email');
    
    return res.status(201).json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update assignment
 */
export const updateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const assignment = await CrmAssignmentMetrics.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true, runValidators: true }
    ).populate('agentId', 'firstName lastName email')
     .populate('assignedBy', 'firstName lastName email');
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    return res.json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete assignment (soft delete)
 */
export const deleteAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    await assignment.softDelete(req.user?.id);
    
    return res.json(formatSuccessResponse(
      { message: 'Assignment deleted successfully' },
      req
    ));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Transfer assignment to another agent
 */
export const transferAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { toAgentId, reason, priority } = req.body;
    
    if (!toAgentId) {
      return res.status(400).json(formatErrorResponse({
        code: 'TO_AGENT_ID_REQUIRED',
        message: 'Target agent ID is required'
      }, req, 400));
    }
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    await assignment.transfer(toAgentId, reason);
    
    if (priority) {
      assignment.priority = priority;
      await assignment.save();
    }
    
    // Populate references for response
    await assignment.populate('agentId', 'firstName lastName email');
    await assignment.populate('transferredFrom', 'firstName lastName email');
    
    return res.json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Complete assignment
 */
export const completeAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { completionReason, satisfactionScore, notes } = req.body;
    
    if (!completionReason) {
      return res.status(400).json(formatErrorResponse({
        code: 'COMPLETION_REASON_REQUIRED',
        message: 'Completion reason is required'
      }, req, 400));
    }
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    await assignment.complete(completionReason, satisfactionScore);
    
    // Add notes to custom fields if provided
    if (notes) {
      assignment.customFields.set('completionNotes', notes);
      await assignment.save();
    }
    
    return res.json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get assignments by agent
 */
export const getAgentAssignments = async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      entityType,
      sortBy = 'assignedAt',
      sortOrder = 'desc'
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      entityType,
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 }
    };
    
    const assignments = await CrmAssignmentMetrics.findByAgent(agentId, options);
    const total = await CrmAssignmentMetrics.countDocuments({ 
      agentId, 
      status: status || { $ne: null },
      entityType: entityType || { $ne: null },
      deleted: false 
    });
    const paginationMeta = buildPaginationMeta(parseInt(page), parseInt(limit), total);
    
    const response = {
      agentId,
      data: assignments,
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
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
    const workload = await CrmAssignmentMetrics.getAgentWorkload(agentId, dateRange);
    
    // Get current active assignments count
    const activeAssignments = await CrmAssignmentMetrics.countDocuments({
      agentId,
      status: 'active',
      deleted: false
    });
    
    // Get performance metrics
    const performanceMetrics = await CrmAssignmentMetrics.getAgentPerformanceMetrics(
      agentId, 
      dateRange
    );
    
    const response = {
      agentId,
      currentWorkload: {
        activeAssignments,
        capacityUtilization: calculateCapacityUtilization(activeAssignments)
      },
      periodWorkload: workload,
      performance: performanceMetrics
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get overdue assignments
 */
export const getOverdueAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const overdueAssignments = await CrmAssignmentMetrics.findOverdueAssignments();
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedAssignments = overdueAssignments.slice(startIndex, startIndex + limit);
    const total = overdueAssignments.length;
    const paginationMeta = buildPaginationMeta(parseInt(page), parseInt(limit), total);
    
    const response = {
      data: paginatedAssignments,
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Escalate assignment
 */
export const escalateAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { toAgentId, level } = req.body;
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    await assignment.escalate(toAgentId, level);
    
    // Populate references for response
    await assignment.populate('agentId', 'firstName lastName email');
    await assignment.populate('escalatedTo', 'firstName lastName email');
    
    return res.json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update assignment metrics
 */
export const updateAssignmentMetrics = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const {
      firstResponseTime,
      averageResponseTime,
      resolutionTime,
      totalMessages,
      totalInteractions,
      workloadScore,
      capacityUtilization
    } = req.body;
    
    const assignment = await CrmAssignmentMetrics.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json(formatErrorResponse({
        code: 'ASSIGNMENT_NOT_FOUND',
        message: 'Assignment not found'
      }, req, 404));
    }
    
    const metrics = {
      firstResponseTime,
      averageResponseTime,
      resolutionTime,
      totalMessages,
      totalInteractions
    };
    
    await assignment.updateMetrics(metrics);
    
    if (workloadScore !== undefined || capacityUtilization !== undefined) {
      await assignment.updateWorkload(
        workloadScore || assignment.workloadScore,
        capacityUtilization
      );
    }
    
    return res.json(formatSuccessResponse(assignment, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getPerformanceMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmAssignmentMetrics.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        averageFirstResponseTime: { $avg: '$firstResponseTime' },
        averageResolutionTime: { $avg: '$resolutionTime' },
        averageSatisfactionScore: { $avg: '$satisfactionScore' },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalOverdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$slaDeadline', null] },
                  { $lt: ['$slaDeadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  const result = metrics[0] || {};
  const totalCompleted = result.totalCompleted || 0;
  const totalOverdue = result.totalOverdue || 0;
  const totalAssignments = totalCompleted + totalOverdue;
  
  return {
    averageFirstResponseTime: result.averageFirstResponseTime || 0,
    averageResolutionTime: result.averageResolutionTime || 0,
    averageSatisfactionScore: result.averageSatisfactionScore || 0,
    slaComplianceRate: totalAssignments > 0 ? ((totalAssignments - totalOverdue) / totalAssignments) * 100 : 100
  };
};

const getAgentWorkloadMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmAssignmentMetrics.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$agentId',
        activeAssignments: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        avgWorkloadScore: { $avg: '$workloadScore' },
        avgCapacityUtilization: { $avg: '$capacityUtilization' },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
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
        activeAssignments: 1,
        avgWorkloadScore: 1,
        avgCapacityUtilization: 1,
        totalCompleted: 1
      }
    }
  ]);
  
  const agentsOverCapacity = metrics.filter(m => m.avgCapacityUtilization > 80).length;
  
  return {
    agentWorkload: metrics,
    agentsOverCapacity
  };
};

const getAssignmentTrends = async (startDate, endDate) => {
  // Get monthly assignment trends
  const monthlyAssignments = await CrmAssignmentMetrics.aggregate([
    {
      $match: {
        assignedAt: { $gte: startDate, $lte: endDate },
        deleted: false
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$assignedAt" },
          month: { $month: "$assignedAt" }
        },
        assigned: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        transferred: {
          $sum: { $cond: [{ $eq: ['$status', 'transferred'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$firstResponseTime' }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    assignments: monthlyAssignments.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      assigned: item.assigned,
      completed: item.completed,
      transferred: item.transferred,
      avgResponseTime: item.avgResponseTime
    }))
  };
};

const getHighPriorityUnassignedCount = async () => {
  const count = await CrmAssignmentMetrics.countDocuments({
    entityType: 'thread',
    priority: { $in: ['high', 'urgent'] },
    status: 'active',
    deleted: false
  });
  
  return count;
};

const calculateCapacityUtilization = (activeAssignments) => {
  // Assuming capacity of 20 assignments per agent
  const maxCapacity = 20;
  return Math.min(100, (activeAssignments / maxCapacity) * 100);
};

const formatBreakdown = (breakdown, keyField) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

export default {
  getAssignmentMetrics,
  getAssignmentDetails,
  getAssignmentList,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  transferAssignment,
  completeAssignment,
  getAgentAssignments,
  getAgentWorkload,
  getOverdueAssignments,
  escalateAssignment,
  updateAssignmentMetrics
};