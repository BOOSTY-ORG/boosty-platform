import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { crmAPI } from '../api/crm.js';
import { useAuth } from './AuthContext.js';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  // Thread state
  threads: [],
  currentThread: null,
  threadMessages: [],
  threadLoading: false,
  threadError: null,
  
  // Message state
  messages: [],
  messageLoading: false,
  messageError: null,
  sendingMessage: false,
  
  // Assignment state
  assignments: [],
  currentAssignment: null,
  assignmentMetrics: null,
  assignmentLoading: false,
  assignmentError: null,
  
  // Agent state
  agents: [],
  agentWorkloads: [],
  agentLoading: false,
  agentError: null,
  
  // Real-time state
  onlineUsers: new Set(),
  typingUsers: new Map(),
  subscriptions: new Map(),
  
  // UI state
  filters: {
    status: 'all',
    priority: 'all',
    assignedAgent: 'all',
    threadType: 'all',
    dateRange: 'last_30_days',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  searchQuery: '',
  selectedThreads: [],
  selectedAssignments: [],
  
  // Draft state
  drafts: new Map(),
  
  // General state
  loading: false,
  error: null,
};

// Action types
const MESSAGING_ACTIONS = {
  // Loading actions
  SET_LOADING: 'SET_LOADING',
  SET_THREAD_LOADING: 'SET_THREAD_LOADING',
  SET_MESSAGE_LOADING: 'SET_MESSAGE_LOADING',
  SET_ASSIGNMENT_LOADING: 'SET_ASSIGNMENT_LOADING',
  SET_AGENT_LOADING: 'SET_AGENT_LOADING',
  
  // Error actions
  SET_ERROR: 'SET_ERROR',
  SET_THREAD_ERROR: 'SET_THREAD_ERROR',
  SET_MESSAGE_ERROR: 'SET_MESSAGE_ERROR',
  SET_ASSIGNMENT_ERROR: 'SET_ASSIGNMENT_ERROR',
  SET_AGENT_ERROR: 'SET_AGENT_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  
  // Thread actions
  SET_THREADS: 'SET_THREADS',
  SET_CURRENT_THREAD: 'SET_CURRENT_THREAD',
  ADD_THREAD: 'ADD_THREAD',
  UPDATE_THREAD: 'UPDATE_THREAD',
  REMOVE_THREAD: 'REMOVE_THREAD',
  SET_THREAD_MESSAGES: 'SET_THREAD_MESSAGES',
  ADD_THREAD_MESSAGE: 'ADD_THREAD_MESSAGE',
  UPDATE_THREAD_MESSAGE: 'UPDATE_THREAD_MESSAGE',
  REMOVE_THREAD_MESSAGE: 'REMOVE_THREAD_MESSAGE',
  
  // Message actions
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  REMOVE_MESSAGE: 'REMOVE_MESSAGE',
  SET_SENDING_MESSAGE: 'SET_SENDING_MESSAGE',
  
  // Assignment actions
  SET_ASSIGNMENTS: 'SET_ASSIGNMENTS',
  SET_CURRENT_ASSIGNMENT: 'SET_CURRENT_ASSIGNMENT',
  ADD_ASSIGNMENT: 'ADD_ASSIGNMENT',
  UPDATE_ASSIGNMENT: 'UPDATE_ASSIGNMENT',
  REMOVE_ASSIGNMENT: 'REMOVE_ASSIGNMENT',
  SET_ASSIGNMENT_METRICS: 'SET_ASSIGNMENT_METRICS',
  
  // Agent actions
  SET_AGENTS: 'SET_AGENTS',
  SET_AGENT_WORKLOADS: 'SET_AGENT_WORKLOADS',
  UPDATE_AGENT_WORKLOAD: 'UPDATE_AGENT_WORKLOAD',
  
  // Real-time actions
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  ADD_ONLINE_USER: 'ADD_ONLINE_USER',
  REMOVE_ONLINE_USER: 'REMOVE_ONLINE_USER',
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  ADD_TYPING_USER: 'ADD_TYPING_USER',
  REMOVE_TYPING_USER: 'REMOVE_TYPING_USER',
  ADD_SUBSCRIPTION: 'ADD_SUBSCRIPTION',
  REMOVE_SUBSCRIPTION: 'REMOVE_SUBSCRIPTION',
  
  // UI actions
  SET_FILTERS: 'SET_FILTERS',
  SET_PAGINATION: 'SET_PAGINATION',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_SELECTED_THREADS: 'SET_SELECTED_THREADS',
  SET_SELECTED_ASSIGNMENTS: 'SET_SELECTED_ASSIGNMENTS',
  
  // Draft actions
  SET_DRAFT: 'SET_DRAFT',
  REMOVE_DRAFT: 'REMOVE_DRAFT',
  CLEAR_DRAFTS: 'CLEAR_DRAFTS',
  
  // General actions
  RESET_STATE: 'RESET_STATE',
};

// Reducer function
const messagingReducer = (state, action) => {
  switch (action.type) {
    // Loading actions
    case MESSAGING_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_THREAD_LOADING:
      return {
        ...state,
        threadLoading: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_MESSAGE_LOADING:
      return {
        ...state,
        messageLoading: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_ASSIGNMENT_LOADING:
      return {
        ...state,
        assignmentLoading: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_AGENT_LOADING:
      return {
        ...state,
        agentLoading: action.payload,
      };
      
    // Error actions
    case MESSAGING_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
      
    case MESSAGING_ACTIONS.SET_THREAD_ERROR:
      return {
        ...state,
        threadError: action.payload,
        threadLoading: false,
      };
      
    case MESSAGING_ACTIONS.SET_MESSAGE_ERROR:
      return {
        ...state,
        messageError: action.payload,
        messageLoading: false,
      };
      
    case MESSAGING_ACTIONS.SET_ASSIGNMENT_ERROR:
      return {
        ...state,
        assignmentError: action.payload,
        assignmentLoading: false,
      };
      
    case MESSAGING_ACTIONS.SET_AGENT_ERROR:
      return {
        ...state,
        agentError: action.payload,
        agentLoading: false,
      };
      
    case MESSAGING_ACTIONS.CLEAR_ERRORS:
      return {
        ...state,
        error: null,
        threadError: null,
        messageError: null,
        assignmentError: null,
        agentError: null,
      };
      
    // Thread actions
    case MESSAGING_ACTIONS.SET_THREADS:
      return {
        ...state,
        threads: action.payload,
        threadLoading: false,
        threadError: null,
      };
      
    case MESSAGING_ACTIONS.SET_CURRENT_THREAD:
      return {
        ...state,
        currentThread: action.payload,
        threadLoading: false,
        threadError: null,
      };
      
    case MESSAGING_ACTIONS.ADD_THREAD:
      return {
        ...state,
        threads: [action.payload, ...state.threads],
        threadLoading: false,
        threadError: null,
      };
      
    case MESSAGING_ACTIONS.UPDATE_THREAD:
      return {
        ...state,
        threads: state.threads.map((thread) =>
          thread._id === action.payload._id ? action.payload : thread
        ),
        currentThread:
          state.currentThread?._id === action.payload._id
            ? action.payload
            : state.currentThread,
        threadLoading: false,
        threadError: null,
      };
      
    case MESSAGING_ACTIONS.REMOVE_THREAD:
      return {
        ...state,
        threads: state.threads.filter((thread) => thread._id !== action.payload),
        currentThread:
          state.currentThread?._id === action.payload ? null : state.currentThread,
        threadLoading: false,
        threadError: null,
      };
      
    case MESSAGING_ACTIONS.SET_THREAD_MESSAGES:
      return {
        ...state,
        threadMessages: action.payload,
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.ADD_THREAD_MESSAGE:
      return {
        ...state,
        threadMessages: [...state.threadMessages, action.payload],
        messages: [...state.messages, action.payload],
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.UPDATE_THREAD_MESSAGE:
      return {
        ...state,
        threadMessages: state.threadMessages.map((message) =>
          message._id === action.payload._id ? action.payload : message
        ),
        messages: state.messages.map((message) =>
          message._id === action.payload._id ? action.payload : message
        ),
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.REMOVE_THREAD_MESSAGE:
      return {
        ...state,
        threadMessages: state.threadMessages.filter(
          (message) => message._id !== action.payload
        ),
        messages: state.messages.filter(
          (message) => message._id !== action.payload
        ),
        messageLoading: false,
        messageError: null,
      };
      
    // Message actions
    case MESSAGING_ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [action.payload, ...state.messages],
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map((message) =>
          message._id === action.payload._id ? action.payload : message
        ),
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.REMOVE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter((message) => message._id !== action.payload),
        messageLoading: false,
        messageError: null,
      };
      
    case MESSAGING_ACTIONS.SET_SENDING_MESSAGE:
      return {
        ...state,
        sendingMessage: action.payload,
      };
      
    // Assignment actions
    case MESSAGING_ACTIONS.SET_ASSIGNMENTS:
      return {
        ...state,
        assignments: action.payload,
        assignmentLoading: false,
        assignmentError: null,
      };
      
    case MESSAGING_ACTIONS.SET_CURRENT_ASSIGNMENT:
      return {
        ...state,
        currentAssignment: action.payload,
        assignmentLoading: false,
        assignmentError: null,
      };
      
    case MESSAGING_ACTIONS.ADD_ASSIGNMENT:
      return {
        ...state,
        assignments: [action.payload, ...state.assignments],
        assignmentLoading: false,
        assignmentError: null,
      };
      
    case MESSAGING_ACTIONS.UPDATE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.map((assignment) =>
          assignment._id === action.payload._id ? action.payload : assignment
        ),
        currentAssignment:
          state.currentAssignment?._id === action.payload._id
            ? action.payload
            : state.currentAssignment,
        assignmentLoading: false,
        assignmentError: null,
      };
      
    case MESSAGING_ACTIONS.REMOVE_ASSIGNMENT:
      return {
        ...state,
        assignments: state.assignments.filter(
          (assignment) => assignment._id !== action.payload
        ),
        currentAssignment:
          state.currentAssignment?._id === action.payload ? null : state.currentAssignment,
        assignmentLoading: false,
        assignmentError: null,
      };
      
    case MESSAGING_ACTIONS.SET_ASSIGNMENT_METRICS:
      return {
        ...state,
        assignmentMetrics: action.payload,
        assignmentLoading: false,
        assignmentError: null,
      };
      
    // Agent actions
    case MESSAGING_ACTIONS.SET_AGENTS:
      return {
        ...state,
        agents: action.payload,
        agentLoading: false,
        agentError: null,
      };
      
    case MESSAGING_ACTIONS.SET_AGENT_WORKLOADS:
      return {
        ...state,
        agentWorkloads: action.payload,
        agentLoading: false,
        agentError: null,
      };
      
    case MESSAGING_ACTIONS.UPDATE_AGENT_WORKLOAD:
      return {
        ...state,
        agentWorkloads: state.agentWorkloads.map((agent) =>
          agent._id === action.payload._id ? action.payload : agent
        ),
        agentLoading: false,
        agentError: null,
      };
      
    // Real-time actions
    case MESSAGING_ACTIONS.SET_ONLINE_USERS:
      return {
        ...state,
        onlineUsers: new Set(action.payload),
      };
      
    case MESSAGING_ACTIONS.ADD_ONLINE_USER:
      return {
        ...state,
        onlineUsers: new Set([...state.onlineUsers, action.payload]),
      };
      
    case MESSAGING_ACTIONS.REMOVE_ONLINE_USER:
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(action.payload);
      return {
        ...state,
        onlineUsers: newOnlineUsers,
      };
      
    case MESSAGING_ACTIONS.SET_TYPING_USERS:
      return {
        ...state,
        typingUsers: new Map(action.payload),
      };
      
    case MESSAGING_ACTIONS.ADD_TYPING_USER:
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.set(action.payload.threadId, action.payload.user);
      return {
        ...state,
        typingUsers: newTypingUsers,
      };
      
    case MESSAGING_ACTIONS.REMOVE_TYPING_USER:
      const updatedTypingUsers = new Map(state.typingUsers);
      updatedTypingUsers.delete(action.payload);
      return {
        ...state,
        typingUsers: updatedTypingUsers,
      };
      
    case MESSAGING_ACTIONS.ADD_SUBSCRIPTION:
      const newSubscriptions = new Map(state.subscriptions);
      newSubscriptions.set(action.payload.id, action.payload.subscription);
      return {
        ...state,
        subscriptions: newSubscriptions,
      };
      
    case MESSAGING_ACTIONS.REMOVE_SUBSCRIPTION:
      const updatedSubscriptions = new Map(state.subscriptions);
      updatedSubscriptions.delete(action.payload);
      return {
        ...state,
        subscriptions: updatedSubscriptions,
      };
      
    // UI actions
    case MESSAGING_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
      
    case MESSAGING_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };
      
    case MESSAGING_ACTIONS.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_SELECTED_THREADS:
      return {
        ...state,
        selectedThreads: action.payload,
      };
      
    case MESSAGING_ACTIONS.SET_SELECTED_ASSIGNMENTS:
      return {
        ...state,
        selectedAssignments: action.payload,
      };
      
    // Draft actions
    case MESSAGING_ACTIONS.SET_DRAFT:
      const newDrafts = new Map(state.drafts);
      newDrafts.set(action.payload.threadId, action.payload.draft);
      return {
        ...state,
        drafts: newDrafts,
      };
      
    case MESSAGING_ACTIONS.REMOVE_DRAFT:
      const updatedDrafts = new Map(state.drafts);
      updatedDrafts.delete(action.payload);
      return {
        ...state,
        drafts: updatedDrafts,
      };
      
    case MESSAGING_ACTIONS.CLEAR_DRAFTS:
      return {
        ...state,
        drafts: new Map(),
      };
      
    // General actions
    case MESSAGING_ACTIONS.RESET_STATE:
      return {
        ...initialState,
      };
      
    default:
      return state;
  }
};

// Create context
const MessagingContext = createContext();

// Messaging provider component
export const MessagingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const { user } = useAuth();

  // Thread actions
  const getThreads = async (params = {}) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_LOADING, payload: true });
      
      const response = await crmAPI.getMessageThreads({
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...state.filters,
        ...params,
      });
      
      dispatch({ type: MESSAGING_ACTIONS.SET_THREADS, payload: response.data || [] });
      dispatch({ 
        type: MESSAGING_ACTIONS.SET_PAGINATION, 
        payload: {
          page: response.pagination?.page || state.pagination.page,
          limit: response.pagination?.limit || state.pagination.limit,
          total: response.pagination?.total || 0,
          totalPages: response.pagination?.totalPages || 0,
        }
      });
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch threads';
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const getThread = async (threadId) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_LOADING, payload: true });
      
      const thread = await crmAPI.getMessageThread(threadId);
      dispatch({ type: MESSAGING_ACTIONS.SET_CURRENT_THREAD, payload: thread });
      
      return thread;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch thread';
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const createThread = async (threadData) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_LOADING, payload: true });
      
      const thread = await crmAPI.createMessageThread(threadData);
      dispatch({ type: MESSAGING_ACTIONS.ADD_THREAD, payload: thread });
      toast.success('Thread created successfully');
      
      return thread;
    } catch (error) {
      const errorMessage = error.message || 'Failed to create thread';
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const updateThread = async (threadId, updateData) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_LOADING, payload: true });
      
      const thread = await crmAPI.updateMessageThread(threadId, updateData);
      dispatch({ type: MESSAGING_ACTIONS.UPDATE_THREAD, payload: thread });
      toast.success('Thread updated successfully');
      
      return thread;
    } catch (error) {
      const errorMessage = error.message || 'Failed to update thread';
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Message actions
  const getThreadMessages = async (threadId, params = {}) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_MESSAGE_LOADING, payload: true });
      
      const response = await crmAPI.getThreadMessages(threadId, params);
      dispatch({ type: MESSAGING_ACTIONS.SET_THREAD_MESSAGES, payload: response.data || [] });
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch messages';
      dispatch({ type: MESSAGING_ACTIONS.SET_MESSAGE_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const sendMessage = async (messageData) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_SENDING_MESSAGE, payload: true });
      
      const message = await crmAPI.sendMessage(messageData);
      dispatch({ type: MESSAGING_ACTIONS.ADD_THREAD_MESSAGE, payload: message });
      
      // Update thread's last message
      if (state.currentThread) {
        dispatch({ 
          type: MESSAGING_ACTIONS.UPDATE_THREAD, 
          payload: {
            ...state.currentThread,
            lastMessage: message,
            updatedAt: message.timestamp,
          }
        });
      }
      
      toast.success('Message sent successfully');
      return message;
    } catch (error) {
      const errorMessage = error.message || 'Failed to send message';
      dispatch({ type: MESSAGING_ACTIONS.SET_MESSAGE_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: MESSAGING_ACTIONS.SET_SENDING_MESSAGE, payload: false });
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await crmAPI.markMessageAsRead(messageId);
      dispatch({ 
        type: MESSAGING_ACTIONS.UPDATE_THREAD_MESSAGE, 
        payload: { _id: messageId, read: true }
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Assignment actions
  const getAssignments = async (params = {}) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_LOADING, payload: true });
      
      const response = await crmAPI.getAssignments({
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...state.filters,
        ...params,
      });
      
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENTS, payload: response.data || [] });
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch assignments';
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const getAssignment = async (assignmentId) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_LOADING, payload: true });
      
      const assignment = await crmAPI.getAssignment(assignmentId);
      dispatch({ type: MESSAGING_ACTIONS.SET_CURRENT_ASSIGNMENT, payload: assignment });
      
      return assignment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch assignment';
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const transferAssignment = async (assignmentId, transferData) => {
    try {
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_LOADING, payload: true });
      
      const assignment = await crmAPI.transferAssignment(assignmentId, transferData);
      dispatch({ type: MESSAGING_ACTIONS.UPDATE_ASSIGNMENT, payload: assignment });
      toast.success('Assignment transferred successfully');
      
      return assignment;
    } catch (error) {
      const errorMessage = error.message || 'Failed to transfer assignment';
      dispatch({ type: MESSAGING_ACTIONS.SET_ASSIGNMENT_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Real-time actions
  const subscribeToMessages = (threadId, callback) => {
    const subscription = crmAPI.subscribeToMessages(threadId, (message) => {
      dispatch({ type: MESSAGING_ACTIONS.ADD_THREAD_MESSAGE, payload: message });
      if (callback) callback(message);
    });
    
    dispatch({ 
      type: MESSAGING_ACTIONS.ADD_SUBSCRIPTION, 
      payload: { id: `messages-${threadId}`, subscription }
    });
    
    return subscription;
  };

  const unsubscribeFromMessages = (threadId) => {
    const subscriptionId = `messages-${threadId}`;
    const subscription = state.subscriptions.get(subscriptionId);
    
    if (subscription) {
      subscription.unsubscribe();
      dispatch({ type: MESSAGING_ACTIONS.REMOVE_SUBSCRIPTION, payload: subscriptionId });
    }
  };

  const sendTypingIndicator = async (threadId, isTyping) => {
    try {
      await crmAPI.sendTypingIndicator(threadId, isTyping);
      
      if (isTyping) {
        dispatch({ 
          type: MESSAGING_ACTIONS.ADD_TYPING_USER, 
          payload: { threadId, user: { _id: user?.id, name: user?.name } }
        });
      } else {
        dispatch({ type: MESSAGING_ACTIONS.REMOVE_TYPING_USER, payload: threadId });
      }
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  };

  // UI actions
  const setFilters = (filters) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_FILTERS, payload: filters });
  };

  const setPagination = (pagination) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_PAGINATION, payload: pagination });
  };

  const setSearchQuery = (query) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_SEARCH_QUERY, payload: query });
  };

  const setSelectedThreads = (threadIds) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_SELECTED_THREADS, payload: threadIds });
  };

  const setSelectedAssignments = (assignmentIds) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_SELECTED_ASSIGNMENTS, payload: assignmentIds });
  };

  // Draft actions
  const saveDraft = (threadId, draft) => {
    dispatch({ type: MESSAGING_ACTIONS.SET_DRAFT, payload: { threadId, draft } });
  };

  const removeDraft = (threadId) => {
    dispatch({ type: MESSAGING_ACTIONS.REMOVE_DRAFT, payload: threadId });
  };

  const clearDrafts = () => {
    dispatch({ type: MESSAGING_ACTIONS.CLEAR_DRAFTS });
  };

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: MESSAGING_ACTIONS.CLEAR_ERRORS });
  };

  // Reset state
  const resetState = () => {
    dispatch({ type: MESSAGING_ACTIONS.RESET_STATE });
  };

  const value = {
    // State
    ...state,
    
    // Thread actions
    getThreads,
    getThread,
    createThread,
    updateThread,
    
    // Message actions
    getThreadMessages,
    sendMessage,
    markMessageAsRead,
    
    // Assignment actions
    getAssignments,
    getAssignment,
    transferAssignment,
    
    // Real-time actions
    subscribeToMessages,
    unsubscribeFromMessages,
    sendTypingIndicator,
    
    // UI actions
    setFilters,
    setPagination,
    setSearchQuery,
    setSelectedThreads,
    setSelectedAssignments,
    
    // Draft actions
    saveDraft,
    removeDraft,
    clearDrafts,
    
    // Utility actions
    clearErrors,
    resetState,
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};

// Custom hook to use messaging context
export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export default MessagingContext;