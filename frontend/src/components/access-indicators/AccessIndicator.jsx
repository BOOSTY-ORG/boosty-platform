import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { getLevelConfig, getStateConfig } from './utils/accessConfig';

const AccessIndicator = memo(
  ({
    level,
    state = 'available',
    size = 'md',
    showLabel = true,
    showIcon = true,
    showStateIcon = true,
    tooltip,
    className = '',
    animated = false,
    responsive = true,
    ...props
  }) => {
    const levelConfig = getLevelConfig(level);
    const stateConfig = getStateConfig(state);
    const LevelIcon = levelConfig.icon;
    const StateIcon = stateConfig.icon;

    const sizeClasses = {
      xs: {
        container: 'w-4 h-4 text-xs',
        stateIcon: 'w-1.5 h-1.5',
        label: 'text-xs',
      },
      sm: {
        container: 'w-5 h-5 text-xs',
        stateIcon: 'w-2 h-2',
        label: 'text-xs',
      },
      md: {
        container: 'w-6 h-6 text-xs',
        stateIcon: 'w-2.5 h-2.5',
        label: 'text-xs',
      },
      lg: {
        container: 'w-8 h-8 text-sm',
        stateIcon: 'w-3 h-3',
        label: 'text-sm',
      },
    };

    const currentSize = sizeClasses[size] || sizeClasses.md;

    const accessibilityProps = {
      role: 'img',
      'aria-label': `${levelConfig.label} access level - ${stateConfig.label}`,
      'aria-describedby': tooltip ? 'access-tooltip' : undefined,
      tabIndex: tooltip ? 0 : undefined,
      onKeyDown: tooltip ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Show tooltip on keyboard interaction
          const tooltipEl = document.getElementById('access-tooltip');
          if (tooltipEl) {
            tooltipEl.classList.toggle('opacity-100');
            setTimeout(() => {
              tooltipEl.classList.remove('opacity-100');
            }, 2000);
          }
        }
      } : undefined,
    };

    return (
      <div
        className={`inline-flex items-center space-x-2 ${className}`}
        {...props}
      >
        <div className="relative inline-flex items-center justify-center group">
          <div
            className={`
              relative inline-flex items-center justify-center
              ${currentSize.container}
              rounded-full
              ${levelConfig.bgColor}
              ${levelConfig.borderColor}
              border
              transition-all duration-200
              hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500
              ${animated ? 'animate-pulse' : ''}
              sm:hover:scale-110
              md:hover:scale-105
              lg:hover:scale-105
            `}
            {...accessibilityProps}
          >
            {showIcon && (
              <LevelIcon
                className={`w-3/5 h-3/5 ${levelConfig.textColor}`}
                aria-hidden="true"
              />
            )}
          </div>

          {showStateIcon && (
            <div
              className={`
                absolute -bottom-0.5 -right-0.5
                ${currentSize.stateIcon}
                rounded-full
                ${stateConfig.bgColor}
                ${stateConfig.borderColor}
                border border-white
                transition-all duration-200
              `}
              aria-hidden="true"
            >
              <StateIcon
                className={`w-full h-full ${stateConfig.textColor}`}
              />
            </div>
          )}

          {/* Tooltip */}
          {tooltip && (
            <div
              id="access-tooltip"
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none"
              role="tooltip"
              aria-hidden="true"
            >
              {tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </div>

        {showLabel && (
          <span
            className={`${currentSize.label} ${levelConfig.textColor} font-medium sm:hidden md:inline`}
          >
            {levelConfig.label}
          </span>
        )}
        
        {/* Screen reader only text for additional context */}
        <span className="sr-only">
          {levelConfig.label} access level with {stateConfig.label} state
        </span>
      </div>
    );
  }
);

AccessIndicator.propTypes = {
  level: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  state: PropTypes.oneOf(['available', 'limited', 'restricted', 'hidden']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  showIcon: PropTypes.bool,
  showStateIcon: PropTypes.bool,
  tooltip: PropTypes.string,
  className: PropTypes.string,
  animated: PropTypes.bool,
  responsive: PropTypes.bool,
};

export default AccessIndicator;