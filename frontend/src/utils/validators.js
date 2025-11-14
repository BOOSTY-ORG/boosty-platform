import { VALIDATION_PATTERNS } from './constants.js';

// Email validation
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }
  
  if (!VALIDATION_PATTERNS.EMAIL.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }
  
  return { isValid: true, message: '' };
};

// Password validation
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
    return { 
      isValid: false, 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
    };
  }
  
  return { isValid: true, message: '' };
};

// Confirm password validation
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, message: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Passwords do not match' };
  }
  
  return { isValid: true, message: '' };
};

// Phone number validation
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }
  
  if (!VALIDATION_PATTERNS.PHONE.test(phone)) {
    return { isValid: false, message: 'Please enter a valid phone number' };
  }
  
  return { isValid: true, message: '' };
};

// Required field validation
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  return { isValid: true, message: '' };
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  if (!name) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  if (typeof name !== 'string') {
    return { isValid: false, message: `${fieldName} must be a string` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, message: `${fieldName} must be at least 2 characters long` };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, message: `${fieldName} must not exceed 50 characters` };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return { isValid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  
  return { isValid: true, message: '' };
};

// Username validation
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { isValid: false, message: 'Username must not exceed 20 characters' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true, message: '' };
};

// Amount validation
export const validateAmount = (amount, fieldName = 'Amount') => {
  if (amount === null || amount === undefined || amount === '') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }
  
  if (numAmount <= 0) {
    return { isValid: false, message: `${fieldName} must be greater than 0` };
  }
  
  if (numAmount > 999999999.99) {
    return { isValid: false, message: `${fieldName} must not exceed 999,999,999.99` };
  }
  
  return { isValid: true, message: '' };
};

// Percentage validation
export const validatePercentage = (percentage, fieldName = 'Percentage') => {
  if (percentage === null || percentage === undefined || percentage === '') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const numPercentage = parseFloat(percentage);
  
  if (isNaN(numPercentage)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }
  
  if (numPercentage < 0) {
    return { isValid: false, message: `${fieldName} cannot be negative` };
  }
  
  if (numPercentage > 100) {
    return { isValid: false, message: `${fieldName} cannot exceed 100` };
  }
  
  return { isValid: true, message: '' };
};

// URL validation
export const validateUrl = (url, fieldName = 'URL') => {
  if (!url) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  try {
    new URL(url);
    return { isValid: true, message: '' };
  } catch {
    return { isValid: false, message: 'Please enter a valid URL' };
  }
};

// Date validation
export const validateDate = (date, fieldName = 'Date') => {
  if (!date) {
    return { isValid: false, message: `${fieldName} is required` };
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message: 'Please enter a valid date' };
  }
  
  return { isValid: true, message: '' };
};

// Date range validation
export const validateDateRange = (startDate, endDate) => {
  if (!startDate) {
    return { isValid: false, message: 'Start date is required' };
  }
  
  if (!endDate) {
    return { isValid: false, message: 'End date is required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, message: 'Please enter valid dates' };
  }
  
  if (start >= end) {
    return { isValid: false, message: 'Start date must be before end date' };
  }
  
  return { isValid: true, message: '' };
};

// File validation
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    required = true,
  } = options;
  
  if (!file) {
    return required 
      ? { isValid: false, message: 'File is required' }
      : { isValid: true, message: '' };
  }
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      message: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB` 
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      message: 'File type not allowed. Please upload a valid file' 
    };
  }
  
  return { isValid: true, message: '' };
};

// Select field validation
export const validateSelect = (value, fieldName, options = []) => {
  if (!value) {
    return { isValid: false, message: `Please select a ${fieldName}` };
  }
  
  if (options.length > 0 && !options.includes(value)) {
    return { isValid: false, message: `Please select a valid ${fieldName}` };
  }
  
  return { isValid: true, message: '' };
};

// Checkbox validation
export const validateCheckbox = (checked, fieldName) => {
  if (!checked) {
    return { isValid: false, message: `Please check the ${fieldName}` };
  }
  
  return { isValid: true, message: '' };
};

// Array validation
export const validateArray = (array, fieldName, minLength = 1) => {
  if (!array || !Array.isArray(array)) {
    return { isValid: false, message: `${fieldName} must be an array` };
  }
  
  if (array.length < minLength) {
    return { 
      isValid: false, 
      message: `${fieldName} must contain at least ${minLength} item${minLength > 1 ? 's' : ''}` 
    };
  }
  
  return { isValid: true, message: '' };
};

// Object validation
export const validateObject = (obj, fieldName, requiredKeys = []) => {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, message: `${fieldName} must be an object` };
  }
  
  const missingKeys = requiredKeys.filter(key => !(key in obj));
  
  if (missingKeys.length > 0) {
    return { 
      isValid: false, 
      message: `${fieldName} is missing required fields: ${missingKeys.join(', ')}` 
    };
  }
  
  return { isValid: true, message: '' };
};

// Custom validation
export const validateCustom = (value, validator, fieldName) => {
  if (typeof validator !== 'function') {
    return { isValid: false, message: 'Validator must be a function' };
  }
  
  try {
    const result = validator(value);
    
    if (typeof result === 'boolean') {
      return result 
        ? { isValid: true, message: '' }
        : { isValid: false, message: `${fieldName} is invalid` };
    }
    
    if (typeof result === 'string') {
      return result 
        ? { isValid: false, message: result }
        : { isValid: true, message: '' };
    }
    
    if (typeof result === 'object' && result !== null) {
      return result;
    }
    
    return { isValid: false, message: 'Invalid validator result' };
  } catch (error) {
    return { isValid: false, message: 'Validation error occurred' };
  }
};

// Form validation
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  for (const [field, rules] of Object.entries(validationRules)) {
    const value = formData[field];
    
    for (const rule of rules) {
      const result = rule(value);
      
      if (!result.isValid) {
        errors[field] = result.message;
        isValid = false;
        break; // Stop at first error for each field
      }
    }
  }
  
  return { isValid, errors };
};

// Async validation wrapper
export const validateAsync = async (value, asyncValidator) => {
  try {
    const result = await asyncValidator(value);
    return result;
  } catch (error) {
    return { 
      isValid: false, 
      message: error.message || 'Validation failed' 
    };
  }
};

// Create validation rule
export const createRule = (validator, message) => {
  return (value) => {
    const result = validator(value);
    return result 
      ? { isValid: true, message: '' }
      : { isValid: false, message };
  };
};

// Combine validators
export const combineValidators = (...validators) => {
  return (value) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.isValid) {
        return result;
      }
    }
    return { isValid: true, message: '' };
  };
};