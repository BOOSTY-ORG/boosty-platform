import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../../api/notificationConstants.js';
import './TaskNotification.css';

/**
 * Task types for different task categories
 */
export const TASK_TYPES = {
  ASSIGNMENT: 'assignment',
  REVIEW: 'review',
  APPROVAL: 'approval',
  DEADLINE: 'deadline',
  REMINDER: 'reminder',
};

/**
 * Task status indicators
 */
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on-hold',
};

/**
 * Task priority levels
 */
export const TASK_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Specialized TaskNotification component for handling task notifications
 * with rich features like progress tracking, dependencies, and quick actions
 */
const TaskNotification = ({
  id,
  type = TASK_TYPES.ASSIGNMENT,
  title,
  description,
  assignee,
  creator,
  status = TASK_STATUS.PENDING,
  priority = TASK_PRIORITY.NORMAL,
  dueDate,
  createdAt,
  completedAt,
  progress = 0,
  dependencies = [],
  blockingTasks = [],
  tags = [],
  estimatedHours,
  actualHours,
  autoClose = false,
  duration = 8000,
  read = false,
  onClose,
  onViewTask,
  onMarkComplete,
  onReassign,
  onSnooze,
  onUpdateStatus,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressBar, setProgressBar] = useState(progress);
  const intervalRef = useRef(null);

  // Auto-dismiss functionality
  useEffect(() => {
    if (visible && autoClose && duration > 0) {
      const startTime = Date.now();
      let currentProgress = progress;
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const progressPercent = (remaining / duration) * 100;
        
        setProgressBar(progressPercent);
        
        if (remaining <= 0) {
          handleClose();
        }
      }, 50);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setProgressBar(progress);
    }
  }, [visible, autoClose, duration, progress]);

  // Handle notification close
  const handleClose = useCallback(() => {
    setVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onClose) {
      onClose(id);
    }
  }, [id, onClose]);

  // Handle view task
  const handleViewTask = useCallback((e) => {
    e.stopPropagation();
    if (onViewTask) {
      onViewTask(id);
    }
  }, [id, onViewTask]);

  // Handle mark complete
  const handleMarkComplete = useCallback(async (e) => {
    e.stopPropagation();
    if (onMarkComplete && !isUpdating) {
      setIsUpdating(true);
      try {
        await onMarkComplete(id);
      } catch (error) {
        console.error('Failed to mark task as complete:', error);
      } finally {
        setIsUpdating(false);
      }
    }
  }, [id, onMarkComplete, isUpdating]);

  // Handle reassign
  const handleReassign = useCallback((e) => {
    e.stopPropagation();
    if (onReassign) {
      onReassign(id);
    }
  }, [id, onReassign]);

  // Handle snooze
  const handleSnooze = useCallback((e) => {
    e.stopPropagation();
    if (onSnooze) {
      onSnooze(id);
    }
  }, [id, onSnooze]);

  // Handle status update
  const handleStatusUpdate = useCallback((newStatus) => {
    if (onUpdateStatus && !isUpdating) {
      setIsUpdating(true);
      onUpdateStatus(id, newStatus)
        .catch(error => {
          console.error('Failed to update task status:', error);
        })
        .finally(() => {
          setIsUpdating(false);
        });
    }
  }, [id, onUpdateStatus, isUpdating]);

  // Format timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Calculate time remaining
  const getTimeRemaining = (due) => {
    if (!due) return null;
    
    const now = new Date();
    const dueDate = new Date(due);
    const diffMs = dueDate - now;
    
    if (diffMs < 0) {
      return { text: 'Overdue', isOverdue: true };
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return { text: `${diffDays}d ${diffHours}h remaining`, isOverdue: false };
    } else if (diffHours > 0) {
      return { text: `${diffHours}h remaining`, isOverdue: false };
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return { text: `${diffMinutes}m remaining`, isOverdue: false };
    }
  };

  // Render task type icon
  const renderTaskTypeIcon = () => {
    switch (type) {
      case TASK_TYPES.ASSIGNMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
        );
      case TASK_TYPES.REVIEW:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case TASK_TYPES.APPROVAL:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case TASK_TYPES.DEADLINE:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case TASK_TYPES.REMINDER:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    const statusConfig = {
      [TASK_STATUS.PENDING]: {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        ),
      },
      [TASK_STATUS.IN_PROGRESS]: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        icon: (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        ),
      },
      [TASK_STATUS.COMPLETED]: {
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        icon: (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        ),
      },
      [TASK_STATUS.CANCELLED]: {
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        icon: (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        ),
      },
      [TASK_STATUS.ON_HOLD]: {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        icon: (
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        ),
      },
    };

    const config = statusConfig[status] || statusConfig[TASK_STATUS.PENDING];

    return (
      <div className={`flex items-center ${config.color} ${config.bgColor} px-2 py-1 rounded-full text-xs font-medium`}>
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          {config.icon}
        </svg>
        {status.replace('-', ' ')}
      </div>
    );
  };

  // Render priority indicator
  const renderPriorityIndicator = () => {
    const priorityConfig = {
      [TASK_PRIORITY.LOW]: {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
      },
      [TASK_PRIORITY.NORMAL]: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
      },
      [TASK_PRIORITY.HIGH]: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-300',
      },
      [TASK_PRIORITY.CRITICAL]: {
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
      },
    };

    const config = priorityConfig[priority] || priorityConfig[TASK_PRIORITY.NORMAL];

    return (
      <div className={`flex items-center ${config.color} ${config.bgColor} ${config.borderColor} border px-2 py-1 rounded-full text-xs font-medium`}>
        <div className={`h-2 w-2 rounded-full ${config.color.replace('text', 'bg')} mr-1`} />
        {priority}
      </div>
    );
  };

  // Render progress bar
  const renderProgressBar = () => {
    if (status === TASK_STATUS.COMPLETED) return null;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            progress >= 80 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : progress >= 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // Render assignee avatar
  const renderAssigneeAvatar = () => {
    if (!assignee) return null;
    
    if (assignee.avatar) {
      return (
        <img
          src={assignee.avatar}
          alt={assignee.name}
          className="h-8 w-8 rounded-full object-cover"
        />
      );
    }
    
    // Default avatar with initials
    const initials = assignee.name
      ? assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : 'U';
    
    return (
      <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium text-sm">
        {initials}
      </div>
    );
  };

  // Render dependencies
  const renderDependencies = () => {
    if (dependencies.length === 0 && blockingTasks.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {dependencies.length > 0 && (
          <div className="flex items-center text-xs text-gray-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Depends on {dependencies.length} task{dependencies.length > 1 ? 's' : ''}
          </div>
        )}
        {blockingTasks.length > 0 && (
          <div className="flex items-center text-xs text-gray-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Blocking {blockingTasks.length} task{blockingTasks.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  };

  // Render tags
  const renderTags = () => {
    if (tags.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  // Get task type styling
  const getTaskTypeClasses = () => {
    switch (type) {
      case TASK_TYPES.ASSIGNMENT:
        return 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200';
      case TASK_TYPES.REVIEW:
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200';
      case TASK_TYPES.APPROVAL:
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case TASK_TYPES.DEADLINE:
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case TASK_TYPES.REMINDER:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  // Get priority styling
  const getPriorityClasses = () => {
    switch (priority) {
      case TASK_PRIORITY.LOW:
        return 'border-l-4';
      case TASK_PRIORITY.NORMAL:
        return 'border-l-4';
      case TASK_PRIORITY.HIGH:
        return 'border-l-8 shadow-lg';
      case TASK_PRIORITY.CRITICAL:
        return 'border-l-8 shadow-lg animate-pulse';
      default:
        return 'border-l-4';
    }
  };

  if (!visible) return null;

  const timeRemaining = getTimeRemaining(dueDate);

  return (
    <div
      className={`
        relative rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${getTaskTypeClasses()}
        ${getPriorityClasses()}
        ${read ? 'opacity-75' : ''}
        ${className}
      `}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {/* Progress bar for auto-dismiss notifications */}
      {autoClose && duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{ width: `${progressBar}%` }}
          />
        </div>
      )}

      <div className="flex">
        {/* Task type icon */}
        <div className="flex-shrink-0 mr-3 text-indigo-500 dark:text-indigo-400">
          {renderTaskTypeIcon()}
        </div>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title and status */}
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium truncate ${read ? 'font-normal' : ''}`}>
                  {title || 'Untitled Task'}
                </h3>
                {renderStatusIndicator()}
              </div>

              {/* Description */}
              {description && (
                <div className={`text-sm mb-2 ${read ? 'opacity-75' : ''}`}>
                  {showDetails ? description : description.substring(0, 100) + (description.length > 100 ? '...' : '')}
                  {description.length > 100 && (
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="ml-1 text-indigo-600 hover:text-indigo-800 underline text-xs"
                    >
                      {showDetails ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}

              {/* Priority and time info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {renderPriorityIndicator()}
                  {timeRemaining && (
                    <div className={`text-xs ${timeRemaining.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      {timeRemaining.text}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimestamp(createdAt)}
                </div>
              </div>

              {/* Progress bar */}
              {progress > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-medium">{progress}%</span>
                  </div>
                  {renderProgressBar()}
                </div>
              )}

              {/* Assignee and creator */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {assignee && (
                    <div className="flex items-center">
                      {renderAssigneeAvatar()}
                      <div className="ml-2">
                        <div className="text-xs font-medium">{assignee.name}</div>
                        {assignee.role && (
                          <div className="text-xs text-gray-500">{assignee.role}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {creator && (
                  <div className="text-xs text-gray-500">
                    Created by {creator.name}
                  </div>
                )}
              </div>

              {/* Dependencies */}
              {renderDependencies()}

              {/* Tags */}
              {renderTags()}

              {/* Time tracking */}
              {estimatedHours && (
                <div className="mt-2 text-xs text-gray-500">
                  Est: {estimatedHours}h
                  {actualHours && ` | Actual: ${actualHours}h`}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-end mt-3 space-x-2">
            <button
              onClick={handleViewTask}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="View task"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>

            {status !== TASK_STATUS.COMPLETED && (
              <button
                onClick={handleMarkComplete}
                disabled={isUpdating}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                title="Mark as complete"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            <button
              onClick={handleReassign}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Reassign"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </button>

            <button
              onClick={handleSnooze}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Snooze"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Status dropdown */}
            <div className="relative group">
              <button
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Change status"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-1">
                  {Object.values(TASK_STATUS).map((statusOption) => (
                    <button
                      key={statusOption}
                      onClick={() => handleStatusUpdate(statusOption)}
                      disabled={status === statusOption || isUpdating}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {statusOption.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Unread indicator */}
      {!read && (
        <div className="absolute top-2 right-2 h-2 w-2 bg-indigo-500 rounded-full" />
      )}

      {/* Loading overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
    </div>
  );
};

TaskNotification.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(Object.values(TASK_TYPES)),
  title: PropTypes.string,
  description: PropTypes.string,
  assignee: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    avatar: PropTypes.string,
    role: PropTypes.string,
  }),
  creator: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  status: PropTypes.oneOf(Object.values(TASK_STATUS)),
  priority: PropTypes.oneOf(Object.values(TASK_PRIORITY)),
  dueDate: PropTypes.string,
  createdAt: PropTypes.string,
  completedAt: PropTypes.string,
  progress: PropTypes.number,
  dependencies: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string,
  })),
  blockingTasks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string,
  })),
  tags: PropTypes.arrayOf(PropTypes.string),
  estimatedHours: PropTypes.number,
  actualHours: PropTypes.number,
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  read: PropTypes.bool,
  onClose: PropTypes.func,
  onViewTask: PropTypes.func,
  onMarkComplete: PropTypes.func,
  onReassign: PropTypes.func,
  onSnooze: PropTypes.func,
  onUpdateStatus: PropTypes.func,
  className: PropTypes.string,
};

export default TaskNotification;