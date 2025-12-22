import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';
import userEvent from '@testing-library/user-event';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock WebSocket and EventSource for real-time testing
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN,
}));

global.EventSource = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: EventSource.OPEN,
}));

// Mock IntersectionObserver for infinite scroll
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock notification store
const mockNotificationStore = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  filters: {},
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  preferences: null,
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
  addNotification: jest.fn(),
  removeNotification: jest.fn(),
  clearAllNotifications: jest.fn(),
};

// Mock API
jest.mock('../../stores/index.js', () => ({
  useNotificationStore: () => mockNotificationStore,
}));

// Mock API responses
const mockAPIResponses = {
  notifications: {
    data: [
      {
        id: 'e2e-1',
        type: 'info',
        title: 'E2E Test Info',
        message: 'This is an E2E test info notification',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'normal',
      },
      {
        id: 'e2e-2',
        type: 'success',
        title: 'E2E Test Success',
        message: 'This is an E2E test success notification',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'normal',
      },
      {
        id: 'e2e-3',
        type: 'error',
        title: 'E2E Test Error',
        message: 'This is an E2E test error notification',
        read: false,
        timestamp: new Date().toISOString(),
        priority: 'high',
      },
    ],
    pagination: { page: 1, limit: 20, total: 3, pages: 1 },
  },
  unreadCount: { count: 2 },
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    inAppNotifications: true,
    types: {
      info: { email: true, sms: false, push: true, inApp: true },
      success: { email: true, sms: false, push: true, inApp: true },
      error: { email: true, sms: true, push: true, inApp: true },
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  },
  stats: {
    total: 10,
    unread: 2,
    readRate: 80,
    avgResponseTime: '5m',
    byType: { info: 4, success: 3, error: 2, warning: 1 },
    byPriority: { low: 2, normal: 5, high: 2, urgent: 1 },
  },
};

// Import components
import Notification from '../../common/Notification.jsx';
import NotificationContainer from '../../common/NotificationContainer.jsx';
import NotificationCenter from '../NotificationCenter.jsx';
import ConnectionStatus from '../../common/ConnectionStatus.jsx';

// Helper function
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Helper to simulate real-time events
const simulateRealtimeEvent = (eventType, data) => {
  const event = new CustomEvent('message', {
    detail: { type: eventType, data }
  });
  window.dispatchEvent(event);
};

