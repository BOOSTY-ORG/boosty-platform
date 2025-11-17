import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import PersonalInfoForm from './PersonalInfoForm.jsx';
import FinancialInfoForm from './FinancialInfoForm.jsx';
import InvestmentPreferencesForm from './InvestmentPreferencesForm.jsx';
import KYCRequirementsForm from './KYCRequirementsForm.jsx';
import { useNotification } from '../common/Notification.jsx';
import { 
  validatePersonalInfo,
  validateFinancialInfo,
  validateInvestmentPreferences,
  validateKYCRequirements,
  validateInvestorForm,
  saveDraftToLocalStorage,
  loadDraftFromLocalStorage,
  clearDraftFromLocalStorage,
  applyInvestorTemplate,
  INVESTOR_TEMPLATES
} from '../../utils/investorValidation.js';
import { investorsAPI } from '../../api/investors.js';

const InvestorWizard = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialData = {}
}) => {
  const { showNotification } = useNotification();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: '',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
    
    // Financial Information
    annualIncome: '',
    netWorth: '',
    investmentAmount: '',
    investmentFrequency: '',
    sourceOfFunds: '',
    taxIdentification: '',
    
    // Investment Preferences
    riskTolerance: '',
    investmentGoals: [],
    investmentDuration: '',
    preferredSectors: [],
    expectedReturn: '',
    
    // KYC Requirements
    idDocument: null,
    proofOfAddress: null,
    bankStatement: null,
    kycDeclaration: false,
    consentToDataProcessing: false,
    
    ...initialData
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Wizard steps
  const steps = [
    { 
      id: 'welcome', 
      title: 'Welcome', 
      component: null,
      description: 'Let\'s get started with creating your investor profile'
    },
    { 
      id: 'personal', 
      title: 'Personal Information', 
      component: PersonalInfoForm,
      description: 'Tell us about yourself'
    },
    { 
      id: 'financial', 
      title: 'Financial Information', 
      component: FinancialInfoForm,
      description: 'Your financial details help us recommend suitable investments'
    },
    { 
      id: 'preferences', 
      title: 'Investment Preferences', 
      component: InvestmentPreferencesForm,
      description: 'Your investment goals and risk preferences'
    },
    { 
      id: 'kyc', 
      title: 'KYC Requirements', 
      component: KYCRequirementsForm,
      description: 'Complete identity verification for regulatory compliance'
    },
    { 
      id: 'review', 
      title: 'Review & Submit', 
      component: null,
      description: 'Review your information before submitting'
    }
  ];

  // Load draft on component mount
  useEffect(() => {
    if (isOpen) {
      const draft = loadDraftFromLocalStorage();
      if (draft) {
        setFormData(prevData => ({ ...prevData, ...draft }));
        setIsDraft(true);
      }
    }
  }, [isOpen]);

  // Auto-save draft
  useEffect(() => {
    if (isOpen && touched) {
      const timer = setTimeout(() => {
        saveDraftToLocalStorage(formData);
        setIsDraft(true);
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [formData, isOpen, touched]);

  // Handle form data changes
  const handleDataChange = (newData) => {
    setFormData(newData);
    setTouched(prev => ({ ...prev, [currentStep]: true }));
  };

  // Handle field blur for validation
  const handleFieldBlur = (fieldName, errorMessage) => {
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  // Validate current step
  const validateCurrentStep = () => {
    let stepErrors = {};
    const stepId = steps[currentStep].id;

    switch (stepId) {
      case 'personal':
        stepErrors = validatePersonalInfo(formData);
        break;
      case 'financial':
        stepErrors = validateFinancialInfo(formData);
        break;
      case 'preferences':
        stepErrors = validateInvestmentPreferences(formData);
        break;
      case 'kyc':
        stepErrors = validateKYCRequirements(formData);
        break;
      default:
        stepErrors = {};
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Validate entire form
  const validateEntireForm = () => {
    const validationErrors = validateInvestorForm(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateCurrentStep() || currentStep === 0) { // Welcome step doesn't need validation
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle step click (for step navigation)
  const handleStepClick = (stepIndex) => {
    // Only allow navigation to previous steps or if current step is valid
    if (stepIndex < currentStep || validateCurrentStep()) {
      setCurrentStep(stepIndex);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      if (!validateEntireForm()) {
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data for API submission
      const submissionData = {
        ...formData,
        // Convert currency strings to numbers
        annualIncome: formData.annualIncome ? parseFloat(formData.annualIncome.replace(/[^0-9.]/g, '')) : 0,
        netWorth: formData.netWorth ? parseFloat(formData.netWorth.replace(/[^0-9.]/g, '')) : 0,
        investmentAmount: formData.investmentAmount ? parseFloat(formData.investmentAmount.replace(/[^0-9.]/g, '')) : 0,
        expectedReturn: formData.expectedReturn ? parseFloat(formData.expectedReturn) : 0,
        
        // Handle file uploads
        documents: {
          idDocument: formData.idDocument,
          proofOfAddress: formData.proofOfAddress,
          bankStatement: formData.bankStatement,
        },
        
        // Add metadata
        status: 'pending', // New investors start as pending
        kycStatus: 'not_submitted',
        createdAt: new Date().toISOString(),
      };

      // Create investor via API
      const response = await investorsAPI.createInvestor(submissionData);
      
      // Clear draft on successful submission
      clearDraftFromLocalStorage();
      
      // Show success notification
      showNotification({
        type: 'success',
        message: `Investor ${formData.firstName} ${formData.lastName} has been created successfully!`,
        duration: 5000,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(response);
      }

      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Failed to create investor:', error);
      
      // Show error notification
      showNotification({
        type: 'error',
        message: error.message || 'Failed to create investor. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle template selection
  const handleTemplateChange = (templateType) => {
    setSelectedTemplate(templateType);
    const updatedData = applyInvestorTemplate(formData, templateType);
    setFormData(updatedData);
  };

  // Handle draft clear
  const handleClearDraft = () => {
    clearDraftFromLocalStorage();
    setIsDraft(false);
  };

  // Render current step content
  const renderStepContent = () => {
    const step = steps[currentStep];
    const StepComponent = step.component;

    switch (step.id) {
      case 'welcome':
        return (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="mx-auto h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-12 w-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Boosty Investor Portal
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                We're excited to help you start your investment journey. This wizard will guide you through creating your investor profile in just a few minutes.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium text-blue-900 mb-4">What we'll collect:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Personal Information</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Name and contact details</li>
                      <li>• Address information</li>
                      <li>• Date of birth</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Financial Details</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Income and net worth</li>
                      <li>• Investment amount</li>
                      <li>• Source of funds</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Investment Goals</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Risk tolerance</li>
                      <li>• Investment preferences</li>
                      <li>• Expected returns</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">KYC Documents</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Government ID</li>
                      <li>• Proof of address</li>
                      <li>• Bank statement</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium text-green-900 mb-2">Quick Start Templates</h3>
                <p className="text-sm text-green-700 mb-4">
                  Choose a template to pre-fill your investment preferences:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(INVESTOR_TEMPLATES).map(([key, template]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateChange(key)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        selectedTemplate === key
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h4 className="font-medium text-gray-900 capitalize">
                        {key.replace('_', ' ')} Investor
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {key === 'conservative' && 'Low risk, stable returns'}
                        {key === 'balanced' && 'Moderate risk and returns'}
                        {key === 'aggressive' && 'High risk, high returns'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                className="px-8"
              >
                Get Started
              </Button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Your Information</h3>
            <p className="text-sm text-gray-600">
              Please review all the information you've provided before submitting.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Name:</dt>
                    <dd className="text-gray-600">{formData.firstName} {formData.lastName}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Email:</dt>
                    <dd className="text-gray-600">{formData.email}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Phone:</dt>
                    <dd className="text-gray-600">{formData.phone}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Address:</dt>
                    <dd className="text-gray-600">
                      {formData.address?.street}<br />
                      {formData.address?.city}, {formData.address?.state} {formData.address?.postalCode}<br />
                      {formData.address?.country}
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Financial Information</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Annual Income:</dt>
                    <dd className="text-gray-600">${formData.annualIncome}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Net Worth:</dt>
                    <dd className="text-gray-600">${formData.netWorth}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Investment Amount:</dt>
                    <dd className="text-gray-600">${formData.investmentAmount}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Investment Frequency:</dt>
                    <dd className="text-gray-600">{formData.investmentFrequency}</dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Investment Preferences</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Risk Tolerance:</dt>
                    <dd className="text-gray-600 capitalize">{formData.riskTolerance}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Investment Duration:</dt>
                    <dd className="text-gray-600 capitalize">{formData.investmentDuration?.replace('_', ' ')}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Investment Goals:</dt>
                    <dd className="text-gray-600">
                      {formData.investmentGoals?.map(goal => goal.replace('_', ' ')).join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Expected Return:</dt>
                    <dd className="text-gray-600">{formData.expectedReturn}%</dd>
                  </div>
                </dl>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">KYC Documents</h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">ID Document:</dt>
                    <dd className="text-gray-600">
                      {formData.idDocument ? formData.idDocument.name : 'Not uploaded'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Proof of Address:</dt>
                    <dd className="text-gray-600">
                      {formData.proofOfAddress ? formData.proofOfAddress.name : 'Not uploaded'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Bank Statement:</dt>
                    <dd className="text-gray-600">
                      {formData.bankStatement ? formData.bankStatement.name : 'Not uploaded'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Declaration</h4>
              <p className="text-sm text-yellow-800">
                By submitting this form, you confirm that all information provided is accurate and complete. 
                You understand that providing false information may result in legal consequences.
              </p>
            </div>
          </div>
        );

      default:
        return StepComponent ? (
          <StepComponent
            data={formData}
            onChange={handleDataChange}
            errors={errors}
            onFieldBlur={handleFieldBlur}
            disabled={isSubmitting}
            showValidation={true}
          />
        ) : null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Investor Onboarding Wizard"
      size="full"
      showCloseButton={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <div className="h-full flex flex-col">
        {/* Step indicator */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, stepIdx) => (
                <li
                  key={step.id}
                  className={`${
                    stepIdx !== steps.length - 1 ? 'flex-1' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => handleStepClick(stepIdx)}
                      disabled={stepIdx > currentStep}
                      className={`relative flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        stepIdx < currentStep
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : stepIdx === currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500 hover:text-gray-700'
                      } ${stepIdx > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {stepIdx < currentStep ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        stepIdx + 1
                      )}
                    </button>
                    <div className="ml-3 min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium ${
                          stepIdx === currentStep
                            ? 'text-blue-600'
                            : stepIdx < currentStep
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ${
                        stepIdx < currentStep ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </nav>
          
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
            </p>
            {isDraft && (
              <div className="flex items-center text-sm text-yellow-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Draft saved
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="ml-2 text-yellow-700 underline hover:text-yellow-800"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between">
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div className="space-x-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Save Draft & Exit
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

InvestorWizard.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  initialData: PropTypes.object,
};

export default InvestorWizard;