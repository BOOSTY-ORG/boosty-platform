import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { REALTIME_CONNECTION_TYPES } from '../../api/notificationConstants.js';

/**
 * ConnectionStatus component - Visual indicator for real-time connection status
 * Provides connection health monitoring, reconnection controls, and connection statistics
 * @param {Object} props - Component props
 */
const ConnectionStatus = ({
  isConnected = false,
  isConnecting = false,
  connectionType = REALTIME_CONNECTION_TYPES.SSE,
  lastError = null,
  connectionStats = null,
  onReconnect = null,
  onDisconnect = null,
  onConnectionTypeChange = null,
  showDetails = false,
  compact = false,
  position = 'bottom-right',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [lastConnectedTime, setLastConnectedTime] = useState(null);

  // Update last connected time when connection status changes
  useEffect(() => {
    if (isConnected) {
      setLastConnectedTime(new Date());
    }
  }, [isConnected]);

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  // Connection status colors and icons
  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-300 dark:border-yellow-700',
        textColor: 'text-yellow-800 dark:text-yellow-200',
        icon: (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ),
        text: 'Connecting...',
      };
    }

    if (isConnected) {
      return {
        color: 'green',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        borderColor: 'border-green-300 dark:border-green-700',
        textColor: 'text-green-800 dark:text-green-200',
        icon: (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        text: 'Connected',
      };
    }

    if (lastError) {
      return {
        color: 'red',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        borderColor: 'border-red-300 dark:border-red-700',
        textColor: 'text-red-800 dark:text-red-200',
        icon: (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        text: 'Connection Error',
      };
    }

    return {
      color: 'gray',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20',
      borderColor: 'border-gray-300 dark:border-gray-700',
      textColor: 'text-gray-800 dark:text-gray-200',
      icon: (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
      text: 'Disconnected',
    };
  };

  const statusInfo = getStatusInfo();

  // Format connection duration
  const formatDuration = (startTime) => {
    if (!startTime) return 'Unknown';
    
    const now = new Date();
    const diff = now - startTime;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Handle reconnection
  const handleReconnect = () => {
    if (onReconnect) {
      onReconnect();
    }
  };

  // Handle disconnection
  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  // Handle connection type change
  const handleConnectionTypeChange = (newType) => {
    if (onConnectionTypeChange) {
      onConnectionTypeChange(newType);
    }
  };

  // Compact mode - simple indicator
  if (compact) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
        <div
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg border
            ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor}
            transition-all duration-200 hover:shadow-xl cursor-pointer
          `}
          onClick={() => setIsExpanded(!isExpanded)}
          title={`${statusInfo.text} (${connectionType})`}
        >
          <div className="flex items-center space-x-1">
            {statusInfo.icon}
            <span className="text-xs font-medium">
              {connectionType.toUpperCase()}
            </span>
          </div>
          
          {lastError && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  // Full mode - detailed status
  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-xl border
          ${statusInfo.borderColor} transition-all duration-200
          ${isExpanded ? 'w-80' : 'w-auto'}
        `}
      >
        {/* Header */}
        <div
          className={`
            flex items-center justify-between p-3 rounded-t-lg
            ${statusInfo.bgColor} ${statusInfo.textColor}
          `}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            {statusInfo.icon}
            <span className="font-medium text-sm">{statusInfo.text}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium">
              {connectionType.toUpperCase()}
            </span>
            <button
              className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Connection info */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Connection Type:
                </span>
                <select
                  value={connectionType}
                  onChange={(e) => handleConnectionTypeChange(e.target.value)}
                  className="text-sm border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value={REALTIME_CONNECTION_TYPES.WEBSOCKET}>WebSocket</option>
                  <option value={REALTIME_CONNECTION_TYPES.SSE}>Server-Sent Events</option>
                  <option value={REALTIME_CONNECTION_TYPES.BOTH}>Auto (WebSocket → SSE)</option>
                </select>
              </div>

              {isConnected && lastConnectedTime && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Connected for:
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDuration(lastConnectedTime)}
                  </span>
                </div>
              )}

              {connectionStats && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reconnect Attempts:
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {connectionStats.reconnectAttempts}
                    </span>
                  </div>
                  
                  {connectionStats.queuedMessages > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Queued Messages:
                      </span>
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
                        {connectionStats.queuedMessages}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error display */}
            {lastError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <div className="flex items-start space-x-2">
                  <svg className="h-4 w-4 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Connection Error
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {lastError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex space-x-2">
              {!isConnected && onReconnect && (
                <button
                  onClick={handleReconnect}
                  disabled={isConnecting}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Reconnect'}
                </button>
              )}

              {isConnected && onDisconnect && (
                <button
                  onClick={handleDisconnect}
                  className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            {/* Auto-reconnect toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-reconnect:
              </span>
              <button
                onClick={() => setAutoReconnect(!autoReconnect)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${autoReconnect ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${autoReconnect ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Advanced stats (if showDetails) */}
            {showDetails && connectionStats && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Statistics
                </h4>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>User ID: {connectionStats.userId || 'N/A'}</div>
                  <div>Online: {connectionStats.isOnline ? 'Yes' : 'No'}</div>
                  <div>Last Message: {connectionStats.lastMessageTime ? new Date(connectionStats.lastMessageTime).toLocaleTimeString() : 'Never'}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

ConnectionStatus.propTypes = {
  isConnected: PropTypes.bool,
  isConnecting: PropTypes.bool,
  connectionType: PropTypes.oneOf(Object.values(REALTIME_CONNECTION_TYPES)),
  lastError: PropTypes.string,
  connectionStats: PropTypes.shape({
    isConnected: PropTypes.bool,
    connectionType: PropTypes.string,
    reconnectAttempts: PropTypes.number,
    userId: PropTypes.string,
    isOnline: PropTypes.bool,
    connectionStartTime: PropTypes.number,
    lastMessageTime: PropTypes.number,
    queuedMessages: PropTypes.number,
  }),
  onReconnect: PropTypes.func,
  onDisconnect: PropTypes.func,
  onConnectionTypeChange: PropTypes.func,
  showDetails: PropTypes.bool,
  compact: PropTypes.bool,
  position: PropTypes.oneOf([
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'top-center', 'bottom-center'
  ]),
  className: PropTypes.string,
};

export default ConnectionStatus;