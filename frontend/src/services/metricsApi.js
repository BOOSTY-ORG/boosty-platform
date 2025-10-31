/**
 * Metrics API Service
 * Centralized service for interacting with the Boosty Metrics API
 */

// API base URL - change based on environment
const API_BASE_URL = process.env.REACT_APP_METRICS_API_URL || 'http://localhost:3000/api/metrics';

// Token management utilities
const tokenStorage = {
  setToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metrics_token', token);
    }
  },
  
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('metrics_token');
    }
    return null;
  },
  
  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metrics_token');
    }
  },
  
  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (e) {
      return true;
    }
  }
};

// Token refresh manager
class TokenManager {
  constructor(refreshUrl) {
    this.refreshUrl = refreshUrl;
    this.refreshPromise = null;
  }
  
  async refreshToken() {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.performRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      tokenStorage.setToken(newToken);
      return newToken;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  async performRefresh() {
    const refreshToken = tokenStorage.getRefreshToken();
    
    const response = await fetch(this.refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    return data.token;
  }
}

// Main API client class
class MetricsApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.tokenManager = new TokenManager('/api/auth/refresh');
  }
  
  setAuthToken(token) {
    this.authToken = token;
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Ensure we have a valid token
    let token = this.authToken || tokenStorage.getToken();
    if (!token || tokenStorage.isTokenExpired(token)) {
      try {
        token = await this.tokenManager.refreshToken();
        this.authToken = token;
      } catch (error) {
        // Redirect to login if refresh fails
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication required');
      }
    }
    
    headers['Authorization'] = `Bearer ${token}`;
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
  
  // Dashboard endpoints
  async getDashboardOverview(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/dashboard/overview?${queryParams.toString()}`);
  }
  
  async getRealtimeMetrics() {
    return this.request('/dashboard/realtime');
  }
  
  // Investor endpoints
  async getInvestorMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.request(`/investors?${queryParams.toString()}`);
  }
  
  async getInvestorDetails(investorId, params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/investors/${investorId}?${queryParams.toString()}`);
  }
  
  async getInvestorPerformance(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/investors/performance?${queryParams.toString()}`);
  }
  
  // User endpoints
  async getUserMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.request(`/users?${queryParams.toString()}`);
  }
  
  async getUserDetails(userId, params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/users/${userId}?${queryParams.toString()}`);
  }
  
  async getUserJourneyMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/users/journey?${queryParams.toString()}`);
  }
  
  // Transaction endpoints
  async getTransactionMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    return this.request(`/transactions?${queryParams.toString()}`);
  }
  
  async getTransactionDetails(transactionId, params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/transactions/${transactionId}?${queryParams.toString()}`);
  }
  
  async getRepaymentMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/transactions/repayments?${queryParams.toString()}`);
  }
  
  // KYC endpoints
  async getKycMetrics(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/kyc?${queryParams.toString()}`);
  }
  
  async getKycPerformance(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/kyc/performance?${queryParams.toString()}`);
  }
  
  // Reporting endpoints
  async getFinancialReport(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/reports/financial?${queryParams.toString()}`);
  }
  
  async getOperationalReport(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/reports/operational?${queryParams.toString()}`);
  }
  
  async getComplianceReport(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/reports/compliance?${queryParams.toString()}`);
  }
  
  async getPerformanceReport(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return this.request(`/reports/performance?${queryParams.toString()}`);
  }
  
  async getReportList() {
    return this.request('/reports');
  }
}

// Error handling wrapper
class ApiWrapper {
  constructor(client) {
    this.client = client;
  }
  
  async withErrorHandling(apiCall, fallback = null) {
    try {
      return await apiCall();
    } catch (error) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.message.includes('401') || error.message.includes('403')) {
        // Authentication error
        tokenStorage.clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw error;
      }
      
      if (error.message.includes('429')) {
        // Rate limited - implement retry with exponential backoff
        return this.handleRateLimit(apiCall, fallback);
      }
      
      if (fallback !== null) {
        return fallback;
      }
      
      throw error;
    }
  }
  
  async handleRateLimit(apiCall, fallback = null, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        if (i === retries - 1) {
          // Last retry failed, return fallback or throw
          if (fallback !== null) {
            return fallback;
          }
          throw error;
        }
        
        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw new Error('Rate limit retry failed');
  }
}

// Create and export instances
const metricsClient = new MetricsApiClient();
const apiWrapper = new ApiWrapper(metricsClient);

// Initialize with stored token
const storedToken = tokenStorage.getToken();
if (storedToken) {
  metricsClient.setAuthToken(storedToken);
}

export {
  metricsClient,
  apiWrapper,
  tokenStorage,
  TokenManager,
  MetricsApiClient,
  ApiWrapper
};

// Export convenience methods
export const metricsApi = {
  // Dashboard
  getDashboardOverview: (params) => apiWrapper.withErrorHandling(() => metricsClient.getDashboardOverview(params)),
  getRealtimeMetrics: () => apiWrapper.withErrorHandling(() => metricsClient.getRealtimeMetrics()),
  
  // Investors
  getInvestorMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getInvestorMetrics(params)),
  getInvestorDetails: (id, params) => apiWrapper.withErrorHandling(() => metricsClient.getInvestorDetails(id, params)),
  getInvestorPerformance: (params) => apiWrapper.withErrorHandling(() => metricsClient.getInvestorPerformance(params)),
  
  // Users
  getUserMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getUserMetrics(params)),
  getUserDetails: (id, params) => apiWrapper.withErrorHandling(() => metricsClient.getUserDetails(id, params)),
  getUserJourneyMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getUserJourneyMetrics(params)),
  
  // Transactions
  getTransactionMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getTransactionMetrics(params)),
  getTransactionDetails: (id, params) => apiWrapper.withErrorHandling(() => metricsClient.getTransactionDetails(id, params)),
  getRepaymentMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getRepaymentMetrics(params)),
  
  // KYC
  getKycMetrics: (params) => apiWrapper.withErrorHandling(() => metricsClient.getKycMetrics(params)),
  getKycPerformance: (params) => apiWrapper.withErrorHandling(() => metricsClient.getKycPerformance(params)),
  
  // Reports
  getFinancialReport: (params) => apiWrapper.withErrorHandling(() => metricsClient.getFinancialReport(params)),
  getOperationalReport: (params) => apiWrapper.withErrorHandling(() => metricsClient.getOperationalReport(params)),
  getComplianceReport: (params) => apiWrapper.withErrorHandling(() => metricsClient.getComplianceReport(params)),
  getPerformanceReport: (params) => apiWrapper.withErrorHandling(() => metricsClient.getPerformanceReport(params)),
  getReportList: () => apiWrapper.withErrorHandling(() => metricsClient.getReportList()),
  
  // Auth utilities
  setToken: (token) => metricsClient.setAuthToken(token),
  clearToken: () => {
    tokenStorage.clearToken();
    metricsClient.setAuthToken(null);
  }
};

export default metricsApi;