import React, { useState, useEffect } from 'react';
import { formatDate, formatFileSize } from '../../utils/formatters.js';

const DocumentPreview = ({ 
  document, 
  onClose, 
  onVerify, 
  onReject, 
  showActions = true,
  aiAnalysis = null 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [document?.fileUrl]);

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

  const renderPreviewContent = () => {
    if (!document?.fileUrl) {
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

    if (isImageFile(document.fileName || document.fileUrl)) {
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
              src={document.fileUrl}
              alt={document.fileName || 'Document preview'}
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

    if (isPDFFile(document.fileName || document.fileUrl)) {
      return (
        <div className="h-96 bg-gray-50 rounded-lg">
          <iframe
            src={document.fileUrl}
            className="w-full h-full rounded-lg"
            title={document.fileName || 'PDF preview'}
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
          href={document.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Download Document
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Document Preview
                </h3>
                <div className="mt-1 text-sm text-gray-500">
                  <p>Type: {document.documentType || 'Unknown'}</p>
                  <p>Name: {document.fileName || document.originalName || 'Unknown'}</p>
                  <p>Size: {document.fileSize ? formatFileSize(document.fileSize) : 'Unknown'}</p>
                  <p>Uploaded: {document.createdAt ? formatDate(document.createdAt) : 'Unknown'}</p>
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

            {/* Document Controls for Images */}
            {isImageFile(document.fileName || document.fileUrl) && (
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

            {/* AI Analysis Toggle */}
            {aiAnalysis && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  className="flex items-center text-sm text-primary-600 hover:text-primary-800"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showAIAnalysis ? 'Hide' : 'Show'} AI Analysis
                </button>
              </div>
            )}

            {/* AI Analysis Panel */}
            {showAIAnalysis && aiAnalysis && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">AI Analysis Results</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Authenticity Score:</span>{' '}
                    <span className={`font-bold ${
                      aiAnalysis.authenticityScore >= 90 ? 'text-green-600' :
                      aiAnalysis.authenticityScore >= 70 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {aiAnalysis.authenticityScore}%
                    </span>
                  </div>
                  {aiAnalysis.extractedData && (
                    <div>
                      <span className="font-medium">Extracted Data:</span>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border">
                        {JSON.stringify(aiAnalysis.extractedData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {aiAnalysis.flags && aiAnalysis.flags.length > 0 && (
                    <div>
                      <span className="font-medium">Flags:</span>
                      <ul className="mt-1 list-disc list-inside">
                        {aiAnalysis.flags.map((flag, index) => (
                          <li key={index} className="text-red-600">{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Document Preview */}
            <div className="mt-4">
              {renderPreviewContent()}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => onVerify(document._id)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Verify Document
              </button>
              <button
                type="button"
                onClick={() => onReject(document._id)}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Reject Document
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;