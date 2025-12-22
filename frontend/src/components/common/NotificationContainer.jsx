import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../stores/notificationStore.js';
import Notification from './Notification.jsx';

/**
 * NotificationContainer component for managing multiple notifications
 * Supports animations, positioning, and real-time updates
 */
const NotificationContainer = ({
  position = 'top-right',
  maxNotifications = 5,
  className = '',
  showUnreadCount = false,
  ...props
}) => {
  const {
    notifications,
    removeNotification,
    markAsRead,
    realtimeConnected,
    connectRealtime,
    disconnectRealtime,
    unreadCount,
  } = useNotificationStore();

  const containerRef = useRef(null);

  // Position classes for the container
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2',
    'top-left': 'fixed top-4 left-4 z-50 flex flex-col items-start space-y-2',
    'bottom-right': 'fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2',
    'bottom-left': 'fixed bottom-4 left-4 z-50 flex flex-col items-start space-y-2',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center space-y-2',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center space-y-2',
  };

  // Animation variants for notifications
  const notificationVariants = {
    initial: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
      y: direction === 'top' ? -100 : direction === 'bottom' ? 100 : 0,
      scale: 0.8,
    }),
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      },
    },
    exit: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
      y: direction === 'top' ? -100 : direction === 'bottom' ? 100 : 0,
      scale: 0.8,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    }),
  };

  // Get animation direction based on position
  const getAnimationDirection = () => {
    if (position.includes('left')) return 'left';
    if (position.includes('right')) return 'right';
    if (position.includes('top')) return 'top';
    if (position.includes('bottom')) return 'bottom';
    return 'top';
  };

  // Limit notifications to maxNotifications
  const visibleNotifications = notifications.slice(0, maxNotifications);
  const direction = getAnimationDirection();

  // Handle notification click for marking as read
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      // Remove the most recent notification
      if (visibleNotifications.length > 0) {
        removeNotification(visibleNotifications[0].id);
      }
    }
  };

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visibleNotifications]);

  // Initialize real-time connection
  useEffect(() => {
    // Only connect if not already connected
    if (!realtimeConnected) {
      connectRealtime().catch(console.error);
    }

    // Cleanup on unmount
    return () => {
      disconnectRealtime();
    };
  }, [realtimeConnected, connectRealtime, disconnectRealtime]);

  return (
    <>
      {/* Unread count indicator */}
      {showUnreadCount && unreadCount > 0 && (
        <div
          className={`fixed ${position.includes('top') ? 'top-20' : 'bottom-20'} ${
            position.includes('right') ? 'right-4' : position.includes('left') ? 'left-4' : 'left-1/2 transform -translate-x-1/2'
          } z-40 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg`}
        >
          {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Notification container */}
      <div
        ref={containerRef}
        className={`${positionClasses[position]} ${className}`}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        {...props}
      >
        <AnimatePresence>
          {visibleNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              custom={direction}
              variants={notificationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              layout
              style={{
                zIndex: 50 - index, // Stack newer notifications on top
                maxWidth: position.includes('center') ? '500px' : '400px',
                width: '100%',
              }}
            >
              <Notification
                {...notification}
                onClick={() => handleNotificationClick(notification)}
                onClose={() => removeNotification(notification.id)}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                aria-label={`${notification.type} notification: ${notification.title}. ${notification.message}`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotificationContainer;