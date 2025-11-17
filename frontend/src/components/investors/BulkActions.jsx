import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * BulkActions component for performing operations on selected investors
 */
const BulkActions = ({ 
  selectedInvestors, 
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

  if (selectedInvestors.length === 0) {
    return null;
  }

  const handleAction = (action) => {
    setShowActionMenu(false);
    
    switch (action) {
      case 'edit':
        onBulkEdit && onBulkEdit(selectedInvestors);
        break;
      case 'kyc':
        onBulkKYC && onBulkKYC(selectedInvestors);
        break;
      case 'communicate':
        onBulkCommunication && onBulkCommunication(selectedInvestors);
        break;
      case 'export':
        onBulkExport && onBulkExport(selectedInvestors);
        break;
      case 'verify':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedInvestors, 'verified');
        break;
      case 'reject':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedInvestors, 'rejected');
        break;
      case 'pending':
        onBulkStatusUpdate && onBulkStatusUpdate(selectedInvestors, 'pending');
        break;
      case 'assign':
        onBulkAssign && onBulkAssign(selectedInvestors);
        break;
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${selectedInvestors.length} investor(s)? This action cannot be undone.`)) {
          onBulkDelete && onBulkDelete(selectedInvestors);
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
            {selectedInvestors.length} investor{selectedInvestors.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleAction('verify')}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verify
          </button>
          
          <button
            type="button"
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => handleAction('reject')}
          >
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Reject
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
                    Edit Investors
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
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    role="menuitem"
                    onClick={() => handleAction('delete')}
                  >
                    Delete Investors
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
  selectedInvestors: PropTypes.array.isRequired,
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