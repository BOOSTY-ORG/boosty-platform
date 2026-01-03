import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES
} from '../../api/notificationConstants.js';

/**
 * Enhanced Notification component with various types, auto-dismiss functionality,
 * and support for new notification system features
 */
const Notification = ({
  type = NOTIFICATION_TYPES.INFO,
  title,
  message,
  show = true,
  autoClose = false,
  duration = 5000,
  onClose,
  onClick,
  className = '',
  priority = NOTIFICATION_PRIORITIES.NORMAL,
  read = false,
  timestamp,
  actionUrl,
  actionText,
  ...props
}) => {
  const [visible, setVisible] = useState(show);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  
  useEffect(() => {
    setVisible(show);
  }, [show]);
  
  useEffect(() => {
    if (visible && autoClose && duration > 0) {
      const startTime = Date.now();
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const progressPercent = (remaining / duration) * 100;
        
        setProgress(progressPercent);
        
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
      setProgress(100);
    }
  }, [visible, autoClose, duration]);
  
  const handleClose = () => {
    setVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onClose) {
      onClose();
    }
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    if (actionUrl) {
      window.open(actionUrl, '_blank');
    }
  };
  
  if (!visible) return null;
  
  // Enhanced type classes with better visual hierarchy
  const typeClasses = {
    [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    [NOTIFICATION_TYPES.ERROR]: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    [NOTIFICATION_TYPES.INFO]: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    [NOTIFICATION_TYPES.MESSAGE]: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200',
    [NOTIFICATION_TYPES.TASK]: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200',
    [NOTIFICATION_TYPES.SYSTEM]: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200',
    [NOTIFICATION_TYPES.PAYMENT]: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200',
    [NOTIFICATION_TYPES.KYC]: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200',
    [NOTIFICATION_TYPES.INVESTMENT]: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-200',
    [NOTIFICATION_TYPES.CRM]: 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-200',
  };
  
  // Icon classes for better visual consistency
  const iconClasses = {
    [NOTIFICATION_TYPES.SUCCESS]: 'text-green-500 dark:text-green-400',
    [NOTIFICATION_TYPES.ERROR]: 'text-red-500 dark:text-red-400',
    [NOTIFICATION_TYPES.WARNING]: 'text-yellow-500 dark:text-yellow-400',
    [NOTIFICATION_TYPES.INFO]: 'text-blue-500 dark:text-blue-400',
    [NOTIFICATION_TYPES.MESSAGE]: 'text-purple-500 dark:text-purple-400',
    [NOTIFICATION_TYPES.TASK]: 'text-indigo-500 dark:text-indigo-400',
    [NOTIFICATION_TYPES.SYSTEM]: 'text-gray-500 dark:text-gray-400',
    [NOTIFICATION_TYPES.PAYMENT]: 'text-emerald-500 dark:text-emerald-400',
    [NOTIFICATION_TYPES.KYC]: 'text-orange-500 dark:text-orange-400',
    [NOTIFICATION_TYPES.INVESTMENT]: 'text-cyan-500 dark:text-cyan-400',
    [NOTIFICATION_TYPES.CRM]: 'text-pink-500 dark:text-pink-400',
  };
  
  // Priority styling
  const priorityClasses = {
    [NOTIFICATION_PRIORITIES.LOW]: 'border-l-4',
    [NOTIFICATION_PRIORITIES.NORMAL]: 'border-l-4',
    [NOTIFICATION_PRIORITIES.HIGH]: 'border-l-8 shadow-lg',
    [NOTIFICATION_PRIORITIES.URGENT]: 'border-l-8 shadow-xl animate-pulse',
    [NOTIFICATION_PRIORITIES.CRITICAL]: 'border-l-8 shadow-2xl animate-pulse ring-2 ring-red-500 ring-opacity-50',
  };
  
  // Render appropriate icon based on type
  const renderIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.ERROR:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.WARNING:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.MESSAGE:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case NOTIFICATION_TYPES.TASK:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100 4h2a1 1 0 100 2 2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.PAYMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.KYC:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.INVESTMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
        );
      case NOTIFICATION_TYPES.CRM:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        );
      case NOTIFICATION_TYPES.SYSTEM:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      case NOTIFICATION_TYPES.INFO:
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
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
  
  return (
    <div
      className={`
        relative rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${typeClasses[type]}
        ${priorityClasses[priority]}
        ${read ? 'opacity-75' : ''}
        ${className}
      `}
      onClick={handleClick}
      role="alert"
      aria-live={priority === NOTIFICATION_PRIORITIES.CRITICAL ? 'assertive' : 'polite'}
      {...props}
    >
      {/* Progress bar for auto-dismiss notifications */}
      {autoClose && duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      <div className="flex">
        <div className={`flex-shrink-0 ${iconClasses[type]}`}>
          {renderIcon()}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`text-sm font-medium truncate ${read ? 'font-normal' : ''}`}>
                  {title}
                </h3>
              )}
              <div className={`text-sm mt-1 ${read ? 'opacity-75' : ''}`}>
                {message}
              </div>
              
              {/* Action button */}
              {actionUrl && actionText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(actionUrl, '_blank');
                  }}
                  className={`mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded ${iconClasses[type]}`}
                >
                  {actionText}
                </button>
              )}
            </div>
            
            {/* Timestamp */}
            {timestamp && (
              <div className="ml-2 flex-shrink-0 text-xs opacity-60">
                {formatTimestamp(timestamp)}
              </div>
            )}
          </div>
        </div>
        
        <div className="ml-auto pl-3 flex-shrink-0">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className={`
                inline-flex rounded-md p-1.5 transition-colors duration-200
                hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${typeClasses[type]}
              `}
              aria-label="Dismiss notification"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Unread indicator */}
      {!read && (
        <div className="absolute top-2 right-2 h-2 w-2 bg-current rounded-full" />
      )}
    </div>
  );
};

Notification.propTypes = {
  type: PropTypes.oneOf(Object.values(NOTIFICATION_TYPES)),
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  show: PropTypes.bool,
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  onClose: PropTypes.func,
  onClick: PropTypes.func,
  className: PropTypes.string,
  priority: PropTypes.oneOf(Object.values(NOTIFICATION_PRIORITIES)),
  read: PropTypes.bool,
  timestamp: PropTypes.string,
  actionUrl: PropTypes.string,
  actionText: PropTypes.string,
};

export default Notification;