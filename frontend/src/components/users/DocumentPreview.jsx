import React, { useState, useEffect } from 'react';
import { formatDate, formatFileSize, formatStatus } from '../../utils/formatters.js';

const DocumentPreview = ({
  document,
  onClose,
  onVerify,
  onReject,
  onRequestReupload,
  onFlagForReview,
  onRunAIAnalysis,
  showActions = true,
  aiAnalysis = null,
  verificationHistory = [],
  showMetadata = true,
  allowBulkActions = false,
  onDownload,
  onCompare,
  relatedDocuments = []
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    setRejectionReason('');
  }, [document?.documentUrl]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleVerify = () => {
    if (onVerify && document._id) {
      onVerify(document._id);
    }
  };

  const handleReject = () => {
    if (onReject && document._id) {
      onReject(document._id, rejectionReason);
    }
  };

  const handleRequestReupload = () => {
    if (onRequestReupload && document._id) {
      onRequestReupload(document._id);
    }
  };

  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const extension = '.' + fileName.split('.').pop().toLowerCase();
    return imageExtensions.includes(extension);
  };

  const isPDFFile = (fileName) => {
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderPreviewContent = () => {
    if (!document?.documentUrl) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No document available</p>
          </div>
        </div>
      );
    }

    if (isImageFile(document.fileName || document.originalName || document.documentUrl)) {
      return (
        <div className="relative overflow-auto max-h-96 bg-gray-50 rounded-lg">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}
          
          {imageError ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-red-500">Failed to load image</p>
              </div>
            </div>
          ) : (
            <img
              src={document.documentUrl}
              alt={document.fileName || document.originalName || 'Document preview'}
              className="max-w-full h-auto mx-auto"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      );
    }

    if (isPDFFile(document.fileName || document.originalName || document.documentUrl)) {
      return (
        <div className="h-96 bg-gray-50 rounded-lg">
          <iframe
            src={document.documentUrl}
            className="w-full h-full rounded-lg"
            title={document.fileName || document.originalName || 'PDF preview'}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }

    // For other file types, show download link
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg">
        <svg className="h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-gray-600 mb-2">Preview not available</p>
        <a
          href={document.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Download Document
        </a>
      </div>
    );
  };

  const renderMetadata = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Document Information</h4>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Type:</dt>
              <dd className="text-gray-900">{formatStatus(document.documentType)}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Status:</dt>
              <dd>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(document.verificationStatus)}`}>
                  {formatStatus(document.verificationStatus)}
                </span>
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Uploaded:</dt>
              <dd className="text-gray-900">{formatDate(document.uploadedAt)}</dd>
            </div>
            {document.reviewedAt && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Reviewed:</dt>
                <dd className="text-gray-900">{formatDate(document.reviewedAt)}</dd>
              </div>
            )}
            {document.processingTime && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Processing Time:</dt>
                <dd className="text-gray-900">{document.processingTime} days</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Document Details</h4>
          <dl className="space-y-2">
            {document.documentNumber && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Document Number:</dt>
                <dd className="text-gray-900">{document.documentNumber}</dd>
              </div>
            )}
            {document.issuingAuthority && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Issuing Authority:</dt>
                <dd className="text-gray-900">{document.issuingAuthority}</dd>
              </div>
            )}
            {document.issueDate && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Issue Date:</dt>
                <dd className="text-gray-900">{formatDate(document.issueDate)}</dd>
              </div>
            )}
            {document.expiryDate && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Expiry Date:</dt>
                <dd className={`font-medium ${
                  document.isExpired ? 'text-red-600' :
                  document.daysUntilExpiry <= 30 ? 'text-orange-600' :
                  document.daysUntilExpiry <= 90 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {formatDate(document.expiryDate)}
                  {document.daysUntilExpiry !== null && (
                    <span className="ml-2 text-xs">
                      ({document.isExpired ? 'Expired' : `${document.daysUntilExpiry} days`})
                    </span>
                  )}
                </dd>
              </div>
            )}
            {document.fileSize && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">File Size:</dt>
                <dd className="text-gray-900">{formatFileSize(document.fileSize)}</dd>
              </div>
            )}
            {document.verificationScore && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Verification Score:</dt>
                <dd className={`font-medium ${
                  document.verificationScore >= 90 ? 'text-green-600' :
                  document.verificationScore >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {document.verificationScore}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {document.rejectionReason && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Rejection Reason</h4>
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">{document.rejectionReason}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderAIAnalysis = () => (
    <div className="space-y-4">
      {aiAnalysis ? (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiAnalysis.authenticityScore && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Authenticity Score</h4>
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          aiAnalysis.authenticityScore >= 90 ? 'bg-green-600' :
                          aiAnalysis.authenticityScore >= 70 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${aiAnalysis.authenticityScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    aiAnalysis.authenticityScore >= 90 ? 'text-green-600' :
                    aiAnalysis.authenticityScore >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {aiAnalysis.authenticityScore}%
                  </span>
                </div>
              </div>
            )}

            {aiAnalysis.extractedData && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Data</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(aiAnalysis.extractedData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {aiAnalysis.flags && aiAnalysis.flags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">AI Flags</h4>
              <div className="space-y-2">
                {aiAnalysis.flags.map((flag, index) => (
                  <div key={index} className="flex items-center p-2 bg-yellow-50 rounded-lg">
                    <svg className="h-4 w-4 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-yellow-700">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No AI analysis available</p>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      {verificationHistory && verificationHistory.length > 0 ? (
        <div className="space-y-3">
          {verificationHistory.map((event, index) => (
            <div key={index} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  event.type === 'upload' ? 'bg-blue-100' :
                  event.status === 'verified' ? 'bg-green-100' :
                  event.status === 'rejected' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  {event.type === 'upload' ? (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  ) : event.status === 'verified' ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : event.status === 'rejected' ? (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{event.details}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">by {event.performedByName}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No verification history available</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Document Preview - {formatStatus(document.documentType)}
                </h3>
                <div className="mt-1 text-sm text-gray-500">
                  <p>Name: {document.fileName || document.originalName || 'Unknown'}</p>
                  <p>Status: {formatStatus(document.verificationStatus)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-2 px-4 text-sm font-medium ${
                    activeTab === 'preview'
                      ? 'border-primary-500 text-primary-600 border-b-2'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                  }`}
                >
                  Preview
                </button>
                {showMetadata && (
                  <button
                    onClick={() => setActiveTab('metadata')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === 'metadata'
                        ? 'border-primary-500 text-primary-600 border-b-2'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                    }`}
                  >
                    Metadata
                  </button>
                )}
                {aiAnalysis && (
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === 'ai'
                        ? 'border-primary-500 text-primary-600 border-b-2'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                    }`}
                  >
                    AI Analysis
                  </button>
                )}
                {verificationHistory && verificationHistory.length > 0 && (
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeTab === 'history'
                        ? 'border-primary-500 text-primary-600 border-b-2'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                    }`}
                  >
                    History
                  </button>
                )}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'preview' && (
                <div>
                  {/* Document Controls for Images */}
                  {isImageFile(document.fileName || document.originalName || document.documentUrl) && (
                    <div className="flex items-center space-x-2 mb-4 p-2 bg-gray-50 rounded">
                      <button
                        onClick={handleZoomOut}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Zoom out"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-sm text-gray-600">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        onClick={handleZoomIn}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Zoom in"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <button
                        onClick={handleRotate}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Rotate"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                      <button
                        onClick={handleReset}
                        className="p-1 text-gray-600 hover:text-gray-800"
                        title="Reset"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Document Preview */}
                  {renderPreviewContent()}
                </div>
              )}

              {activeTab === 'metadata' && renderMetadata()}
              {activeTab === 'ai' && renderAIAnalysis()}
              {activeTab === 'history' && renderHistory()}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {document.verificationStatus !== 'verified' && (
                <button
                  type="button"
                  onClick={handleVerify}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Verify Document
                </button>
              )}
              
              {document.verificationStatus !== 'rejected' && (
                <button
                  type="button"
                  onClick={handleReject}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Reject Document
                </button>
              )}

              {onRequestReupload && (
                <button
                  type="button"
                  onClick={handleRequestReupload}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Request Re-upload
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          )}

          {/* Rejection Reason Input */}
          {activeTab === 'metadata' && document.verificationStatus !== 'rejected' && (
            <div className="bg-yellow-50 px-4 py-3 sm:px-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Rejection Reason</h3>
                  <div className="mt-2">
                    <textarea
                      id="rejection-reason"
                      name="rejection-reason"
                      rows={3}
                      className="shadow-sm focus:ring-yellow-500 focus:border-yellow-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                  <div className="mt-3 flex">
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject with Reason
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;