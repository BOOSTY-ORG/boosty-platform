import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { hasPermission, getPermissionState, getLevelConfig } from './utils/accessConfig';
import { 
  ExclamationTriangleIcon, 
  LockClosedIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const ActionAccessIndicator = memo(
  ({
    permission,
    userLevel,
    action,
    variant = 'badge',
    showUpgradePrompt = false,
    onUpgradeRequest,
    className = '',
    disabled = false,
    children,
    fallback,
    ...props
  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const hasPermissionAccess = hasPermission(userLevel, permission);
    const permissionState = getPermissionState(userLevel, permission);

    const renderBadge = () => (
      <span
        className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          sm:px-1 sm:py-0.5
          ${hasPermissionAccess
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
          }
          ${className}
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="status"
        aria-live="polite"
      >
        {hasPermissionAccess ? (
          <>
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="sm:hidden md:inline">Allowed</span>
            <span className="md:hidden sm:inline">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          </>
        ) : (
          <>
            <LockClosedIcon className="w-3 h-3 mr-1" aria-hidden="true" />
            <span className="sm:hidden md:inline">Restricted</span>
            <span className="md:hidden sm:inline">
              <LockClosedIcon className="w-3 h-3" aria-hidden="true" />
            </span>
          </>
        )}
        {/* Screen reader announcement */}
        <span className="sr-only">
          {hasPermissionAccess
            ? `Permission granted for ${action}`
            : `Permission denied for ${action}. Requires higher privileges.`
          }
        </span>
      </span>
    );

    const renderOverlay = () => (
      <div className={`relative ${className}`} role="status" aria-live="polite">
        {children}
        {!hasPermissionAccess && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-md border border-gray-200 sm:bg-opacity-90">
            <div className="text-center p-3 sm:p-2">
              <LockClosedIcon className="w-6 h-6 text-gray-400 mx-auto mb-2 sm:w-5 sm:h-5 sm:mb-1" aria-hidden="true" />
              <p className="text-xs text-gray-600 mb-2 sm:mb-1">Access Restricted</p>
              {showUpgradePrompt && (
                <button
                  onClick={onUpgradeRequest}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 sm:px-2 sm:py-0.5"
                  aria-label={`Request access to ${action}`}
                >
                  <span className="sm:hidden md:inline">Request Access</span>
                  <span className="md:hidden sm:inline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </span>
                </button>
              )}
              {/* Screen reader announcement */}
              <span className="sr-only">
                This action is restricted. Your current level: {getLevelConfig(userLevel).label}
              </span>
            </div>
          </div>
        )}
      </div>
    );

    const renderInline = () => (
      <div className={`inline-flex items-center ${className}`} role="status" aria-live="polite">
        {children}
        {!hasPermissionAccess && (
          <div className="ml-2 relative group">
            <ExclamationTriangleIcon
              className="w-4 h-4 text-yellow-500 cursor-help focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-yellow-500 rounded"
              aria-label="Access restricted"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Toggle tooltip visibility on keyboard interaction
                  const tooltip = e.currentTarget.nextElementSibling;
                  if (tooltip) {
                    tooltip.classList.toggle('opacity-100');
                  }
                }
              }}
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none" role="tooltip">
              This action requires higher privileges
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
            {/* Screen reader announcement */}
            <span className="sr-only">
              This action requires higher privileges. Your current level: {getLevelConfig(userLevel).label}
            </span>
          </div>
        )}
      </div>
    );

    const getTooltipContent = () => {
      if (hasPermissionAccess) {
        return `You have permission to ${action}`;
      }
      return `This action requires higher privileges. Your current level: ${getLevelConfig(userLevel).label}`;
    };

    const renderContent = () => {
      switch (variant) {
        case 'badge':
          return renderBadge();
        case 'overlay':
          return renderOverlay();
        case 'inline':
          return renderInline();
        case 'button':
          return hasPermissionAccess ? children : (fallback || renderBadge());
        default:
          return renderBadge();
      }
    };

    return (
      <div className="action-access-indicator" {...props} role="status" aria-live="polite">
        {renderContent()}
        
        {showTooltip && (
          <div className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500" role="tooltip">
            {getTooltipContent()}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    );
  }
);

ActionAccessIndicator.propTypes = {
  permission: PropTypes.string.isRequired,
  userLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  action: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['badge', 'overlay', 'inline', 'button']),
  showUpgradePrompt: PropTypes.bool,
  onUpgradeRequest: PropTypes.func,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node,
  fallback: PropTypes.node,
};

export default ActionAccessIndicator;