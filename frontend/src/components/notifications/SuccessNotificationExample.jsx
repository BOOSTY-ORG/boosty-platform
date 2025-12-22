import React, { useState } from 'react';
import SuccessNotification, { SUCCESS_TYPES, SUCCESS_LEVELS } from './SuccessNotification';

/**
 * SuccessNotificationExample component
 * Demonstrates various usage patterns of the SuccessNotification component
 */
const SuccessNotificationExample = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 'success-1',
      type: SUCCESS_TYPES.FORM_SUBMISSION,
      level: SUCCESS_LEVELS.SUCCESS,
      title: 'Form Submitted Successfully',
      message: 'Your solar application form has been submitted and is being processed.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'success-2',
      type: SUCCESS_TYPES.FILE_UPLOAD,
      level: SUCCESS_LEVELS.INFO,
      title: 'Documents Uploaded',
      message: 'Your KYC documents have been uploaded successfully.',
      details: 'The following documents were uploaded: ID card, proof of address, and bank statement.',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      read: true,
    },
    {
      id: 'success-3',
      type: SUCCESS_TYPES.PAYMENT,
      level: SUCCESS_LEVELS.SUCCESS,
      title: 'Payment Processed',
      message: 'Your investment payment of $5,000 has been processed successfully.',
      progress: {
        current: 1,
        total: 12,
        label: 'Monthly payments completed',
      },
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'success-4',
      type: SUCCESS_TYPES.ACHIEVEMENT,
      level: SUCCESS_LEVELS.ACHIEVEMENT,
      title: 'Achievement Unlocked!',
      message: 'Congratulations! You\'ve completed your first investment.',
      achievement: {
        title: 'First Investment',
        description: 'Successfully completed your first solar energy investment',
        points: 100,
        badge: 'first-investment',
      },
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      read: false,
      persistent: true,
    },
    {
      id: 'success-5',
      type: SUCCESS_TYPES.MILESTONE,
      level: SUCCESS_LEVELS.MILESTONE,
      title: 'Milestone Reached!',
      message: 'You\'ve invested $10,000 in solar energy projects.',
      achievement: {
        title: 'Solar Champion',
        description: 'Reached $10,000 in total solar investments',
        points: 500,
        badge: 'solar-champion',
      },
      progress: {
        current: 10000,
        total: 10000,
        label: 'Investment goal achieved',
      },
      nextSteps: [
        'Explore new investment opportunities',
        'Set up automatic investments',
        'Refer a friend for bonus rewards',
      ],
      relatedActions: [
        {
          label: 'View Investment Portfolio',
          onClick: () => console.log('View portfolio clicked'),
        },
        {
          label: 'Download Certificate',
          onClick: () => console.log('Download certificate clicked'),
        },
      ],
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      persistent: true,
    },
    {
      id: 'success-6',
      type: SUCCESS_TYPES.TASK_COMPLETION,
      level: SUCCESS_LEVELS.SUCCESS,
      title: 'Task Completed',
      message: 'Your profile verification has been completed successfully.',
      nextSteps: [
        'Complete your investment profile',
        'Set up payment methods',
        'Explore available projects',
      ],
      relatedActions: [
        {
          label: 'Complete Profile',
          onClick: () => console.log('Complete profile clicked'),
        },
      ],
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ]);

  // Event handlers
  const handleClose = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    console.log(`Notification ${id} closed`);
  };

  const handleShare = (id, data) => {
    console.log('Share notification:', id, data);
    // Implement share functionality
    alert(`Sharing success: ${data.title}`);
  };

  const handleViewDetails = (id) => {
    console.log(`View details for notification ${id}`);
    // Implement view details functionality
  };

  const handleContinue = (id) => {
    console.log(`Continue workflow for notification ${id}`);
    // Implement continue functionality
  };

  const handleSave = (id) => {
    console.log(`Save notification ${id}`);
    // Implement save functionality
    alert('Notification saved to your achievements');
  };

  const handleTrack = (id, action, data) => {
    console.log(`Track analytics: ${id}, ${action}`, data);
    // Implement analytics tracking
  };

  const addNewNotification = (type, level) => {
    const newNotification = {
      id: `success-${Date.now()}`,
      type,
      level,
      title: `New ${type} Success`,
      message: `This is a demonstration of a ${type} notification with ${level} level.`,
      timestamp: new Date().toISOString(),
      read: false,
      autoClose: true,
      duration: 5000,
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            SuccessNotification Component Examples
          </h1>
          <p className="text-gray-600 mb-6">
            This page demonstrates various configurations and features of the SuccessNotification component.
          </p>

          {/* Control buttons */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Different Success Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.FORM_SUBMISSION, SUCCESS_LEVELS.SUCCESS)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Form Submission
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.FILE_UPLOAD, SUCCESS_LEVELS.INFO)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                File Upload
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.PAYMENT, SUCCESS_LEVELS.SUCCESS)}
                className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
              >
                Payment
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.TASK_COMPLETION, SUCCESS_LEVELS.SUCCESS)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Task Completion
              </button>
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Different Success Levels</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.UPDATE, SUCCESS_LEVELS.INFO)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Info Level
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.REGISTRATION, SUCCESS_LEVELS.SUCCESS)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Success Level
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.ACHIEVEMENT, SUCCESS_LEVELS.ACHIEVEMENT)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                Achievement
              </button>
              <button
                onClick={() => addNewNotification(SUCCESS_TYPES.MILESTONE, SUCCESS_LEVELS.MILESTONE)}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Milestone
              </button>
            </div>
          </div>
        </div>

        {/* Notifications display */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Active Notifications ({notifications.length})
          </h2>
          
          {notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No active notifications. Click the buttons above to create examples.</p>
            </div>
          ) : (
            notifications.map(notification => (
              <SuccessNotification
                key={notification.id}
                {...notification}
                onClose={handleClose}
                onShare={handleShare}
                onViewDetails={handleViewDetails}
                onContinue={handleContinue}
                onSave={handleSave}
                onTrack={handleTrack}
              />
            ))
          )}
        </div>

        {/* Feature showcase */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Feature Showcase</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Success Types</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Form Submission:</strong> Form completion and submission feedback</li>
                <li><strong>File Upload:</strong> Document and file upload confirmations</li>
                <li><strong>Task Completion:</strong> Task and activity completion notifications</li>
                <li><strong>Payment:</strong> Payment processing and transaction confirmations</li>
                <li><strong>Registration:</strong> User registration and signup confirmations</li>
                <li><strong>Update:</strong> Profile and system update confirmations</li>
                <li><strong>Achievement:</strong> Achievement unlocks and rewards</li>
                <li><strong>Milestone:</strong> Major milestones and goal completions</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Success Levels</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>Info:</strong> General informational success messages</li>
                <li><strong>Success:</strong> Standard success confirmations</li>
                <li><strong>Achievement:</strong> Special achievements with celebrations</li>
                <li><strong>Milestone:</strong> Major milestones with enhanced visuals</li>
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Key Features</h3>
            <ul className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
              <li>✅ Auto-dismiss with progress indicator</li>
              <li>✅ Persistent notifications for important successes</li>
              <li>✅ Expandable details section</li>
              <li>✅ Progress tracking with visual indicators</li>
              <li>✅ Achievement badges with points system</li>
              <li>✅ Related actions and next steps</li>
              <li>✅ Celebration animations for achievements</li>
              <li>✅ Quick actions (share, save, continue)</li>
              <li>✅ Analytics tracking support</li>
              <li>✅ Mobile responsive design</li>
              <li>✅ Accessibility features</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessNotificationExample;