/**
 * CRM Type Definitions
 * 
 * This file contains TypeScript-style type definitions for the CRM system.
 * These are provided as JSDoc comments for better IDE support and documentation.
 * 
 * @namespace crmTypes
 */

/**
 * @typedef {Object} Contact
 * @property {string} _id - Unique identifier
 * @property {string} contactId - Contact ID
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} email - Email address
 * @property {string} [phone] - Phone number
 * @property {string} contactType - Contact type (lead, prospect, customer)
 * @property {string} contactSource - Contact source (website, referral, social)
 * @property {string} [company] - Company name
 * @property {string} [jobTitle] - Job title
 * @property {Object} [address] - Address information
 * @property {string} [address.street] - Street address
 * @property {string} [address.city] - City
 * @property {string} [address.state] - State/Province
 * @property {string} [address.country] - Country
 * @property {string} [address.postalCode] - Postal/ZIP code
 * @property {string[]} tags - Contact tags
 * @property {string} status - Contact status (active, inactive, archived)
 * @property {string} [assignedTo] - Assigned user ID
 * @property {Object} [engagement] - Engagement metrics
 * @property {boolean} [engagement.opened] - Has opened communications
 * @property {boolean} [engagement.clicked] - Has clicked links
 * @property {boolean} [engagement.responded] - Has responded
 * @property {Object} [consent] - Consent information
 * @property {boolean} [consent.marketing] - Marketing consent
 * @property {Date} [consent.marketingGivenAt] - When marketing consent was given
 * @property {string} [consent.marketingMethod] - How consent was given
 * @property {Date} [lastContactDate] - Last contact date
 * @property {Object} [metrics] - Contact metrics
 * @property {number} [metrics.totalCommunications] - Total communications
 * @property {number} [metrics.openRate] - Open rate percentage
 * @property {number} [metrics.clickRate] - Click rate percentage
 * @property {number} [metrics.responseRate] - Response rate percentage
 * @property {number} [engagementScore] - Calculated engagement score (0-100)
 * @property {number} [leadScore] - Calculated lead score (0-100)
 * @property {string} fullName - Computed full name
 * @property {string} displayName - Computed display name
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 * @property {boolean} deleted - Soft delete flag
 */

/**
 * @typedef {Object} Communication
 * @property {string} _id - Unique identifier
 * @property {string} communicationId - Communication ID
 * @property {string} entityType - Entity type (contact, investor, etc.)
 * @property {string} entityId - Entity ID
 * @property {string} interactionType - Type of interaction (email, call, meeting)
 * @property {string} channel - Communication channel (email, sms, phone)
 * @property {string} direction - Direction (inbound, outbound)
 * @property {string} status - Status (pending, sent, delivered, failed)
 * @property {string} [subject] - Communication subject
 * @property {string} content - Communication content
 * @property {string} [htmlContent] - HTML content
 * @property {string} agentId - Agent ID who handled communication
 * @property {string} [templateId] - Template ID used
 * @property {Object} [metadata] - Additional metadata
 * @property {Date} [scheduledFor] - Scheduled send date
 * @property {Date} [sentAt] - Send date
 * @property {Date} [deliveredAt] - Delivery date
 * @property {Date} [openedAt] - Open date
 * @property {Date} [responseExpectedBy] - Expected response date
 * @property {Date} [responseReceivedAt] - Response received date
 * @property {boolean} followUpRequired - Follow-up required flag
 * @property {Date} [followUpDate] - Follow-up date
 * @property {string} [followUpNotes] - Follow-up notes
 * @property {boolean} followUpCompleted - Follow-up completed flag
 * @property {string[]} tags - Communication tags
 * @property {Object} [attachments] - Attachment information
 * @property {number} [attachments.count] - Number of attachments
 * @property {number} [attachments.totalSize] - Total size in bytes
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 * @property {boolean} deleted - Soft delete flag
 */