describe('Notification End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationStore.notifications = [];
    mockNotificationStore.unreadCount = 0;
    mockNotificationStore.isLoading = false;
    mockNotificationStore.error = null;
    
    // Mock API responses
    mockNotificationStore.fetchNotifications.mockResolvedValue(mockAPIResponses.notifications);
    mockNotificationStore.fetchUnreadCount.mockResolvedValue(mockAPIResponses.unreadCount.count);
    mockNotificationStore.fetchPreferences.mockResolvedValue(mockAPIResponses.preferences);
    mockNotificationStore.connectRealtime.mockResolvedValue(true);
    
    // Mock fetch
    global.fetch.mockImplementation((url) => {
      if (url.includes('/notifications')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.notifications),
        });
      }
      if (url.includes('/unread-count')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.unreadCount),
        });
      }
      if (url.includes('/preferences')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAPIResponses.preferences),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    global.fetch.mockClear();
  });

  describe('Complete User Workflows', () => {
    test('user receives and interacts with notifications end-to-end', async () => {
      const user = userEvent.setup();
      
      // Step 1: User loads the notification center
      renderWithRouter(
        <NotificationCenter userId="e2e-test-user" />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });

      // Step 2: User sees notifications
      await waitFor(() => {
        expect(screen.getByText('E2E Test Info')).toBeInTheDocument();
        expect(screen.getByText('E2E Test Success')).toBeInTheDocument();
        expect(screen.getByText('E2E Test Error')).toBeInTheDocument();
      });

      // Step 3: User sees unread count
      expect(screen.getByText('2')).toBeInTheDocument();

      // Step 4: User clicks on a notification to mark it as read
      const firstNotification = screen.getByText('E2E Test Info');
      await user.click(firstNotification);

      // Verify it was marked as read
      expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('e2e-1');

      // Step 5: User filters notifications by type
      const typeFilter = screen.getByDisplayValue('All Types');
      await user.selectOptions(typeFilter, 'error');

      expect(mockNotificationStore.setFilters).toHaveBeenCalledWith({ type: 'error' });

      // Step 6: User searches for notifications
      const searchInput = screen.getByPlaceholderText('Search notifications...');
      await user.type(searchInput, 'E2E Test Error');

      // Step 7: User uses bulk actions
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first notification

      const markReadButton = screen.getByText('Mark as Read');
      await user.click(markReadButton);

      expect(mockNotificationStore.markAsRead).toHaveBeenCalled();
    });

    test('user manages notification preferences end-to-end', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <NotificationCenter userId="preferences-test-user" showPreferences={true} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });

      // Step 1: User opens preferences modal
      const preferencesButton = screen.getByTitle('Notification preferences');
      await user.click(preferencesButton);

      // Step 2: User sees preferences modal
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();

      // Step 3: User changes email notifications
      const emailCheckbox = screen.getByLabelText('Email Notifications');
      await user.click(emailCheckbox);

      // Step 4: User changes quiet hours
      const quietHoursCheckbox = screen.getByLabelText('Enable Quiet Hours');
      await user.click(quietHoursCheckbox);

      const startTimeInput = screen.getByLabelText('From:');
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '22:00');

      const endTimeInput = screen.getByLabelText('To:');
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '08:00');

      // Step 5: User saves preferences
      const saveButton = screen.getByText('Save Preferences');
      await user.click(saveButton);

      // Verify preferences were saved
      expect(mockNotificationStore.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          emailNotifications: false,
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
          },
        })
      );
    });

    test('user views notification analytics end-to-end', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <NotificationCenter userId="analytics-test-user" showAnalytics={true} />
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });

      // Step 1: User opens analytics modal
      const analyticsButton = screen.getByTitle('View analytics');
      await user.click(analyticsButton);

      // Step 2: User sees analytics modal
      await waitFor(() => {
        expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
      });

      // Step 3: User sees statistics
      expect(screen.getByText('Total Notifications')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Unread count
      expect(screen.getByText('80%')).toBeInTheDocument(); // Read rate
    });
  });

  describe('Real-time Notification Workflows', () => {
    test('user receives real-time notifications', async () => {
      const user = userEvent.setup();
      
      // Step 1: User loads notification container
      renderWithRouter(
        <NotificationContainer />
      );

      // Step 2: Real-time connection is established
      await waitFor(() => {
        expect(mockNotificationStore.connectRealtime).toHaveBeenCalled();
      });

      // Step 3: Simulate receiving a real-time notification
      const realtimeNotification = {
        id: 'realtime-e2e-1',
        type: 'info',
        title: 'Real-time E2E Test',
        message: 'This is a real-time E2E test notification',
        read: false,
        timestamp: new Date().toISOString(),
      };

      // Mock real-time event
      act(() => {
        mockNotificationStore.addNotification(realtimeNotification);
      });

      // Step 4: User sees the new notification
      await waitFor(() => {
        expect(screen.getByText('Real-time E2E Test')).toBeInTheDocument();
      });
    });

    test('user sees real-time notification updates', async () => {
      const user = userEvent.setup();
      
      // Add initial notification
      const initialNotification = {
        id: 'update-e2e-1',
        type: 'info',
        title: 'Initial Title',
        message: 'Initial message',
        read: false,
        timestamp: new Date().toISOString(),
      };

      mockNotificationStore.notifications = [initialNotification];

      renderWithRouter(
        <NotificationContainer />
      );

      // Wait for initial notification
      await waitFor(() => {
        expect(screen.getByText('Initial Title')).toBeInTheDocument();
      });

      // Step 1: Simulate real-time update
      const updatedNotification = {
        id: 'update-e2e-1',
        type: 'info',
        title: 'Updated Title',
        message: 'Updated message',
        read: true,
        timestamp: new Date().toISOString(),
      };

      // Mock real-time update event
      act(() => {
        const index = mockNotificationStore.notifications.findIndex(n => n.id === 'update-e2e-1');
        if (index !== -1) {
          mockNotificationStore.notifications[index] = updatedNotification;
        }
      });

      // Step 2: User sees updated notification
      await waitFor(() => {
        expect(screen.getByText('Updated Title')).toBeInTheDocument();
        expect(screen.getByText('Updated message')).toBeInTheDocument();
      });
    });

    test('user sees real-time notification deletion', async () => {
      const user = userEvent.setup();
      
      // Add initial notifications
      const notifications = [
        {
          id: 'delete-e2e-1',
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          read: false,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'delete-e2e-2',
          type: 'info',
          title: 'Notification 2',
          message: 'Message 2',
          read: false,
          timestamp: new Date().toISOString(),
        },
      ];

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationContainer />
      );

      // Wait for initial notifications
      await waitFor(() => {
        expect(screen.getByText('Notification 1')).toBeInTheDocument();
        expect(screen.getByText('Notification 2')).toBeInTheDocument();
      });

      // Step 1: Simulate real-time deletion
      act(() => {
        mockNotificationStore.notifications = mockNotificationStore.notifications.filter(
          n => n.id !== 'delete-e2e-1'
        );
      });

      // Step 2: User sees notification removed
      await waitFor(() => {
        expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
        expect(screen.getByText('Notification 2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Workflows', () => {
    test('user handles network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      mockNotificationStore.fetchNotifications.mockRejectedValue(new Error('Network Error'));
      mockNotificationStore.error = 'Network Error';

      renderWithRouter(
        <NotificationCenter userId="error-test-user" />
      );

      // Step 1: User sees error state
      await waitFor(() => {
        expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });

      // Step 2: User can retry
      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // Step 3: Error is cleared and retried
      expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledTimes(2);
    });

    test('user handles real-time connection errors', async () => {
      const user = userEvent.setup();
      
      // Mock connection error
      mockNotificationStore.connectRealtime.mockRejectedValue(new Error('Connection Error'));
      mockNotificationStore.realtimeConnected = false;

      renderWithRouter(
        <ConnectionStatus
          isConnected={false}
          lastError="Connection Error"
          onReconnect={jest.fn()}
        />
      );

      // Step 1: User sees connection error
      expect(screen.getByText('Connection Error')).toBeInTheDocument();

      // Step 2: User can reconnect
      const reconnectButton = screen.getByText('Reconnect');
      await user.click(reconnectButton);

      // Verify reconnect was attempted
      expect(screen.getByText('Reconnect')).toBeInTheDocument();
    });
  });

  describe('Performance Workflows', () => {
    test('user experiences smooth performance with many notifications', async () => {
      const user = userEvent.setup();
      
      // Create many notifications
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-e2e-${i}`,
        type: 'info',
        title: `Performance Test ${i}`,
        message: `This is performance test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = manyNotifications;

      const startTime = performance.now();

      renderWithRouter(
        <NotificationCenter userId="performance-test-user" />
      );

      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with many notifications
      expect(renderTime).toBeLessThan(500);

      // Step 1: User can still interact smoothly
      const searchInput = screen.getByPlaceholderText('Search notifications...');
      await user.type(searchInput, 'Performance Test 50');

      await waitFor(() => {
        expect(screen.getByText('Performance Test 50')).toBeInTheDocument();
      });
    });

    test('user experiences smooth animations', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <NotificationContainer />
      );

      // Step 1: Add notification with animation
      const notification = {
        id: 'animation-e2e-1',
        type: 'success',
        title: 'Animation Test',
        message: 'This notification should animate smoothly',
        read: false,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        mockNotificationStore.addNotification(notification);
      });

      // Step 2: Notification appears with animation
      await waitFor(() => {
        expect(screen.getByText('Animation Test')).toBeInTheDocument();
      });

      // Step 3: Remove notification with animation
      act(() => {
        mockNotificationStore.removeNotification('animation-e2e-1');
      });

      await waitFor(() => {
        expect(screen.queryByText('Animation Test')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Workflows', () => {
    test('user interacts with notifications on mobile', async () => {
      const user = userEvent.setup();
      
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      mockNotificationStore.notifications = mockAPIResponses.notifications.data;

      renderWithRouter(
        <NotificationCenter userId="mobile-test-user" />
      );

      // Step 1: User sees mobile-optimized interface
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });

      // Step 2: User can swipe to dismiss (simulated with click)
      const dismissButtons = screen.getAllByLabelText('Dismiss notification');
      await user.click(dismissButtons[0]);

      expect(mockNotificationStore.removeNotification).toHaveBeenCalled();

      // Step 3: User can tap to open details
      const notifications = screen.getAllByRole('alert');
      await user.click(notifications[0]);

      expect(mockNotificationStore.markAsRead).toHaveBeenCalled();

      // Clean up
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      });
    });
  });

  describe('Accessibility Workflows', () => {
    test('user navigates with keyboard', async () => {
      const user = userEvent.setup();
      
      mockNotificationStore.notifications = mockAPIResponses.notifications.data;

      renderWithRouter(
        <NotificationCenter userId="a11y-test-user" />
      );

      // Step 1: User tabs through interface
      await user.tab();
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /list view/i })).toHaveFocus();

      // Step 2: User navigates tabs with arrow keys
      const firstTab = screen.getByText('All');
      firstTab.focus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('Unread')).toHaveFocus();

      // Step 3: User activates with Enter
      await user.keyboard('{Enter}');
      expect(mockNotificationStore.setFilters).toHaveBeenCalledWith({ status: 'delivered' });
    });

    test('user uses screen reader', async () => {
      renderWithRouter(
        <NotificationContainer />
      );

      // Step 1: Add notification
      const notification = {
        id: 'sr-e2e-1',
        type: 'info',
        title: 'Screen Reader Test',
        message: 'This notification should be accessible',
        read: false,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        mockNotificationStore.addNotification(notification);
      });

      // Step 2: Verify screen reader accessibility
      await waitFor(() => {
        const notificationElement = screen.getByRole('alert');
        expect(notificationElement).toHaveAttribute('aria-live', 'polite');
        expect(notificationElement).toHaveTextContent('Screen Reader Test');
        expect(notificationElement).toHaveTextContent('This notification should be accessible');
      });
    });
  });

  describe('Data Persistence Workflows', () => {
    test('user preferences persist across sessions', async () => {
      const user = userEvent.setup();
      
      // Step 1: User sets preferences
      const preferences = {
        emailNotifications: false,
        smsNotifications: true,
        pushNotifications: false,
        inAppNotifications: true,
      };

      mockNotificationStore.preferences = preferences;

      renderWithRouter(
        <NotificationCenter userId="persistence-test-user" showPreferences={true} />
      );

      // Step 2: User opens preferences modal
      const preferencesButton = screen.getByTitle('Notification preferences');
      await user.click(preferencesButton);

      // Step 3: User sees saved preferences
      expect(screen.getByLabelText('Email Notifications')).not.toBeChecked();
      expect(screen.getByLabelText('SMS Notifications')).toBeChecked();
      expect(screen.getByLabelText('Push Notifications')).not.toBeChecked();
      expect(screen.getByLabelText('In-App Notifications')).toBeChecked();
    });

    test('user notification state persists', async () => {
      const user = userEvent.setup();
      
      // Step 1: User has existing notifications
      const existingNotifications = [
        {
          id: 'persist-e2e-1',
          type: 'info',
          title: 'Persistent Notification',
          message: 'This notification should persist',
          read: true,
          timestamp: new Date().toISOString(),
        },
      ];

      mockNotificationStore.notifications = existingNotifications;

      renderWithRouter(
        <NotificationCenter userId="persist-test-user" />
      );

      // Step 2: User sees persisted notifications
      await waitFor(() => {
        expect(screen.getByText('Persistent Notification')).toBeInTheDocument();
      });

      // Step 3: User sees correct read state
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('opacity-75'); // Read notification styling
    });
  });

  describe('Integration Workflows', () => {
    test('notification system integrates with other components', async () => {
      const user = userEvent.setup();
      
      // Step 1: User navigates to different parts of app
      renderWithRouter(
        <BrowserRouter>
          <div>
            <NotificationCenter userId="integration-test-user" />
            <div>Other app content here</div>
          </div>
        </BrowserRouter>
      );

      // Step 2: User receives notification while in other part of app
      const notification = {
        id: 'integration-e2e-1',
        type: 'success',
        title: 'Integration Test',
        message: 'This notification integrates with other components',
        read: false,
        timestamp: new Date().toISOString(),
      };

      act(() => {
        mockNotificationStore.addNotification(notification);
      });

      // Step 3: User sees notification regardless of current location
      await waitFor(() => {
        expect(screen.getByText('Integration Test')).toBeInTheDocument();
      });
    });

    test('notification system handles user authentication', async () => {
      const user = userEvent.setup();
      
      // Step 1: User logs in
      renderWithRouter(
        <NotificationCenter userId="auth-test-user" />
      );

      // Step 2: System connects to real-time service with user ID
      await waitFor(() => {
        expect(mockNotificationStore.connectRealtime).toHaveBeenCalled();
      });

      // Step 3: User logs out (simulated)
      act(() => {
        mockNotificationStore.disconnectRealtime();
        mockNotificationStore.clearAllNotifications();
      });

      // Step 4: System cleans up user data
      expect(mockNotificationStore.disconnectRealtime).toHaveBeenCalled();
      expect(mockNotificationStore.clearAllNotifications).toHaveBeenCalled();
    });
  });
});