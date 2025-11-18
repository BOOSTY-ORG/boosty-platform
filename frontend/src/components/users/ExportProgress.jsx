import React, { useState, useEffect } from 'react';
import { Modal, Button, useNotification } from '../common/index.js';
import { usersAPI } from '../../api/users.js';

const ExportProgress = ({ isOpen, onClose, exportId, onComplete }) => {
  const { showNotification } = useNotification();
  const [exportStatus, setExportStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [error, setError] = useState(null);

  // Poll for export status when modal is open
  useEffect(() => {
    if (isOpen && exportId) {
      setIsPolling(true);
      const interval = setInterval(async () => {
        try {
          const response = await usersAPI.getExportStatus(exportId);
          const status = response.data;
          
          setExportStatus(status);
          setProgress(status.progress || 0);
          setProcessedRecords(status.processedRecords || 0);
          setTotalRecords(status.totalRecords || 0);
          setCurrentStage(status.currentStage || '');
          setEstimatedTimeRemaining(status.estimatedTimeRemaining || null);
          
          if (status.status === 'completed') {
            setIsPolling(false);
            clearInterval(interval);
            if (onComplete) {
              onComplete(status);
            }
            showNotification({
              type: 'success',
              message: 'Export completed successfully!'
            });
          } else if (status.status === 'failed') {
            setIsPolling(false);
            clearInterval(interval);
            setError(status.error || 'Export failed');
            showNotification({
              type: 'error',
              message: 'Export failed. Please try again.'
            });
          } else if (status.status === 'cancelled') {
            setIsPolling(false);
            clearInterval(interval);
            showNotification({
              type: 'info',
              message: 'Export was cancelled'
            });
          }
        } catch (error) {
          console.error('Failed to fetch export status:', error);
          if (error.response?.status === 404) {
            setIsPolling(false);
            clearInterval(interval);
            setError('Export not found');
          }
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen, exportId, onComplete, showNotification]);

  const handleCancelExport = async () => {
    try {
      await usersAPI.cancelExport(exportId);
      setIsPolling(false);
      showNotification({
        type: 'info',
        message: 'Export cancelled successfully'
      });
      onClose();
    } catch (error) {
      console.error('Failed to cancel export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to cancel export'
      });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await usersAPI.downloadExportFile(exportId);
      
      // Create download link
      const blob = new Blob([response.data], {
        type: getContentType(exportStatus.format)
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', exportStatus.fileName || `export_${exportId}.${exportStatus.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showNotification({
        type: 'success',
        message: 'Download started'
      });
    } catch (error) {
      console.error('Failed to download export:', error);
      showNotification({
        type: 'error',
        message: 'Failed to download export file'
      });
    }
  };

  const getContentType = (format) => {
    switch (format) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds) return 'Unknown';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500';
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressColor = (status) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Progress"
      size="lg"
      closeOnOverlayClick={false}
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(exportStatus?.status)} animate-pulse`}></div>
            <h3 className="text-lg font-medium text-gray-900 capitalize">
              {exportStatus?.status || 'Loading...'}
            </h3>
          </div>
          {exportStatus?.createdAt && (
            <span className="text-sm text-gray-500">
              Started: {new Date(exportStatus.createdAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(exportStatus?.status)}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Current Stage */}
        {currentStage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Current Stage:</span> {currentStage}
            </p>
          </div>
        )}

        {/* Records Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">Records Processed</p>
            <p className="text-2xl font-bold text-gray-900">{processedRecords.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{totalRecords.toLocaleString()}</p>
          </div>
        </div>

        {/* Time Information */}
        <div className="flex items-center justify-between">
          <div>
            {estimatedTimeRemaining && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Estimated time remaining:</span>{' '}
                {formatTimeRemaining(estimatedTimeRemaining)}
              </p>
            )}
          </div>
          <div>
            {exportStatus?.completedAt && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Completed:</span>{' '}
                {new Date(exportStatus.completedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <span className="font-medium">Error:</span> {error}
            </p>
          </div>
        )}

        {/* Export Details */}
        {exportStatus && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Export Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Format:</span> {exportStatus.format?.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">Scope:</span> {exportStatus.scope}
              </div>
              <div>
                <span className="font-medium">File Size:</span> {exportStatus.fileSize ? `${(exportStatus.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Processing...'}
              </div>
              <div>
                <span className="font-medium">File Name:</span> {exportStatus.fileName || 'Generating...'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        {exportStatus?.status === 'processing' && (
          <Button
            variant="secondary"
            onClick={handleCancelExport}
          >
            Cancel Export
          </Button>
        )}
        
        {exportStatus?.status === 'completed' && (
          <Button
            variant="primary"
            onClick={handleDownload}
          >
            Download File
          </Button>
        )}
        
        {exportStatus?.status === 'failed' && (
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        )}
        
        {exportStatus?.status === 'cancelled' && (
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default ExportProgress;