/**
 * @typedef {Object} Template
 * @property {string} _id - Unique identifier
 * @property {string} name - Template name
 * @property {string} [description] - Template description
 * @property {string} category - Template category
 * @property {string} [subcategory] - Template subcategory
 * @property {string} channel - Template channel (email, sms, push)
 * @property {string} type - Template type (marketing, transactional)
 * @property {string} [subject] - Template subject
 * @property {string} body - Template body
 * @property {string} [htmlBody] - HTML body
 * @property {Object[]} [variables] - Template variables
 * @property {string} variables.name - Variable name
 * @property {string} variables.type - Variable type
 * @property {string} variables.description - Variable description
 * @property {Object} [settings] - Template settings
 * @property {boolean} [settings.trackOpens] - Track opens
 * @property {boolean} [settings.trackClicks] - Track clicks
 * @property {Object} [abTesting] - A/B testing configuration
 * @property {boolean} abTesting.enabled - A/B testing enabled
 * @property {Object} [abTesting.variants] - Test variants
 * @property {string} version - Template version
 * @property {string} status - Status (draft, review, approved, rejected)
 * @property {string} [parentTemplate] - Parent template ID
 * @property {boolean} isLatest - Is latest version
 * @property {string[]} tags - Template tags
 * @property {string} [createdBy] - Creator ID
 * @property {string} [updatedBy] - Updater ID
 * @property {string} [approvedBy] - Approver ID
 * @property {string} [rejectedBy] - Rejecter ID
 * @property {Date} [approvedAt] - Approval date
 * @property {Date} [rejectedAt] - Rejection date
 * @property {string} [rejectionReason] - Rejection reason
 * @property {Object} [metrics] - Template metrics
 * @property {number} [metrics.totalSent] - Total sent
 * @property {number} [metrics.totalDelivered] - Total delivered
 * @property {number} [metrics.totalOpened] - Total opened
 * @property {number} [metrics.totalClicked] - Total clicked
 * @property {number} [metrics.averageOpenRate] - Average open rate
 * @property {number} [metrics.averageClickRate] - Average click rate
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 * @property {boolean} deleted - Soft delete flag
 */

/**
 * @typedef {Object} Automation
 * @property {string} _id - Unique identifier
 * @property {string} name - Automation name
 * @property {string} [description] - Automation description
 * @property {string} category - Automation category
 * @property {boolean} enabled - Enabled flag
 * @property {string} status - Status (draft, active, paused, error)
 * @property {Object} trigger - Trigger configuration
 * @property {string} trigger.type - Trigger type
 * @property {Object} [trigger.conditions] - Trigger conditions
 * @property {Object[]} actions - Actions to execute
 * @property {string} actions.type - Action type
 * @property {Object} [actions.config] - Action configuration
 * @property {number} [actions.delay] - Delay in minutes
 * @property {Object} [target] - Target configuration
 * @property {string[]} [target.segments] - Target segments
 * @property {Object} [filters] - Additional filters
 * @property {Object} [limits] - Execution limits
 * @property {number} [limits.maxExecutions] - Max executions per day
 * @property {number} [limits.maxContacts] - Max contacts per execution
 * @property {string[]} tags - Automation tags
 * @property {string} [createdBy] - Creator ID
 * @property {string} [updatedBy] - Updater ID
 * @property {Object} [metrics] - Automation metrics
 * @property {number} [metrics.executionCount] - Execution count
 * @property {number} [metrics.successCount] - Success count
 * @property {number} [metrics.failureCount] - Failure count
 * @property {number} [metrics.successRate] - Success rate
 * @property {number} [metrics.totalContactsProcessed] - Total contacts processed
 * @property {number} [metrics.averageExecutionTime] - Average execution time
 * @property {Date} [metrics.nextExecution] - Next execution time
 * @property {Date} [metrics.lastExecution] - Last execution time
 * @property {Object[]} [recentExecutions] - Recent executions
 * @property {string} recentExecutions.status - Execution status
 * @property {Date} recentExecutions.executedAt - Execution time
 * @property {number} recentExecutions.contactsProcessed - Contacts processed
 * @property {number} recentExecutions.executionTime - Execution time in ms
 * @property {Date} createdAt - Creation date
 * @property {Date} updatedAt - Last update date
 * @property {boolean} deleted - Soft delete flag
 */

