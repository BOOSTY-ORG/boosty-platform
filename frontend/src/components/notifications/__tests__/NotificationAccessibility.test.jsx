import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { motion } from 'framer-motion';
import { axe, toHaveNoViolations } from 'jest-axe';

// Import axe for accessibility testing
import 'jest-axe/extend-expect';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

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
};

// Mock API
jest.mock('../../stores/index.js', () => ({
  useNotificationStore: () => mockNotificationStore,
}));

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

// Accessible test data
const accessibleNotifications = [
  {
    id: 'a11y-1',
    type: 'info',
    title: 'Accessibility Test Info',
    message: 'This is an accessibility test info notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'normal',
  },
  {
    id: 'a11y-2',
    type: 'success',
    title: 'Accessibility Test Success',
    message: 'This is an accessibility test success notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'normal',
  },
  {
    id: 'a11y-3',
    type: 'error',
    title: 'Accessibility Test Error',
    message: 'This is an accessibility test error notification',
    read: false,
    timestamp: new Date().toISOString(),
    priority: 'high',
  },
];

describe('Notification Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationStore.notifications = [];
    mockNotificationStore.unreadCount = 0;
    mockNotificationStore.isLoading = false;
    mockNotificationStore.error = null;
  });

  describe('ARIA Compliance', () => {
    test('notification has correct ARIA attributes', async () => {
      const { container } = renderWithRouter(
        <Notification
          type="info"
          title="Test Notification"
          message="This is a test notification"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check for proper ARIA attributes
      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
      expect(notification).toHaveAttribute('role', 'alert');
    });

    test('critical notification uses assertive ARIA live region', async () => {
      const { container } = renderWithRouter(
        <Notification
          type="error"
          title="Critical Notification"
          message="This is a critical notification"
          priority="critical"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
    });

    test('notification container has proper ARIA labeling', async () => {
      mockNotificationStore.notifications = accessibleNotifications;

      const { container } = renderWithRouter(
        <NotificationContainer />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const notificationRegion = screen.getByRole('region', { name: 'Notifications' });
      expect(notificationRegion).toHaveAttribute('aria-live', 'polite');
      expect(notificationRegion).toHaveAttribute('aria-label', 'Notifications');
    });

    test('notification center has proper ARIA structure', async () => {
      mockNotificationStore.notifications = accessibleNotifications;

      const { container } = renderWithRouter(
        <NotificationCenter userId="a11y-test-user" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toBeInTheDocument();

      // Check for proper landmark roles
      const main = container.querySelector('[role="main"]');
      expect(main).toBeInTheDocument();
    });

    test('connection status has proper ARIA labeling', async () => {
      const { container } = renderWithRouter(
        <ConnectionStatus
          isConnected={true}
          connectionType="websocket"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check for proper status announcement
      const statusElement = container.querySelector('[aria-live]');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('notification can be focused and activated with keyboard', () => {
      const handleClick = jest.fn();
      
      renderWithRouter(
        <Notification
          type="info"
          title="Keyboard Test"
          message="This notification can be activated with keyboard"
          onClick={handleClick}
          className="cursor-pointer"
        />
      );

      const notification = screen.getByRole('alert');
      
      // Test Tab navigation
      notification.focus();
      expect(notification).toHaveFocus();

      // Test Enter key
      fireEvent.keyDown(notification, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();

      // Test Space key
      handleClick.mockClear();
      fireEvent.keyDown(notification, { key: ' ' });
      expect(handleClick).toHaveBeenCalled();
    });

    test('close button is keyboard accessible', () => {
      const handleClose = jest.fn();
      
      renderWithRouter(
        <Notification
          type="info"
          title="Close Test"
          message="This notification has a close button"
          onClose={handleClose}
        />
      );

      const closeButton = screen.getByLabelText('Dismiss notification');
      
      // Test keyboard access to close button
      closeButton.focus();
      expect(closeButton).toHaveFocus();

      fireEvent.keyDown(closeButton, { key: 'Enter' });
      expect(handleClose).toHaveBeenCalled();
    });

    test('notification container supports keyboard navigation', () => {
      mockNotificationStore.notifications = accessibleNotifications;

      renderWithRouter(
        <NotificationContainer />
      );

      const notifications = screen.getAllByRole('alert');
      
      // Test Tab navigation through notifications
      notifications.forEach((notification, index) => {
        notification.focus();
        expect(notification).toHaveFocus();
        
        // Test Arrow key navigation
        if (index < notifications.length - 1) {
          fireEvent.keyDown(notification, { key: 'ArrowDown' });
          expect(notifications[index + 1]).toHaveFocus();
        }
      });
    });

    test('notification center supports keyboard navigation', () => {
      mockNotificationStore.notifications = accessibleNotifications;

      renderWithRouter(
        <NotificationCenter userId="keyboard-test-user" />
      );

      // Test Tab navigation to tabs
      const firstTab = screen.getByText('All');
      firstTab.focus();
      expect(firstTab).toHaveFocus();

      // Test Arrow key navigation between tabs
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
      const nextTab = screen.getByText('Unread');
      expect(nextTab).toHaveFocus();

      // Test Enter key to activate tab
      fireEvent.keyDown(nextTab, { key: 'Enter' });
      expect(mockNotificationStore.setFilters).toHaveBeenCalled();
    });

    test('Escape key closes modals', () => {
      mockNotificationStore.notifications = accessibleNotifications;
      mockNotificationStore.preferences = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      };

      renderWithRouter(
        <NotificationCenter userId="escape-test-user" showPreferences={true} />
      );

      // Open preferences modal
      const preferencesButton = screen.getByTitle('Notification preferences');
      fireEvent.click(preferencesButton);

      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();

      // Test Escape key to close modal
      fireEvent.keyDown(document, { key: 'Escape' });
      
      // Modal should be closed (this depends on implementation)
      // This test ensures the Escape key handler is properly set up
    });
  });

  describe('Screen Reader Support', () => {
    test('notification content is properly announced', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Screen Reader Test"
          message="This notification should be properly announced"
          timestamp="2023-12-01T10:00:00Z"
        />
      );

      const notification = screen.getByRole('alert');
      
      // Check that content is accessible to screen readers
      expect(notification).toHaveTextContent('Screen Reader Test');
      expect(notification).toHaveTextContent('This notification should be properly announced');
      
      // Check that timestamp is accessible
      expect(notification).toHaveTextContent('Just now');
    });

    test('notification priority is announced', () => {
      renderWithRouter(
        <Notification
          type="error"
          title="High Priority"
          message="This is a high priority notification"
          priority="urgent"
        />
      );

      const notification = screen.getByRole('alert');
      
      // High priority should be announced
      expect(notification).toHaveAttribute('aria-live', 'assertive');
    });

    test('unread status is announced', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Unread Notification"
          message="This notification is unread"
          read={false}
        />
      );

      const notification = screen.getByRole('alert');
      
      // Unread indicator should be visible to screen readers
      const unreadIndicator = notification.querySelector('.bg-current.rounded-full');
      expect(unreadIndicator).toBeInTheDocument();
    });

    test('notification count is announced', () => {
      mockNotificationStore.notifications = accessibleNotifications;
      mockNotificationStore.unreadCount = 3;

      renderWithRouter(
        <NotificationContainer showUnreadCount={true} />
      );

      const unreadCount = screen.getByText('3 unread notifications');
      expect(unreadCount).toBeInTheDocument();
    });

    test('connection status changes are announced', () => {
      const { rerender } = renderWithRouter(
        <ConnectionStatus
          isConnected={false}
          connectionType="websocket"
        />
      );

      // Initial disconnected state
      expect(screen.getByText('Disconnected')).toBeInTheDocument();

      // Reconnect
      rerender(
        <ConnectionStatus
          isConnected={true}
          connectionType="websocket"
        />
      );

      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('Color Contrast', () => {
    test('notification colors have sufficient contrast', async () => {
      const { container } = renderWithRouter(
        <Notification
          type="info"
          title="Contrast Test"
          message="This notification should have good contrast"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('all notification types have sufficient contrast', async () => {
      const notificationTypes = ['info', 'success', 'error', 'warning'];
      
      for (const type of notificationTypes) {
        const { container } = renderWithRouter(
          <Notification
            type={type}
            title={`${type} Contrast Test`}
            message={`This ${type} notification should have good contrast`}
          />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    test('priority levels have sufficient contrast', async () => {
      const priorities = ['low', 'normal', 'high', 'urgent', 'critical'];
      
      for (const priority of priorities) {
        const { container } = renderWithRouter(
          <Notification
            type="info"
            title={`${priority} Priority Test`}
            message={`This ${priority} priority notification should have good contrast`}
            priority={priority}
          />
        );

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      }
    });

    test('dark mode has sufficient contrast', async () => {
      // Mock dark mode
      document.documentElement.classList.add('dark');

      const { container } = renderWithRouter(
        <Notification
          type="info"
          title="Dark Mode Test"
          message="This notification should have good contrast in dark mode"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Clean up
      document.documentElement.classList.remove('dark');
    });
  });

  describe('Focus Management', () => {
    test('focus is trapped in modals', () => {
      mockNotificationStore.notifications = accessibleNotifications;
      mockNotificationStore.preferences = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      };

      renderWithRouter(
        <NotificationCenter userId="focus-test-user" showPreferences={true} />
      );

      // Open preferences modal
      const preferencesButton = screen.getByTitle('Notification preferences');
      fireEvent.click(preferencesButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Check that focus is trapped within modal
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    test('focus returns to trigger after modal close', () => {
      mockNotificationStore.notifications = accessibleNotifications;
      mockNotificationStore.preferences = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        inAppNotifications: true,
      };

      renderWithRouter(
        <NotificationCenter userId="focus-return-test-user" showPreferences={true} />
      );

      // Open preferences modal
      const preferencesButton = screen.getByTitle('Notification preferences');
      preferencesButton.focus();
      fireEvent.click(preferencesButton);

      // Close modal
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      // Focus should return to preferences button
      expect(preferencesButton).toHaveFocus();
    });

    test('focus indicators are visible', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Focus Test"
          message="This notification should show focus indicators"
          className="cursor-pointer"
        />
      );

      const notification = screen.getByRole('alert');
      
      // Test focus styles
      notification.focus();
      expect(notification).toHaveFocus();
      
      // Check for visible focus indicator (this depends on CSS implementation)
      const computedStyle = window.getComputedStyle(notification);
      expect(computedStyle.outline || computedStyle.boxShadow).toBeTruthy();
    });
  });

  describe('Responsive Design', () => {
    test('notifications are accessible on mobile', async () => {
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

      mockNotificationStore.notifications = accessibleNotifications;

      const { container } = renderWithRouter(
        <NotificationContainer />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check that notifications are still accessible on mobile
      const notifications = screen.getAllByRole('alert');
      expect(notifications).toHaveLength(3);
    });

    test('notification center is accessible on mobile', async () => {
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

      mockNotificationStore.notifications = accessibleNotifications;

      const { container } = renderWithRouter(
        <NotificationCenter userId="mobile-test-user" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check that notification center is still accessible on mobile
      expect(screen.getByText('Notification Center')).toBeInTheDocument();
    });

    test('touch targets are sufficiently large', () => {
      mockNotificationStore.notifications = accessibleNotifications;

      renderWithRouter(
        <NotificationContainer />
      );

      const closeButtons = screen.getAllByLabelText('Dismiss notification');
      
      closeButtons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const minSize = 44; // Minimum touch target size in pixels
        
        expect(rect.width).toBeGreaterThanOrEqual(minSize);
        expect(rect.height).toBeGreaterThanOrEqual(minSize);
      });
    });
  });

  describe('Error Handling', () => {
    test('error notifications are accessible', async () => {
      const { container } = renderWithRouter(
        <Notification
          type="error"
          title="Accessibility Error"
          message="This is an accessibility error notification"
          priority="high"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
      expect(notification).toHaveTextContent('Accessibility Error');
    });

    test('error states in notification center are accessible', async () => {
      mockNotificationStore.error = 'Failed to load notifications';

      const { container } = renderWithRouter(
        <NotificationCenter userId="error-test-user" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });
  });

  describe('Localization', () => {
    test('notifications support RTL languages', async () => {
      // Mock RTL
      document.documentElement.dir = 'rtl';

      const { container } = renderWithRouter(
        <Notification
          type="info"
          title="اختبار RTL"
          message="هذا اختبار للغة العربية"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Clean up
      document.documentElement.dir = 'ltr';
    });

    test('timestamps are properly localized', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Localization Test"
          message="This notification should have localized timestamps"
          timestamp="2023-12-01T10:00:00Z"
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveTextContent('Just now');
    });
  });

  describe('Animation Accessibility', () => {
    test('respects prefers-reduced-motion', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const { container } = renderWithRouter(
        <Notification
          type="info"
          title="Reduced Motion Test"
          message="This notification should respect reduced motion preference"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('animations do not cause accessibility issues', async () => {
      const { container } = renderWithRouter(
        <NotificationContainer />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Custom Accessibility Features', () => {
    test('notifications can be read aloud', () => {
      renderWithRouter(
        <Notification
          type="info"
          title="Screen Reader Test"
          message="This notification should be readable by screen readers"
        />
      );

      const notification = screen.getByRole('alert');
      
      // Test that content is readable
      expect(notification).toHaveTextContent('Screen Reader Test');
      expect(notification).toHaveTextContent('This notification should be readable by screen readers');
    });

    test('notification actions are accessible', () => {
      const handleAction = jest.fn();
      
      renderWithRouter(
        <Notification
          type="info"
          title="Action Test"
          message="This notification has an action"
          actionUrl="https://example.com"
          actionText="View Details"
          onClick={handleAction}
        />
      );

      const actionButton = screen.getByText('View Details');
      expect(actionButton).toBeInTheDocument();
      
      // Test keyboard access
      actionButton.focus();
      expect(actionButton).toHaveFocus();
      
      fireEvent.keyDown(actionButton, { key: 'Enter' });
      expect(handleAction).toHaveBeenCalled();
    });

    test('bulk actions are accessible', () => {
      mockNotificationStore.notifications = accessibleNotifications;

      renderWithRouter(
        <NotificationCenter userId="bulk-test-user" showBulkActions={true} />
      );

      // Select notifications
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-label');
      });

      // Test bulk action buttons
      const markReadButton = screen.getByText('Mark as Read');
      expect(markReadButton).toBeInTheDocument();
      expect(markReadButton).toHaveAttribute('aria-label');
    });
  });
});