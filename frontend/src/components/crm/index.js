/**
 * CRM Components Index
 * 
 * This file exports all CRM-related components for easy importing.
 * Each component is designed to work with the CRM API and service layers.
 * 
 * @module crmComponents
 */

// Main CRM Components
export { default as CrmCommunications } from './CrmCommunications.jsx';
export { default as CrmContacts } from './CrmContacts.jsx';
export { default as CrmTemplates } from './CrmTemplates.jsx';
export { default as CrmAutomation } from './CrmAutomation.jsx';
export { default as CrmDashboard } from './CrmDashboard.jsx';
export { default as EnhancedCrmDashboard } from './EnhancedCrmDashboard.jsx';

// Component metadata for documentation and testing
export const CRM_COMPONENTS = {
  CrmCommunications: {
    name: 'CrmCommunications',
    description: 'Comprehensive CRM communications management component with filtering, sorting, pagination, follow-up tracking, and agent workload metrics',
    features: [
      'Communication list with filtering and sorting',
      'Communication creation and editing forms',
      'Follow-up management and overdue tracking',
      'Agent workload metrics and assignment',
      'Bulk operations support',
      'Real-time updates and notifications'
    ],
    props: {
      className: 'String - Additional CSS classes',
      initialFilters: 'Object - Initial filter state',
      onCommunicationSelect: 'Function - Callback for communication selection',
      showMetrics: 'Boolean - Show metrics cards',
      showBulkActions: 'Boolean - Show bulk action controls'
    }
  },
  CrmContacts: {
    name: 'CrmContacts',
    description: 'Advanced CRM contacts management with search, segmentation, engagement metrics, and bulk operations',
    features: [
      'Advanced search and segmentation',
      'Contact creation and editing with consent management',
      'Engagement metrics and lead scoring visualization',
      'Bulk operations and import/export functionality',
      'Tag management and contact categorization',
      'Duplicate detection and merging'
    ],
    props: {
      className: 'String - Additional CSS classes',
      initialFilters: 'Object - Initial filter state',
      onContactSelect: 'Function - Callback for contact selection',
      showMetrics: 'Boolean - Show metrics cards',
      showBulkActions: 'Boolean - Show bulk action controls'
    }
  },
  CrmTemplates: {
    name: 'CrmTemplates',
    description: 'CRM template management with editor, approval workflow, versioning, and A/B testing',
    features: [
      'Template list with categorization and search',
      'Template editor with dynamic variables and preview',
      'Approval workflow and versioning interface',
      'A/B testing configuration and results',
      'Performance metrics and analytics',
      'Template cloning and duplication'
    ],
    props: {
      className: 'String - Additional CSS classes',
      initialFilters: 'Object - Initial filter state',
      onTemplateSelect: 'Function - Callback for template selection',
      showMetrics: 'Boolean - Show metrics cards',
      showBulkActions: 'Boolean - Show bulk action controls'
    }
  },
  CrmAutomation: {
    name: 'CrmAutomation',
    description: 'CRM automation management with rule builder, testing interface, and execution history',
    features: [
      'Automation rules list with status and performance metrics',
      'Automation rule builder with triggers and actions',
      'Testing interface and execution history',
      'Bulk enable/disable and scheduling features',
      'Performance monitoring and alerts',
      'Conditional logic and workflow designer'
    ],
    props: {
      className: 'String - Additional CSS classes',
      initialFilters: 'Object - Initial filter state',
      onAutomationSelect: 'Function - Callback for automation selection',
      showMetrics: 'Boolean - Show metrics cards',
      showBulkActions: 'Boolean - Show bulk action controls'
    }
  },
  CrmDashboard: {
    name: 'CrmDashboard',
    description: 'Comprehensive CRM dashboard with metrics, visualizations, and system health indicators',
    features: [
      'Key metrics and KPIs for all CRM entities',
      'Charts and visualizations for engagement and performance',
      'Quick actions and recent activity feed',
      'System health indicators and alerts',
      'Real-time data updates',
      'Customizable date ranges and filters'
    ],
    props: {
      className: 'String - Additional CSS classes',
      dateRange: 'String - Date range for metrics (today, last_7_days, last_30_days, etc.)',
      onNavigate: 'Function - Callback for navigation actions'
    }
  },
  EnhancedCrmDashboard: {
    name: 'EnhancedCrmDashboard',
    description: 'Enhanced CRM dashboard with advanced features, search functionality, ticket details modal, and improved UI/UX',
    features: [
      'Advanced search and filtering capabilities',
      'Ticket details modal with comprehensive information',
      'Enhanced stats with trend indicators',
      'Improved ticket cards with additional metadata',
      'Customer type and category indicators',
      'Thread count and unread indicators',
      'Responsive design with better interactions',
      'Quick actions for ticket management'
    ],
    props: {
      className: 'String - Additional CSS classes',
      onTicketSelect: 'Function - Callback for ticket selection',
      onNewTicket: 'Function - Callback for creating new ticket',
      showMetrics: 'Boolean - Show metrics cards (default: true)',
      enableSearch: 'Boolean - Enable search functionality (default: true)',
      initialFilter: 'String - Initial filter state (default: "All")'
    }
  }
};

// Utility functions for CRM components
export const CRM_UTILS = {
  /**
   * Format date for display in CRM components
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate: (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  },

  /**
   * Calculate engagement score color based on value
   * @param {number} score - Engagement score (0-100)
   * @returns {string} Tailwind CSS color class
   */
  getEngagementColor: (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  },

  /**
   * Format status for display with appropriate styling
   * @param {string} status - Status value
   * @param {string} type - Type of status (communication, contact, template, automation)
   * @returns {Object} Formatted status with color and display text
   */
  formatStatus: (status, type = 'default') => {
    const statusMap = {
      communication: {
        pending: { color: 'yellow', text: 'Pending' },
        sent: { color: 'blue', text: 'Sent' },
        delivered: { color: 'green', text: 'Delivered' },
        failed: { color: 'red', text: 'Failed' }
      },
      contact: {
        active: { color: 'green', text: 'Active' },
        inactive: { color: 'yellow', text: 'Inactive' },
        archived: { color: 'gray', text: 'Archived' }
      },
      template: {
        draft: { color: 'gray', text: 'Draft' },
        review: { color: 'yellow', text: 'Review' },
        approved: { color: 'green', text: 'Approved' },
        rejected: { color: 'red', text: 'Rejected' }
      },
      automation: {
        draft: { color: 'gray', text: 'Draft' },
        active: { color: 'green', text: 'Active' },
        paused: { color: 'yellow', text: 'Paused' },
        error: { color: 'red', text: 'Error' }
      }
    };

    return statusMap[type]?.[status] || { color: 'gray', text: status };
  },

  /**
   * Generate avatar initials from name
   * @param {string} name - Full name
   * @returns {string} Initials (max 2 characters)
   */
  getInitials: (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone
   */
  isValidPhone: (phone) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
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
  }
};

// Default configurations for CRM components
export const CRM_DEFAULTS = {
  pagination: {
    itemsPerPage: 20,
    maxVisiblePages: 5,
    showFirstLast: true,
    showPrevNext: true
  },
  table: {
    sortable: true,
    filterable: true,
    selectable: true,
    exportable: true,
    columnVisibility: true
  },
  filters: {
    dateRange: 'last_30_days',
    status: 'all',
    channel: 'all',
    type: 'all'
  },
  charts: {
    colors: {
      primary: '#3B82F6',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#6B7280'
    },
    animations: true,
    responsive: true
  }
};

// Export everything as default for convenience
export default {
  CrmCommunications,
  CrmContacts,
  CrmTemplates,
  CrmAutomation,
  CrmDashboard,
  EnhancedCrmDashboard,
  CRM_COMPONENTS,
  CRM_UTILS,
  CRM_DEFAULTS
};