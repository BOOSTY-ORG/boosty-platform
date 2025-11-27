import CrmContact from "../../models/metrics/crm-contact.model.js";
import { formatSuccessResponse, formatErrorResponse, handleControllerError } from "../../utils/metrics/responseFormatter.util.js";
import { parseDateRange } from "../../utils/metrics/dateRange.util.js";
import { buildQuery } from "../../middleware/metrics/queryBuilder.middleware.js";
import { buildPaginationMeta } from "../../utils/metrics/pagination.util.js";

/**
 * Get CRM contact metrics and analytics
 */
export const getCrmContactMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    
    // Get basic contact metrics
    const [
      totalContacts,
      activeContacts,
      inactiveContacts,
      contactsByType,
      contactsByStatus,
      contactsBySource,
      highValueLeads,
      assignedContacts,
      unassignedContacts,
      contactsByQualification,
      contactsNeedingFollowUp
    ] = await Promise.all([
      CrmContact.countDocuments(query),
      CrmContact.countDocuments({ ...query, status: 'active' }),
      CrmContact.countDocuments({ ...query, status: { $in: ['inactive', 'blacklisted', 'do_not_contact'] } }),
      CrmContact.aggregate([
        { $match: query },
        { $group: { _id: "$contactType", count: { $sum: 1 } } }
      ]),
      CrmContact.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      CrmContact.aggregate([
        { $match: query },
        { $group: { _id: "$contactSource", count: { $sum: 1 } } }
      ]),
      CrmContact.countDocuments({ ...query, leadScore: { $gte: 80 }, status: 'active' }),
      CrmContact.countDocuments({ ...query, assignedTo: { $exists: true } }),
      CrmContact.countDocuments({ ...query, assignedTo: { $exists: false } }),
      CrmContact.aggregate([
        { $match: query },
        { $group: { _id: "$qualificationStatus", count: { $sum: 1 } } }
      ]),
      CrmContact.findContactsNeedingFollowUp(7).then(contacts => contacts.length)
    ]);
    
    // Calculate engagement metrics
    const engagementMetrics = await getEngagementMetrics(query, startDate, endDate);
    
    // Calculate consent metrics
    const consentMetrics = await getConsentMetrics(query, startDate, endDate);
    
    // Calculate lead scoring metrics
    const leadScoringMetrics = await getLeadScoringMetrics(query, startDate, endDate);
    
    const response = {
      summary: {
        totalContacts,
        activeContacts,
        inactiveContacts,
        highValueLeads,
        assignedContacts,
        unassignedContacts,
        contactsNeedingFollowUp,
        averageLeadScore: leadScoringMetrics.averageLeadScore,
        averageEngagementScore: engagementMetrics.averageEngagementScore,
        gdprCompliantContacts: consentMetrics.gdprCompliantContacts
      },
      breakdowns: {
        contactType: formatBreakdown(contactsByType),
        status: formatBreakdown(contactsByStatus),
        source: formatBreakdown(contactsBySource),
        qualification: formatBreakdown(contactsByQualification)
      },
      performance: {
        ...engagementMetrics,
        ...consentMetrics,
        ...leadScoringMetrics
      },
      alerts: {
        contactsNeedingFollowUp,
        unassignedContacts,
        gdprNonCompliantContacts: totalContacts - consentMetrics.gdprCompliantContacts
      },
      trends: await getContactTrends(startDate, endDate)
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get detailed CRM contact by ID
 */
export const getCrmContactDetails = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const contact = await CrmContact.findById(contactId)
      .populate('userId', 'firstName lastName email')
      .populate('investorId', 'investorType totalInvested')
      .populate('assignedTo', 'firstName lastName email')
      .populate('segments', 'name description');
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }
    
    const response = {
      contact: {
        id: contact._id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        alternateEmail: contact.alternateEmail,
        alternatePhone: contact.alternatePhone,
        userId: contact.userId,
        investorId: contact.investorId,
        contactType: contact.contactType,
        contactSource: contact.contactSource,
        sourceDetails: contact.sourceDetails,
        company: contact.company,
        jobTitle: contact.jobTitle,
        department: contact.department,
        address: contact.address,
        preferences: contact.preferences,
        consent: contact.consent,
        tags: contact.tags,
        segments: contact.segments,
        leadScore: contact.leadScore,
        qualificationStatus: contact.qualificationStatus,
        qualificationDate: contact.qualificationDate,
        engagement: contact.engagement,
        communicationSummary: contact.communicationSummary,
        assignedTo: contact.assignedTo,
        assignedDate: contact.assignedDate,
        status: contact.status,
        statusReason: contact.statusReason,
        statusDate: contact.statusDate,
        notes: contact.notes,
        customFields: contact.customFields,
        metadata: contact.metadata,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      },
      virtuals: {
        fullName: contact.fullName,
        isHighValueLead: contact.isHighValueLead,
        isEngaged: contact.isEngaged,
        daysSinceLastContact: contact.daysSinceLastContact,
        hasValidConsent: contact.hasValidConsent
      }
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get paginated list of CRM contacts
 */
export const getCrmContactList = async (req, res) => {
  try {
    const { startDate, endDate } = parseDateRange(req.query);
    const query = buildQuery(req, { startDate, endDate });
    const paginationOptions = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      skip: (parseInt(req.query.page) || 1 - 1) * (parseInt(req.query.limit) || 20)
    };
    
    // Use query builder sort options if available
    const sortOptions = req.queryBuilder?.sort || { createdAt: -1 };
    
    const contacts = await CrmContact.findActive(query)
      .populate('assignedTo', 'firstName lastName email')
      .sort(sortOptions)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmContact.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: contacts.map(contact => ({
        id: contact._id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        contactType: contact.contactType,
        contactSource: contact.contactSource,
        leadScore: contact.leadScore,
        qualificationStatus: contact.qualificationStatus,
        status: contact.status,
        assignedTo: contact.assignedTo,
        tags: contact.tags,
        engagement: contact.engagement,
        consent: contact.consent,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        fullName: contact.fullName,
        isHighValueLead: contact.isHighValueLead,
        isEngaged: contact.isEngaged,
        daysSinceLastContact: contact.daysSinceLastContact,
        hasValidConsent: contact.hasValidConsent
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Search CRM contacts
 */
export const searchCrmContacts = async (req, res) => {
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
    
    const contacts = await CrmContact.findActive(query)
      .populate('assignedTo', 'firstName lastName email')
      .sort(req.queryBuilder.sort || { createdAt: -1 })
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);
    
    const total = await CrmContact.countDocuments({ ...query, deleted: false });
    const paginationMeta = buildPaginationMeta(paginationOptions.page, paginationOptions.limit, total);
    
    const response = {
      data: contacts.map(contact => ({
        id: contact._id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        contactType: contact.contactType,
        leadScore: contact.leadScore,
        status: contact.status,
        assignedTo: contact.assignedTo,
        tags: contact.tags,
        createdAt: contact.createdAt,
        fullName: contact.fullName,
        isHighValueLead: contact.isHighValueLead
      })),
      pagination: paginationMeta
    };
    
    return res.json(formatSuccessResponse(response, req));
    
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Create a new CRM contact
 */
export const createCrmContact = async (req, res) => {
  try {
    const contactData = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy,
      createdAt: new Date()
    };

    const contact = new CrmContact(contactData);
    await contact.save();

    // Populate references for response
    await contact.populate('assignedTo', 'firstName lastName email');
    await contact.populate('userId', 'firstName lastName email');
    await contact.populate('investorId', 'investorType totalInvested');

    return res.status(201).json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update CRM contact
 */
export const updateCrmContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const contact = await CrmContact.findByIdAndUpdate(
      contactId,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName email')
     .populate('userId', 'firstName lastName email')
     .populate('investorId', 'investorType totalInvested');

    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Delete CRM contact (soft delete)
 */
export const deleteCrmContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.softDelete(req.user?.id);

    return res.json(formatSuccessResponse(
      { message: 'CRM contact deleted successfully' },
      req
    ));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Update contact engagement
 */
export const updateContactEngagement = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { type, opened, clicked, responded } = req.body;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.updateEngagement({ type, opened, clicked, responded });

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Give marketing consent
 */
export const giveMarketingConsent = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { method } = req.body;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.giveMarketingConsent(method);

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Withdraw consent
 */
export const withdrawConsent = async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.withdrawConsent();

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Assign contact to user
 */
export const assignContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { userId } = req.body;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.assignTo(userId);

    // Populate assigned user for response
    await contact.populate('assignedTo', 'firstName lastName email');

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Add tag to contact
 */
export const addContactTag = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { tag } = req.body;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.addTag(tag);

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Remove tag from contact
 */
export const removeContactTag = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { tag } = req.body;
    
    const contact = await CrmContact.findById(contactId);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    await contact.removeTag(tag);

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Find contact by email
 */
export const findContactByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    const contact = await CrmContact.findByEmail(email);
    
    if (!contact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'CRM contact not found'
      }, req, 404));
    }

    return res.json(formatSuccessResponse(contact, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get high value leads
 */
export const getHighValueLeads = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const leads = await CrmContact.findHighValueLeads(limit);
    
    return res.json(formatSuccessResponse(leads, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get unassigned contacts
 */
export const getUnassignedContacts = async (req, res) => {
  try {
    const { contactType } = req.query;
    const contacts = await CrmContact.findUnassignedContacts(contactType);
    
    return res.json(formatSuccessResponse(contacts, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get contacts needing follow-up
 */
export const getContactsNeedingFollowUp = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const contacts = await CrmContact.findContactsNeedingFollowUp(days);
    
    return res.json(formatSuccessResponse(contacts, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Get contact statistics
 */
export const getContactStats = async (req, res) => {
  try {
    const stats = await CrmContact.getContactStats();
    
    return res.json(formatSuccessResponse(stats, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Import contacts
 */
export const importContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    const results = [];
    
    for (const contactData of contacts) {
      try {
        // Check if contact already exists by email
        const existingContact = await CrmContact.findByEmail(contactData.email);
        
        if (existingContact) {
          results.push({
            email: contactData.email,
            status: 'skipped',
            reason: 'Contact already exists'
          });
          continue;
        }
        
        const contact = new CrmContact({
          ...contactData,
          createdBy: req.user?.id
        });
        
        await contact.save();
        results.push({
          email: contactData.email,
          status: 'created',
          contactId: contact._id
        });
      } catch (error) {
        results.push({
          email: contactData.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    const summary = {
      total: contacts.length,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length
    };
    
    return res.json(formatSuccessResponse({ summary, results }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Export contacts
 */
export const exportContacts = async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.query;
    const query = buildQuery(req, filters);
    
    const contacts = await CrmContact.findActive(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('userId', 'firstName lastName email')
      .populate('investorId', 'investorType totalInvested');
    
    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(contacts);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
      return res.send(csv);
    }
    
    return res.json(formatSuccessResponse(contacts, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Find duplicate contacts
 */
export const findDuplicateContacts = async (req, res) => {
  try {
    // Find contacts with similar emails or names
    const duplicates = await CrmContact.aggregate([
      { $match: { deleted: false } },
      {
        $group: {
          _id: { $toLower: '$email' },
          contacts: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    return res.json(formatSuccessResponse(duplicates, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

/**
 * Merge duplicate contacts
 */
export const mergeDuplicateContacts = async (req, res) => {
  try {
    const { primaryContactId, duplicateContactIds } = req.body;
    
    const primaryContact = await CrmContact.findById(primaryContactId);
    if (!primaryContact) {
      return res.status(404).json(formatErrorResponse({
        code: 'CONTACT_NOT_FOUND',
        message: 'Primary contact not found'
      }, req, 404));
    }
    
    const duplicateContacts = await CrmContact.find({ _id: { $in: duplicateContactIds } });
    
    // Merge data from duplicates to primary
    for (const duplicate of duplicateContacts) {
      // Merge tags
      for (const tag of duplicate.tags) {
        if (!primaryContact.tags.includes(tag)) {
          primaryContact.tags.push(tag);
        }
      }
      
      // Merge custom fields
      for (const [key, value] of Object.entries(duplicate.customFields)) {
        if (!primaryContact.customFields.has(key)) {
          primaryContact.customFields.set(key, value);
        }
      }
      
      // Soft delete duplicate
      await duplicate.softDelete(req.user?.id);
    }
    
    await primaryContact.save();
    
    return res.json(formatSuccessResponse({
      mergedCount: duplicateContacts.length,
      primaryContact
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Bulk operations
export const bulkUpdateContacts = async (req, res) => {
  try {
    const { contactIds, updateData } = req.body;
    
    const result = await CrmContact.updateMany(
      { _id: { $in: contactIds }, deleted: false },
      { ...updateData, updatedAt: new Date() }
    );

    return res.json(formatSuccessResponse({
      updatedCount: result.modifiedCount,
      message: `Successfully updated ${result.modifiedCount} contacts`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkAssignContacts = async (req, res) => {
  try {
    const { contactIds, userId } = req.body;
    
    const result = await CrmContact.updateMany(
      { _id: { $in: contactIds }, deleted: false },
      { 
        assignedTo: userId,
        assignedDate: new Date(),
        updatedAt: new Date()
      }
    );

    return res.json(formatSuccessResponse({
      assignedCount: result.modifiedCount,
      message: `Successfully assigned ${result.modifiedCount} contacts`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

export const bulkDeleteContacts = async (req, res) => {
  try {
    const { contactIds } = req.body;
    
    // Soft delete contacts
    const contacts = await CrmContact.find({ _id: { $in: contactIds }, deleted: false });
    for (const contact of contacts) {
      await contact.softDelete(req.user?.id);
    }

    return res.json(formatSuccessResponse({
      deletedCount: contacts.length,
      message: `Successfully deleted ${contacts.length} contacts`
    }, req));
  } catch (error) {
    return handleControllerError(error, req, res);
  }
};

// Helper functions
const getEngagementMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmContact.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        averageEngagementScore: { $avg: '$engagement.engagementScore' },
        averageResponseRate: { $avg: '$engagement.responseRate' },
        totalCommunications: { $sum: '$engagement.totalCommunications' },
        totalOpens: { $sum: '$engagement.totalOpens' },
        totalClicks: { $sum: '$engagement.totalClicks' },
        engagedContacts: {
          $sum: { $cond: [{ $gte: ['$engagement.engagementScore', 50] }, 1, 0] }
        }
      }
    }
  ]);
  
  const total = await CrmContact.countDocuments(query);
  const result = metrics[0] || {};
  
  return {
    averageEngagementScore: result.averageEngagementScore || 0,
    averageResponseRate: result.averageResponseRate || 0,
    totalCommunications: result.totalCommunications || 0,
    totalOpens: result.totalOpens || 0,
    totalClicks: result.totalClicks || 0,
    engagementRate: total > 0 ? (result.engagedContacts / total) * 100 : 0
  };
};

const getConsentMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmContact.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        marketingConsent: { $sum: { $cond: ['$consent.marketing', 1, 0] } },
        dataProcessingConsent: { $sum: { $cond: ['$consent.dataProcessing', 1, 0] } },
        gdprCompliant: { $sum: { $cond: ['$consent.gdprCompliant', 1, 0] } },
        consentWithdrawn: { $sum: { $cond: ['$consent.consentWithdrawn', 1, 0] } }
      }
    }
  ]);
  
  const total = await CrmContact.countDocuments(query);
  const result = metrics[0] || {};
  
  return {
    marketingConsentContacts: result.marketingConsent || 0,
    dataProcessingConsentContacts: result.dataProcessingConsent || 0,
    gdprCompliantContacts: result.gdprCompliant || 0,
    consentWithdrawnContacts: result.consentWithdrawn || 0,
    marketingConsentRate: total > 0 ? (result.marketingConsent / total) * 100 : 0,
    gdprComplianceRate: total > 0 ? (result.gdprCompliant / total) * 100 : 0
  };
};

const getLeadScoringMetrics = async (query, startDate, endDate) => {
  const metrics = await CrmContact.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        averageLeadScore: { $avg: '$leadScore' },
        highValueLeads: { $sum: { $cond: [{ $gte: ['$leadScore', 80] }, 1, 0] } },
        qualifiedLeads: { $sum: { $cond: [{ $eq: ['$qualificationStatus', 'qualified'] }, 1, 0] } },
        convertedLeads: { $sum: { $cond: [{ $eq: ['$qualificationStatus', 'converted'] }, 1, 0] } }
      }
    }
  ]);
  
  const total = await CrmContact.countDocuments(query);
  const result = metrics[0] || {};
  
  return {
    averageLeadScore: result.averageLeadScore || 0,
    highValueLeadRate: total > 0 ? (result.highValueLeads / total) * 100 : 0,
    qualificationRate: total > 0 ? (result.qualifiedLeads / total) * 100 : 0,
    conversionRate: total > 0 ? (result.convertedLeads / total) * 100 : 0
  };
};

const formatBreakdown = (breakdown) => {
  return breakdown.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
};

const getContactTrends = async (startDate, endDate) => {
  // Get monthly contact creation trends
  const monthlyContacts = await CrmContact.aggregate([
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
        leads: { $sum: { $cond: [{ $eq: ['$contactType', 'lead'] }, 1, 0] } },
        customers: { $sum: { $cond: [{ $eq: ['$contactType', 'customer'] }, 1, 0] } },
        qualified: { $sum: { $cond: [{ $eq: ['$qualificationStatus', 'qualified'] }, 1, 0] } }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return {
    contacts: monthlyContacts.map(item => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      total: item.total,
      leads: item.leads,
      customers: item.customers,
      qualified: item.qualified
    }))
  };
};

const convertToCSV = (contacts) => {
  const headers = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Company',
    'Contact Type', 'Lead Score', 'Status', 'Assigned To', 'Tags'
  ];
  
  const rows = contacts.map(contact => [
    contact._id,
    contact.firstName,
    contact.lastName,
    contact.email,
    contact.phone,
    contact.company,
    contact.contactType,
    contact.leadScore,
    contact.status,
    contact.assignedTo ? `${contact.assignedTo.firstName} ${contact.assignedTo.lastName}` : '',
    contact.tags.join('; ')
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export default {
  getCrmContactMetrics,
  getCrmContactDetails,
  getCrmContactList,
  searchCrmContacts,
  createCrmContact,
  updateCrmContact,
  deleteCrmContact,
  updateContactEngagement,
  giveMarketingConsent,
  withdrawConsent,
  assignContact,
  addContactTag,
  removeContactTag,
  findContactByEmail,
  getHighValueLeads,
  getUnassignedContacts,
  getContactsNeedingFollowUp,
  getContactStats,
  importContacts,
  exportContacts,
  findDuplicateContacts,
  mergeDuplicateContacts,
  bulkUpdateContacts,
  bulkAssignContacts,
  bulkDeleteContacts
};