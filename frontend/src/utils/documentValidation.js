// Document type validation rules and utilities

export const documentTypeRules = {
  government_id: {
    name: 'Government ID',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['documentNumber', 'issuingAuthority', 'issueDate', 'expiryDate'],
    validationRules: {
      documentNumber: {
        required: true,
        minLength: 5,
        maxLength: 50,
        pattern: /^[A-Za-z0-9\- ]+$/
      },
      issuingAuthority: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      issueDate: {
        required: true,
        maxDate: new Date()
      },
      expiryDate: {
        required: true,
        minDate: new Date()
      }
    }
  },
  utility_bill: {
    name: 'Utility Bill',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 3 * 1024 * 1024, // 3MB
    requiredFields: ['providerName', 'serviceAddress', 'billDate', 'amount'],
    validationRules: {
      providerName: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      serviceAddress: {
        required: true,
        minLength: 5,
        maxLength: 200
      },
      billDate: {
        required: true,
        maxDate: new Date(),
        minDate: new Date(new Date().setMonth(new Date().getMonth() - 6)) // Not older than 6 months
      },
      amount: {
        required: true,
        min: 0
      }
    }
  },
  bank_statement: {
    name: 'Bank Statement',
    acceptedFormats: ['.pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['bankName', 'accountNumber', 'statementPeriod', 'balance'],
    validationRules: {
      bankName: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      accountNumber: {
        required: true,
        minLength: 8,
        maxLength: 20,
        pattern: /^[A-Za-z0-9\- ]+$/
      },
      statementPeriod: {
        required: true
      },
      balance: {
        required: true,
        type: 'number'
      }
    }
  },
  proof_of_income: {
    name: 'Proof of Income',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['documentType', 'issuer', 'issueDate', 'amount'],
    validationRules: {
      documentType: {
        required: true,
        enum: ['payslip', 'tax_return', 'employment_letter', 'other']
      },
      issuer: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      issueDate: {
        required: true,
        maxDate: new Date(),
        minDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) // Not older than 1 year
      },
      amount: {
        required: true,
        min: 0,
        type: 'number'
      }
    }
  },
  property_document: {
    name: 'Property Document',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 10 * 1024 * 1024, // 10MB
    requiredFields: ['documentType', 'propertyAddress', 'ownerName', 'documentDate'],
    validationRules: {
      documentType: {
        required: true,
        enum: ['deed', 'title', 'mortgage_statement', 'property_tax_bill', 'other']
      },
      propertyAddress: {
        required: true,
        minLength: 5,
        maxLength: 200
      },
      ownerName: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      documentDate: {
        required: true
      }
    }
  },
  passport: {
    name: 'Passport',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['passportNumber', 'issuingCountry', 'issueDate', 'expiryDate', 'fullName'],
    validationRules: {
      passportNumber: {
        required: true,
        minLength: 6,
        maxLength: 20,
        pattern: /^[A-Za-z0-9\<]+$/
      },
      issuingCountry: {
        required: true,
        minLength: 2,
        maxLength: 3,
        pattern: /^[A-Z]{2,3}$/
      },
      issueDate: {
        required: true,
        maxDate: new Date()
      },
      expiryDate: {
        required: true,
        minDate: new Date()
      },
      fullName: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    }
  },
  drivers_license: {
    name: "Driver's License",
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['licenseNumber', 'issuingState', 'issueDate', 'expiryDate', 'fullName'],
    validationRules: {
      licenseNumber: {
        required: true,
        minLength: 5,
        maxLength: 20,
        pattern: /^[A-Za-z0-9\- ]+$/
      },
      issuingState: {
        required: true,
        minLength: 2,
        maxLength: 50
      },
      issueDate: {
        required: true,
        maxDate: new Date()
      },
      expiryDate: {
        required: true,
        minDate: new Date()
      },
      fullName: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    }
  },
  national_id: {
    name: 'National ID',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    requiredFields: ['idNumber', 'issuingCountry', 'issueDate', 'expiryDate', 'fullName'],
    validationRules: {
      idNumber: {
        required: true,
        minLength: 5,
        maxLength: 30,
        pattern: /^[A-Za-z0-9\- ]+$/
      },
      issuingCountry: {
        required: true,
        minLength: 2,
        maxLength: 100
      },
      issueDate: {
        required: true,
        maxDate: new Date()
      },
      expiryDate: {
        required: true,
        minDate: new Date()
      },
      fullName: {
        required: true,
        minLength: 2,
        maxLength: 100
      }
    }
  },
  other: {
    name: 'Other Document',
    acceptedFormats: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
    maxSize: 10 * 1024 * 1024, // 10MB
    requiredFields: ['description'],
    validationRules: {
      description: {
        required: true,
        minLength: 5,
        maxLength: 500
      }
    }
  }
};

