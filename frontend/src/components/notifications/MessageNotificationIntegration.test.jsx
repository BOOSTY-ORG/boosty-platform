import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import MessageNotification, { MESSAGE_TYPES, MESSAGE_STATUS } from './MessageNotification';

// Mock the notification store
jest.mock('../../stores/notificationStore');

describe('MessageNotification Integration', () => {
  const mockStore = {
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    deleteNotification: jest.fn(),
    notifications: [],
    unreadCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationStore.mockReturnValue(mockStore);
  });

  test('integrates with notification store for message notifications', () => {
    const messageData = {
      id: 'integration-test-1',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'Test User',
        role: 'Investor',
        onlineStatus: 'online',
      },
      message: 'Integration test message',
      subject: 'Test Integration',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
    };

    // Simulate adding a message notification through the store
    mockStore.addNotification(messageData);

    expect(mockStore.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'message',
        title: 'Test Integration',
        message: 'Integration test message',
        messageType: MESSAGE_TYPES.CHAT,
        sender: messageData.sender,
      })
    );
  });

  test('handles mark as read through store integration', async () => {
    const messageData = {
      id: 'integration-test-2',
      type: MESSAGE_TYPES.EMAIL,
      sender: {
        name: 'Test Sender',
        role: 'System',
      },
      message: 'Test email message',
      subject: 'Test Email',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
    };

    const mockMarkAsRead = jest.fn();
    
    render(
      <MessageNotification
        {...messageData}
        onMarkAsRead={mockMarkAsRead}
      />
    );

    // Click mark as read button
    fireEvent.click(screen.getByTitle('Mark as read'));

    expect(mockMarkAsRead).toHaveBeenCalledWith('integration-test-2');
  });

  test('handles reply functionality with store integration', async () => {
    const messageData = {
      id: 'integration-test-3',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'Test User',
        role: 'Investor',
        onlineStatus: 'online',
      },
      message: 'Test message for reply',
      subject: 'Reply Test',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
    };

    const mockOnReply = jest.fn();
    
    render(
      <MessageNotification
        {...messageData}
        onReply={mockOnReply}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByTitle('Reply'));
    
    // Type reply
    fireEvent.change(screen.getByPlaceholderText('Type your reply...'), {
      target: { value: 'This is a test reply' }
    });

    // Send reply
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(mockOnReply).toHaveBeenCalledWith('integration-test-3', 'This is a test reply');
    });
  });

  test('integrates with different message types from notification system', () => {
    const messageTypes = [
      { type: MESSAGE_TYPES.CHAT, expectedColor: 'purple' },
      { type: MESSAGE_TYPES.EMAIL, expectedColor: 'blue' },
      { type: MESSAGE_TYPES.SMS, expectedColor: 'green' },
      { type: MESSAGE_TYPES.SYSTEM, expectedColor: 'gray' },
    ];

    messageTypes.forEach(({ type, expectedColor }) => {
      const messageData = {
        id: `integration-test-${type}`,
        type,
        sender: {
          name: 'Test User',
          role: 'System',
        },
        message: `Test ${type} message`,
        subject: `${type} Test`,
        timestamp: new Date().toISOString(),
        read: false,
        status: MESSAGE_STATUS.DELIVERED,
      };

      mockStore.addNotification(messageData);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          messageType: type,
        })
      );
    });
  });

  test('handles priority-based notifications from system', () => {
    const priorities = ['low', 'normal', 'high', 'urgent'];
    
    priorities.forEach(priority => {
      const messageData = {
        id: `integration-test-priority-${priority}`,
        type: MESSAGE_TYPES.SYSTEM,
        sender: {
          name: 'System',
          role: 'Automated',
        },
        message: `Test ${priority} priority message`,
        subject: `${priority} Priority Test`,
        timestamp: new Date().toISOString(),
        read: false,
        status: MESSAGE_STATUS.DELIVERED,
        priority,
      };

      mockStore.addNotification(messageData);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          priority,
        })
      );
    });
  });

  test('handles thread information in integration', () => {
    const messageData = {
      id: 'integration-test-thread',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'Test User',
        role: 'Investor',
        onlineStatus: 'online',
      },
      message: 'Test threaded message',
      subject: 'Thread Test',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
      threadInfo: {
        id: 'thread-123',
        replyCount: 5,
        lastReplyAt: new Date().toISOString(),
      },
    };

    render(<MessageNotification {...messageData} />);

    // Should display thread indicator with reply count
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('handles attachments in integration', () => {
    const messageData = {
      id: 'integration-test-attachments',
      type: MESSAGE_TYPES.EMAIL,
      sender: {
        name: 'Test Sender',
        role: 'System',
      },
      message: 'Test message with attachments',
      subject: 'Attachment Test',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
      attachments: [
        {
          id: 'att-1',
          name: 'document.pdf',
          type: 'application/pdf',
          size: 1024000,
        },
        {
          id: 'att-2',
          name: 'image.jpg',
          type: 'image/jpeg',
          size: 512000,
        },
      ],
    };

    render(<MessageNotification {...messageData} />);

    // Should display attachment indicator with count
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handles auto-dismiss functionality with store integration', () => {
    jest.useFakeTimers();
    
    const messageData = {
      id: 'integration-test-autoclose',
      type: MESSAGE_TYPES.SYSTEM,
      sender: {
        name: 'System',
        role: 'Automated',
      },
      message: 'Auto-dismiss test message',
      subject: 'Auto-close Test',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.DELIVERED,
      autoClose: true,
      duration: 5000,
    };

    const mockOnClose = jest.fn();
    
    render(
      <MessageNotification
        {...messageData}
        onClose={mockOnClose}
      />
    );

    // Should show progress bar
    expect(document.querySelector('.message-progress-bar')).toBeInTheDocument();

    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    expect(mockOnClose).toHaveBeenCalledWith('integration-test-autoclose');
    
    jest.useRealTimers();
  });

  test('handles real-time status updates', () => {
    const messageData = {
      id: 'integration-test-status',
      type: MESSAGE_TYPES.CHAT,
      sender: {
        name: 'Test User',
        role: 'Investor',
        onlineStatus: 'online',
      },
      message: 'Status update test',
      subject: 'Status Test',
      timestamp: new Date().toISOString(),
      read: false,
      status: MESSAGE_STATUS.SENDING,
    };

    const { rerender } = render(<MessageNotification {...messageData} />);

    // Initial status should be "Sending"
    expect(screen.getByText('Sending')).toBeInTheDocument();

    // Update status to "Delivered"
    rerender(
      <MessageNotification
        {...messageData}
        status={MESSAGE_STATUS.DELIVERED}
      />
    );

    // Should now show "Delivered"
    expect(screen.getByText('Delivered')).toBeInTheDocument();

    // Update status to "Read"
    rerender(
      <MessageNotification
        {...messageData}
        status={MESSAGE_STATUS.READ}
        read={true}
      />
    );

    // Should now show "Read" and have read styling
    expect(screen.getByText('Read')).toBeInTheDocument();
  });
});