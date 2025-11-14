import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { crmAPI } from '../api/crm.js';
import { useApp } from './AppContext.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  tickets: [],
  currentTicket: null,
  communicationHistory: [],
  caseAssignments: [],
  crmMetrics: null,
  agentPerformance: [],
  customerSatisfaction: null,
  responseTimes: null,
  searchResults: [],
  ticketCategories: [],
  ticketPriorities: [],
  ticketStatuses: [],
  isLoading: false,
  error: null,
};

// Action types
const CRM_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_TICKETS: 'SET_TICKETS',
  SET_CURRENT_TICKET: 'SET_CURRENT_TICKET',
  SET_COMMUNICATION_HISTORY: 'SET_COMMUNICATION_HISTORY',
  SET_CASE_ASSIGNMENTS: 'SET_CASE_ASSIGNMENTS',
  SET_CRM_METRICS: 'SET_CRM_METRICS',
  SET_AGENT_PERFORMANCE: 'SET_AGENT_PERFORMANCE',
  SET_CUSTOMER_SATISFACTION: 'SET_CUSTOMER_SATISFACTION',
  SET_RESPONSE_TIMES: 'SET_RESPONSE_TIMES',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_TICKET_CATEGORIES: 'SET_TICKET_CATEGORIES',
  SET_TICKET_PRIORITIES: 'SET_TICKET_PRIORITIES',
  SET_TICKET_STATUSES: 'SET_TICKET_STATUSES',
  ADD_TICKET: 'ADD_TICKET',
  UPDATE_TICKET: 'UPDATE_TICKET',
  REMOVE_TICKET: 'REMOVE_TICKET',
  ADD_COMMUNICATION: 'ADD_COMMUNICATION',
  ASSIGN_CASE: 'ASSIGN_CASE',
  UPDATE_TICKET_STATUS: 'UPDATE_TICKET_STATUS',
  ESCALATE_TICKET: 'ESCALATE_TICKET',
  CLEAR_CRM_DATA: 'CLEAR_CRM_DATA',
};

// Reducer function
const crmReducer = (state, action) => {
  switch (action.type) {
    case CRM_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case CRM_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case CRM_ACTIONS.SET_TICKETS:
      return {
        ...state,
        tickets: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_CURRENT_TICKET:
      return {
        ...state,
        currentTicket: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_COMMUNICATION_HISTORY:
      return {
        ...state,
        communicationHistory: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_CASE_ASSIGNMENTS:
      return {
        ...state,
        caseAssignments: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_CRM_METRICS:
      return {
        ...state,
        crmMetrics: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_AGENT_PERFORMANCE:
      return {
        ...state,
        agentPerformance: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_CUSTOMER_SATISFACTION:
      return {
        ...state,
        customerSatisfaction: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_RESPONSE_TIMES:
      return {
        ...state,
        responseTimes: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_TICKET_CATEGORIES:
      return {
        ...state,
        ticketCategories: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_TICKET_PRIORITIES:
      return {
        ...state,
        ticketPriorities: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.SET_TICKET_STATUSES:
      return {
        ...state,
        ticketStatuses: action.payload,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.ADD_TICKET:
      return {
        ...state,
        tickets: [action.payload, ...state.tickets],
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.UPDATE_TICKET:
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket._id === action.payload._id ? action.payload : ticket
        ),
        currentTicket:
          state.currentTicket?._id === action.payload._id
            ? action.payload
            : state.currentTicket,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.REMOVE_TICKET:
      return {
        ...state,
        tickets: state.tickets.filter((ticket) => ticket._id !== action.payload),
        currentTicket:
          state.currentTicket?._id === action.payload ? null : state.currentTicket,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.ADD_COMMUNICATION:
      return {
        ...state,
        communicationHistory: [action.payload, ...state.communicationHistory],
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.ASSIGN_CASE:
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket._id === action.payload._id ? action.payload : ticket
        ),
        currentTicket:
          state.currentTicket?._id === action.payload._id
            ? action.payload
            : state.currentTicket,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.UPDATE_TICKET_STATUS:
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket._id === action.payload._id ? action.payload : ticket
        ),
        currentTicket:
          state.currentTicket?._id === action.payload._id
            ? action.payload
            : state.currentTicket,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.ESCALATE_TICKET:
      return {
        ...state,
        tickets: state.tickets.map((ticket) =>
          ticket._id === action.payload._id ? action.payload : ticket
        ),
        currentTicket:
          state.currentTicket?._id === action.payload._id
            ? action.payload
            : state.currentTicket,
        isLoading: false,
        error: null,
      };

    case CRM_ACTIONS.CLEAR_CRM_DATA:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

// Create context
const CRMContext = createContext();

// CRM provider component
export const CRMProvider = ({ children }) => {
  const [state, dispatch] = useReducer(crmReducer, initialState);
  const { dateRange, pagination, filters } = useApp();

  // Get all tickets
  const getTickets = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const tickets = await crmAPI.getTickets({
        page: pagination.page,
        limit: pagination.limit,
        dateRange,
        ...filters,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_TICKETS, payload: tickets });
      return tickets;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch tickets';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get ticket by ID
  const getTicketById = async (id) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.getTicketById(id);
      dispatch({ type: CRM_ACTIONS.SET_CURRENT_TICKET, payload: ticket });
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch ticket';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Create new ticket
  const createTicket = async (ticketData) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.createTicket(ticketData);
      dispatch({ type: CRM_ACTIONS.ADD_TICKET, payload: ticket });
      toast.success('Ticket created successfully');
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create ticket';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update ticket
  const updateTicket = async (id, ticketData) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.updateTicket(id, ticketData);
      dispatch({ type: CRM_ACTIONS.UPDATE_TICKET, payload: ticket });
      toast.success('Ticket updated successfully');
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update ticket';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Delete ticket
  const deleteTicket = async (id) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      await crmAPI.deleteTicket(id);
      dispatch({ type: CRM_ACTIONS.REMOVE_TICKET, payload: id });
      toast.success('Ticket deleted successfully');
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete ticket';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get communication history
  const getCommunicationHistory = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const history = await crmAPI.getCommunicationHistory({
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_COMMUNICATION_HISTORY, payload: history });
      return history;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch communication history';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Add communication log
  const addCommunicationLog = async (communicationData) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const communication = await crmAPI.addCommunicationLog(communicationData);
      dispatch({ type: CRM_ACTIONS.ADD_COMMUNICATION, payload: communication });
      toast.success('Communication log added successfully');
      return communication;
    } catch (error) {
      const errorMessage = error.message || 'Failed to add communication log';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get case assignments
  const getCaseAssignments = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const assignments = await crmAPI.getCaseAssignments({
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_CASE_ASSIGNMENTS, payload: assignments });
      return assignments;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch case assignments';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Assign case to agent
  const assignCase = async (ticketId, agentId) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.assignCase(ticketId, agentId);
      dispatch({ type: CRM_ACTIONS.ASSIGN_CASE, payload: ticket });
      toast.success('Case assigned successfully');
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to assign case';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get CRM metrics
  const getCRMMetrics = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const metrics = await crmAPI.getCRMMetrics({
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_CRM_METRICS, payload: metrics });
      return metrics;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch CRM metrics';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get agent performance
  const getAgentPerformance = async (agentId, params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const performance = await crmAPI.getAgentPerformance(agentId, {
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_AGENT_PERFORMANCE, payload: performance });
      return performance;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch agent performance';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get customer satisfaction
  const getCustomerSatisfaction = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const satisfaction = await crmAPI.getCustomerSatisfaction({
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_CUSTOMER_SATISFACTION, payload: satisfaction });
      return satisfaction;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch customer satisfaction';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get response times
  const getResponseTimes = async (params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const responseTimes = await crmAPI.getResponseTimes({
        dateRange,
        ...params,
      });
      dispatch({ type: CRM_ACTIONS.SET_RESPONSE_TIMES, payload: responseTimes });
      return responseTimes;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch response times';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Search tickets
  const searchTickets = async (query, params = {}) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const searchResults = await crmAPI.searchTickets(query, params);
      dispatch({ type: CRM_ACTIONS.SET_SEARCH_RESULTS, payload: searchResults });
      return searchResults;
    } catch (error) {
      const errorMessage = error.message || 'Failed to search tickets';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get ticket categories
  const getTicketCategories = async () => {
    try {
      const categories = await crmAPI.getTicketCategories();
      dispatch({ type: CRM_ACTIONS.SET_TICKET_CATEGORIES, payload: categories });
      return categories;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch ticket categories';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get ticket priorities
  const getTicketPriorities = async () => {
    try {
      const priorities = await crmAPI.getTicketPriorities();
      dispatch({ type: CRM_ACTIONS.SET_TICKET_PRIORITIES, payload: priorities });
      return priorities;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch ticket priorities';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Get ticket statuses
  const getTicketStatuses = async () => {
    try {
      const statuses = await crmAPI.getTicketStatuses();
      dispatch({ type: CRM_ACTIONS.SET_TICKET_STATUSES, payload: statuses });
      return statuses;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch ticket statuses';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Update ticket status
  const updateTicketStatus = async (id, status) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.updateTicketStatus(id, status);
      dispatch({ type: CRM_ACTIONS.UPDATE_TICKET_STATUS, payload: ticket });
      toast.success('Ticket status updated successfully');
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update ticket status';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Escalate ticket
  const escalateTicket = async (id, escalationData) => {
    try {
      dispatch({ type: CRM_ACTIONS.SET_LOADING, payload: true });
      const ticket = await crmAPI.escalateTicket(id, escalationData);
      dispatch({ type: CRM_ACTIONS.ESCALATE_TICKET, payload: ticket });
      toast.success('Ticket escalated successfully');
      return ticket;
    } catch (error) {
      const errorMessage = error.message || 'Failed to escalate ticket';
      dispatch({ type: CRM_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Clear CRM data
  const clearCRMData = () => {
    dispatch({ type: CRM_ACTIONS.CLEAR_CRM_DATA });
  };

  const value = {
    ...state,
    getTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    getCommunicationHistory,
    addCommunicationLog,
    getCaseAssignments,
    assignCase,
    getCRMMetrics,
    getAgentPerformance,
    getCustomerSatisfaction,
    getResponseTimes,
    searchTickets,
    getTicketCategories,
    getTicketPriorities,
    getTicketStatuses,
    updateTicketStatus,
    escalateTicket,
    clearCRMData,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

// Custom hook to use CRM context
export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};

export default CRMContext;