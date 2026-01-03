import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ErrorNotification, {
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from './ErrorNotification';

describe('ErrorNotification', () => {
  const defaultProps = {
    id: 'test-error-1',
    type: ERROR_TYPES.SYSTEM,
    severity: ERROR_SEVERITY.ERROR,
    title: 'Test Error',
    message: 'This is a test error message',
    timestamp: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('renders error notification with basic props', () => {
      render(<ErrorNotification {...defaultProps} />);
      
      expect(screen.getByText('Test Error')).toBeInTheDocument();
      expect(screen.getByText('This is a test error message')).toBeInTheDocument();
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    test('renders with error code', () => {
      render(<ErrorNotification {...defaultProps} errorCode="ERR_500" />);
      
      expect(screen.getByText('ERR_500')).toBeInTheDocument();
    });

    test('renders with severity badge', () => {
      render(<ErrorNotification {...defaultProps} severity={ERROR_SEVERITY.CRITICAL} />);
      
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    test('renders with user action context', () => {
      render(<ErrorNotification {...defaultProps} userAction="Submitting form" />);
      
      expect(screen.getByText('Action: Submitting form')).toBeInTheDocument();
    });

    test('renders with affected components', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          affectedComponents={['LoginForm', 'API']}
        />
      );
      
      expect(screen.getByText('Affected: LoginForm, API')).toBeInTheDocument();
    });

    test('renders with recovery suggestions', () => {
      const suggestions = ['Check your internet connection', 'Try again later'];
      render(
        <ErrorNotification
          {...defaultProps}
          recoverySuggestions={suggestions}
        />
      );
      
      expect(screen.getByText('Suggested solutions:')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
      expect(screen.getByText('Try again later')).toBeInTheDocument();
    });

    test('renders with details section', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          details="Detailed error information"
          stackTrace="Error: Test error\n    at test.js:1:1"
          context={{ userId: '123', action: 'submit' }}
        />
      );
      
      expect(screen.getByText('Show details')).toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    test.each([
      [ERROR_TYPES.VALIDATION, 'Validation Error'],
      [ERROR_TYPES.NETWORK, 'Network Error'],
      [ERROR_TYPES.SYSTEM, 'System Error'],
      [ERROR_TYPES.API, 'API Error'],
      [ERROR_TYPES.AUTHENTICATION, 'Authentication Error'],
      [ERROR_TYPES.AUTHORIZATION, 'Authorization Error'],
      [ERROR_TYPES.DATABASE, 'Database Error'],
      [ERROR_TYPES.TIMEOUT, 'Timeout Error'],
      [ERROR_TYPES.PAYMENT, 'Payment Error'],
      [ERROR_TYPES.FILE_UPLOAD, 'File Upload Error'],
      [ERROR_TYPES.UNKNOWN, 'Unknown Error'],
    ])('renders correct icon for error type: %s', (type, description) => {
      render(<ErrorNotification {...defaultProps} type={type} />);
      
      const icon = screen.getByRole('alert').querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    test.each([
      [ERROR_SEVERITY.INFO, 'INFO'],
      [ERROR_SEVERITY.WARNING, 'WARNING'],
      [ERROR_SEVERITY.ERROR, 'ERROR'],
      [ERROR_SEVERITY.CRITICAL, 'CRITICAL'],
    ])('renders correct severity badge for: %s', (severity, badgeText) => {
      render(<ErrorNotification {...defaultProps} severity={severity} />);
      
      expect(screen.getByText(badgeText)).toBeInTheDocument();
    });

    test('critical errors do not auto-close', () => {
      const onClose = jest.fn();
      render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.CRITICAL}
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    test('non-critical errors auto-close when enabled', () => {
      const onClose = jest.fn();
      render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.ERROR}
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      expect(onClose).toHaveBeenCalledWith('test-error-1');
    });
  });

  describe('Details Expansion', () => {
    test('toggles details section when clicked', async () => {
      const user = userEvent.setup();
      render(
        <ErrorNotification
          {...defaultProps}
          details="Detailed error information"
        />
      );
      
      const toggleButton = screen.getByText('Show details');
      expect(toggleButton).toBeInTheDocument();
      
      await user.click(toggleButton);
      
      expect(screen.getByText('Hide details')).toBeInTheDocument();
      expect(screen.getByText('Detailed error information')).toBeInTheDocument();
      
      await user.click(screen.getByText('Hide details'));
      
      expect(screen.getByText('Show details')).toBeInTheDocument();
      expect(screen.queryByText('Detailed error information')).not.toBeInTheDocument();
    });

    test('toggles stack trace when clicked', async () => {
      const user = userEvent.setup();
      render(
        <ErrorNotification
          {...defaultProps}
          stackTrace="Error: Test error\n    at test.js:1:1"
        />
      );
      
      // First, show details
      await user.click(screen.getByText('Show details'));
      
      const stackTraceToggle = screen.getByText('Show stack trace');
      expect(stackTraceToggle).toBeInTheDocument();
      
      await user.click(stackTraceToggle);
      
      expect(screen.getByText('Hide stack trace')).toBeInTheDocument();
      expect(screen.getByText('Error: Test error\n    at test.js:1:1')).toBeInTheDocument();
    });

    test('renders context information', async () => {
      const user = userEvent.setup();
      const context = {
        userId: '123',
        action: 'submit',
        timestamp: '2023-01-01T00:00:00Z',
      };
      
      render(
        <ErrorNotification
          {...defaultProps}
          context={context}
        />
      );
      
      await user.click(screen.getByText('Show details'));
      
      expect(screen.getByText('userId:')).toBeInTheDocument();
      expect(screen.getByText('"123"')).toBeInTheDocument();
      expect(screen.getByText('action:')).toBeInTheDocument();
      expect(screen.getByText('"submit"')).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    test('calls onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn();
      
      render(<ErrorNotification {...defaultProps} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledWith('test-error-1', {});
    });

    test('calls onReportIssue when report issue button is clicked', async () => {
      const user = userEvent.setup();
      const onReportIssue = jest.fn();
      
      render(
        <ErrorNotification
          {...defaultProps}
          onReportIssue={onReportIssue}
          errorCode="ERR_500"
        />
      );
      
      const reportButton = screen.getByText('Report Issue');
      await user.click(reportButton);
      
      expect(onReportIssue).toHaveBeenCalledWith('test-error-1', {
        type: ERROR_TYPES.SYSTEM,
        severity: ERROR_SEVERITY.ERROR,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        title: 'Test Error',
        message: 'This is a test error message',
        errorCode: 'ERR_500',
        details: null,
        stackTrace: null,
        context: {},
        timestamp: '2023-01-01T00:00:00Z',
      });
    });

    test('calls onGetHelp when get help button is clicked', async () => {
      const user = userEvent.setup();
      const onGetHelp = jest.fn();
      
      render(
        <ErrorNotification
          {...defaultProps}
          onGetHelp={onGetHelp}
          type={ERROR_TYPES.NETWORK}
          errorCode="NET_001"
        />
      );
      
      const helpButton = screen.getByText('Get Help');
      await user.click(helpButton);
      
      expect(onGetHelp).toHaveBeenCalledWith('test-error-1', {
        type: ERROR_TYPES.NETWORK,
        category: ERROR_CATEGORIES.SYSTEM_FAILURE,
        errorCode: 'NET_001',
      });
    });

    test('calls onViewLogs when view logs button is clicked', async () => {
      const user = userEvent.setup();
      const onViewLogs = jest.fn();
      
      render(
        <ErrorNotification
          {...defaultProps}
          onViewLogs={onViewLogs}
          errorCode="LOG_001"
        />
      );
      
      const logsButton = screen.getByText('View Logs');
      await user.click(logsButton);
      
      expect(onViewLogs).toHaveBeenCalledWith('test-error-1', {
        errorCode: 'LOG_001',
        timestamp: '2023-01-01T00:00:00Z',
        context: {},
      });
    });

    test('calls onMarkAsRead when mark as read button is clicked', async () => {
      const user = userEvent.setup();
      const onMarkAsRead = jest.fn();
      
      render(
        <ErrorNotification
          {...defaultProps}
          onMarkAsRead={onMarkAsRead}
          read={false}
        />
      );
      
      const markReadButton = screen.getByText('Mark as Read');
      await user.click(markReadButton);
      
      expect(onMarkAsRead).toHaveBeenCalledWith('test-error-1');
    });

    test('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();
      
      render(<ErrorNotification {...defaultProps} onDelete={onDelete} />);
      
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith('test-error-1');
    });

    test('shows loading state when retrying', async () => {
      const user = userEvent.setup();
      const onRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<ErrorNotification {...defaultProps} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);
      
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
    });

    test('shows loading state when reporting issue', async () => {
      const user = userEvent.setup();
      const onReportIssue = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(<ErrorNotification {...defaultProps} onReportIssue={onReportIssue} />);
      
      const reportButton = screen.getByText('Report Issue');
      await user.click(reportButton);
      
      expect(screen.getByText('Reporting...')).toBeInTheDocument();
      expect(reportButton).toBeDisabled();
    });
  });

  describe('Close Behavior', () => {
    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<ErrorNotification {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Dismiss notification');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledWith('test-error-1');
    });

    test('removes notification from DOM when closed', async () => {
      const user = userEvent.setup();
      render(<ErrorNotification {...defaultProps} />);
      
      const closeButton = screen.getByLabelText('Dismiss notification');
      await user.click(closeButton);
      
      expect(screen.queryByText('Test Error')).not.toBeInTheDocument();
    });
  });

  describe('Read State', () => {
    test('applies read styling when notification is read', () => {
      render(<ErrorNotification {...defaultProps} read={true} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('opacity-75');
    });

    test('does not show mark as read button when notification is already read', () => {
      render(<ErrorNotification {...defaultProps} read={true} onMarkAsRead={jest.fn()} />);
      
      expect(screen.queryByText('Mark as Read')).not.toBeInTheDocument();
    });

    test('shows unread indicator when notification is unread', () => {
      render(<ErrorNotification {...defaultProps} read={false} />);
      
      const indicator = screen.getByRole('alert').querySelector('.absolute.top-2.right-2');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    test('formats timestamp correctly', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      render(
        <ErrorNotification
          {...defaultProps}
          timestamp={fiveMinutesAgo.toISOString()}
        />
      );
      
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('sets appropriate aria-live attribute based on severity', () => {
      const { rerender } = render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.CRITICAL}
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
      
      rerender(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.ERROR}
        />
      );
      
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });

    test('provides proper aria-label for close button', () => {
      render(<ErrorNotification {...defaultProps} />);
      
      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });
  });

  describe('Auto-dismiss Progress Bar', () => {
    test('shows progress bar when auto-close is enabled', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          autoClose={true}
          duration={5000}
        />
      );
      
      const progressBar = screen.getByRole('alert').querySelector('.absolute.top-0.left-0');
      expect(progressBar).toBeInTheDocument();
    });

    test('does not show progress bar when auto-close is disabled', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          autoClose={false}
        />
      );
      
      const progressBar = screen.getByRole('alert').querySelector('.absolute.top-0.left-0');
      expect(progressBar).not.toBeInTheDocument();
    });

    test('progress bar decreases over time', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          autoClose={true}
          duration={1000}
        />
      );
      
      const progressFill = screen.getByRole('alert').querySelector('.h-full.bg-current');
      expect(progressFill).toHaveStyle('width: 100%');
      
      // Fast-forward half the time
      jest.advanceTimersByTime(500);
      
      expect(progressFill).toHaveStyle('width: 50%');
    });
  });

  describe('Custom Styling', () => {
    test('applies custom className when provided', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          className="custom-notification-class"
        />
      );
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('custom-notification-class');
    });
  });

  describe('Error Categories', () => {
    test.each([
      [ERROR_CATEGORIES.USER_INPUT, 'user_input'],
      [ERROR_CATEGORIES.SYSTEM_FAILURE, 'system_failure'],
      [ERROR_CATEGORIES.COMMUNICATION, 'communication'],
      [ERROR_CATEGORIES.DATA_INTEGRITY, 'data_integrity'],
      [ERROR_CATEGORIES.SECURITY, 'security'],
      [ERROR_CATEGORIES.PERFORMANCE, 'performance'],
      [ERROR_CATEGORIES.BUSINESS_LOGIC, 'business_logic'],
    ])('uses correct error category: %s', (category) => {
      render(<ErrorNotification {...defaultProps} category={category} />);
      
      // The category is used for internal logic, not directly displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});

describe('ErrorNotification Constants', () => {
  test('exports correct error types', () => {
    expect(ERROR_TYPES).toEqual({
      VALIDATION: 'validation',
      NETWORK: 'network',
      SYSTEM: 'system',
      API: 'api',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      DATABASE: 'database',
      TIMEOUT: 'timeout',
      PAYMENT: 'payment',
      FILE_UPLOAD: 'file_upload',
      UNKNOWN: 'unknown',
    });
  });

  test('exports correct severity levels', () => {
    expect(ERROR_SEVERITY).toEqual({
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical',
    });
  });

  test('exports correct error categories', () => {
    expect(ERROR_CATEGORIES).toEqual({
      USER_INPUT: 'user_input',
      SYSTEM_FAILURE: 'system_failure',
      COMMUNICATION: 'communication',
      DATA_INTEGRITY: 'data_integrity',
      SECURITY: 'security',
      PERFORMANCE: 'performance',
      BUSINESS_LOGIC: 'business_logic',
    });
  });

  describe('Edge Cases', () => {
    test('handles extremely long error messages', () => {
      const extremelyLongMessage = 'A'.repeat(5000);
      
      render(
        <ErrorNotification
          {...defaultProps}
          message={extremelyLongMessage}
        />
      );

      expect(screen.getByText(/A+/)).toBeInTheDocument();
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    test('handles special characters in error messages', () => {
      const specialMessage = 'Special chars: !@#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      render(
        <ErrorNotification
          {...defaultProps}
          message={specialMessage}
        />
      );

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    test('handles null/undefined optional props gracefully', () => {
      expect(() => {
        render(
          <ErrorNotification
            {...defaultProps}
            errorCode={null}
            userAction={undefined}
            affectedComponents={null}
            recoverySuggestions={undefined}
          />
        );
      }).not.toThrow();
    });

    test('handles empty arrays gracefully', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          affectedComponents={[]}
          recoverySuggestions={[]}
        />
      );

      expect(screen.queryByText('Affected:')).not.toBeInTheDocument();
      expect(screen.queryByText('Suggested solutions:')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently with large stack traces', () => {
      const largeStackTrace = Array.from({ length: 100 }, (_, i) =>
        `Error at test.js:${i + 1}:${i + 1}`
      ).join('\n');

      const startTime = performance.now();
      
      render(
        <ErrorNotification
          {...defaultProps}
          stackTrace={largeStackTrace}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    test('handles rapid error state changes', () => {
      const { rerender } = render(<ErrorNotification {...defaultProps} />);

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const severities = ['info', 'warning', 'error', 'critical'];
        const severity = severities[i % severities.length];
        
        rerender(
          <ErrorNotification
            {...defaultProps}
            severity={severity}
          />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes for critical errors', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.CRITICAL}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
      expect(notification).toHaveAttribute('aria-atomic', 'true');
    });

    test('announces error code to screen readers', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          errorCode="ERR_500"
        />
      );

      expect(screen.getByText('ERR_500')).toBeInTheDocument();
    });

    test('provides proper error descriptions', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          type={ERROR_TYPES.VALIDATION}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-describedby');
    });
  });

  describe('Real-time Updates', () => {
    test('updates when error data changes', () => {
      const { rerender } = render(<ErrorNotification {...defaultProps} />);

      expect(screen.getByText('Test Error')).toBeInTheDocument();

      const updatedProps = {
        ...defaultProps,
        title: 'Updated Error',
        severity: ERROR_SEVERITY.CRITICAL,
      };

      rerender(<ErrorNotification {...updatedProps} />);

      expect(screen.getByText('Updated Error')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    });

    test('handles new recovery suggestions', () => {
      const { rerender } = render(<ErrorNotification {...defaultProps} />);

      expect(screen.queryByText('Suggested solutions:')).not.toBeInTheDocument();

      const newSuggestions = ['Try refreshing the page', 'Check your connection'];
      const updatedProps = {
        ...defaultProps,
        recoverySuggestions: newSuggestions,
      };

      rerender(<ErrorNotification {...updatedProps} />);

      expect(screen.getByText('Suggested solutions:')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
      expect(screen.getByText('Check your connection')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('integrates with error reporting system', () => {
      const mockErrorReporting = {
        reportError: jest.fn(),
        trackError: jest.fn(),
      };

      jest.doMock('../../services/errorReporting.js', () => ({
        errorReporting: mockErrorReporting,
      }));

      render(
        <ErrorNotification
          {...defaultProps}
          onReportIssue={mockErrorReporting.reportError}
        />
      );

      const reportButton = screen.getByText('Report Issue');
      fireEvent.click(reportButton);

      expect(mockErrorReporting.reportError).toHaveBeenCalledWith(
        defaultProps.id,
        expect.objectContaining({
          type: ERROR_TYPES.SYSTEM,
          severity: ERROR_SEVERITY.ERROR,
        })
      );
    });

    test('integrates with logging system', () => {
      const mockLogging = {
        logError: jest.fn(),
        getErrorLogs: jest.fn(),
      };

      jest.doMock('../../services/logging.js', () => ({
        logging: mockLogging,
      }));

      render(
        <ErrorNotification
          {...defaultProps}
          onViewLogs={mockLogging.getErrorLogs}
        />
      );

      const logsButton = screen.getByText('View Logs');
      fireEvent.click(logsButton);

      expect(mockLogging.getErrorLogs).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('Error Recovery', () => {
    test('shows retry functionality for recoverable errors', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          type={ERROR_TYPES.NETWORK}
          onRetry={jest.fn()}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('hides retry for non-recoverable errors', () => {
      render(
        <ErrorNotification
          {...defaultProps}
          type={ERROR_TYPES.VALIDATION}
          onRetry={jest.fn()}
        />
      );

      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });

    test('provides contextual help based on error type', () => {
      const { rerender } = render(<ErrorNotification {...defaultProps} />);

      // Network errors should show "Get Help"
      rerender(
        <ErrorNotification
          {...defaultProps}
          type={ERROR_TYPES.NETWORK}
          onGetHelp={jest.fn()}
        />
      );

      expect(screen.getByText('Get Help')).toBeInTheDocument();

      // Validation errors should not show "Get Help"
      rerender(
        <ErrorNotification
          {...defaultProps}
          type={ERROR_TYPES.VALIDATION}
          onGetHelp={jest.fn()}
        />
      );

      expect(screen.queryByText('Get Help')).not.toBeInTheDocument();
    });
  });

  describe('Auto-dismiss Behavior', () => {
    test('critical errors do not auto-dismiss', () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.CRITICAL}
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );

      // Fast-forward time
      jest.advanceTimersByTime(2000);

      expect(onClose).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('non-critical errors auto-dismiss when enabled', () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      render(
        <ErrorNotification
          {...defaultProps}
          severity={ERROR_SEVERITY.ERROR}
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );

      // Fast-forward time
      jest.advanceTimersByTime(1500);

      expect(onClose).toHaveBeenCalledWith(defaultProps.id);
      
      jest.useRealTimers();
    });
  });
});