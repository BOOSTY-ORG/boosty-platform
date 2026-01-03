import React, { useState, useEffect } from 'react';
import { 
  MessageThreadList, 
  MessageThread, 
  MessageComposer, 
  AssignmentDashboard, 
  AssignmentDetails 
} from '../components/messaging';
import { Card, Button, Loading, Modal } from '../components/common';
import { useMessaging } from '../context/MessagingContext';
import { useAuth } from '../context/AuthContext';

/**
 * MessagingPage Component
 * 
 * Comprehensive messaging page that demonstrates integration of all messaging components.
 * Shows how to use the messaging system with state management, real-time updates,
 * and navigation between different views. Includes thread management, assignment
 * handling, and message composition.
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.initialView - Initial view to display
 * @param {string} props.initialThreadId - Initial thread ID to load
 * @returns {JSX.Element} MessagingPage component
 */
const MessagingPage = ({
  className = '',
  initialView = 'threads',
  initialThreadId = null,
}) => {
  // State management
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreadId);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [showNewAssignmentModal, setShowNewAssignmentModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newThreadData, setNewThreadData] = useState({
    threadType: 'direct',
    participants: [],
    subject: '',
    assignedAgent: '',
    priority: 'medium',
    primaryChannel: 'email',
    relatedEntityType: '',
    relatedEntityId: '',
    tags: [],
    autoAssignmentEnabled: true,
    responseDeadline: '',
  });
  const [newAssignmentData, setNewAssignmentData] = useState({
    agentId: '',
    entityType: 'message_thread',
    entityId: '',
    assignmentType: 'manual',
    assignmentReason: '',
    priority: 'medium',
    requiredSkills: [],
    tags: [],
    customFields: {},
  });

  // Context hooks
  const {
    // Thread state
    threads,
    currentThread,
    threadMessages,
    threadLoading,
    threadError,
    
    // Message state
    sendingMessage,
    
    // Assignment state
    assignments,
    currentAssignment,
    assignmentLoading,
    assignmentError,
    
    // Real-time state
    onlineUsers,
    typingUsers,
    
    // UI state
    filters,
    pagination,
    searchQuery,
    selectedThreads,
    selectedAssignments,
    
    // Actions
    getThreads,
    getThread,
    createThread,
    getThreadMessages,
    sendMessage,
    getAssignments,
    getAssignment,
    transferAssignment,
    subscribeToMessages,
    unsubscribeFromMessages,
    sendTypingIndicator,
    setFilters,
    setPagination,
    setSearchQuery,
    setSelectedThreads,
    setSelectedAssignments,
    saveDraft,
    removeDraft,
    clearErrors,
  } = useMessaging();

  const { user } = useAuth();

  // Initialize page
  useEffect(() => {
    // Load initial data based on view
    if (currentView === 'threads') {
      getThreads();
    } else if (currentView === 'assignments') {
      getAssignments();
    }
    
    // Load specific thread if provided
    if (selectedThreadId) {
      handleThreadSelect({ _id: selectedThreadId });
    }
  }, [currentView]);

  // Handle thread selection
  const handleThreadSelect = async (thread) => {
    setSelectedThreadId(thread._id);
    setSelectedAssignmentId(null);
    
    try {
      await getThread(thread._id);
      await getThreadMessages(thread._id);
      setCurrentView('thread');
      
      // Subscribe to real-time updates
      subscribeToMessages(thread._id);
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  };

  // Handle assignment selection
  const handleAssignmentSelect = async (assignment) => {
    setSelectedAssignmentId(assignment._id);
    setSelectedThreadId(null);
    
    try {
      await getAssignment(assignment._id);
      setCurrentView('assignment');
    } catch (error) {
      console.error('Failed to load assignment:', error);
    }
  };

  // Handle message send
  const handleMessageSend = async (messageData) => {
    try {
      await sendMessage(messageData);
      
      // Clear draft for this thread
      removeDraft(messageData.threadId);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle thread creation
  const handleCreateThread = async () => {
    try {
      const thread = await createThread(newThreadData);
      setShowNewThreadModal(false);
      setNewThreadData({
        threadType: 'direct',
        participants: [],
        subject: '',
        assignedAgent: '',
        priority: 'medium',
        primaryChannel: 'email',
        relatedEntityType: '',
        relatedEntityId: '',
        tags: [],
        autoAssignmentEnabled: true,
        responseDeadline: '',
      });
      
      // Navigate to new thread
      handleThreadSelect(thread);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  // Handle assignment creation
  const handleCreateAssignment = async () => {
    try {
      const assignment = await crmAPI.createAssignment(newAssignmentData);
      setShowNewAssignmentModal(false);
      setNewAssignmentData({
        agentId: '',
        entityType: 'message_thread',
        entityId: '',
        assignmentType: 'manual',
        assignmentReason: '',
        priority: 'medium',
        requiredSkills: [],
        tags: [],
        customFields: {},
      });
      
      // Navigate to new assignment
      handleAssignmentSelect(assignment);
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    
    // Reload data with new filters
    if (currentView === 'threads') {
      getThreads();
    } else if (currentView === 'assignments') {
      getAssignments();
    }
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    // Reload data with search query
    if (currentView === 'threads') {
      getThreads({ search: query });
    } else if (currentView === 'assignments') {
      getAssignments({ search: query });
    }
  };

  // Handle pagination
  const handlePagination = (page) => {
    setPagination({ page });
    
    // Reload data for new page
    if (currentView === 'threads') {
      getThreads();
    } else if (currentView === 'assignments') {
      getAssignments();
    }
  };

  // Handle navigation
  const handleNavigation = (view) => {
    setCurrentView(view);
    
    // Cleanup subscriptions when switching views
    if (selectedThreadId) {
      unsubscribeFromMessages(selectedThreadId);
    }
    
    // Clear selections
    setSelectedThreadId(null);
    setSelectedAssignmentId(null);
  };

  // Render sidebar
  const renderSidebar = () => {
    return (
      <div className={`bg-white border-r transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`font-bold text-xl text-gray-900 ${
              sidebarCollapsed ? 'hidden' : 'block'
            }`}>
              Messaging
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? '→' : '←'}
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="space-y-2">
            <Button
              variant={currentView === 'threads' ? 'primary' : 'ghost'}
              className={`w-full justify-start ${
                sidebarCollapsed ? 'px-2' : 'px-4'
              }`}
              onClick={() => handleNavigation('threads')}
            >
              <span className="mr-3">💬</span>
              {!sidebarCollapsed && 'Threads'}
            </Button>
            
            <Button
              variant={currentView === 'assignments' ? 'primary' : 'ghost'}
              className={`w-full justify-start ${
                sidebarCollapsed ? 'px-2' : 'px-4'
              }`}
              onClick={() => handleNavigation('assignments')}
            >
              <span className="mr-3">📋</span>
              {!sidebarCollapsed && 'Assignments'}
            </Button>
            
            <Button
              variant={currentView === 'dashboard' ? 'primary' : 'ghost'}
              className={`w-full justify-start ${
                sidebarCollapsed ? 'px-2' : 'px-4'
              }`}
              onClick={() => handleNavigation('dashboard')}
            >
              <span className="mr-3">📊</span>
              {!sidebarCollapsed && 'Dashboard'}
            </Button>
          </nav>
          
          {/* Actions */}
          {!sidebarCollapsed && (
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowNewThreadModal(true)}
              >
                <span className="mr-2">➕</span>
                New Thread
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowNewAssignmentModal(true)}
              >
                <span className="mr-2">➕</span>
                New Assignment
              </Button>
            </div>
          )}
          
          {/* Online users */}
          {!sidebarCollapsed && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Online Users</h3>
              <div className="space-y-1">
                {Array.from(onlineUsers).slice(0, 5).map((userId) => (
                  <div key={userId} className="flex items-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-600">User {userId}</span>
                  </div>
                ))}
                {onlineUsers.size > 5 && (
                  <div className="text-xs text-gray-500">
                    +{onlineUsers.size - 5} more online
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render main content
  const renderMainContent = () => {
    switch (currentView) {
      case 'threads':
        return (
          <div className="flex-1">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Message Threads</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search threads..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button onClick={() => setShowNewThreadModal(true)}>
                    New Thread
                  </Button>
                </div>
              </div>
              
              {threadLoading ? (
                <Loading className="my-8" />
              ) : threadError ? (
                <Card className="border-red-200 bg-red-50">
                  <div className="text-red-800">
                    <p className="font-medium">Error loading threads</p>
                    <p className="text-sm">{threadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => getThreads()}
                    >
                      Try Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <MessageThreadList
                  threads={threads}
                  onThreadSelect={handleThreadSelect}
                  selectedThreads={selectedThreads}
                  onThreadSelectionChange={setSelectedThreads}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  pagination={pagination}
                  onPaginationChange={handlePagination}
                />
              )}
            </div>
          </div>
        );
        
      case 'thread':
        return (
          <div className="flex-1">
            <div className="p-6">
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => handleNavigation('threads')}
                >
                  ← Back to Threads
                </Button>
              </div>
              
              {threadLoading ? (
                <Loading className="my-8" />
              ) : threadError ? (
                <Card className="border-red-200 bg-red-50">
                  <div className="text-red-800">
                    <p className="font-medium">Error loading thread</p>
                    <p className="text-sm">{threadError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => getThread(selectedThreadId)}
                    >
                      Try Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MessageThread
                      threadId={selectedThreadId}
                      thread={currentThread}
                      messages={threadMessages}
                      onMessageSend={handleMessageSend}
                      onTyping={sendTypingIndicator}
                      sendingMessage={sendingMessage}
                      typingUsers={typingUsers}
                      onlineUsers={onlineUsers}
                    />
                  </div>
                  
                  <div>
                    <Card className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Thread Details</h3>
                      
                      {currentThread && (
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <span className="ml-2 text-sm text-gray-900">{currentThread.status}</span>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-700">Priority:</span>
                            <span className="ml-2 text-sm text-gray-900">{currentThread.priority}</span>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-700">Participants:</span>
                            <div className="mt-1">
                              {currentThread.participants?.map((participant) => (
                                <div key={participant._id} className="text-sm text-gray-600">
                                  {participant.name || participant.email}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-gray-700">Assigned Agent:</span>
                            <span className="ml-2 text-sm text-gray-900">
                              {currentThread.assignedAgent?.name || currentThread.assignedAgent?.email || 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'assignments':
        return (
          <div className="flex-1">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Assignments</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search assignments..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button onClick={() => setShowNewAssignmentModal(true)}>
                    New Assignment
                  </Button>
                </div>
              </div>
              
              {assignmentLoading ? (
                <Loading className="my-8" />
              ) : assignmentError ? (
                <Card className="border-red-200 bg-red-50">
                  <div className="text-red-800">
                    <p className="font-medium">Error loading assignments</p>
                    <p className="text-sm">{assignmentError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => getAssignments()}
                    >
                      Try Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <AssignmentDashboard
                  assignments={assignments}
                  onAssignmentSelect={handleAssignmentSelect}
                  selectedAssignments={selectedAssignments}
                  onAssignmentSelectionChange={setSelectedAssignments}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  pagination={pagination}
                  onPaginationChange={handlePagination}
                />
              )}
            </div>
          </div>
        );
        
      case 'assignment':
        return (
          <div className="flex-1">
            <div className="p-6">
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={() => handleNavigation('assignments')}
                >
                  ← Back to Assignments
                </Button>
              </div>
              
              {assignmentLoading ? (
                <Loading className="my-8" />
              ) : assignmentError ? (
                <Card className="border-red-200 bg-red-50">
                  <div className="text-red-800">
                    <p className="font-medium">Error loading assignment</p>
                    <p className="text-sm">{assignmentError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => getAssignment(selectedAssignmentId)}
                    >
                      Try Again
                    </Button>
                  </div>
                </Card>
              ) : (
                <AssignmentDetails
                  assignmentId={selectedAssignmentId}
                  assignment={currentAssignment}
                  onUpdate={(assignment) => {
                    // Handle assignment update
                    console.log('Assignment updated:', assignment);
                  }}
                  onTransfer={transferAssignment}
                />
              )}
            </div>
          </div>
        );
        
      case 'dashboard':
        return (
          <div className="flex-1">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Messaging Dashboard</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{threads.length}</div>
                      <div className="text-sm text-gray-600">Total Threads</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{assignments.length}</div>
                      <div className="text-sm text-gray-600">Total Assignments</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{onlineUsers.size}</div>
                      <div className="text-sm text-gray-600">Online Users</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">{typingUsers.size}</div>
                      <div className="text-sm text-gray-600">Typing Users</div>
                    </Card>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        Recent messages and assignments would appear here
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">View Not Found</h2>
              <p className="text-gray-600 mb-4">The requested view is not available.</p>
              <Button onClick={() => handleNavigation('threads')}>
                Go to Threads
              </Button>
            </div>
          </div>
        );
    }
  };

  // Render new thread modal
  const renderNewThreadModal = () => {
    return (
      <Modal
        isOpen={showNewThreadModal}
        onClose={() => setShowNewThreadModal(false)}
        title="Create New Thread"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thread Type
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newThreadData.threadType}
              onChange={(e) => setNewThreadData(prev => ({ ...prev, threadType: e.target.value }))}
            >
              <option value="direct">Direct</option>
              <option value="group">Group</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newThreadData.subject}
              onChange={(e) => setNewThreadData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Thread subject..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newThreadData.priority}
              onChange={(e) => setNewThreadData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowNewThreadModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={!newThreadData.subject}
            >
              Create Thread
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // Render new assignment modal
  const renderNewAssignmentModal = () => {
    return (
      <Modal
        isOpen={showNewAssignmentModal}
        onClose={() => setShowNewAssignmentModal(false)}
        title="Create New Assignment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newAssignmentData.entityType}
              onChange={(e) => setNewAssignmentData(prev => ({ ...prev, entityType: e.target.value }))}
            >
              <option value="message_thread">Message Thread</option>
              <option value="contact">Contact</option>
              <option value="ticket">Ticket</option>
              <option value="investor">Investor</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID
            </label>
            <input
              type="text"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newAssignmentData.entityId}
              onChange={(e) => setNewAssignmentData(prev => ({ ...prev, entityId: e.target.value }))}
              placeholder="Entity ID..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignment Reason
            </label>
            <textarea
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              rows={3}
              value={newAssignmentData.assignmentReason}
              onChange={(e) => setNewAssignmentData(prev => ({ ...prev, assignmentReason: e.target.value }))}
              placeholder="Reason for assignment..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={newAssignmentData.priority}
              onChange={(e) => setNewAssignmentData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowNewAssignmentModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={!newAssignmentData.entityId || !newAssignmentData.assignmentReason}
            >
              Create Assignment
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className={`messaging-page ${className}`}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        {renderSidebar()}
        
        {/* Main content */}
        {renderMainContent()}
      </div>
      
      {/* Modals */}
      {renderNewThreadModal()}
      {renderNewAssignmentModal()}
    </div>
  );
};

export default MessagingPage;