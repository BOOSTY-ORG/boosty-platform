import React, { useState, useEffect } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';

const DocumentVerification = ({ 
  document, 
  onVerify, 
  onReject, 
  onFlagForReview,
  verificationHistory = [],
  isLoading = false 
}) => {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [customFlag, setCustomFlag] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);

  const commonFlags = [
    'Poor image quality',
    'Document expired',
    'Information mismatch',
    'Suspicious alterations',
    'Missing information',
    'Invalid format',
    'Potential forgery',
    'Name mismatch',
    'Address mismatch',
    'Date of birth mismatch'
  ];

  const rejectionReasons = [
    'Document is expired',
    'Information is unclear or illegible',
    'Document appears to be altered or forged',
    'Required information is missing',
    'Document type is not accepted',
    'Image quality is too poor for verification',
    'Information does not match provided details',
    'Document is not valid in the issuing country',
    'Security features are missing or invalid',
    'Other (specify in notes)'
  ];

  useEffect(() => {
    // Reset form when document changes
    setVerificationNotes('');
    setRejectionReason('');
    setSelectedFlags([]);
    setCustomFlag('');
    setShowRejectionForm(false);
    setShowFlagForm(false);
  }, [document]);

  const handleVerify = () => {
    if (!document) return;
    
    onVerify(document._id, {
      notes: verificationNotes,
      flags: selectedFlags.length > 0 ? [...selectedFlags, ...(customFlag ? [customFlag] : [])] : undefined
    });
  };

  const handleReject = () => {
    if (!document) return;
    
    onReject(document._id, {
      reason: rejectionReason,
      notes: verificationNotes,
      flags: selectedFlags.length > 0 ? [...selectedFlags, ...(customFlag ? [customFlag] : [])] : undefined
    });
  };

  const handleFlagForReview = () => {
    if (!document) return;
    
    onFlagForReview(document._id, {
      flags: [...selectedFlags, ...(customFlag ? [customFlag] : [])],
      notes: verificationNotes
    });
  };

  const toggleFlag = (flag) => {
    setSelectedFlags(prev => 
      prev.includes(flag) 
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!document) {
    return (
      <div className="text-center py-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No document selected</h3>
        <p className="mt-1 text-sm text-gray-500">Select a document to begin verification.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Information */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Document Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Document Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatStatus(document.documentType)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(document.verificationStatus)}`}>
                  {formatStatus(document.verificationStatus)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">File Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.fileName || document.originalName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(document.createdAt)}</dd>
            </div>
            {document.verificationScore && (
              <div>
                <dt className="text-sm font-medium text-gray-500">AI Confidence Score</dt>
                <dd className="mt-1">
                  <div className="flex items-center">
                    <span className={`font-bold ${
                      document.verificationScore >= 90 ? 'text-green-600' :
                      document.verificationScore >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {document.verificationScore}%
                    </span>
                  </div>
                </dd>
              </div>
            )}
            {document.expiryDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(document.expiryDate)}
                  {document.isExpired && (
                    <span className="ml-2 text-red-600 text-xs font-medium">EXPIRED</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* AI Analysis Results */}
      {document.aiAnalysis && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">AI Analysis Results</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {document.aiAnalysis.authenticityScore && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Authenticity Score</dt>
                  <dd className="mt-1">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            document.aiAnalysis.authenticityScore >= 90 ? 'bg-green-600' :
                            document.aiAnalysis.authenticityScore >= 70 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${document.aiAnalysis.authenticityScore}%` }}
                        ></div>
                      </div>
                      <span className={`font-bold ${
                        document.aiAnalysis.authenticityScore >= 90 ? 'text-green-600' :
                        document.aiAnalysis.authenticityScore >= 70 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {document.aiAnalysis.authenticityScore}%
                      </span>
                    </div>
                  </dd>
                </div>
              )}
              
              {document.aiAnalysis.extractedData && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Extracted Data</dt>
                  <dd className="mt-1">
                    <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                      {JSON.stringify(document.aiAnalysis.extractedData, null, 2)}
                    </pre>
                  </dd>
                </div>
              )}
              
              {document.aiAnalysis.flags && document.aiAnalysis.flags.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">AI Flags</dt>
                  <dd className="mt-1">
                    <ul className="list-disc list-inside space-y-1">
                      {document.aiAnalysis.flags.map((flag, index) => (
                        <li key={index} className="text-sm text-red-600">{flag}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Form */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Verification Actions</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
          {/* Verification Notes */}
          <div>
            <label htmlFor="verification-notes" className="block text-sm font-medium text-gray-700">
              Verification Notes
            </label>
            <textarea
              id="verification-notes"
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Add any notes about this verification..."
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
            />
          </div>

          {/* Flags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Flags
              </label>
              <button
                type="button"
                onClick={() => setShowFlagForm(!showFlagForm)}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                {showFlagForm ? 'Hide' : 'Show'} flags
              </button>
            </div>
            
            {showFlagForm && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {commonFlags.map((flag) => (
                    <label key={flag} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2 border-gray-300 rounded text-primary-600 focus:ring-primary-500"
                        checked={selectedFlags.includes(flag)}
                        onChange={() => toggleFlag(flag)}
                      />
                      <span className="text-sm text-gray-700">{flag}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  className="mt-2 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Add custom flag..."
                  value={customFlag}
                  onChange={(e) => setCustomFlag(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {showRejectionForm && (
            <div>
              <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700">
                Rejection Reason
              </label>
              <select
                id="rejection-reason"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              >
                <option value="">Select a reason</option>
                {rejectionReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isLoading || document.verificationStatus === 'verified'}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Verify Document'}
            </button>
            
            <button
              type="button"
              onClick={() => setShowRejectionForm(!showRejectionForm)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Reject Document
            </button>
            
            <button
              type="button"
              onClick={handleFlagForReview}
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Flag for Review
            </button>
          </div>

          {showRejectionForm && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectionForm(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isLoading || !rejectionReason}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Verification History */}
      {verificationHistory && verificationHistory.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Verification History</h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {verificationHistory.map((history, index) => (
                <li key={index} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          history.action === 'verified' ? 'bg-green-100' :
                          history.action === 'rejected' ? 'bg-red-100' :
                          history.action === 'flagged' ? 'bg-yellow-100' :
                          'bg-gray-100'
                        }`}>
                          <svg className={`h-4 w-4 ${
                            history.action === 'verified' ? 'text-green-600' :
                            history.action === 'rejected' ? 'text-red-600' :
                            history.action === 'flagged' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {history.action.charAt(0).toUpperCase() + history.action.slice(1)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {history.performedBy?.name || 'System'} • {formatDate(history.timestamp)}
                        </div>
                      </div>
                    </div>
                    {history.details && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {history.details}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVerification;