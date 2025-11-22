import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * BulkActions component for performing operations on selected users
 */
const BulkActions = ({ 
  selectedUsers, 
  onBulkEdit, 
  onBulkKYC, 
  onBulkCommunication, 
  onBulkExport,
  onBulkStatusUpdate,
  onBulkAssign,
  onBulkDelete,
  onClearSelection 
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false);

  if (selectedUsers.length === 0) {
    return null;
  }

  const handleAction = (action) => {
    setShowActionMenu(false);
    
    switch (action) {
      case 'edit':
        onBulkEdit && onBulkEdit(selectedUsers);
        break;
      case 'kyc':
        onBulkKYC && onBulkKYC(selectedUsers);
        break;
      case 'communicate':
        onBulkCommunication && onBulkCommunication(selectedUsers);
        break;
      case 'export':
        onBulkExport && onBulkExport(selectedUsers);
        break;
      case 'activate':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedUsers, 'active');
        break;
      case 'deactivate':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedUsers, 'inactive');
        break;
      case 'suspend':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedUsers, 'suspended');
        break;
      case 'assign':
        onBulkAssign && onBulkAssign(selectedUsers);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`)) {
          onBulkDelete && onBulkDelete(selectedUsers);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 1h6v4H7V6zm6 6H7v2h6v-2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-blue-900">
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleAction('activate')}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Activate
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleAction('deactivate')}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Deactivate
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleAction('export')}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export
          </button>
          
          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowActionMenu(!showActionMenu)}
            >
              More
              <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showActionMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('edit')}
                  >
                    Edit Users
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('kyc')}
                  >
                    KYC Operations
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('communicate')}
                  >
                    Send Communication
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('assign')}
                  >
                    Assign to Team
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('suspend')}
                  >
                    Suspend Users
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('delete')}
                  >
                    Delete Users
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Clear Selection */}
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={onClearSelection}
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
};

BulkActions.propTypes = {
  selectedUsers: PropTypes.array.isRequired,
  onBulkEdit: PropTypes.func,
  onBulkKYC: PropTypes.func,
  onBulkCommunication: PropTypes.func,
  onBulkExport: PropTypes.func,
  onBulkStatusUpdate: PropTypes.func,
  onBulkAssign: PropTypes.func,
  onBulkDelete: PropTypes.func,
  onClearSelection: PropTypes.func.isRequired,
};

export default BulkActions;