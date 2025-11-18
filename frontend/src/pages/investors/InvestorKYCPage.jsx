import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvestor } from '../../context/InvestorContext.jsx';
import { formatDate, formatStatus, formatFileSize } from '../../utils/formatters.js';
import { DocumentUpload, DocumentPreview, DocumentVerification, KYCDashboard } from '../../components/investors/index.js';
import { investorsAPI } from '../../api/investors.js';
import { useRealtimeKYC, useDocumentEvents, useExpiryAlerts } from '../../utils/realtimeKYC.js';

const InvestorKYCPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    currentInvestor,
    kycDocuments,
    isLoading,
    error,
    getInvestorById,
    getInvestorKYC,
    uploadKYCDocument,
    verifyKYCDocument,
    rejectKYCDocument,
    flagKYCDocument,
    getDocumentHistory,
    getDocumentAIAnalysis,
    rerunAIAnalysis,
    bulkVerifyDocuments,
    bulkRejectDocuments,
    compareDocuments
  } = useInvestor();
  
  const [activeTab, setActiveTab] = useState('documents');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [kycMetrics, setKycMetrics] = useState(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [documentComparison, setDocumentComparison] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    file: null,
    description: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Real-time KYC updates
  const { kycDocuments: realtimeKYCDocuments, lastUpdate, isConnected } = useRealtimeKYC(id);
  const { events } = useDocumentEvents(id);
  const { alerts } = useExpiryAlerts(id);

  // Calculate KYC completion progress
  const [kycProgress, setKycProgress] = useState(0);
  const [kycCompletionStatus, setKycCompletionStatus] = useState('incomplete');

  useEffect(() => {
    if (id) {
      getInvestorById(id);
      getInvestorKYC(id);
      loadKYCMetrics();
    }
  }, [id]);

  // Update connection status
  useEffect(() => {
    setConnectionStatus(isConnected ? 'connected' : 'disconnected');
  }, [isConnected]);

  // Update real-time events
  useEffect(() => {
    setRealtimeEvents(events);
  }, [events]);

  // Update expiry alerts
  useEffect(() => {
    setExpiryAlerts(alerts);
  }, [alerts]);

  // Update documents list when real-time data changes
  useEffect(() => {
    if (realtimeKYCDocuments && realtimeKYCDocuments.length > 0) {
      // Update the context with real-time data
      // This assumes the context has a method to update KYC documents
      // If not, you might need to add this functionality
    }
  }, [realtimeKYCDocuments]);

  // Calculate KYC progress and status
  useEffect(() => {
    if (kycDocuments && kycDocuments.length > 0) {
      const totalDocuments = kycDocuments.length;
      const verifiedDocuments = kycDocuments.filter(doc => doc.verificationStatus === 'verified').length;
      const rejectedDocuments = kycDocuments.filter(doc => doc.verificationStatus === 'rejected').length;
      const pendingDocuments = kycDocuments.filter(doc => doc.verificationStatus === 'pending').length;
      
      const progress = totalDocuments > 0 ? (verifiedDocuments / totalDocuments) * 100 : 0;
      setKycProgress(Math.round(progress));
      
      // Determine completion status
      if (rejectedDocuments > 0) {
        setKycCompletionStatus('rejected');
      } else if (pendingDocuments > 0) {
        setKycCompletionStatus('pending');
      } else if (verifiedDocuments === totalDocuments && totalDocuments > 0) {
        setKycCompletionStatus('verified');
      } else {
        setKycCompletionStatus('incomplete');
      }
    }
  }, [kycDocuments]);

  const loadKYCMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const response = await investorsAPI.getKYCMetrics();
      setKycMetrics(response.data);
    } catch (error) {
      console.error('Failed to load KYC metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadDocumentHistory = async (documentId) => {
    try {
      const response = await investorsAPI.getDocumentHistory(id, documentId);
      setVerificationHistory(response.data);
    } catch (error) {
      console.error('Failed to load document history:', error);
      setVerificationHistory([]);
    }
  };

  const handleDocumentUpload = async (files, onProgress) => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', uploadForm.documentType);
      formData.append('description', uploadForm.description || file.name);

      return uploadKYCDocument(id, formData);
    });

    try {
      await Promise.all(uploadPromises);
      await getInvestorKYC(id); // Refresh the documents list
      await loadKYCMetrics(); // Refresh metrics
    } catch (error) {
      throw error;
    }
  };

  const handlePreviewDocument = async (document) => {
    setSelectedDocument(document);
    setShowPreview(true);
    await loadDocumentHistory(document._id);
  };

  const handleVerifyDocument = async (documentId, verificationData = {}) => {
    try {
      await verifyKYCDocument(id, documentId, verificationData);
      await getInvestorKYC(id);
      await loadKYCMetrics();
      setShowVerification(false);
      setShowPreview(false);
    } catch (error) {
      console.error('Failed to verify document:', error);
    }
  };

  const handleRejectDocument = async (documentId, rejectionData) => {
    try {
      await investorsAPI.rejectKYCDocument(id, documentId, rejectionData);
      await getInvestorKYC(id);
      await loadKYCMetrics();
      setShowVerification(false);
      setShowPreview(false);
    } catch (error) {
      console.error('Failed to reject document:', error);
    }
  };

  const handleFlagForReview = async (documentId, flagData) => {
    try {
      await investorsAPI.flagKYCDocument(id, documentId, flagData);
      await getInvestorKYC(id);
      await loadKYCMetrics();
      setShowVerification(false);
      setShowPreview(false);
    } catch (error) {
      console.error('Failed to flag document:', error);
    }
  };

  const handleSelectDocument = (documentId) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleBulkVerify = async () => {
    if (selectedDocuments.length === 0) return;
    
    try {
      await investorsAPI.bulkVerifyDocuments(id, selectedDocuments);
      await getInvestorKYC(id);
      await loadKYCMetrics();
      setSelectedDocuments([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to bulk verify documents:', error);
    }
  };

  const handleBulkReject = async () => {
    if (selectedDocuments.length === 0) return;
    
    const rejectionReason = prompt('Please provide rejection reason:');
    if (!rejectionReason) return;
    
    try {
      await investorsAPI.bulkRejectDocuments(id, selectedDocuments, { reason: rejectionReason });
      await getInvestorKYC(id);
      await loadKYCMetrics();
      setSelectedDocuments([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to bulk reject documents:', error);
    }
  };

  const handleCompareDocuments = async () => {
    if (selectedDocuments.length < 2) {
      alert('Please select at least 2 documents to compare');
      return;
    }

    try {
      const response = await investorsAPI.compareDocuments(id, selectedDocuments);
      setDocumentComparison(response.data);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to compare documents:', error);
    }
  };

  const handleRefreshMetrics = () => {
    loadKYCMetrics();
    getInvestorKYC(id);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        description: file.name
      });
    }
  };


  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
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

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading KYC information</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentInvestor) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Investor not found</h3>
        <p className="mt-1 text-sm text-gray-500">The investor you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/investors')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Back to Investors
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-end">
        <div className="flex items-center">
          <div className={`h-2 w-2 rounded-full mr-2 ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-600">
            {connectionStatus === 'connected' ? 'Real-time updates active' : 'Real-time updates disconnected'}
          </span>
        </div>
      </div>

      {/* Real-time Events */}
      {realtimeEvents.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Recent Activity</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="space-y-1">
                  {realtimeEvents.slice(0, 3).map((event, index) => (
                    <li key={index}>
                      {event.type === 'document_uploaded' && 'New document uploaded'}
                      {event.type === 'document_verified' && 'Document verified'}
                      {event.type === 'document_rejected' && 'Document rejected'}
                      {event.type === 'document_flagged' && 'Document flagged for review'}
                      {event.timestamp && ` (${formatDate(event.timestamp)})`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Expiry Alerts</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="space-y-1">
                  {expiryAlerts.slice(0, 3).map((alert, index) => (
                    <li key={index}>
                      {alert.documentType} expiring on {formatDate(alert.expiryDate)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/investors/${id}`)}
              className="mr-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
              KYC Verification
            </h2>
            {lastUpdate && (
              <span className="ml-3 text-xs text-gray-500">
                Last updated: {formatDate(lastUpdate)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage Know Your Customer documents and verification status.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-4">
          <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full ${
            currentInvestor.kycStatus === 'verified' ? 'bg-green-100 text-green-800' :
            currentInvestor.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            currentInvestor.kycStatus === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            KYC Status: {formatStatus(currentInvestor.kycStatus || 'not_submitted')}
          </span>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">Progress:</span>
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  kycCompletionStatus === 'verified' ? 'bg-green-600' :
                  kycCompletionStatus === 'rejected' ? 'bg-red-600' :
                  kycCompletionStatus === 'pending' ? 'bg-yellow-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${kycProgress}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">{kycProgress}%</span>
          </div>
        </div>
      </div>

      {/* Investor Info */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Investor Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {currentInvestor.firstName} {currentInvestor.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email Address</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentInvestor.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentInvestor.phone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Investor ID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {currentInvestor.investorId || currentInvestor._id}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'documents'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              KYC Documents
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'upload'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Upload Document
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'verification'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              Verification
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'border-primary-500 text-primary-600 border-b-2'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
              }`}
            >
              KYC Dashboard
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Submitted Documents</h3>
                <div className="flex space-x-2">
                  {selectedDocuments.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowBulkActions(!showBulkActions)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        Bulk Actions ({selectedDocuments.length})
                      </button>
                      {showBulkActions && (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleBulkVerify}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Verify Selected
                          </button>
                          <button
                            onClick={handleBulkReject}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Reject Selected
                          </button>
                          <button
                            onClick={handleCompareDocuments}
                            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Compare Selected
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {kycDocuments && kycDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="border-gray-300 rounded text-primary-600 focus:ring-primary-500"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocuments(kycDocuments.map(doc => doc._id));
                              } else {
                                setSelectedDocuments([]);
                              }
                            }}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Document Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upload Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          AI Score
                        </th>
                        <th className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {kycDocuments.map((document) => (
                        <tr key={document._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="border-gray-300 rounded text-primary-600 focus:ring-primary-500"
                              checked={selectedDocuments.includes(document._id)}
                              onChange={() => handleSelectDocument(document._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatStatus(document.documentType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {document.fileName || document.originalName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatFileSize(document.fileSize)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(document.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(document.verificationStatus)}`}>
                              {formatStatus(document.verificationStatus)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {document.verificationScore ? (
                              <span className={`font-bold ${
                                document.verificationScore >= 90 ? 'text-green-600' :
                                document.verificationScore >= 70 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {document.verificationScore}%
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                className="text-primary-600 hover:text-primary-900"
                                onClick={() => handlePreviewDocument(document)}
                              >
                                Preview
                              </button>
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => {
                                  setSelectedDocument(document);
                                  setShowVerification(true);
                                  loadDocumentHistory(document._id);
                                }}
                              >
                                Verify
                              </button>
                              <button
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => window.open(document.fileUrl, '_blank')}
                              >
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents submitted</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    This investor hasn't submitted any KYC documents yet.
                  </p>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Upload KYC Document</h3>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                    Document Type
                  </label>
                  <select
                    id="documentType"
                    name="documentType"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({
                      ...uploadForm,
                      documentType: e.target.value
                    })}
                    required
                  >
                    <option value="">Select a document type</option>
                    <option value="government_id">Government ID</option>
                    <option value="utility_bill">Utility Bill</option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="proof_of_income">Proof of Income</option>
                    <option value="property_document">Property Document</option>
                    <option value="passport">Passport</option>
                    <option value="drivers_license">Driver's License</option>
                    <option value="national_id">National ID</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                 
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({
                      ...uploadForm,
                      description: e.target.value
                    })}
                    placeholder="Optional description"
                  />
                </div>
              </div>
              
              <DocumentUpload
                onUpload={handleDocumentUpload}
                documentType={uploadForm.documentType}
                maxFileSize={10 * 1024 * 1024} // 10MB
                acceptedTypes={['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']}
                multiple={true}
              />
            </div>
          )}

          {activeTab === 'verification' && (
            <DocumentVerification
              document={selectedDocument}
              onVerify={handleVerifyDocument}
              onReject={handleRejectDocument}
              onFlagForReview={handleFlagForReview}
              verificationHistory={verificationHistory}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'dashboard' && (
            <KYCDashboard
              kycMetrics={kycMetrics}
              isLoading={isLoadingMetrics}
              onRefresh={handleRefreshMetrics}
            />
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {showPreview && selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => {
            setShowPreview(false);
            setSelectedDocument(null);
          }}
          onVerify={(documentId) => {
            handleVerifyDocument(documentId);
            setShowPreview(false);
          }}
          onReject={(documentId) => {
            handleRejectDocument(documentId, { reason: 'Rejected from preview' });
            setShowPreview(false);
          }}
          aiAnalysis={selectedDocument.aiAnalysis}
        />
      )}

      {/* Document Verification Modal */}
      {showVerification && selectedDocument && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Document Verification
                  </h3>
                  <button
                    onClick={() => {
                      setShowVerification(false);
                      setSelectedDocument(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <DocumentVerification
                      document={selectedDocument}
                      onVerify={handleVerifyDocument}
                      onReject={handleRejectDocument}
                      onFlagForReview={handleFlagForReview}
                      verificationHistory={verificationHistory}
                      isLoading={isLoading}
                    />
                  </div>
                  <div>
                    <DocumentPreview
                      document={selectedDocument}
                      showActions={false}
                      aiAnalysis={selectedDocument.aiAnalysis}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Comparison Modal */}
      {showComparison && documentComparison && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Document Comparison Results
                  </h3>
                  <button
                    onClick={() => {
                      setShowComparison(false);
                      setDocumentComparison(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Similarity Score</h4>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${documentComparison.similarityScore}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-blue-900">
                        {documentComparison.similarityScore}%
                      </span>
                    </div>
                  </div>

                  {documentComparison.differences && documentComparison.differences.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Differences Found</h4>
                      <ul className="space-y-2">
                        {documentComparison.differences.map((diff, index) => (
                          <li key={index} className="p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-800">{diff.field}: {diff.value1} vs {diff.value2}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {documentComparison.matches && documentComparison.matches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Matching Information</h4>
                      <ul className="space-y-2">
                        {documentComparison.matches.map((match, index) => (
                          <li key={index} className="p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-800">{match.field}: {match.value}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorKYCPage;