import { 
  validateEmail, 
  validatePhone, 
  validateName, 
  validateRequired, 
  validateAmount, 
  validatePercentage,
  validateDate,
  validateFile,
  validateSelect,
  validateForm
} from './validators.js';

// Investor-specific validation rules
export const INVESTOR_VALIDATION_RULES = {
  // Personal Information
  firstName: [
    (value) => validateRequired(value, 'First name'),
    (value) => validateName(value, 'First name'),
  ],
  lastName: [
    (value) => validateRequired(value, 'Last name'),
    (value) => validateName(value, 'Last name'),
  ],
  email: [
    (value) => validateRequired(value, 'Email'),
    (value) => validateEmail(value),
  ],
  phone: [
    (value) => validateRequired(value, 'Phone number'),
    (value) => validatePhone(value),
  ],
  dateOfBirth: [
    (value) => validateRequired(value, 'Date of birth'),
    (value) => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        return { isValid: false, message: 'Investor must be at least 18 years old' };
      }
      
      return { isValid: true, message: '' };
    },
  ],
  nationality: [
    (value) => validateRequired(value, 'Nationality'),
  ],
  address: {
    street: [
      (value) => validateRequired(value, 'Street address'),
    ],
    city: [
      (value) => validateRequired(value, 'City'),
    ],
    state: [
      (value) => validateRequired(value, 'State/Province'),
    ],
    postalCode: [
      (value) => validateRequired(value, 'Postal code'),
    ],
    country: [
      (value) => validateRequired(value, 'Country'),
    ],
  },

  // Financial Information
  annualIncome: [
    (value) => validateRequired(value, 'Annual income'),
    (value) => validateAmount(value, 'Annual income'),
  ],
  netWorth: [
    (value) => validateRequired(value, 'Net worth'),
    (value) => validateAmount(value, 'Net worth'),
  ],
  investmentAmount: [
    (value) => validateRequired(value, 'Investment amount'),
    (value) => validateAmount(value, 'Investment amount'),
    (value) => {
      const amount = parseFloat(value);
      if (amount < 1000) {
        return { isValid: false, message: 'Minimum investment amount is $1,000' };
      }
      return { isValid: true, message: '' };
    },
  ],
  investmentFrequency: [
    (value) => validateRequired(value, 'Investment frequency'),
    (value) => validateSelect(value, 'Investment frequency', ['one-time', 'monthly', 'quarterly', 'annually']),
  ],
  sourceOfFunds: [
    (value) => validateRequired(value, 'Source of funds'),
    (value) => validateSelect(value, 'Source of funds', [
      'salary', 'business_income', 'investments', 'inheritance', 'savings', 'other'
    ]),
  ],
  taxIdentification: [
    (value) => validateRequired(value, 'Tax identification number'),
    (value) => {
      if (!/^[A-Za-z0-9]{8,20}$/.test(value)) {
        return { isValid: false, message: 'Tax ID must be 8-20 alphanumeric characters' };
      }
      return { isValid: true, message: '' };
    },
  ],

  // Investment Preferences
  riskTolerance: [
    (value) => validateRequired(value, 'Risk tolerance'),
    (value) => validateSelect(value, 'Risk tolerance', ['conservative', 'moderate', 'aggressive']),
  ],
  investmentGoals: [
    (value) => validateRequired(value, 'Investment goals'),
    (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return { isValid: false, message: 'Please select at least one investment goal' };
      }
      return { isValid: true, message: '' };
    },
  ],
  investmentDuration: [
    (value) => validateRequired(value, 'Investment duration'),
    (value) => validateSelect(value, 'Investment duration', ['short_term', 'medium_term', 'long_term']),
  ],
  preferredSectors: [
    (value) => {
      if (value && !Array.isArray(value)) {
        return { isValid: false, message: 'Preferred sectors must be an array' };
      }
      return { isValid: true, message: '' };
    },
  ],
  expectedReturn: [
    (value) => validatePercentage(value, 'Expected return'),
    (value) => {
      const percentage = parseFloat(value);
      if (percentage > 50) {
        return { isValid: false, message: 'Expected return seems unusually high' };
      }
      return { isValid: true, message: '' };
    },
  ],

  // KYC Requirements
  idDocument: [
    (value) => validateFile(value, {
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    }),
  ],
  proofOfAddress: [
    (value) => validateFile(value, {
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    }),
  ],
  bankStatement: [
    (value) => validateFile(value, {
      required: false,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    }),
  ],
  kycDeclaration: [
    (value) => validateCheckbox(value, 'KYC declaration'),
  ],
  consentToDataProcessing: [
    (value) => validateCheckbox(value, 'Consent to data processing'),
  ],
};

// Validate personal information section
export const validatePersonalInfo = (data) => {
  const personalInfoFields = [
    'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 
    'nationality', 'address.street', 'address.city', 'address.state', 
    'address.postalCode', 'address.country'
  ];

  const validationRules = {};
  personalInfoFields.forEach(field => {
    if (INVESTOR_VALIDATION_RULES[field]) {
      validationRules[field] = INVESTOR_VALIDATION_RULES[field];
    }
  });

  return validateForm(data, validationRules);
};

