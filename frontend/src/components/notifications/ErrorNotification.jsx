import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../../api/notificationConstants.js';
import './ErrorNotification.css';

/**
 * Error types for different categories of errors
 */
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  SYSTEM: 'system',
  API: 'api',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  TIMEOUT: 'timeout',
  PAYMENT: 'payment',
  FILE_UPLOAD: 'file_upload',
  UNKNOWN: 'unknown',
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Error categories for filtering and organization
 */
export const ERROR_CATEGORIES = {
  USER_INPUT: 'user_input',
  SYSTEM_FAILURE: 'system_failure',
  COMMUNICATION: 'communication',
  DATA_INTEGRITY: 'data_integrity',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  BUSINESS_LOGIC: 'business_logic',
};

/**
 * Specialized ErrorNotification component for handling error and warning notifications
 * with rich features like error details, stack traces, quick actions, and recovery suggestions
 */
const ErrorNotification = ({
  id,
  type = ERROR_TYPES.UNKNOWN,
  severity = ERROR_SEVERITY.ERROR,
  category = ERROR_CATEGORIES.SYSTEM_FAILURE,
  title,
  message,
  errorCode,
  timestamp,
  read = false,
  autoClose = false,
  duration = 8000,
  details = null,
  stackTrace = null,
  context = {},
  recoverySuggestions = [],
  affectedComponents = [],
  userAction = null,
  persist = false,
  onClose,
  onRetry,
  onReportIssue,
  onGetHelp,
  onViewLogs,
  onMarkAsRead,
  onDelete,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [showStackTrace, setShowStackTrace] = useState(false);
  const [progress, setProgress] = useState(100);
  const [reportingIssue, setReportingIssue] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const intervalRef = useRef(null);

  // Auto-dismiss functionality (only for non-critical errors)
  useEffect(() => {
    if (visible && autoClose && duration > 0 && severity !== ERROR_SEVERITY.CRITICAL) {
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
  }, [visible, autoClose, duration, severity]);

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

  // Handle mark as read
  const handleMarkAsRead = useCallback((e) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  }, [id, onMarkAsRead]);

  // Handle retry action
  const handleRetry = useCallback(async (e) => {
    e.stopPropagation();
    if (onRetry && !retrying) {
      setRetrying(true);
      try {
        await onRetry(id, context);
      } finally {
        setRetrying(false);
      }
    }
  }, [id, onRetry, context, retrying]);

  // Handle report issue
  const handleReportIssue = useCallback(async (e) => {
    e.stopPropagation();
    if (onReportIssue && !reportingIssue) {
      setReportingIssue(true);
      try {
        await onReportIssue(id, {
          type,
          severity,
          category,
          title,
          message,
          errorCode,
          details,
          stackTrace,
          context,
          timestamp,
        });
      } finally {
        setReportingIssue(false);
      }
    }
  }, [id, onReportIssue, type, severity, category, title, message, errorCode, details, stackTrace, context, timestamp]);

  // Handle get help
  const handleGetHelp = useCallback((e) => {
    e.stopPropagation();
    if (onGetHelp) {
      onGetHelp(id, { type, category, errorCode });
    }
  }, [id, onGetHelp, type, category, errorCode]);

  // Handle view logs
  const handleViewLogs = useCallback((e) => {
    e.stopPropagation();
    if (onViewLogs) {
      onViewLogs(id, { errorCode, timestamp, context });
    }
  }, [id, onViewLogs, errorCode, timestamp, context]);

  // Handle delete
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  }, [id, onDelete]);

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

  // Render error type icon
  const renderErrorTypeIcon = () => {
    switch (type) {
      case ERROR_TYPES.VALIDATION:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.NETWORK:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.SYSTEM:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.API:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.AUTHENTICATION:
      case ERROR_TYPES.AUTHORIZATION:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.DATABASE:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
        );
      case ERROR_TYPES.TIMEOUT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.PAYMENT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
        );
      case ERROR_TYPES.FILE_UPLOAD:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Render severity indicator
  const renderSeverityIndicator = () => {
    const severityConfig = {
      [ERROR_SEVERITY.INFO]: {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
      },
      [ERROR_SEVERITY.WARNING]: {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
      },
      [ERROR_SEVERITY.ERROR]: {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
      },
      [ERROR_SEVERITY.CRITICAL]: {
        bgColor: 'bg-red-200',
        textColor: 'text-red-900',
        borderColor: 'border-red-300',
      },
    };

    const config = severityConfig[severity] || severityConfig[ERROR_SEVERITY.ERROR];

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} border`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  // Get error type styling
  const getErrorTypeClasses = () => {
    const baseClasses = {
      [ERROR_TYPES.VALIDATION]: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
      [ERROR_TYPES.NETWORK]: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200',
      [ERROR_TYPES.SYSTEM]: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      [ERROR_TYPES.API]: 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200',
      [ERROR_TYPES.AUTHENTICATION]: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-200',
      [ERROR_TYPES.AUTHORIZATION]: 'bg-pink-50 border-pink-200 text-pink-800 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-200',
      [ERROR_TYPES.DATABASE]: 'bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-900/20 dark:border-cyan-800 dark:text-cyan-200',
      [ERROR_TYPES.TIMEOUT]: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
      [ERROR_TYPES.PAYMENT]: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200',
      [ERROR_TYPES.FILE_UPLOAD]: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-200',
      [ERROR_TYPES.UNKNOWN]: 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200',
    };

    return baseClasses[type] || baseClasses[ERROR_TYPES.UNKNOWN];
  };

  // Get priority styling based on severity
  const getSeverityClasses = () => {
    switch (severity) {
      case ERROR_SEVERITY.INFO:
        return 'border-l-4';
      case ERROR_SEVERITY.WARNING:
        return 'border-l-4';
      case ERROR_SEVERITY.ERROR:
        return 'border-l-8 shadow-lg';
      case ERROR_SEVERITY.CRITICAL:
        return 'border-l-8 shadow-xl animate-pulse ring-2 ring-red-500 ring-opacity-50';
      default:
        return 'border-l-4';
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`
        relative rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${getErrorTypeClasses()}
        ${getSeverityClasses()}
        ${read ? 'opacity-75' : ''}
        ${className}
      `}
      role="alert"
      aria-live={severity === ERROR_SEVERITY.CRITICAL ? 'assertive' : 'polite'}
      {...props}
    >
      {/* Progress bar for auto-dismiss notifications */}
      {autoClose && duration > 0 && severity !== ERROR_SEVERITY.CRITICAL && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex">
        {/* Error type icon */}
        <div className="flex-shrink-0 mr-3">
          <div className="text-red-500 dark:text-red-400">
            {renderErrorTypeIcon()}
          </div>
        </div>

        {/* Error content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Header with title, severity, and timestamp */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {title && (
                    <h3 className={`text-sm font-medium truncate ${read ? 'font-normal' : ''}`}>
                      {title}
                    </h3>
                  )}
                  {errorCode && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {errorCode}
                    </span>
                  )}
                  {renderSeverityIndicator()}
                </div>
                <div className="flex items-center text-xs text-gray-500 ml-2">
                  {formatTimestamp(timestamp)}
                </div>
              </div>

              {/* Error message */}
              <div className={`text-sm mb-3 ${read ? 'opacity-75' : ''}`}>
                {message}
              </div>

              {/* User action context */}
              {userAction && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Action:</span> {userAction}
                </div>
              )}

              {/* Affected components */}
              {affectedComponents && affectedComponents.length > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Affected:</span> {affectedComponents.join(', ')}
                </div>
              )}

              {/* Recovery suggestions */}
              {recoverySuggestions && recoverySuggestions.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Suggested solutions:</h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {recoverySuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expandable details section */}
              {(details || stackTrace || context) && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    {showDetails ? 'Hide details' : 'Show details'}
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                      {/* Error details */}
                      {details && (
                        <div className="mb-2">
                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Details:</h5>
                          <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">{details}</pre>
                        </div>
                      )}

                      {/* Context information */}
                      {context && Object.keys(context).length > 0 && (
                        <div className="mb-2">
                          <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Context:</h5>
                          <div className="space-y-1">
                            {Object.entries(context).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span className="font-medium text-gray-600 dark:text-gray-400 mr-2">{key}:</span>
                                <span className="text-gray-600 dark:text-gray-400">{JSON.stringify(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stack trace */}
                      {stackTrace && (
                        <div className="mb-2">
                          <button
                            onClick={() => setShowStackTrace(!showStackTrace)}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline mb-1"
                          >
                            {showStackTrace ? 'Hide stack trace' : 'Show stack trace'}
                          </button>
                          {showStackTrace && (
                            <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 font-mono text-xs overflow-x-auto">
                              {stackTrace}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap items-center gap-2">
                {onRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {retrying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Retry
                      </>
                    )}
                  </button>
                )}

                {onReportIssue && (
                  <button
                    onClick={handleReportIssue}
                    disabled={reportingIssue}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reportingIssue ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Reporting...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
                        </svg>
                        Report Issue
                      </>
                    )}
                  </button>
                )}

                {onGetHelp && (
                  <button
                    onClick={handleGetHelp}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Get Help
                  </button>
                )}

                {onViewLogs && (
                  <button
                    onClick={handleViewLogs}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    View Logs
                  </button>
                )}

                {!read && onMarkAsRead && (
                  <button
                    onClick={handleMarkAsRead}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Mark as Read
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="ml-auto pl-3 flex-shrink-0">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="inline-flex rounded-md p-1.5 transition-colors duration-200 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2"
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

ErrorNotification.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(Object.values(ERROR_TYPES)),
  severity: PropTypes.oneOf(Object.values(ERROR_SEVERITY)),
  category: PropTypes.oneOf(Object.values(ERROR_CATEGORIES)),
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  errorCode: PropTypes.string,
  timestamp: PropTypes.string,
  read: PropTypes.bool,
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  details: PropTypes.string,
  stackTrace: PropTypes.string,
  context: PropTypes.object,
  recoverySuggestions: PropTypes.arrayOf(PropTypes.string),
  affectedComponents: PropTypes.arrayOf(PropTypes.string),
  userAction: PropTypes.string,
  persist: PropTypes.bool,
  onClose: PropTypes.func,
  onRetry: PropTypes.func,
  onReportIssue: PropTypes.func,
  onGetHelp: PropTypes.func,
  onViewLogs: PropTypes.func,
  onMarkAsRead: PropTypes.func,
  onDelete: PropTypes.func,
  className: PropTypes.string,
};

export default ErrorNotification;