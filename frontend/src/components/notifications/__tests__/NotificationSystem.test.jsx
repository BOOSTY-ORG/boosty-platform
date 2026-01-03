import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock the notification store
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
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
  showMessage: jest.fn(),
  showTask: jest.fn(),
  getRealtimeStats: jest.fn(),
  sendRealtimeMessage: jest.fn(),
  updateRealtimePreferences: jest.fn(),
};

// Mock the notification API
const mockNotificationAPI = {
  setUserId: jest.fn(),
  getNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  getUserPreferences: jest.fn(),
  updateUserPreferences: jest.fn(),
  getNotificationStats: jest.fn(),
  markAsRead: jest.fn(),
  markAsUnread: jest.fn(),
  deleteNotification: jest.fn(),
  markAllAsRead: jest.fn(),
  bulkOperation: jest.fn(),
  connectRealtime: jest.fn(),
  disconnectRealtime: jest.fn(),
  subscribeToRealtimeEvents: jest.fn(),
  unsubscribeFromRealtimeEvents: jest.fn(),
  isRealtimeConnected: jest.fn(),
  clearCache: jest.fn(),
};

// Mock the realtime notification service
const mockRealtimeService = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  sendMessage: jest.fn(),
  getConnectionStats: jest.fn(),
  isConnectionActive: jest.fn(),
  cleanup: jest.fn(),
};

// Mock modules
jest.mock('../../stores/index.js', () => ({
  useNotificationStore: () => mockNotificationStore,
}));

jest.mock('../../api/index.js', () => ({
  notificationAPI: mockNotificationAPI,
}));

jest.mock('../../services/realtimeNotificationService.js', () => ({
  realtimeNotificationService: mockRealtimeService,
}));

// Import components to test
import Notification from '../../common/Notification.jsx';
import NotificationContainer from '../../common/NotificationContainer.jsx';
import NotificationCenter from '../NotificationCenter.jsx';
import MessageNotification from '../MessageNotification.jsx';
import TaskNotification from '../TaskNotification.jsx';
import ErrorNotification from '../ErrorNotification.jsx';
import SuccessNotification from '../SuccessNotification.jsx';
import ConnectionStatus from '../../common/ConnectionStatus.jsx';

// Test data
const mockNotifications = [
  {
    id: '1',
    type: 'info',
    title: 'Test Info',
    message: 'This is a test info notification',
    read: false,
    timestamp: '2023-12-01T10:00:00Z',
    priority: 'normal',
  },
  {
    id: '2',
    type: 'success',
    title: 'Test Success',
    message: 'This is a test success notification',
    read: false,
    timestamp: '2023-12-01T11:00:00Z',
    priority: 'normal',
  },
  {
    id: '3',
    type: 'error',
    title: 'Test Error',
    message: 'This is a test error notification',
    read: false,
    timestamp: '2023-12-01T12:00:00Z',
    priority: 'high',
  },
];

const mockUserPreferences = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  inAppNotifications: true,
  types: {
    info: { email: true, sms: false, push: true, inApp: true },
    success: { email: true, sms: false, push: true, inApp: true },
    error: { email: true, sms: true, push: true, inApp: true },
    warning: { email: true, sms: false, push: true, inApp: true },
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  },
};

// Helper function to render components with Router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Notification System Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationStore.notifications = [];
    mockNotificationStore.unreadCount = 0;
    mockNotificationStore.isLoading = false;
    mockNotificationStore.error = null;
    mockNotificationStore.realtimeConnected = false;
    
    // Mock API responses
    mockNotificationAPI.getNotifications.mockResolvedValue({
      data: mockNotifications,
      pagination: { page: 1, limit: 20, total: 3, pages: 1 },
    });
    mockNotificationAPI.getUnreadCount.mockResolvedValue(2);
    mockNotificationAPI.getUserPreferences.mockResolvedValue(mockUserPreferences);
    mockNotificationAPI.getNotificationStats.mockResolvedValue({
      total: 10,
      unread: 2,
      readRate: 80,
      avgResponseTime: '5m',
      byType: { info: 4, success: 3, error: 2, warning: 1 },
      byPriority: { low: 2, normal: 5, high: 2, urgent: 1 },
    });
  });

  describe('Base Notification Component', () => {
    test('renders notification with correct content', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Test Title"
          message="Test message"
          show={true}
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    test('renders correct icon based on type', () => {
      const { rerender } = renderWithRouter(
        <Notification type="success" message="Success message" />
      );

      // Check for success icon (checkmark)
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(
        <Notification type="error" message="Error message" />
      );

      // Check for error icon (X)
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('auto-dismisses after specified duration', async () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      renderWithRouter(
        <Notification
          type="info"
          message="Auto dismiss test"
          autoClose={true}
          duration={5000}
          onClose={onClose}
        />
      );

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    test('shows progress bar for auto-dismiss notifications', () => {
      renderWithRouter(
        <Notification
          type="info"
          message="Progress test"
          autoClose={true}
          duration={5000}
        />
      );

      const progressBar = screen.getByRole('alert').querySelector('.bg-current');
      expect(progressBar).toBeInTheDocument();
    });

    test('handles click events correctly', () => {
      const onClick = jest.fn();
      renderWithRouter(
        <Notification
          type="info"
          message="Click test"
          onClick={onClick}
        />
      );

      fireEvent.click(screen.getByRole('alert'));
      expect(onClick).toHaveBeenCalled();
    });

    test('handles close button click', () => {
      const onClose = jest.fn();
      renderWithRouter(
        <Notification
          type="info"
          message="Close test"
          onClose={onClose}
        />
      );

      const closeButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    });

    test('displays action button when provided', () => {
      renderWithRouter(
        <Notification
          type="info"
          message="Action test"
          actionUrl="https://example.com"
          actionText="View Details"
        />
      );

      const actionButton = screen.getByText('View Details');
      expect(actionButton).toBeInTheDocument();
    });

    test('formats timestamp correctly', () => {
      const now = new Date();
      const timestamp = now.toISOString();
      
      renderWithRouter(
        <Notification
          type="info"
          message="Timestamp test"
          timestamp={timestamp}
        />
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    test('applies correct priority styling', () => {
      const { rerender } = renderWithRouter(
        <Notification
          type="info"
          message="Priority test"
          priority="normal"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('border-l-4');

      rerender(
        <Notification
          type="info"
          message="Priority test"
          priority="urgent"
        />
      );

      expect(screen.getByRole('alert')).toHaveClass('border-l-8', 'animate-pulse');
    });

    test('shows unread indicator', () => {
      renderWithRouter(
        <Notification
          type="info"
          message="Unread test"
          read={false}
        />
      );

      const unreadIndicator = screen.getByRole('alert').querySelector('.bg-current.rounded-full');
      expect(unreadIndicator).toBeInTheDocument();
    });
  });

  describe('Notification Container', () => {
    test('renders notification container with correct positioning', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationContainer position="top-right" />
      );

      const container = screen.getByRole('region', { name: 'Notifications' });
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('fixed', 'top-4', 'right-4');
    });

    test('limits notifications to maxNotifications prop', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationContainer maxNotifications={2} />
      );

      const notifications = screen.getAllByRole('alert');
      expect(notifications).toHaveLength(2);
    });

    test('shows unread count when enabled', () => {
      mockNotificationStore.notifications = mockNotifications;
      mockNotificationStore.unreadCount = 2;
      
      renderWithRouter(
        <NotificationContainer showUnreadCount={true} />
      );

      expect(screen.getByText('2 unread notifications')).toBeInTheDocument();
    });

    test('handles keyboard navigation', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationContainer />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockNotificationStore.removeNotification).toHaveBeenCalledWith('1');
    });

    test('connects to real-time service on mount', () => {
      mockNotificationStore.realtimeConnected = false;
      
      renderWithRouter(
        <NotificationContainer />
      );

      expect(mockNotificationStore.connectRealtime).toHaveBeenCalled();
    });

    test('marks notification as read on click', () => {
      const notification = { ...mockNotifications[0], read: false };
      mockNotificationStore.notifications = [notification];
      
      renderWithRouter(
        <NotificationContainer />
      );

      const notificationElement = screen.getByRole('alert');
      fireEvent.click(notificationElement);
      
      expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('1');
    });
  });

  describe('Notification Center', () => {
    test('renders notification center with all components', () => {
      mockNotificationStore.notifications = mockNotifications;
      mockNotificationStore.unreadCount = 2;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      expect(screen.getByText('Notification Center')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Unread count
    });

    test('switches between view modes', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      const gridViewButton = screen.getByTitle('Grid view');
      fireEvent.click(gridViewButton);
      
      // Check if grid view is activated
      expect(gridViewButton).toHaveClass('active');
    });

    test('switches between tabs', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      const unreadTab = screen.getByText('Unread');
      fireEvent.click(unreadTab);
      
      expect(mockNotificationStore.setFilters).toHaveBeenCalledWith({
        status: 'delivered'
      });
    });

    test('handles search functionality', async () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      const searchInput = screen.getByPlaceholderText('Search notifications...');
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      await waitFor(() => {
        expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test search'
          })
        );
      });
    });

    test('handles filter changes', () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      const typeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(typeFilter, { target: { value: 'error' } });
      
      expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error'
        })
      );
    });

    test('handles bulk actions', async () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      // Select first notification
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      
      // Click mark as read button
      const markReadButton = screen.getByText('Mark as Read');
      fireEvent.click(markReadButton);
      
      await waitFor(() => {
        expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('1');
      });
    });

    test('shows empty state when no notifications', () => {
      mockNotificationStore.notifications = [];
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up! Check back later for new notifications.")).toBeInTheDocument();
    });

    test('shows error state', () => {
      mockNotificationStore.notifications = [];
      mockNotificationStore.error = 'Failed to load notifications';
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });

    test('opens preferences modal', () => {
      mockNotificationStore.notifications = mockNotifications;
      mockNotificationStore.preferences = mockUserPreferences;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      const preferencesButton = screen.getByTitle('Notification preferences');
      fireEvent.click(preferencesButton);
      
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });

    test('opens analytics modal', async () => {
      mockNotificationStore.notifications = mockNotifications;
      
      renderWithRouter(
        <NotificationCenter userId="test-user" showAnalytics={true} />
      );

      const analyticsButton = screen.getByTitle('View analytics');
      fireEvent.click(analyticsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
      });
    });

    test('handles infinite scroll', async () => {
      mockNotificationStore.notifications = mockNotifications;
      mockNotificationStore.pagination = { page: 1, limit: 20, total: 50, pages: 3 };
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      // Mock intersection observer
      const mockObserver = {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
      
      global.IntersectionObserver = jest.fn(() => mockObserver);
      
      // Trigger load more
      const loadMoreTrigger = document.querySelector('.load-more-trigger');
      if (loadMoreTrigger) {
        mockObserver.callback([{ isIntersecting: true }]);
        
        await waitFor(() => {
          expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledWith(
            expect.objectContaining({
              page: 2
            })
          );
        });
      }
    });
  });

  describe('Specialized Notification Components', () => {
    test('MessageNotification renders correctly', () => {
      const messageData = {
        sender: 'John Doe',
        subject: 'Test Message',
        content: 'This is a test message',
        timestamp: '2023-12-01T10:00:00Z',
      };

      renderWithRouter(
        <MessageNotification
          id="1"
          {...messageData}
          onReply={jest.fn()}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Message')).toBeInTheDocument();
      expect(screen.getByText('This is a test message')).toBeInTheDocument();
    });

    test('TaskNotification renders correctly', () => {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        dueDate: '2023-12-15',
        priority: 'high',
      };

      renderWithRouter(
        <TaskNotification
          id="1"
          {...taskData}
          onViewTask={jest.fn()}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('This is a test task')).toBeInTheDocument();
    });

    test('ErrorNotification renders correctly', () => {
      const errorData = {
        title: 'Test Error',
        message: 'This is a test error',
        errorCode: 'TEST_001',
      };

      renderWithRouter(
        <ErrorNotification
          id="1"
          {...errorData}
          onRetry={jest.fn()}
        />
      );

      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('This is a test error')).toBeInTheDocument();
      expect(screen.getByText('TEST_001')).toBeInTheDocument();
    });

    test('SuccessNotification renders correctly', () => {
      const successData = {
        title: 'Test Success',
        message: 'This is a test success notification',
        actionUrl: 'https://example.com',
      };

      renderWithRouter(
        <SuccessNotification
          id="1"
          {...successData}
          onShare={jest.fn()}
        />
      );

      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('This is a test success notification')).toBeInTheDocument();
    });
  });

  describe('Connection Status Component', () => {
    test('shows connected status', () => {
      renderWithRouter(
        <ConnectionStatus
          isConnected={true}
          connectionType="websocket"
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('WEBSOCKET')).toBeInTheDocument();
    });

    test('shows connecting status', () => {
      renderWithRouter(
        <ConnectionStatus
          isConnecting={true}
          connectionType="sse"
        />
      );

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    test('shows disconnected status', () => {
      renderWithRouter(
        <ConnectionStatus
          isConnected={false}
          connectionType="websocket"
        />
      );

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    test('shows error status', () => {
      renderWithRouter(
        <ConnectionStatus
          isConnected={false}
          lastError="Connection failed"
          connectionType="sse"
        />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
    });

    test('handles reconnect button', () => {
      const onReconnect = jest.fn();
      
      renderWithRouter(
        <ConnectionStatus
          isConnected={false}
          onReconnect={onReconnect}
        />
      );

      const reconnectButton = screen.getByText('Reconnect');
      fireEvent.click(reconnectButton);
      
      expect(onReconnect).toHaveBeenCalled();
    });

    test('handles connection type change', () => {
      const onConnectionTypeChange = jest.fn();
      
      renderWithRouter(
        <ConnectionStatus
          isConnected={true}
          onConnectionTypeChange={onConnectionTypeChange}
        />
      );

      // Expand details
      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);
      
      // Change connection type
      const selectElement = screen.getByDisplayValue('WebSocket');
      fireEvent.change(selectElement, { target: { value: 'sse' } });
      
      expect(onConnectionTypeChange).toHaveBeenCalledWith('sse');
    });
  });

  describe('Notification Store Integration', () => {
    test('adds notification correctly', () => {
      const notificationData = {
        type: 'info',
        title: 'Test Notification',
        message: 'Test message',
      };

      mockNotificationStore.addNotification(notificationData);
      
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(notificationData);
    });

    test('removes notification correctly', () => {
      mockNotificationStore.removeNotification('1');
      
      expect(mockNotificationStore.removeNotification).toHaveBeenCalledWith('1');
    });

    test('marks notification as read', async () => {
      mockNotificationStore.markAsRead('1');
      
      expect(mockNotificationStore.markAsRead).toHaveBeenCalledWith('1');
    });

    test('shows convenience methods', () => {
      mockNotificationStore.showSuccess('Success message');
      expect(mockNotificationStore.showSuccess).toHaveBeenCalledWith('Success message', 'Success', {});
      
      mockNotificationStore.showError('Error message');
      expect(mockNotificationStore.showError).toHaveBeenCalledWith('Error message', 'Error', {});
      
      mockNotificationStore.showWarning('Warning message');
      expect(mockNotificationStore.showWarning).toHaveBeenCalledWith('Warning message', 'Warning', {});
      
      mockNotificationStore.showInfo('Info message');
      expect(mockNotificationStore.showInfo).toHaveBeenCalledWith('Info message', 'Info', {});
    });
  });

  describe('Real-time Integration', () => {
    test('connects to real-time service', async () => {
      mockNotificationStore.connectRealtime.mockResolvedValue(true);
      
      await mockNotificationStore.connectRealtime();
      
      expect(mockNotificationStore.connectRealtime).toHaveBeenCalled();
    });

    test('disconnects from real-time service', () => {
      mockNotificationStore.disconnectRealtime();
      
      expect(mockNotificationStore.disconnectRealtime).toHaveBeenCalled();
    });

    test('gets connection statistics', () => {
      const mockStats = {
        isConnected: true,
        connectionType: 'websocket',
        reconnectAttempts: 0,
      };
      
      mockNotificationStore.getRealtimeStats.mockReturnValue(mockStats);
      
      const stats = mockNotificationStore.getRealtimeStats();
      
      expect(stats).toEqual(mockStats);
    });

    test('sends real-time message', () => {
      const message = { type: 'test', data: 'test data' };
      
      mockNotificationStore.sendRealtimeMessage(message);
      
      expect(mockNotificationStore.sendRealtimeMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      mockNotificationAPI.getNotifications.mockRejectedValue(new Error('API Error'));
      
      renderWithRouter(
        <NotificationCenter userId="test-user" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load notifications/)).toBeInTheDocument();
      });
    });

    test('handles network errors', async () => {
      mockNotificationAPI.getUnreadCount.mockRejectedValue(new Error('Network Error'));
      
      renderWithRouter(
        <NotificationContainer />
      );

      // Should not crash, just handle the error
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });

    test('handles malformed notifications', () => {
      const malformedNotifications = [
        { id: '1' }, // Missing required fields
        { type: 'invalid', message: 'test' }, // Invalid type
        null, // Null notification
      ];
      
      mockNotificationStore.notifications = malformedNotifications;
      
      renderWithRouter(
        <NotificationContainer />
      );

      // Should render without crashing
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    test('handles large number of notifications', () => {
      const largeNotificationList = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        type: 'info',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        read: false,
      }));
      
      mockNotificationStore.notifications = largeNotificationList;
      
      renderWithRouter(
        <NotificationContainer maxNotifications={5} />
      );

      // Should only render maxNotifications
      const notifications = screen.getAllByRole('alert');
      expect(notifications).toHaveLength(5);
    });

    test('cleans up on unmount', () => {
      const { unmount } = renderWithRouter(
        <NotificationContainer />
      );

      unmount();
      
      expect(mockNotificationStore.disconnectRealtime).toHaveBeenCalled();
    });
  });
});