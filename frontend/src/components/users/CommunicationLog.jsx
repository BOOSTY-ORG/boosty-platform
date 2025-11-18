import React, { useState } from 'react';
import { formatDate } from '../../utils/formatters.js';

const CommunicationLog = ({ 
  communication, 
  getStatusColor, 
  getTypeIcon, 
  onSort, 
  sortBy, 
  sortDirection 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleSort = (field) => {
    if (onSort) {
      onSort(field);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'welcome':
        return 'bg-blue-100 text-blue-800';
      case 'application':
        return 'bg-purple-100 text-purple-800';
      case 'kyc':
        return 'bg-indigo-100 text-indigo-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'support':
        return 'bg-orange-100 text-orange-800';
      case 'marketing':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-start space-x-3">
        {/* Communication Type Icon */}
        <div className="flex-shrink-0">
          <div className={`p-2 rounded-full ${
            communication.type === 'email' ? 'bg-blue-100 text-blue-600' :
            communication.type === 'sms' ? 'bg-green-100 text-green-600' :
            communication.type === 'in_app' ? 'bg-purple-100 text-purple-600' :
            communication.type === 'push_notification' ? 'bg-orange-100 text-orange-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {getTypeIcon(communication.type)}
          </div>
        </div>

        {/* Communication Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {communication.subject || communication.type}
              </h4>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(communication.status)}`}>
                {communication.status}
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(communication.priority)}`}>
                {communication.priority}
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(communication.category)}`}>
                {communication.category}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-primary-600 hover:text-primary-900"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
          </div>

          <div className="mt-1">
            <p className="text-sm text-gray-600 line-clamp-2">
              {communication.content || communication.message}
            </p>
          </div>

          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <span>
              <svg className="inline h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(communication.createdAt)}
            </span>
            {communication.deliveredAt && (
              <span>
                <svg className="inline h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Delivered: {formatDate(communication.deliveredAt)}
              </span>
            )}
            {communication.readAt && (
              <span>
                <svg className="inline h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Read: {formatDate(communication.readAt)}
              </span>
            )}
            <span>
              <svg className="inline h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {communication.sentBy || 'System'}
            </span>
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Communication Details</h5>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Type:</dt>
                      <dd className="text-sm text-gray-900 capitalize">{communication.type.replace('_', ' ')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Status:</dt>
                      <dd className="text-sm text-gray-900 capitalize">{communication.status}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Priority:</dt>
                      <dd className="text-sm text-gray-900 capitalize">{communication.priority}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Category:</dt>
                      <dd className="text-sm text-gray-900 capitalize">{communication.category}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Delivery Information</h5>
                  <dl className="space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Recipient:</dt>
                      <dd className="text-sm text-gray-900">{communication.recipient}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Created:</dt>
                      <dd className="text-sm text-gray-900">{formatDate(communication.createdAt)}</dd>
                    </div>
                    {communication.sentAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Sent:</dt>
                        <dd className="text-sm text-gray-900">{formatDate(communication.sentAt)}</dd>
                      </div>
                    )}
                    {communication.deliveredAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Delivered:</dt>
                        <dd className="text-sm text-gray-900">{formatDate(communication.deliveredAt)}</dd>
                      </div>
                    )}
                    {communication.readAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500">Read:</dt>
                        <dd className="text-sm text-gray-900">{formatDate(communication.readAt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {communication.template && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Template Information</h5>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">{communication.template.name}</span>
                      <span className="text-xs text-gray-500">ID: {communication.template.id}</span>
                    </div>
                    {communication.template.description && (
                      <p className="mt-1 text-sm text-gray-600">{communication.template.description}</p>
                    )}
                  </div>
                </div>
              )}

              {communication.metadata && Object.keys(communication.metadata).length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Additional Metadata</h5>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(communication.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {communication.error && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-red-900 mb-2">Error Information</h5>
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-sm text-red-800">{communication.error}</p>
                  </div>
                </div>
              )}

              {communication.attachments && communication.attachments.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Attachments</h5>
                  <div className="space-y-2">
                    {communication.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-sm text-gray-900">{attachment.name}</span>
                          <span className="text-xs text-gray-500">({attachment.size})</span>
                        </div>
                        <button className="text-primary-600 hover:text-primary-900 text-sm">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunicationLog;