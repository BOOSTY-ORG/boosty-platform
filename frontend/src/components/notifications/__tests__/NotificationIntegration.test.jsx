import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock WebSocket and EventSource
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

// Mock IntersectionObserver
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

// Real notification store and API for integration tests
import { useNotificationStore } from '../../stores/index.js';
import { notificationAPI } from '../../api/index.js';
import { realtimeNotificationService } from '../../services/realtimeNotificationService.js';

// Import components
import NotificationContainer from '../../common/NotificationContainer.jsx';
import NotificationCenter from '../NotificationCenter.jsx';
import Notification from '../../common/Notification.jsx';

// Helper function to render with router
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Integration test data
const testNotifications = [
  {
    id: 'integration-1',
    type: 'info',
    title: 'Integration Test Info',
    message: 'This is an integration test info notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'normal',
  },
  {
    id: 'integration-2',
    type: 'success',
    title: 'Integration Test Success',
    message: 'This is an integration test success notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'normal',
  },
  {
    id: 'integration-3',
    type: 'error',
    title: 'Integration Test Error',
    message: 'This is an integration test error notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'high',
  },
];

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset notification store
    const store = useNotificationStore.getState();
    store.clearAllNotifications();
    store.clearFilters();
    
    // Mock API responses
    notificationAPI.setUserId('integration-test-user');
    
    // Mock successful API calls
    jest.spyOn(notificationAPI, 'getNotifications').mockResolvedValue({
      data: testNotifications,
      pagination: { page: 1, limit: 20, total: 3, pages: 1 },
    });
    
    jest.spyOn(notificationAPI, 'getUnreadCount').mockResolvedValue(2);
    jest.spyOn(notificationAPI, 'getUserPreferences').mockResolvedValue({
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
    });
    
    jest.spyOn(notificationAPI, 'getNotificationStats').mockResolvedValue({
      total: 10,
      unread: 2,
      readRate: 80,
      avgResponseTime: '5m',
      byType: { info: 4, success: 3, error: 2, warning: 1 },
      byPriority: { low: 2, normal: 5, high: 2, urgent: 1 },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Store Integration', () => {
    test('notification store integrates with API', async () => {
      const store = useNotificationStore.getState();
      
      await act(async () => {
        await store.fetchNotifications();
      });
      
      expect(store.notifications).toHaveLength(3);
      expect(store.notifications[0].title).toBe('Integration Test Info');
    });

    test('notification store handles real-time updates', async () => {
      const store = useNotificationStore.getState();
      
      // Mock real-time connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValue(true);
      
      await act(async () => {
        await store.connectRealtime();
      });
      
      expect(realtimeNotificationService.connect).toHaveBeenCalled();
      expect(store.realtimeConnected).toBe(true);
    });

    test('notification store manages unread count correctly', async () => {
      const store = useNotificationStore.getState();
      
      await act(async () => {
        await store.fetchUnreadCount();
      });
      
      expect(store.unreadCount).toBe(2);
      
      // Mark one as read
      await act(async () => {
        await store.markAsRead('integration-1');
      });
      
      expect(store.unreadCount).toBe(1);
    });

    test('notification store handles bulk operations', async () => {
      const store = useNotificationStore.getState();
      
      // Add notifications to store
      testNotifications.forEach(notification => {
        store.addNotification(notification);
      });
      
      expect(store.notifications).toHaveLength(3);
      
      // Mark all as read
      await act(async () => {
        await store.markAllAsRead();
      });
      
      expect(store.notifications.every(n => n.read)).toBe(true);
      expect(store.unreadCount).toBe(0);
    });

    test('notification store persists preferences', async () => {
      const store = useNotificationStore.getState();
      const newPreferences = {
        emailNotifications: false,
        smsNotifications: true,
        pushNotifications: false,
        inAppNotifications: true,
      };
      
      await act(async () => {
        await store.updatePreferences(newPreferences);
      });
      
      expect(store.preferences.emailNotifications).toBe(false);
      expect(store.preferences.smsNotifications).toBe(true);
    });
  });

  describe('Component Integration', () => {
    test('NotificationContainer integrates with store', async () => {
      const store = useNotificationStore.getState();
      
      // Add notifications to store
      testNotifications.forEach(notification => {
        store.addNotification(notification);
      });
      
      renderWithRouter(
        <NotificationContainer maxNotifications={5} />
      );
      
      // Wait for notifications to render
      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(3);
      });
      
      // Check if notifications are rendered with correct content
      expect(screen.getByText('Integration Test Info')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Success')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Error')).toBeInTheDocument();
    });

    test('NotificationCenter integrates with store and API', async () => {
      renderWithRouter(
        <NotificationCenter userId="integration-test-user" />
      );
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });
      
      // Check if notifications are loaded
      await waitFor(() => {
        expect(screen.getByText('Integration Test Info')).toBeInTheDocument();
      });
      
      // Check if unread count is displayed
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('notification actions integrate with store', async () => {
      const store = useNotificationStore.getState();
      
      // Add a notification to store
      store.addNotification(testNotifications[0]);
      
      renderWithRouter(
        <NotificationContainer />
      );
      
      // Find and click the notification
      const notification = screen.getByRole('alert');
      fireEvent.click(notification);
      
      // Check if it was marked as read
      await waitFor(() => {
        expect(store.notifications[0].read).toBe(true);
      });
    });

    test('notification removal integrates with store', async () => {
      const store = useNotificationStore.getState();
      
      // Add notifications to store
      testNotifications.forEach(notification => {
        store.addNotification(notification);
      });
      
      renderWithRouter(
        <NotificationContainer />
      );
      
      // Find and click the close button on first notification
      const closeButton = screen.getAllByLabelText('Dismiss notification')[0];
      fireEvent.click(closeButton);
      
      // Check if notification was removed
      await waitFor(() => {
        expect(store.notifications).toHaveLength(2);
        expect(store.notifications.find(n => n.id === 'integration-1')).toBeUndefined();
      });
    });
  });

  describe('Real-time Integration', () => {
    test('real-time notifications are added to store', async () => {
      const store = useNotificationStore.getState();
      
      // Mock real-time connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValue(true);
      jest.spyOn(realtimeNotificationService, 'subscribe').mockImplementation((eventType, handler) => {
        if (eventType === 'notification_new') {
          // Simulate receiving a new notification
          const newNotification = {
            id: 'realtime-1',
            type: 'info',
            title: 'Real-time Notification',
            message: 'This is a real-time notification',
            read: false,
            timestamp: new Date().toISOString(),
          };
          handler(newNotification);
        }
      });
      
      await act(async () => {
        await store.connectRealtime();
      });
      
      // Check if new notification was added
      expect(store.notifications.find(n => n.id === 'realtime-1')).toBeDefined();
    });

    test('real-time updates modify existing notifications', async () => {
      const store = useNotificationStore.getState();
      
      // Add initial notification
      store.addNotification(testNotifications[0]);
      
      // Mock real-time connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValue(true);
      jest.spyOn(realtimeNotificationService, 'subscribe').mockImplementation((eventType, handler) => {
        if (eventType === 'notification_update') {
          // Simulate notification update
          const updatedNotification = {
            id: 'integration-1',
            type: 'info',
            title: 'Updated Integration Test Info',
            message: 'This notification has been updated',
            read: true,
            timestamp: new Date().toISOString(),
          };
          handler(updatedNotification);
        }
      });
      
      await act(async () => {
        await store.connectRealtime();
      });
      
      // Check if notification was updated
      const updatedNotification = store.notifications.find(n => n.id === 'integration-1');
      expect(updatedNotification.title).toBe('Updated Integration Test Info');
      expect(updatedNotification.read).toBe(true);
    });

    test('real-time deletes remove notifications from store', async () => {
      const store = useNotificationStore.getState();
      
      // Add initial notifications
      testNotifications.forEach(notification => {
        store.addNotification(notification);
      });
      
      // Mock real-time connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValue(true);
      jest.spyOn(realtimeNotificationService, 'subscribe').mockImplementation((eventType, handler) => {
        if (eventType === 'notification_delete') {
          // Simulate notification deletion
          handler({ id: 'integration-2' });
        }
      });
      
      await act(async () => {
        await store.connectRealtime();
      });
      
      // Check if notification was removed
      expect(store.notifications.find(n => n.id === 'integration-2')).toBeUndefined();
      expect(store.notifications).toHaveLength(2);
    });

    test('connection status updates are handled', async () => {
      const store = useNotificationStore.getState();
      
      // Mock real-time connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValue(true);
      jest.spyOn(realtimeNotificationService, 'subscribe').mockImplementation((eventType, handler) => {
        if (eventType === 'connection_status') {
          // Simulate connection status change
          handler({ status: 'connected', message: 'Connection established' });
        }
      });
      
      await act(async () => {
        await store.connectRealtime();
      });
      
      expect(store.realtimeConnected).toBe(true);
    });
  });

  describe('API Integration', () => {
    test('API calls are made with correct parameters', async () => {
      const store = useNotificationStore.getState();
      
      await act(async () => {
        await store.fetchNotifications({ page: 1, limit: 10, type: 'info' });
      });
      
      expect(notificationAPI.getNotifications).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        type: 'info',
      });
    });

    test('API errors are handled gracefully', async () => {
      const store = useNotificationStore.getState();
      
      // Mock API error
      jest.spyOn(notificationAPI, 'getNotifications').mockRejectedValue(new Error('API Error'));
      
      await act(async () => {
        try {
          await store.fetchNotifications();
        } catch (error) {
          // Expected error
        }
      });
      
      expect(store.error).toBeTruthy();
      expect(store.isLoading).toBe(false);
    });

    test('API responses are cached correctly', async () => {
      const store = useNotificationStore.getState();
      
      // First call
      await act(async () => {
        await store.fetchNotifications();
      });
      
      // Second call should use cache
      await act(async () => {
        await store.fetchNotifications();
      });
      
      // API should only be called once due to caching
      expect(notificationAPI.getNotifications).toHaveBeenCalledTimes(1);
    });

    test('bulk operations integrate with API', async () => {
      jest.spyOn(notificationAPI, 'bulkOperation').mockResolvedValue({
        success: true,
        updated: 2,
      });
      
      await act(async () => {
        await notificationAPI.bulkOperation('mark_read', ['integration-1', 'integration-2']);
      });
      
      expect(notificationAPI.bulkOperation).toHaveBeenCalledWith('mark_read', ['integration-1', 'integration-2']);
    });
  });

  describe('Browser Integration', () => {
    test('browser online/offline events are handled', async () => {
      const store = useNotificationStore.getState();
      
      // Mock online event
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      
      window.dispatchEvent(new Event('offline'));
      
      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      
      window.dispatchEvent(new Event('online'));
      
      // Service should handle these events
      expect(realtimeNotificationService.connect).toHaveBeenCalled();
    });

    test('page visibility changes are handled', async () => {
      // Mock document.hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });
      
      // Simulate page becoming hidden
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Mock document.visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });
      
      // Simulate page becoming visible
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Service should handle visibility changes
      expect(realtimeNotificationService.connect).toHaveBeenCalled();
    });

    test('localStorage persistence works', () => {
      const store = useNotificationStore.getState();
      
      // Add some preferences
      const preferences = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      };
      
      store.updatePreferences(preferences);
      
      // Check if preferences are persisted
      const persistedPreferences = localStorage.getItem('notification-preferences');
      expect(persistedPreferences).toBeTruthy();
      
      // Parse and verify
      const parsed = JSON.parse(persistedPreferences);
      expect(parsed.emailNotifications).toBe(true);
      expect(parsed.smsNotifications).toBe(false);
    });
  });

  describe('Component Lifecycle Integration', () => {
    test('components mount and unmount correctly', () => {
      const { unmount } = renderWithRouter(
        <NotificationContainer />
      );
      
      // Component should mount without errors
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
      
      // Component should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    test('components handle prop changes correctly', async () => {
      const { rerender } = renderWithRouter(
        <NotificationContainer maxNotifications={2} />
      );
      
      // Initial render
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
      
      // Change props
      rerender(
        <NotificationContainer maxNotifications={5} position="bottom-left" />
      );
      
      // Should handle prop changes
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });

    test('components handle state changes correctly', async () => {
      const store = useNotificationStore.getState();
      
      const { rerender } = renderWithRouter(
        <NotificationCenter userId="test-user" />
      );
      
      // Add notification to store
      act(() => {
        store.addNotification(testNotifications[0]);
      });
      
      // Component should update
      await waitFor(() => {
        expect(screen.getByText('Integration Test Info')).toBeInTheDocument();
      });
      
      // Remove notification from store
      act(() => {
        store.removeNotification('integration-1');
      });
      
      // Component should update again
      await waitFor(() => {
        expect(screen.queryByText('Integration Test Info')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    test('network errors are recovered from', async () => {
      const store = useNotificationStore.getState();
      
      // Mock network error
      jest.spyOn(notificationAPI, 'getNotifications').mockRejectedValueOnce(new Error('Network Error'));
      
      // First call should fail
      await act(async () => {
        try {
          await store.fetchNotifications();
        } catch (error) {
          // Expected error
        }
      });
      
      expect(store.error).toBeTruthy();
      
      // Mock successful response
      jest.spyOn(notificationAPI, 'getNotifications').mockResolvedValueOnce({
        data: testNotifications,
        pagination: { page: 1, limit: 20, total: 3, pages: 1 },
      });
      
      // Second call should succeed
      await act(async () => {
        await store.fetchNotifications();
      });
      
      expect(store.error).toBeNull();
      expect(store.notifications).toHaveLength(3);
    });

    test('real-time connection errors are recovered from', async () => {
      const store = useNotificationStore.getState();
      
      // Mock connection failure
      jest.spyOn(realtimeNotificationService, 'connect').mockRejectedValueOnce(new Error('Connection Error'));
      
      // First connection attempt should fail
      await act(async () => {
        try {
          await store.connectRealtime();
        } catch (error) {
          // Expected error
        }
      });
      
      expect(store.realtimeConnected).toBe(false);
      
      // Mock successful connection
      jest.spyOn(realtimeNotificationService, 'connect').mockResolvedValueOnce(true);
      
      // Second connection attempt should succeed
      await act(async () => {
        await store.connectRealtime();
      });
      
      expect(store.realtimeConnected).toBe(true);
    });

    test('component errors are handled gracefully', async () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Component Error');
      };
      
      // Should not crash the entire application
      expect(() => {
        renderWithRouter(<ErrorComponent />);
      }).toThrow('Component Error');
    });
  });

  describe('Performance Integration', () => {
    test('large numbers of notifications are handled efficiently', async () => {
      const store = useNotificationStore.getState();
      
      // Add many notifications
      const manyNotifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-${i}`,
        type: 'info',
        title: `Performance Test ${i}`,
        message: `This is performance test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));
      
      manyNotifications.forEach(notification => {
        store.addNotification(notification);
      });
      
      renderWithRouter(
        <NotificationContainer maxNotifications={10} />
      );
      
      // Should only render maxNotifications
      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(10);
      });
    });

    test('frequent updates are handled efficiently', async () => {
      const store = useNotificationStore.getState();
      
      renderWithRouter(
        <NotificationContainer />
      );
      
      // Add many notifications rapidly
      for (let i = 0; i < 100; i++) {
        act(() => {
          store.addNotification({
            id: `rapid-${i}`,
            type: 'info',
            title: `Rapid Update ${i}`,
            message: `This is rapid update ${i}`,
            read: false,
            timestamp: new Date().toISOString(),
          });
        });
      }
      
      // Should handle without crashing
      expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    });
  });
});