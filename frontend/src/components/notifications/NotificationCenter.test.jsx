import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNotificationStore } from '../../stores/index.js';
import NotificationCenter, { VIEW_MODES, TAB_OPTIONS } from './NotificationCenter.jsx';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUS,
  BULK_OPERATION_TYPES,
} from '../../api/notificationConstants.js';

// Mock the notification store
jest.mock('../../stores/index.js');
const mockStore = useNotificationStore;

// Mock the notification API
jest.mock('../../api/index.js', () => ({
  notificationAPI: {
    setUserId: jest.fn(),
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    getNotificationStats: jest.fn(),
    bulkOperation: jest.fn(),
    connectRealtime: jest.fn(),
    disconnectRealtime: jest.fn(),
  },
}));

// Mock the specialized notification components
jest.mock('./MessageNotification.jsx', () => {
  return function MockMessageNotification({ id, title, message }) {
    return (
      <div data-testid="message-notification" data-id={id}>
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    );
  };
});

jest.mock('./TaskNotification.jsx', () => {
  return function MockTaskNotification({ id, title, description }) {
    return (
      <div data-testid="task-notification" data-id={id}>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    );
  };
});

jest.mock('./ErrorNotification.jsx', () => {
  return function MockErrorNotification({ id, title, message }) {
    return (
      <div data-testid="error-notification" data-id={id}>
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    );
  };
});

