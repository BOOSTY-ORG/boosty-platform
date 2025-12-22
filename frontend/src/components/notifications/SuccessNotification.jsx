import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../../api/notificationConstants.js';
import './SuccessNotification.css';

/**
 * Success types for different achievement categories
 */
export const SUCCESS_TYPES = {
  FORM_SUBMISSION: 'form_submission',
  FILE_UPLOAD: 'file_upload',
  TASK_COMPLETION: 'task_completion',
  PAYMENT: 'payment',
  REGISTRATION: 'registration',
  UPDATE: 'update',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
};

/**
 * Success levels for different importance levels
 */
export const SUCCESS_LEVELS = {
  INFO: 'info',
  SUCCESS: 'success',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
};

/**
 * Specialized SuccessNotification component for handling success notifications
 * with rich features like celebrations, tracking, and quick actions
 */
const SuccessNotification = ({
  id,
  type = SUCCESS_TYPES.FORM_SUBMISSION,
  level = SUCCESS_LEVELS.SUCCESS,
  title,
  message,
  details,
  timestamp,
  read = false,
  autoClose = false,
  duration = 5000,
  persistent = false,
  progress,
  achievement,
  relatedActions = [],
  nextSteps = [],
  analytics = null,
  onClose,
  onShare,
  onViewDetails,
  onContinue,
  onSave,
  onTrack,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [progressBar, setProgressBar] = useState(100);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const intervalRef = useRef(null);

  // Auto-dismiss functionality
  useEffect(() => {
    if (visible && autoClose && duration > 0 && !persistent) {
      const startTime = Date.now();
      
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
      setProgressBar(100);
    }
  }, [visible, autoClose, duration, persistent]);

  // Trigger celebration animation for achievements and milestones
  useEffect(() => {
    if (level === SUCCESS_LEVELS.ACHIEVEMENT || level === SUCCESS_LEVELS.MILESTONE) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [level]);

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

  // Handle share success
  const handleShare = useCallback((e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(id, { type, level, title, message, achievement });
    }
  }, [id, type, level, title, message, achievement, onShare]);

  // Handle view details
  const handleViewDetails = useCallback((e) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(id);
    }
  }, [id, onViewDetails]);

  // Handle continue workflow
  const handleContinue = useCallback((e) => {
    e.stopPropagation();
    if (onContinue) {
      onContinue(id);
    }
  }, [id, onContinue]);

  // Handle save success
  const handleSave = useCallback((e) => {
    e.stopPropagation();
    if (onSave) {
      onSave(id);
    }
  }, [id, onSave]);

  // Handle track analytics
  const handleTrack = useCallback((action) => {
    if (onTrack) {
      onTrack(id, action, { type, level, achievement, analytics });
    }
  }, [id, type, level, achievement, analytics, onTrack]);

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

  // Render success type icon
  const renderSuccessTypeIcon = () => {
    switch (type) {
      case SUCCESS_TYPES.FORM_SUBMISSION:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
        );
      case SUCCESS_TYPES.FILE_UPLOAD:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case SUCCESS_TYPES.TASK_COMPLETION:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case SUCCESS_TYPES.PAYMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        );
      case SUCCESS_TYPES.REGISTRATION:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
        );
      case SUCCESS_TYPES.UPDATE:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case SUCCESS_TYPES.ACHIEVEMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case SUCCESS_TYPES.MILESTONE:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Render level indicator
  const renderLevelIndicator = () => {
    const levelConfig = {
      [SUCCESS_LEVELS.INFO]: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: (
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        ),
      },
      [SUCCESS_LEVELS.SUCCESS]: {
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        ),
      },
      [SUCCESS_LEVELS.ACHIEVEMENT]: {
        color: 'text-purple-500',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        icon: (
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        ),
      },
      [SUCCESS_LEVELS.MILESTONE]: {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        icon: (
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
        ),
      },
    };

    const config = levelConfig[level] || levelConfig[SUCCESS_LEVELS.SUCCESS];

    return (
      <div className={`flex items-center ${config.color} ${config.bgColor} ${config.borderColor} border px-2 py-1 rounded-full text-xs font-medium`}>
        <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          {config.icon}
        </svg>
        {level}
      </div>
    );
  };

  // Render progress indicator
  const renderProgressIndicator = () => {
    if (!progress) return null;
    
    return (
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-medium">{progress.current}/{progress.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
        {progress.label && (
          <div className="text-xs text-gray-500 mt-1">{progress.label}</div>
        )}
      </div>
    );
  };

  // Render achievement badge
  const renderAchievementBadge = () => {
    if (!achievement) return null;
    
    return (
      <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-yellow-50 border border-purple-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full flex items-center justify-center text-white">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-gray-900">{achievement.title}</h4>
            <p className="text-xs text-gray-600">{achievement.description}</p>
            {achievement.points && (
              <div className="text-xs text-purple-600 font-medium mt-1">
                +{achievement.points} points
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render related actions
  const renderRelatedActions = () => {
    if (relatedActions.length === 0) return null;
    
    return (
      <div className="mt-3">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Related Actions</h5>
        <div className="space-y-1">
          {relatedActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                handleTrack('related_action_clicked');
                if (action.onClick) action.onClick();
              }}
              className="w-full text-left px-2 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render next steps
  const renderNextSteps = () => {
    if (nextSteps.length === 0) return null;
    
    return (
      <div className="mt-3">
        <h5 className="text-xs font-medium text-gray-700 mb-2">Next Steps</h5>
        <ol className="space-y-1">
          {nextSteps.map((step, index) => (
            <li key={index} className="flex items-start text-xs text-gray-600">
              <span className="flex-shrink-0 w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 mt-0.5">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  // Get success type styling
  const getSuccessTypeClasses = () => {
    switch (type) {
      case SUCCESS_TYPES.FORM_SUBMISSION:
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case SUCCESS_TYPES.FILE_UPLOAD:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case SUCCESS_TYPES.TASK_COMPLETION:
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200';
      case SUCCESS_TYPES.PAYMENT:
        return 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200';
      case SUCCESS_TYPES.REGISTRATION:
        return 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200';
      case SUCCESS_TYPES.UPDATE:
        return 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-200';
      case SUCCESS_TYPES.ACHIEVEMENT:
        return 'bg-gradient-to-r from-purple-50 to-yellow-50 border-purple-200 text-purple-800 dark:from-purple-900/20 dark:to-yellow-900/20 dark:border-purple-800 dark:text-purple-200';
      case SUCCESS_TYPES.MILESTONE:
        return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-yellow-800 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
    }
  };

  // Get level styling
  const getLevelClasses = () => {
    switch (level) {
      case SUCCESS_LEVELS.INFO:
        return 'border-l-4';
      case SUCCESS_LEVELS.SUCCESS:
        return 'border-l-4';
      case SUCCESS_LEVELS.ACHIEVEMENT:
        return 'border-l-8 shadow-lg';
      case SUCCESS_LEVELS.MILESTONE:
        return 'border-l-8 shadow-xl';
      default:
        return 'border-l-4';
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`
        relative rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${getSuccessTypeClasses()}
        ${getLevelClasses()}
        ${read ? 'opacity-75' : ''}
        ${isCelebrating ? 'celebration-animation' : ''}
        ${className}
      `}
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setShowQuickActions(true)}
      onMouseLeave={() => setShowQuickActions(false)}
      {...props}
    >
      {/* Progress bar for auto-dismiss notifications */}
      {autoClose && duration > 0 && !persistent && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{ width: `${progressBar}%` }}
          />
        </div>
      )}

      {/* Celebration particles */}
      {isCelebrating && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          <div className="celebration-particles" />
        </div>
      )}

      <div className="flex">
        {/* Success type icon */}
        <div className="flex-shrink-0 mr-3 text-green-500 dark:text-green-400">
          {renderSuccessTypeIcon()}
        </div>

        {/* Success content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title and level */}
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-sm font-medium truncate ${read ? 'font-normal' : ''}`}>
                  {title || 'Success!'}
                </h3>
                {renderLevelIndicator()}
              </div>

              {/* Message */}
              <div className={`text-sm mb-2 ${read ? 'opacity-75' : ''}`}>
                {message}
              </div>

              {/* Timestamp */}
              {timestamp && (
                <div className="text-xs text-gray-500 mb-2">
                  {formatTimestamp(timestamp)}
                </div>
              )}

              {/* Expandable details */}
              {details && (
                <div className="mb-2">
                  <button
                    onClick={() => {
                      setShowDetails(!showDetails);
                      handleTrack('details_toggled');
                    }}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                  {showDetails && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-700">
                      {details}
                    </div>
                  )}
                </div>
              )}

              {/* Progress indicator */}
              {renderProgressIndicator()}

              {/* Achievement badge */}
              {renderAchievementBadge()}

              {/* Related actions */}
              {renderRelatedActions()}

              {/* Next steps */}
              {renderNextSteps()}
            </div>
          </div>

          {/* Quick actions */}
          <div className={`flex items-center justify-end mt-3 space-x-2 transition-opacity duration-200 ${showQuickActions ? 'opacity-100' : 'opacity-60'}`}>
            {onShare && (
              <button
                onClick={handleShare}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Share success"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
              </button>
            )}

            {onViewDetails && (
              <button
                onClick={handleViewDetails}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="View details"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {onContinue && (
              <button
                onClick={handleContinue}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Continue"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}

            {onSave && !persistent && (
              <button
                onClick={handleSave}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Save success"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>
            )}

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
        <div className="absolute top-2 right-2 h-2 w-2 bg-green-500 rounded-full" />
      )}
    </div>
  );
};

SuccessNotification.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(Object.values(SUCCESS_TYPES)),
  level: PropTypes.oneOf(Object.values(SUCCESS_LEVELS)),
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  details: PropTypes.string,
  timestamp: PropTypes.string,
  read: PropTypes.bool,
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  persistent: PropTypes.bool,
  progress: PropTypes.shape({
    current: PropTypes.number,
    total: PropTypes.number,
    label: PropTypes.string,
  }),
  achievement: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    points: PropTypes.number,
    badge: PropTypes.string,
  }),
  relatedActions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })),
  nextSteps: PropTypes.arrayOf(PropTypes.string),
  analytics: PropTypes.shape({
    category: PropTypes.string,
    action: PropTypes.string,
    label: PropTypes.string,
    value: PropTypes.number,
  }),
  onClose: PropTypes.func,
  onShare: PropTypes.func,
  onViewDetails: PropTypes.func,
  onContinue: PropTypes.func,
  onSave: PropTypes.func,
  onTrack: PropTypes.func,
  className: PropTypes.string,
};

export default SuccessNotification;