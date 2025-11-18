import React, { useState, useEffect } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';

const DocumentExpirationTracker = ({ 
  documents = [], 
  onRefresh,
  isLoading = false,
  showAlerts = true,
  compact = false 
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [expandedDocuments, setExpandedDocuments] = useState(new Set());

  // Categorize documents by expiration status
  const categorizeDocuments = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return {
      expired: documents.filter(doc => doc.isExpired),
      expiringSoon: documents.filter(doc => 
        !doc.isExpired && doc.daysUntilExpiry <= 30 && doc.daysUntilExpiry > 0
      ),
      expiringIn90Days: documents.filter(doc => 
        !doc.isExpired && doc.daysUntilExpiry > 30 && doc.daysUntilExpiry <= 90
      ),
      valid: documents.filter(doc => 
        !doc.isExpired && (!doc.daysUntilExpiry || doc.daysUntilExpiry > 90)
      ),
      noExpiry: documents.filter(doc => !doc.expiryDate)
    };
  };

  const categories = categorizeDocuments();

  // Filter documents based on selected time range
  const getFilteredDocuments = () => {
    switch (selectedTimeRange) {
      case 'expired':
        return categories.expired;
      case '30days':
        return [...categories.expired, ...categories.expiringSoon];
      case '90days':
        return [...categories.expired, ...categories.expiringSoon, ...categories.expiringIn90Days];
      case 'noexpiry':
        return categories.noexpiry;
      default:
        return documents;
    }
  };

  const filteredDocuments = getFilteredDocuments();

  // Calculate expiration statistics
  const getExpirationStats = () => {
    return {
      total: documents.length,
      expired: categories.expired.length,
      expiringSoon: categories.expiringSoon.length,
      expiringIn90Days: categories.expiringIn90Days.length,
      noExpiry: categories.noExpiry.length,
      valid: categories.valid.length
    };
  };

  const stats = getExpirationStats();

  const toggleDocumentExpanded = (docId) => {
    const newExpanded = new Set(expandedDocuments);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocuments(newExpanded);
  };

  const getExpirationStatus = (document) => {
    if (!document.expiryDate) return { status: 'no-expiry', label: 'No Expiry', color: 'gray' };
    if (document.isExpired) return { status: 'expired', label: 'Expired', color: 'red' };
    if (document.daysUntilExpiry <= 30) return { status: 'expiring-soon', label: 'Expiring Soon', color: 'orange' };
    if (document.daysUntilExpiry <= 90) return { status: 'expiring-in-90', label: 'Expiring in 90 Days', color: 'yellow' };
    return { status: 'valid', label: 'Valid', color: 'green' };
  };

  const getStatusBadgeClass = (color) => {
    switch (color) {
      case 'red': return 'bg-red-100 text-red-800';
      case 'orange': return 'bg-orange-100 text-orange-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-green-100 text-green-800';
      case 'gray': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertLevel = () => {
    if (categories.expired.length > 0) return 'critical';
    if (categories.expiringSoon.length > 0) return 'warning';
    if (categories.expiringIn90Days.length > 0) return 'info';
    return 'success';
  };

  const alertLevel = getAlertLevel();

  useEffect(() => {
    // Auto-refresh every hour for documents expiring soon
    if (categories.expiringSoon.length > 0 || categories.expired.length > 0) {
      const interval = setInterval(() => {
        if (onRefresh) onRefresh();
      }, 60 * 60 * 1000); // 1 hour

      return () => clearInterval(interval);
    }
  }, [categories.expiringSoon.length, categories.expired.length, onRefresh]);

  if (compact) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Document Expiry</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        {/* Alert Summary */}
        {showAlerts && alertLevel !== 'success' && (
          <div className={`mb-3 p-2 rounded-lg ${
            alertLevel === 'critical' ? 'bg-red-50 border border-red-200' :
            alertLevel === 'warning' ? 'bg-orange-50 border border-orange-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center">
              <svg className={`h-4 w-4 mr-2 ${
                alertLevel === 'critical' ? 'text-red-600' :
                alertLevel === 'warning' ? 'text-orange-600' :
                'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className={`text-sm font-medium ${
                alertLevel === 'critical' ? 'text-red-800' :
                alertLevel === 'warning' ? 'text-orange-800' :
                'text-yellow-800'
              }`}>
                {categories.expired.length} expired, {categories.expiringSoon.length} expiring soon
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center">
            <div className="font-bold text-red-600">{categories.expired.length}</div>
            <div className="text-gray-500">Expired</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-orange-600">{categories.expiringSoon.length}</div>
            <div className="text-gray-500">Expiring Soon</div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Document Expiration Tracker</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
        </div>

        {/* Alert Banner */}
        {showAlerts && alertLevel !== 'success' && (
          <div className={`mb-6 p-4 rounded-lg border ${
            alertLevel === 'critical' ? 'bg-red-50 border-red-200' :
            alertLevel === 'warning' ? 'bg-orange-50 border-orange-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center">
              <svg className={`h-5 w-5 mr-3 ${
                alertLevel === 'critical' ? 'text-red-600' :
                alertLevel === 'warning' ? 'text-orange-600' :
                'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className={`text-sm font-medium ${
                  alertLevel === 'critical' ? 'text-red-800' :
                  alertLevel === 'warning' ? 'text-orange-800' :
                  'text-yellow-800'
                }`}>
                  {alertLevel === 'critical' ? 'Critical: Expired Documents' :
                   alertLevel === 'warning' ? 'Warning: Documents Expiring Soon' :
                   'Info: Documents Expiring Within 90 Days'}
                </h4>
                <p className={`text-sm mt-1 ${
                  alertLevel === 'critical' ? 'text-red-700' :
                  alertLevel === 'warning' ? 'text-orange-700' :
                  'text-yellow-700'
                }`}>
                  {categories.expired.length} expired, {categories.expiringSoon.length} expiring in 30 days, {categories.expiringIn90Days.length} expiring in 90 days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
            <div className="text-sm text-gray-600">Expiring Soon</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.expiringIn90Days}</div>
            <div className="text-sm text-gray-600">In 90 Days</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-sm text-gray-600">Valid</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.noExpiry}</div>
            <div className="text-sm text-gray-600">No Expiry</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Documents', count: stats.total },
              { value: 'expired', label: 'Expired', count: stats.expired },
              { value: '30days', label: 'Expiring in 30 Days', count: stats.expired + stats.expiringSoon },
              { value: '90days', label: 'Expiring in 90 Days', count: stats.expired + stats.expiringSoon + stats.expiringIn90Days },
              { value: 'noexpiry', label: 'No Expiry Date', count: stats.noExpiry }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeRange(option.value)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedTimeRange === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-white bg-opacity-20">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No documents found for this filter</p>
            </div>
          ) : (
            filteredDocuments.map((document) => {
              const expirationStatus = getExpirationStatus(document);
              
              return (
                <div key={document._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(expirationStatus.color)}`}>
                          {expirationStatus.label}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatStatus(document.documentType)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {document.fileName || document.originalName || 'Document'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Uploaded:</span>
                          <span className="ml-2 text-gray-900">
                            {formatDate(document.uploadedAt)}
                          </span>
                        </div>
                        
                        {document.expiryDate && (
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <span className="ml-2 text-gray-900">
                              {formatDate(document.expiryDate)}
                            </span>
                          </div>
                        )}
                        
                        {document.daysUntilExpiry !== null && (
                          <div>
                            <span className="text-gray-500">Days Until Expiry:</span>
                            <span className={`ml-2 font-medium ${
                              document.isExpired ? 'text-red-600' :
                              document.daysUntilExpiry <= 30 ? 'text-orange-600' :
                              document.daysUntilExpiry <= 90 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {document.isExpired ? 'Expired' : `${document.daysUntilExpiry} days`}
                            </span>
                          </div>
                        )}
                      </div>

                      {document.verificationStatus && (
                        <div className="mt-2">
                          <span className="text-gray-500">Status:</span>
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            document.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                            document.verificationStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            document.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {formatStatus(document.verificationStatus)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Expand/Collapse Button */}
                    {(document.verificationScore || document.aiAnalysis) && (
                      <button
                        onClick={() => toggleDocumentExpanded(document._id)}
                        className="ml-4 text-gray-400 hover:text-gray-600"
                      >
                        <svg 
                          className={`h-4 w-4 transform transition-transform ${expandedDocuments.has(document._id) ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedDocuments.has(document._id) && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      {document.verificationScore && (
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Verification Score:</span>
                          <span className="text-gray-900">{document.verificationScore}%</span>
                        </div>
                      )}
                      
                      {document.aiAnalysis && (
                        <div className="text-sm">
                          <span className="text-gray-500">AI Analysis:</span>
                          <pre className="mt-1 text-xs bg-white p-2 rounded border">
                            {JSON.stringify(document.aiAnalysis, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentExpirationTracker;