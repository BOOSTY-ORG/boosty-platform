import React from 'react';
import { useNotification } from '../../hooks/useNotification.js';
import { NotificationContainer } from './NotificationContainer.jsx';
import { Button } from './Button.jsx';

/**
 * Example component demonstrating the enhanced notification system
 */
const NotificationExample = () => {
  const {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyMessage,
    notifyTask,
    notifyPayment,
    notifyKYC,
    notifyInvestment,
    notifyCRM,
    notifySystem,
    notifyCritical,
    notifications,
    unreadCount,
    markAsRead,
    clearAllNotifications,
  } = useNotification();

  const handleBasicNotifications = () => {
    notifySuccess('Operation completed successfully!');
    notifyError('Something went wrong. Please try again.');
    notifyWarning('This is a warning message.');
    notifyInfo('Here is some information you might find useful.');
  };

  const handleSpecialNotifications = () => {
    notifyMessage('You have a new message from John Doe.');
    notifyTask('Your assigned task is due tomorrow.');
    notifyPayment('Payment of $1,250.00 has been processed.');
    notifyKYC('Your KYC documents have been verified.');
    notifyInvestment('New investment opportunity available!');
    notifyCRM('New lead assigned to your pipeline.');
    notifySystem('System maintenance scheduled for tonight.');
  };

  const handleNotificationWithAction = () => {
    notifySuccess(
      'Your profile has been updated successfully.',
      'Profile Updated',
      {
        actionUrl: '/profile',
        actionText: 'View Profile',
        duration: 10000,
      }
    );
  };

  const handleCriticalNotification = () => {
    notifyCritical(
      'Security alert: Multiple failed login attempts detected.',
      'Security Alert',
      {
        priority: 'critical',
        autoClose: false,
      }
    );
  };

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Enhanced Notification System Demo
        </h2>
        
        {/* Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Notification Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {notifications.length}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Total Notifications
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {unreadCount}
              </div>
              <div className="text-sm text-green-800 dark:text-green-200">
                Unread Notifications
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {notifications.filter(n => !n.read).length}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-200">
                Active Notifications
              </div>
            </div>
          </div>
        </div>

        {/* Basic Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Notifications</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleBasicNotifications}>
              Show Basic Notifications
            </Button>
          </div>
        </div>

        {/* Special Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Special Notifications</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleSpecialNotifications}>
              Show Special Notifications
            </Button>
          </div>
        </div>

        {/* Notifications with Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Notifications with Actions</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleNotificationWithAction}>
              Show Notification with Action
            </Button>
            <Button onClick={handleCriticalNotification} variant="danger">
              Show Critical Notification
            </Button>
          </div>
        </div>

        {/* Notification Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Notification Management</h3>
          <div className="flex flex-wrap gap-3 mb-6">
            <Button onClick={handleClearAll} variant="outline">
              Clear All Notifications
            </Button>
          </div>
        </div>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-4 rounded-lg border-l-4 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${notification.read ? 'opacity-60' : ''}
                    ${
                      notification.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : notification.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : notification.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }
                  `}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-sm mt-1">{notification.message}</div>
                      {notification.timestamp && (
                        <div className="text-xs mt-2 opacity-60">
                          {new Date(notification.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      {!notification.read && (
                        <div className="h-2 w-2 bg-current rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notification Container */}
      <NotificationContainer 
        position="top-right" 
        maxNotifications={5}
        showUnreadCount={true}
      />
    </div>
  );
};

export default NotificationExample;