import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { validateInvestorField } from '../../utils/investorValidation.js';

const KYCRequirementsForm = ({ 
  data, 
  onChange, 
  errors = {}, 
  onFieldBlur, 
  disabled = false,
  showValidation = true 
}) => {
  const [touched, setTouched] = useState({});

  // Handle field changes
  const handleChange = (field, value) => {
    const newData = { ...data, [field]: value };
    onChange(newData);
    
    // Real-time validation if enabled
    if (showValidation && touched[field]) {
      const validation = validateInvestorField(field, value);
      if (!validation.isValid && onFieldBlur) {
        onFieldBlur(field, validation.message);
      }
    }
  };

  // Handle field blur
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    if (showValidation && onFieldBlur) {
      const validation = validateInvestorField(field, data[field]);
      onFieldBlur(field, validation.message);
    }
  };

  // Handle file uploads
  const handleFileChange = (field, file) => {
    handleChange(field, file);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File upload component
  const FileUpload = ({ field, label, required = true, accept = 'image/*,.pdf', maxSize = 5 * 1024 * 1024 }) => {
    const file = data[field];
    const error = errors[field];

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor={`${field}-upload`}
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>Upload a file</span>
                <input
                  id={`${field}-upload`}
                  name={field}
                  type="file"
                  className="sr-only"
                  accept={accept}
                  onChange={(e) => handleFileChange(field, e.target.files[0])}
                  disabled={disabled}
                  onBlur={() => handleBlur(field)}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">
              PNG, JPG, PDF up to {formatFileSize(maxSize)}
            </p>
          </div>
        </div>

        {file && (
          <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-700">{file.name}</span>
              <span className="text-xs text-gray-500 ml-2">({formatFileSize(file.size)})</span>
            </div>
            <button
              type="button"
              onClick={() => handleChange(field, null)}
              disabled={disabled}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Remove
            </button>
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">KYC Requirements</h3>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Identity Verification Required</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>To comply with regulatory requirements, we need to verify your identity. Please upload the following documents:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Valid government-issued ID (Passport, Driver's License, or National ID)</li>
                <li>Proof of address (Utility bill, bank statement, or government correspondence)</li>
                <li>Optional: Bank statement for investment verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FileUpload
          field="idDocument"
          label="Government-issued ID"
          required={true}
          accept="image/*,.pdf"
          maxSize={5 * 1024 * 1024}
        />
        
        <FileUpload
          field="proofOfAddress"
          label="Proof of Address"
          required={true}
          accept="image/*,.pdf"
          maxSize={5 * 1024 * 1024}
        />
      </div>

      <FileUpload
        field="bankStatement"
        label="Bank Statement (Optional)"
        required={false}
        accept="image/*,.pdf"
        maxSize={5 * 1024 * 1024}
      />

      <div className="space-y-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="kycDeclaration"
            name="kycDeclaration"
            checked={data.kycDeclaration || false}
            onChange={(e) => handleChange('kycDeclaration', e.target.checked)}
            onBlur={() => handleBlur('kycDeclaration')}
            disabled={disabled}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="ml-3">
            <label htmlFor="kycDeclaration" className="text-sm font-medium text-gray-700">
              KYC Declaration <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500">
              I declare that the information provided is true and accurate. I understand that providing false information may result in legal consequences.
            </p>
          </div>
        </div>
        {errors.kycDeclaration && (
          <p className="mt-1 text-sm text-red-600">{errors.kycDeclaration}</p>
        )}

        <div className="flex items-start">
          <input
            type="checkbox"
            id="consentToDataProcessing"
            name="consentToDataProcessing"
            checked={data.consentToDataProcessing || false}
            onChange={(e) => handleChange('consentToDataProcessing', e.target.checked)}
            onBlur={() => handleBlur('consentToDataProcessing')}
            disabled={disabled}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="ml-3">
            <label htmlFor="consentToDataProcessing" className="text-sm font-medium text-gray-700">
              Consent to Data Processing <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500">
              I consent to the processing of my personal data for identity verification and regulatory compliance purposes. I understand my data will be stored securely and used only for legitimate business purposes.
            </p>
          </div>
        </div>
        {errors.consentToDataProcessing && (
          <p className="mt-1 text-sm text-red-600">{errors.consentToDataProcessing}</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Document Security</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your documents are protected with:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>End-to-end encryption</li>
                <li>Secure storage on compliant servers</li>
                <li>Restricted access to authorized personnel only</li>
                <li>Automatic deletion after verification period</li>
                <li>Compliance with data protection regulations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

KYCRequirementsForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  onFieldBlur: PropTypes.func,
  disabled: PropTypes.bool,
  showValidation: PropTypes.bool,
};

export default KYCRequirementsForm;