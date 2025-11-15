import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Notification component with various types and auto-dismiss functionality
 */
const Notification = ({
  type = 'info',
  title,
  message,
  show = false,
  autoClose = false,
  duration = 5000,
  onClose,
  className = '',
  ...props
}) => {
  const [visible, setVisible] = useState(show);
  
  useEffect(() => {
    setVisible(show);
  }, [show]);
  
  useEffect(() => {
    if (visible && autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, duration]);
  
  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  if (!visible) return null;
  
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  const iconClasses = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400',
  };
  
  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  return (
    <div className={`rounded-md border p-4 ${typeClasses[type]} ${className}`} {...props}>
      <div className="flex">
        <div className={`flex-shrink-0 ${iconClasses[type]}`}>
          {renderIcon()}
        </div>
        <div className="ml-3">
          {title && (
            <h3 className="text-sm font-medium">
              {title}
            </h3>
          )}
          <div className={`text-sm ${title ? 'mt-2' : ''}`}>
            {message}
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md p-1.5 ${typeClasses[type]} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'success' ? 'green' : 'blue'}-500`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Notification.propTypes = {
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  show: PropTypes.bool,
  autoClose: PropTypes.bool,
  duration: PropTypes.number,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

/**
 * NotificationContainer component for managing multiple notifications
 */
const NotificationContainer = ({
  notifications = [],
  onRemove,
  position = 'top-right',
  className = '',
  ...props
}) => {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50 space-y-2',
    'top-left': 'fixed top-4 left-4 z-50 space-y-2',
    'bottom-right': 'fixed bottom-4 right-4 z-50 space-y-2',
    'bottom-left': 'fixed bottom-4 left-4 z-50 space-y-2',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2',
  };
  
  return (
    <div className={`${positionClasses[position]} ${className}`} {...props}>
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          autoClose={notification.autoClose !== false}
          duration={notification.duration || 5000}
          onClose={() => onRemove && onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

NotificationContainer.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
      title: PropTypes.string,
      message: PropTypes.string.isRequired,
      autoClose: PropTypes.bool,
      duration: PropTypes.number,
    })
  ),
  onRemove: PropTypes.func,
  position: PropTypes.oneOf([
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
    'top-center',
    'bottom-center',
  ]),
  className: PropTypes.string,
};

/**
 * useNotification hook for managing notifications
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  
  const addNotification = (notification) => {
    const id = Date.now().toString();
    const newNotification = { id, ...notification };
    setNotifications(prev => [...prev, newNotification]);
    return id;
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  const showSuccess = (message, title = 'Success', options = {}) => {
    return addNotification({ type: 'success', title, message, ...options });
  };
  
  const showError = (message, title = 'Error', options = {}) => {
    return addNotification({ type: 'error', title, message, ...options });
  };
  
  const showWarning = (message, title = 'Warning', options = {}) => {
    return addNotification({ type: 'warning', title, message, ...options });
  };
  
  const showInfo = (message, title = 'Info', options = {}) => {
    return addNotification({ type: 'info', title, message, ...options });
  };
  
  const clearAll = () => {
    setNotifications([]);
  };
  
  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
};

Notification.Container = NotificationContainer;
Notification.useNotification = useNotification;

export default Notification;