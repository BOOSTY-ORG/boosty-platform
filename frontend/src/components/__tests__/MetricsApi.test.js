/**
 * Metrics API Integration Tests
 * Tests for the metrics API service and components
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { metricsApi, metricsClient, tokenStorage } from '../../services/metricsApi';
import MetricsOverview from '../Dashboard/MetricsOverview';
import InvestorMetrics from '../Investor/InvestorMetrics';
import UserMetrics from '../Users/UserMetrics';
import TransactionMetrics from '../Transactions/TransactionMetrics';
import MetricsErrorBoundary from '../ErrorBoundary/MetricsErrorBoundary';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Metrics API Service', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('Token Management', () => {
    test('should store and retrieve token', () => {
      const token = 'test-token';
      tokenStorage.setToken(token);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('metrics_token', token);
      
      localStorageMock.getItem.mockReturnValue(token);
      const retrievedToken = tokenStorage.getToken();
      expect(retrievedToken).toBe(token);
    });

    test('should clear token', () => {
      tokenStorage.clearToken();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('metrics_token');
    });

    test('should check token expiration', () => {
      const expiredToken = 'expired.token';
      const payload = { exp: Math.floor(Date.now() / 1000) - 3600 }; // 1 hour ago
      const tokenParts = expiredToken.split('.');
      tokenParts[1] = btoa(JSON.stringify(payload));
      const mockExpiredToken = tokenParts.join('.');
      
      localStorageMock.getItem.mockReturnValue(mockExpiredToken);
      expect(tokenStorage.isTokenExpired(mockExpiredToken)).toBe(true);
    });
  });

  describe('API Client', () => {
    test('should set auth token', () => {
      const token = 'test-token';
      metricsClient.setAuthToken(token);
      expect(metricsClient.authToken).toBe(token);
    });

    test('should make authenticated request', async () => {
      const token = 'test-token';
      const mockResponse = { success: true, data: { test: 'data' } };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      metricsClient.setAuthToken(token);
      const result = await metricsClient.request('/test');
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${token}`
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('should handle request error', async () => {
      const errorMessage = 'Request failed';
      
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: errorMessage } })
      });
      
      await expect(metricsClient.request('/test')).rejects.toThrow(errorMessage);
    });
  });

  describe('Dashboard Endpoints', () => {
    test('should fetch dashboard overview', async () => {
      const mockData = { success: true, data: { summary: { totalUsers: 100 } } };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      const result = await metricsApi.getDashboardOverview({ dateRange: 'last_30_days' });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/overview?dateRange=last_30_days'),
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });

    test('should fetch realtime metrics', async () => {
      const mockData = { success: true, data: { activeUsers: 50 } };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      const result = await metricsApi.getRealtimeMetrics();
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/dashboard/realtime'),
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('Investor Endpoints', () => {
    test('should fetch investor metrics', async () => {
      const mockData = { success: true, data: { summary: { totalInvestors: 50 } } };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      const result = await metricsApi.getInvestorMetrics({ 
        investorType: ['individual'], 
        page: 1 
      });
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/investors?investorType=individual&page=1'),
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });

    test('should fetch investor details', async () => {
      const investorId = 'inv_123';
      const mockData = { success: true, data: { id: investorId, name: 'Test Investor' } };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      const result = await metricsApi.getInvestorDetails(investorId);
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/investors/${investorId}`),
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('Error Handling', () => {
    test('should handle 401 error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } })
      });
      
      // Mock window.location.href
      delete window.location;
      window.location = { href: '' };
      
      await expect(metricsApi.getDashboardOverview()).rejects.toThrow();
      
      // Should redirect to login on auth error
      expect(window.location.href).toBe('/login');
    });

    test('should handle 429 error with retry', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } })
      });
      
      const result = await metricsApi.getDashboardOverview();
      
      // Should return fallback data on rate limit
      expect(result).toBeNull();
    });
  });
});

describe('Metrics Components', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('MetricsOverview Component', () => {
    test('should render loading state', () => {
      fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<MetricsOverview />);
      
      expect(screen.getByText('Loading dashboard metrics...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('should render dashboard data', async () => {
      const mockData = {
        success: true,
        data: {
          summary: {
            totalUsers: 100,
            activeUsers: 80,
            totalInvestors: 20,
            activeInvestors: 15,
            totalInvestments: 50000,
            totalApplications: 50,
            pendingApplications: 5,
            approvedApplications: 40,
            installedSystems: 35,
            totalRevenue: 100000,
            monthlyRecurringRevenue: 8000
          },
          growth: {
            userGrowth: { current: 100, previous: 80, percentage: 25, trend: 'up' },
            investmentGrowth: { current: 50000, previous: 40000, percentage: 25, trend: 'up' },
            revenueGrowth: { current: 100000, previous: 80000, percentage: 25, trend: 'up' }
          },
          performance: {
            kycApprovalRate: 85.5,
            applicationApprovalRate: 80.0,
            installationCompletionRate: 70.0,
            repaymentRate: 95.0,
            customerSatisfactionScore: 4.2
          },
          recentActivity: {
            newUsersToday: 5,
            newApplicationsToday: 3,
            newInvestmentsToday: 2,
            completedInstallationsToday: 1,
            repaymentsProcessedToday: 10
          }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      render(<MetricsOverview />);
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total Users
        expect(screen.getByText('₦50,000')).toBeInTheDocument(); // Total Investments
        expect(screen.getByText('85.5%')).toBeInTheDocument(); // KYC Approval Rate
      });
    });

    test('should handle filter changes', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { summary: { totalUsers: 100 } } })
      });
      
      render(<MetricsOverview />);
      
      const timeRangeSelect = screen.getByLabelText('Time Range:');
      fireEvent.change(timeRangeSelect, { target: { value: 'last_7_days' } });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('dateRange=last_7_days'),
          expect.any(Object)
        );
      });
    });
  });

  describe('InvestorMetrics Component', () => {
    test('should render investor metrics', async () => {
      const mockData = {
        success: true,
        data: {
          summary: {
            totalInvestors: 50,
            activeInvestors: 40,
            newInvestors: 5,
            totalInvestmentVolume: 100000,
            averageInvestmentPerInvestor: 2000,
            totalReturns: 8000
          },
          breakdowns: {
            investorType: { individual: 30, institutional: 15, corporate: 5 },
            riskProfile: { conservative: 20, moderate: 25, aggressive: 5 },
            verificationStatus: { verified: 45, pending: 3, rejected: 2 }
          },
          performance: {
            averageROI: 8.0,
            completionRate: 95.0,
            defaultRate: 2.0
          },
          topInvestors: [
            {
              id: 'inv_1',
              name: 'John Doe',
              email: 'john@example.com',
              investorType: 'individual',
              totalInvested: 10000,
              actualReturns: 850,
              roi: 8.5,
              activeInvestments: 5
            }
          ]
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      render(<InvestorMetrics />);
      
      await waitFor(() => {
        expect(screen.getByText('50')).toBeInTheDocument(); // Total Investors
        expect(screen.getByText('₦100,000')).toBeInTheDocument(); // Total Invested
        expect(screen.getByText('8.0%')).toBeInTheDocument(); // Average ROI
      });
    });
  });

  describe('UserMetrics Component', () => {
    test('should render user metrics', async () => {
      const mockData = {
        success: true,
        data: {
          summary: {
            totalUsers: 100,
            activeUsers: 80,
            newUsers: 10,
            userGrowth: { percentage: 10 },
            averageTransactionValue: 500
          },
          applications: {
            totalApplications: 50,
            approvedApplications: 40,
            pendingApplications: 5,
            rejectedApplications: 5
          },
          kycStatus: {
            totalDocuments: 80,
            verifiedDocuments: 70,
            pendingDocuments: 8,
            rejectedDocuments: 2,
            completionRate: 87.5
          }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      render(<UserMetrics />);
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total Users
        expect(screen.getByText('50')).toBeInTheDocument(); // Total Applications
        expect(screen.getByText('87.5%')).toBeInTheDocument(); // KYC Completion Rate
      });
    });
  });

  describe('TransactionMetrics Component', () => {
    test('should render transaction metrics', async () => {
      const mockData = {
        success: true,
        data: {
          summary: {
            totalTransactions: 200,
            completedTransactions: 190,
            pendingTransactions: 8,
            failedTransactions: 2,
            totalVolume: 100000,
            averageTransactionValue: 500,
            completionRate: 95.0
          },
          breakdowns: {
            transactionType: {
              investment: { count: 50, volume: 50000 },
              repayment: { count: 140, volume: 45000 },
              fee: { count: 8, volume: 4000 },
              refund: { count: 2, volume: 1000 }
            },
            byStatus: {
              completed: 190,
              pending: 8,
              failed: 2
            },
            paymentMethod: {
              bank_transfer: { count: 100, volume: 50000 },
              card: { count: 60, volume: 30000 },
              wallet: { count: 30, volume: 15000 },
              auto_debit: { count: 10, volume: 5000 }
            }
          },
          growth: {
            transactionGrowth: { current: 200, previous: 180, percentage: 11.1, trend: 'up' },
            volumeGrowth: { current: 100000, previous: 90000, percentage: 11.1, trend: 'up' }
          }
        }
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData)
      });
      
      render(<TransactionMetrics />);
      
      await waitFor(() => {
        expect(screen.getByText('200')).toBeInTheDocument(); // Total Transactions
        expect(screen.getByText('₦100,000')).toBeInTheDocument(); // Total Volume
        expect(screen.getByText('95.0%')).toBeInTheDocument(); // Completion Rate
      });
    });
  });
});

describe('MetricsErrorBoundary', () => {
  test('should catch and display errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <MetricsErrorBoundary>
        <ThrowError />
      </MetricsErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an error while loading the metrics dashboard.')).toBeInTheDocument();
  });

  test('should provide retry functionality', () => {
    let shouldThrow = true;
    const ThrowError = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No Error</div>;
    };
    
    render(
      <MetricsErrorBoundary>
        <ThrowError />
      </MetricsErrorBoundary>
    );
    
    const retryButton = screen.getByText(/Try Again/);
    fireEvent.click(retryButton);
    
    // After retry, component should render without error
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('No Error')).toBeInTheDocument();
  });

  test('should respect max retries', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    render(
      <MetricsErrorBoundary maxRetries={1}>
        <ThrowError />
      </MetricsErrorBoundary>
    );
    
    // First retry should be available
    expect(screen.getByText(/Try Again/)).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Try Again/));
    
    // After max retries, retry button should not be available
    expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
    expect(screen.getByText(/Maximum retry attempts reached/)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('should handle complete metrics workflow', async () => {
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/dashboard/overview')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { summary: { totalUsers: 100 } }
          })
        });
      }
      if (url.includes('/investors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { summary: { totalInvestors: 50 } }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} })
      });
    });
    
    // Set auth token
    tokenStorage.setToken('test-token');
    metricsClient.setAuthToken('test-token');
    
    // Render dashboard
    render(<MetricsOverview />);
    
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    
    // Navigate to investors (simulated)
    render(<InvestorMetrics />);
    
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  test('should handle authentication flow', async () => {
    // Mock expired token
    const expiredToken = 'expired.token';
    localStorageMock.getItem.mockReturnValue(expiredToken);
    
    // Mock 401 response
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Token expired' } })
    });
    
    // Mock window.location
    delete window.location;
    window.location = { href: '' };
    
    try {
      await metricsApi.getDashboardOverview();
    } catch (error) {
      // Expected to throw
    }
    
    // Should redirect to login
    expect(window.location.href).toBe('/login');
  });
});