// Validate financial information section
export const validateFinancialInfo = (data) => {
  const financialInfoFields = [
    'annualIncome', 'netWorth', 'investmentAmount', 
    'investmentFrequency', 'sourceOfFunds', 'taxIdentification'
  ];

  const validationRules = {};
  financialInfoFields.forEach(field => {
    if (INVESTOR_VALIDATION_RULES[field]) {
      validationRules[field] = INVESTOR_VALIDATION_RULES[field];
    }
  });

  return validateForm(data, validationRules);
};

// Validate investment preferences section
export const validateInvestmentPreferences = (data) => {
  const preferencesFields = [
    'riskTolerance', 'investmentGoals', 'investmentDuration', 
    'preferredSectors', 'expectedReturn'
  ];

  const validationRules = {};
  preferencesFields.forEach(field => {
    if (INVESTOR_VALIDATION_RULES[field]) {
      validationRules[field] = INVESTOR_VALIDATION_RULES[field];
    }
  });

  return validateForm(data, validationRules);
};

// Validate KYC requirements section
export const validateKYCRequirements = (data) => {
  const kycFields = [
    'idDocument', 'proofOfAddress', 'bankStatement', 
    'kycDeclaration', 'consentToDataProcessing'
  ];

  const validationRules = {};
  kycFields.forEach(field => {
    if (INVESTOR_VALIDATION_RULES[field]) {
      validationRules[field] = INVESTOR_VALIDATION_RULES[field];
    }
  });

  return validateForm(data, validationRules);
};

// Validate complete investor form
export const validateInvestorForm = (data) => {
  const allValidationRules = { ...INVESTOR_VALIDATION_RULES };
  return validateForm(data, allValidationRules);
};

// Real-time validation for individual fields
export const validateInvestorField = (fieldName, value) => {
  const rules = INVESTOR_VALIDATION_RULES[fieldName];
  if (!rules) {
    return { isValid: true, message: '' };
  }

  for (const rule of rules) {
    const result = rule(value);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true, message: '' };
};

// Check for duplicate investor
export const checkDuplicateInvestor = async (email, phone, excludeId = null) => {
  // This would typically make an API call to check for duplicates
  // For now, we'll return a mock implementation
  try {
    // const response = await investorsAPI.checkDuplicate({ email, phone, excludeId });
    // return response.data;
    
    // Mock implementation
    return {
      isDuplicate: false,
      duplicateField: null,
      message: ''
    };
  } catch (error) {
    throw new Error('Failed to check for duplicate investor');
  }
};

// Form state management utilities
export const createInitialFormState = () => ({
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
  
  // Form state
  isSubmitting: false,
  isDraft: false,
  currentStep: 0,
  errors: {},
  touched: {},
});

// Auto-save functionality
export const saveDraftToLocalStorage = (formData, investorId = null) => {
  const key = investorId ? `investor_draft_${investorId}` : 'investor_draft_new';
  const draftData = {
    ...formData,
    savedAt: new Date().toISOString(),
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(draftData));
    return true;
  } catch (error) {
    console.error('Failed to save draft:', error);
    return false;
  }
};

export const loadDraftFromLocalStorage = (investorId = null) => {
  const key = investorId ? `investor_draft_${investorId}` : 'investor_draft_new';
  
  try {
    const draftData = localStorage.getItem(key);
    return draftData ? JSON.parse(draftData) : null;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
};

export const clearDraftFromLocalStorage = (investorId = null) => {
  const key = investorId ? `investor_draft_${investorId}` : 'investor_draft_new';
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to clear draft:', error);
    return false;
  }
};

// Form templates for common investor types
export const INVESTOR_TEMPLATES = {
  conservative: {
    riskTolerance: 'conservative',
    investmentGoals: ['capital_preservation', 'steady_income'],
    investmentDuration: 'long_term',
    expectedReturn: '5-8%',
    preferredSectors: ['government_bonds', 'blue_chips'],
  },
  balanced: {
    riskTolerance: 'moderate',
    investmentGoals: ['balanced_growth', 'income'],
    investmentDuration: 'medium_term',
    expectedReturn: '8-12%',
    preferredSectors: ['mutual_funds', 'etfs', 'blue_chips'],
  },
  aggressive: {
    riskTolerance: 'aggressive',
    investmentGoals: ['high_growth', 'speculative'],
    investmentDuration: 'short_term',
    expectedReturn: '15-25%',
    preferredSectors: ['technology', 'emerging_markets', 'cryptocurrency'],
  },
};

export const applyInvestorTemplate = (formData, templateType) => {
  const template = INVESTOR_TEMPLATES[templateType];
  if (!template) {
    return formData;
  }

  return {
    ...formData,
    ...template,
  };
};