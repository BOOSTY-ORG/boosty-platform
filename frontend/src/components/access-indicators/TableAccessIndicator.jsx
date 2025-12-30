import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { hasPermission, getPermissionState, getLevelConfig } from './utils/accessConfig';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const TableAccessIndicator = memo(
  ({
    rowId,
    entityType,
    permissions,
    userLevel,
    ownerLevel,
    variant = 'column',
    className = '',
    onView,
    onEdit,
    onDelete,
    onExport,
    ...props
  }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const getPermissionIcon = (permission) => {
      if (!permissions[permission]) {
        return <LockClosedIcon className="w-4 h-4 text-red-500" />;
      }
      
      const permissionKey = `${entityType}_${permission}`;
      const hasPermissionAccess = hasPermission(userLevel, permissionKey);
      
      if (hasPermissionAccess) {
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      } else {
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      }
    };

    const getPermissionTooltip = (permission) => {
      if (!permissions[permission]) {
        return 'Permission not available for this item';
      }
      
      const permissionKey = `${entityType}_${permission}`;
      const hasPermissionAccess = hasPermission(userLevel, permissionKey);
      
      if (hasPermissionAccess) {
        return `You can ${permission} this ${entityType}`;
      } else {
        return `Requires higher privileges to ${permission} this ${entityType}`;
      }
    };

    const renderColumn = () => (
      <div className={`flex items-center space-x-2 ${className}`} role="status" aria-live="polite">
        <div className="flex space-x-1">
          {permissions.canView && (
            <div className="relative group">
              <div
                className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 rounded p-0.5"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Toggle tooltip visibility on keyboard interaction
                    const tooltip = e.currentTarget.querySelector('[role="tooltip"]');
                    if (tooltip) {
                      tooltip.classList.toggle('opacity-100');
                      setTimeout(() => {
                        tooltip.classList.remove('opacity-100');
                      }, 2000);
                    }
                  }
                }}
              >
                {getPermissionIcon('canView')}
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none" role="tooltip">
                {getPermissionTooltip('canView')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
          
          {permissions.canEdit && (
            <div className="relative group">
              <div
                className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 rounded p-0.5"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const tooltip = e.currentTarget.querySelector('[role="tooltip"]');
                    if (tooltip) {
                      tooltip.classList.toggle('opacity-100');
                      setTimeout(() => {
                        tooltip.classList.remove('opacity-100');
                      }, 2000);
                    }
                  }
                }}
              >
                {getPermissionIcon('canEdit')}
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none" role="tooltip">
                {getPermissionTooltip('canEdit')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
          
          {permissions.canDelete && (
            <div className="relative group">
              <div
                className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 rounded p-0.5"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const tooltip = e.currentTarget.querySelector('[role="tooltip"]');
                    if (tooltip) {
                      tooltip.classList.toggle('opacity-100');
                      setTimeout(() => {
                        tooltip.classList.remove('opacity-100');
                      }, 2000);
                    }
                  }
                }}
              >
                {getPermissionIcon('canDelete')}
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none" role="tooltip">
                {getPermissionTooltip('canDelete')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
          
          {permissions.canExport && (
            <div className="relative group">
              <div
                className="focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 rounded p-0.5"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const tooltip = e.currentTarget.querySelector('[role="tooltip"]');
                    if (tooltip) {
                      tooltip.classList.toggle('opacity-100');
                      setTimeout(() => {
                        tooltip.classList.remove('opacity-100');
                      }, 2000);
                    }
                  }
                }}
              >
                {getPermissionIcon('canExport')}
              </div>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none" role="tooltip">
                {getPermissionTooltip('canExport')}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          )}
        </div>
        {/* Screen reader announcement */}
        <span className="sr-only">
          Permissions for this {entityType}:
          {permissions.canView ? 'view' : 'no view'}
          {permissions.canEdit ? ', edit' : ''}
          {permissions.canDelete ? ', delete' : ''}
          {permissions.canExport ? ', export' : ''}
        </span>
      </div>
    );

    const renderOverlay = () => (
      <div className={`relative ${className}`} role="status" aria-live="polite">
        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center rounded-md border border-gray-200 z-10 sm:bg-opacity-90">
          <div className="text-center p-3 sm:p-2">
            <div className="flex justify-center space-x-2 mb-2 sm:mb-1 sm:space-x-1">
              {permissions.canView && (
                <button
                  onClick={() => onView && onView(rowId)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-blue-500 sm:p-1.5"
                  title="View"
                  aria-label={`View ${entityType} details`}
                >
                  <EyeIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {permissions.canEdit && (
                <button
                  onClick={() => onEdit && onEdit(rowId)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-green-500 sm:p-1.5"
                  title="Edit"
                  aria-label={`Edit ${entityType}`}
                >
                  <PencilIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {permissions.canDelete && (
                <button
                  onClick={() => onDelete && onDelete(rowId)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-red-500 sm:p-1.5"
                  title="Delete"
                  aria-label={`Delete ${entityType}`}
                >
                  <TrashIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {permissions.canExport && (
                <button
                  onClick={() => onExport && onExport(rowId)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-purple-500 sm:p-1.5"
                  title="Export"
                  aria-label={`Export ${entityType}`}
                >
                  <ArrowDownTrayIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
           
            {!Object.values(permissions).some(p => p) && (
              <p className="text-xs text-gray-500">No actions available</p>
            )}
            {/* Screen reader announcement */}
            <span className="sr-only">
              {Object.values(permissions).some(p => p)
                ? `Available actions for this ${entityType}: ${
                    Object.entries(permissions)
                      .filter(([_, hasPermission]) => hasPermission)
                      .map(([permission]) => permission.replace('can', '').toLowerCase())
                      .join(', ')
                  }`
                : `No actions available for this ${entityType}`
              }
            </span>
          </div>
        </div>
      </div>
    );

    const renderDropdown = () => (
      <div className={`relative ${className}`} role="status" aria-live="polite">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white focus:ring-gray-500 sm:p-0.5"
          title="Actions"
          aria-label={`Actions for ${entityType}`}
          aria-expanded={showDropdown}
          aria-haspopup="true"
        >
          <EllipsisVerticalIcon className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 z-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 sm:w-44" role="menu">
            {permissions.canView && (
              <button
                onClick={() => {
                  onView && onView(rowId);
                  setShowDropdown(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 sm:px-3 sm:py-1.5"
                role="menuitem"
              >
                <EyeIcon className="w-4 h-4 mr-2 text-blue-500 sm:w-3.5 sm:h-3.5" />
                <span className="sm:hidden md:inline">View Details</span>
                <span className="md:hidden sm:inline">View</span>
              </button>
            )}
           
            {permissions.canEdit && (
              <button
                onClick={() => {
                  onEdit && onEdit(rowId);
                  setShowDropdown(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 sm:px-3 sm:py-1.5"
                role="menuitem"
              >
                <PencilIcon className="w-4 h-4 mr-2 text-green-500 sm:w-3.5 sm:h-3.5" />
                Edit
              </button>
            )}
           
            {permissions.canDelete && (
              <button
                onClick={() => {
                  onDelete && onDelete(rowId);
                  setShowDropdown(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 sm:px-3 sm:py-1.5"
                role="menuitem"
              >
                <TrashIcon className="w-4 h-4 mr-2 text-red-500 sm:w-3.5 sm:h-3.5" />
                Delete
              </button>
            )}
           
            {permissions.canExport && (
              <button
                onClick={() => {
                  onExport && onExport(rowId);
                  setShowDropdown(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:bg-gray-100 sm:px-3 sm:py-1.5"
                role="menuitem"
              >
                <ArrowDownTrayIcon className="w-4 h-4 mr-2 text-purple-500 sm:w-3.5 sm:h-3.5" />
                Export
              </button>
            )}
           
            {!Object.values(permissions).some(p => p) && (
              <div className="px-4 py-2 text-sm text-gray-500 sm:px-3 sm:py-1.5" role="menuitem">
                No actions available
              </div>
            )}
          </div>
        )}
        {/* Screen reader announcement */}
        <span className="sr-only">
          {showDropdown ? 'Actions menu opened' : 'Actions menu closed'}
        </span>
      </div>
    );

    const renderContent = () => {
      switch (variant) {
        case 'column':
          return renderColumn();
        case 'overlay':
          return renderOverlay();
        case 'dropdown':
          return renderDropdown();
        default:
          return renderColumn();
      }
    };

    return (
      <div className="table-access-indicator" {...props}>
        {renderContent()}
        {/* Screen reader announcement for overall access state */}
        <span className="sr-only" aria-live="polite">
          {Object.values(permissions).some(p => p)
            ? `Some actions are available for this ${entityType}`
            : `No actions are available for this ${entityType}`
          }
        </span>
      </div>
    );
  }
);

TableAccessIndicator.propTypes = {
  rowId: PropTypes.string.isRequired,
  entityType: PropTypes.oneOf(['user', 'investor', 'transaction', 'report']).isRequired,
  permissions: PropTypes.shape({
    canView: PropTypes.bool,
    canEdit: PropTypes.bool,
    canDelete: PropTypes.bool,
    canExport: PropTypes.bool,
  }).isRequired,
  userLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]).isRequired,
  ownerLevel: PropTypes.oneOf([
    'platinum',
    'gold',
    'silver',
    'bronze',
    'investor',
    'standard',
  ]),
  variant: PropTypes.oneOf(['column', 'overlay', 'dropdown']),
  className: PropTypes.string,
  onView: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onExport: PropTypes.func,
};

export default TableAccessIndicator;