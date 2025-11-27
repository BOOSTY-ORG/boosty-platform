import React, { useState, useEffect } from 'react';
import { crmAPI } from '../../api/crm.js';
import { Card, Button, Loading, Modal } from '../common';
import { formatDateTime, formatDuration } from '../../utils/formatters.js';

/**
 * AssignmentDetails Component
 * 
 * Shows detailed assignment information, performance metrics, assignment history,
 * and provides transfer and escalation actions. Displays comprehensive assignment
 * data with interactive controls for management.
 * 
 * @param {Object} props - Component props
 * @param {string} props.assignmentId - Assignment ID to display
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onUpdate - Callback for assignment updates
 * @param {Function} props.onTransfer - Callback for assignment transfer
 * @param {Function} props.onEscalate - Callback for assignment escalation
 * @param {Function} props.onComplete - Callback for assignment completion
 * @param {boolean} props.showActions - Show action buttons
 * @param {boolean} props.showHistory - Show assignment history
 * @param {boolean} props.showMetrics - Show performance metrics
 * @returns {JSX.Element} AssignmentDetails component
 */
const AssignmentDetails = ({
  assignmentId,
  className = '',
  onUpdate,
  onTransfer,
  onEscalate,
  onComplete,
  showActions = true,
  showHistory = true,
  showMetrics = true,
}) => {
  // State management
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [transferData, setTransferData] = useState({
    toAgentId: '',
    reason: '',
    priority: '',
  });
  const [escalateData, setEscalateData] = useState({
    toAgentId: '',
    level: 1,
  });
  const [completeData, setCompleteData] = useState({
    completionReason: '',
    satisfactionScore: 5,
    notes: '',
  });
  const [agents, setAgents] = useState([]);
  const [updating, setUpdating] = useState(false);

  // Fetch assignment details
  const fetchAssignment = async () => {
    if (!assignmentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [assignmentData, agentsData] = await Promise.all([
        crmAPI.getAssignment(assignmentId),
        crmAPI.getAssignments({ limit: 100 }) // This would ideally be a specific agents endpoint
      ]);
      
      setAssignment(assignmentData);
      setAgents(agentsData.data?.map(a => a.agent).filter(Boolean) || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch assignment details');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

  // Handle transfer
  const handleTransfer = async () => {
    if (!transferData.toAgentId || !transferData.reason) return;
    
    try {
      setUpdating(true);
      
      const updatedAssignment = await crmAPI.transferAssignment(assignmentId, {
        toAgentId: transferData.toAgentId,
        reason: transferData.reason,
        priority: transferData.priority || assignment.priority,
      });
      
      setAssignment(updatedAssignment);
      setShowTransferModal(false);
      setTransferData({ toAgentId: '', reason: '', priority: '' });
      
      if (onTransfer) {
        onTransfer(updatedAssignment);
      }
      
      if (onUpdate) {
        onUpdate(updatedAssignment);
      }
    } catch (err) {
      setError(err.message || 'Failed to transfer assignment');
    } finally {
      setUpdating(false);
    }
  };

  // Handle escalation
  const handleEscalate = async () => {
    if (!escalateData.toAgentId) return;
    
    try {
      setUpdating(true);
      
      const updatedAssignment = await crmAPI.escalateAssignment(assignmentId, {
        toAgentId: escalateData.toAgentId,
        level: escalateData.level,
      });
      
      setAssignment(updatedAssignment);
      setShowEscalateModal(false);
      setEscalateData({ toAgentId: '', level: 1 });
      
      if (onEscalate) {
        onEscalate(updatedAssignment);
      }
      
      if (onUpdate) {
        onUpdate(updatedAssignment);
      }
    } catch (err) {
      setError(err.message || 'Failed to escalate assignment');
    } finally {
      setUpdating(false);
    }
  };

  // Handle completion
  const handleComplete = async () => {
    if (!completeData.completionReason) return;
    
    try {
      setUpdating(true);
      
      const updatedAssignment = await crmAPI.completeAssignment(assignmentId, {
        completionReason: completeData.completionReason,
        satisfactionScore: completeData.satisfactionScore,
        notes: completeData.notes,
      });
      
      setAssignment(updatedAssignment);
      setShowCompleteModal(false);
      setCompleteData({
        completionReason: '',
        satisfactionScore: 5,
        notes: '',
      });
      
      if (onComplete) {
        onComplete(updatedAssignment);
      }
      
      if (onUpdate) {
        onUpdate(updatedAssignment);
      }
    } catch (err) {
      setError(err.message || 'Failed to complete assignment');
    } finally {
      setUpdating(false);
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
    if (!assignment.responseDeadline) return { status: 'unknown', color: 'gray', text: 'No deadline' };
    
    const now = new Date();
    const deadline = new Date(assignment.responseDeadline);
    const timeRemaining = deadline - now;
    
    if (timeRemaining < 0) {
      return { 
        status: 'overdue', 
        color: 'red', 
        text: `Overdue by ${formatDuration(Math.abs(timeRemaining))}` 
      };
    } else if (timeRemaining < 60 * 60 * 1000) { // Less than 1 hour
      return { 
        status: 'critical', 
        color: 'orange', 
        text: `Critical: ${formatDuration(timeRemaining)} remaining` 
      };
    } else if (timeRemaining < 24 * 60 * 60 * 1000) { // Less than 24 hours
      return { 
        status: 'warning', 
        color: 'yellow', 
        text: `${formatDuration(timeRemaining)} remaining` 
      };
    } else {
      return { 
        status: 'ok', 
        color: 'green', 
        text: `${formatDuration(timeRemaining)} remaining` 
      };
    }
  };

  // Render assignment header
  const renderHeader = () => {
    if (!assignment) return null;
    
    const slaStatus = getSlaStatus(assignment);
    
    return (
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Assignment Details
            </h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
              <span>ID: {assignment.assignmentId}</span>
              <span>•</span>
              <span>Type: {assignment.entityType}</span>
              <span>•</span>
              <span>Entity: {assignment.entityId}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.status)}`}>
              {assignment.status}
            </span>
            
            {/* Priority indicator */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(assignment.priority)}`}>
              {assignment.priority}
            </span>
            
            {/* SLA status */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${slaStatus.color}-100 text-${slaStatus.color}-800`}>
              SLA: {slaStatus.text}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  // Render assignment information
  const renderAssignmentInfo = () => {
    if (!assignment) return null;
    
    return (
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Assigned Agent</h3>
              <div className="mt-1 flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                  {(assignment.agent?.name || assignment.agent?.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-gray-900">
                  {assignment.agent?.name || assignment.agent?.email || 'Unassigned'}
                </span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Assignment Type</h3>
              <p className="mt-1 text-sm text-gray-900">{assignment.assignmentType}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Assignment Reason</h3>
              <p className="mt-1 text-sm text-gray-900">{assignment.assignmentReason || 'N/A'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Created Date</h3>
              <p className="mt-1 text-sm text-gray-900">{formatDateTime(assignment.createdAt)}</p>
            </div>
          </div>
          
          {/* Right column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Response Deadline</h3>
              <p className="mt-1 text-sm text-gray-900">
                {assignment.responseDeadline ? formatDateTime(assignment.responseDeadline) : 'No deadline'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Required Skills</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {assignment.requiredSkills?.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                )) || <span className="text-sm text-gray-500">None specified</span>}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Tags</h3>
              <div className="mt-1 flex flex-wrap gap-1">
                {assignment.tags?.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                )) || <span className="text-sm text-gray-500">No tags</span>}
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Custom Fields</h3>
              <div className="mt-1 space-y-1">
                {assignment.customFields && Object.keys(assignment.customFields).length > 0 ? (
                  Object.entries(assignment.customFields).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="font-medium">{key}:</span> {value}
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No custom fields</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Render performance metrics
  const renderPerformanceMetrics = () => {
    if (!assignment || !showMetrics) return null;
    
    return (
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {formatDuration(assignment.firstResponseTime || 0)}
            </div>
            <div className="text-sm text-blue-700">First Response Time</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {formatDuration(assignment.averageResponseTime || 0)}
            </div>
            <div className="text-sm text-green-700">Average Response Time</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {formatDuration(assignment.resolutionTime || 0)}
            </div>
            <div className="text-sm text-purple-700">Resolution Time</div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">
              {assignment.satisfactionScore?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-sm text-orange-700">Satisfaction Score</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {assignment.totalMessages || 0}
            </div>
            <div className="text-sm text-gray-700">Total Messages</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {assignment.totalInteractions || 0}
            </div>
            <div className="text-sm text-gray-700">Total Interactions</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-900">
              {assignment.workloadScore?.toFixed(1) || 'N/A'}
            </div>
            <div className="text-sm text-yellow-700">Workload Score</div>
          </div>
          
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-900">
              {assignment.capacityUtilization?.toFixed(1) || 'N/A'}%
            </div>
            <div className="text-sm text-indigo-700">Capacity Utilization</div>
          </div>
        </div>
      </Card>
    );
  };

  // Render assignment history
  const renderAssignmentHistory = () => {
    if (!assignment || !showHistory) return null;
    
    const history = assignment.history || [];
    
    return (
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment History</h2>
        
        {history.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No history available for this assignment
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(item.user?.name || item.user?.email || 'System').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {item.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(item.timestamp)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    By: {item.user?.name || item.user?.email || 'System'}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  // Render actions
  const renderActions = () => {
    if (!assignment || !showActions) return null;
    
    return (
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowTransferModal(true)}
            disabled={assignment.status === 'completed'}
          >
            Transfer Assignment
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowEscalateModal(true)}
            disabled={assignment.status === 'completed'}
          >
            Escalate Assignment
          </Button>
          
          <Button
            variant="success"
            onClick={() => setShowCompleteModal(true)}
            disabled={assignment.status === 'completed'}
          >
            Complete Assignment
          </Button>
        </div>
      </Card>
    );
  };

  // Render transfer modal
  const renderTransferModal = () => {
    return (
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Assignment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer To
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={transferData.toAgentId}
              onChange={(e) => setTransferData(prev => ({ ...prev, toAgentId: e.target.value }))}
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>
                  {agent.name || agent.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer Reason
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={3}
              value={transferData.reason}
              onChange={(e) => setTransferData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for transfer..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={transferData.priority}
              onChange={(e) => setTransferData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Keep current priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowTransferModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!transferData.toAgentId || !transferData.reason || updating}
              loading={updating}
            >
              Transfer Assignment
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // Render escalate modal
  const renderEscalateModal = () => {
    return (
      <Modal
        isOpen={showEscalateModal}
        onClose={() => setShowEscalateModal(false)}
        title="Escalate Assignment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escalate To
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={escalateData.toAgentId}
              onChange={(e) => setEscalateData(prev => ({ ...prev, toAgentId: e.target.value }))}
            >
              <option value="">Select an agent</option>
              {agents.map((agent) => (
                <option key={agent._id} value={agent._id}>
                  {agent.name || agent.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Escalation Level
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={escalateData.level}
              onChange={(e) => setEscalateData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
            >
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowEscalateModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEscalate}
              disabled={!escalateData.toAgentId || updating}
              loading={updating}
            >
              Escalate Assignment
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // Render complete modal
  const renderCompleteModal = () => {
    return (
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Assignment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Reason
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={3}
              value={completeData.completionReason}
              onChange={(e) => setCompleteData(prev => ({ ...prev, completionReason: e.target.value }))}
              placeholder="Reason for completion..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satisfaction Score
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center
                    ${completeData.satisfactionScore >= score
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-400 hover:border-gray-400'
                    }
                  `}
                  onClick={() => setCompleteData(prev => ({ ...prev, satisfactionScore: score }))}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={3}
              value={completeData.notes}
              onChange={(e) => setCompleteData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowCompleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!completeData.completionReason || updating}
              loading={updating}
            >
              Complete Assignment
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className={`assignment-details ${className}`}>
      {/* Loading state */}
      {loading && <Loading className="my-8" />}
      
      {/* Error state */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Error loading assignment details</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchAssignment}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}
      
      {/* Assignment content */}
      {!loading && !error && assignment && (
        <>
          {renderHeader()}
          {renderAssignmentInfo()}
          {renderPerformanceMetrics()}
          {renderAssignmentHistory()}
          {renderActions()}
        </>
      )}
      
      {/* Modals */}
      {renderTransferModal()}
      {renderEscalateModal()}
      {renderCompleteModal()}
    </div>
  );
};

export default AssignmentDetails;