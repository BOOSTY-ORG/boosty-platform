import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import CommunicationTemplate from './CommunicationTemplate.jsx';

const NewCommunicationModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userId 
}) => {
  const { currentUser } = useUser();
  
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'email',
    recipient: '',
    subject: '',
    content: '',
    priority: 'medium',
    category: 'general',
    scheduledAt: '',
    templateId: null,
    variables: {},
    attachments: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData(prev => ({
        ...prev,
        recipient: currentUser.email || currentUser.phone || ''
      }));
    }
  }, [isOpen, currentUser]);

  const resetForm = () => {
    setFormData({
      type: 'email',
      recipient: currentUser?.email || currentUser?.phone || '',
      subject: '',
      content: '',
      priority: 'medium',
      category: 'general',
      scheduledAt: '',
      templateId: null,
      variables: {},
      attachments: []
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      subject: template.subject || '',
      content: template.content || '',
      priority: template.priority,
      category: template.category,
      templateId: template._id,
      variables: {}
    }));
    setShowTemplateModal(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.recipient.trim()) {
      newErrors.recipient = 'Recipient is required';
    }

    if (formData.type === 'email' && !formData.subject.trim()) {
      newErrors.subject = 'Subject is required for email communications';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    // Validate email format for email type
    if (formData.type === 'email' && formData.recipient) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.recipient)) {
        newErrors.recipient = 'Invalid email address';
      }
    }

    // Validate phone format for SMS type
    if (formData.type === 'sms' && formData.recipient) {
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(formData.recipient)) {
        newErrors.recipient = 'Invalid phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submissionData = {
        ...formData,
        userId,
        // Convert scheduledAt to Date object if provided
        ...(formData.scheduledAt && { scheduledAt: new Date(formData.scheduledAt) })
      };

      await onSubmit(submissionData);
      handleClose();
    } catch (error) {
      console.error('Error sending communication:', error);
      setErrors({ submit: error.message || 'Failed to send communication' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleVariableChange = (variable, value) => {
    setFormData(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [variable]: value
      }
    }));
  };

  const getAvailableVariables = () => {
    const variables = [];
    
    if (currentUser) {
      variables.push(
        { name: 'firstName', value: currentUser.firstName },
        { name: 'lastName', value: currentUser.lastName },
        { name: 'email', value: currentUser.email },
        { name: 'phone', value: currentUser.phone },
        { name: 'userId', value: currentUser._id },
        { name: 'status', value: currentUser.status },
        { name: 'applicationStatus', value: currentUser.applicationStatus }
      );
    }

    return variables;
  };

  const communicationTypes = [
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'sms', label: 'SMS', icon: '💬' },
    { value: 'in_app', label: 'In-App', icon: '🔔' },
    { value: 'push_notification', label: 'Push Notification', icon: '📱' }
  ];

  const communicationCategories = [
    { value: 'welcome', label: 'Welcome' },
    { value: 'application', label: 'Application' },
    { value: 'kyc', label: 'KYC' },
    { value: 'payment', label: 'Payment' },
    { value: 'support', label: 'Support' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'general', label: 'General' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Send New Communication"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              variant="secondary"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Use Template
            </Button>
          </div>

          {/* Communication Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Communication Type
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {communicationTypes.map(type => (
                <label
                  key={type.value}
                  className={`
                    relative flex cursor-pointer rounded-lg border p-4 focus:outline-none
                    ${formData.type === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <span className="text-2xl">{type.icon}</span>
                    <p className="mt-1 text-sm font-medium">{type.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
              Recipient
            </label>
            <input
              type="text"
              id="recipient"
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.recipient ? 'border-red-500' : ''
              }`}
              value={formData.recipient}
              onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
              placeholder={
                formData.type === 'email' ? 'Enter email address' : 
                formData.type === 'sms' ? 'Enter phone number' : 
                'Enter recipient'
              }
            />
            {errors.recipient && (
              <p className="mt-1 text-sm text-red-600">{errors.recipient}</p>
            )}
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {communicationCategories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject (for email) */}
          {formData.type === 'email' && (
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                  errors.subject ? 'border-red-500' : ''
                }`}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter email subject"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
              )}
            </div>
          )}

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Message Content
            </label>
            <textarea
              id="content"
              rows={6}
              className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                errors.content ? 'border-red-500' : ''
              }`}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter your message content. Use {{variable}} for dynamic content."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Use {'{{variable}}'} syntax for dynamic content (e.g., {'{{firstName}}'}, {'{{applicationId}}'})
            </p>
          </div>

          {/* Variables */}
          {formData.content && formData.content.includes('{{') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Variables
              </label>
              <div className="space-y-2">
                {getAvailableVariables().map(variable => (
                  <div key={variable.name} className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 w-24">
                      {'{{' + variable.name + '}}'}:
                    </span>
                    <input
                      type="text"
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      value={formData.variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={`Default: ${variable.value || ''}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div>
            <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
              Schedule (Optional)
            </label>
            <input
              type="datetime-local"
              id="scheduledAt"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to send immediately, or select a future date/time to schedule.
            </p>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Attachments
            </label>
            <div className="mt-1">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errors.submit}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isSubmitting ? 'Sending...' : 'Send Communication'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Template Modal */}
      <CommunicationTemplate
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleTemplateSelect}
        userId={userId}
      />
    </>
  );
};

export default NewCommunicationModal;