// Validate file against document type rules
export const validateFile = (file, documentType) => {
  const rules = documentTypeRules[documentType];
  if (!rules) {
    return { isValid: false, errors: ['Invalid document type'] };
  }

  const errors = [];

  // Check file format
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!rules.acceptedFormats.includes(fileExtension)) {
    errors.push(`File format ${fileExtension} is not accepted. Accepted formats: ${rules.acceptedFormats.join(', ')}`);
  }

  // Check file size
  if (file.size > rules.maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${formatFileSize(rules.maxSize)}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validate document data against type rules
export const validateDocumentData = (documentType, data) => {
  const rules = documentTypeRules[documentType];
  if (!rules) {
    return { isValid: false, errors: ['Invalid document type'] };
  }

  const errors = [];

  // Check required fields
  rules.requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  // Validate each field according to rules
  if (rules.validationRules) {
    Object.entries(rules.validationRules).forEach(([field, rule]) => {
      const value = data[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} is required`);
        return;
      }

      if (value && rule.minLength && value.toString().length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters long`);
      }

      if (value && rule.maxLength && value.toString().length > rule.maxLength) {
        errors.push(`${field} must not exceed ${rule.maxLength} characters`);
      }

      if (value && rule.pattern && !rule.pattern.test(value.toString())) {
        errors.push(`${field} format is invalid`);
      }

      if (value && rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }

      if (value && rule.type === 'number' && isNaN(Number(value))) {
        errors.push(`${field} must be a valid number`);
      }

      if (value && rule.minDate && new Date(value) < rule.minDate) {
        const minDateStr = rule.minDate instanceof Date ? rule.minDate.toLocaleDateString() : rule.minDate;
        errors.push(`${field} must be after ${minDateStr}`);
      }

      if (value && rule.maxDate && new Date(value) > rule.maxDate) {
        const maxDateStr = rule.maxDate instanceof Date ? rule.maxDate.toLocaleDateString() : rule.maxDate;
        errors.push(`${field} must be before ${maxDateStr}`);
      }

      if (value && rule.min !== undefined && Number(value) < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get document type rules for a specific type
export const getDocumentTypeRules = (documentType) => {
  return documentTypeRules[documentType] || null;
};

// Get all document types
export const getDocumentTypes = () => {
  return Object.entries(documentTypeRules).map(([key, value]) => ({
    value: key,
    label: value.name,
    acceptedFormats: value.acceptedFormats,
    maxSize: value.maxSize
  }));
};

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if document is expired
export const isDocumentExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

// Get days until expiry
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if document is expiring soon (within 30 days)
export const isDocumentExpiringSoon = (expiryDate, daysThreshold = 30) => {
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  return daysUntilExpiry !== null && daysUntilExpiry <= daysThreshold && daysUntilExpiry > 0;
};

export default {
  documentTypeRules,
  validateFile,
  validateDocumentData,
  getDocumentTypeRules,
  getDocumentTypes,
  isDocumentExpired,
  getDaysUntilExpiry,
  isDocumentExpiringSoon
};