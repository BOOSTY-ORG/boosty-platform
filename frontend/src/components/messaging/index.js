/**
 * Messaging Components Index
 * 
 * This file exports all messaging-related components for easy importing.
 * Each component is designed to work with the messaging API and context layers.
 * 
 * @module messagingComponents
 */

// Main Messaging Components
export { default as MessageThreadList } from './MessageThreadList.jsx';
export { default as MessageThread } from './MessageThread.jsx';
export { default as MessageComposer } from './MessageComposer.jsx';
export { default as AssignmentDashboard } from './AssignmentDashboard.jsx';
export { default as AssignmentDetails } from './AssignmentDetails.jsx';

// Component metadata for documentation and testing
export const MESSAGING_COMPONENTS = {
  MessageThreadList: {
    name: 'MessageThreadList',
    description: 'Displays a list of message threads with filtering, pagination, and status indicators',
    features: [
      'Thread list with filtering and sorting',
      'Thread status indicators (active, closed, archived)',
      'Priority indicators and unread counts',
      'Bulk selection and operations',
      'Search functionality',
      'Responsive design for mobile and desktop'
    ],
    props: {
      className: 'String - Additional CSS classes',
      initialFilters: 'Object - Initial filter state',
      onThreadSelect: 'Function - Callback for thread selection',
      showFilters: 'Boolean - Show filter controls',
      showSearch: 'Boolean - Show search bar',
      compact: 'Boolean - Compact view mode'
    }
  },
  MessageThread: {
    name: 'MessageThread',
    description: 'Displays an individual message thread with messages in chronological order',
    features: [
      'Message display with sender avatars and timestamps',
      'Read/unread indicators',
      'Message reactions and delivery status',
      'Real-time message updates',
      'Typing indicators',
      'Message composition and sending',
      'File attachment support',
      'Message search and filtering'
    ],
    props: {
      threadId: 'String - Thread ID to display',
      className: 'String - Additional CSS classes',
      onMessageSend: 'Function - Callback for message sending',
      onThreadUpdate: 'Function - Callback for thread updates',
      showComposer: 'Boolean - Show message composer',
      autoRefresh: 'Boolean - Auto-refresh messages',
      refreshInterval: 'Number - Refresh interval in seconds'
    }
  },
  MessageComposer: {
    name: 'MessageComposer',
    description: 'Comprehensive message composer with text input, formatting options, and file attachments',
    features: [
      'Rich text formatting options',
      'Emoji picker and support',
      'File attachment capability',
      'Message templates',
      'Draft message saving',
      'Typing indicators',
      'Keyboard shortcuts',
      'Accessibility features'
    ],
    props: {
      threadId: 'String - Thread ID for message',
      onSend: 'Function - Callback for message sending',
      onTyping: 'Function - Callback for typing indicator',
      onDraftSave: 'Function - Callback for draft saving',
      placeholder: 'String - Input placeholder text',
      disabled: 'Boolean - Disable composer',
      showFormatting: 'Boolean - Show formatting options',
      showAttachments: 'Boolean - Show attachment options',
      showTemplates: 'Boolean - Show template options',
      showEmoji: 'Boolean - Show emoji picker',
      replyTo: 'Object - Message being replied to',
      initialDraft: 'String - Initial draft content'
    }
  },
  AssignmentDashboard: {
    name: 'AssignmentDashboard',
    description: 'Displays assignment metrics, agent workload distribution, and SLA compliance',
    features: [
      'Assignment metrics and KPIs',
      'Agent workload distribution',
      'SLA compliance monitoring',
      'Assignment status overview',
      'Bulk assignment operations',
      'Transfer and escalation actions',
      'Performance analytics',
      'Interactive charts and visualizations'
    ],
    props: {
      className: 'String - Additional CSS classes',
      filters: 'Object - Initial filters',
      onAssignmentSelect: 'Function - Callback for assignment selection',
      onAgentSelect: 'Function - Callback for agent selection',
      showMetrics: 'Boolean - Show metrics cards',
      showCharts: 'Boolean - Show charts and visualizations',
      showFilters: 'Boolean - Show filter controls'
    }
  },
  AssignmentDetails: {
    name: 'AssignmentDetails',
    description: 'Shows detailed assignment information with performance metrics and management actions',
    features: [
      'Comprehensive assignment information',
      'Performance metrics display',
      'Assignment history tracking',
      'Transfer and escalation actions',
      'Assignment completion workflow',
      'SLA status monitoring',
      'Custom fields support',
      'Agent workload indicators'
    ],
    props: {
      assignmentId: 'String - Assignment ID to display',
      className: 'String - Additional CSS classes',
      onUpdate: 'Function - Callback for assignment updates',
      onTransfer: 'Function - Callback for assignment transfer',
      onEscalate: 'Function - Callback for assignment escalation',
      onComplete: 'Function - Callback for assignment completion',
      showActions: 'Boolean - Show action buttons',
      showHistory: 'Boolean - Show assignment history',
      showMetrics: 'Boolean - Show performance metrics'
    }
  }
};

// Utility functions for messaging components
export const MESSAGING_UTILS = {
  /**
   * Format message content for display
   * @param {string} content - Message content to format
   * @returns {string} Formatted content
   */
  formatMessageContent: (content) => {
    if (!content) return '';
    
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formatted = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  },

  /**
   * Get status color for message threads
   * @param {string} status - Thread status
   * @returns {string} Tailwind CSS color class
   */
  getThreadStatusColor: (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get priority color for assignments and threads
   * @param {string} priority - Priority level
   * @returns {string} Tailwind CSS color class
   */
  getPriorityColor: (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get SLA status color and text
   * @param {Date} deadline - Response deadline
   * @returns {Object} SLA status with color and text
   */
  getSlaStatus: (deadline) => {
    if (!deadline) return { status: 'unknown', color: 'gray', text: 'No deadline' };
    
    const now = new Date();
    const deadlineTime = new Date(deadline);
    const timeRemaining = deadlineTime - now;
    
    if (timeRemaining < 0) {
      return { 
        status: 'overdue', 
        color: 'red', 
        text: `Overdue by ${Math.abs(timeRemaining / (1000 * 60 * 60)).toFixed(1)} hours` 
      };
    } else if (timeRemaining < 60 * 60 * 1000) { // Less than 1 hour
      return { 
        status: 'critical', 
        color: 'orange', 
        text: `Critical: ${(timeRemaining / (1000 * 60)).toFixed(0)} minutes remaining` 
      };
    } else if (timeRemaining < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return { 
        status: 'warning', 
        color: 'yellow', 
        text: `${(timeRemaining / (1000 * 60 * 60)).toFixed(1)} hours remaining` 
      };
    } else {
      return { 
        status: 'ok', 
        color: 'green', 
        text: `${(timeRemaining / (1000 * 60 * 60)).toFixed(1)} hours remaining` 
      };
    }
  },

  /**
   * Generate avatar initials from name or email
   * @param {Object} user - User object with name or email
   * @returns {string} Initials (max 2 characters)
   */
  getAvatarInitials: (user) => {
    if (!user) return '??';
    
    const name = user.name || user.email || 'Unknown';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText: (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if user is online
   * @param {Set} onlineUsers - Set of online user IDs
   * @param {string} userId - User ID to check
   * @returns {boolean} True if user is online
   */
  isUserOnline: (onlineUsers, userId) => {
    return onlineUsers.has(userId);
  },

  /**
   * Get typing indicator text
   * @param {Array} typingUsers - Array of typing users
   * @returns {string} Typing indicator text
   */
  getTypingIndicatorText: (typingUsers) => {
    if (!typingUsers || typingUsers.length === 0) return '';
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  },

  /**
   * Validate message content
   * @param {string} content - Message content to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateMessage: (content) => {
    const errors = [];
    
    if (!content || content.trim().length === 0) {
      errors.push('Message content cannot be empty');
    }
    
    if (content && content.length > 10000) {
      errors.push('Message content cannot exceed 10,000 characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate thread data
   * @param {Object} threadData - Thread data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateThread: (threadData) => {
    const errors = [];
    
    if (!threadData.subject || threadData.subject.trim().length === 0) {
      errors.push('Thread subject is required');
    }
    
    if (!threadData.participants || threadData.participants.length === 0) {
      errors.push('At least one participant is required');
    }
    
    if (threadData.participants && threadData.participants.length > 50) {
      errors.push('Maximum 50 participants allowed');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate assignment data
   * @param {Object} assignmentData - Assignment data to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateAssignment: (assignmentData) => {
    const errors = [];
    
    if (!assignmentData.agentId) {
      errors.push('Agent ID is required');
    }
    
    if (!assignmentData.entityType) {
      errors.push('Entity type is required');
    }
    
    if (!assignmentData.entityId) {
      errors.push('Entity ID is required');
    }
    
    if (!assignmentData.assignmentReason || assignmentData.assignmentReason.trim().length === 0) {
      errors.push('Assignment reason is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Default configurations for messaging components
export const MESSAGING_DEFAULTS = {
  threadList: {
    itemsPerPage: 20,
    maxVisiblePages: 5,
    showFirstLast: true,
    showPrevNext: true,
    compactMode: false,
    showUnreadCounts: true,
    showStatusIndicators: true,
    showPriorityIndicators: true,
  },
  messageThread: {
    autoRefresh: true,
    refreshInterval: 30,
    showTimestamps: true,
    showAvatars: true,
    showReactions: true,
    showDeliveryStatus: true,
    showTypingIndicators: true,
    maxMessagesPerLoad: 50,
  },
  messageComposer: {
    maxLength: 10000,
    maxAttachments: 5,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    showFormatting: true,
    showEmoji: true,
    showAttachments: true,
    showTemplates: true,
    autoSaveDrafts: true,
    draftSaveInterval: 2000,
  },
  assignmentDashboard: {
    itemsPerPage: 20,
    showMetrics: true,
    showCharts: true,
    showFilters: true,
    refreshInterval: 60,
    slaThresholds: {
      warning: 24 * 60 * 60 * 1000, // 24 hours
      critical: 60 * 60 * 1000, // 1 hour
    },
  },
  assignmentDetails: {
    showActions: true,
    showHistory: true,
    showMetrics: true,
    showCustomFields: true,
    maxHistoryItems: 50,
  }
};

// Export everything as default for convenience
export default {
  MessageThreadList,
  MessageThread,
  MessageComposer,
  AssignmentDashboard,
  AssignmentDetails,
  MESSAGING_COMPONENTS,
  MESSAGING_UTILS,
  MESSAGING_DEFAULTS
};