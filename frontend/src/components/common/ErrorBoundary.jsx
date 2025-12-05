import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Support } from 'lucide-react';
import { createErrorBoundaryFallback, errorLogger } from '../../utils/errorHandling.js';

/**
 * ErrorBoundary component for catching and handling React errors
 * Provides fallback UI with retry functionality and error reporting
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to our error logging service
    this.setState({
      errorInfo,
    });

    const standardError = errorLogger.log(error, {
      component: this.props.componentName || 'Unknown',
      errorInfo,
      isBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(standardError);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleContactSupport = () => {
    // Open support email or help desk
    const subject = encodeURIComponent('Error Report - Financial Dashboard');
    const body = encodeURIComponent(`
Error occurred in: ${this.props.componentName || 'Unknown Component'}
Error: ${this.state.error?.message || 'Unknown error'}
Time: ${new Date().toISOString()}
Retry Count: ${this.state.retryCount}

${this.state.errorInfo?.componentStack || 'No component stack available'}
    `);
    
    window.location.href = `mailto:support@boosty.com?subject=${subject}&body=${body}`;
  };

  render() {
    if (this.state.hasError) {
      const { fallback, showRetry = true, showSupport = true, showHome = true } = this.props;
      
      // Use custom fallback if provided
      if (fallback) {
        return typeof fallback === 'function' 
          ? fallback(this.state.error, this.handleRetry)
          : fallback;
      }

      // Default error UI
      const errorData = createErrorBoundaryFallback(this.state.error, this.handleRetry);
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
              {errorData.title}
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 text-center mb-6">
              {errorData.message}
            </p>

            {/* Action Suggestion */}
            {errorData.action && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Suggestion:</strong> {errorData.action}
                </p>
              </div>
            )}

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-gray-100 rounded p-3 text-xs font-mono overflow-auto max-h-32">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  <div className="mt-2">
                    <strong>Retry Count:</strong> {this.state.retryCount}
                  </div>
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Retry Button */}
              {showRetry && errorData.showRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Retry loading the component"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              {/* Support Button */}
              {showSupport && (
                <button
                  onClick={this.handleContactSupport}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="Contact support for help"
                >
                  <Support className="w-4 h-4" />
                  Contact Support
                </button>
              )}

              {/* Home Button */}
              {showHome && (
                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="Go to homepage"
                >
                  <Home className="w-4 h-4" />
                  Go to Homepage
                </button>
              )}
            </div>

            {/* Retry Limit Warning */}
            {this.state.retryCount >= 3 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You've tried to reload this component multiple times. 
                  If the problem persists, please contact support or try refreshing the entire page.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Specialized error boundary for finance components
 */
export const FinanceErrorBoundary = ({ children, componentName, ...props }) => (
  <ErrorBoundary
    componentName={`Finance - ${componentName}`}
    fallback={(error, retry) => (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">
              Financial Data Error
            </h3>
            <p className="text-red-700">
              {error?.message || 'An error occurred while loading financial data'}
            </p>
          </div>
        </div>
        
        <div className="bg-red-100 rounded p-3 mb-4">
          <p className="text-sm text-red-800">
            <strong>What happened:</strong> The financial component failed to load properly. 
            This could be due to a temporary issue with data retrieval or a processing error.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={retry}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Retry loading financial data"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Refresh the entire page"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )}
    {...props}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Inline error boundary for smaller components
 */
export const InlineErrorBoundary = ({ children, fallback, className = '' }) => (
  <ErrorBoundary
    fallback={fallback || (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Component Error
            </p>
            <p className="text-sm text-yellow-700">
              This component failed to load. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);

/**
 * Hook for error boundary integration
 */
export const useErrorBoundary = () => {
  const [error, setError] = React.useState(null);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return React.useCallback((error) => {
    setError(error);
  }, []);
};

export default ErrorBoundary;