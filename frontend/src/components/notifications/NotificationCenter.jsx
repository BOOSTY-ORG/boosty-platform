import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNotificationStore } from '../../stores/index.js';
import { notificationAPI } from '../../api/index.js';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUS,
  FILTER_OPTIONS,
  BULK_OPERATION_TYPES,
  DEFAULT_PREFERENCES,
} from '../../api/notificationConstants.js';

// Import specialized notification components
import MessageNotification from './MessageNotification.jsx';
import TaskNotification from './TaskNotification.jsx';
import ErrorNotification, { ERROR_TYPES } from './ErrorNotification.jsx';
import SuccessNotification, { SUCCESS_TYPES } from './SuccessNotification.jsx';

import './NotificationCenter.css';

/**
 * View modes for the notification center
 */
export const VIEW_MODES = {
  LIST: 'list',
  GRID: 'grid',
  COMPACT: 'compact',
};

/**
 * Tab options for organizing notifications
 */
export const TAB_OPTIONS = {
  ALL: 'all',
  UNREAD: 'unread',
  MESSAGES: 'messages',
  TASKS: 'tasks',
  ERRORS: 'errors',
  SUCCESS: 'success',
  ARCHIVED: 'archived',
};

/**
 * Comprehensive NotificationCenter component that serves as a central hub
 * for managing all notifications in one unified interface
 */
