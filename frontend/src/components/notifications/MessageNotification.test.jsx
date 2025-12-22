import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageNotification, { MESSAGE_TYPES, MESSAGE_STATUS } from './MessageNotification';

// Mock props for testing
const mockProps = {
  id: 'test-notification-1',
  type: MESSAGE_TYPES.CHAT,
  sender: {
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    role: 'Investor',
    onlineStatus: 'online',
  },
  message: 'This is a test message for the notification component.',
  subject: 'Test Subject',
  timestamp: '2023-12-01T10:30:00Z',
  read: false,
  status: MESSAGE_STATUS.DELIVERED,
  threadInfo: {
    id: 'thread-1',
    replyCount: 3,
    lastReplyAt: '2023-12-01T11:00:00Z',
  },
  attachments: [
    {
      id: 'attachment-1',
      name: 'document.pdf',
      type: 'application/pdf',
      size: 1024000,
    },
  ],
  priority: 'normal',
  autoClose: false,
  duration: 6000,
};

describe('MessageNotification', () => {
  // Mock callback functions
  const mockOnClose = jest.fn();
  const mockOnReply = jest.fn();
  const mockOnMarkAsRead = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnArchive = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders message notification with basic props', () => {
    render(
      <MessageNotification
        {...mockProps}
        onClose={mockOnClose}
        onReply={mockOnReply}
        onMarkAsRead={mockOnMarkAsRead}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
      />
    );

    // Check sender information
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Investor')).toBeInTheDocument();
    
    // Check message content
    expect(screen.getByText('Test Subject')).toBeInTheDocument();
    expect(screen.getByText('This is a test message for the notification component.')).toBeInTheDocument();
    
    // Check indicators
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Thread reply count
    expect(screen.getByText('1')).toBeInTheDocument(); // Attachment count
  });

  test('renders different message types correctly', () => {
    const { rerender } = render(
      <MessageNotification {...mockProps} type={MESSAGE_TYPES.CHAT} />
    );
    expect(screen.getByRole('alert')).toHaveClass('bg-purple-50');

    rerender(<MessageNotification {...mockProps} type={MESSAGE_TYPES.EMAIL} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');

    rerender(<MessageNotification {...mockProps} type={MESSAGE_TYPES.SMS} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-green-50');

    rerender(<MessageNotification {...mockProps} type={MESSAGE_TYPES.SYSTEM} />);
    expect(screen.getByRole('alert')).toHaveClass('bg-gray-50');
  });

  test('renders different message statuses correctly', () => {
    const { rerender } = render(
      <MessageNotification {...mockProps} status={MESSAGE_STATUS.SENDING} />
    );
    expect(screen.getByText('Sending')).toBeInTheDocument();

    rerender(<MessageNotification {...mockProps} status={MESSAGE_STATUS.SENT} />);
    expect(screen.getByText('Sent')).toBeInTheDocument();

    rerender(<MessageNotification {...mockProps} status={MESSAGE_STATUS.DELIVERED} />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();

    rerender(<MessageNotification {...mockProps} status={MESSAGE_STATUS.READ} />);
    expect(screen.getByText('Read')).toBeInTheDocument();

    rerender(<MessageNotification {...mockProps} status={MESSAGE_STATUS.FAILED} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  test('handles message truncation and expansion', () => {
    const longMessage = 'This is a very long message that should be truncated when displayed in the notification preview. It contains more than 100 characters to test the truncation functionality properly.';
    
    render(
      <MessageNotification
        {...mockProps}
        message={longMessage}
      />
    );

    // Should show truncated message initially
    expect(screen.getByText(/This is a very long message that should be truncated/)).toBeInTheDocument();
    expect(screen.getByText('Show more')).toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText('Show more'));
    expect(screen.getByText(longMessage)).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByText('Show less'));
    expect(screen.getByText(/This is a very long message that should be truncated/)).toBeInTheDocument();
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });

  test('handles reply functionality', async () => {
    render(
      <MessageNotification
        {...mockProps}
        onReply={mockOnReply}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByTitle('Reply'));
    
    // Reply section should appear
    expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();

    // Type reply
    fireEvent.change(screen.getByPlaceholderText('Type your reply...'), {
      target: { value: 'This is my reply' }
    });

    // Send reply
    fireEvent.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(mockOnReply).toHaveBeenCalledWith(mockProps.id, 'This is my reply');
    });
  });

  test('handles reply cancellation', () => {
    render(
      <MessageNotification
        {...mockProps}
        onReply={mockOnReply}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByTitle('Reply'));
    
    // Cancel reply
    fireEvent.click(screen.getByText('Cancel'));
    
    // Reply section should disappear
    expect(screen.queryByPlaceholderText('Type your reply...')).not.toBeInTheDocument();
    expect(mockOnReply).not.toHaveBeenCalled();
  });

  test('disables send button when reply is empty', () => {
    render(
      <MessageNotification
        {...mockProps}
        onReply={mockOnReply}
      />
    );

    // Click reply button
    fireEvent.click(screen.getByTitle('Reply'));
    
    // Send button should be disabled initially
    expect(screen.getByText('Send')).toBeDisabled();

    // Type reply
    fireEvent.change(screen.getByPlaceholderText('Type your reply...'), {
      target: { value: 'This is my reply' }
    });

    // Send button should be enabled
    expect(screen.getByText('Send')).not.toBeDisabled();
  });

  test('handles mark as read action', () => {
    render(
      <MessageNotification
        {...mockProps}
        read={false}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    // Click mark as read button
    fireEvent.click(screen.getByTitle('Mark as read'));
    
    expect(mockOnMarkAsRead).toHaveBeenCalledWith(mockProps.id);
  });

  test('handles delete action', () => {
    render(
      <MessageNotification
        {...mockProps}
        onDelete={mockOnDelete}
      />
    );

    // Click delete button
    fireEvent.click(screen.getByTitle('Delete'));
    
    expect(mockOnDelete).toHaveBeenCalledWith(mockProps.id);
  });

  test('handles archive action', () => {
    render(
      <MessageNotification
        {...mockProps}
        onArchive={mockOnArchive}
      />
    );

    // Click archive button
    fireEvent.click(screen.getByTitle('Archive'));
    
    expect(mockOnArchive).toHaveBeenCalledWith(mockProps.id);
  });

  test('handles close action', () => {
    render(
      <MessageNotification
        {...mockProps}
        onClose={mockOnClose}
      />
    );

    // Click close button
    fireEvent.click(screen.getByTitle('Close'));
    
    expect(mockOnClose).toHaveBeenCalledWith(mockProps.id);
  });

  test('renders default avatar when no avatar provided', () => {
    render(
      <MessageNotification
        {...mockProps}
        sender={{
          ...mockProps.sender,
          avatar: undefined,
        }}
      />
    );

    // Should show default avatar with initials
    const avatar = screen.getByText('JD');
    expect(avatar).toBeInTheDocument();
    expect(avatar.parentElement).toHaveClass('bg-purple-500');
  });

  test('renders online status indicator', () => {
    const { rerender } = render(
      <MessageNotification
        {...mockProps}
        sender={{
          ...mockProps.sender,
          onlineStatus: 'online',
        }}
      />
    );
    
    // Should show online indicator
    const onlineIndicator = document.querySelector('.bg-green-400');
    expect(onlineIndicator).toBeInTheDocument();

    // Test other statuses
    rerender(
      <MessageNotification
        {...mockProps}
        sender={{
          ...mockProps.sender,
          onlineStatus: 'away',
        }}
      />
    );
    
    const awayIndicator = document.querySelector('.bg-yellow-400');
    expect(awayIndicator).toBeInTheDocument();

    rerender(
      <MessageNotification
        {...mockProps}
        sender={{
          ...mockProps.sender,
          onlineStatus: 'busy',
        }}
      />
    );
    
    const busyIndicator = document.querySelector('.bg-red-400');
    expect(busyIndicator).toBeInTheDocument();

    rerender(
      <MessageNotification
        {...mockProps}
        sender={{
          ...mockProps.sender,
          onlineStatus: 'offline',
        }}
      />
    );
    
    const offlineIndicator = document.querySelector('.bg-gray-400');
    expect(offlineIndicator).toBeInTheDocument();
  });

  test('renders unread indicator for unread messages', () => {
    const { rerender } = render(
      <MessageNotification
        {...mockProps}
        read={false}
      />
    );
    
    // Should show unread indicator
    const unreadIndicator = document.querySelector('.bg-purple-500.rounded-full');
    expect(unreadIndicator).toBeInTheDocument();

    // Should not show for read messages
    rerender(
      <MessageNotification
        {...mockProps}
        read={true}
      />
    );
    
    expect(document.querySelector('.bg-purple-500.rounded-full')).not.toBeInTheDocument();
  });

  test('renders without thread info when not provided', () => {
    render(
      <MessageNotification
        {...mockProps}
        threadInfo={null}
      />
    );
    
    // Should not show thread indicator
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  test('renders without attachments when not provided', () => {
    render(
      <MessageNotification
        {...mockProps}
        attachments={[]}
      />
    );
    
    // Should not show attachment indicator
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  test('handles auto-close functionality', () => {
    jest.useFakeTimers();
    
    render(
      <MessageNotification
        {...mockProps}
        autoClose={true}
        duration={5000}
        onClose={mockOnClose}
      />
    );

    // Should show progress bar
    expect(document.querySelector('.message-progress-bar')).toBeInTheDocument();

    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    expect(mockOnClose).toHaveBeenCalledWith(mockProps.id);
    
    jest.useRealTimers();
  });

  test('formats timestamps correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    const { rerender } = render(
      <MessageNotification
        {...mockProps}
        timestamp={oneMinuteAgo.toISOString()}
      />
    );
    
    expect(screen.getByText('Just now')).toBeInTheDocument();

    rerender(
      <MessageNotification
        {...mockProps}
        timestamp={oneHourAgo.toISOString()}
      />
    );
    
    expect(screen.getByText('1h ago')).toBeInTheDocument();

    rerender(
      <MessageNotification
        {...mockProps}
        timestamp={oneDayAgo.toISOString()}
      />
    );
    
    expect(screen.getByText('1d ago')).toBeInTheDocument();
  });

  test('applies priority styling correctly', () => {
    const { rerender } = render(
      <MessageNotification
        {...mockProps}
        priority="low"
      />
    );
    
    expect(screen.getByRole('alert')).toHaveClass('border-l-4');

    rerender(
      <MessageNotification
        {...mockProps}
        priority="normal"
      />
    );
    
    expect(screen.getByRole('alert')).toHaveClass('border-l-4');

    rerender(
      <MessageNotification
        {...mockProps}
        priority="high"
      />
    );
    
    expect(screen.getByRole('alert')).toHaveClass('border-l-8', 'shadow-lg');

    rerender(
      <MessageNotification
        {...mockProps}
        priority="urgent"
      />
    );
    
    expect(screen.getByRole('alert')).toHaveClass('border-l-8', 'shadow-lg', 'animate-pulse');
  });

  test('handles accessibility attributes', () => {
    render(
      <MessageNotification
        {...mockProps}
        priority="urgent"
      />
    );

    const notification = screen.getByRole('alert');
    expect(notification).toHaveAttribute('aria-live', 'polite');
  });

  test('applies custom className', () => {
    render(
      <MessageNotification
        {...mockProps}
        className="custom-notification-class"
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('custom-notification-class');
  });

  test('does not render when visible is false', () => {
    render(
      <MessageNotification
        {...mockProps}
        show={false}
      />
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('handles keyboard navigation', () => {
    render(
      <MessageNotification
        {...mockProps}
        onReply={mockOnReply}
        onMarkAsRead={mockOnMarkAsRead}
        onDelete={mockOnDelete}
        onArchive={mockOnArchive}
        onClose={mockOnClose}
      />
    );

    // Tab to reply button and press Enter
    fireEvent.focus(screen.getByTitle('Reply'));
    fireEvent.keyDown(screen.getByTitle('Reply'), { key: 'Enter', code: 'Enter' });
    
    expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument();

    // Tab to cancel button and press Enter
    fireEvent.focus(screen.getByText('Cancel'));
    fireEvent.keyDown(screen.getByText('Cancel'), { key: 'Enter', code: 'Enter' });
    
    expect(screen.queryByPlaceholderText('Type your reply...')).not.toBeInTheDocument();
  });

  describe('Edge Cases', () => {
    test('handles extremely long messages', () => {
      const extremelyLongMessage = 'A'.repeat(10000);
      
      render(
        <MessageNotification
          {...mockProps}
          message={extremelyLongMessage}
        />
      );

      expect(screen.getByText(/A+/)).toBeInTheDocument();
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    test('handles special characters in messages', () => {
      const specialMessage = 'Special chars: !@#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      render(
        <MessageNotification
          {...mockProps}
          message={specialMessage}
        />
      );

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    test('handles unicode characters', () => {
      const unicodeMessage = 'Unicode test: 🚀 🌟 💫 ✨ 🎉 🎊 🌈 🦄 🌺 👻 🤖 👾 🎮 🕹️ 🕹️';
      
      render(
        <MessageNotification
          {...mockProps}
          message={unicodeMessage}
        />
      );

      expect(screen.getByText(unicodeMessage)).toBeInTheDocument();
    });

    test('handles null/undefined props gracefully', () => {
      expect(() => {
        render(
          <MessageNotification
            {...mockProps}
            sender={null}
            message={undefined}
            threadInfo={null}
            attachments={undefined}
          />
        );
      }).not.toThrow();
    });

    test('handles empty arrays gracefully', () => {
      render(
        <MessageNotification
          {...mockProps}
          attachments={[]}
          threadInfo={{ ...mockProps.threadInfo, replies: [] }}
        />
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently with many attachments', () => {
      const manyAttachments = Array.from({ length: 100 }, (_, i) => ({
        id: `attachment-${i}`,
        name: `file-${i}.pdf`,
        type: 'application/pdf',
        size: 1024000,
      }));

      const startTime = performance.now();
      
      render(
        <MessageNotification
          {...mockProps}
          attachments={manyAttachments}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('handles rapid prop changes', () => {
      const { rerender } = render(<MessageNotification {...mockProps} />);

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        rerender(
          <MessageNotification
            {...mockProps}
            message={`Updated message ${i}`}
          />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(
        <MessageNotification
          {...mockProps}
          priority="urgent"
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
      expect(notification).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', () => {
      render(
        <MessageNotification
          {...mockProps}
          onReply={mockOnReply}
        />
      );

      const replyButton = screen.getByTitle('Reply');
      replyButton.focus();
      expect(replyButton).toHaveFocus();

      fireEvent.keyDown(replyButton, { key: 'Enter' });
      expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument();
    });

    test('announces attachment count to screen readers', () => {
      render(
        <MessageNotification
          {...mockProps}
          attachments={mockProps.attachments}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('updates when notification data changes', () => {
      const { rerender } = render(<MessageNotification {...mockProps} />);

      expect(screen.getByText('Test Subject')).toBeInTheDocument();

      const updatedProps = {
        ...mockProps,
        subject: 'Updated Subject',
        status: MESSAGE_STATUS.READ,
      };

      rerender(<MessageNotification {...updatedProps} />);

      expect(screen.getByText('Updated Subject')).toBeInTheDocument();
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    test('handles new replies in thread', () => {
      const { rerender } = render(<MessageNotification {...mockProps} />);

      expect(screen.getByText('3')).toBeInTheDocument();

      const updatedThreadInfo = {
        ...mockProps.threadInfo,
        replyCount: 5,
      };

      rerender(<MessageNotification {...mockProps} threadInfo={updatedThreadInfo} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('integrates with notification store', () => {
      const mockStore = {
        notifications: [mockProps],
        markAsRead: jest.fn(),
        removeNotification: jest.fn(),
      };

      jest.doMock('../../stores/index.js', () => ({
        useNotificationStore: () => mockStore,
      }));

      render(<MessageNotification {...mockProps} />);

      const markReadButton = screen.getByTitle('Mark as read');
      fireEvent.click(markReadButton);

      expect(mockStore.markAsRead).toHaveBeenCalledWith(mockProps.id);
    });

    test('integrates with real-time service', () => {
      const mockRealtimeService = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      jest.doMock('../../services/realtimeNotificationService.js', () => ({
        realtimeNotificationService: mockRealtimeService,
      }));

      render(<MessageNotification {...mockProps} />);

      expect(mockRealtimeService.subscribe).toHaveBeenCalled();
    });
  });
});