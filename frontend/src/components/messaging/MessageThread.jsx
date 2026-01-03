import React, { useState, useEffect, useRef } from 'react';
import { crmAPI } from '../../api/crm.js';
import { Loading, Card, Button, Input, Modal } from '../common';
import { formatRelativeTime, formatDateTime } from '../../utils/formatters.js';

/**
 * MessageThread Component
 * 
 * Displays an individual message thread with messages in chronological order.
 * Shows participant avatars, timestamps, read/unread indicators, message reactions,
 * and delivery status. Supports real-time updates and message interactions.
 * 
 * @param {Object} props - Component props
 * @param {string} props.threadId - Thread ID to display
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onMessageSend - Callback for message sending
 * @param {Function} props.onThreadUpdate - Callback for thread updates
 * @param {boolean} props.showComposer - Show message composer
 * @param {boolean} props.autoRefresh - Auto-refresh messages
 * @param {number} props.refreshInterval - Refresh interval in seconds
 * @returns {JSX.Element} MessageThread component
 */
const MessageThread = ({
  threadId,
  className = '',
  onMessageSend,
  onThreadUpdate,
  showComposer = true,
  autoRefresh = true,
  refreshInterval = 30,
}) => {
  // State management
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageDetails, setShowMessageDetails] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  
  // Refs
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Fetch thread details
  const fetchThread = async () => {
    if (!threadId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const [threadData, messagesData] = await Promise.all([
        crmAPI.getMessageThread(threadId),
        crmAPI.getThreadMessages(threadId, { limit: 100 })
      ]);
      
      setThread(threadData);
      setMessages(messagesData.data || []);
      
      if (onThreadUpdate) {
        onThreadUpdate(threadData);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch thread');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (threadId) {
      fetchThread();
    }
  }, [threadId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !threadId) return;
    
    const interval = setInterval(() => {
      fetchThread();
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, threadId, refreshInterval]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!threadId) return;
    
    const subscription = crmAPI.subscribeToMessages(threadId, (message) => {
      setMessages(prev => [...prev, message]);
      
      // Update thread last message
      if (thread) {
        setThread(prev => ({
          ...prev,
          lastMessage: message,
          updatedAt: message.timestamp
        }));
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [threadId, thread]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const sendMessage = async (content, attachments = []) => {
    if (!content.trim() || !threadId) return;
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        threadId,
        content: content.trim(),
        messageType: 'text',
        attachments,
        replyTo: replyToMessage?._id,
      };
      
      const newMessage = await crmAPI.sendMessage(messageData);
      
      // Add message to local state immediately for better UX
      setMessages(prev => [...prev, newMessage]);
      
      // Clear reply state
      setReplyToMessage(null);
      
      // Scroll to bottom
      scrollToBottom();
      
      if (onMessageSend) {
        onMessageSend(newMessage);
      }
      
      return newMessage;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setSendingMessage(false);
    }
  };

  // Mark message as read
  const markAsRead = async (messageId) => {
    try {
      await crmAPI.markMessageAsRead(messageId);
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  // Add reaction to message
  const addReaction = async (messageId, reaction) => {
    try {
      const updatedMessage = await crmAPI.addMessageReaction(messageId, reaction);
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? updatedMessage : msg
      ));
    } catch (err) {
      setError(err.message || 'Failed to add reaction');
    }
  };

  // Remove reaction from message
  const removeReaction = async (messageId) => {
    try {
      const updatedMessage = await crmAPI.removeMessageReaction(messageId);
      
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? updatedMessage : msg
      ));
    } catch (err) {
      setError(err.message || 'Failed to remove reaction');
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      await crmAPI.deleteMessage(messageId);
      
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setShowMessageDetails(false);
      setSelectedMessage(null);
    } catch (err) {
      setError(err.message || 'Failed to delete message');
    }
  };

  // Handle typing indicator
  const handleTyping = (isTyping) => {
    if (!threadId) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    crmAPI.sendTypingIndicator(threadId, isTyping);
    
    // Set timeout to stop typing indicator
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        crmAPI.sendTypingIndicator(threadId, false);
      }, 3000);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (!user) return '??';
    const name = user.name || user.email || 'Unknown';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Get message status icon
  const getMessageStatusIcon = (message) => {
    if (message.deliveryStatus === 'failed') {
      return <span className="text-red-500">✗</span>;
    }
    
    if (message.deliveryStatus === 'delivered') {
      return <span className="text-green-500">✓✓</span>;
    }
    
    if (message.deliveryStatus === 'sent') {
      return <span className="text-gray-400">✓</span>;
    }
    
    return null;
  };

  // Render message
  const renderMessage = (message) => {
    const isOwn = message.sender?.isCurrentUser || false;
    const isRead = message.read || false;
    const hasReactions = message.reactions && message.reactions.length > 0;
    
    return (
      <div
        key={message._id}
        className={`
          flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}
          ${!isRead ? 'font-semibold' : ''}
        `}
        onDoubleClick={() => {
          setSelectedMessage(message);
          setShowMessageDetails(true);
          if (!isRead) {
            markAsRead(message._id);
          }
        }}
      >
        <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          {!isOwn && (
            <div className="flex-shrink-0 mr-3">
              <div
                className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600"
                title={message.sender?.name || message.sender?.email || 'Unknown'}
              >
                {getUserInitials(message.sender)}
              </div>
              {onlineUsers.has(message.sender?._id) && (
                <div className="w-2 h-2 bg-green-400 rounded-full -mt-1 -mr-1 ml-auto"></div>
              )}
            </div>
          )}
          
          {/* Message content */}
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {/* Message bubble */}
            <div
              className={`
                px-4 py-2 rounded-lg text-sm
                ${isOwn 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
                }
                ${!isRead ? 'ring-2 ring-blue-400' : ''}
              `}
            >
              {/* Reply indicator */}
              {message.replyTo && (
                <div className="text-xs opacity-75 mb-1 border-l-2 border-current pl-2">
                  Replying to {message.replyTo.sender?.name || message.replyTo.sender?.email}
                </div>
              )}
              
              {/* Message content */}
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
              
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 text-xs opacity-90"
                    >
                      <span>📎</span>
                      <span>{attachment.name || attachment.fileName}</span>
                      <span>({attachment.size || 'Unknown size'})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Message metadata */}
            <div className={`flex items-center mt-1 text-xs text-gray-500 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="mx-1">
                {formatRelativeTime(message.timestamp)}
              </span>
              
              {/* Status icon for own messages */}
              {isOwn && (
                <span className="ml-1">
                  {getMessageStatusIcon(message)}
                </span>
              )}
            </div>
            
            {/* Reactions */}
            {hasReactions && (
              <div className={`flex items-center mt-1 space-x-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {message.reactions.map((reaction, index) => (
                  <button
                    key={index}
                    className={`
                      px-2 py-1 rounded-full text-xs
                      ${isOwn 
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }
                    `}
                    onClick={() => removeReaction(message._id)}
                    title={`Remove ${reaction.emoji} reaction`}
                  >
                    {reaction.emoji} {reaction.count}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    return (
      <div className="flex justify-start mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>
            {typingUsers.length === 1 
              ? `${typingUsers[0].name} is typing...`
              : `${typingUsers.length} people are typing...`
            }
          </span>
        </div>
      </div>
    );
  };

  // Render message composer
  const renderComposer = () => {
    if (!showComposer) return null;
    
    return (
      <div className="border-t pt-4">
        {/* Reply indicator */}
        {replyToMessage && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Replying to:</span> {replyToMessage.sender?.name || replyToMessage.sender?.email}
              <div className="text-xs opacity-75 mt-1">{replyToMessage.content.substring(0, 100)}...</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyToMessage(null)}
            >
              ✕
            </Button>
          </div>
        )}
        
        <MessageComposer
          onSend={sendMessage}
          onTyping={handleTyping}
          sending={sendingMessage}
          placeholder="Type your message..."
          disabled={!thread || thread.status === 'closed'}
        />
      </div>
    );
  };

  // Render message details modal
  const renderMessageDetails = () => {
    if (!selectedMessage) return null;
    
    return (
      <Modal
        isOpen={showMessageDetails}
        onClose={() => {
          setShowMessageDetails(false);
          setSelectedMessage(null);
        }}
        title="Message Details"
      >
        <div className="space-y-4">
          {/* Message info */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">Message Information</h3>
            <div className="mt-2 space-y-2 text-sm">
              <div>
                <span className="font-medium">Sender:</span> {selectedMessage.sender?.name || selectedMessage.sender?.email}
              </div>
              <div>
                <span className="font-medium">Time:</span> {formatDateTime(selectedMessage.timestamp)}
              </div>
              <div>
                <span className="font-medium">Status:</span> {selectedMessage.deliveryStatus || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Read:</span> {selectedMessage.read ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
          
          {/* Message content */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">Content</h3>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
              <pre className="whitespace-pre-wrap">{selectedMessage.content}</pre>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setReplyToMessage(selectedMessage)}
            >
              Reply
            </Button>
            {selectedMessage.sender?.isCurrentUser && (
              <Button
                variant="danger"
                onClick={() => deleteMessage(selectedMessage._id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className={`message-thread ${className}`}>
      {/* Thread header */}
      {thread && (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {thread.subject || 'No Subject'}
              </h2>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <span>Thread ID: {thread.threadId}</span>
                <span className="mx-2">•</span>
                <span>Status: {thread.status}</span>
                {thread.assignedAgent && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Assigned to: {thread.assignedAgent.name || thread.assignedAgent.email}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Thread status indicator */}
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                thread.status === 'active' ? 'bg-green-100 text-green-800' :
                thread.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {thread.status}
              </span>
            </div>
          </div>
        </Card>
      )}
      
      {/* Loading state */}
      {loading && <Loading className="my-8" />}
      
      {/* Error state */}
      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <div className="text-red-800">
            <p className="font-medium">Error loading messages</p>
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchThread}
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}
      
      {/* Messages */}
      {!loading && !error && (
        <div className="bg-white rounded-lg border">
          <div className="h-96 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages in this thread yet</p>
                <p className="text-sm mt-1">Be the first to start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                {renderTypingIndicator()}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {/* Composer */}
          {renderComposer()}
        </div>
      )}
      
      {/* Message details modal */}
      {renderMessageDetails()}
    </div>
  );
};

// MessageComposer sub-component
const MessageComposer = ({ onSend, onTyping, sending, placeholder, disabled }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !sending && !disabled) {
      onSend(message, attachments);
      setMessage('');
      setAttachments([]);
    }
  };
  
  const handleTyping = (value) => {
    setMessage(value);
    if (onTyping) {
      onTyping(value.length > 0);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm resize-none"
            rows={3}
          />
        </div>
        <Button
          type="submit"
          disabled={!message.trim() || sending || disabled}
          loading={sending}
        >
          Send
        </Button>
      </div>
      
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-100 rounded px-2 py-1 text-sm">
              <span>📎</span>
              <span>{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
};

export default MessageThread;