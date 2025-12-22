import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskNotification, {
  TASK_TYPES,
  TASK_STATUS,
  TASK_PRIORITY,
} from './TaskNotification';

// Mock the CSS import
jest.mock('./TaskNotification.css', () => ({}));

describe('TaskNotification', () => {
  const defaultProps = {
    id: 'test-task-1',
    type: TASK_TYPES.ASSIGNMENT,
    title: 'Test Task',
    description: 'This is a test task description',
    assignee: {
      id: 'user-1',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      role: 'Developer',
    },
    creator: {
      id: 'user-2',
      name: 'Jane Smith',
    },
    status: TASK_STATUS.PENDING,
    priority: TASK_PRIORITY.NORMAL,
    dueDate: '2024-12-31T23:59:59Z',
    createdAt: '2024-01-01T10:00:00Z',
    progress: 25,
    dependencies: [],
    blockingTasks: [],
    tags: ['frontend', 'urgent'],
    estimatedHours: 8,
    actualHours: 2,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('renders task notification with all required props', () => {
      render(<TaskNotification {...defaultProps} />);
      
      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('This is a test task description')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Developer')).toBeInTheDocument();
      expect(screen.getByText('Created by Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('Est: 8h | Actual: 2h')).toBeInTheDocument();
    });

    test('renders different task types correctly', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} type={TASK_TYPES.ASSIGNMENT} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-indigo-50');

      rerender(<TaskNotification {...defaultProps} type={TASK_TYPES.REVIEW} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-purple-50');

      rerender(<TaskNotification {...defaultProps} type={TASK_TYPES.APPROVAL} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-green-50');

      rerender(<TaskNotification {...defaultProps} type={TASK_TYPES.DEADLINE} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50');

      rerender(<TaskNotification {...defaultProps} type={TASK_TYPES.REMINDER} />);
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50');
    });

    test('renders different status indicators correctly', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} status={TASK_STATUS.PENDING} />);
      expect(screen.getByText('pending')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} status={TASK_STATUS.IN_PROGRESS} />);
      expect(screen.getByText('in progress')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} status={TASK_STATUS.COMPLETED} />);
      expect(screen.getByText('completed')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} status={TASK_STATUS.CANCELLED} />);
      expect(screen.getByText('cancelled')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} status={TASK_STATUS.ON_HOLD} />);
      expect(screen.getByText('on hold')).toBeInTheDocument();
    });

    test('renders different priority levels correctly', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} priority={TASK_PRIORITY.LOW} />);
      expect(screen.getByText('low')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} priority={TASK_PRIORITY.NORMAL} />);
      expect(screen.getByText('normal')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} priority={TASK_PRIORITY.HIGH} />);
      expect(screen.getByText('high')).toBeInTheDocument();

      rerender(<TaskNotification {...defaultProps} priority={TASK_PRIORITY.CRITICAL} />);
      expect(screen.getByText('critical')).toBeInTheDocument();
    });

    test('renders assignee avatar correctly', () => {
      render(<TaskNotification {...defaultProps} />);
      
      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    test('renders default avatar when no avatar provided', () => {
      const propsWithoutAvatar = {
        ...defaultProps,
        assignee: {
          ...defaultProps.assignee,
          avatar: undefined,
        },
      };
      
      render(<TaskNotification {...propsWithoutAvatar} />);
      
      const initials = screen.getByText('JD');
      expect(initials).toBeInTheDocument();
    });

    test('renders progress bar correctly', () => {
      render(<TaskNotification {...defaultProps} progress={75} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar') || document.querySelector('.bg-green-500');
      expect(progressBar).toHaveStyle('width: 75%');
    });

    test('does not render progress bar for completed tasks', () => {
      render(<TaskNotification {...defaultProps} status={TASK_STATUS.COMPLETED} progress={100} />);
      
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });

    test('renders dependencies correctly', () => {
      const propsWithDependencies = {
        ...defaultProps,
        dependencies: [
          { id: 'task-1', title: 'Dependency 1', status: 'completed' },
          { id: 'task-2', title: 'Dependency 2', status: 'in-progress' },
        ],
        blockingTasks: [
          { id: 'task-3', title: 'Blocking Task', status: 'pending' },
        ],
      };
      
      render(<TaskNotification {...propsWithDependencies} />);
      
      expect(screen.getByText('Depends on 2 tasks')).toBeInTheDocument();
      expect(screen.getByText('Blocking 1 task')).toBeInTheDocument();
    });

    test('renders tags correctly', () => {
      render(<TaskNotification {...defaultProps} />);
      
      expect(screen.getByText('frontend')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });

    test('renders time remaining correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      
      const propsWithFutureDate = {
        ...defaultProps,
        dueDate: futureDate.toISOString(),
      };
      
      render(<TaskNotification {...propsWithFutureDate} />);
      
      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    test('renders overdue indicator correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const propsWithPastDate = {
        ...defaultProps,
        dueDate: pastDate.toISOString(),
      };
      
      render(<TaskNotification {...propsWithPastDate} />);
      
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('calls onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      render(<TaskNotification {...defaultProps} onClose={mockOnClose} />);
      
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-task-1');
    });

    test('calls onViewTask when view button is clicked', () => {
      const mockOnViewTask = jest.fn();
      render(<TaskNotification {...defaultProps} onViewTask={mockOnViewTask} />);
      
      const viewButton = screen.getByTitle('View task');
      fireEvent.click(viewButton);
      
      expect(mockOnViewTask).toHaveBeenCalledWith('test-task-1');
    });

    test('calls onMarkComplete when complete button is clicked', async () => {
      const mockOnMarkComplete = jest.fn().mockResolvedValue();
      render(<TaskNotification {...defaultProps} onMarkComplete={mockOnMarkComplete} />);
      
      const completeButton = screen.getByTitle('Mark as complete');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(mockOnMarkComplete).toHaveBeenCalledWith('test-task-1');
      });
    });

    test('calls onReassign when reassign button is clicked', () => {
      const mockOnReassign = jest.fn();
      render(<TaskNotification {...defaultProps} onReassign={mockOnReassign} />);
      
      const reassignButton = screen.getByTitle('Reassign');
      fireEvent.click(reassignButton);
      
      expect(mockOnReassign).toHaveBeenCalledWith('test-task-1');
    });

    test('calls onSnooze when snooze button is clicked', () => {
      const mockOnSnooze = jest.fn();
      render(<TaskNotification {...defaultProps} onSnooze={mockOnSnooze} />);
      
      const snoozeButton = screen.getByTitle('Snooze');
      fireEvent.click(snoozeButton);
      
      expect(mockOnSnooze).toHaveBeenCalledWith('test-task-1');
    });

    test('calls onUpdateStatus when status is changed', async () => {
      const mockOnUpdateStatus = jest.fn().mockResolvedValue();
      render(<TaskNotification {...defaultProps} onUpdateStatus={mockOnUpdateStatus} />);
      
      const statusButton = screen.getByTitle('Change status');
      fireEvent.mouseEnter(statusButton);
      
      await waitFor(() => {
        expect(screen.getByText('in progress')).toBeInTheDocument();
      });
      
      const inProgressOption = screen.getByText('in progress');
      fireEvent.click(inProgressOption);
      
      await waitFor(() => {
        expect(mockOnUpdateStatus).toHaveBeenCalledWith('test-task-1', 'in-progress');
      });
    });

    test('toggles description visibility when show more/less is clicked', () => {
      const longDescription = 'This is a very long description that should be truncated and have a show more button. '.repeat(5);
      const propsWithLongDescription = {
        ...defaultProps,
        description: longDescription,
      };
      
      render(<TaskNotification {...propsWithLongDescription} />);
      
      expect(screen.getByText(/Show more/)).toBeInTheDocument();
      
      const showMoreButton = screen.getByText('Show more');
      fireEvent.click(showMoreButton);
      
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });

    test('shows loading state when updating', async () => {
      const mockOnMarkComplete = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      render(<TaskNotification {...defaultProps} onMarkComplete={mockOnMarkComplete} />);
      
      const completeButton = screen.getByTitle('Mark as complete');
      fireEvent.click(completeButton);
      
      expect(screen.getByRole('alert')).toHaveClass('opacity-50');
    });
  });

  describe('Auto-close functionality', () => {
    test('auto-closes after specified duration', () => {
      const mockOnClose = jest.fn();
      render(
        <TaskNotification
          {...defaultProps}
          autoClose={true}
          duration={5000}
          onClose={mockOnClose}
        />
      );
      
      jest.advanceTimersByTime(5000);
      
      expect(mockOnClose).toHaveBeenCalledWith('test-task-1');
    });

    test('shows progress bar for auto-close notifications', () => {
      render(
        <TaskNotification
          {...defaultProps}
          autoClose={true}
          duration={5000}
        />
      );
      
      const progressBar = document.querySelector('.bg-black.bg-opacity-20');
      expect(progressBar).toBeInTheDocument();
    });

    test('does not auto-close when autoClose is false', () => {
      const mockOnClose = jest.fn();
      render(
        <TaskNotification
          {...defaultProps}
          autoClose={false}
          onClose={mockOnClose}
        />
      );
      
      jest.advanceTimersByTime(10000);
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<TaskNotification {...defaultProps} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
    });

    test('supports keyboard navigation', () => {
      render(<TaskNotification {...defaultProps} />);
      
      const closeButton = screen.getByTitle('Close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    test('has proper button titles for screen readers', () => {
      render(<TaskNotification {...defaultProps} />);
      
      expect(screen.getByTitle('View task')).toBeInTheDocument();
      expect(screen.getByTitle('Mark as complete')).toBeInTheDocument();
      expect(screen.getByTitle('Reassign')).toBeInTheDocument();
      expect(screen.getByTitle('Snooze')).toBeInTheDocument();
      expect(screen.getByTitle('Change status')).toBeInTheDocument();
      expect(screen.getByTitle('Close')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    test('renders without optional props', () => {
      const minimalProps = {
        id: 'test-task-2',
        title: 'Minimal Task',
      };
      
      render(<TaskNotification {...minimalProps} />);
      
      expect(screen.getByText('Minimal Task')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    test('handles missing assignee gracefully', () => {
      const propsWithoutAssignee = {
        ...defaultProps,
        assignee: null,
      };
      
      render(<TaskNotification {...propsWithoutAssignee} />);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    test('handles empty arrays gracefully', () => {
      const propsWithEmptyArrays = {
        ...defaultProps,
        dependencies: [],
        blockingTasks: [],
        tags: [],
      };
      
      render(<TaskNotification {...propsWithEmptyArrays} />);
      
      expect(screen.queryByText(/Depends on/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Blocking/)).not.toBeInTheDocument();
      expect(screen.queryByText('frontend')).not.toBeInTheDocument();
    });

    test('handles missing dates gracefully', () => {
      const propsWithoutDates = {
        ...defaultProps,
        dueDate: null,
        createdAt: null,
      };
      
      render(<TaskNotification {...propsWithoutDates} />);
      
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
      expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    test('applies responsive classes', () => {
      render(<TaskNotification {...defaultProps} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('rounded-lg', 'border', 'p-4');
    });
  });

  describe('Read state', () => {
    test('applies opacity when read', () => {
      render(<TaskNotification {...defaultProps} read={true} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('opacity-75');
    });

    test('shows unread indicator when not read', () => {
      render(<TaskNotification {...defaultProps} read={false} />);
      
      const unreadIndicator = document.querySelector('.bg-indigo-500.rounded-full');
      expect(unreadIndicator).toBeInTheDocument();
    });
  });
});

describe('TaskNotification Constants', () => {
  test('exports correct task types', () => {
    expect(TASK_TYPES.ASSIGNMENT).toBe('assignment');
    expect(TASK_TYPES.REVIEW).toBe('review');
    expect(TASK_TYPES.APPROVAL).toBe('approval');
    expect(TASK_TYPES.DEADLINE).toBe('deadline');
    expect(TASK_TYPES.REMINDER).toBe('reminder');
  });

  test('exports correct task statuses', () => {
    expect(TASK_STATUS.PENDING).toBe('pending');
    expect(TASK_STATUS.IN_PROGRESS).toBe('in-progress');
    expect(TASK_STATUS.COMPLETED).toBe('completed');
    expect(TASK_STATUS.CANCELLED).toBe('cancelled');
    expect(TASK_STATUS.ON_HOLD).toBe('on-hold');
  });

  test('exports correct task priorities', () => {
    expect(TASK_PRIORITY.LOW).toBe('low');
    expect(TASK_PRIORITY.NORMAL).toBe('normal');
    expect(TASK_PRIORITY.HIGH).toBe('high');
    expect(TASK_PRIORITY.CRITICAL).toBe('critical');
  });

  describe('Edge Cases', () => {
    test('handles extremely long descriptions', () => {
      const extremelyLongDescription = 'A'.repeat(5000);
      
      render(
        <TaskNotification
          {...defaultProps}
          description={extremelyLongDescription}
        />
      );

      expect(screen.getByText(/A+/)).toBeInTheDocument();
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    test('handles special characters in task data', () => {
      const specialTitle = 'Special chars: !@#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      render(
        <TaskNotification
          {...defaultProps}
          title={specialTitle}
        />
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    test('handles null/undefined optional props gracefully', () => {
      expect(() => {
        render(
          <TaskNotification
            {...defaultProps}
            assignee={null}
            creator={undefined}
            dependencies={null}
            tags={undefined}
          />
        );
      }).not.toThrow();
    });

    test('handles zero progress correctly', () => {
      render(
        <TaskNotification
          {...defaultProps}
          progress={0}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    test('handles 100% progress correctly', () => {
      render(
        <TaskNotification
          {...defaultProps}
          progress={100}
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently with many dependencies', () => {
      const manyDependencies = Array.from({ length: 50 }, (_, i) => ({
        id: `dep-${i}`,
        title: `Dependency ${i}`,
        status: 'completed',
      }));

      const startTime = performance.now();
      
      render(
        <TaskNotification
          {...defaultProps}
          dependencies={manyDependencies}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText('Depends on 50 tasks')).toBeInTheDocument();
    });

    test('handles rapid status updates', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} />);

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const statuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        const status = statuses[i % statuses.length];
        
        rerender(
          <TaskNotification
            {...defaultProps}
            status={status}
          />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(
        <TaskNotification
          {...defaultProps}
          priority={TASK_PRIORITY.CRITICAL}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'assertive');
      expect(notification).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', () => {
      render(
        <TaskNotification
          {...defaultProps}
          onViewTask={jest.fn()}
        />
      );

      const viewButton = screen.getByTitle('View task');
      viewButton.focus();
      expect(viewButton).toHaveFocus();

      fireEvent.keyDown(viewButton, { key: 'Enter' });
      expect(screen.getByTitle('View task')).toBeInTheDocument();
    });

    test('announces progress to screen readers', () => {
      render(
        <TaskNotification
          {...defaultProps}
          progress={75}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Real-time Updates', () => {
    test('updates when task data changes', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} />);

      expect(screen.getByText('Test Task')).toBeInTheDocument();

      const updatedProps = {
        ...defaultProps,
        title: 'Updated Task',
        status: TASK_STATUS.IN_PROGRESS,
        progress: 50,
      };

      rerender(<TaskNotification {...updatedProps} />);

      expect(screen.getByText('Updated Task')).toBeInTheDocument();
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    test('handles new dependencies being added', () => {
      const { rerender } = render(<TaskNotification {...defaultProps} />);

      expect(screen.queryByText('Depends on')).not.toBeInTheDocument();

      const newDependencies = [
        { id: 'new-dep-1', title: 'New Dependency', status: 'pending' },
      ];

      rerender(<TaskNotification {...defaultProps} dependencies={newDependencies} />);

      expect(screen.getByText('Depends on 1 tasks')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('integrates with notification store', () => {
      const mockStore = {
        notifications: [defaultProps],
        markAsRead: jest.fn(),
        removeNotification: jest.fn(),
      };

      jest.doMock('../../stores/index.js', () => ({
        useNotificationStore: () => mockStore,
      }));

      render(<TaskNotification {...defaultProps} />);

      const viewButton = screen.getByTitle('View task');
      fireEvent.click(viewButton);

      expect(mockStore.markAsRead).toHaveBeenCalledWith(defaultProps.id);
    });

    test('integrates with task management system', () => {
      const mockTaskService = {
        updateTaskStatus: jest.fn(),
        reassignTask: jest.fn(),
      };

      jest.doMock('../../services/taskService.js', () => ({
        taskService: mockTaskService,
      }));

      render(
        <TaskNotification
          {...defaultProps}
          onUpdateStatus={mockTaskService.updateTaskStatus}
          onReassign={mockTaskService.reassignTask}
        />
      );

      const statusButton = screen.getByTitle('Change status');
      fireEvent.mouseEnter(statusButton);

      const inProgressOption = screen.getByText('in progress');
      fireEvent.click(inProgressOption);

      expect(mockTaskService.updateTaskStatus).toHaveBeenCalledWith(defaultProps.id, 'in-progress');
    });
  });

  describe('Time Calculations', () => {
    test('calculates time remaining correctly', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 24); // 24 hours from now

      render(
        <TaskNotification
          {...defaultProps}
          dueDate={futureDate.toISOString()}
        />
      );

      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    test('shows overdue correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      render(
        <TaskNotification
          {...defaultProps}
          dueDate={pastDate.toISOString()}
        />
      );

      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    test('handles due date exactly at current time', () => {
      const now = new Date();
      const currentTime = now.toISOString();

      render(
        <TaskNotification
          {...defaultProps}
          dueDate={currentTime}
        />
      );

      // Should show as due now or very soon
      expect(screen.getByText(/due/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid progress values', () => {
      expect(() => {
        render(
          <TaskNotification
            {...defaultProps}
            progress={-10}
          />
        );
      }).not.toThrow();

      expect(() => {
        render(
          <TaskNotification
            {...defaultProps}
            progress={150}
          />
        );
      }).not.toThrow();
    });

    test('handles invalid dates gracefully', () => {
      expect(() => {
        render(
          <TaskNotification
            {...defaultProps}
            dueDate="invalid-date"
          />
        );
      }).not.toThrow();
    });

    test('handles malformed assignee data', () => {
      const malformedAssignee = {
        id: null,
        name: undefined,
        avatar: '',
        role: null,
      };

      render(
        <TaskNotification
          {...defaultProps}
          assignee={malformedAssignee}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });
  });
});