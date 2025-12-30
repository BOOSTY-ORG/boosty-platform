import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { hasAccess, hasPermission, getAccessState, getLevelConfig } from './utils/accessConfig';
import { 
  LockClosedIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const AccessDenied = ({
  requiredLevel,
  currentLevel,
  showUpgradePrompt = true,
  onUpgradeRequest,
  customMessage,
  variant = 'default',
  responsive = true
}) => {
  const levelConfig = getLevelConfig(requiredLevel);
  const currentLevelConfig = getLevelConfig(currentLevel);

  const renderDefault = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-8 sm:px-3" role="alert" aria-live="polite">
      <div className="text-center max-w-md sm:max-w-sm">
        <LockClosedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4 sm:w-12 sm:h-12 sm:mb-3" aria-hidden="true" />
        <h3 className="text-lg font-medium text-gray-900 mb-2 sm:text-base sm:mb-1">
          Access Restricted
        </h3>
        <p className="text-sm text-gray-500 mb-4 sm:text-xs sm:mb-3">
          {customMessage || (
            <>
              This feature requires <span className="font-medium text-gray-900">{levelConfig.label}</span> level access.
              Your current level is <span className="font-medium text-gray-900">{currentLevelConfig.label}</span>.
            </>
          )}
        </p>
        
        {showUpgradePrompt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:p-3 sm:mb-3">
            <div className="flex items-start space-x-3 sm:space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 mt-0.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800 sm:text-xs">
                  Upgrade Your Access
                </h4>
                <p className="text-xs text-blue-700 mt-1 sm:text-xs">
                  Get access to this feature and more by upgrading your account.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {showUpgradePrompt && onUpgradeRequest && (
          <button
            onClick={onUpgradeRequest}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors sm:px-3 sm:py-1.5 sm:text-xs"
            aria-label="Request access upgrade"
          >
            <span className="sm:hidden md:inline">Request Access</span>
            <span className="md:hidden sm:inline">Request</span>
            <ArrowRightIcon className="w-4 h-4 ml-2 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          </button>
        )}
        {/* Screen reader announcement */}
        <span className="sr-only">
          Access restricted. Requires {levelConfig.label} level. Current level: {currentLevelConfig.label}.
        </span>
      </div>
    </div>
  );

  const renderCompact = () => (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg sm:p-2 sm:space-x-2" role="alert" aria-live="polite">
      <LockClosedIcon className="w-5 h-5 text-gray-400 flex-shrink-0 sm:w-4 sm:h-4" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm text-gray-700 sm:text-xs">
          Requires {levelConfig.label} access
        </p>
      </div>
      {showUpgradePrompt && onUpgradeRequest && (
        <button
          onClick={onUpgradeRequest}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded sm:text-xs"
          aria-label={`Request ${levelConfig.label} access`}
        >
          Request
        </button>
      )}
      {/* Screen reader announcement */}
      <span className="sr-only">
        Access restricted. Requires {levelConfig.label} access level.
      </span>
    </div>
  );

  const renderMinimal = () => (
    <div className="text-center py-8 sm:py-6" role="alert" aria-live="polite">
      <LockClosedIcon className="w-8 h-8 text-gray-300 mx-auto mb-2 sm:w-6 sm:h-6 sm:mb-1" aria-hidden="true" />
      <p className="text-xs text-gray-500 sm:text-xs">
        {levelConfig.label} access required
      </p>
      {/* Screen reader announcement */}
      <span className="sr-only">
        {levelConfig.label} access level required.
      </span>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'compact':
        return renderCompact();
      case 'minimal':
        return renderMinimal();
      default:
        return renderDefault();
    }
  };

  return (
    <div className={`access-denied ${responsive ? 'responsive' : ''}`}>
      {renderContent()}
    </div>
  );
};

const AccessGuard = memo(
  ({
    children,
    requiredLevel,
    requiredPermissions = [],
    userLevel,
    fallback = null,
    showUpgradePrompt = true,
    onAccessDenied,
    accessDeniedVariant = 'default',
    customMessage,
    responsive = true,
  }) => {
    // Check basic level access
    if (requiredLevel && !hasAccess(userLevel, requiredLevel)) {
      if (onAccessDenied) {
        onAccessDenied({ requiredLevel, userLevel });
      }

      return (
        fallback || (
          <div role="alert" aria-live="polite">
            <AccessDenied
              requiredLevel={requiredLevel}
              currentLevel={userLevel}
              showUpgradePrompt={showUpgradePrompt}
              onUpgradeRequest={onAccessDenied}
              customMessage={customMessage}
              variant={accessDeniedVariant}
            />
          </div>
        )
      );
    }

    // Check specific permissions
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        hasPermission(userLevel, permission)
      );

      if (!hasAllPermissions) {
        if (onAccessDenied) {
          onAccessDenied({ 
            requiredPermissions, 
            userLevel,
            type: 'permission' 
          });
        }

        return (
          fallback || (
            <div role="alert" aria-live="polite">
              <AccessDenied
                requiredLevel={userLevel}
                currentLevel={userLevel}
                showUpgradePrompt={showUpgradePrompt}
                onUpgradeRequest={onAccessDenied}
                customMessage="You don't have the required permissions for this feature."
                variant={accessDeniedVariant}
              />
            </div>
          )
        );
      }
    }

    // User has access, render children
    return (
      <div role="status" aria-live="polite">
        {children}
        {/* Screen reader announcement for successful access */}
        <span className="sr-only">
          Content is accessible with current permissions
        </span>
      </div>
    );
  }
);

AccessGuard.propTypes = {
  children: PropTypes.node.isRequired,
  requiredLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]),
  requiredPermissions: PropTypes.arrayOf(PropTypes.string),
  userLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  fallback: PropTypes.node,
  showUpgradePrompt: PropTypes.bool,
  onAccessDenied: PropTypes.func,
  accessDeniedVariant: PropTypes.oneOf(['default', 'compact', 'minimal']),
  customMessage: PropTypes.string,
  responsive: PropTypes.bool,
};

AccessDenied.propTypes = {
  requiredLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  currentLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  showUpgradePrompt: PropTypes.bool,
  onUpgradeRequest: PropTypes.func,
  customMessage: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'compact', 'minimal']),
  responsive: PropTypes.bool,
};

export default AccessGuard;