import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Button from '../common/Button.jsx';
import PersonalInfoForm from './PersonalInfoForm.jsx';
import FinancialInfoForm from './FinancialInfoForm.jsx';
import InvestmentPreferencesForm from './InvestmentPreferencesForm.jsx';
import KYCRequirementsForm from './KYCRequirementsForm.jsx';
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

const InvestorForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  isEditing = false,
  isLoading = false,
  showSteps = true,
  autoSave = true,
  investorId = null
}) => {
  // Form steps
  const steps = [
    { id: 'personal', title: 'Personal Information', component: PersonalInfoForm },
    { id: 'financial', title: 'Financial Information', component: FinancialInfoForm },
    { id: 'preferences', title: 'Investment Preferences', component: InvestmentPreferencesForm },
    { id: 'kyc', title: 'KYC Requirements', component: KYCRequirementsForm }
  ];

  // Initialize form state
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
  const [isDraft, setIsDraft] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Load draft on component mount
  useEffect(() => {
    if (!isEditing && autoSave) {
      const draft = loadDraftFromLocalStorage(investorId);
      if (draft) {
        setFormData(prevData => ({ ...prevData, ...draft }));
        setIsDraft(true);
      }
    }
  }, [isEditing, autoSave, investorId]);

  // Auto-save draft
  useEffect(() => {
    if (autoSave && !isEditing && touched) {
      const timer = setTimeout(() => {
        saveDraftToLocalStorage(formData, investorId);
        setIsDraft(true);
      }, 2000); // Save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [formData, autoSave, isEditing, investorId, touched]);

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
    if (validateCurrentStep()) {
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
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateEntireForm()) {
      // Clear draft on successful submission
      if (autoSave && !isEditing) {
        clearDraftFromLocalStorage(investorId);
      }
      
      onSubmit(formData);
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
    clearDraftFromLocalStorage(investorId);
    setIsDraft(false);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step indicator */}
      {showSteps && (
        <div className="bg-white shadow rounded-lg p-6">
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
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                        stepIdx < currentStep
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : stepIdx === currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500 hover:text-gray-700'
                      } ${stepIdx > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {stepIdx < currentStep ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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
                    <div className="ml-4 min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
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
        </div>
      )}

      {/* Draft notification */}
      {isDraft && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Draft Saved</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Your progress has been saved automatically.</p>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-yellow-800 underline hover:text-yellow-900"
                >
                  Clear draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template selector (only for new investors) */}
      {!isEditing && currentStep === 2 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(INVESTOR_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTemplateChange(key)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedTemplate === key
                    ? 'border-blue-500 bg-blue-50'
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
      )}

      {/* Current step form */}
      <div className="bg-white shadow rounded-lg p-6">
        <CurrentStepComponent
          data={formData}
          onChange={handleDataChange}
          errors={errors}
          onFieldBlur={handleFieldBlur}
          disabled={isLoading}
          showValidation={true}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={handlePrevious}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}
        </div>
        
        <div className="space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {isEditing ? 'Cancel' : 'Save Draft & Exit'}
          </Button>
          
          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={isLoading}
            >
              {isEditing ? 'Update Investor' : 'Create Investor'}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

InvestorForm.propTypes = {
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  isLoading: PropTypes.bool,
  showSteps: PropTypes.bool,
  autoSave: PropTypes.bool,
  investorId: PropTypes.string,
};

export default InvestorForm;