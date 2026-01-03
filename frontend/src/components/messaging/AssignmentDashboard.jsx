import React, { useState, useEffect } from 'react';
import { crmAPI } from '../../api/crm.js';
import { Card, Button, Loading, Pagination } from '../common';
import { formatRelativeTime, formatDuration } from '../../utils/formatters.js';

/**
 * AssignmentDashboard Component
 * 
 * Displays assignment metrics, agent workload distribution, assignment status overview,
 * and SLA compliance metrics. Supports assignment transfer and escalation actions.
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.filters - Initial filters
 * @param {Function} props.onAssignmentSelect - Callback for assignment selection
 * @param {Function} props.onAgentSelect - Callback for agent selection
 * @param {boolean} props.showMetrics - Show metrics cards
 * @param {boolean} props.showCharts - Show charts and visualizations
 * @param {boolean} props.showFilters - Show filter controls
 * @returns {JSX.Element} AssignmentDashboard component
 */
const AssignmentDashboard = ({
  className = '',
  filters = {},
  onAssignmentSelect,
  onAgentSelect,
  showMetrics = true,
  showCharts = true,
  showFilters = true,
}) => {
  // State management
  const [assignments, setAssignments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [slaMetrics, setSlaMetrics] = useState(null);
  const [agentWorkloads, setAgentWorkloads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [activeFilters, setActiveFilters] = useState({
    dateRange: 'last_30_days',
    status: 'all',
    priority: 'all',
    agentId: 'all',
    entityType: 'all',
    ...filters,
  });
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  // Fetch assignments data
  const fetchAssignments = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pagination.limit,
        ...activeFilters,
      };
      
      // Remove 'all' values from filters
      Object.keys(params).forEach(key => {
        if (params[key] === 'all') {
          delete params[key];
        }
      });
      
      const [assignmentsData, metricsData, slaData, workloadData] = await Promise.all([
        crmAPI.getAssignments(params),
        crmAPI.getAssignmentMetrics(params),
        crmAPI.getSLACompliance(params),
        crmAPI.getAssignments() // This would ideally have a specific endpoint for workloads
      ]);
      
      setAssignments(assignmentsData.data || []);
      setMetrics(metricsData);
      setSlaMetrics(slaData);
      setAgentWorkloads(workloadData.data || []);
      
      setPagination({
        page: assignmentsData.pagination?.page || page,
        limit: assignmentsData.pagination?.limit || pagination.limit,
        total: assignmentsData.pagination?.total || 0,
        totalPages: assignmentsData.pagination?.totalPages || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAssignments(pagination.page);
  }, [activeFilters, pagination.page]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle assignment selection
  const handleAssignmentSelect = (assignment) => {
    if (onAssignmentSelect) {
      onAssignmentSelect(assignment);
    }
  };

  // Handle bulk selection
  const handleAssignmentCheckbox = (assignmentId) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  // Handle transfer
  const handleTransfer = async (assignmentId, toAgentId, reason) => {
    try {
      await crmAPI.transferAssignment(assignmentId, { toAgentId, reason });
      await fetchAssignments(pagination.page);
      setShowTransferModal(false);
    } catch (err) {
      setError(err.message || 'Failed to transfer assignment');
    }
  };

  // Handle escalation
  const handleEscalate = async (assignmentId, toAgentId, level) => {
    try {
      await crmAPI.escalateAssignment(assignmentId, { toAgentId, level });
      await fetchAssignments(pagination.page);
      setShowEscalateModal(false);
    } catch (err) {
      setError(err.message || 'Failed to escalate assignment');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
      escalated: 'bg-purple-100 text-purple-800',
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

  // Get SLA status
  const getSlaStatus = (assignment) => {
    if (!assignment.responseDeadline) return { status: 'unknown', color: 'gray' };
    
    const now = new Date();
    const deadline = new Date(assignment.responseDeadline);
    const timeRemaining = deadline - now;
    
    if (timeRemaining < 0) {
      return { status: 'overdue', color: 'red' };
    } else if (timeRemaining < 60 * 60 * 1000) { // Less than 1 hour
      return { status: 'critical', color: 'orange' };
    } else if (timeRemaining < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return { status: 'warning', color: 'yellow' };
    } else {
      return { status: 'ok', color: 'green' };
    }
  };

  // Render metrics cards
  const renderMetricsCards = () => {
    if (!showMetrics || !metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalAssignments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📋</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.activeAssignments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">🔄</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{metrics.overdueAssignments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(metrics.averageResponseTime || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">⏱️</span>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Render SLA compliance chart
  const renderSlaChart = () => {
    if (!showCharts || !slaMetrics) return null;
    
    const compliance = slaMetrics.complianceRate || 0;
    const nonCompliance = 100 - compliance;
    
    return (
      <Card className="p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Compliance</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${compliance * 3.52} 352`}
                className={compliance >= 95 ? 'text-green-500' : compliance >= 80 ? 'text-yellow-500' : 'text-red-500'}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{compliance.toFixed(1)}%</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            {compliance >= 95 ? 'Excellent' : compliance >= 80 ? 'Good' : 'Needs Improvement'} SLA Compliance
          </p>
        </div>
      </Card>
    );
  };

  // Render agent workload
  const renderAgentWorkload = () => {
    if (!showCharts || !agentWorkloads.length) return null;
    
    return (
      <Card className="p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Workload Distribution</h3>
        <div className="space-y-3">
          {agentWorkloads.slice(0, 5).map((agent) => (
            <div key={agent._id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                  {(agent.name || agent.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{agent.name || agent.email}</p>
                  <p className="text-xs text-gray-500">{agent.activeAssignments || 0} active</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      agent.capacityUtilization >= 90 ? 'bg-red-500' :
                      agent.capacityUtilization >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${agent.capacityUtilization || 0}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {agent.capacityUtilization || 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
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
              value={activeFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          
          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={activeFilters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          {/* Entity type filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={activeFilters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="message_thread">Message Thread</option>
              <option value="contact">Contact</option>
              <option value="ticket">Ticket</option>
              <option value="investor">Investor</option>
            </select>
          </div>
          
          {/* Agent filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Agent
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={activeFilters.agentId}
              onChange={(e) => handleFilterChange('agentId', e.target.value)}
            >
              <option value="all">All Agents</option>
              <option value="unassigned">Unassigned</option>
              {/* Add actual agents from API */}
            </select>
          </div>
          
          {/* Date range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={activeFilters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="last_90_days">Last 90 Days</option>
            </select>
          </div>
        </div>
      </Card>
    );
  };

  // Render assignment item
  const renderAssignmentItem = (assignment) => {
    const isSelected = selectedAssignments.includes(assignment._id);
    const slaStatus = getSlaStatus(assignment);
    
    return (
      <div
        key={assignment._id}
        className={`
          border rounded-lg p-4 mb-3 cursor-pointer transition-all duration-200
          hover:shadow-md hover:border-blue-300
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        `}
        onClick={() => handleAssignmentSelect(assignment)}
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
                handleAssignmentCheckbox(assignment._id);
              }}
            />
            
            {/* Assignment info */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {assignment.entityType} - {assignment.entityId}
                </h3>
                <div className="flex items-center space-x-2 ml-2">
                  {/* Status indicator */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                  </span>
                  
                  {/* Priority indicator */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                    {assignment.priority}
                  </span>
                  
                  {/* SLA status */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${slaStatus.color}-100 text-${slaStatus.color}-800`}>
                    SLA: {slaStatus.status}
                  </span>
                </div>
              </div>
              
              {/* Assignment details */}
              <div className="flex items-center text-xs text-gray-500 mb-2">
                <span>Assigned to: {assignment.agent?.name || assignment.agent?.email || 'Unassigned'}</span>
                <span className="mx-2">•</span>
                <span>Type: {assignment.assignmentType}</span>
                <span className="mx-2">•</span>
                <span>Created: {formatRelativeTime(assignment.createdAt)}</span>
              </div>
              
              {/* Performance metrics */}
              {assignment.firstResponseTime && (
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <span>First Response: {formatDuration(assignment.firstResponseTime)}</span>
                  {assignment.averageResponseTime && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Avg Response: {formatDuration(assignment.averageResponseTime)}</span>
                    </>
                  )}
                  {assignment.resolutionTime && (
                    <>
                      <span className="mx-2">•</span>
                      <span>Resolution: {formatDuration(assignment.resolutionTime)}</span>
                    </>
                  )}
                </div>
              )}
              
              {/* Tags */}
              {assignment.tags && assignment.tags.length > 0 && (
                <div className="flex items-center space-x-1 mb-2">
                  {assignment.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {assignment.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{assignment.tags.length - 3}</span>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex items-center space-x-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTransferModal(true);
                  }}
                >
                  Transfer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEscalateModal(true);
                  }}
                >
                  Escalate
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`assignment-dashboard ${className}`}>
      {/* Metrics cards */}
      {renderMetricsCards()}
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {renderSlaChart()}
        {renderAgentWorkload()}
      </div>
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Loading state */}
      {loading && <Loading className="my-8" />}
      
      {/* Error state */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Error loading assignments</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fetchAssignments(pagination.page)}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}
      
      {/* Assignment list */}
      {!loading && !error && (
        <>
          {assignments.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-gray-500">No assignments found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your filters or check back later
              </p>
            </Card>
          ) : (
            <>
              {/* Bulk actions */}
              {selectedAssignments.length > 0 && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">
                      {selectedAssignments.length} assignment{selectedAssignments.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAssignments([])}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTransferModal(true)}
                      >
                        Bulk Transfer
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Assignment items */}
              <div className="space-y-2">
                {assignments.map(renderAssignmentItem)}
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                    showFirstLast={true}
                    showPrevNext={true}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
      
      {/* Transfer Modal */}
      {/* <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransfer={handleTransfer}
        selectedAssignments={selectedAssignments}
      /> */}
      
      {/* Escalate Modal */}
      {/* <EscalateModal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        onEscalate={handleEscalate}
        selectedAssignments={selectedAssignments}
      /> */}
    </div>
  );
};

export default AssignmentDashboard;