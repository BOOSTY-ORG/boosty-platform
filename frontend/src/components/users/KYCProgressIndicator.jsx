import React, { useState } from 'react';
import { formatStatus } from '../../utils/formatters.js';

const KYCProgressIndicator = ({
  kycDocuments = [],
  overallProgress = 0,
  showDetails = true,
  compact = false,
  onDocumentAction,
  interactive = false
}) => {
  const [expandedDocument, setExpandedDocument] = useState(null);
  
  // Calculate completion percentage based on document statuses
  const calculateProgress = () => {
    if (kycDocuments.length === 0) return 0;
    
    const verifiedCount = kycDocuments.filter(doc => doc.verificationStatus === 'verified').length;
    const totalCount = kycDocuments.length;
    
    return Math.round((verifiedCount / totalCount) * 100);
  };

  const progress = overallProgress || calculateProgress();
  
  // Get status color based on progress
  const getProgressColor = () => {
    if (progress >= 90) return 'bg-green-600';
    if (progress >= 70) return 'bg-yellow-600';
    if (progress >= 40) return 'bg-orange-600';
    return 'bg-red-600';
  };

  // Get status text based on progress
  const getStatusText = () => {
    if (progress === 100) return 'Complete';
    if (progress >= 90) return 'Nearly Complete';
    if (progress >= 70) return 'In Progress';
    if (progress >= 40) return 'Partially Complete';
    if (progress > 0) return 'Started';
    return 'Not Started';
  };

  // Get required document types and their completion status
  const getDocumentStatus = () => {
    const requiredTypes = [
      { type: 'government_id', label: 'Government ID', icon: '🆔' },
      { type: 'utility_bill', label: 'Utility Bill', icon: '📄' },
      { type: 'bank_statement', label: 'Bank Statement', icon: '🏦' },
      { type: 'proof_of_income', label: 'Proof of Income', icon: '💰' },
      { type: 'property_document', label: 'Property Document', icon: '🏠' }
    ];
    
    return requiredTypes.map(({ type, label, icon }) => {
      const document = kycDocuments.find(doc => doc.documentType === type);
      return {
        type,
        label,
        icon,
        status: document ? document.verificationStatus : 'missing',
        document,
        isRequired: true
      };
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'missing':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'pending':
      case 'under_review':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'missing':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleDocumentAction = (action, documentType, document) => {
    if (onDocumentAction) {
      onDocumentAction(action, documentType, document);
    }
  };

  const toggleDocumentExpanded = (type) => {
    setExpandedDocument(expandedDocument === type ? null : type);
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">KYC Progress</span>
            <span className="text-xs font-medium text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${getProgressColor()} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
          progress === 100 ? 'verified' : progress > 0 ? 'under_review' : 'missing'
        )}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">KYC Verification Progress</h3>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(
          progress === 100 ? 'verified' : progress > 0 ? 'under_review' : 'missing'
        )}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Completion</span>
          <span className="text-sm font-bold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${getProgressColor()} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Document Status Details */}
      {showDetails && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Document Status</h4>
          <div className="grid grid-cols-1 gap-2">
            {getDocumentStatus().map((item) => (
              <div key={item.type} className={`border rounded-lg p-3 ${
                item.status === 'verified' ? 'border-green-200 bg-green-50' :
                item.status === 'pending' || item.status === 'under_review' ? 'border-yellow-200 bg-yellow-50' :
                item.status === 'rejected' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.document ? `Uploaded ${new Date(item.document.uploadedAt).toLocaleDateString()}` : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                      {formatStatus(item.status)}
                    </span>
                  </div>
                </div>
                
                {/* Document Details (Expandable) */}
                {item.document && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-gray-700">Document Details</h5>
                      <button
                        onClick={() => toggleDocumentExpanded(item.type)}
                        className="text-xs text-primary-600 hover:text-primary-800"
                      >
                        {expandedDocument === item.type ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                    
                    {expandedDocument === item.type && (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">File Name:</span>
                          <span className="text-gray-900">{item.document.fileName || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">File Size:</span>
                          <span className="text-gray-900">{item.document.fileSize ? `${(item.document.fileSize / 1024).toFixed(1)} KB` : 'N/A'}</span>
                        </div>
                        {item.document.verificationScore && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Verification Score:</span>
                            <span className={`font-medium ${
                              item.document.verificationScore >= 90 ? 'text-green-600' :
                              item.document.verificationScore >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {item.document.verificationScore}%
                            </span>
                          </div>
                        )}
                        {item.document.expiryDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Expiry Date:</span>
                            <span className={`font-medium ${
                              item.document.isExpired ? 'text-red-600' :
                              item.document.daysUntilExpiry <= 30 ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {new Date(item.document.expiryDate).toLocaleDateString()}
                              {item.document.isExpired && ' (Expired)'}
                              {!item.document.isExpired && item.document.daysUntilExpiry <= 30 && ` (${item.document.daysUntilExpiry} days)`}
                            </span>
                          </div>
                        )}
                        {item.document.rejectionReason && (
                          <div>
                            <span className="text-gray-500">Rejection Reason:</span>
                            <p className="text-red-600 mt-1">{item.document.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action Buttons */}
                {interactive && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex space-x-2">
                    {item.status === 'missing' && (
                      <button
                        onClick={() => handleDocumentAction('upload', item.type)}
                        className="flex-1 inline-flex justify-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Upload
                      </button>
                    )}
                    
                    {item.document && (
                      <>
                        <button
                          onClick={() => handleDocumentAction('preview', item.type, item.document)}
                          className="flex-1 inline-flex justify-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Preview
                        </button>
                        
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleDocumentAction('verify', item.type, item.document)}
                              className="flex-1 inline-flex justify-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleDocumentAction('reject', item.type, item.document)}
                              className="flex-1 inline-flex justify-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {item.status === 'rejected' && (
                          <button
                            onClick={() => handleDocumentAction('reupload', item.type)}
                            className="flex-1 inline-flex justify-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            Re-upload
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {kycDocuments.filter(doc => doc.verificationStatus === 'verified').length}
          </div>
          <div className="text-sm text-gray-500">Verified</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {kycDocuments.filter(doc => ['pending', 'under_review'].includes(doc.verificationStatus)).length}
          </div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
      </div>
    </div>
  );
};

export default KYCProgressIndicator;