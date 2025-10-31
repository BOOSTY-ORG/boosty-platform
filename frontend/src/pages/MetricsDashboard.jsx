import React, { useState } from 'react';
import { MetricsAuthProvider, useMetricsAuth, withMetricsAuth, RoleBasedAccess } from '../contexts/MetricsAuthContext';
import MetricsErrorBoundary from '../components/ErrorBoundary/MetricsErrorBoundary';
import MetricsOverview from '../components/Dashboard/MetricsOverview';
import InvestorMetrics from '../components/Investor/InvestorMetrics';
import UserMetrics from '../components/Users/UserMetrics';
import TransactionMetrics from '../components/Transactions/TransactionMetrics';
import './MetricsDashboard.css';

/**
 * MetricsDashboard Component
 * Main dashboard page that integrates all metrics components
 */
const MetricsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { isAuthenticated, user, role, logout } = useMetricsAuth();

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return (
      <div className="metrics-dashboard auth-required">
        <div className="login-prompt">
          <h2>Metrics Dashboard</h2>
          <p>Please log in to access the metrics dashboard.</p>
          <button onClick={() => window.location.href = '/login'} className="login-button">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <MetricsAuthProvider>
      <MetricsErrorBoundary>
        <div className="metrics-dashboard">
          {/* Header */}
          <header className="dashboard-header">
            <div className="header-content">
              <h1 className="dashboard-title">Boosty Metrics Dashboard</h1>
              
              <div className="user-info">
                <span className="welcome-message">
                  Welcome, {user?.name || user?.email || 'User'}
                </span>
                <span className="user-role">({role})</span>
                <button onClick={handleLogout} className="logout-button">
                  Logout
                </button>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className="dashboard-nav">
            <div className="nav-tabs">
              <button
                className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('overview')}
              >
                Overview
              </button>
              
              <RoleBasedAccess roles={['admin', 'manager', 'analyst']}>
                <button
                  className={`nav-tab ${activeTab === 'investors' ? 'active' : ''}`}
                  onClick={() => handleTabChange('investors')}
                >
                  Investors
                </button>
              </RoleBasedAccess>
              
              <RoleBasedAccess roles={['admin', 'manager']}>
                <button
                  className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => handleTabChange('users')}
                >
                  Users
                </button>
              </RoleBasedAccess>
              
              <RoleBasedAccess roles={['admin', 'manager', 'analyst']}>
                <button
                  className={`nav-tab ${activeTab === 'transactions' ? 'active' : ''}`}
                  onClick={() => handleTabChange('transactions')}
                >
                  Transactions
                </button>
              </RoleBasedAccess>
            </div>
          </nav>

          {/* Content Area */}
          <main className="dashboard-content">
            {activeTab === 'overview' && (
              <div className="content-panel">
                <MetricsOverview />
              </div>
            )}
            
            {activeTab === 'investors' && (
              <div className="content-panel">
                <InvestorMetrics />
              </div>
            )}
            
            {activeTab === 'users' && (
              <div className="content-panel">
                <UserMetrics />
              </div>
            )}
            
            {activeTab === 'transactions' && (
              <div className="content-panel">
                <TransactionMetrics />
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="dashboard-footer">
            <div className="footer-content">
              <p className="footer-text">
                © 2024 Boosty Platform. All rights reserved.
              </p>
              <div className="footer-links">
                <a href="/docs/metrics-api-documentation" target="_blank" rel="noopener noreferrer">
                  API Documentation
                </a>
                <a href="/support" target="_blank" rel="noopener noreferrer">
                  Support
                </a>
                <a href="/feedback" target="_blank" rel="noopener noreferrer">
                  Send Feedback
                </a>
              </div>
            </div>
          </footer>
        </div>
      </MetricsErrorBoundary>
    </MetricsAuthProvider>
  );
};

// Wrap with authentication HOC
export default withMetricsAuth(MetricsDashboard);