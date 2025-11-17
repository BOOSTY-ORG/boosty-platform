import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal';
import { investorsAPI } from '../../api/investors';

/**
 * BulkCommunicationModal component for sending bulk communications to investors
 */
const BulkCommunicationModal = ({ 
  isOpen, 
  onClose, 
  investorIds, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
  const [communicationType, setCommunicationType] = useState('email');
  const [template, setTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [errors, setErrors] = useState({});
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedInvestors, setSelectedInvestors] = useState([]);

  // Communication templates
  const templates = {
    custom: { subject: '', message: '' },
    kyc_reminder: { 
      subject: 'Action Required: Complete Your KYC Verification', 
      message: 'Dear {firstName},\n\nWe noticed that your KYC verification is still pending. Please complete your verification process to continue investing with us.\n\nLog in to your account to upload your documents.\n\nBest regards,\nBoosty Team' 
    },
    investment_update: { 
      subject: 'Your Investment Portfolio Update', 
      message: 'Dear {firstName},\n\nHere is your latest investment portfolio update:\n\n- Total Investment: {totalInvestment}\n- Current Value: {currentValue}\n- Returns: {returns}\n\nLog in to your dashboard for detailed insights.\n\nBest regards,\nBoosty Team' 
    },
    new_opportunity: { 
      subject: 'New Investment Opportunity Available', 
      message: 'Dear {firstName},\n\nWe are excited to announce a new investment opportunity that matches your profile:\n\n{opportunityDetails}\n\nThis opportunity is available for a limited time. Log in to your account to learn more and invest.\n\nBest regards,\nBoosty Team' 
    },
    maintenance_notice: { 
      subject: 'Scheduled Maintenance Notice', 
      message: 'Dear {firstName},\n\nWe will be performing scheduled maintenance on our platform:\n\nDate: {maintenanceDate}\nTime: {maintenanceTime}\nDuration: {duration}\n\nDuring this time, some services may be temporarily unavailable. We apologize for any inconvenience.\n\nBest regards,\nBoosty Team' 
    }
  };

  // Fetch investor details for preview
  useEffect(() => {
    if (isOpen && investorIds.length > 0) {
      // In a real implementation, you would fetch investor details
      // For now, we'll use placeholder data
      setSelectedInvestors(investorIds.slice(0, 3).map(id => ({
        _id: id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      })));
    }
  }, [isOpen, investorIds]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCommunicationType('email');
      setTemplate('custom');
      setSubject('');
      setMessage('');
      setSendImmediately(true);
      setScheduledDate('');
      setScheduledTime('09:00');
      setErrors({});
      setPreviewMode(false);
    }
  }, [isOpen]);

  const handleTemplateChange = (templateName) => {
    setTemplate(templateName);
    const selectedTemplate = templates[templateName];
    setSubject(selectedTemplate.subject);
    setMessage(selectedTemplate.message);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!message.trim()) {
      newErrors.message = 'Message is required';
    }
    
    if (!sendImmediately && (!scheduledDate || !scheduledTime)) {
      newErrors.schedule = 'Please provide both date and time for scheduled sending';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const communicationData = {
        investorIds,
        type: communicationType,
        subject,
        message,
        template,
        sendImmediately,
        scheduledDateTime: sendImmediately ? null : `${scheduledDate}T${scheduledTime}:00Z`
      };
      
      const response = await investorsAPI.bulkSendCommunication(communicationData);
      
      onSuccess && onSuccess({
        message: `Communication sent to ${investorIds.length} investor(s)`,
        type: communicationType,
        sentCount: investorIds.length,
        response
      });
      
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send communication';
      setErrors({ general: errorMessage });
      onError && onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onClose();
    }
  };

  const togglePreview = () => {
    if (!previewMode && validateForm()) {
      setPreviewMode(true);
    } else {
      setPreviewMode(false);
    }
  };

  const renderPreview = () => {
    if (!previewMode || selectedInvestors.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Preview (showing first 3 investors)</h4>
        {selectedInvestors.map((investor, index) => (
          <div key={index} className="border border-gray-200 rounded-md p-3">
            <div className="text-sm font-medium text-gray-900 mb-1">
              To: {investor.firstName} {investor.lastName} ({communicationType === 'email' ? investor.email : investor.phone})
            </div>
            <div className="text-sm font-medium text-gray-700 mb-1">Subject: {subject}</div>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {message.replace(/{firstName}/g, investor.firstName)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Send Communication - ${investorIds.length} Investor${investorIds.length > 1 ? 's' : ''}`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{errors.general}</div>
          </div>
        )}
        
        {/* Communication Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Communication Type
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="email"
                checked={communicationType === 'email'}
                onChange={(e) => setCommunicationType(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Email</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="type"
                value="sms"
                checked={communicationType === 'sms'}
                onChange={(e) => setCommunicationType(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">SMS</span>
            </label>
          </div>
        </div>
        
        {/* Template Selection */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
            Template
          </label>
          <select
            id="template"
            value={template}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="custom">Custom Message</option>
            <option value="kyc_reminder">KYC Reminder</option>
            <option value="investment_update">Investment Update</option>
            <option value="new_opportunity">New Opportunity</option>
            <option value="maintenance_notice">Maintenance Notice</option>
          </select>
        </div>
        
        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject {communicationType === 'email' ? '*' : '(SMS only)'}
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
          )}
        </div>
        
        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message *
          </label>
          <textarea
            id="message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message... Use {firstName} as placeholder for investor's first name"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Available placeholders: {'{firstName}'}, {'{lastName}'}, {'{totalInvestment}'}, {'{currentValue}'}, {'{returns}'}
          </p>
        </div>
        
        {/* Scheduling Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Send Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="sendOption"
                value="immediate"
                checked={sendImmediately}
                onChange={() => setSendImmediately(true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Send immediately</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="sendOption"
                value="scheduled"
                checked={!sendImmediately}
                onChange={() => setSendImmediately(false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
            </label>
          </div>
          
          {!sendImmediately && (
            <div className="mt-3 flex space-x-3">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          )}
          {errors.schedule && (
            <p className="mt-1 text-sm text-red-600">{errors.schedule}</p>
          )}
        </div>
        
        {/* Preview Section */}
        {previewMode && renderPreview()}
        
        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <div className="space-x-3">
            <button
              type="button"
              onClick={togglePreview}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {previewMode ? 'Hide Preview' : 'Show Preview'}
            </button>
          </div>
          
          <div className="space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : `Send to ${investorIds.length} Investor${investorIds.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

BulkCommunicationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  investorIds: PropTypes.array.isRequired,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default BulkCommunicationModal;