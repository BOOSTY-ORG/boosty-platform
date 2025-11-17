import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import { investorsAPI } from '../../api/investors';

/**
 * BulkKYCModal component for performing bulk KYC operations
 */
const BulkKYCModal = ({ 
  isOpen, 
  onClose, 
  investorIds, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState('verify');
  const [reason, setReason] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [emailNotification, setEmailNotification] = useState(true);
  const [errors, setErrors] = useState({});
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setOperation('verify');
      setReason('');
      setEmailNotification(true);
      setSelectedDocumentType('');
      setExpiryDays('30');
      setErrors({});
    }
  }, [isOpen]);

  const handleOperationChange = (value) => {
    setOperation(value);
    setReason('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (operation === 'reject' && !reason.trim()) {
      newErrors.reason = 'Reason is required for rejection';
    }
    
    if (operation === 'request-documents' && !selectedDocumentType) {
      newErrors.documentType = 'Please select a document type';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      let response;
      
      switch (operation) {
        case 'verify':
          response = await investorsAPI.bulkVerifyKYC(investorIds, {
            emailNotification
          });
          break;
          
        case 'reject':
          response = await investorsAPI.bulkRejectKYC(investorIds, {
            reason,
            emailNotification
          });
          break;
          
        case 'request-documents':
          response = await investorsAPI.bulkRequestDocuments(investorIds, {
            documentType: selectedDocumentType,
            expiryDays: parseInt(expiryDays),
            emailNotification
          });
          break;
          
        case 'flag-review':
          response = await investorsAPI.bulkFlagForReview(investorIds, {
            reason,
            emailNotification
          });
          break;
          
        default:
          throw new Error('Invalid operation');
      }
      
      onSuccess && onSuccess({
        message: `Successfully completed ${operation} for ${investorIds.length} investor(s)`,
        operation,
        updatedCount: investorIds.length,
        response
      });
      
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || `Failed to ${operation} KYC`;
      setErrors({ general: errorMessage });
      onError && onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  const documentTypeOptions = [
    { value: 'identity-proof', label: 'Identity Proof (Passport, ID Card)' },
    { value: 'address-proof', label: 'Address Proof (Utility Bill, Bank Statement)' },
    { value: 'income-proof', label: 'Income Proof (Payslip, Tax Return)' },
    { value: 'bank-statement', label: 'Bank Statement' },
    { value: 'photo-verification', label: 'Photo Verification' },
    { value: 'signature', label: 'Signature' },
    { value: 'other', label: 'Other Document' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Bulk KYC Operations - ${investorIds.length} Investor${investorIds.length > 1 ? 's' : ''}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{errors.general}</div>
          </div>
        )}
        
        {/* Operation Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Operation
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="verify"
                checked={operation === 'verify'}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Verify KYC</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="reject"
                checked={operation === 'reject'}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Reject KYC</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="request-documents"
                checked={operation === 'request-documents'}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Request Additional Documents</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="flag-review"
                checked={operation === 'flag-review'}
                onChange={(e) => handleOperationChange(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Flag for Manual Review</span>
            </label>
          </div>
        </div>
        
        {/* Conditional Fields Based on Operation */}
        {operation === 'reject' && (
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason *
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>
        )}
        
        {operation === 'request-documents' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <select
                id="documentType"
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a document type</option>
                {documentTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.documentType && (
                <p className="mt-1 text-sm text-red-600">{errors.documentType}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-700 mb-1">
                Request Expiry (Days)
              </label>
              <select
                id="expiryDays"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
              </select>
            </div>
          </div>
        )}
        
        {operation === 'flag-review' && (
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Review Reason
            </label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for manual review..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        )}
        
        {/* Email Notification Option */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={emailNotification}
              onChange={(e) => setEmailNotification(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Send email notification to investors
            </span>
          </label>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Process ${investorIds.length} Investor${investorIds.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

BulkKYCModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  investorIds: PropTypes.array.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default BulkKYCModal;