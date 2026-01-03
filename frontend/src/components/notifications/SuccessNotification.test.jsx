import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuccessNotification, { SUCCESS_TYPES, SUCCESS_LEVELS } from './SuccessNotification';

// Mock CSS imports to avoid issues with CSS modules
jest.mock('./SuccessNotification.css', () => ({}));

describe('SuccessNotification', () => {
  const defaultProps = {
    id: 'test-success-1',
    title: 'Test Success',
    message: 'This is a test success notification',
    type: SUCCESS_TYPES.FORM_SUBMISSION,
    level: SUCCESS_LEVELS.SUCCESS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with default props', () => {
      render(<SuccessNotification {...defaultProps} />);
      
      expect(screen.getByText('Test Success')).toBeInTheDocument();
      expect(screen.getByText('This is a test success notification')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('renders with custom title and message', () => {
      const props = {
        ...defaultProps,
        title: 'Custom Title',
        message: 'Custom message content',
      };
      
      render(<SuccessNotification {...props} />);
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Custom message content')).toBeInTheDocument();
    });

    test('renders with timestamp', () => {
      const timestamp = '2023-12-01T10:00:00Z';
      render(<SuccessNotification {...defaultProps} timestamp={timestamp} />);
      
      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });

    test('renders with details', () => {
      const details = 'Additional details about the success';
      render(<SuccessNotification {...defaultProps} details={details} />);
      
      expect(screen.getByText('Show Details')).toBeInTheDocument();
    });

    test('renders with progress indicator', () => {
      const progress = { current: 3, total: 5, label: 'Tasks completed' };
      render(<SuccessNotification {...defaultProps} progress={progress} />);
      
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByText('3/5')).toBeInTheDocument();
      expect(screen.getByText('Tasks completed')).toBeInTheDocument();
    });

    test('renders with achievement badge', () => {
      const achievement = {
        title: 'First Achievement',
        description: 'You completed your first task',
        points: 100,
      };
      render(<SuccessNotification {...defaultProps} achievement={achievement} />);
      
      expect(screen.getByText('First Achievement')).toBeInTheDocument();
      expect(screen.getByText('You completed your first task')).toBeInTheDocument();
      expect(screen.getByText('+100 points')).toBeInTheDocument();
    });

    test('renders with related actions', () => {
      const relatedActions = [
        { label: 'View Report', onClick: jest.fn() },
        { label: 'Share Results', onClick: jest.fn() },
      ];
      render(<SuccessNotification {...defaultProps} relatedActions={relatedActions} />);
      
      expect(screen.getByText('Related Actions')).toBeInTheDocument();
      expect(screen.getByText('View Report')).toBeInTheDocument();
      expect(screen.getByText('Share Results')).toBeInTheDocument();
    });

    test('renders with next steps', () => {
      const nextSteps = ['Complete profile', 'Verify email', 'Set preferences'];
      render(<SuccessNotification {...defaultProps} nextSteps={nextSteps} />);
      
      expect(screen.getByText('Next Steps')).toBeInTheDocument();
      expect(screen.getByText('Complete profile')).toBeInTheDocument();
      expect(screen.getByText('Verify email')).toBeInTheDocument();
      expect(screen.getByText('Set preferences')).toBeInTheDocument();
    });

    test('renders with read state', () => {
      render(<SuccessNotification {...defaultProps} read />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('opacity-75');
    });

    test('renders with custom className', () => {
      render(<SuccessNotification {...defaultProps} className="custom-class" />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('custom-class');
    });
  });

  describe('Success Types', () => {
    test.each(Object.values(SUCCESS_TYPES))('renders %s type correctly', (type) => {
      render(<SuccessNotification {...defaultProps} type={type} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
    });
  });

  describe('Success Levels', () => {
    test.each(Object.values(SUCCESS_LEVELS))('renders %s level correctly', (level) => {
      render(<SuccessNotification {...defaultProps} level={level} />);
      
      expect(screen.getByText(level)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(<SuccessNotification {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledWith('test-success-1');
    });

    test('calls onShare when share button is clicked', () => {
      const onShare = jest.fn();
      render(<SuccessNotification {...defaultProps} onShare={onShare} />);
      
      const shareButton = screen.getByTitle('Share success');
      fireEvent.click(shareButton);
      
      expect(onShare).toHaveBeenCalledWith('test-success-1', {
        type: SUCCESS_TYPES.FORM_SUBMISSION,
        level: SUCCESS_LEVELS.SUCCESS,
        title: 'Test Success',
        message: 'This is a test success notification',
        achievement: undefined,
      });
    });

    test('calls onViewDetails when view details button is clicked', () => {
      const onViewDetails = jest.fn();
      render(<SuccessNotification {...defaultProps} onViewDetails={onViewDetails} />);
      
      const viewDetailsButton = screen.getByTitle('View details');
      fireEvent.click(viewDetailsButton);
      
      expect(onViewDetails).toHaveBeenCalledWith('test-success-1');
    });

    test('calls onContinue when continue button is clicked', () => {
      const onContinue = jest.fn();
      render(<SuccessNotification {...defaultProps} onContinue={onContinue} />);
      
      const continueButton = screen.getByTitle('Continue');
      fireEvent.click(continueButton);
      
      expect(onContinue).toHaveBeenCalledWith('test-success-1');
    });

    test('calls onSave when save button is clicked', () => {
      const onSave = jest.fn();
      render(<SuccessNotification {...defaultProps} onSave={onSave} />);
      
      const saveButton = screen.getByTitle('Save success');
      fireEvent.click(saveButton);
      
      expect(onSave).toHaveBeenCalledWith('test-success-1');
    });

    test('toggles details when show/hide details button is clicked', () => {
      const details = 'Additional details';
      render(<SuccessNotification {...defaultProps} details={details} />);
      
      const showButton = screen.getByText('Show Details');
      fireEvent.click(showButton);
      
      expect(screen.getByText('Hide Details')).toBeInTheDocument();
      expect(screen.getByText('Additional details')).toBeInTheDocument();
      
      const hideButton = screen.getByText('Hide Details');
      fireEvent.click(hideButton);
      
      expect(screen.getByText('Show Details')).toBeInTheDocument();
    });

    test('calls onTrack when related action is clicked', () => {
      const onTrack = jest.fn();
      const mockActionClick = jest.fn();
      const relatedActions = [
        { label: 'Test Action', onClick: mockActionClick },
      ];
      
      render(
        <SuccessNotification 
          {...defaultProps} 
          relatedActions={relatedActions}
          onTrack={onTrack}
        />
      );
      
      const actionButton = screen.getByText('Test Action');
      fireEvent.click(actionButton);
      
      expect(onTrack).toHaveBeenCalledWith('test-success-1', 'related_action_clicked', {
        type: SUCCESS_TYPES.FORM_SUBMISSION,
        level: SUCCESS_LEVELS.SUCCESS,
        achievement: undefined,
        analytics: undefined,
      });
      expect(mockActionClick).toHaveBeenCalled();
    });

    test('shows quick actions on hover', () => {
      render(<SuccessNotification {...defaultProps} />);
      
      const notification = screen.getByRole('alert');
      
      // Initially, quick actions should have reduced opacity
      const quickActionsContainer = notification.querySelector('.flex.items-center.justify-end.mt-3');
      expect(quickActionsContainer).toHaveClass('opacity-60');
      
      // On hover, opacity should increase
      fireEvent.mouseEnter(notification);
      expect(quickActionsContainer).toHaveClass('opacity-100');
      
      // On leave, opacity should decrease
      fireEvent.mouseLeave(notification);
      expect(quickActionsContainer).toHaveClass('opacity-60');
    });
  });

  describe('Auto-dismiss functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('auto-dismisses after specified duration', async () => {
      const onClose = jest.fn();
      render(
        <SuccessNotification 
          {...defaultProps} 
          autoClose 
          duration={1000}
          onClose={onClose}
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledWith('test-success-1');
      });
    });

    test('does not auto-dismiss when persistent is true', () => {
      const onClose = jest.fn();
      render(
        <SuccessNotification 
          {...defaultProps} 
          autoClose 
          duration={1000}
          persistent
          onClose={onClose}
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    test('shows progress bar during auto-dismiss', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          autoClose 
          duration={1000}
        />
      );
      
      const progressBar = screen.getByRole('alert').querySelector('.h-1.bg-black.bg-opacity-20');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Achievement and milestone celebrations', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('triggers celebration animation for achievement level', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          level={SUCCESS_LEVELS.ACHIEVEMENT}
        />
      );
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('celebration-animation');
    });

    test('triggers celebration animation for milestone level', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          level={SUCCESS_LEVELS.MILESTONE}
        />
      );
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('celebration-animation');
    });

    test('removes celebration animation after timeout', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          level={SUCCESS_LEVELS.ACHIEVEMENT}
        />
      );
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('celebration-animation');
      
      // Fast-forward time
      jest.advanceTimersByTime(3000);
      
      expect(notification).not.toHaveClass('celebration-animation');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<SuccessNotification {...defaultProps} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
    });

    test('supports keyboard navigation', () => {
      render(<SuccessNotification {...defaultProps} />);
      
      const closeButton = screen.getByTitle('Close');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });

    test('announces to screen readers', () => {
      render(<SuccessNotification {...defaultProps} />);
      
      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    test('handles missing optional props gracefully', () => {
      const minimalProps = {
        id: 'test-1',
        message: 'Minimal success message',
      };
      
      expect(() => {
        render(<SuccessNotification {...minimalProps} />);
      }).not.toThrow();
    });

    test('handles empty related actions array', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          relatedActions={[]}
        />
      );
      
      expect(screen.queryByText('Related Actions')).not.toBeInTheDocument();
    });

    test('handles empty next steps array', () => {
      render(
        <SuccessNotification 
          {...defaultProps} 
          nextSteps={[]}
        />
      );
      
      expect(screen.queryByText('Next Steps')).not.toBeInTheDocument();
    });
  });

  describe('Component lifecycle', () => {
    test('cleans up timers on unmount', () => {
      const onClose = jest.fn();
      const { unmount } = render(
        <SuccessNotification 
          {...defaultProps} 
          autoClose 
          duration={1000}
          onClose={onClose}
        />
      );
      
      // Unmount before timer completes
      unmount();
      
      // Fast-forward time
      jest.advanceTimersByTime(2000);
      
      // onClose should not be called after unmount
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles extremely long achievement descriptions', () => {
      const extremelyLongDescription = 'A'.repeat(1000);
      
      render(
        <SuccessNotification
          {...defaultProps}
          achievement={{
            title: 'Extreme Achievement',
            description: extremelyLongDescription,
            points: 1000,
          }}
        />
      );

      expect(screen.getByText(/A+/)).toBeInTheDocument();
      expect(screen.getByText('Show Details')).toBeInTheDocument();
    });

    test('handles special characters in achievement titles', () => {
      const specialTitle = 'Special chars: !@#$%^&*()_+-=[]{}|;:"<>,.?/~`';
      
      render(
        <SuccessNotification
          {...defaultProps}
          achievement={{
            title: specialTitle,
            description: 'Special achievement',
            points: 100,
          }}
        />
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    test('handles null/undefined optional props gracefully', () => {
      expect(() => {
        render(
          <SuccessNotification
            {...defaultProps}
            achievement={null}
            progress={null}
            relatedActions={null}
            nextSteps={null}
          />
        );
      }).not.toThrow();
    });

    test('handles empty arrays gracefully', () => {
      render(
        <SuccessNotification
          {...defaultProps}
          relatedActions={[]}
          nextSteps={[]}
        />
      );

      expect(screen.queryByText('Related Actions')).not.toBeInTheDocument();
      expect(screen.queryByText('Next Steps')).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders efficiently with many related actions', () => {
      const manyActions = Array.from({ length: 50 }, (_, i) => ({
        label: `Action ${i}`,
        onClick: jest.fn(),
      }));

      const startTime = performance.now();
      
      render(
        <SuccessNotification
          {...defaultProps}
          relatedActions={manyActions}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
      expect(screen.getByText('Related Actions')).toBeInTheDocument();
    });

    test('handles rapid prop changes', () => {
      const { rerender } = render(<SuccessNotification {...defaultProps} />);

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const levels = ['success', 'achievement', 'milestone'];
        const level = levels[i % levels.length];
        
        rerender(
          <SuccessNotification
            {...defaultProps}
            level={level}
          />
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes for achievements', () => {
      render(
        <SuccessNotification
          {...defaultProps}
          level={SUCCESS_LEVELS.ACHIEVEMENT}
        />
      );

      const notification = screen.getByRole('alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
      expect(notification).toHaveAttribute('role', 'alert');
    });

    test('supports keyboard navigation', () => {
      render(
        <SuccessNotification
          {...defaultProps}
          onShare={jest.fn()}
          onViewDetails={jest.fn()}
        />
      );

      const shareButton = screen.getByTitle('Share success');
      shareButton.focus();
      expect(shareButton).toHaveFocus();

      fireEvent.keyDown(shareButton, { key: 'Enter' });
      expect(screen.getByTitle('Share success')).toBeInTheDocument();
    });

    test('announces achievement points to screen readers', () => {
      render(
        <SuccessNotification
          {...defaultProps}
          achievement={{
            title: 'Test Achievement',
            description: 'Test description',
            points: 500,
          }}
        />
      );

      expect(screen.getByText('+500 points')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    test('updates when achievement data changes', () => {
      const { rerender } = render(<SuccessNotification {...defaultProps} />);

      expect(screen.getByText('Test Success')).toBeInTheDocument();

      const updatedProps = {
        ...defaultProps,
        achievement: {
          title: 'Updated Achievement',
          description: 'Updated description',
          points: 1000,
        },
      };

      rerender(<SuccessNotification {...updatedProps} />);

      expect(screen.getByText('Updated Achievement')).toBeInTheDocument();
      expect(screen.getByText('Updated description')).toBeInTheDocument();
      expect(screen.getByText('+1000 points')).toBeInTheDocument();
    });

    test('handles progress updates', () => {
      const { rerender } = render(<SuccessNotification {...defaultProps} />);

      expect(screen.getByText('3/5')).toBeInTheDocument();

      const updatedProps = {
        ...defaultProps,
        progress: { current: 5, total: 5, label: 'Tasks completed' },
      };

      rerender(<SuccessNotification {...updatedProps} />);

      expect(screen.getByText('5/5')).toBeInTheDocument();
      expect(screen.getByText('Tasks completed')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('integrates with analytics tracking', () => {
      const mockAnalytics = {
        trackAchievement: jest.fn(),
        trackSuccess: jest.fn(),
      };

      jest.doMock('../../services/analytics.js', () => ({
        analytics: mockAnalytics,
      }));

      render(
        <SuccessNotification
          {...defaultProps}
          achievement={{
            title: 'Test Achievement',
            description: 'Test description',
            points: 100,
          }}
          onTrack={mockAnalytics.trackAchievement}
        />
      );

      const trackButton = screen.getByText('Share Results');
      fireEvent.click(trackButton);

      expect(mockAnalytics.trackAchievement).toHaveBeenCalledWith(
        defaultProps.id,
        'achievement_unlocked',
        expect.objectContaining({
          title: 'Test Achievement',
          points: 100,
        })
      );
    });

    test('integrates with user preferences', () => {
      const mockUserPrefs = {
        showAchievements: true,
        celebrateAchievements: true,
      };

      jest.doMock('../../stores/userPreferences.js', () => ({
        getUserPreferences: () => mockUserPrefs,
      }));

      render(
        <SuccessNotification
          {...defaultProps}
          level={SUCCESS_LEVELS.ACHIEVEMENT}
        />
      );

      // Should show celebration animation when preferences allow it
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('celebration-animation');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid achievement data gracefully', () => {
      const invalidAchievement = {
        title: null,
        description: undefined,
        points: 'invalid',
      };

      expect(() => {
        render(
          <SuccessNotification
            {...defaultProps}
            achievement={invalidAchievement}
          />
        );
      }).not.toThrow();
    });

    test('handles invalid progress data gracefully', () => {
      const invalidProgress = {
        current: -1,
        total: 0,
        label: '',
      };

      expect(() => {
        render(
          <SuccessNotification
            {...defaultProps}
            progress={invalidProgress}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Localization', () => {
    test('formats dates correctly for different locales', () => {
      const date = new Date('2023-12-01T10:00:00Z');
      
      render(
        <SuccessNotification
          {...defaultProps}
          timestamp={date.toISOString()}
        />
      );

      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });

    test('handles RTL text direction', () => {
      // Mock RTL
      document.documentElement.dir = 'rtl';

      render(
        <SuccessNotification
          {...defaultProps}
          title="اختبار النجاح"
          message="هذا اختبار نجاح باللغة العربية"
        />
      );

      expect(screen.getByText('اختبار النجاح')).toBeInTheDocument();
      expect(screen.getByText('هذا اختبار نجاح باللغة العربية')).toBeInTheDocument();

      // Clean up
      document.documentElement.dir = 'ltr';
    });
  });

  describe('Component Lifecycle', () => {
    test('cleans up timers on unmount', () => {
      jest.useFakeTimers();
      
      const onClose = jest.fn();
      const { unmount } = render(
        <SuccessNotification
          {...defaultProps}
          autoClose={true}
          duration={1000}
          onClose={onClose}
        />
      );

      unmount();

      // Fast-forward time
      jest.advanceTimersByTime(2000);

      // onClose should not be called after unmount
      expect(onClose).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    test('removes event listeners on unmount', () => {
      const { unmount } = render(<SuccessNotification {...defaultProps} />);

      // Mock addEventListener
      const originalAddEventListener = document.addEventListener;
      const mockAddEventListener = jest.fn();
      document.addEventListener = mockAddEventListener;

      unmount();

      // Restore original
      document.addEventListener = originalAddEventListener;
    });
  });
});