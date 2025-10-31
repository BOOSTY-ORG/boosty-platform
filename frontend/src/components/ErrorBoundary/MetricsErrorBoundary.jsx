import React, { Component } from 'react';
import './MetricsErrorBoundary.css';

/**
 * MetricsErrorBoundary Component
 * Catches and handles errors in metrics components
 */
class MetricsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    try {
      // Send error to monitoring service
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
            errorBoundary: errorInfo.errorBoundary,
          },
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          component: 'MetricsErrorBoundary'
        })
      }).catch(err => {
        console.error('Failed to log error:', err);
      });
    } catch (err) {
      console.error('Error logging failed:', err);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback, maxRetries = 3 } = this.props;
      const { retryCount } = this.state;

      // If we have a custom fallback component, use it
      if (fallback && retryCount < maxRetries) {
        return fallback;
      }

      // Otherwise show the default error UI
      return (
        <div className="metrics-error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            
            <h2 className="error-title">Something went wrong</h2>
            
            <div className="error-details">
              <p className="error-message">
                We encountered an error while loading the metrics dashboard.
              </p>
              
              {this.state.error && (
                <details className="error-technical-details">
                  <summary>Error Details</summary>
                  <div className="error-stack">
                    <strong>Error:</strong> {this.state.error.message}
                    {this.state.errorInfo && (
                      <div className="component-stack">
                        <strong>Component Stack:</strong>
                        <pre>{this.state.errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
            
            <div className="error-actions">
              {retryCount < maxRetries && (
                <button 
                  onClick={this.handleRetry}
                  className="retry-button"
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button 
                onClick={this.handleReload}
                className="reload-button"
              >
                Reload Page
              </button>
              
              <button 
                onClick={() => window.location.href = '/support'}
                className="support-button"
              >
                Contact Support
              </button>
            </div>
            
            {retryCount >= maxRetries && (
              <div className="error-fallback">
                <p>
                  Maximum retry attempts reached. Please try refreshing the page or contact support if the problem persists.
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

export default MetricsErrorBoundary;