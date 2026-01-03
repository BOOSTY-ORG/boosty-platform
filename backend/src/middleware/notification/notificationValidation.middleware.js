/**
 * Notification Validation Middleware
 *
 * Provides validation for notification endpoints:
 * - Validate notification creation requests
 * - Validate preference updates
 * - Validate template operations
 * - Sanitize input data
 */

import { formatErrorResponse } from '../../utils/metrics/responseFormatter.util.js';

/**
 * Validate notification creation request
 */
export const validateNotificationCreation = (req, res, next) => {
  try {
    const {
      userId,
      type,
      channels,
      recipient,
      subject,
      content,
      htmlContent,
      category,
      priority,
      templateId,
      variables,
      scheduledAt,
      metadata,
    } = req.body;

    const errors = [];

    // Validate required fields
    if (!userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    } else if (
      typeof userId !== 'string' ||
      !/^[0-9a-fA-F]{24}$/.test(userId)
    ) {
      errors.push({ field: 'userId', message: 'Invalid user ID format' });
    }

    if (!type) {
      errors.push({ field: 'type', message: 'Notification type is required' });
    } else if (
      !['email', 'sms', 'in_app', 'push_notification'].includes(type)
    ) {
      errors.push({
        field: 'type',
        message:
          'Invalid notification type. Must be one of: email, sms, in_app, push_notification',
      });
    }

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      errors.push({
        field: 'channels',
        message: 'At least one channel is required',
      });
    } else {
      const validChannels = ['email', 'sms', 'in_app', 'push_notification'];
      const invalidChannels = channels.filter(
        (ch) => !validChannels.includes(ch)
      );
      if (invalidChannels.length > 0) {
        errors.push({
          field: 'channels',
          message: `Invalid channels: ${invalidChannels.join(', ')}`,
        });
      }
    }

    if (!content) {
      errors.push({ field: 'content', message: 'Content is required' });
    } else if (typeof content !== 'string' || content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Content must be a non-empty string',
      });
    } else if (content.length > 10000) {
      errors.push({
        field: 'content',
        message: 'Content cannot exceed 10,000 characters',
      });
    }

    if (!category) {
      errors.push({ field: 'category', message: 'Category is required' });
    } else if (
      ![
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ].includes(category)
    ) {
      errors.push({
        field: 'category',
        message:
          'Invalid category. Must be one of: welcome, application, kyc, payment, support, marketing, general, alert, reminder',
      });
    }

    // Validate optional fields
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid priority. Must be one of: low, medium, high, urgent',
      });
    }

    if (subject && typeof subject !== 'string') {
      errors.push({ field: 'subject', message: 'Subject must be a string' });
    } else if (subject && subject.length > 200) {
      errors.push({
        field: 'subject',
        message: 'Subject cannot exceed 200 characters',
      });
    }

    if (htmlContent && typeof htmlContent !== 'string') {
      errors.push({
        field: 'htmlContent',
        message: 'HTML content must be a string',
      });
    }

    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        errors.push({
          field: 'scheduledAt',
          message: 'Invalid scheduled date format',
        });
      } else if (scheduledDate <= new Date()) {
        errors.push({
          field: 'scheduledAt',
          message: 'Scheduled date must be in the future',
        });
      }
    }

    // Validate recipient if provided
    if (recipient) {
      if (typeof recipient !== 'object') {
        errors.push({
          field: 'recipient',
          message: 'Recipient must be an object',
        });
      } else {
        if (recipient.email && typeof recipient.email !== 'string') {
          errors.push({
            field: 'recipient.email',
            message: 'Email must be a string',
          });
        } else if (
          recipient.email &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
        ) {
          errors.push({
            field: 'recipient.email',
            message: 'Invalid email format',
          });
        }

        if (recipient.phone && typeof recipient.phone !== 'string') {
          errors.push({
            field: 'recipient.phone',
            message: 'Phone must be a string',
          });
        } else if (
          recipient.phone &&
          !/^\+?[1-9]\d{1,14}$/.test(recipient.phone)
        ) {
          errors.push({
            field: 'recipient.phone',
            message: 'Invalid phone format (E.164)',
          });
        }
      }
    }

    // Validate variables if provided
    if (variables && typeof variables !== 'object') {
      errors.push({
        field: 'variables',
        message: 'Variables must be an object',
      });
    }

    // Validate metadata if provided
    if (metadata && typeof metadata !== 'object') {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        })
      );
    }

    // Sanitize input
    if (content) {
      req.body.content = content.trim();
    }
    if (subject) {
      req.body.subject = subject.trim();
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate batch notification request
 */
export const validateBatchNotification = (req, res, next) => {
  try {
    const { notifications, options = {} } = req.body;
    const errors = [];

    if (!notifications) {
      errors.push({
        field: 'notifications',
        message: 'Notifications array is required',
      });
    } else if (!Array.isArray(notifications)) {
      errors.push({
        field: 'notifications',
        message: 'Notifications must be an array',
      });
    } else if (notifications.length === 0) {
      errors.push({
        field: 'notifications',
        message: 'Notifications array cannot be empty',
      });
    } else if (notifications.length > 1000) {
      errors.push({
        field: 'notifications',
        message: 'Cannot send more than 1000 notifications in a single batch',
      });
    }

    // Validate options if provided
    if (options && typeof options !== 'object') {
      errors.push({ field: 'options', message: 'Options must be an object' });
    } else if (options) {
      if (
        options.batchSize &&
        (typeof options.batchSize !== 'number' ||
          options.batchSize < 1 ||
          options.batchSize > 100)
      ) {
        errors.push({
          field: 'options.batchSize',
          message: 'Batch size must be between 1 and 100',
        });
      }

      if (
        options.delayBetweenBatches &&
        (typeof options.delayBetweenBatches !== 'number' ||
          options.delayBetweenBatches < 0)
      ) {
        errors.push({
          field: 'options.delayBetweenBatches',
          message: 'Delay between batches must be a non-negative number',
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Batch notification validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate notification status update (mark as read/unread)
 */
export const validateNotificationStatusUpdate = (req, res, next) => {
  try {
    const { channels = [] } = req.body;
    const errors = [];

    if (channels && !Array.isArray(channels)) {
      errors.push({ field: 'channels', message: 'Channels must be an array' });
    } else if (channels) {
      const validChannels = ['email', 'sms', 'in_app', 'push_notification'];
      const invalidChannels = channels.filter(
        (ch) => !validChannels.includes(ch)
      );
      if (invalidChannels.length > 0) {
        errors.push({
          field: 'channels',
          message: `Invalid channels: ${invalidChannels.join(', ')}`,
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Status update validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate user notification preferences update
 */
export const validatePreferencesUpdate = (req, res, next) => {
  try {
    const preferences = req.body;
    const errors = [];

    if (!preferences || typeof preferences !== 'object') {
      errors.push({
        field: 'preferences',
        message: 'Preferences must be an object',
      });
    } else {
      // Validate global preferences
      if (
        preferences.globalEnabled !== undefined &&
        typeof preferences.globalEnabled !== 'boolean'
      ) {
        errors.push({
          field: 'globalEnabled',
          message: 'Global enabled must be a boolean',
        });
      }

      // Validate quiet hours
      if (preferences.quietHours) {
        if (typeof preferences.quietHours !== 'object') {
          errors.push({
            field: 'quietHours',
            message: 'Quiet hours must be an object',
          });
        } else {
          if (
            preferences.quietHours.enabled !== undefined &&
            typeof preferences.quietHours.enabled !== 'boolean'
          ) {
            errors.push({
              field: 'quietHours.enabled',
              message: 'Quiet hours enabled must be a boolean',
            });
          }

          if (
            preferences.quietHours.startTime &&
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
              preferences.quietHours.startTime
            )
          ) {
            errors.push({
              field: 'quietHours.startTime',
              message: 'Start time must be in HH:MM format',
            });
          }

          if (
            preferences.quietHours.endTime &&
            !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(
              preferences.quietHours.endTime
            )
          ) {
            errors.push({
              field: 'quietHours.endTime',
              message: 'End time must be in HH:MM format',
            });
          }

          if (
            preferences.quietHours.timezone &&
            typeof preferences.quietHours.timezone !== 'string'
          ) {
            errors.push({
              field: 'quietHours.timezone',
              message: 'Timezone must be a string',
            });
          }
        }
      }

      // Validate channel preferences
      if (preferences.channels) {
        if (typeof preferences.channels !== 'object') {
          errors.push({
            field: 'channels',
            message: 'Channels must be an object',
          });
        } else {
          const validChannelTypes = [
            'email',
            'sms',
            'in_app',
            'push_notification',
          ];
          Object.keys(preferences.channels).forEach((channelType) => {
            if (!validChannelTypes.includes(channelType)) {
              errors.push({
                field: `channels.${channelType}`,
                message: `Invalid channel type: ${channelType}`,
              });
            } else if (typeof preferences.channels[channelType] !== 'object') {
              errors.push({
                field: `channels.${channelType}`,
                message: `Channel ${channelType} must be an object`,
              });
            }
          });
        }
      }

      // Validate category preferences
      if (preferences.categories) {
        if (typeof preferences.categories !== 'object') {
          errors.push({
            field: 'categories',
            message: 'Categories must be an object',
          });
        } else {
          const validCategories = [
            'welcome',
            'application',
            'kyc',
            'payment',
            'support',
            'marketing',
            'general',
            'alert',
            'reminder',
          ];
          Object.keys(preferences.categories).forEach((category) => {
            if (!validCategories.includes(category)) {
              errors.push({
                field: `categories.${category}`,
                message: `Invalid category: ${category}`,
              });
            } else if (typeof preferences.categories[category] !== 'object') {
              errors.push({
                field: `categories.${category}`,
                message: `Category ${category} must be an object`,
              });
            }
          });
        }
      }

      // Validate frequency limits
      if (preferences.frequencyLimits) {
        if (typeof preferences.frequencyLimits !== 'object') {
          errors.push({
            field: 'frequencyLimits',
            message: 'Frequency limits must be an object',
          });
        } else {
          if (preferences.frequencyLimits.maxPerHour !== undefined) {
            if (
              typeof preferences.frequencyLimits.maxPerHour !== 'number' ||
              preferences.frequencyLimits.maxPerHour < 1
            ) {
              errors.push({
                field: 'frequencyLimits.maxPerHour',
                message: 'Max per hour must be a positive number',
              });
            }
          }

          if (preferences.frequencyLimits.maxPerDay !== undefined) {
            if (
              typeof preferences.frequencyLimits.maxPerDay !== 'number' ||
              preferences.frequencyLimits.maxPerDay < 1
            ) {
              errors.push({
                field: 'frequencyLimits.maxPerDay',
                message: 'Max per day must be a positive number',
              });
            }
          }

          if (preferences.frequencyLimits.maxPerWeek !== undefined) {
            if (
              typeof preferences.frequencyLimits.maxPerWeek !== 'number' ||
              preferences.frequencyLimits.maxPerWeek < 1
            ) {
              errors.push({
                field: 'frequencyLimits.maxPerWeek',
                message: 'Max per week must be a positive number',
              });
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Preferences validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate template creation/update
 */
export const validateTemplateOperation = (req, res, next) => {
  try {
    const {
      name,
      description,
      type,
      category,
      priority,
      subject,
      content,
      htmlContent,
      variables,
      isActive,
      tags,
    } = req.body;
    const errors = [];

    // Validate required fields
    if (!name) {
      errors.push({ field: 'name', message: 'Template name is required' });
    } else if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Template name must be a non-empty string',
      });
    } else if (name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Template name cannot exceed 100 characters',
      });
    }

    if (!type) {
      errors.push({ field: 'type', message: 'Template type is required' });
    } else if (
      !['email', 'sms', 'in_app', 'push_notification'].includes(type)
    ) {
      errors.push({
        field: 'type',
        message:
          'Invalid template type. Must be one of: email, sms, in_app, push_notification',
      });
    }

    if (!category) {
      errors.push({ field: 'category', message: 'Category is required' });
    } else if (
      ![
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ].includes(category)
    ) {
      errors.push({
        field: 'category',
        message:
          'Invalid category. Must be one of: welcome, application, kyc, payment, support, marketing, general, alert, reminder',
      });
    }

    if (!content) {
      errors.push({ field: 'content', message: 'Content is required' });
    } else if (typeof content !== 'string' || content.trim().length === 0) {
      errors.push({
        field: 'content',
        message: 'Content must be a non-empty string',
      });
    }

    // Validate optional fields
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid priority. Must be one of: low, medium, high, urgent',
      });
    }

    if (description && typeof description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string',
      });
    } else if (description && description.length > 500) {
      errors.push({
        field: 'description',
        message: 'Description cannot exceed 500 characters',
      });
    }

    if (subject && typeof subject !== 'string') {
      errors.push({ field: 'subject', message: 'Subject must be a string' });
    } else if (subject && subject.length > 200) {
      errors.push({
        field: 'subject',
        message: 'Subject cannot exceed 200 characters',
      });
    }

    if (htmlContent && typeof htmlContent !== 'string') {
      errors.push({
        field: 'htmlContent',
        message: 'HTML content must be a string',
      });
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      errors.push({
        field: 'isActive',
        message: 'Is active must be a boolean',
      });
    }

    // Validate variables if provided
    if (variables) {
      if (!Array.isArray(variables)) {
        errors.push({
          field: 'variables',
          message: 'Variables must be an array',
        });
      } else {
        variables.forEach((variable, index) => {
          if (!variable.name) {
            errors.push({
              field: `variables[${index}].name`,
              message: 'Variable name is required',
            });
          } else if (typeof variable.name !== 'string') {
            errors.push({
              field: `variables[${index}].name`,
              message: 'Variable name must be a string',
            });
          }

          if (
            variable.type &&
            !['text', 'number', 'date', 'boolean', 'select', 'object'].includes(
              variable.type
            )
          ) {
            errors.push({
              field: `variables[${index}].type`,
              message:
                'Invalid variable type. Must be one of: text, number, date, boolean, select, object',
            });
          }

          if (
            variable.required !== undefined &&
            typeof variable.required !== 'boolean'
          ) {
            errors.push({
              field: `variables[${index}].required`,
              message: 'Variable required must be a boolean',
            });
          }
        });
      }
    }

    // Validate tags if provided
    if (tags) {
      if (!Array.isArray(tags)) {
        errors.push({ field: 'tags', message: 'Tags must be an array' });
      } else if (tags.length > 10) {
        errors.push({
          field: 'tags',
          message: 'Cannot have more than 10 tags',
        });
      } else {
        tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            errors.push({
              field: `tags[${index}]`,
              message: 'Tag must be a string',
            });
          } else if (tag.length > 50) {
            errors.push({
              field: `tags[${index}]`,
              message: 'Tag cannot exceed 50 characters',
            });
          }
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Template validation failed',
          details: errors,
        })
      );
    }

    // Sanitize input
    if (name) {
      req.body.name = name.trim();
    }
    if (content) {
      req.body.content = content.trim();
    }
    if (subject) {
      req.body.subject = subject.trim();
    }
    if (description) {
      req.body.description = description.trim();
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate template test request
 */
export const validateTemplateTest = (req, res, next) => {
  try {
    const { variables } = req.body;
    const errors = [];

    if (variables && typeof variables !== 'object') {
      errors.push({
        field: 'variables',
        message: 'Variables must be an object',
      });
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Template test validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate query parameters for notification listing
 */
export const validateNotificationQuery = (req, res, next) => {
  try {
    const { page, limit, type, status, category, priority, dateRange } =
      req.query;
    const errors = [];

    // Validate pagination
    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push({
          field: 'page',
          message: 'Page must be a positive integer',
        });
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push({
          field: 'limit',
          message: 'Limit must be between 1 and 100',
        });
      }
    }

    // Validate filters
    if (
      type &&
      !['email', 'sms', 'in_app', 'push_notification'].includes(type)
    ) {
      errors.push({
        field: 'type',
        message:
          'Invalid type. Must be one of: email, sms, in_app, push_notification',
      });
    }

    if (
      status &&
      ![
        'pending',
        'queued',
        'processing',
        'sent',
        'delivered',
        'read',
        'failed',
        'cancelled',
      ].includes(status)
    ) {
      errors.push({
        field: 'status',
        message:
          'Invalid status. Must be one of: pending, queued, processing, sent, delivered, read, failed, cancelled',
      });
    }

    if (
      category &&
      ![
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ].includes(category)
    ) {
      errors.push({
        field: 'category',
        message:
          'Invalid category. Must be one of: welcome, application, kyc, payment, support, marketing, general, alert, reminder',
      });
    }

    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid priority. Must be one of: low, medium, high, urgent',
      });
    }

    // Validate date range if provided
    if (dateRange) {
      try {
        const parsedDateRange = JSON.parse(dateRange);
        if (typeof parsedDateRange !== 'object') {
          errors.push({
            field: 'dateRange',
            message: 'Date range must be a valid JSON object',
          });
        } else {
          if (parsedDateRange.start) {
            const startDate = new Date(parsedDateRange.start);
            if (isNaN(startDate.getTime())) {
              errors.push({
                field: 'dateRange.start',
                message: 'Invalid start date format',
              });
            }
          }

          if (parsedDateRange.end) {
            const endDate = new Date(parsedDateRange.end);
            if (isNaN(endDate.getTime())) {
              errors.push({
                field: 'dateRange.end',
                message: 'Invalid end date format',
              });
            }
          }

          if (parsedDateRange.start && parsedDateRange.end) {
            const startDate = new Date(parsedDateRange.start);
            const endDate = new Date(parsedDateRange.end);
            if (startDate > endDate) {
              errors.push({
                field: 'dateRange',
                message: 'Start date cannot be after end date',
              });
            }
          }
        }
      } catch (e) {
        errors.push({
          field: 'dateRange',
          message: 'Date range must be a valid JSON object',
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

/**
 * Validate template query parameters
 */
export const validateTemplateQuery = (req, res, next) => {
  try {
    const { page, limit, type, category, search, isActive } = req.query;
    const errors = [];

    // Validate pagination
    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push({
          field: 'page',
          message: 'Page must be a positive integer',
        });
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push({
          field: 'limit',
          message: 'Limit must be between 1 and 100',
        });
      }
    }

    // Validate filters
    if (
      type &&
      !['email', 'sms', 'in_app', 'push_notification'].includes(type)
    ) {
      errors.push({
        field: 'type',
        message:
          'Invalid type. Must be one of: email, sms, in_app, push_notification',
      });
    }

    if (
      category &&
      ![
        'welcome',
        'application',
        'kyc',
        'payment',
        'support',
        'marketing',
        'general',
        'alert',
        'reminder',
      ].includes(category)
    ) {
      errors.push({
        field: 'category',
        message:
          'Invalid category. Must be one of: welcome, application, kyc, payment, support, marketing, general, alert, reminder',
      });
    }

    if (isActive !== undefined && isActive !== 'true' && isActive !== 'false') {
      errors.push({
        field: 'isActive',
        message: 'Is active must be true or false',
      });
    }

    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse({
          code: 'VALIDATION_ERROR',
          message: 'Template query validation failed',
          details: errors,
        })
      );
    }

    next();
  } catch (error) {
    return res.status(500).json(
      formatErrorResponse({
        code: 'VALIDATION_MIDDLEWARE_ERROR',
        message: 'Error in validation middleware',
      })
    );
  }
};

export default {
  validateNotificationCreation,
  validateBatchNotification,
  validateNotificationStatusUpdate,
  validatePreferencesUpdate,
  validateTemplateOperation,
  validateTemplateTest,
  validateNotificationQuery,
  validateTemplateQuery,
};
