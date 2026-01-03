import React, { useState } from 'react';
import ErrorNotification, {
  ERROR_TYPES,
  ERROR_SEVERITY,
  ERROR_CATEGORIES,
} from './ErrorNotification';

/**
 * Example component demonstrating ErrorNotification usage
 */
const ErrorNotificationExample = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 'error-1',
      type: ERROR_TYPES.VALIDATION,
      severity: ERROR_SEVERITY.WARNING,
      category: ERROR_CATEGORIES.USER_INPUT,
      title: 'Invalid Form Data',
      message: 'Please check the highlighted fields and correct any errors.',
      errorCode: 'VAL_001',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      userAction: 'Form submission',
      affectedComponents: ['UserRegistrationForm'],
      recoverySuggestions: [
        'Check all required fields are filled',
        'Ensure email format is correct',
        'Password must meet security requirements'
      ],
      details: 'Field validation failed for: email, password, confirmPassword',
      context: {
        formId: 'user-registration',
        fieldErrors: {
          email: 'Invalid email format',
          password: 'Password too short',
          confirmPassword: 'Passwords do not match'
        }
      }
    },
    {
      id: 'error-2',
      type: ERROR_TYPES.NETWORK,
      severity: ERROR_SEVERITY.ERROR,
      category: ERROR_CATEGORIES.COMMUNICATION,
      title: 'Connection Failed',
      message: 'Unable to connect to the server. Please check your internet connection.',
      errorCode: 'NET_503',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      userAction: 'API request to /api/users',
      affectedComponents: ['UserService', 'UserList'],
      recoverySuggestions: [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists'
      ],
      details: 'Failed to connect to api.boosty-platform.com after 3 attempts',
      stackTrace: `NetworkError: Failed to fetch
    at UserService.fetchUsers (user.service.js:45:12)
    at UserList.componentDidMount (UserList.jsx:23:8)
    at ReactCompositeComponent.js (react-dom.development.js:1234:15)`,
      context: {
        url: '/api/users',
        method: 'GET',
        timeout: 10000,
        retryCount: 3
      }
    },
    {
      id: 'error-3',
      type: ERROR_TYPES.PAYMENT,
      severity: ERROR_SEVERITY.CRITICAL,
      category: ERROR_CATEGORIES.BUSINESS_LOGIC,
      title: 'Payment Processing Failed',
      message: 'Your payment could not be processed. Please check your payment details.',
      errorCode: 'PAY_402',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      userAction: 'Processing investment payment',
      affectedComponents: ['PaymentService', 'InvestmentForm'],
      persist: true,
      recoverySuggestions: [
        'Check your card details and expiration date',
        'Verify your billing address',
        'Ensure sufficient funds are available',
        'Try an alternative payment method'
      ],
      details: 'Payment gateway declined transaction with error code: "Do Not Honor"',
      context: {
        paymentGateway: 'Stripe',
        transactionId: 'txn_3214567890',
        amount: 5000,
        currency: 'USD',
        last4: '4242'
      }
    }
  ]);

  const handleRetry = (id, context) => {
    console.log(`Retrying operation for error ${id}:`, context);
    // Implement retry logic here
  };

  const handleReportIssue = (id, errorData) => {
    console.log(`Reporting issue for error ${id}:`, errorData);
    // Implement issue reporting logic here
  };

  const handleGetHelp = (id, errorInfo) => {
    console.log(`Getting help for error ${id}:`, errorInfo);
    // Implement help logic here
  };

  const handleViewLogs = (id, logInfo) => {
    console.log(`Viewing logs for error ${id}:`, logInfo);
    // Implement log viewing logic here
  };

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const handleDelete = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const handleClose = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const addNewError = () => {
    const newError = {
      id: `error-${Date.now()}`,
      type: ERROR_TYPES.API,
      severity: ERROR_SEVERITY.ERROR,
      category: ERROR_CATEGORIES.COMMUNICATION,
      title: 'API Rate Limit Exceeded',
      message: 'You have exceeded the API rate limit. Please try again later.',
      errorCode: 'API_429',
      timestamp: new Date().toISOString(),
      userAction: 'Fetching user data',
      recoverySuggestions: [
        'Wait a few minutes before trying again',
        'Reduce the frequency of API calls',
        'Consider upgrading your plan for higher limits'
      ],
      details: 'Rate limit of 100 requests per 15 minutes exceeded',
      context: {
        endpoint: '/api/users',
        limit: 100,
        window: '15 minutes',
        currentUsage: 105
      }
    };

    setNotifications(prev => [newError, ...prev]);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ErrorNotification Component Examples
          </h1>
          <p className="text-gray-600">
            This page demonstrates various error notification types and their features.
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={addNewError}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add New Error
          </button>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <ErrorNotification
              key={notification.id}
              {...notification}
              onRetry={handleRetry}
              onReportIssue={handleReportIssue}
              onGetHelp={handleGetHelp}
              onViewLogs={handleViewLogs}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onClose={handleClose}
            />
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No error notifications to display.
            </p>
            <button
              onClick={addNewError}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add an Error Example
            </button>
          </div>
        )}

        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Error Types & Severities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Error Types</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Validation - Form validation errors</li>
                <li>• Network - Connection and network issues</li>
                <li>• System - System-level errors</li>
                <li>• API - API-related errors</li>
                <li>• Authentication - Login and auth issues</li>
                <li>• Payment - Payment processing errors</li>
                <li>• Timeout - Request timeout errors</li>
                <li>• File Upload - File processing errors</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Severity Levels</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Info - Informational messages</li>
                <li>• Warning - Warning messages (auto-dismiss)</li>
                <li>• Error - Error messages (no auto-dismiss)</li>
                <li>• Critical - Critical errors (persistent, animated)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Error Details</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Expandable error details</li>
                <li>• Stack trace display</li>
                <li>• Context information</li>
                <li>• Error codes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Retry failed operations</li>
                <li>• Report issues to support</li>
                <li>• Get contextual help</li>
                <li>• View detailed logs</li>
                <li>• Mark as read/delete</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Integration</h2>
          <div className="bg-gray-100 rounded p-4">
            <pre className="text-sm text-gray-800 overflow-x-auto">
{`import { useNotification } from '../hooks/useNotification';

const { notifyNetworkError, notifyValidationError } = useNotification();

// Show validation error
notifyValidationError(
  'Email address is required',
  'Form Validation Error',
  {
    errorCode: 'VAL_001',
    context: { field: 'email', value: '' },
    recoverySuggestions: [
      'Enter a valid email address',
      'Ensure email format is correct'
    ]
  }
);

// Show network error
notifyNetworkError(
  'Unable to connect to server',
  'Connection Failed',
  {
    errorCode: 'NET_503',
    stackTrace: 'NetworkError: Failed to fetch...',
    onRetry: () => retryConnection()
  }
);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorNotificationExample;