import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { hasAccess, getAccessState, getLevelConfig } from './utils/accessConfig';
import { 
  LockClosedIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const FormFieldAccessIndicator = memo(
  ({
    fieldName,
    fieldType,
    isEditable = true,
    requiredLevel,
    userLevel,
    variant = 'inline',
    reason,
    className = '',
    children,
    ...props
  }) => {
    const hasFieldAccess = hasAccess(userLevel, requiredLevel);
    const accessState = getAccessState(userLevel, requiredLevel);
    const canEdit = hasFieldAccess && isEditable;
    const levelConfig = getLevelConfig(requiredLevel);

    const renderInline = () => (
      <div className={`relative ${className}`} {...props}>
        {children}
        {!canEdit && (
          <div className="ml-2 inline-flex items-center group">
            <ExclamationTriangleIcon
              className="w-4 h-4 text-yellow-500 cursor-help"
              aria-label={`Field restricted: ${reason || `Requires ${levelConfig.label} access`}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  // Show tooltip logic here if needed
                }
              }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
              {reason || `Requires ${levelConfig.label} access to edit`}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    );

    const renderTooltip = () => (
      <div className={`relative ${className}`} {...props}>
        {children}
        {!canEdit && (
          <div className="absolute -top-8 left-0 flex items-center">
            <InformationCircleIcon className="w-4 h-4 text-gray-400 mr-1" />
            <span className="text-xs text-gray-600">
              {reason || `${levelConfig.label} required`}
            </span>
          </div>
        )}
      </div>
    );

    const renderBanner = () => (
      <div className={`space-y-2 ${className}`} {...props}>
        {!canEdit && (
          <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <LockClosedIcon className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">
                {fieldName} Field Restricted
              </p>
              <p className="text-yellow-700 mt-1">
                {reason || `This field requires ${levelConfig.label} access level to edit.`}
              </p>
            </div>
          </div>
        )}
        <div className={!canEdit ? 'opacity-60 pointer-events-none' : ''}>
          {children}
        </div>
      </div>
    );

    const renderContent = () => {
      switch (variant) {
        case 'tooltip':
          return renderTooltip();
        case 'banner':
          return renderBanner();
        case 'inline':
        default:
          return renderInline();
      }
    };

    return (
      <div 
        className="form-field-access-indicator" 
        role="group"
        aria-describedby={!canEdit ? 'field-restriction' : undefined}
      >
        {renderContent()}
        
        {/* Screen reader announcement for field restriction */}
        {!canEdit && (
          <span id="field-restriction" className="sr-only">
            {fieldName} field is restricted. {reason || `Requires ${levelConfig.label} access level to edit.`}
          </span>
        )}
      </div>
    );
  }
);

FormFieldAccessIndicator.propTypes = {
  fieldName: PropTypes.string.isRequired,
  fieldType: PropTypes.oneOf(['text', 'textarea', 'select', 'checkbox', 'radio']).isRequired,
  isEditable: PropTypes.bool,
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
  variant: PropTypes.oneOf(['inline', 'tooltip', 'banner']),
  reason: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default FormFieldAccessIndicator;