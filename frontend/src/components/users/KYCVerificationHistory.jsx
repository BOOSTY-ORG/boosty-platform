import React, { useState } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';

const KYCVerificationHistory = ({ 
  verificationHistory = [], 
  documents = [],
  isLoading = false,
  showFilters = true 
}) => {
  const [filter, setFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Combine document history with document data
  const getFullHistory = () => {
    const history = [...verificationHistory];
    
    // Add document upload events
    documents.forEach(doc => {
      history.push({
        id: `upload-${doc._id}`,
        type: 'upload',
        timestamp: doc.uploadedAt,
        documentId: doc._id,
        documentType: doc.documentType,
        documentName: doc.fileName || doc.originalName,
        performedBy: doc.userId,
        performedByName: 'User',
        details: `Document uploaded: ${doc.documentType}`,
        status: 'completed',
        metadata: {
          fileSize: doc.fileSize,
          verificationScore: doc.verificationScore,
          aiAnalysis: doc.aiAnalysis
        }
      });

      // Add verification events
      if (doc.reviewedAt) {
        history.push({
          id: `review-${doc._id}`,
          type: 'verification',
          timestamp: doc.reviewedAt,
          documentId: doc._id,
          documentType: doc.documentType,
          documentName: doc.fileName || doc.originalName,
          performedBy: doc.reviewedBy,
          performedByName: 'Reviewer',
          details: `Document ${doc.verificationStatus}`,
          status: doc.verificationStatus,
          rejectionReason: doc.rejectionReason,
          verificationScore: doc.verificationScore,
          processingTime: doc.processingTime
        });
      }
    });

    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const filteredHistory = getFullHistory().filter(item => {
    if (filter === 'all') return true;
    if (filter === 'uploads') return item.type === 'upload';
    if (filter === 'verifications') return item.type === 'verification';
    if (filter === 'verified') return item.status === 'verified';
    if (filter === 'rejected') return item.status === 'rejected';
    if (filter === 'pending') return ['pending', 'under_review'].includes(item.status);
    return true;
  });

  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusIcon = (type, status) => {
    if (type === 'upload') {
      return (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </div>
      );
    }

    if (type === 'verification') {
      const bgColor = status === 'verified' ? 'bg-green-100' : 
                      status === 'rejected' ? 'bg-red-100' : 
                      'bg-yellow-100';
      const textColor = status === 'verified' ? 'text-green-600' : 
                       status === 'rejected' ? 'text-red-600' : 
                       'text-yellow-600';
      
      return (
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
            {status === 'verified' ? (
              <svg className={`w-4 h-4 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : status === 'rejected' ? (
              <svg className={`w-4 h-4 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className={`w-4 h-4 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    );
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">KYC Verification History</h3>
          <div className="text-sm text-gray-500">
            {filteredHistory.length} events
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Events' },
                { value: 'uploads', label: 'Uploads' },
                { value: 'verifications', label: 'Verifications' },
                { value: 'verified', label: 'Verified' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'pending', label: 'Pending' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                    filter === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No verification history found</p>
            </div>
          ) : (
            filteredHistory.map((item, index) => (
              <div key={item.id} className="flex space-x-3">
                {getStatusIcon(item.type, item.status)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.details}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(item.timestamp)}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          by {item.performedByName}
                        </span>
                        {item.documentType && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatStatus(item.documentType)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                      
                      {item.verificationScore && (
                        <span className="text-xs text-gray-500">
                          Score: {item.verificationScore}%
                        </span>
                      )}
                      
                      {(item.metadata || item.rejectionReason || item.processingTime) && (
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg 
                            className={`h-4 w-4 transform transition-transform ${expandedItems.has(item.id) ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedItems.has(item.id) && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      {item.metadata && (
                        <div className="space-y-2">
                          {item.metadata.fileSize && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">File Size:</span>
                              <span className="text-gray-900">
                                {(item.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          )}
                          {item.metadata.verificationScore && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">AI Score:</span>
                              <span className="text-gray-900">{item.metadata.verificationScore}%</span>
                            </div>
                          )}
                          {item.metadata.aiAnalysis && (
                            <div className="text-sm">
                              <span className="text-gray-500">AI Analysis:</span>
                              <pre className="mt-1 text-xs bg-white p-2 rounded border">
                                {JSON.stringify(item.metadata.aiAnalysis, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {item.rejectionReason && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Rejection Reason:</span>
                          <p className="mt-1 text-red-600">{item.rejectionReason}</p>
                        </div>
                      )}
                      
                      {item.processingTime && (
                        <div className="mt-2 flex justify-between text-sm">
                          <span className="text-gray-500">Processing Time:</span>
                          <span className="text-gray-900">{item.processingTime} days</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCVerificationHistory;