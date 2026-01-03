import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinancialKPICards from './FinancialKPICards.jsx';

// Mock the API
jest.mock('../../api/dashboard.js', () => ({
  dashboardAPI: {
    getOverview: jest.fn(() => Promise.resolve({
      data: {
        summary: {
          totalRevenue: 1500000,
          monthlyRecurringRevenue: 125000,
          totalInvestments: 2500000,
          activeInvestors: 150,
        },
        growth: {
          revenueGrowth: { percentage: 12.5, trend: 'up' },
          investmentGrowth: { percentage: 8.3, trend: 'up' },
        },
        performance: {
          repaymentRate: 94.2,
        }
      }
    }))
  }
}));

// Mock the child components to isolate testing
jest.mock('./RevenueKPI.jsx', () => {
  return function MockRevenueKPI({ data, loading }) {
    return <div data-testid="revenue-kpi">{loading ? 'Loading...' : `Revenue: ${data?.total}`}</div>;
  };
});

jest.mock('./InvestmentKPI.jsx', () => {
  return function MockInvestmentKPI({ data, loading }) {
    return <div data-testid="investment-kpi">{loading ? 'Loading...' : `Investment: ${data?.total}`}</div>;
  };
});

jest.mock('./PayoutKPI.jsx', () => {
  return function MockPayoutKPI({ data, loading }) {
    return <div data-testid="payout-kpi">{loading ? 'Loading...' : `Payout: ${data?.totalVolume}`}</div>;
  };
});

jest.mock('./ROIKPI.jsx', () => {
  return function MockROIKPI({ data, loading }) {
    return <div data-testid="roi-kpi">{loading ? 'Loading...' : `ROI: ${data?.percentage}%`}</div>;
  };
});

describe('FinancialKPICards', () => {
  const defaultProps = {
    dateRange: { startDate: '2025-01-01', endDate: '2025-01-31' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    render(<FinancialKPICards {...defaultProps} />);
    
    // Check for loading skeleton
    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  test('renders KPI cards after data loads', async () => {
    render(<FinancialKPICards {...defaultProps} />);
    
    // Wait for data to load and components to render
    await screen.findByTestId('revenue-kpi');
    await screen.findByTestId('investment-kpi');
    await screen.findByTestId('payout-kpi');
    await screen.findByTestId('roi-kpi');
    
    // Check that data is passed correctly
    expect(screen.getByTestId('revenue-kpi')).toHaveTextContent('Revenue: 1500000');
    expect(screen.getByTestId('investment-kpi')).toHaveTextContent('Investment: 2500000');
    expect(screen.getByTestId('payout-kpi')).toHaveTextContent('Payout: 1500000');
    expect(screen.getByTestId('roi-kpi')).toHaveTextContent('ROI: 94.2%');
  });

  test('renders header with title', () => {
    render(<FinancialKPICards {...defaultProps} />);
    
    expect(screen.getByText('Financial Overview')).toBeInTheDocument();
  });

  test('renders refresh button when showRefresh is true', () => {
    render(<FinancialKPICards {...defaultProps} showRefresh={true} />);
    
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  test('does not render refresh button when showRefresh is false', () => {
    render(<FinancialKPICards {...defaultProps} showRefresh={false} />);
    
    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <FinancialKPICards {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('handles error state gracefully', async () => {
    // Mock API error
    const { dashboardAPI } = require('../../api/dashboard.js');
    dashboardAPI.getOverview.mockRejectedValueOnce(new Error('API Error'));
    
    render(<FinancialKPICards {...defaultProps} />);
    
    // Wait for error to appear
    await screen.findByText('Failed to load financial KPIs');
    expect(screen.getByText('API Error')).toBeInTheDocument();
  });
});