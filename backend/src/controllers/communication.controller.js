import Communication from '../models/communication.model.js';
import CommunicationTemplate from '../models/communicationTemplate.model.js';
import mongoose from 'mongoose';
import { sendEmail, sendSMS, sendInAppNotification, sendPushNotification } from '../services/communication.service.js';
import { parseTemplate } from '../utils/templateParser.js';

/**
 * Get user communications with filtering and pagination
 */
export const getUserCommunications = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      filters = {}
    } = req.query;

    const communications = await Communication.getByUser(id, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      filters: {
        type: filters.type,
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        dateRange: filters.dateRange ? {
          start: filters.dateRange.start,
          end: filters.dateRange.end
        } : undefined
      }
    });

    const totalCount = await Communication.countDocuments({ userId: id });
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: communications,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user communications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communications',
      error: error.message
    });
  }
};

/**
 * Create new communication
 */
export const createUserCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const communicationData = { ...req.body, userId: id };

    // Handle template substitution
    if (communicationData.templateId) {
      const template = await CommunicationTemplate.findById(communicationData.templateId);
      if (template) {
        communicationData.content = parseTemplate(template.content, communicationData.variables || {});
        communicationData.subject = parseTemplate(template.subject || '', communicationData.variables || {});
        communicationData.template = {
          id: template._id,
          name: template.name,
          description: template.description
        };
      }
    }

    const communication = new Communication(communicationData);

    // Schedule or send immediately
    if (communicationData.scheduledAt) {
      communication.status = 'pending';
      await communication.save();
      
      // Schedule the communication
      scheduleCommunicationJob(communication);
    } else {
      // Send immediately
      await sendCommunication(communication);
      communication.status = 'sent';
      communication.sentAt = new Date();
      await communication.save();
    }

    // Update template usage
    if (communicationData.templateId) {
      const template = await CommunicationTemplate.findById(communicationData.templateId);
      if (template) {
        await template.incrementUsage();
      }
    }

    res.status(201).json({
      success: true,
      data: communication,
      message: 'Communication created successfully'
    });
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create communication',
      error: error.message
    });
  }
};

/**
 * Update communication
 */
export const updateUserCommunication = async (req, res) => {
  try {
    const { id, communicationId } = req.params;
    const updateData = req.body;

    const communication = await Communication.findOne({ _id: communicationId, userId: id });
    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['status', 'scheduledAt', 'priority', 'category'];
    const filteredUpdate = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdate[key] = updateData[key];
      }
    });

    Object.assign(communication, filteredUpdate);
    await communication.save();

    res.json({
      success: true,
      data: communication,
      message: 'Communication updated successfully'
    });
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update communication',
      error: error.message
    });
  }
};

/**
 * Delete communication
 */
export const deleteUserCommunication = async (req, res) => {
  try {
    const { id, communicationId } = req.params;

    const communication = await Communication.findOne({ _id: communicationId, userId: id });
    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    await Communication.findByIdAndDelete(communicationId);

    res.json({
      success: true,
      message: 'Communication deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete communication',
      error: error.message
    });
  }
};

/**
 * Get communication statistics
 */
export const getCommunicationStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange, category, type } = req.query;

    const stats = await Communication.getStats(id, {
      dateRange: dateRange ? {
        start: dateRange.start,
        end: dateRange.end
      } : undefined,
      category,
      type
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communication statistics',
      error: error.message
    });
  }
};

/**
 * Schedule communication
 */
export const scheduleCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const communicationData = { ...req.body, userId: id };

    const communication = new Communication(communicationData);
    communication.status = 'pending';
    await communication.save();

    // Add to scheduling queue
    await scheduleCommunicationJob(communication);

    res.status(201).json({
      success: true,
      data: communication,
      message: 'Communication scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule communication',
      error: error.message
    });
  }
};

/**
 * Cancel scheduled communication
 */
export const cancelScheduledCommunication = async (req, res) => {
  try {
    const { id, communicationId } = req.params;

    const communication = await Communication.findOne({ _id: communicationId, userId: id });
    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    if (communication.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending communications can be cancelled'
      });
    }

    communication.status = 'cancelled';
    await communication.save();

    // Remove from scheduling queue
    await removeFromScheduleQueue(communicationId);

    res.json({
      success: true,
      message: 'Communication cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel communication',
      error: error.message
    });
  }
};

/**
 * Resend communication
 */
export const resendCommunication = async (req, res) => {
  try {
    const { id, communicationId } = req.params;

    const originalCommunication = await Communication.findOne({ _id: communicationId, userId: id });
    if (!originalCommunication) {
      return res.status(404).json({
        success: false,
        message: 'Communication not found'
      });
    }

    // Create new communication based on original
    const newCommunication = new Communication({
      userId: originalCommunication.userId,
      type: originalCommunication.type,
      recipient: originalCommunication.recipient,
      subject: originalCommunication.subject,
      content: originalCommunication.content,
      category: originalCommunication.category,
      priority: originalCommunication.priority,
      variables: originalCommunication.variables,
      attachments: originalCommunication.attachments,
      source: 'resend',
      batchId: originalCommunication._id // Reference to original
    });

    await sendCommunication(newCommunication);
    newCommunication.status = 'sent';
    newCommunication.sentAt = new Date();
    await newCommunication.save();

    res.status(201).json({
      success: true,
      data: newCommunication,
      message: 'Communication resent successfully'
    });
  } catch (error) {
    console.error('Error resending communication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend communication',
      error: error.message
    });
  }
};

/**
 * Get communication analytics
 */
export const getCommunicationAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateRange, category, type } = req.query;

    const analytics = await Communication.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(id),
          ...(dateRange && {
            createdAt: {
              $gte: new Date(dateRange.start),
              $lte: new Date(dateRange.end)
            }
          }),
          ...(category && { category }),
          ...(type && { type })
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          totalDelivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          totalRead: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
          totalFailed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avgDeliveryTime: {
            $avg: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'delivered'] },
                  { $ne: ['$sentAt', null] },
                  { $ne: ['$deliveredAt', null] }
                ]},
                { $subtract: ['$deliveredAt', '$sentAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching communication analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communication analytics',
      error: error.message
    });
  }
};

/**
 * Search communications
 */
export const searchCommunications = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = new RegExp(q, 'i');
    const communications = await Communication.find({
      userId: id,
      $or: [
        { subject: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
        { 'template.name': { $regex: searchRegex } }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('templateId', 'name description');

    const totalCount = await Communication.countDocuments({
      userId: id,
      $or: [
        { subject: { $regex: searchRegex } },
        { content: { $regex: searchRegex } },
        { 'template.name': { $regex: searchRegex } }
      ]
    });

    res.json({
      success: true,
      data: communications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error searching communications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search communications',
      error: error.message
    });
  }
};

/**
 * Export communications
 */
export const exportCommunications = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'csv', filters = {} } = req.query;

    const communications = await Communication.getByUser(id, {
      filters,
      limit: 10000 // Large limit for export
    });

    if (format === 'csv') {
      const csv = convertToCSV(communications);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=communications_${Date.now()}.csv`);
      res.send(csv);
    } else if (format === 'excel') {
      const workbook = convertToExcel();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=communications_${Date.now()}.xlsx`);
      await workbook.xlsx.write(res);
    } else if (format === 'pdf') {
      const pdfBuffer = await convertToPDF();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=communications_${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format'
      });
    }
  } catch (error) {
    console.error('Error exporting communications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export communications',
      error: error.message
    });
  }
};

// Helper functions
const sendCommunication = async (communication) => {
  try {
    switch (communication.type) {
      case 'email':
        await sendEmail(communication);
        break;
      case 'sms':
        await sendSMS(communication);
        break;
      case 'in_app':
        await sendInAppNotification(communication);
        break;
      case 'push_notification':
        await sendPushNotification(communication);
        break;
      default:
        throw new Error(`Unsupported communication type: ${communication.type}`);
    }
  } catch (error) {
    communication.status = 'failed';
    communication.error = error.message;
    await communication.save();
    throw error;
  }
};

const scheduleCommunicationJob = async (communication) => {
  // Add to scheduling queue (implementation depends on your job queue system)
  // This is a placeholder - implement based on your scheduling system
  console.log(`Scheduling communication ${communication._id} for ${communication.scheduledAt}`);
};


const removeFromScheduleQueue = async (communicationId) => {
  // Implementation depends on your job queue system
  console.log(`Removing communication ${communicationId} from schedule queue`);
};

const convertToCSV = (communications) => {
  const headers = ['ID', 'Type', 'Recipient', 'Subject', 'Status', 'Created At', 'Sent At', 'Delivered At'];
  const csvContent = [
    headers.join(','),
    ...communications.map(comm => [
      comm._id,
      comm.type,
      comm.recipient,
      comm.subject,
      comm.status,
      comm.createdAt,
      comm.sentAt,
      comm.deliveredAt
    ].map(field => `"${field || ''}"`).join(','))
  ].join('\n');

  return csvContent;
};

const convertToExcel = () => {
  // Implementation depends on your Excel library
  // This is a placeholder - implement based on your preferred Excel library
  console.log('Converting communications to Excel');
  return null;
};

const convertToPDF = async () => {
  // Implementation depends on your PDF library
  // This is a placeholder - implement based on your preferred PDF library
  console.log('Converting communications to PDF');
  return Buffer.from('PDF content placeholder');
};