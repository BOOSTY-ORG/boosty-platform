import api from './index.js';

export const crmAPI = {
  // Get all tickets
  getTickets: async (params = {}) => {
    return api.get('/metrics/crm/tickets', { params });
  },

  // Get ticket by ID
  getTicketById: async (id) => {
    return api.get(`/metrics/crm/tickets/${id}`);
  },

  // Create new ticket
  createTicket: async (ticketData) => {
    return api.post('/metrics/crm/tickets', ticketData);
  },

  // Update ticket
  updateTicket: async (id, ticketData) => {
    return api.put(`/metrics/crm/tickets/${id}`, ticketData);
  },

  // Delete ticket
  deleteTicket: async (id) => {
    return api.delete(`/metrics/crm/tickets/${id}`);
  },

  // Get communication history
  getCommunicationHistory: async (params = {}) => {
    return api.get('/metrics/crm/communications', { params });
  },

  // Add communication log
  addCommunicationLog: async (communicationData) => {
    return api.post('/metrics/crm/communications', communicationData);
  },

  // Get case assignments
  getCaseAssignments: async (params = {}) => {
    return api.get('/metrics/crm/assignments', { params });
  },

  // Assign case to agent
  assignCase: async (ticketId, agentId) => {
    return api.put(`/metrics/crm/tickets/${ticketId}/assign`, { agentId });
  },

  // Get CRM metrics
  getCRMMetrics: async (params = {}) => {
    return api.get('/metrics/crm/metrics', { params });
  },

  // Get agent performance
  getAgentPerformance: async (agentId, params = {}) => {
    return api.get(`/metrics/crm/agents/${agentId}/performance`, { params });
  },

  // Get customer satisfaction
  getCustomerSatisfaction: async (params = {}) => {
    return api.get('/metrics/crm/satisfaction', { params });
  },

  // Get response times
  getResponseTimes: async (params = {}) => {
    return api.get('/metrics/crm/response-times', { params });
  },

  // Search tickets
  searchTickets: async (query, params = {}) => {
    return api.get('/metrics/crm/tickets/search', {
      params: { q: query, ...params },
    });
  },

  // Get ticket categories
  getTicketCategories: async () => {
    return api.get('/metrics/crm/tickets/categories');
  },

  // Get ticket priorities
  getTicketPriorities: async () => {
    return api.get('/metrics/crm/tickets/priorities');
  },

  // Get ticket statuses
  getTicketStatuses: async () => {
    return api.get('/metrics/crm/tickets/statuses');
  },

  // Update ticket status
  updateTicketStatus: async (id, status) => {
    return api.put(`/metrics/crm/tickets/${id}/status`, { status });
  },

  // Escalate ticket
  escalateTicket: async (id, escalationData) => {
    return api.post(`/metrics/crm/tickets/${id}/escalate`, escalationData);
  },
};