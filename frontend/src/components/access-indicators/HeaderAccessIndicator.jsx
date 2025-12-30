import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { hasAccess, getAccessState, getLevelConfig } from './utils/accessConfig';
import AccessIndicator from './AccessIndicator';
import { 
  InformationCircleIcon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const HeaderAccessIndicator = memo(
  ({
    title,
    requiredLevel,
    userLevel,
    description,
    variant = 'compact',
    showActions = true,
    onUpgradeRequest,
    onLearnMore,
    className = '',
    ...props
  }) => {
    const [showDetails, setShowDetails] = useState(false);
    const isAccessible = hasAccess(userLevel, requiredLevel);
    const accessState = getAccessState(userLevel, requiredLevel);
    const levelConfig = getLevelConfig(requiredLevel);

    const renderBanner = () => (
      <div className={`
        bg-gradient-to-r ${levelConfig.gradient} 
        border-l-4 ${levelConfig.borderColor.replace('border-', 'border-l-')}
        p-4 rounded-lg shadow-sm
        ${className}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AccessIndicator
              level={requiredLevel}
              state={accessState}
              size="lg"
              showLabel={true}
              className="flex-shrink-0"
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-gray-600 mb-2">{description}</p>
              )}
              {!isAccessible && (
                <p className="text-sm text-red-600">
                  This section requires {levelConfig.label} level access.
                </p>
              )}
            </div>
          </div>
          
          {showActions && !isAccessible && (
            <div className="flex space-x-2 ml-4">
              <button
                onClick={onLearnMore}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <InformationCircleIcon className="w-4 h-4 mr-1" />
                Learn More
              </button>
              {onUpgradeRequest && (
                <button
                  onClick={onUpgradeRequest}
                  className="flex items-center text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Request Access
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );

    const renderCompact = () => (
      <div className={`
        flex items-center justify-between
        p-3 rounded-lg border ${levelConfig.borderColor}
        bg-white
        ${className}
      `}>
        <div className="flex items-center space-x-3">
          <h3 className="text-base font-medium text-gray-900">{title}</h3>
          <AccessIndicator
            level={requiredLevel}
            state={accessState}
            size="sm"
            showLabel={false}
            tooltip={`${levelConfig.label} access required`}
          />
        </div>
        
        {!isAccessible && (
          <div className="flex items-center text-sm text-red-600">
            <LockClosedIcon className="w-4 h-4 mr-1" />
            Restricted
          </div>
        )}
      </div>
    );

    const renderMinimal = () => (
      <div className={`
        flex items-center space-x-2
        ${className}
      `}>
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
        <AccessIndicator
          level={requiredLevel}
          state={accessState}
          size="sm"
          showLabel={false}
          tooltip={`${levelConfig.label} access required`}
        />
      </div>
    );

    const renderContent = () => {
      switch (variant) {
        case 'banner':
          return renderBanner();
        case 'compact':
          return renderCompact();
        case 'minimal':
          return renderMinimal();
        default:
          return renderCompact();
      }
    };

    return (
      <div className="header-access-indicator" {...props}>
        {renderContent()}
        
        {showDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black opacity-25" onClick={() => setShowDetails(false)}></div>
              
              <div className="relative bg-white rounded-lg max-w-md w-full p-6">
                <button
                  onClick={() => setShowDetails(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                
                <div className="flex items-center space-x-3 mb-4">
                  <AccessIndicator
                    level={requiredLevel}
                    state={accessState}
                    size="lg"
                    showLabel={true}
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {levelConfig.label} Access Required
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your current level: {getLevelConfig(userLevel).label}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    {levelConfig.description}
                  </p>
                  
                  {description && (
                    <p className="text-sm text-gray-600">{description}</p>
                  )}
                  
                  <div className="flex space-x-3 pt-3">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    {onUpgradeRequest && (
                      <button
                        onClick={() => {
                          onUpgradeRequest();
                          setShowDetails(false);
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Request Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

HeaderAccessIndicator.propTypes = {
  title: PropTypes.string.isRequired,
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
  description: PropTypes.string,
  variant: PropTypes.oneOf(['banner', 'compact', 'minimal']),
  showActions: PropTypes.bool,
  onUpgradeRequest: PropTypes.func,
  onLearnMore: PropTypes.func,
  className: PropTypes.string,
};

export default HeaderAccessIndicator;