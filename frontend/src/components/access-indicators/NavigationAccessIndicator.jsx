import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { hasAccess, getAccessState, getLevelConfig } from './utils/accessConfig';
import AccessIndicator from './AccessIndicator';

const NavigationAccessIndicator = memo(
  ({
    requiredLevel,
    userLevel,
    showLabel = false,
    size = 'sm',
    className = '',
    disabled = false,
    responsive = true,
    ...props
  }) => {
    const isAccessible = hasAccess(userLevel, requiredLevel);
    const accessState = getAccessState(userLevel, requiredLevel);
    const levelConfig = getLevelConfig(requiredLevel);

    // Generate tooltip based on access state
    const getTooltip = () => {
      if (isAccessible) {
        return `You have access to this feature (${levelConfig.label} level)`;
      }
      return `Requires ${levelConfig.label} level access. Your current level: ${getLevelConfig(userLevel).label}`;
    };

    return (
      <div
        className={`nav-access-indicator ${className}`}
        {...props}
        role="status"
        aria-live="polite"
      >
        <AccessIndicator
          level={requiredLevel}
          state={accessState}
          size={size}
          showLabel={showLabel}
          showStateIcon={true}
          tooltip={getTooltip()}
          responsive={true}
          className={`
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-help'}
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 rounded-full
          `}
        />
        
        {/* Screen reader announcement for navigation access state */}
        <span className="sr-only" aria-live="polite">
          {isAccessible
            ? `Accessible with ${getLevelConfig(userLevel).label} level`
            : `Requires ${levelConfig.label} level access. Current level: ${getLevelConfig(userLevel).label}`
          }
        </span>
      </div>
    );
  }
);

NavigationAccessIndicator.propTypes = {
  requiredLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  userLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  responsive: PropTypes.bool,
};

export default NavigationAccessIndicator;