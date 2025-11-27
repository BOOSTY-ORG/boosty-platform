import axios from 'axios';
import { getAuthToken } from '../utils/auth.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle network errors for development
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.log('Backend not available, using mock response for development');
      
      // Return mock response for login endpoint
      if (error.config?.url?.includes('/auth/signin')) {
        const mockResponse = {
          token: 'mock-jwt-token-for-development',
          user: {
            id: 1,
            email: 'admin@example.com',
            role: error.config.data?.includes('admin') ? 'admin' : 'user',
            name: error.config.data?.includes('admin') ? 'Admin User' : 'Regular User'
          }
        };
        return mockResponse;
      }
      
      // Return mock response for current user endpoint
      if (error.config?.url?.includes('/auth/me')) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          return JSON.parse(storedUser);
        }
      }
      
      // Return mock response for CRM endpoints
      if (error.config?.url?.includes('/metrics/crm')) {
        return getMockCRMResponse(error.config.url);
      }
    }
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error.response?.data || error.message);
  },
);

/**
 * Generate mock CRM responses for development
 * @param {string} url - Request URL
 * @returns {Object} Mock response
 */
const getMockCRMResponse = (url) => {
  // Mock CRM overview
  if (url.endsWith('/metrics/crm')) {
    return {
      success: true,
      data: {
        summary: {
          totalContacts: 1250,
          totalCommunications: 5420,
          activeAutomations: 15,
          approvedTemplates: 28
        },
        modules: {
          communications: {
            endpoint: '/metrics/crm/communications',
            description: 'CRM communications management and analytics'
          },
          contacts: {
            endpoint: '/metrics/crm/contacts',
            description: 'CRM contacts management and segmentation'
          },
          templates: {
            endpoint: '/metrics/crm/templates',
            description: 'CRM templates management and A/B testing'
          },
          automations: {
            endpoint: '/metrics/crm/automations',
            description: 'CRM automation rules and workflows'
          }
        }
      }
    };
  }
  
  // Mock communications list
  if (url.includes('/metrics/crm/communications/list')) {
    return {
      success: true,
      data: {
        data: [
          {
            _id: 'comm_001',
            communicationId: 'COMM-001',
            entityType: 'contact',
            entityId: 'contact_001',
            interactionType: 'email',
            channel: 'email',
            direction: 'outbound',
            status: 'sent',
            subject: 'Welcome to Boosty Solar',
            content: 'Thank you for your interest in our solar solutions...',
            agentId: 'agent_001',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      }
    };
  }
  
  // Mock contacts list
  if (url.includes('/metrics/crm/contacts/list')) {
    return {
      success: true,
      data: {
        data: [
          {
            _id: 'contact_001',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1-555-0123',
            contactType: 'lead',
            contactSource: 'website',
            status: 'active',
            tags: ['solar-interested', 'follow-up'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      }
    };
  }
  
  // Mock templates list
  if (url.includes('/metrics/crm/templates/list')) {
    return {
      success: true,
      data: {
        data: [
          {
            _id: 'template_001',
            name: 'Welcome Email',
            description: 'Welcome email for new contacts',
            category: 'onboarding',
            channel: 'email',
            type: 'marketing',
            subject: 'Welcome to Boosty Solar',
            body: 'Hello {{firstName}}, welcome to Boosty Solar...',
            status: 'approved',
            version: '1.0.0',
            tags: ['welcome', 'onboarding'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      }
    };
  }
  
  // Mock automations list
  if (url.includes('/metrics/crm/automations/list')) {
    return {
      success: true,
      data: {
        data: [
          {
            _id: 'automation_001',
            name: 'New Contact Welcome',
            description: 'Send welcome email to new contacts',
            category: 'onboarding',
            enabled: true,
            status: 'active',
            trigger: {
              type: 'contact_created',
              conditions: {}
            },
            actions: [
              {
                type: 'send_email',
                templateId: 'template_001',
                delay: 0
              }
            ],
            tags: ['welcome', 'automation'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      }
    };
  }
  
  // Default mock response
  return {
    success: true,
    data: {},
    message: 'Mock response for development'
  };
};

export default api;