import Ticket from "../../models/metrics/ticket.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

export const getTicketMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic ticket metrics
    const [
      totalTickets,
      openTickets,
      closedTickets,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      ticketsByAssignee,
      overdueTickets,
      ticketsApproachingDeadline
    ] = await Promise.all([
      Ticket.countDocuments(query),
      Ticket.countDocuments({ ...query, status: { $in: ['open', 'in-progress'] } }),
      Ticket.countDocuments({ ...query, status: { $in: ['resolved', 'closed'] } }),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ]),
      Ticket.aggregate([
        { $match: query },
        { $group: { _id: "$assignedTo", count: { $sum: 1 } } }
      ]),
      Ticket.findOverdue(),
      Ticket.findAtRisk()
    ]);
    
    // Calculate resolution metrics
    const resolutionMetrics = await getResolutionMetrics(query, startDate, endDate);
    
    // Calculate SLA metrics
    const slaMetrics = await getSLAMetrics(query);
    
    const response = {
      summary: {
        totalTickets,
        openTickets,
        closedTickets,
        overdueTickets: overdueTickets.length,
        ticketsAtRisk: ticketsApproachingDeadline.length,
        averageResolutionTime: resolutionMetrics.averageResolutionTime,
        slaComplianceRate: slaMetrics.complianceRate
      },
      breakdowns: {
        status: formatBreakdown(ticketsByStatus),
        priority: formatBreakdown(ticketsByPriority),
        category: formatBreakdown(ticketsByCategory),
        assignee: formatBreakdown(ticketsByAssignee)
      },
      performance: {
        ...resolutionMetrics,
        ...slaMetrics
      },
      alerts: {
        overdue: overdueTickets.length,
        atRisk: ticketsApproachingDeadline.length
      },
      trends: await getTicketTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findById(ticketId)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('activityLog.performedBy', 'name email')
      .populate('internalNotes.addedBy', 'name email')
      .populate('attachments.uploadedBy', 'name email');
    
    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }
    
    const response = {
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        createdBy: ticket.createdBy,
        relatedEntity: ticket.relatedEntity,
        tags: ticket.tags,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastActivityAt: ticket.lastActivityAt,
        dueDate: ticket.dueDate,
        estimatedHours: ticket.estimatedHours,
        actualHours: ticket.actualHours,
        resolution: ticket.resolution,
        resolvedAt: ticket.resolvedAt,
        resolvedBy: ticket.resolvedBy,
        satisfactionRating: ticket.satisfactionRating,
        slaDeadline: ticket.slaDeadline,
        slaStatus: ticket.slaStatus
      },
      activity: ticket.activityLog,
      internalNotes: ticket.internalNotes,
      attachments: ticket.attachments,
      virtuals: {
        isOpen: ticket.isOpen,
        isResolved: ticket.isResolved,
        isOverdue: ticket.isOverdue,
        resolutionTime: ticket.resolutionTime,
        attachmentCount: ticket.attachmentCount,
        noteCount: ticket.noteCount,
        activityCount: ticket.activityCount
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTicketList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 10)
    };
    
    // Use the query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { createdAt: -1 };
    
    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Ticket.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        createdBy: ticket.createdBy,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastActivityAt: ticket.lastActivityAt,
        dueDate: ticket.dueDate,
        slaDeadline: ticket.slaDeadline,
        slaStatus: ticket.slaStatus,
        tags: ticket.tags,
        isOpen: ticket.isOpen,
        isOverdue: ticket.isOverdue
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const searchTickets = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 10)
    };
    
    // Add search term to query if provided
    if (req.query.q) {
      query.$text = { $search: req.query.q };
    }
    
    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(req.queryBuilder.sort || { createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await Ticket.countDocuments(query);
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        createdBy: ticket.createdBy,
        createdAt: ticket.createdAt,
        lastActivityAt: ticket.lastActivityAt,
        dueDate: ticket.dueDate,
        tags: ticket.tags
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const createTicket = async (req, res) => {
  try {
    const ticketData = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy,
      createdAt: new Date()
    };

    const ticket = new Ticket(ticketData);
    await ticket.save();

    // Add initial activity log
    await ticket.addActivityLog(
      'created',
      'Ticket created',
      ticket.createdBy,
      { initialData: ticketData }
    );

    return res.status(201).json(formatSuccessResponse(ticket, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email')
     .populate('createdBy', 'name email');

    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    // Add activity log for the update
    await ticket.addActivityLog(
      'updated',
      'Ticket updated',
      req.user?.id,
      { changes: updateData }
    );

    return res.json(formatSuccessResponse(ticket, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findByIdAndDelete(ticketId);
    
    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(
      { message: 'Ticket deleted successfully' },
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      { 
        assignedTo,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    // Add activity log for assignment
    await ticket.addActivityLog(
      'assigned',
      `Ticket assigned to ${ticket.assignedTo?.name || 'Unknown'}`,
      req.user?.id,
      { assignedTo }
    );

    return res.json(formatSuccessResponse(ticket, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, resolution } = req.body;
    
    const updateData = { status };
    if (resolution) {
      updateData.resolution = resolution;
    }

    // If resolving or closing, set resolved info
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user?.id;
    }

    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email')
     .populate('resolvedBy', 'name email');

    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    // Add activity log for status change
    await ticket.addActivityLog(
      'status_changed',
      `Status changed to ${status}`,
      req.user?.id,
      { newStatus: status, resolution }
    );

    return res.json(formatSuccessResponse(ticket, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const addTicketNote = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { note, isPrivate = true } = req.body;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    await ticket.addInternalNote(note, req.user?.id, isPrivate);

    // Add activity log for note addition
    await ticket.addActivityLog(
      'note_added',
      'Internal note added',
      req.user?.id,
      { note: note.substring(0, 100), isPrivate }
    );

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('internalNotes.addedBy', 'name email');

    return res.json(formatSuccessResponse(
      updatedTicket.internalNotes[updatedTicket.internalNotes.length - 1],
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const uploadTicketAttachment = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    if (!req.file) {
      return res.status(400).json(formatErrorResponse({
        code: 'NO_FILE_UPLOADED',
        message: 'No file uploaded'
      }, req, 400));
    }

    const attachmentData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/tickets/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    await ticket.addAttachment(attachmentData, req.user?.id);

    // Add activity log for file upload
    await ticket.addActivityLog(
      'attachment_added',
      `File uploaded: ${req.file.originalname}`,
      req.user?.id,
      { filename: req.file.filename, size: req.file.size }
    );

    const updatedTicket = await Ticket.findById(ticketId)
      .populate('attachments.uploadedBy', 'name email');

    return res.json(formatSuccessResponse(
      updatedTicket.attachments[updatedTicket.attachments.length - 1],
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const getTicketActivity = async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findById(ticketId)
      .populate('activityLog.performedBy', 'name email')
      .select('activityLog');
    
    if (!ticket) {
      return res.status(404).json(formatErrorResponse({
        code: 'TICKET_NOT_FOUND',
        message: 'Ticket not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(ticket.activityLog, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk operations
export const bulkUpdateTickets = async (req, res) => {
  try {
    const { ticketIds, updateData } = req.body;
    
    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { ...updateData, updatedAt: new Date() }
    );

    // Add activity log for each updated ticket
    const tickets = await Ticket.find({ _id: { $in: ticketIds } });
    for (const ticket of tickets) {
      await ticket.addActivityLog(
        'bulk_updated',
        'Ticket updated via bulk operation',
        req.user?.id,
        { changes: updateData }
      );
    }

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} tickets`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkAssignTickets = async (req, res) => {
  try {
    const { ticketIds, assignedTo } = req.body;
    
    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { 
        assignedTo,
        updatedAt: new Date()
      }
    );

    // Add activity log for each assigned ticket
    const tickets = await Ticket.find({ _id: { $in: ticketIds } });
    for (const ticket of tickets) {
      await ticket.addActivityLog(
        'bulk_assigned',
        'Ticket assigned via bulk operation',
        req.user?.id,
        { assignedTo }
      );
    }

    return res.json(formatSuccessResponse({
      assignedCount: result.modifiedCount,
      message: `Successfully assigned ${result.modifiedCount} tickets`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkUpdateStatus = async (req, res) => {
  try {
    const { ticketIds, status, resolution } = req.body;
    
    const updateData = { status };
    if (resolution) {
      updateData.resolution = resolution;
    }
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = req.user?.id;
    }

    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      updateData
    );

    // Add activity log for each updated ticket
    const tickets = await Ticket.find({ _id: { $in: ticketIds } });
    for (const ticket of tickets) {
      await ticket.addActivityLog(
        'bulk_status_changed',
        `Status changed to ${status} via bulk operation`,
        req.user?.id,
        { newStatus: status, resolution }
      );
    }

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated status for ${result.modifiedCount} tickets`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkDeleteTickets = async (req, res) => {
  try {
    const { ticketIds } = req.body;
    
    const result = await Ticket.deleteMany({ _id: { $in: ticketIds } });

    return res.json(formatSuccessResponse({
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} tickets`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getResolutionMetrics = async (query, startDate, endDate) => {
  const ticketIds = await Ticket.find(query).distinct('_id');
  
  const [resolvedTickets, avgResolutionTime] = await Promise.all([
    Ticket.countDocuments({
      _id: { $in: ticketIds },
      status: { $in: ['resolved', 'closed'] },
      resolvedAt: { $gte: startDate, $lte: endDate }
    }),
    Ticket.aggregate([
      {
        $match: {
          _id: { $in: ticketIds },
          status: { $in: ['resolved', 'closed'] },
          resolvedAt: { $exists: true }
        }
      },
      {
        $project: {
          resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ])
  ]);
  
  const totalTickets = ticketIds.length;
  const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
  
  return {
    resolvedTickets,
    resolutionRate: Math.round(resolutionRate * 10) / 10,
    averageResolutionTime: avgResolutionTime[0]?.avgResolutionTime || 0
  };
};

const getSLAMetrics = async (query) => {
  const ticketIds = await Ticket.find(query).distinct('_id');
  
  const [slaCompliant, slaBreached, atRisk] = await Promise.all([
    Ticket.countDocuments({
      _id: { $in: ticketIds },
      slaStatus: 'on_track'
    }),
    Ticket.countDocuments({
      _id: { $in: ticketIds },
      slaStatus: 'breached'
    }),
    Ticket.countDocuments({
      _id: { $in: ticketIds },
      slaStatus: 'at_risk'
    })
  ]);
  
  const totalWithSLA = slaCompliant + slaBreached + atRisk;
  const complianceRate = totalWithSLA > 0 ? (slaCompliant / totalWithSLA) * 100 : 0;
  
  return {
    slaCompliant,
    slaBreached,
    atRisk,
    complianceRate: Math.round(complianceRate * 10) / 10
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getTicketTrends = async (startDate, endDate) => {
  // Get monthly ticket creation trends
  const monthlyTickets = await Ticket.aggregate([
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
        created: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  // Get monthly resolution trends
  const monthlyResolutions = await Ticket.aggregate([
    {
      $match: {
        resolvedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: "$resolvedAt" },
          month: { $month: "$resolvedAt" }
        },
        resolved: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    created: monthlyTickets.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.created
    })),
    resolved: monthlyResolutions.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      count: item.resolved
    }))
  };
};

export default {
  getTicketMetrics,
  getTicketDetails,
  getTicketList,
  searchTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  assignTicket,
  updateTicketStatus,
  addTicketNote,
  uploadTicketAttachment,
  getTicketActivity,
  bulkUpdateTickets,
  bulkAssignTickets,
  bulkUpdateStatus,
  bulkDeleteTickets
};