/**
 * @typedef {Object} CRMOverview
 * @property {Object} summary - Summary metrics
 * @property {number} summary.totalContacts - Total contacts
 * @property {number} summary.totalCommunications - Total communications
 * @property {number} summary.activeAutomations - Active automations
 * @property {number} summary.approvedTemplates - Approved templates
 * @property {Object} modules - Module information
 * @property {Object} modules.communications - Communications module
 * @property {string} modules.communications.endpoint - Endpoint URL
 * @property {string} modules.communications.description - Module description
 * @property {Object} modules.contacts - Contacts module
 * @property {string} modules.contacts.endpoint - Endpoint URL
 * @property {string} modules.contacts.description - Module description
 * @property {Object} modules.templates - Templates module
 * @property {string} modules.templates.endpoint - Endpoint URL
 * @property {string} modules.templates.description - Module description
 * @property {Object} modules.automations - Automations module
 * @property {string} modules.automations.endpoint - Endpoint URL
 * @property {string} modules.automations.description - Module description
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} [page=1] - Page number
 * @property {number} [limit=20] - Items per page
 * @property {string} [sortBy] - Field to sort by
 * @property {string} [sortOrder=desc] - Sort order (asc/desc)
 */

/**
 * @typedef {Object} DateRangeParams
 * @property {string} [startDate] - Start date (ISO string)
 * @property {string} [endDate] - End date (ISO string)
 * @property {string} [dateRange] - Preset date range
 */

/**
 * @typedef {Object} ContactFilters
 * @property {string} [status] - Filter by status
 * @property {string} [contactType] - Filter by contact type
 * @property {string} [contactSource] - Filter by contact source
 * @property {string} [assignedTo] - Filter by assigned user
 * @property {string[]} [tags] - Filter by tags
 */

/**
 * @typedef {Object} CommunicationFilters
 * @property {string} [status] - Filter by status
 * @property {string} [channel] - Filter by channel
 * @property {string} [direction] - Filter by direction
 * @property {string} [agentId] - Filter by agent
 * @property {string} [templateId] - Filter by template
 */

/**
 * @typedef {Object} TemplateFilters
 * @property {string} [status] - Filter by status
 * @property {string} [category] - Filter by category
 * @property {string} [channel] - Filter by channel
 * @property {string} [type] - Filter by type
 */

/**
 * @typedef {Object} AutomationFilters
 * @property {string} [status] - Filter by status
 * @property {string} [category] - Filter by category
 * @property {boolean} [enabled] - Filter by enabled status
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Success flag
 * @property {*} data - Response data
 * @property {string} [message] - Response message
 * @property {Object} [pagination] - Pagination information
 * @property {number} pagination.page - Current page
 * @property {number} pagination.limit - Items per page
 * @property {number} pagination.total - Total items
 * @property {number} pagination.pages - Total pages
 */

/**
 * @typedef {Object} BulkOperationResult
 * @property {number} processed - Number processed
 * @property {number} successful - Number successful
 * @property {number} failed - Number failed
 * @property {Object[]} [errors] - Error details
 * @property {string} errors.item - Failed item
 * @property {string} errors.error - Error message
 */

/**
 * @typedef {Object} CacheStats
 * @property {number} size - Current cache size
 * @property {number} maxSize - Maximum cache size
 * @property {number} ttl - Cache TTL in milliseconds
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Field name
 * @property {string} message - Error message
 * @property {*} value - Invalid value
 */

/**
 * @typedef {Object} ServiceError
 * @property {string} message - Error message
 * @property {string} operation - Operation that failed
 * @property {number} [status] - HTTP status code
 * @property {Error} originalError - Original error object
 */

export default {
  Contact,
  Communication,
  Template,
  Automation,
  CRMOverview,
  PaginationParams,
  DateRangeParams,
  ContactFilters,
  CommunicationFilters,
  TemplateFilters,
  AutomationFilters,
  ApiResponse,
  BulkOperationResult,
  CacheStats,
  ValidationError,
  ServiceError
};