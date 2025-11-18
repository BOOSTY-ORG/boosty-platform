import React, { useState, useEffect } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';

const DocumentVerification = ({
  document,
  onVerify,
  onReject,
  onFlagForReview,
  onBulkVerify,
  onBulkReject,
  verificationHistory = [],
  isLoading = false,
  selectedDocuments = [],
  showBulkActions = false
}) => {
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [customFlag, setCustomFlag] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [isRerunningAI, setIsRerunningAI] = useState(false);
  const [workflowStep, setWorkflowStep] = useState('review'); // review, analyze, verify, reject, flag

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
    setShowAIAnalysis(false);
    setAiAnalysisData(null);
    setWorkflowStep('review');
    setIsRerunningAI(false);
  }, [document]);

  // Load AI analysis data when document changes
  useEffect(() => {
    if (document && document.aiAnalysis) {
      setAiAnalysisData(document.aiAnalysis);
    }
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

  const handleRerunAIAnalysis = async () => {
    if (!document) return;
    
    setIsRerunningAI(true);
    try {
      // This would be passed from parent component
      if (onRerunAIAnalysis) {
        await onRerunAIAnalysis(document._id);
        // Refresh AI analysis data
        if (document.aiAnalysis) {
          setAiAnalysisData(document.aiAnalysis);
        }
      }
    } catch (error) {
      console.error('Failed to rerun AI analysis:', error);
    } finally {
      setIsRerunningAI(false);
    }
  };

  const renderWorkflowIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-medium text-gray-900">Verification Workflow</h4>
        <div className="flex items-center space-x-2">
          {['review', 'analyze', 'verify', 'reject', 'flag'].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                workflowStep === step ? 'bg-primary-600' : 'bg-gray-300'
              }`}>
                <span className="text-xs font-medium text-white">
                  {step === 'review' && '1'}
                  {step === 'analyze' && '2'}
                  {step === 'verify' && '3'}
                  {step === 'reject' && '4'}
                  {step === 'flag' && '5'}
                </span>
              </div>
              <span className="text-xs text-gray-600 ml-2">
                {step === 'review' && 'Review'}
                {step === 'analyze' && 'Analyze'}
                {step === 'verify' && 'Verify'}
                {step === 'reject' && 'Reject'}
                {step === 'flag' && 'Flag'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(workflowStep === 'review' ? 20 :
                     workflowStep === 'analyze' ? 40 :
                     workflowStep === 'verify' ? 60 :
                     workflowStep === 'reject' ? 80 : 100)}%`
          }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Workflow Indicator */}
      {renderWorkflowIndicator()}

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

      {/* Enhanced AI Analysis Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">AI Analysis</h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                {showAIAnalysis ? 'Hide' : 'Show'} Analysis
              </button>
              {document && (
                <button
                  type="button"
                  onClick={handleRerunAIAnalysis}
                  disabled={isRerunningAI}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isRerunningAI ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Rerunning...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Rerun Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          {showAIAnalysis && aiAnalysisData && (
            <div className="space-y-4">
              {aiAnalysisData.authenticityScore && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Authenticity Score</span>
                    <span className={`font-bold ${
                      aiAnalysisData.authenticityScore >= 90 ? 'text-green-600' :
                      aiAnalysisData.authenticityScore >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {aiAnalysisData.authenticityScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        aiAnalysisData.authenticityScore >= 90 ? 'bg-green-600' :
                        aiAnalysisData.authenticityScore >= 70 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${aiAnalysisData.authenticityScore}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {aiAnalysisData.extractedData && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Data</h4>
                  <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                    {JSON.stringify(aiAnalysisData.extractedData, null, 2)}
                  </pre>
                </div>
              )}
              
              {aiAnalysisData.flags && aiAnalysisData.flags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">AI Flags</h4>
                  <div className="space-y-2">
                    {aiAnalysisData.flags.map((flag, index) => (
                      <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg">
                        <svg className="h-5 w-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.752 1.394 2.67 1.394 3.43 0 2.328-2.327 2.328-4.414V8.617c0-1.868-1.355-3.419-3.43-4.418l-5.58-9.92zM11.13 11.897l.013.023c.735.826 2.068.826 2.828 0 .758-.447 1.63-.826 2.828zm-1.446 2.692l.022-.023c.735-.826 2.068-.826 2.828 0 .758.447 1.63.826 2.828l5.58 9.92c.752 1.394 2.67 1.394 3.43 0 2.328-2.327 2.328-4.414V8.617c0-1.868-1.355-3.419-3.43-4.418l-5.58-9.92zM11.13 11.897l.013.023c.735.826 2.068.826 2.828 0 .758.447 1.63.826 2.828z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-800">{flag.type || 'Flag'}</p>
                          <p className="text-sm text-red-600">{flag.description || flag}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {aiAnalysisData.confidence && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Overall Confidence</span>
                    <span className={`font-bold ${
                      aiAnalysisData.confidence >= 90 ? 'text-green-600' :
                      aiAnalysisData.confidence >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {aiAnalysisData.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        aiAnalysisData.confidence >= 90 ? 'bg-green-600' :
                        aiAnalysisData.confidence >= 70 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${aiAnalysisData.confidence}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          ) || (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No AI analysis available for this document.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && selectedDocuments.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bulk Actions</h3>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onBulkVerify && onBulkVerify(selectedDocuments, { notes: 'Bulk verified' })}
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : `Verify ${selectedDocuments.length} Documents`}
              </button>
              <button
                type="button"
                onClick={() => {
                  const reason = prompt('Please provide rejection reason for bulk rejection:');
                  if (reason && onBulkReject) {
                    onBulkReject(selectedDocuments, { reason });
                  }
                }}
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : `Reject ${selectedDocuments.length} Documents`}
              </button>
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