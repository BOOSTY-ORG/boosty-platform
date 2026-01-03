import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { NOTIFICATION_TYPES, NOTIFICATION_STATUS } from '../../api/notificationConstants.js';
import './MessageNotification.css';

/**
 * Message types for different communication channels
 */
export const MESSAGE_TYPES = {
  CHAT: 'chat',
  EMAIL: 'email',
  SMS: 'sms',
  SYSTEM: 'system',
};

/**
 * Message status indicators
 */
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
};

/**
 * Specialized MessageNotification component for handling message notifications
 * with rich features like threading, quick reply, and status indicators
 */
const MessageNotification = ({
  id,
  type = MESSAGE_TYPES.CHAT,
  sender,
  message,
  subject,
  timestamp,
  read = false,
  status = MESSAGE_STATUS.DELIVERED,
  threadInfo = null,
  attachments = [],
  priority = 'normal',
  autoClose = false,
  duration = 6000,
  onClose,
  onReply,
  onMarkAsRead,
  onDelete,
  onArchive,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [progress, setProgress] = useState(100);
  const intervalRef = useRef(null);
  const replyInputRef = useRef(null);

  // Auto-dismiss functionality
  useEffect(() => {
    if (visible && autoClose && duration > 0) {
      const startTime = Date.now();
      
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const progressPercent = (remaining / duration) * 100;
        
        setProgress(progressPercent);
        
        if (remaining <= 0) {
          handleClose();
        }
      }, 50);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setProgress(100);
    }
  }, [visible, autoClose, duration]);

  // Focus on reply input when replying
  useEffect(() => {
    if (isReplying && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [isReplying]);

  // Handle notification close
  const handleClose = useCallback(() => {
    setVisible(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (onClose) {
      onClose(id);
    }
  }, [id, onClose]);

  // Handle mark as read
  const handleMarkAsRead = useCallback((e) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(id);
    }
  }, [id, onMarkAsRead]);

  // Handle reply
  const handleReply = useCallback((e) => {
    e.stopPropagation();
    setIsReplying(true);
  }, []);

  // Send reply
  const sendReply = useCallback(() => {
    if (replyText.trim() && onReply) {
      onReply(id, replyText);
      setReplyText('');
      setIsReplying(false);
    }
  }, [id, replyText, onReply]);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyText('');
    setIsReplying(false);
  }, []);

  // Handle delete
  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  }, [id, onDelete]);

  // Handle archive
  const handleArchive = useCallback((e) => {
    e.stopPropagation();
    if (onArchive) {
      onArchive(id);
    }
  }, [id, onArchive]);

  // Format timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Truncate message for preview
  const truncateMessage = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Render message type icon
  const renderMessageTypeIcon = () => {
    switch (type) {
      case MESSAGE_TYPES.CHAT:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        );
      case MESSAGE_TYPES.EMAIL:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case MESSAGE_TYPES.SMS:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L6.586 10 5.293 8.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        );
      case MESSAGE_TYPES.SYSTEM:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
    }
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    switch (status) {
      case MESSAGE_STATUS.SENDING:
        return (
          <div className="flex items-center text-gray-500">
            <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-xs">Sending</span>
          </div>
        );
      case MESSAGE_STATUS.SENT:
        return (
          <div className="flex items-center text-gray-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            <span className="text-xs">Sent</span>
          </div>
        );
      case MESSAGE_STATUS.DELIVERED:
        return (
          <div className="flex items-center text-blue-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Delivered</span>
          </div>
        );
      case MESSAGE_STATUS.READ:
        return (
          <div className="flex items-center text-green-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Read</span>
          </div>
        );
      case MESSAGE_STATUS.FAILED:
        return (
          <div className="flex items-center text-red-500">
            <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Render sender avatar
  const renderSenderAvatar = () => {
    if (sender?.avatar) {
      return (
        <img
          src={sender.avatar}
          alt={sender.name}
          className="h-10 w-10 rounded-full object-cover"
        />
      );
    }
    
    // Default avatar with initials
    const initials = sender?.name
      ? sender.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : 'U';
    
    return (
      <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-medium">
        {initials}
      </div>
    );
  };

  // Render online status indicator
  const renderOnlineStatus = () => {
    if (!sender?.onlineStatus) return null;
    
    const statusColors = {
      online: 'bg-green-400',
      away: 'bg-yellow-400',
      busy: 'bg-red-400',
      offline: 'bg-gray-400',
    };
    
    return (
      <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${statusColors[sender.onlineStatus]}`} />
    );
  };

  // Render attachment indicator
  const renderAttachmentIndicator = () => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="flex items-center text-gray-500 ml-2">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
        </svg>
        <span className="text-xs ml-1">{attachments.length}</span>
      </div>
    );
  };

  // Render thread indicator
  const renderThreadIndicator = () => {
    if (!threadInfo) return null;
    
    return (
      <div className="flex items-center text-purple-600 ml-2">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L6.586 10 5.293 8.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        <span className="text-xs ml-1">{threadInfo.replyCount}</span>
      </div>
    );
  };

  // Get message type styling
  const getMessageTypeClasses = () => {
    switch (type) {
      case MESSAGE_TYPES.CHAT:
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200';
      case MESSAGE_TYPES.EMAIL:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case MESSAGE_TYPES.SMS:
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case MESSAGE_TYPES.SYSTEM:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  // Get priority styling
  const getPriorityClasses = () => {
    switch (priority) {
      case 'low':
        return 'border-l-4';
      case 'normal':
        return 'border-l-4';
      case 'high':
        return 'border-l-8 shadow-lg';
      case 'urgent':
        return 'border-l-8 shadow-lg animate-pulse';
      default:
        return 'border-l-4';
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`
        relative rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${getMessageTypeClasses()}
        ${getPriorityClasses()}
        ${read ? 'opacity-75' : ''}
        ${className}
      `}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {/* Progress bar for auto-dismiss notifications */}
      {autoClose && duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-black bg-opacity-20 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex">
        {/* Sender avatar */}
        <div className="relative flex-shrink-0 mr-3">
          {renderSenderAvatar()}
          {renderOnlineStatus()}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Sender info and timestamp */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <h3 className={`text-sm font-medium truncate ${read ? 'font-normal' : ''}`}>
                    {sender?.name || 'Unknown Sender'}
                  </h3>
                  {sender?.role && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {sender.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-500 ml-2">
                  {formatTimestamp(timestamp)}
                  {renderStatusIndicator()}
                </div>
              </div>

              {/* Subject */}
              {subject && (
                <h4 className="text-sm font-medium mb-1 truncate">
                  {subject}
                </h4>
              )}

              {/* Message content */}
              <div className={`text-sm mb-2 ${read ? 'opacity-75' : ''}`}>
                {showFullMessage ? message : truncateMessage(message)}
                {message && message.length > 100 && (
                  <button
                    onClick={() => setShowFullMessage(!showFullMessage)}
                    className="ml-1 text-purple-600 hover:text-purple-800 underline text-xs"
                  >
                    {showFullMessage ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Indicators */}
              <div className="flex items-center">
                {renderAttachmentIndicator()}
                {renderThreadIndicator()}
              </div>

              {/* Reply section */}
              {isReplying && (
                <div className="mt-3 p-3 bg-white rounded-lg border">
                  <textarea
                    ref={replyInputRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full p-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="3"
                  />
                  <div className="flex justify-end mt-2 space-x-2">
                    <button
                      onClick={cancelReply}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim()}
                      className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-end mt-3 space-x-2">
            {!read && (
              <button
                onClick={handleMarkAsRead}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Mark as read"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <button
              onClick={handleReply}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Reply"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={handleArchive}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Archive"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Close"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Message type icon */}
        <div className="ml-3 flex-shrink-0">
          <div className="text-purple-500 dark:text-purple-400">
            {renderMessageTypeIcon()}
          </div>
        </div>
      </div>

      {/* Unread indicator */}
      {!read && (
        <div className="absolute top-2 right-2 h-2 w-2 bg-purple-500 rounded-full" />
      )}
    </div>
  );
};

MessageNotification.propTypes = {
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(Object.values(MESSAGE_TYPES)),
  sender: PropTypes.shape({
    name: PropTypes.string,
    avatar: PropTypes.string,
    role: PropTypes.string,
    onlineStatus: PropTypes.oneOf(['online', 'away', 'busy', 'offline']),
  }),
  message: PropTypes.string.isRequired,
  subject: PropTypes.string,
  timestamp: PropTypes.string,
  read: PropTypes.bool,
  status: PropTypes.oneOf(Object.values(MESSAGE_STATUS)),
  threadInfo: PropTypes.shape({
    id: PropTypes.string,
    replyCount: PropTypes.number,
    lastReplyAt: PropTypes.string,
  }),
  attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
    size: PropTypes.number,
  })),
  priority: PropTypes.oneOf(['low', 'normal', 'high', 'urgent']),
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  onClose: PropTypes.func,
  onReply: PropTypes.func,
  onMarkAsRead: PropTypes.func,
  onDelete: PropTypes.func,
  onArchive: PropTypes.func,
  className: PropTypes.string,
};

export default MessageNotification;