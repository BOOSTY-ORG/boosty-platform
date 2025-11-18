import React from 'react';
import { formatStatus } from '../../utils/formatters.js';

const KYCProgressIndicator = ({ 
  kycDocuments = [], 
  overallProgress = 0, 
  showDetails = true,
  compact = false 
}) => {
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
    const requiredTypes = ['government_id', 'utility_bill', 'bank_statement', 'proof_of_income', 'property_document'];
    
    return requiredTypes.map(type => {
      const document = kycDocuments.find(doc => doc.documentType === type);
      return {
        type,
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
              <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    item.status === 'verified' ? 'bg-green-500' :
                    item.status === 'pending' || item.status === 'under_review' ? 'bg-yellow-500' :
                    item.status === 'rejected' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatStatus(item.type)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.document ? `Uploaded ${new Date(item.document.uploadedAt).toLocaleDateString()}` : 'Not uploaded'}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                  {formatStatus(item.status)}
                </span>
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