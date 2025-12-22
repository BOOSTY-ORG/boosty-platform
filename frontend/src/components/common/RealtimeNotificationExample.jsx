import React, { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications.js';
import { ConnectionStatus } from './ConnectionStatus.jsx';
import { Notification } from './Notification.jsx';
import { REALTIME_CONNECTION_TYPES, NOTIFICATION_TYPES } from '../../api/notificationConstants.js';

/**
 * RealtimeNotificationExample component
 * Demonstrates comprehensive usage of the real-time notification system
 * Including connection management, event handling, and UI integration
 */
const RealtimeNotificationExample = ({ 
  userId = 'demo-user-123',
  showConnectionStatus = true,
  compactConnectionStatus = false,
  position = 'bottom-right',
}) => {
  // Real-time notification hook
  const {
    isConnected,
    isConnecting,
    connectionType,
    connectionStats,
    lastError,
    unreadCount,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    updateConnectionPreferences,
    requestNotificationPermission,
  } = useRealtimeNotifications({
    userId,
    autoConnect: true,
    defaultConnectionType: REALTIME_CONNECTION_TYPES.SSE,
    enableNotifications: true,
    onNotificationReceived: handleNewNotification,
    onConnectionStatusChange: handleConnectionStatusChange,
    onError: handleError,
  });

  // Local state for demo
  const [showNotifications, setShowNotifications] = useState(true);
  const [connectionPreferences, setConnectionPreferences] = useState({
    realtimeConnectionType: REALTIME_CONNECTION_TYPES.SSE,
  });
  const [testMessage, setTestMessage] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('');

  /**
   * Handle new notification from real-time service
   * @param {Object} notification - New notification data
   */
  function handleNewNotification(notification) {
    console.log('New real-time notification received:', notification);
    
    // Show browser notification for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'urgent') {
      showBrowserNotification(notification);
    }
  }

  /**
   * Handle connection status changes
   * @param {Object} status - Connection status data
   */
  function handleConnectionStatusChange(status) {
    console.log('Connection status changed:', status);
  }

  /**
   * Handle errors
   * @param {Error} error - Error object
   */
  function handleError(error) {
    console.error('Real-time notification error:', error);
  }

  /**
   * Show browser notification
   * @param {Object} notification - Notification data
   */
  async function showBrowserNotification(notification) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        const browserNotification = new Notification(notification.title || 'New Notification', {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
        
        browserNotification.onclick = () => {
          window.focus();
          browserNotification.close();
        };
      }
    }
  }

  /**
   * Handle connection type change
   * @param {string} newType - New connection type
   */
  const handleConnectionTypeChange = async (newType) => {
    setConnectionPreferences(prev => ({ ...prev, realtimeConnectionType: newType }));
    await updateConnectionPreferences({ realtimeConnectionType: newType });
  };

  /**
   * Send test message
   */
  const handleSendTestMessage = () => {
    if (testMessage.trim()) {
      const success = sendMessage({
        type: 'test_message',
        data: testMessage,
        timestamp: Date.now(),
      });
      
      if (success) {
        setTestMessage('');
        console.log('Test message sent successfully');
      } else {
        console.error('Failed to send test message');
      }
    }
  };

  /**
   * Request notification permissions
   */
  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  // Check initial permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Real-Time Notification System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive demonstration of WebSocket and Server-Sent Events for live notifications
          </p>
        </div>

        {/* Connection Status */}
        {showConnectionStatus && (
          <ConnectionStatus
            isConnected={isConnected}
            isConnecting={isConnecting}
            connectionType={connectionType}
            lastError={lastError}
            connectionStats={connectionStats}
            onReconnect={reconnect}
            onDisconnect={disconnect}
            onConnectionTypeChange={handleConnectionTypeChange}
            compact={compactConnectionStatus}
            position={position}
            showDetails={true}
          />
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Status
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`font-medium ${
                  isConnected ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {connectionType?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Unread:</span>
                <span className="font-medium text-blue-600">
                  {unreadCount}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Statistics
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Reconnect Attempts:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {connectionStats?.reconnectAttempts || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Queued Messages:</span>
                <span className="font-medium text-yellow-600">
                  {connectionStats?.queuedMessages || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Online:</span>
                <span className={`font-medium ${
                  connectionStats?.isOnline ? 'text-green-600' : 'text-red-600'
                }`}>
                  {connectionStats?.isOnline ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Browser Permissions
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Notifications:</span>
                <span className={`font-medium ${
                  permissionStatus === 'granted' ? 'text-green-600' : 
                  permissionStatus === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {permissionStatus || 'unknown'}
                </span>
              </div>
              <button
                onClick={handleRequestPermissions}
                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Request Permissions
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Connection Controls
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Type
                </label>
                <select
                  value={connectionPreferences.realtimeConnectionType}
                  onChange={(e) => handleConnectionTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={REALTIME_CONNECTION_TYPES.WEBSOCKET}>WebSocket</option>
                  <option value={REALTIME_CONNECTION_TYPES.SSE}>Server-Sent Events</option>
                  <option value={REALTIME_CONNECTION_TYPES.BOTH}>Auto (WebSocket → SSE)</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={connect}
                  disabled={isConnected || isConnecting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
                <button
                  onClick={disconnect}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Disconnect
                </button>
                <button
                  onClick={reconnect}
                  disabled={isConnecting}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reconnect
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Message
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message Content
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter a test message to send..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={handleSendTestMessage}
                disabled={!isConnected || !testMessage.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send Test Message
              </button>
            </div>
          </div>
        </div>

        {/* Demo Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Demo Notifications
            </h2>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {showNotifications ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showNotifications && (
            <div className="space-y-4">
              <Notification
                type={NOTIFICATION_TYPES.INFO}
                title="Information"
                message="This is an informational notification that demonstrates the real-time system."
                autoClose={true}
                duration={5000}
              />
              
              <Notification
                type={NOTIFICATION_TYPES.SUCCESS}
                title="Success"
                message="Real-time connection established successfully!"
                autoClose={true}
                duration={3000}
              />
              
              <Notification
                type={NOTIFICATION_TYPES.WARNING}
                title="Warning"
                message="This is a warning notification that requires attention."
                autoClose={false}
              />
              
              <Notification
                type={NOTIFICATION_TYPES.ERROR}
                title="Error"
                message="This is an error notification that won't auto-close."
                autoClose={false}
                priority="high"
              />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
            How to Use This Demo
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-300">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Connect to the real-time service using WebSocket or Server-Sent Events</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Monitor connection status and statistics in real-time</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Send test messages to verify bidirectional communication</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Request browser permissions for desktop notifications</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Switch between connection types to test fallback mechanisms</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>View demo notifications with different types and priorities</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RealtimeNotificationExample;