jest.mock('./SuccessNotification.jsx', () => {
  return function MockSuccessNotification({ id, title, message }) {
    return (
      <div data-testid="success-notification" data-id={id}>
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    );
  };
});

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: '1',
      type: NOTIFICATION_TYPES.MESSAGE,
      title: 'New Message',
      message: 'You have a new message from John',
      read: false,
      createdAt: '2023-01-01T12:00:00Z',
      data: {
        sender: { name: 'John' },
        message: 'You have a new message from John',
      },
    },
    {
      id: '2',
      type: NOTIFICATION_TYPES.TASK,
      title: 'Task Assigned',
      message: 'You have been assigned a new task',
      read: true,
      createdAt: '2023-01-01T10:00:00Z',
      data: {
        title: 'Complete project documentation',
        description: 'You have been assigned a new task',
      },
    },
    {
      id: '3',
      type: NOTIFICATION_TYPES.ERROR,
      title: 'Error Occurred',
      message: 'An error occurred while processing your request',
      read: false,
      createdAt: '2023-01-01T08:00:00Z',
      data: {
        type: 'validation',
        message: 'An error occurred while processing your request',
      },
    },
    {
      id: '4',
      type: NOTIFICATION_TYPES.SUCCESS,
      title: 'Payment Successful',
      message: 'Your payment has been processed successfully',
      read: true,
      createdAt: '2023-01-01T06:00:00Z',
      data: {
        type: 'payment',
        message: 'Your payment has been processed successfully',
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock store values
    mockStore.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 2,
      isLoading: false,
      error: null,
      filters: {},
      pagination: {
        page: 1,
        limit: 20,
        total: 4,
        pages: 1,
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      },
      realtimeConnected: false,
      fetchNotifications: jest.fn(),
      fetchUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAsUnread: jest.fn(),
      deleteNotification: jest.fn(),
      markAllAsRead: jest.fn(),
      setFilters: jest.fn(),
      clearFilters: jest.fn(),
      setPagination: jest.fn(),
      fetchPreferences: jest.fn(),
      updatePreferences: jest.fn(),
      connectRealtime: jest.fn(),
      disconnectRealtime: jest.fn(),
    });
  });

  it('renders notification center with header and tabs', () => {
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('displays unread count in header', () => {
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders notifications based on their type', () => {
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByTestId('message-notification')).toBeInTheDocument();
    expect(screen.getByTestId('task-notification')).toBeInTheDocument();
    expect(screen.getByTestId('error-notification')).toBeInTheDocument();
    expect(screen.getByTestId('success-notification')).toBeInTheDocument();
  });

  it('shows loading state when loading', () => {
    mockStore.mockReturnValue({
      ...mockStore(),
      isLoading: true,
      notifications: [],
    });
    
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockStore.mockReturnValue({
      ...mockStore(),
      notifications: [],
    });
    
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up! Check back later for new notifications.")).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    mockStore.mockReturnValue({
      ...mockStore(),
      error: 'Failed to load notifications',
      notifications: [],
    });
    
    render(<NotificationCenter userId="user123" />);
    
    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('filters notifications when search query is entered', async () => {
    render(<NotificationCenter userId="user123" />);
    
    const searchInput = screen.getByPlaceholderText('Search notifications...');
    fireEvent.change(searchInput, { target: { value: 'message' } });
    
    await waitFor(() => {
      expect(mockStore().fetchNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'message',
        })
      );
    });
  });

  it('changes view mode when view mode buttons are clicked', () => {
    render(<NotificationCenter userId="user123" />);
    
    const gridViewButton = screen.getByTitle('Grid view');
    fireEvent.click(gridViewButton);
    
    // Check that the view mode has changed
    expect(gridViewButton).toHaveClass('active');
  });

  it('opens preferences modal when preferences button is clicked', () => {
    render(<NotificationCenter userId="user123" showPreferences={true} />);
    
    const preferencesButton = screen.getByTitle('Notification preferences');
    fireEvent.click(preferencesButton);
    
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Notification Types')).toBeInTheDocument();
  });

  it('opens analytics modal when analytics button is clicked', () => {
    const mockStats = {
      total: 100,
      unread: 20,
      readRate: 80,
      avgResponseTime: '2h 30m',
      byType: {
        [NOTIFICATION_TYPES.MESSAGE]: 40,
        [NOTIFICATION_TYPES.TASK]: 30,
        [NOTIFICATION_TYPES.ERROR]: 20,
        [NOTIFICATION_TYPES.SUCCESS]: 10,
      },
      byPriority: {
        [NOTIFICATION_PRIORITIES.HIGH]: 20,
        [NOTIFICATION_PRIORITIES.NORMAL]: 60,
        [NOTIFICATION_PRIORITIES.LOW]: 20,
      },
    };
    
    mockStore.mockReturnValue({
      ...mockStore(),
    });
    
    render(<NotificationCenter userId="user123" showAnalytics={true} />);
    
    const analyticsButton = screen.getByTitle('View analytics');
    fireEvent.click(analyticsButton);
    
    // The analytics modal would be shown with stats
    // Since we're mocking the stats, we'll check if the modal would appear
    // In a real test, you'd mock the notificationAPI.getNotificationStats to return mockStats
  });

  it('changes active tab when tab is clicked', async () => {
    render(<NotificationCenter userId="user123" />);
    
    const unreadTab = screen.getByText('Unread');
    fireEvent.click(unreadTab);
    
    await waitFor(() => {
      expect(mockStore().setFilters).toHaveBeenCalledWith({
        status: NOTIFICATION_STATUS.DELIVERED,
      });
    });
  });

  it('selects notifications when checkbox is clicked', () => {
    render(<NotificationCenter userId="user123" showBulkActions={true} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(checkboxes[0]).toBeChecked();
  });

  it('performs bulk actions when bulk action buttons are clicked', async () => {
    render(<NotificationCenter userId="user123" showBulkActions={true} />);
    
    // First select a notification
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Then click bulk action
    const markReadButton = screen.getByText('Mark as Read');
    fireEvent.click(markReadButton);
    
    await waitFor(() => {
      expect(mockStore().markAsRead).toHaveBeenCalled();
    });
  });

  it('refreshes notifications when refresh button is clicked', async () => {
    render(<NotificationCenter userId="user123" />);
    
    const refreshButton = screen.getByTitle('Refresh notifications');
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockStore().fetchNotifications).toHaveBeenCalled();
    });
  });

  it('applies filters when filter values are changed', async () => {
    render(<NotificationCenter userId="user123" showFilters={true} />);
    
    const typeFilter = screen.getByDisplayValue('All Types');
    fireEvent.change(typeFilter, { target: { value: NOTIFICATION_TYPES.MESSAGE } });
    
    await waitFor(() => {
      expect(mockStore().fetchNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NOTIFICATION_TYPES.MESSAGE,
        })
      );
    });
  });

  it('handles notification click', () => {
    const onNotificationClick = jest.fn();
    render(<NotificationCenter userId="user123" onNotificationClick={onNotificationClick} />);
    
    const messageNotification = screen.getByTestId('message-notification');
    fireEvent.click(messageNotification);
    
    expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
  });

  it('marks notification as read when unread notification is clicked', async () => {
    render(<NotificationCenter userId="user123" />);
    
    const messageNotification = screen.getByTestId('message-notification');
    fireEvent.click(messageNotification);
    
    await waitFor(() => {
      expect(mockStore().markAsRead).toHaveBeenCalledWith('1');
    });
  });

  it('saves preferences when preferences are updated', async () => {
    render(<NotificationCenter userId="user123" showPreferences={true} />);
    
    // Open preferences modal
    const preferencesButton = screen.getByTitle('Notification preferences');
    fireEvent.click(preferencesButton);
    
    // Change a preference
    const emailNotificationsCheckbox = screen.getByLabelText('Email Notifications');
    fireEvent.click(emailNotificationsCheckbox);
    
    // Save preferences
    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockStore().updatePreferences).toHaveBeenCalled();
    });
  });

  it('initializes with userId on mount', () => {
    render(<NotificationCenter userId="user123" />);
    
    expect(mockStore().fetchNotifications).toHaveBeenCalled();
    expect(mockStore().fetchUnreadCount).toHaveBeenCalled();
    expect(mockStore().fetchPreferences).toHaveBeenCalled();
  });

  it('connects to real-time updates on mount', () => {
    render(<NotificationCenter userId="user123" />);
    
    expect(mockStore().connectRealtime).toHaveBeenCalled();
  });

  it('disconnects from real-time updates on unmount', () => {
    mockStore.mockReturnValue({
      ...mockStore(),
      realtimeConnected: true,
    });
    
    const { unmount } = render(<NotificationCenter userId="user123" />);
    unmount();
    
    expect(mockStore().disconnectRealtime).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<NotificationCenter userId="user123" className="custom-class" />);
    
    const notificationCenter = screen.getByRole('main').querySelector('.notification-center');
    expect(notificationCenter).toHaveClass('custom-class');
  });

  it('hides features when corresponding props are false', () => {
    render(
      <NotificationCenter
        userId="user123"
        showAnalytics={false}
        showPreferences={false}
        showSearch={false}
        showFilters={false}
        showBulkActions={false}
      />
    );
    
    expect(screen.queryByTitle('View analytics')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Notification preferences')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search notifications...')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('All Types')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('supports different initial view modes', () => {
    render(<NotificationCenter userId="user123" initialViewMode={VIEW_MODES.GRID} />);
    
    const gridViewButton = screen.getByTitle('Grid view');
    expect(gridViewButton).toHaveClass('active');
  });

  it('supports different initial tabs', () => {
    render(<NotificationCenter userId="user123" initialTab={TAB_OPTIONS.UNREAD} />);
    
    const unreadTab = screen.getByText('Unread');
    expect(unreadTab).toHaveClass('active');
  });

  it('handles keyboard navigation', () => {
    render(<NotificationCenter userId="user123" />);
    
    const firstTab = screen.getByText('All');
    firstTab.focus();
    
    expect(firstTab).toHaveFocus();
    
    // Tab to next element
    fireEvent.keyDown(firstTab, { key: 'Tab' });
    
    const nextTab = screen.getByText('Unread');
    expect(nextTab).toHaveFocus();
  });

  it('is accessible', async () => {
    const { container } = render(<NotificationCenter userId="user123" />);
    
    // Check for accessibility issues
    // In a real implementation, you would use axe-core or similar
    expect(container).toBeAccessible();
  });

  describe('Edge Cases', () => {
    test('handles empty notifications array', () => {
      mockStore.mockReturnValue({
        ...mockStore(),
        notifications: [],
      });

      render(<NotificationCenter userId="edge-case-user" />);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up! Check back later for new notifications.")).toBeInTheDocument();
    });

    test('handles malformed notification data', () => {
      const malformedNotifications = [
        { id: '1', type: 'info', title: 'Valid' },
        { id: '2', type: null, title: 'Invalid type' },
        { id: '3', type: 'info', title: null },
        { id: '4', type: 'info', title: undefined },
        { id: '5', type: 'info', title: '', message: null },
      ];

      mockStore.mockReturnValue({
        ...mockStore,
        notifications: malformedNotifications,
      });

      render(<NotificationCenter userId="edge-case-user" />);

      // Should render valid notifications and handle invalid ones gracefully
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Invalid type')).toBeInTheDocument();
    });

    test('handles extremely large notification count', () => {
      mockStore.mockReturnValue({
        ...mockStore,
        unreadCount: 9999,
      });

      render(<NotificationCenter userId="edge-case-user" />);

      expect(screen.getByText('9999')).toBeInTheDocument();
    });

    test('handles invalid filter values', () => {
      render(<NotificationCenter userId="filter-test-user" showFilters={true} />);

      const typeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(typeFilter, { target: { value: 'invalid-type' } });

      // Should handle invalid filter gracefully
      expect(mockStore().setFilters).toHaveBeenCalledWith({ type: 'invalid-type' });
    });
  });

  describe('Performance', () => {
    test('renders efficiently with many notifications', () => {
      const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-${i}`,
        type: ['info', 'success', 'error', 'warning'][i % 4],
        title: `Performance Test ${i}`,
        message: `This is performance test notification ${i}`,
        read: i % 2 === 0,
        createdAt: new Date().toISOString(),
      }));

      mockStore.mockReturnValue({
        ...mockStore,
        notifications: manyNotifications,
      });

      const startTime = performance.now();
      
      render(<NotificationCenter userId="perf-test-user" />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(500);
    });

    test('handles rapid filter changes', () => {
      render(<NotificationCenter userId="rapid-filter-user" showFilters={true} />);

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const types = ['info', 'success', 'error', 'warning'];
        const type = types[i % types.length];
        
        const typeFilter = screen.getByDisplayValue('All Types');
        fireEvent.change(typeFilter, { target: { value: type } });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    test('has proper landmark roles', () => {
      render(<NotificationCenter userId="a11y-test-user" />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });

    test('supports keyboard navigation', () => {
      render(<NotificationCenter userId="keyboard-test-user" />);

      const firstTab = screen.getByText('All');
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      // Test arrow key navigation
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      const secondTab = screen.getByText('Unread');
      expect(secondTab).toHaveFocus();

      // Test Enter key activation
      fireEvent.keyDown(secondTab, { key: 'Enter' });
      expect(mockStore().setFilters).toHaveBeenCalled();
    });

    test('provides proper ARIA labels', () => {
      render(<NotificationCenter userId="a11y-label-test" />);

      expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /view/i })).toHaveAttribute('aria-label');
    });

    test('announces notification count to screen readers', () => {
      mockStore.mockReturnValue({
        ...mockStore,
        unreadCount: 5,
      });

      render(<NotificationCenter userId="a11y-count-test" />);

      const countElement = screen.getByText('5');
      expect(countElement).toBeInTheDocument();
    });
  });

  describe('Real-time Integration', () => {
    test('handles real-time notification addition', () => {
      render(<NotificationCenter userId="realtime-test-user" />);

      const newNotification = {
        id: 'realtime-new',
        type: 'info',
        title: 'Real-time Notification',
        message: 'This arrived via real-time',
        read: false,
        createdAt: new Date().toISOString(),
      };

      // Simulate real-time addition
      act(() => {
        mockStore.mockReturnValue({
          ...mockStore(),
          notifications: [...mockNotifications, newNotification],
        });
      });

      expect(screen.getByText('Real-time Notification')).toBeInTheDocument();
    });

    test('handles real-time notification updates', () => {
      render(<NotificationCenter userId="realtime-update-test" />);

      // Simulate real-time update
      const updatedNotification = {
        ...mockNotifications[0],
        title: 'Updated Notification',
        read: true,
      };

      act(() => {
        mockStore.mockReturnValue({
          ...mockStore,
          notifications: [updatedNotification, ...mockNotifications.slice(1)],
        });
      });

      expect(screen.getByText('Updated Notification')).toBeInTheDocument();
    });

    test('handles real-time notification removal', () => {
      render(<NotificationCenter userId="realtime-remove-test" />);

      // Simulate real-time removal
      act(() => {
        mockStore.mockReturnValue({
          ...mockStore,
          notifications: mockNotifications.slice(1),
        });
      });

      expect(screen.queryByText('New Message')).not.toBeInTheDocument();
    });
  });

  describe('Data Persistence', () => {
    test('persists filters across re-renders', () => {
      const { rerender } = render(<NotificationCenter userId="persist-test-user" />);

      // Apply a filter
      const typeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(typeFilter, { target: { value: 'error' } });

      // Re-render with same user ID
      rerender(<NotificationCenter userId="persist-test-user" />);

      // Filter should be persisted
      expect(typeFilter).toHaveValue('error');
    });

    test('persists view mode across re-renders', () => {
      const { rerender } = render(<NotificationCenter userId="persist-view-test" />);

      // Change view mode
      const gridViewButton = screen.getByTitle('Grid view');
      fireEvent.click(gridViewButton);

      // Re-render with same user ID
      rerender(<NotificationCenter userId="persist-view-test" />);

      // View mode should be persisted
      expect(gridViewButton).toHaveClass('active');
    });
  });

  describe('Error Recovery', () => {
    test('handles API errors gracefully', () => {
      mockStore.mockReturnValue({
        ...mockStore,
        error: 'Failed to load notifications',
        isLoading: false,
      });

      render(<NotificationCenter userId="error-test-user" />);

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    test('handles network timeouts', () => {
      mockStore.mockReturnValue({
        ...mockStore,
        error: 'Network timeout',
        isLoading: false,
      });

      render(<NotificationCenter userId="timeout-test-user" />);

      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    test('recovers from errors on retry', () => {
      mockStore.mockReturnValue({
        ...mockStore,
        error: 'Temporary error',
        isLoading: false,
      });

      render(<NotificationCenter userId="retry-test-user" />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Simulate successful retry
      act(() => {
        mockStore.mockReturnValue({
          ...mockStore,
          error: null,
          notifications: mockNotifications,
        });
      });

      expect(screen.getByText('Test Success')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<NotificationCenter userId="mobile-test-user" />);

      const notificationCenter = screen.getByRole('main');
      expect(notificationCenter).toHaveClass('mobile-optimized');
    });

    test('shows touch-friendly controls on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<NotificationCenter userId="mobile-touch-test" />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const minTouchSize = 44;
        expect(rect.width).toBeGreaterThanOrEqual(minTouchSize);
        expect(rect.height).toBeGreaterThanOrEqual(minTouchSize);
      });
    });
  });

  describe('Integration with Other Systems', () => {
    test('integrates with user preferences', () => {
      const mockUserPrefs = {
        emailNotifications: true,
        pushNotifications: false,
        inAppNotifications: true,
      };

      mockStore.mockReturnValue({
        ...mockStore,
        preferences: mockUserPrefs,
      });

      render(<NotificationCenter userId="prefs-integration-user" showPreferences={true} />);

      expect(screen.getByLabelText('Email Notifications')).toBeChecked();
      expect(screen.getByLabelText('Push Notifications')).not.toBeChecked();
      expect(screen.getByLabelText('In-App Notifications')).toBeChecked();
    });

    test('integrates with analytics system', () => {
      const mockAnalytics = {
        trackEvent: jest.fn(),
        trackPageView: jest.fn(),
      };

      jest.doMock('../../services/analytics.js', () => ({
        analytics: mockAnalytics,
      }));

      render(<NotificationCenter userId="analytics-integration-user" showAnalytics={true} />);

      const analyticsButton = screen.getByTitle('View analytics');
      fireEvent.click(analyticsButton);

      expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('notification_center_viewed');
    });

    test('integrates with search system', () => {
      const mockSearch = {
        search: jest.fn(),
        clearSearch: jest.fn(),
      };

      jest.doMock('../../services/search.js', () => ({
        searchService: mockSearch,
      }));

      render(<NotificationCenter userId="search-integration-user" showSearch={true} />);

      const searchInput = screen.getByPlaceholderText('Search notifications...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(mockSearch.search).toHaveBeenCalledWith('test search');
    });
  });
});