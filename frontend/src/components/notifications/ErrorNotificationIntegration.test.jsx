import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ErrorNotification, {
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from './ErrorNotification';
import useNotification from '../../hooks/useNotification';

// Mock the useNotification hook
jest.mock('../../hooks/useNotification');

describe('ErrorNotification Integration', () => {
  const mockUseNotification = useNotification;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotification.mockReturnValue({
      notifications: [],
      addNotification: jest.fn(),
      removeNotification: jest.fn(),
      markAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      // Add other required methods
      unreadCount: 0,
      isLoading: false,
      error: null,
      filters: {},
      pagination: { page: 1, pages: 1, total: 0 },
      preferences: {},
      realtimeConnected: false,
      markAsUnread: jest.fn(),
      markAllAsRead: jest.fn(),
      clearAllNotifications: jest.fn(),
      setFilters: jest.fn(),
      clearFilters: jest.fn(),
      setPagination: jest.fn(),
      fetchNotifications: jest.fn(),
      fetchUnreadCount: jest.fn(),
      fetchPreferences: jest.fn(),
      updatePreferences: jest.fn(),
      connectRealtime: jest.fn(),
      disconnectRealtime: jest.fn(),
      showSuccess: jest.fn(),
      showError: jest.fn(),
      showWarning: jest.fn(),
      showInfo: jest.fn(),
      showMessage: jest.fn(),
      showTask: jest.fn(),
      notifySuccess: jest.fn(),
      notifyError: jest.fn(),
      notifyWarning: jest.fn(),
      notifyInfo: jest.fn(),
      notifyMessage: jest.fn(),
      notifyTask: jest.fn(),
      notifyPayment: jest.fn(),
      notifyKYC: jest.fn(),
      notifyInvestment: jest.fn(),
      notifyCRM: jest.fn(),
      notifySystem: jest.fn(),
      notifyCritical: jest.fn(),
      notifyValidationError: jest.fn(),
      notifyNetworkError: jest.fn(),
      notifySystemError: jest.fn(),
      notifyAPIError: jest.fn(),
      notifyAuthError: jest.fn(),
      notifyTimeoutError: jest.fn(),
      notifyPaymentError: jest.fn(),
      notifyFileUploadError: jest.fn(),
      notifyCriticalError: jest.fn(),
    });
  });

  describe('Error Types Integration', () => {
    test('validation error notification', () => {
      const { notifyValidationError } = mockUseNotification();
      
      render(
        <ErrorNotification
          id="validation-error"
          type={ERROR_TYPES.VALIDATION}
          severity={ERROR_SEVERITY.WARNING}
          category={ERROR_CATEGORIES.USER_INPUT}
          title="Validation Error"
          message="Please check your input"
          errorCode="VAL_001"
        />
      );

      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(screen.getByText('Please check your input')).toBeInTheDocument();
      expect(screen.getByText('VAL_001')).toBeInTheDocument();
      expect(screen.getByText('WARNING')).toBeInTheDocument();
    });

    test('network error notification', () => {
      render(
        <ErrorNotification
          id="network-error"
          type={ERROR_TYPES.NETWORK}
          severity={ERROR_SEVERITY.ERROR}
          category={ERROR_CATEGORIES.COMMUNICATION}
          title="Network Error"
          message="Connection failed"
          errorCode="NET_503"
          recoverySuggestions={[
            "Check your internet connection",
            "Try refreshing the page"
          ]}
        />
      );

      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByText('NET_503')).toBeInTheDocument();
      expect(screen.getByText('ERROR')).toBeInTheDocument();
      expect(screen.getByText('Suggested solutions:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
    });

    test('critical error notification', () => {
      render(
        <ErrorNotification
          id="critical-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.CRITICAL}
          category={ERROR_CATEGORIES.SYSTEM_FAILURE}
          title="Critical System Error"
          message="System has encountered a critical error"
          errorCode="SYS_500"
          persist={true}
        />
      );

      expect(screen.getByText('Critical System Error')).toBeInTheDocument();
      expect(screen.getByText('System has encountered a critical error')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('SYS_500')).toBeInTheDocument();
    });
  });

  describe('Quick Actions Integration', () => {
    test('retry action integration', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="retry-error"
          type={ERROR_TYPES.NETWORK}
          severity={ERROR_SEVERITY.ERROR}
          message="Network error"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledWith('retry-error', {});
    });

    test('report issue action integration', async () => {
      const onReportIssue = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="report-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          errorCode="SYS_001"
          onReportIssue={onReportIssue}
        />
      );

      const reportButton = screen.getByText('Report Issue');
      await user.click(reportButton);

      expect(onReportIssue).toHaveBeenCalledWith('report-error', {
        type: ERROR_TYPES.SYSTEM,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        message: 'System error',
        errorCode: 'SYS_001',
        title: undefined,
        details: null,
        stackTrace: null,
        context: {},
        timestamp: undefined,
      });
    });

    test('get help action integration', async () => {
      const onGetHelp = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="help-error"
          type={ERROR_TYPES.API}
          severity={ERROR_SEVERITY.ERROR}
          message="API error"
          errorCode="API_404"
          onGetHelp={onGetHelp}
        />
      );

      const helpButton = screen.getByText('Get Help');
      await user.click(helpButton);

      expect(onGetHelp).toHaveBeenCalledWith('help-error', {
        type: ERROR_TYPES.API,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        errorCode: 'API_404',
      });
    });

    test('view logs action integration', async () => {
      const onViewLogs = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="logs-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          errorCode="LOG_001"
          onViewLogs={onViewLogs}
        />
      );

      const logsButton = screen.getByText('View Logs');
      await user.click(logsButton);

      expect(onViewLogs).toHaveBeenCalledWith('logs-error', {
        errorCode: 'LOG_001',
        timestamp: undefined,
        context: {},
      });
    });
  });

  describe('Error Details Integration', () => {
    test('expandable details section', async () => {
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="details-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          details="Detailed error information"
          context={{ userId: '123', action: 'submit' }}
        />
      );

      expect(screen.queryByText('Detailed error information')).not.toBeInTheDocument();
      
      const toggleButton = screen.getByText('Show details');
      await user.click(toggleButton);

      expect(screen.getByText('Hide details')).toBeInTheDocument();
      expect(screen.getByText('Detailed error information')).toBeInTheDocument();
      expect(screen.getByText('userId:')).toBeInTheDocument();
      expect(screen.getByText('"123"')).toBeInTheDocument();
      expect(screen.getByText('action:')).toBeInTheDocument();
      expect(screen.getByText('"submit"')).toBeInTheDocument();
    });

    test('stack trace display', async () => {
      const user = userEvent.setup();
      const stackTrace = `Error: Test error
    at test.js:1:1
    at main.js:10:5`;
      
      render(
        <ErrorNotification
          id="stack-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          stackTrace={stackTrace}
        />
      );

      // First, show details
      await user.click(screen.getByText('Show details'));
      
      // Then show stack trace
      const stackTraceToggle = screen.getByText('Show stack trace');
      await user.click(stackTraceToggle);

      expect(screen.getByText('Hide stack trace')).toBeInTheDocument();
      expect(screen.getByText(stackTrace)).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss Integration', () => {
    test('non-critical errors auto-dismiss', () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      render(
        <ErrorNotification
          id="auto-dismiss-error"
          type={ERROR_TYPES.NETWORK}
          severity={ERROR_SEVERITY.ERROR}
          message="Network error"
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      expect(onClose).toHaveBeenCalledWith('auto-dismiss-error');
      
      jest.useRealTimers();
    });

    test('critical errors do not auto-dismiss', () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      render(
        <ErrorNotification
          id="no-auto-dismiss-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.CRITICAL}
          message="Critical error"
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      expect(onClose).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Read State Integration', () => {
    test('unread notification shows actions and indicator', () => {
      const onMarkAsRead = jest.fn();
      
      render(
        <ErrorNotification
          id="unread-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          read={false}
          onMarkAsRead={onMarkAsRead}
        />
      );

      expect(screen.getByText('Mark as Read')).toBeInTheDocument();
      
      const notification = screen.getByRole('alert');
      const indicator = notification.querySelector('.absolute.top-2.right-2');
      expect(indicator).toBeInTheDocument();
    });

    test('read notification hides mark as read button', () => {
      render(
        <ErrorNotification
          id="read-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          read={true}
        />
      );

      expect(screen.queryByText('Mark as Read')).not.toBeInTheDocument();
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('opacity-75');
    });
  });

  describe('Loading States Integration', () => {
    test('retry loading state', async () => {
      const onRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="retry-loading-error"
          type={ERROR_TYPES.NETWORK}
          severity={ERROR_SEVERITY.ERROR}
          message="Network error"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });

    test('report issue loading state', async () => {
      const onReportIssue = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      const user = userEvent.setup();
      
      render(
        <ErrorNotification
          id="report-loading-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          onReportIssue={onReportIssue}
        />
      );

      const reportButton = screen.getByText('Report Issue');
      await user.click(reportButton);

      expect(screen.getByText('Reporting...')).toBeInTheDocument();
      expect(reportButton).toBeDisabled();
    });
  });

  describe('Accessibility Integration', () => {
    test('critical errors use assertive aria-live', () => {
      render(
        <ErrorNotification
          id="a11y-critical-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.CRITICAL}
          message="Critical error"
        />
      );

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });

    test('non-critical errors use polite aria-live', () => {
      render(
        <ErrorNotification
          id="a11y-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
        />
      );

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });

    test('close button has proper aria-label', () => {
      render(
        <ErrorNotification
          id="a11y-close-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
        />
      );

      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });
  });

  describe('Context Integration', () => {
    test('displays context information when provided', async () => {
      const user = userEvent.setup();
      const context = {
        userId: 'user123',
        sessionId: 'sess456',
        endpoint: '/api/users',
        method: 'GET',
      };
      
      render(
        <ErrorNotification
          id="context-error"
          type={ERROR_TYPES.API}
          severity={ERROR_SEVERITY.ERROR}
          message="API error"
          context={context}
        />
      );

      await user.click(screen.getByText('Show details'));

      expect(screen.getByText('userId:')).toBeInTheDocument();
      expect(screen.getByText('"user123"')).toBeInTheDocument();
      expect(screen.getByText('sessionId:')).toBeInTheDocument();
      expect(screen.getByText('"sess456"')).toBeInTheDocument();
      expect(screen.getByText('endpoint:')).toBeInTheDocument();
      expect(screen.getByText('"/api/users"')).toBeInTheDocument();
      expect(screen.getByText('method:')).toBeInTheDocument();
      expect(screen.getByText('"GET"')).toBeInTheDocument();
    });
  });

  describe('Affected Components Integration', () => {
    test('displays affected components when provided', () => {
      render(
        <ErrorNotification
          id="affected-components-error"
          type={ERROR_TYPES.SYSTEM}
          severity={ERROR_SEVERITY.ERROR}
          message="System error"
          affectedComponents={['UserService', 'UserList', 'UserProfile']}
        />
      );

      expect(screen.getByText('Affected: UserService, UserList, UserProfile')).toBeInTheDocument();
    });
  });

  describe('User Action Integration', () => {
    test('displays user action when provided', () => {
      render(
        <ErrorNotification
          id="user-action-error"
          type={ERROR_TYPES.VALIDATION}
          severity={ERROR_SEVERITY.WARNING}
          message="Validation error"
          userAction="Submitting user registration form"
        />
      );

      expect(screen.getByText('Action: Submitting user registration form')).toBeInTheDocument();
    });
  });
});