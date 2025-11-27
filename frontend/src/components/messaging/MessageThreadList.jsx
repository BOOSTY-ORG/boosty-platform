import React, { useState, useEffect } from 'react';
import { crmAPI } from '../../api/crm.js';
import { Loading, Card, Button, Input, Pagination } from '../common';
import { formatRelativeTime } from '../../utils/formatters.js';

/**
 * MessageThreadList Component
 * 
 * Displays a list of message threads with filtering, pagination, and status indicators.
 * Shows thread metadata, participant count, last message preview, and supports
 * thread status indicators (active, closed, archived).
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.initialFilters - Initial filter state
 * @param {Function} props.onThreadSelect - Callback for thread selection
 * @param {boolean} props.showFilters - Show filter controls
 * @param {boolean} props.showSearch - Show search bar
 * @param {boolean} props.compact - Compact view mode
 * @returns {JSX.Element} MessageThreadList component
 */
const MessageThreadList = ({
  className = '',
  initialFilters = {},
  onThreadSelect,
  showFilters = true,
  showSearch = true,
  compact = false,
}) => {
  // State management
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignedAgent: 'all',
    threadType: 'all',
    dateRange: 'last_30_days',
    ...initialFilters,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreads, setSelectedThreads] = useState([]);

  // Fetch threads
  const fetchThreads = async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      };
      
      // Remove 'all' values from filters
      Object.keys(params).forEach(key => {
        if (params[key] === 'all') {
          delete params[key];
        }
      });
      
      if (search) {
        params.search = search;
      }
      
      const response = await crmAPI.getMessageThreads(params);
      
      setThreads(response.data || []);
      setPagination({
        page: response.pagination?.page || page,
        limit: response.pagination?.limit || pagination.limit,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch message threads');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchThreads(pagination.page, searchQuery);
  }, [filters, pagination.page]);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchThreads(1, query);
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle thread selection
  const handleThreadClick = (thread) => {
    if (onThreadSelect) {
      onThreadSelect(thread);
    }
  };

  // Handle thread selection for bulk actions
  const handleThreadSelect = (threadId) => {
    setSelectedThreads(prev => 
      prev.includes(threadId)
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
    );
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Render thread item
  const renderThreadItem = (thread) => {
    const isSelected = selectedThreads.includes(thread._id);
    const hasUnread = thread.unreadCount > 0;
    
    return (
      <div
        key={thread._id}
        className={`
          border rounded-lg p-4 mb-3 cursor-pointer transition-all duration-200
          hover:shadow-md hover:border-blue-300
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
          ${hasUnread ? 'font-semibold' : ''}
        `}
        onClick={() => handleThreadClick(thread)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Checkbox for bulk selection */}
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                handleThreadSelect(thread._id);
              }}
            />
            
            {/* Thread info */}
            <div className="flex-1 min-w-0">
              {/* Thread subject and participants */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {thread.subject || 'No Subject'}
                </h3>
                <div className="flex items-center space-x-2 ml-2">
                  {/* Status indicator */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(thread.status)}`}>
                    {thread.status}
                  </span>
                  
                  {/* Priority indicator */}
                  {thread.priority && thread.priority !== 'medium' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(thread.priority)}`}>
                      {thread.priority}
                    </span>
                  )}
                  
                  {/* Unread count */}
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-medium">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Participants */}
              <div className="flex items-center text-xs text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  {thread.participants?.slice(0, 3).map((participant, index) => (
                    <div
                      key={participant._id || index}
                      className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
                      title={participant.name || participant.email}
                    >
                      {(participant.name || participant.email || '?').charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {thread.participants?.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{thread.participants.length - 3} more
                    </span>
                  )}
                </div>
                
                <span className="mx-2">•</span>
                
                <span>{thread.participants?.length || 0} participants</span>
                
                {thread.assignedAgent && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Assigned to {thread.assignedAgent.name || thread.assignedAgent.email}</span>
                  </>
                )}
              </div>
              
              {/* Last message preview */}
              {thread.lastMessage && (
                <div className="text-sm text-gray-600 truncate mb-2">
                  <span className="font-medium">
                    {thread.lastMessage.sender?.name || thread.lastMessage.sender?.email || 'Unknown'}:
                  </span>{' '}
                  {thread.lastMessage.content || 'No content'}
                </div>
              )}
              
              {/* Thread metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-4">
                  <span>Thread ID: {thread.threadId}</span>
                  {thread.tags?.length > 0 && (
                    <div className="flex items-center space-x-1">
                      {thread.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {thread.tags.length > 2 && (
                        <span className="text-gray-500">+{thread.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
                
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(thread.lastMessage?.timestamp || thread.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <Card className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          {/* Thread type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thread Type
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.threadType}
              onChange={(e) => handleFilterChange('threadType', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="direct">Direct</option>
              <option value="group">Group</option>
            </select>
          </div>
          
          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          {/* Assigned agent filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Agent
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filters.assignedAgent}
              onChange={(e) => handleFilterChange('assignedAgent', e.target.value)}
            >
              <option value="all">All Agents</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
              {/* Add actual agents from API */}
            </select>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={`message-thread-list ${className}`}>
      {/* Search bar */}
      {showSearch && (
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search message threads..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
        </div>
      )}
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Loading state */}
      {loading && <Loading className="my-8" />}
      
      {/* Error state */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Error loading message threads</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchThreads(pagination.page, searchQuery)}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}
      
      {/* Thread list */}
      {!loading && !error && (
        <>
          {threads.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-500">No message threads found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your filters or search criteria
              </p>
            </Card>
          ) : (
            <>
              {/* Bulk actions */}
              {selectedThreads.length > 0 && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedThreads.length} thread{selectedThreads.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedThreads([])}
                      >
                        Clear Selection
                      </Button>
                      {/* Add bulk action buttons */}
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Thread items */}
              <div className="space-y-2">
                {threads.map(renderThreadItem)}
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    showFirstLast={true}
                    showPrevNext={true}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MessageThreadList;