const NotificationCenter = ({
  userId,
  initialViewMode = VIEW_MODES.LIST,
  initialTab = TAB_OPTIONS.ALL,
  showAnalytics = true,
  showPreferences = true,
  showSearch = true,
  showFilters = true,
  showBulkActions = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  maxNotifications = 50,
  className = '',
  onNotificationClick,
  onNotificationAction,
  onBulkAction,
  onPreferencesChange,
  ...props
}) => {
  // Store state
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    filters,
    pagination,
    preferences,
    realtimeConnected,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    setFilters,
    clearFilters,
    setPagination,
    fetchPreferences,
    updatePreferences,
    connectRealtime,
    disconnectRealtime,
  } = useNotificationStore();

  // Local state
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [notificationStats, setNotificationStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState(FILTER_OPTIONS.SORT_OPTIONS.CREATED_AT_DESC);
  const [dateRange, setDateRange] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs
  const observerRef = useRef(null);
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize component
  useEffect(() => {
    if (userId) {
      notificationAPI.setUserId(userId);
      initializeNotifications();
    }

    return () => {
      if (realtimeConnected) {
        disconnectRealtime();
      }
    };
  }, [userId]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId]);

  // Connect to real-time updates
  useEffect(() => {
    if (userId && !realtimeConnected) {
      connectRealtime();
    }
  }, [userId, realtimeConnected]);

  // Initialize notifications
  const initializeNotifications = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        fetchNotifications({ limit: maxNotifications, sortBy }),
        fetchUnreadCount(),
        fetchPreferences(),
      ]);
      
      if (showAnalytics) {
        const stats = await notificationAPI.getNotificationStats();
        setNotificationStats(stats);
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await fetchNotifications({ 
        limit: maxNotifications, 
        sortBy,
        type: selectedType,
        priority: selectedPriority,
        status: selectedStatus,
        dateRange,
        search: searchQuery,
      });
      await fetchUnreadCount();
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load more notifications (infinite scroll)
  const loadMoreNotifications = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = pagination.page + 1;
      
      const response = await fetchNotifications({
        page: nextPage,
        limit: pagination.limit,
        sortBy,
        type: selectedType,
        priority: selectedPriority,
        status: selectedStatus,
        dateRange,
        search: searchQuery,
      });

      if (response.data?.length < pagination.limit) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, pagination, sortBy, selectedType, selectedPriority, selectedStatus, dateRange, searchQuery]);

  // Setup infinite scroll observer
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreNotifications();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [loadMoreNotifications, hasMore]);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setPagination({ page: 1 });
    setHasMore(true);
    
    // Debounce search
    const timer = setTimeout(() => {
      fetchNotifications({
        search: query,
        page: 1,
        limit: pagination.limit,
        sortBy,
        type: selectedType,
        priority: selectedPriority,
        status: selectedStatus,
        dateRange,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchNotifications, pagination.limit, sortBy, selectedType, selectedPriority, selectedStatus, dateRange]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'type':
        setSelectedType(value);
        break;
      case 'priority':
        setSelectedPriority(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'dateRange':
        setDateRange(value);
        break;
      case 'sortBy':
        setSortBy(value);
        break;
      default:
        break;
    }
    
    setPagination({ page: 1 });
    setHasMore(true);
    
    fetchNotifications({
      page: 1,
      limit: pagination.limit,
      sortBy: filterType === 'sortBy' ? value : sortBy,
      type: filterType === 'type' ? value : selectedType,
      priority: filterType === 'priority' ? value : selectedPriority,
      status: filterType === 'status' ? value : selectedStatus,
      dateRange: filterType === 'dateRange' ? value : dateRange,
      search: searchQuery,
    });
  }, [fetchNotifications, pagination.limit, sortBy, selectedType, selectedPriority, selectedStatus, dateRange, searchQuery]);

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedNotifications(new Set());
    
    let filterOptions = {};
    
    switch (tab) {
      case TAB_OPTIONS.UNREAD:
        filterOptions.status = NOTIFICATION_STATUS.DELIVERED;
        break;
      case TAB_OPTIONS.MESSAGES:
        filterOptions.type = NOTIFICATION_TYPES.MESSAGE;
        break;
      case TAB_OPTIONS.TASKS:
        filterOptions.type = NOTIFICATION_TYPES.TASK;
        break;
      case TAB_OPTIONS.ERRORS:
        filterOptions.type = NOTIFICATION_TYPES.ERROR;
        break;
      case TAB_OPTIONS.SUCCESS:
        filterOptions.type = NOTIFICATION_TYPES.SUCCESS;
        break;
      case TAB_OPTIONS.ARCHIVED:
        filterOptions.status = NOTIFICATION_STATUS.ARCHIVED;
        break;
      default:
        filterOptions = {};
        break;
    }
    
    setFilters(filterOptions);
    setPagination({ page: 1 });
    setHasMore(true);
    
    fetchNotifications({
      ...filterOptions,
      page: 1,
      limit: pagination.limit,
      sortBy,
      search: searchQuery,
    });
  }, [fetchNotifications, pagination.limit, sortBy, searchQuery]);

  // Handle notification selection
  const handleNotificationSelect = useCallback((notificationId, isSelected) => {
    setSelectedNotifications((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(notificationId);
      } else {
        newSet.delete(notificationId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }, [selectedNotifications.size, filteredNotifications]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (actionType) => {
    if (selectedNotifications.size === 0) return;

    try {
      const notificationIds = Array.from(selectedNotifications);
      
      switch (actionType) {
        case BULK_OPERATION_TYPES.MARK_READ:
          await Promise.all(notificationIds.map(id => markAsRead(id)));
          break;
        case BULK_OPERATION_TYPES.MARK_UNREAD:
          await Promise.all(notificationIds.map(id => markAsUnread(id)));
          break;
        case BULK_OPERATION_TYPES.DELETE:
          await notificationAPI.bulkOperation(BULK_OPERATION_TYPES.DELETE, notificationIds);
          break;
        case BULK_OPERATION_TYPES.ARCHIVE:
          await notificationAPI.bulkOperation(BULK_OPERATION_TYPES.ARCHIVE, notificationIds);
          break;
        default:
          break;
      }
      
      setSelectedNotifications(new Set());
      
      if (onBulkAction) {
        onBulkAction(actionType, notificationIds);
      }
      
      // Refresh notifications
      refreshNotifications();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  }, [selectedNotifications, markAsRead, markAsUnread, onBulkAction, refreshNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback((notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification.id);
    }
  }, [onNotificationClick, markAsRead]);

  // Handle notification action
  const handleNotificationAction = useCallback((notificationId, action, data) => {
    if (onNotificationAction) {
      onNotificationAction(notificationId, action, data);
    }
  }, [onNotificationAction]);

  // Handle preferences update
  const handlePreferencesUpdate = useCallback(async (newPreferences) => {
    try {
      await updatePreferences(newPreferences);
      
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }, [updatePreferences, onPreferencesChange]);

  // Filter notifications based on active tab and search
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(notification =>
        notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notification.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [notifications, searchQuery]);

  // Render notification based on type
  const renderNotification = useCallback((notification) => {
    const commonProps = {
      key: notification.id,
      id: notification.id,
      read: notification.read,
      timestamp: notification.createdAt,
      onClose: () => deleteNotification(notification.id),
      onMarkAsRead: () => markAsRead(notification.id),
      className: viewMode === VIEW_MODES.COMPACT ? 'compact' : '',
    };

    switch (notification.type) {
      case NOTIFICATION_TYPES.MESSAGE:
        return (
          <MessageNotification
            {...commonProps}
            {...notification.data}
            onReply={(id, message) => handleNotificationAction(id, 'reply', { message })}
          />
        );
      case NOTIFICATION_TYPES.TASK:
        return (
          <TaskNotification
            {...commonProps}
            {...notification.data}
            onViewTask={(id) => handleNotificationAction(id, 'view_task')}
            onMarkComplete={(id) => handleNotificationAction(id, 'mark_complete')}
            onReassign={(id) => handleNotificationAction(id, 'reassign')}
            onSnooze={(id) => handleNotificationAction(id, 'snooze')}
          />
        );
      case NOTIFICATION_TYPES.ERROR:
        return (
          <ErrorNotification
            {...commonProps}
            {...notification.data}
            onRetry={(id) => handleNotificationAction(id, 'retry')}
            onReportIssue={(id) => handleNotificationAction(id, 'report_issue')}
            onGetHelp={(id) => handleNotificationAction(id, 'get_help')}
          />
        );
      case NOTIFICATION_TYPES.SUCCESS:
        return (
          <SuccessNotification
            {...commonProps}
            {...notification.data}
            onShare={(id) => handleNotificationAction(id, 'share')}
            onViewDetails={(id) => handleNotificationAction(id, 'view_details')}
            onContinue={(id) => handleNotificationAction(id, 'continue')}
          />
        );
      default:
        return (
          <div
            key={notification.id}
            className={`notification-item ${viewMode === VIEW_MODES.COMPACT ? 'compact' : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notification-content">
              <h4>{notification.title || 'Notification'}</h4>
              <p>{notification.message}</p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
            </div>
          </div>
        );
    }
  }, [viewMode, deleteNotification, markAsRead, handleNotificationAction, handleNotificationClick]);

  // Render loading state
  if (isLoading && notifications.length === 0) {
    return (
      <div className={`notification-center loading ${className}`} {...props}>
        <div className="loading-spinner">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`notification-center ${className}`} {...props} ref={containerRef}>
      {/* Header */}
      <div className="notification-center-header">
        <div className="header-title">
          <h2>Notification Center</h2>
          {unreadCount > 0 && (
            <span className="unread-count">{unreadCount}</span>
          )}
        </div>
        
        <div className="header-actions">
          {/* Refresh button */}
          <button
            onClick={refreshNotifications}
            disabled={isRefreshing}
            className="refresh-btn"
            title="Refresh notifications"
          >
            <svg className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </button>
          
          {/* View mode selector */}
          <div className="view-mode-selector">
            <button
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              className={`view-mode-btn ${viewMode === VIEW_MODES.LIST ? 'active' : ''}`}
              title="List view"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.GRID)}
              className={`view-mode-btn ${viewMode === VIEW_MODES.GRID ? 'active' : ''}`}
              title="Grid view"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode(VIEW_MODES.COMPACT)}
              className={`view-mode-btn ${viewMode === VIEW_MODES.COMPACT ? 'active' : ''}`}
              title="Compact view"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0-4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Analytics button */}
          {showAnalytics && (
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="analytics-btn"
              title="View analytics"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </button>
          )}
          
          {/* Preferences button */}
          {showPreferences && (
            <button
              onClick={() => setShowPreferencesModal(true)}
              className="preferences-btn"
              title="Notification preferences"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="notification-tabs">
        {Object.values(TAB_OPTIONS).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === TAB_OPTIONS.ALL && unreadCount > 0 && (
              <span className="tab-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="notification-controls">
          {showSearch && (
            <div className="search-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              <svg className="search-icon" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
          
          {showFilters && (
            <div className="filters-container">
              {/* Type filter */}
              <select
                value={selectedType || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || null)}
                className="filter-select"
              >
                <option value="">All Types</option>
                {Object.values(NOTIFICATION_TYPES).map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              
              {/* Priority filter */}
              <select
                value={selectedPriority || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value || null)}
                className="filter-select"
              >
                <option value="">All Priorities</option>
                {Object.values(NOTIFICATION_PRIORITIES).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
              
              {/* Sort by */}
              <select
                value={sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value={FILTER_OPTIONS.SORT_OPTIONS.CREATED_AT_DESC}>Newest First</option>
                <option value={FILTER_OPTIONS.SORT_OPTIONS.CREATED_AT_ASC}>Oldest First</option>
                <option value={FILTER_OPTIONS.SORT_OPTIONS.PRIORITY_DESC}>Highest Priority</option>
                <option value={FILTER_OPTIONS.SORT_OPTIONS.PRIORITY_ASC}>Lowest Priority</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && selectedNotifications.size > 0 && (
        <div className="bulk-actions">
          <div className="bulk-selection-info">
            <span>{selectedNotifications.size} selected</span>
            <button onClick={handleSelectAll} className="select-all-btn">
              {selectedNotifications.size === filteredNotifications.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="bulk-action-buttons">
            <button
              onClick={() => handleBulkAction(BULK_OPERATION_TYPES.MARK_READ)}
              className="bulk-action-btn mark-read"
            >
              Mark as Read
            </button>
            <button
              onClick={() => handleBulkAction(BULK_OPERATION_TYPES.MARK_UNREAD)}
              className="bulk-action-btn mark-unread"
            >
              Mark as Unread
            </button>
            <button
              onClick={() => handleBulkAction(BULK_OPERATION_TYPES.ARCHIVE)}
              className="bulk-action-btn archive"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction(BULK_OPERATION_TYPES.DELETE)}
              className="bulk-action-btn delete"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className={`notifications-container view-${viewMode}`}>
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <svg className="empty-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            <h3>No notifications</h3>
            <p>You're all caught up! Check back later for new notifications.</p>
          </div>
        ) : (
          <>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-wrapper ${selectedNotifications.has(notification.id) ? 'selected' : ''}`}
              >
                {showBulkActions && (
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(notification.id)}
                    onChange={(e) => handleNotificationSelect(notification.id, e.target.checked)}
                    className="notification-checkbox"
                  />
                )}
                {renderNotification(notification)}
              </div>
            ))}
            
            {/* Load more indicator */}
            {hasMore && (
              <div ref={observerRef} className="load-more-indicator">
                {isLoadingMore ? (
                  <div className="loading-more">
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading more...</span>
                  </div>
                ) : (
                  <div className="load-more-trigger" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="error-state">
          <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3>Failed to load notifications</h3>
          <p>{error}</p>
          <button onClick={refreshNotifications} className="retry-btn">
            Try Again
          </button>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <NotificationPreferencesModal
          preferences={preferences || DEFAULT_PREFERENCES}
          onClose={() => setShowPreferencesModal(false)}
          onSave={handlePreferencesUpdate}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <NotificationAnalyticsModal
          stats={notificationStats}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
};

// Notification Preferences Modal Component
const NotificationPreferencesModal = ({ preferences, onClose, onSave }) => {
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(localPreferences);
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTypePreferenceChange = (type, field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: {
          ...prev.types[type],
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal preferences-modal">
        <div className="modal-header">
          <h3>Notification Preferences</h3>
          <button onClick={onClose} className="modal-close-btn">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="preference-section">
            <h4>General Settings</h4>
            <label className="preference-item">
              <input
                type="checkbox"
                checked={localPreferences.emailNotifications}
                onChange={(e) => setLocalPreferences(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              />
              Email Notifications
            </label>
            <label className="preference-item">
              <input
                type="checkbox"
                checked={localPreferences.smsNotifications}
                onChange={(e) => setLocalPreferences(prev => ({ ...prev, smsNotifications: e.target.checked }))}
              />
              SMS Notifications
            </label>
            <label className="preference-item">
              <input
                type="checkbox"
                checked={localPreferences.pushNotifications}
                onChange={(e) => setLocalPreferences(prev => ({ ...prev, pushNotifications: e.target.checked }))}
              />
              Push Notifications
            </label>
            <label className="preference-item">
              <input
                type="checkbox"
                checked={localPreferences.inAppNotifications}
                onChange={(e) => setLocalPreferences(prev => ({ ...prev, inAppNotifications: e.target.checked }))}
              />
              In-App Notifications
            </label>
          </div>
          
          <div className="preference-section">
            <h4>Notification Types</h4>
            {Object.entries(localPreferences.types).map(([type, config]) => (
              <div key={type} className="type-preference">
                <h5>{type.charAt(0).toUpperCase() + type.slice(1)}</h5>
                <div className="type-channels">
                  <label className="channel-item">
                    <input
                      type="checkbox"
                      checked={config.email}
                      onChange={(e) => handleTypePreferenceChange(type, 'email', e.target.checked)}
                    />
                    Email
                  </label>
                  <label className="channel-item">
                    <input
                      type="checkbox"
                      checked={config.sms}
                      onChange={(e) => handleTypePreferenceChange(type, 'sms', e.target.checked)}
                    />
                    SMS
                  </label>
                  <label className="channel-item">
                    <input
                      type="checkbox"
                      checked={config.push}
                      onChange={(e) => handleTypePreferenceChange(type, 'push', e.target.checked)}
                    />
                    Push
                  </label>
                  <label className="channel-item">
                    <input
                      type="checkbox"
                      checked={config.inApp}
                      onChange={(e) => handleTypePreferenceChange(type, 'inApp', e.target.checked)}
                    />
                    In-App
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <div className="preference-section">
            <h4>Quiet Hours</h4>
            <label className="preference-item">
              <input
                type="checkbox"
                checked={localPreferences.quietHours.enabled}
                onChange={(e) => setLocalPreferences(prev => ({
                  ...prev,
                  quietHours: { ...prev.quietHours, enabled: e.target.checked }
                }))}
              />
              Enable Quiet Hours
            </label>
            {localPreferences.quietHours.enabled && (
              <div className="quiet-hours-config">
                <div className="time-input">
                  <label>From:</label>
                  <input
                    type="time"
                    value={localPreferences.quietHours.startTime}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, startTime: e.target.value }
                    }))}
                  />
                </div>
                <div className="time-input">
                  <label>To:</label>
                  <input
                    type="time"
                    value={localPreferences.quietHours.endTime}
                    onChange={(e) => setLocalPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, endTime: e.target.value }
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Analytics Modal Component
const NotificationAnalyticsModal = ({ stats, onClose }) => {
  if (!stats) return null;

  return (
    <div className="modal-overlay">
      <div className="modal analytics-modal">
        <div className="modal-header">
          <h3>Notification Analytics</h3>
          <button onClick={onClose} className="modal-close-btn">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          <div className="analytics-overview">
            <div className="stat-card">
              <h4>Total Notifications</h4>
              <div className="stat-value">{stats.total || 0}</div>
            </div>
            <div className="stat-card">
              <h4>Unread</h4>
              <div className="stat-value">{stats.unread || 0}</div>
            </div>
            <div className="stat-card">
              <h4>Read Rate</h4>
              <div className="stat-value">{stats.readRate ? `${stats.readRate}%` : '0%'}</div>
            </div>
            <div className="stat-card">
              <h4>Average Response Time</h4>
              <div className="stat-value">{stats.avgResponseTime || 'N/A'}</div>
            </div>
          </div>
          
          <div className="analytics-details">
            <div className="chart-section">
              <h4>Notifications by Type</h4>
              <div className="type-stats">
                {Object.entries(stats.byType || {}).map(([type, count]) => (
                  <div key={type} className="type-stat">
                    <span className="type-name">{type}</span>
                    <div className="type-bar">
                      <div
                        className="type-fill"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="chart-section">
              <h4>Notifications by Priority</h4>
              <div className="priority-stats">
                {Object.entries(stats.byPriority || {}).map(([priority, count]) => (
                  <div key={priority} className="priority-stat">
                    <span className="priority-name">{priority}</span>
                    <div className="priority-bar">
                      <div
                        className="priority-fill"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="priority-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

NotificationCenter.propTypes = {
  userId: PropTypes.string.isRequired,
  initialViewMode: PropTypes.oneOf(Object.values(VIEW_MODES)),
  initialTab: PropTypes.oneOf(Object.values(TAB_OPTIONS)),
  showAnalytics: PropTypes.bool,
  showPreferences: PropTypes.bool,
  showSearch: PropTypes.bool,
  showFilters: PropTypes.bool,
  showBulkActions: PropTypes.bool,
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
  maxNotifications: PropTypes.number,
  className: PropTypes.string,
  onNotificationClick: PropTypes.func,
  onNotificationAction: PropTypes.func,
  onBulkAction: PropTypes.func,
  onPreferencesChange: PropTypes.func,
};

export default NotificationCenter;