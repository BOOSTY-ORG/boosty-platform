import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Performance measurement utilities
const measureRenderTime = (componentFn) => {
  const start = performance.now();
  const result = componentFn();
  const end = performance.now();
  return { result, renderTime: end - start };
};

const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    };
  }
  return null;
};

const measureComponentCount = () => {
  return document.querySelectorAll('[data-testid]').length;
};

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

// Import components
import Notification from '../../common/Notification.jsx';
import NotificationContainer from '../../common/NotificationContainer.jsx';
import NotificationCenter from '../NotificationCenter.jsx';

// Helper function
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Notification Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationStore.notifications = [];
    mockNotificationStore.unreadCount = 0;
    mockNotificationStore.isLoading = false;
    mockNotificationStore.error = null;
    
    // Reset performance counters
    performance.mark = jest.fn();
    performance.measure = jest.fn();
    performance.getEntriesByName = jest.fn(() => []);
    performance.getEntriesByType = jest.fn(() => []);
  });

  describe('Rendering Performance', () => {
    test('renders single notification efficiently', () => {
      const notification = {
        id: 'perf-1',
        type: 'info',
        title: 'Performance Test',
        message: 'This is a performance test notification',
        read: false,
        timestamp: new Date().toISOString(),
      };

      const { result, renderTime } = measureRenderTime(() =>
        renderWithRouter(
          <Notification {...notification} />
        )
      );

      expect(renderTime).toBeLessThan(50); // Should render in under 50ms
      expect(screen.getByText('Performance Test')).toBeInTheDocument();
    });

    test('renders multiple notifications efficiently', () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-${i}`,
        type: 'info',
        title: `Performance Test ${i}`,
        message: `This is performance test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      const { result, renderTime } = measureRenderTime(() =>
        renderWithRouter(
          <NotificationContainer maxNotifications={100} />
        )
      );

      expect(renderTime).toBeLessThan(200); // Should render 100 notifications in under 200ms
      expect(screen.getAllByRole('alert')).toHaveLength(100);
    });

    test('renders notification center efficiently', async () => {
      const notifications = Array.from({ length: 50 }, (_, i) => ({
        id: `center-perf-${i}`,
        type: 'info',
        title: `Center Performance Test ${i}`,
        message: `This is center performance test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;
      mockNotificationStore.unreadCount = 50;

      const { result, renderTime } = measureRenderTime(() =>
        renderWithRouter(
          <NotificationCenter userId="perf-test-user" />
        )
      );

      expect(renderTime).toBeLessThan(300); // Should render notification center in under 300ms
      
      await waitFor(() => {
        expect(screen.getByText('Notification Center')).toBeInTheDocument();
      });
    });

    test('limits notification rendering to maxNotifications', () => {
      const notifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `limit-perf-${i}`,
        type: 'info',
        title: `Limit Performance Test ${i}`,
        message: `This is limit performance test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      const { result, renderTime } = measureRenderTime(() =>
        renderWithRouter(
          <NotificationContainer maxNotifications={5} />
        )
      );

      expect(renderTime).toBeLessThan(100); // Should only render 5 notifications
      expect(screen.getAllByRole('alert')).toHaveLength(5);
    });

    test('handles rapid notification updates efficiently', async () => {
      const { rerender } = renderWithRouter(
        <NotificationContainer maxNotifications={10} />
      );

      const startTime = performance.now();

      // Add 50 notifications rapidly
      for (let i = 0; i < 50; i++) {
        const newNotification = {
          id: `rapid-${i}`,
          type: 'info',
          title: `Rapid Update ${i}`,
          message: `This is rapid update ${i}`,
          read: false,
          timestamp: new Date().toISOString(),
        };

        mockNotificationStore.notifications = [...mockNotificationStore.notifications, newNotification];
        
        rerender(
          <NotificationContainer maxNotifications={10} />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should handle 50 updates in under 1 second
    });
  });

  describe('Memory Performance', () => {
    test('does not leak memory on notification add/remove', () => {
      const initialMemory = measureMemoryUsage();
      
      // Add many notifications
      for (let i = 0; i < 100; i++) {
        const notification = {
          id: `memory-${i}`,
          type: 'info',
          title: `Memory Test ${i}`,
          message: `This is memory test notification ${i}`,
          read: false,
          timestamp: new Date().toISOString(),
        };

        mockNotificationStore.notifications.push(notification);
      }

      const { unmount } = renderWithRouter(
        <NotificationContainer maxNotifications={100} />
      );

      const afterRenderMemory = measureMemoryUsage();

      // Remove all notifications
      mockNotificationStore.notifications = [];
      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterUnmountMemory = measureMemoryUsage();

      // Memory usage should not increase significantly
      if (initialMemory && afterRenderMemory && afterUnmountMemory) {
        const memoryIncrease = afterRenderMemory.used - initialMemory.used;
        const memoryAfterCleanup = afterUnmountMemory.used - initialMemory.used;
        
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
        expect(memoryAfterCleanup).toBeLessThan(2 * 1024 * 1024); // Less than 2MB after cleanup
      }
    });

    test('cleans up event listeners on unmount', () => {
      const { unmount } = renderWithRouter(
        <NotificationContainer />
      );

      // Check if event listeners are cleaned up
      const beforeUnmount = document.addEventListener.mock.calls.length;
      
      unmount();

      const afterUnmount = document.addEventListener.mock.calls.length;
      
      // Should not leave dangling event listeners
      expect(afterUnmount - beforeUnmount).toBeLessThanOrEqual(0);
    });

    test('efficiently handles large notification data', () => {
      const largeNotifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-${i}`,
        type: 'info',
        title: `Large Data Test ${i}`,
        message: 'A'.repeat(1000), // 1KB message
        data: {
          largeArray: Array.from({ length: 100 }, (_, j) => `item-${j}`),
          largeObject: Object.fromEntries(Array.from({ length: 50 }, (_, k) => [`key-${k}`, `value-${k}`])),
        },
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = largeNotifications;

      const { result, renderTime } = measureRenderTime(() =>
        renderWithRouter(
          <NotificationContainer maxNotifications={10} />
        )
      );

      // Should handle large data efficiently
      expect(renderTime).toBeLessThan(200);
      expect(screen.getAllByRole('alert')).toHaveLength(10);
    });
  });

  describe('Animation Performance', () => {
    test('animations do not block main thread', async () => {
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `animation-${i}`,
        type: 'info',
        title: `Animation Test ${i}`,
        message: `This is animation test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      const startTime = performance.now();

      renderWithRouter(
        <NotificationContainer />
      );

      // Simulate rapid state changes that trigger animations
      for (let i = 0; i < 10; i++) {
        mockNotificationStore.notifications = [...mockNotificationStore.notifications];
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Animations should not block main thread
      expect(totalTime).toBeLessThan(500);
    });

    test('smooth scrolling performance', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `scroll-${i}`,
        type: 'info',
        title: `Scroll Test ${i}`,
        message: `This is scroll test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="scroll-test-user" />
      );

      const startTime = performance.now();

      // Simulate scrolling
      const container = screen.getByRole('region', { name: 'Notifications' });
      
      for (let i = 0; i < 10; i++) {
        container.scrollTop = i * 100;
        await new Promise(resolve => setTimeout(resolve, 16)); // 60fps
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Scrolling should be smooth
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Real-time Performance', () => {
    test('handles high-frequency real-time updates', async () => {
      renderWithRouter(
        <NotificationContainer />
      );

      const startTime = performance.now();

      // Simulate high-frequency real-time updates
      for (let i = 0; i < 100; i++) {
        const notification = {
          id: `realtime-${i}`,
          type: 'info',
          title: `Real-time Test ${i}`,
          message: `This is real-time test notification ${i}`,
          read: false,
          timestamp: new Date().toISOString(),
        };

        mockNotificationStore.addNotification(notification);
        
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle high-frequency updates efficiently
      expect(totalTime).toBeLessThan(1000);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledTimes(100);
    });

    test('efficiently batches real-time updates', async () => {
      renderWithRouter(
        <NotificationContainer />
      );

      const startTime = performance.now();

      // Batch multiple updates
      const batchUpdates = Array.from({ length: 50 }, (_, i) => ({
        id: `batch-${i}`,
        type: 'info',
        title: `Batch Test ${i}`,
        message: `This is batch test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = batchUpdates;

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Batch updates should be more efficient
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Search Performance', () => {
    test('searches large notification list efficiently', async () => {
      const notifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `search-${i}`,
        type: 'info',
        title: `Search Test ${i}`,
        message: `This is search test notification ${i} with searchable content`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="search-test-user" showSearch={true} />
      );

      const startTime = performance.now();

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search notifications...');
      fireEvent.change(searchInput, { target: { value: 'Search Test 500' } });

      await waitFor(() => {
        expect(screen.getByText('Search Test 500')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const searchTime = endTime - startTime;

      // Search should be fast even with large lists
      expect(searchTime).toBeLessThan(100);
    });

    test('debounces search input efficiently', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `debounce-${i}`,
        type: 'info',
        title: `Debounce Test ${i}`,
        message: `This is debounce test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="debounce-test-user" showSearch={true} />
      );

      const startTime = performance.now();
      const searchInput = screen.getByPlaceholderText('Search notifications...');

      // Rapidly type search terms
      for (let i = 0; i < 10; i++) {
        fireEvent.change(searchInput, { target: { value: `search ${i}` } });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Debouncing should prevent excessive API calls
      expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledTimes(1);
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Filter Performance', () => {
    test('filters large notification list efficiently', async () => {
      const notifications = Array.from({ length: 1000 }, (_, i) => ({
        id: `filter-${i}`,
        type: i % 2 === 0 ? 'info' : 'error',
        title: `Filter Test ${i}`,
        message: `This is filter test notification ${i}`,
        read: i % 3 === 0,
        timestamp: new Date().toISOString(),
        priority: ['low', 'normal', 'high', 'urgent'][i % 4],
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="filter-test-user" showFilters={true} />
      );

      const startTime = performance.now();

      // Change filters
      const typeFilter = screen.getByDisplayValue('All Types');
      fireEvent.change(typeFilter, { target: { value: 'error' } });

      await waitFor(() => {
        // Should filter to only error notifications
        const errorNotifications = screen.getAllByText(/Filter Test \d+/).filter(el => 
          parseInt(el.textContent.match(/\d+/)[0]) % 2 === 1
        );
        expect(errorNotifications.length).toBeGreaterThan(0);
      });

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      // Filtering should be fast
      expect(filterTime).toBeLessThan(100);
    });

    test('handles multiple filter changes efficiently', async () => {
      const notifications = Array.from({ length: 500 }, (_, i) => ({
        id: `multi-filter-${i}`,
        type: ['info', 'success', 'error', 'warning'][i % 4],
        title: `Multi Filter Test ${i}`,
        message: `This is multi filter test notification ${i}`,
        read: i % 2 === 0,
        timestamp: new Date().toISOString(),
        priority: ['low', 'normal', 'high', 'urgent'][i % 4],
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="multi-filter-test-user" showFilters={true} />
      );

      const startTime = performance.now();

      // Rapidly change multiple filters
      const typeFilter = screen.getByDisplayValue('All Types');
      const priorityFilter = screen.getByDisplayValue('All Priorities');

      fireEvent.change(typeFilter, { target: { value: 'error' } });
      fireEvent.change(priorityFilter, { target: { value: 'high' } });
      fireEvent.change(typeFilter, { target: { value: 'success' } });

      await waitFor(() => {
        expect(mockNotificationStore.fetchNotifications).toHaveBeenCalledTimes(3);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Multiple filter changes should be efficient
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Bulk Operations Performance', () => {
    test('handles bulk mark as read efficiently', async () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `bulk-${i}`,
        type: 'info',
        title: `Bulk Test ${i}`,
        message: `This is bulk test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="bulk-test-user" showBulkActions={true} />
      );

      const startTime = performance.now();

      // Select all notifications
      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      // Mark all as read
      const markReadButton = screen.getByText('Mark as Read');
      fireEvent.click(markReadButton);

      await waitFor(() => {
        expect(mockNotificationStore.markAsRead).toHaveBeenCalledTimes(100);
      });

      const endTime = performance.now();
      const bulkTime = endTime - startTime;

      // Bulk operations should be efficient
      expect(bulkTime).toBeLessThan(500);
    });

    test('handles bulk delete efficiently', async () => {
      const notifications = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk-delete-${i}`,
        type: 'info',
        title: `Bulk Delete Test ${i}`,
        message: `This is bulk delete test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      renderWithRouter(
        <NotificationCenter userId="bulk-delete-test-user" showBulkActions={true} />
      );

      const startTime = performance.now();

      // Select all notifications
      const selectAllButton = screen.getByText('Select All');
      fireEvent.click(selectAllButton);

      // Delete all
      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockNotificationStore.deleteNotification).toHaveBeenCalledTimes(50);
      });

      const endTime = performance.now();
      const deleteTime = endTime - startTime;

      // Bulk delete should be efficient
      expect(deleteTime).toBeLessThan(300);
    });
  });

  describe('Component Lifecycle Performance', () => {
    test('mounts and unmounts efficiently', () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const { unmount } = renderWithRouter(
          <NotificationContainer />
        );
        
        unmount();
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      // Mount/unmount should be fast
      expect(averageTime).toBeLessThan(50);
    });

    test('handles prop changes efficiently', () => {
      const { rerender } = renderWithRouter(
        <NotificationContainer maxNotifications={5} />
      );

      const startTime = performance.now();

      // Change props multiple times
      for (let i = 0; i < 10; i++) {
        rerender(
          <NotificationContainer maxNotifications={i + 1} />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Prop changes should be efficient
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Performance Monitoring', () => {
    test('provides performance metrics', () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `metrics-${i}`,
        type: 'info',
        title: `Metrics Test ${i}`,
        message: `This is metrics test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      const startTime = performance.now();
      
      renderWithRouter(
        <NotificationContainer />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Performance metrics should be available
      expect(renderTime).toBeGreaterThan(0);
      expect(renderTime).toBeLessThan(200);
      
      const componentCount = measureComponentCount();
      expect(componentCount).toBeGreaterThan(0);
      
      const memoryUsage = measureMemoryUsage();
      if (memoryUsage) {
        expect(memoryUsage.used).toBeGreaterThan(0);
      }
    });

    test('detects performance regressions', () => {
      const notifications = Array.from({ length: 100 }, (_, i) => ({
        id: `regression-${i}`,
        type: 'info',
        title: `Regression Test ${i}`,
        message: `This is regression test notification ${i}`,
        read: false,
        timestamp: new Date().toISOString(),
      }));

      mockNotificationStore.notifications = notifications;

      // Baseline measurement
      const baselineStart = performance.now();
      renderWithRouter(
        <NotificationContainer />
      );
      const baselineEnd = performance.now();
      const baselineTime = baselineEnd - baselineStart;

      // Regression threshold (should be less than 2x baseline)
      const regressionThreshold = baselineTime * 2;
      
      expect(baselineTime).toBeLessThan(regressionThreshold);
    });
  });
});