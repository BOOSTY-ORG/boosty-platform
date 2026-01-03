import CrmMessageThread from "../../models/metrics/crm-message-thread.model.js";
import CrmMessage from "../../models/metrics/crm-message.model.js";
import CrmAssignmentMetrics from "../../models/metrics/crm-assignment-metrics.model.js";
import CrmContact from "../../models/metrics/crm-contact.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get paginated list of message threads
 */
export const getMessageThreads = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Use query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { lastMessageAt: -1 };
    
    const threads = await CrmMessageThread.findActive(query)
      .populate('assignedAgent', 'firstName lastName email')
      .populate('participants.userId', 'firstName lastName email')
      .populate('participants.contactId', 'firstName lastName email')
      .populate('lastActivityBy', 'firstName lastName email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmMessageThread.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: threads.map(thread => ({
        id: thread._id,
        threadId: thread.threadId,
        threadType: thread.threadType,
        subject: thread.subject,
        assignedAgent: thread.assignedAgent,
        status: thread.status,
        priority: thread.priority,
        primaryChannel: thread.primaryChannel,
        relatedEntityType: thread.relatedEntityType,
        relatedEntityId: thread.relatedEntityId,
        lastMessageAt: thread.lastMessageAt,
        lastActivityBy: thread.lastActivityBy,
        messageCount: thread.messageCount,
        unreadCount: thread.unreadCount,
        tags: thread.tags,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        virtuals: {
          isOverdue: thread.isOverdue,
          participantCount: thread.participantCount,
          hasUnreadMessages: thread.hasUnreadMessages,
          isHighPriority: thread.isHighPriority
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
 * Get detailed message thread by ID
 */
export const getMessageThreadDetails = async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const thread = await CrmMessageThread.findById(threadId)
      .populate('assignedAgent', 'firstName lastName email')
      .populate('participants.userId', 'firstName lastName email')
      .populate('participants.contactId', 'firstName lastName email')
      .populate('lastActivityBy', 'firstName lastName email');
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    const response = {
      thread: {
        id: thread._id,
        threadId: thread.threadId,
        threadType: thread.threadType,
        participants: thread.participants,
        subject: thread.subject,
        assignedAgent: thread.assignedAgent,
        status: thread.status,
        priority: thread.priority,
        primaryChannel: thread.primaryChannel,
        relatedEntityType: thread.relatedEntityType,
        relatedEntityId: thread.relatedEntityId,
        lastMessageAt: thread.lastMessageAt,
        lastActivityBy: thread.lastActivityBy,
        messageCount: thread.messageCount,
        unreadCount: thread.unreadCount,
        autoAssignmentEnabled: thread.autoAssignmentEnabled,
        assignmentRules: thread.assignmentRules,
        responseDeadline: thread.responseDeadline,
        firstResponseAt: thread.firstResponseAt,
        averageResponseTime: thread.averageResponseTime,
        tags: thread.tags,
        customFields: thread.customFields,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt
      },
      virtuals: {
        isOverdue: thread.isOverdue,
        participantCount: thread.participantCount,
        hasUnreadMessages: thread.hasUnreadMessages,
        isHighPriority: thread.isHighPriority
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create a new message thread
 */
export const createMessageThread = async (req, res) => {
  try {
    const {
      threadType = 'direct',
      participants,
      subject,
      assignedAgent,
      priority = 'medium',
      primaryChannel = 'in_app',
      relatedEntityType,
      relatedEntityId,
      tags,
      autoAssignmentEnabled = false,
      responseDeadline
    } = req.body;
    
    // Validate participants
    if (!participants || participants.length === 0) {
      return res.status(400).json(formatErrorResponse({
        code: 'INVALID_PARTICIPANTS',
        message: 'At least one participant is required'
      }, req, 400));
    }
    
    const threadData = {
      threadType,
      participants,
      subject,
      assignedAgent,
      priority,
      primaryChannel,
      relatedEntityType,
      relatedEntityId,
      tags,
      autoAssignmentEnabled,
      responseDeadline: responseDeadline ? new Date(responseDeadline) : undefined,
      createdBy: req.user?.id
    };
    
    const thread = new CrmMessageThread(threadData);
    await thread.save();
    
    // Populate references for response
    await thread.populate('assignedAgent', 'firstName lastName email');
    await thread.populate('participants.userId', 'firstName lastName email');
    await thread.populate('participants.contactId', 'firstName lastName email');
    
    // Create assignment metrics if agent is assigned
    if (assignedAgent) {
      const assignmentData = {
        agentId: assignedAgent,
        entityType: 'thread',
        entityId: thread._id,
        assignmentType: 'manual',
        assignmentReason: 'Thread creation',
        priority,
        assignedBy: req.user?.id
      };
      
      const assignment = new CrmAssignmentMetrics(assignmentData);
      await assignment.save();
    }
    
    return res.status(201).json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update message thread
 */
export const updateMessageThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };
    
    const thread = await CrmMessageThread.findByIdAndUpdate(
      threadId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedAgent', 'firstName lastName email')
     .populate('participants.userId', 'firstName lastName email')
     .populate('participants.contactId', 'firstName lastName email');
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete message thread (soft delete)
 */
export const deleteMessageThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    await thread.softDelete(req.user?.id);
    
    return res.json(formatSuccessResponse(
      { message: 'Message thread deleted successfully' },
      req
    ));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get messages in a thread
 */
export const getThreadMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const {
      page = 1,
      limit = 50,
      before,
      after,
      messageType
    } = req.query;
    
    // Verify thread exists
    const thread = await CrmMessageThread.findById(threadId);
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      before,
      after,
      messageType,
      sort: { sentAt: -1 }
    };
    
    const messages = await CrmMessage.findByThread(threadId, options);
    const total = await CrmMessage.countDocuments({ threadId, deleted: false });
    const paginationMeta = buildPaginationMeta(parseInt(page), parseInt(limit), total);
    
    const response = {
      threadId,
      data: messages.map(message => ({
        id: message._id,
        threadId: message.threadId,
        content: message.content,
        messageType: message.messageType,
        senderId: message.senderId,
        senderModel: message.senderModel,
        senderRole: message.senderRole,
        status: message.status,
        sentAt: message.sentAt,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
        editedAt: message.editedAt,
        editedCount: message.editedCount,
        attachments: message.attachments,
        replyTo: message.replyTo,
        forwardedFrom: message.forwardedFrom,
        deliveryChannels: message.deliveryChannels,
        engagementScore: message.engagementScore,
        reactions: message.reactions,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
        virtuals: {
          isDelivered: message.isDelivered,
          isRead: message.isRead,
          isEdited: message.isEdited,
          hasAttachments: message.hasAttachments,
          attachmentCount: message.attachmentCount,
          reactionCount: message.reactionCount
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
 * Send a message in a thread
 */
export const sendMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const {
      content,
      messageType = 'text',
      attachments,
      replyTo,
      deliveryChannels = ['in_app']
    } = req.body;
    
    // Verify thread exists
    const thread = await CrmMessageThread.findById(threadId);
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    // Determine sender information
    const senderModel = req.user ? 'User' : 'CrmContact';
    const senderId = req.user?.id || req.contact?.id;
    const senderRole = req.user ? 'agent' : 'contact';
    
    const messageData = {
      threadId,
      content,
      messageType,
      senderId,
      senderModel,
      senderRole,
      attachments: attachments || [],
      replyTo,
      deliveryChannels: deliveryChannels.map(channel => ({
        channel,
        status: channel === 'in_app' ? 'sent' : 'pending'
      }))
    };
    
    const message = new CrmMessage(messageData);
    await message.save();
    
    // Update thread message count and last activity
    await thread.updateMessageCount(1);
    thread.lastActivityBy = senderId;
    await thread.save();
    
    // Mark message as delivered for in_app channel
    if (deliveryChannels.includes('in_app')) {
      await message.markAsDelivered('in_app');
    }
    
    // Populate references for response
    await message.populate('senderId', 'firstName lastName email');
    await message.populate('replyTo', 'content messageType');
    
    return res.status(201).json(formatSuccessResponse(message, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update a message
 */
export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, attachments } = req.body;
    
    const message = await CrmMessage.findById(messageId)
      .populate('threadId', 'threadId status');
    
    if (!message) {
      return res.status(404).json(formatErrorResponse({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }, req, 404));
    }
    
    // Check if message can be edited (not system message and not too old)
    if (message.messageType === 'system') {
      return res.status(400).json(formatErrorResponse({
        code: 'CANNOT_EDIT_SYSTEM_MESSAGE',
        message: 'System messages cannot be edited'
      }, req, 400));
    }
    
    const messageAge = Date.now() - message.sentAt.getTime();
    const maxEditTime = 15 * 60 * 1000; // 15 minutes
    
    if (messageAge > maxEditTime) {
      return res.status(400).json(formatErrorResponse({
        code: 'EDIT_TIME_EXPIRED',
        message: 'Message can only be edited within 15 minutes of sending'
      }, req, 400));
    }
    
    // Update message
    if (content) message.content = content;
    if (attachments) message.attachments = attachments;
    
    await message.save();
    
    return res.json(formatSuccessResponse(message, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete a message (soft delete)
 */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await CrmMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json(formatErrorResponse({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }, req, 404));
    }
    
    await message.softDelete(req.user?.id);
    
    return res.json(formatSuccessResponse(
      { message: 'Message deleted successfully' },
      req
    ));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await CrmMessage.findById(messageId)
      .populate('threadId');
    
    if (!message) {
      return res.status(404).json(formatErrorResponse({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }, req, 404));
    }
    
    await message.markAsRead();
    
    // Update thread unread count
    const thread = message.threadId;
    if (thread.unreadCount > 0) {
      thread.unreadCount -= 1;
      await thread.save();
    }
    
    return res.json(formatSuccessResponse(message, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Add reaction to message
 */
export const addMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    
    if (!reaction) {
      return res.status(400).json(formatErrorResponse({
        code: 'REACTION_REQUIRED',
        message: 'Reaction is required'
      }, req, 400));
    }
    
    const message = await CrmMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json(formatErrorResponse({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }, req, 404));
    }
    
    const userId = req.user?.id;
    const contactId = req.contact?.id;
    
    await message.addReaction(userId, contactId, reaction);
    
    return res.json(formatSuccessResponse(message, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Remove reaction from message
 */
export const removeMessageReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await CrmMessage.findById(messageId);
    
    if (!message) {
      return res.status(404).json(formatErrorResponse({
        code: 'MESSAGE_NOT_FOUND',
        message: 'Message not found'
      }, req, 404));
    }
    
    const userId = req.user?.id;
    const contactId = req.contact?.id;
    
    await message.removeReaction(userId, contactId);
    
    return res.json(formatSuccessResponse(message, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Add participant to thread
 */
export const addThreadParticipant = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { participants } = req.body;
    
    if (!participants || participants.length === 0) {
      return res.status(400).json(formatErrorResponse({
        code: 'PARTICIPANTS_REQUIRED',
        message: 'At least one participant is required'
      }, req, 400));
    }
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    // Add each participant
    for (const participant of participants) {
      await thread.addParticipant(
        participant.userId,
        participant.contactId,
        participant.role
      );
    }
    
    // Populate references for response
    await thread.populate('participants.userId', 'firstName lastName email');
    await thread.populate('participants.contactId', 'firstName lastName email');
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Remove participant from thread
 */
export const removeThreadParticipant = async (req, res) => {
  try {
    const { threadId, participantId } = req.params;
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    // Try to find participant by userId or contactId
    const participant = thread.participants.find(p => 
      (p.userId && p.userId.toString() === participantId) ||
      (p.contactId && p.contactId.toString() === participantId)
    );
    
    if (!participant) {
      return res.status(404).json(formatErrorResponse({
        code: 'PARTICIPANT_NOT_FOUND',
        message: 'Participant not found in thread'
      }, req, 404));
    }
    
    await thread.removeParticipant(participant.userId, participant.contactId);
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Assign thread to agent
 */
export const assignThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { agentId, assignmentType = 'manual', assignmentReason } = req.body;
    
    if (!agentId) {
      return res.status(400).json(formatErrorResponse({
        code: 'AGENT_ID_REQUIRED',
        message: 'Agent ID is required'
      }, req, 400));
    }
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    // Update thread assignment
    await thread.assignToAgent(agentId);
    
    // Create or update assignment metrics
    let assignment = await CrmAssignmentMetrics.findOne({
      entityType: 'thread',
      entityId: threadId,
      status: 'active',
      deleted: false
    });
    
    if (assignment) {
      // Transfer existing assignment
      await assignment.transfer(agentId, assignmentReason || 'Manual reassignment');
    } else {
      // Create new assignment
      const assignmentData = {
        agentId,
        entityType: 'thread',
        entityId: threadId,
        assignmentType,
        assignmentReason: assignmentReason || 'Manual assignment',
        priority: thread.priority,
        assignedBy: req.user?.id
      };
      
      assignment = new CrmAssignmentMetrics(assignmentData);
      await assignment.save();
    }
    
    // Populate references for response
    await thread.populate('assignedAgent', 'firstName lastName email');
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Close thread
 */
export const closeThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { reason, satisfactionScore } = req.body;
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    await thread.closeThread();
    
    // Complete assignment if exists
    const assignment = await CrmAssignmentMetrics.findOne({
      entityType: 'thread',
      entityId: threadId,
      status: 'active',
      deleted: false
    });
    
    if (assignment) {
      await assignment.complete('closed', satisfactionScore);
    }
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Archive thread
 */
export const archiveThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    
    const thread = await CrmMessageThread.findById(threadId);
    
    if (!thread) {
      return res.status(404).json(formatErrorResponse({
        code: 'THREAD_NOT_FOUND',
        message: 'Message thread not found'
      }, req, 404));
    }
    
    await thread.archiveThread();
    
    return res.json(formatSuccessResponse(thread, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Search messages
 */
export const searchMessages = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json(formatErrorResponse({
        code: 'SEARCH_QUERY_REQUIRED',
        message: 'Search query is required'
      }, req, 400));
    }
    
    const {
      page = 1,
      limit = 20,
      threadId,
      senderId,
      messageType
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      threadId,
      senderId,
      messageType
    };
    
    const messages = await CrmMessage.searchMessages(q, options);
    const total = await CrmMessage.countDocuments({
      deleted: false,
      $text: { $search: q }
    });
    const paginationMeta = buildPaginationMeta(parseInt(page), parseInt(limit), total);
    
    const response = {
      query: q,
      data: messages,
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export default {
  getMessageThreads,
  getMessageThreadDetails,
  createMessageThread,
  updateMessageThread,
  deleteMessageThread,
  getThreadMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markMessageAsRead,
  addMessageReaction,
  removeMessageReaction,
  addThreadParticipant,
  removeThreadParticipant,
  assignThread,
  closeThread,
  archiveThread,
  searchMessages
};