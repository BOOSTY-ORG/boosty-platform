import React, { useState } from 'react';
import TaskNotification, {
  TASK_TYPES,
  TASK_STATUS,
  TASK_PRIORITY,
} from './TaskNotification';

/**
 * Example component demonstrating TaskNotification usage
 */
const TaskNotificationExample = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 'task-1',
      type: TASK_TYPES.ASSIGNMENT,
      title: 'Complete Solar Application Review',
      description: 'Review and approve the pending solar application from John Doe. Ensure all documents are verified and compliance checks are completed.',
      assignee: {
        id: 'user-1',
        name: 'Sarah Johnson',
        avatar: 'https://picsum.photos/seed/sarah/40/40.jpg',
        role: 'Review Officer',
      },
      creator: {
        id: 'user-2',
        name: 'System Admin',
      },
      status: TASK_STATUS.IN_PROGRESS,
      priority: TASK_PRIORITY.HIGH,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      progress: 65,
      dependencies: [
        { id: 'task-dep-1', title: 'Document Verification', status: 'completed' },
      ],
      blockingTasks: [],
      tags: ['solar', 'review', 'urgent'],
      estimatedHours: 4,
      actualHours: 2.5,
    },
    {
      id: 'task-2',
      type: TASK_TYPES.DEADLINE,
      title: 'KYC Document Submission',
      description: 'Submit all required KYC documents for investor verification before the deadline.',
      assignee: {
        id: 'user-3',
        name: 'Mike Chen',
        avatar: 'https://picsum.photos/seed/mike/40/40.jpg',
        role: 'Investor',
      },
      creator: {
        id: 'user-4',
        name: 'Compliance Team',
      },
      status: TASK_STATUS.PENDING,
      priority: TASK_PRIORITY.CRITICAL,
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      progress: 0,
      dependencies: [],
      blockingTasks: [
        { id: 'task-block-1', title: 'Account Verification', status: 'pending' },
      ],
      tags: ['kyc', 'deadline', 'critical'],
      estimatedHours: 2,
      actualHours: 0,
    },
    {
      id: 'task-3',
      type: TASK_TYPES.APPROVAL,
      title: 'Investment Payout Approval',
      description: 'Approve the monthly ROI payout for Q4 2023. Total amount: $125,000.',
      assignee: {
        id: 'user-5',
        name: 'Emily Rodriguez',
        avatar: 'https://picsum.photos/seed/emily/40/40.jpg',
        role: 'Finance Manager',
      },
      creator: {
        id: 'user-6',
        name: 'Payment System',
      },
      status: TASK_STATUS.COMPLETED,
      priority: TASK_PRIORITY.NORMAL,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (overdue but completed)
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      progress: 100,
      dependencies: [],
      blockingTasks: [],
      tags: ['payment', 'approval', 'completed'],
      estimatedHours: 1,
      actualHours: 0.5,
    },
    {
      id: 'task-4',
      type: TASK_TYPES.REMINDER,
      title: 'System Maintenance Reminder',
      description: 'Scheduled system maintenance tonight at 11 PM EST. Expected downtime: 2 hours.',
      assignee: {
        id: 'user-7',
        name: 'David Kim',
        avatar: 'https://picsum.photos/seed/david/40/40.jpg',
        role: 'System Administrator',
      },
      creator: {
        id: 'system',
        name: 'System',
      },
      status: TASK_STATUS.ON_HOLD,
      priority: TASK_PRIORITY.LOW,
      dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      progress: 25,
      dependencies: [],
      blockingTasks: [],
      tags: ['maintenance', 'system', 'reminder'],
      estimatedHours: 3,
      actualHours: 0.75,
    },
  ]);

  const handleViewTask = (taskId) => {
    console.log(`Viewing task: ${taskId}`);
    alert(`Viewing task details for ${taskId}`);
  };

  const handleMarkComplete = async (taskId) => {
    console.log(`Marking task as complete: ${taskId}`);
    
    // Update the notification status
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === taskId 
          ? { ...notification, status: TASK_STATUS.COMPLETED, progress: 100 }
          : notification
      )
    );
    
    alert(`Task ${taskId} marked as complete!`);
  };

  const handleReassign = (taskId) => {
    console.log(`Reassigning task: ${taskId}`);
    const newAssignee = prompt('Enter assignee name:');
    if (newAssignee) {
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === taskId 
            ? { 
                ...notification, 
                assignee: { 
                  ...notification.assignee, 
                  name: newAssignee 
                } 
              }
            : notification
        )
      );
    }
  };

  const handleSnooze = (taskId) => {
    console.log(`Snoozing task: ${taskId}`);
    alert(`Task ${taskId} snoozed for 1 hour`);
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    console.log(`Updating task status: ${taskId} -> ${newStatus}`);
    
    // Update the notification status
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === taskId 
          ? { 
              ...notification, 
              status: newStatus,
              progress: newStatus === TASK_STATUS.COMPLETED ? 100 : notification.progress
            }
          : notification
      )
    );
  };

  const handleClose = (taskId) => {
    console.log(`Closing task notification: ${taskId}`);
    setNotifications(prev => prev.filter(notification => notification.id !== taskId));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Task Notification Examples
          </h1>
          <p className="text-gray-600">
            Demonstrating different types of task notifications with various states and priorities.
          </p>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <TaskNotification
              key={notification.id}
              {...notification}
              onClose={handleClose}
              onViewTask={handleViewTask}
              onMarkComplete={handleMarkComplete}
              onReassign={handleReassign}
              onSnooze={handleSnooze}
              onUpdateStatus={handleUpdateStatus}
              className="mb-4"
            />
          ))}
        </div>

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No task notifications to display.</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Task Notification Features
          </h2>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Different task types: Assignment, Review, Approval, Deadline, Reminder</li>
            <li>• Status tracking: Pending, In Progress, Completed, Cancelled, On Hold</li>
            <li>• Priority levels: Low, Normal, High, Critical</li>
            <li>• Progress indicators with visual progress bars</li>
            <li>• Time tracking with estimated and actual hours</li>
            <li>• Task dependencies and blocking relationships</li>
            <li>• Assignee information with avatars</li>
            <li>• Due date tracking with overdue indicators</li>
            <li>• Quick actions: View, Complete, Reassign, Snooze</li>
            <li>• Status change dropdown</li>
            <li>• Tag support for categorization</li>
            <li>• Auto-dismiss functionality with progress indicator</li>
            <li>• Responsive design and accessibility features</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TaskNotificationExample;