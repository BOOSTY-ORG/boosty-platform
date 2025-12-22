import React, { useState } from 'react';
import MessageNotification, { MESSAGE_TYPES, MESSAGE_STATUS } from './MessageNotification';

/**
 * Example component demonstrating MessageNotification usage
 * with different message types, statuses, and configurations
 */
const MessageNotificationExample = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 'msg-1',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'John Doe',
        avatar: 'https://picsum.photos/seed/john/100/100.jpg',
        role: 'Investor',
        onlineStatus: 'online',
      },
      message: 'Hey! I wanted to discuss the investment opportunity we talked about last week. Do you have some time to review the documents?',
      subject: 'Investment Discussion',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
      threadInfo: {
        id: 'thread-1',
        replyCount: 3,
        lastReplyAt: new Date(Date.now() - 2 * 60000).toISOString(),
      },
      priority: 'normal',
    },
    {
      id: 'msg-2',
      type: MESSAGE_TYPES.EMAIL,
      sender: {
        name: 'Sarah Johnson',
        role: 'KYC Manager',
        onlineStatus: 'away',
      },
      message: 'Your KYC documents have been successfully verified. You can now proceed with the investment process. Please log in to your dashboard to complete the final steps.',
      subject: 'KYC Verification Complete',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      read: true,
      status: MESSAGE_STATUS.READ,
      attachments: [
        {
          id: 'att-1',
          name: 'kyc-verification.pdf',
          type: 'application/pdf',
          size: 2048000,
        },
      ],
      priority: 'high',
    },
    {
      id: 'msg-3',
      type: MESSAGE_TYPES.SMS,
      sender: {
        name: 'System',
        role: 'Automated',
      },
      message: 'Your payment of $5,000 has been successfully processed. Transaction ID: TXN123456789. Expected ROI: 12% annually.',
      subject: 'Payment Confirmation',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      read: false,
      status: MESSAGE_STATUS.SENT,
      priority: 'normal',
    },
    {
      id: 'msg-4',
      type: MESSAGE_TYPES.SYSTEM,
      sender: {
        name: 'Boosty Platform',
        role: 'System',
      },
      message: 'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST. The platform will be temporarily unavailable during this time.',
      subject: 'Scheduled Maintenance',
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
      priority: 'urgent',
    },
    {
      id: 'msg-5',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'Michael Chen',
        avatar: 'https://picsum.photos/seed/michael/100/100.jpg',
        role: 'Financial Advisor',
        onlineStatus: 'busy',
      },
      message: 'The market analysis report is ready for review. I\'ve identified several promising investment opportunities that align with your risk profile.',
      subject: 'Market Analysis Report',
      timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      read: true,
      status: MESSAGE_STATUS.READ,
      threadInfo: {
        id: 'thread-2',
        replyCount: 7,
        lastReplyAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
      },
      attachments: [
        {
          id: 'att-2',
          name: 'market-analysis.pdf',
          type: 'application/pdf',
          size: 5120000,
        },
        {
          id: 'att-3',
          name: 'investment-opportunities.xlsx',
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024000,
        },
      ],
      priority: 'normal',
    },
  ]);

  // Event handlers
  const handleClose = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleReply = (id, replyText) => {
    console.log(`Reply to ${id}:`, replyText);
    // In a real app, this would send the reply to the backend
    alert(`Reply sent to ${id}: ${replyText}`);
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id 
          ? { ...n, read: true, status: MESSAGE_STATUS.READ }
          : n
      )
    );
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleArchive = (id) => {
    console.log(`Archived notification ${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Message Notifications Example</h1>
        <p className="text-gray-600">
          This example demonstrates the MessageNotification component with various message types,
          statuses, and configurations. Try interacting with the notifications below.
        </p>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <MessageNotification
            key={notification.id}
            {...notification}
            onClose={handleClose}
            onReply={handleReply}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">No notifications</div>
          <div className="text-gray-500">All messages have been cleared</div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Features Demonstrated:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Message Types:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Chat messages with online status</li>
              <li>• Email notifications with attachments</li>
              <li>• SMS messages for transaction updates</li>
              <li>• System messages for maintenance alerts</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Interactive Features:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Quick reply functionality</li>
              <li>• Mark as read/unread</li>
              <li>• Archive and delete actions</li>
              <li>• Message threading indicators</li>
              <li>• Attachment previews</li>
              <li>• Priority-based styling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageNotificationExample;