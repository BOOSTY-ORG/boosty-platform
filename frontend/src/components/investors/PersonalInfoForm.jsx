import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Input from '../common/Input.jsx';
import { validateInvestorField } from '../../utils/investorValidation.js';

const PersonalInfoForm = ({ 
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
    const newData = { ...data };
    
    // Handle nested address fields
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      newData.address = {
        ...newData.address,
        [addressField]: value
      };
    } else {
      newData[field] = value;
    }
    
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
      const validation = validateInvestorField(field, 
        field.startsWith('address.') ? data.address[field.replace('address.', '')] : data[field]
      );
      onFieldBlur(field, validation.message);
    }
  };

  // Common country options
  const countryOptions = [
    { value: '', label: 'Select Country' },
    { value: 'US', label: 'United States' },
    { value: 'GB', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'NG', label: 'Nigeria' },
    { value: 'KE', label: 'Kenya' },
    { value: 'ZA', label: 'South Africa' },
    { value: 'GH', label: 'Ghana' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="First Name"
          name="firstName"
          value={data.firstName || ''}
          onChange={(e) => handleChange('firstName', e.target.value)}
          onBlur={() => handleBlur('firstName')}
          error={errors.firstName}
          required
          disabled={disabled}
          placeholder="Enter first name"
        />
        
        <Input
          label="Last Name"
          name="lastName"
          value={data.lastName || ''}
          onChange={(e) => handleChange('lastName', e.target.value)}
          onBlur={() => handleBlur('lastName')}
          error={errors.lastName}
          required
          disabled={disabled}
          placeholder="Enter last name"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={data.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={errors.email}
          required
          disabled={disabled}
          placeholder="investor@example.com"
        />
        
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          value={data.phone || ''}
          onChange={(e) => handleChange('phone', e.target.value)}
          onBlur={() => handleBlur('phone')}
          error={errors.phone}
          required
          disabled={disabled}
          placeholder="+1234567890"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={data.dateOfBirth || ''}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          onBlur={() => handleBlur('dateOfBirth')}
          error={errors.dateOfBirth}
          required
          disabled={disabled}
          max={new Date().toISOString().split('T')[0]}
        />
        
        <div>
          <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
            Nationality <span className="text-red-500">*</span>
          </label>
          <select
            id="nationality"
            name="nationality"
            value={data.nationality || ''}
            onChange={(e) => handleChange('nationality', e.target.value)}
            onBlur={() => handleBlur('nationality')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.nationality ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Nationality</option>
            <option value="US">American</option>
            <option value="GB">British</option>
            <option value="CA">Canadian</option>
            <option value="AU">Australian</option>
            <option value="NG">Nigerian</option>
            <option value="KE">Kenyan</option>
            <option value="ZA">South African</option>
            <option value="GH">Ghanaian</option>
            <option value="Other">Other</option>
          </select>
          {errors.nationality && (
            <p className="mt-1 text-sm text-red-600">{errors.nationality}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Address Information</h4>
        
        <Input
          label="Street Address"
          name="street"
          value={data.address?.street || ''}
          onChange={(e) => handleChange('address.street', e.target.value)}
          onBlur={() => handleBlur('address.street')}
          error={errors['address.street']}
          required
          disabled={disabled}
          placeholder="123 Main Street"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="City"
            name="city"
            value={data.address?.city || ''}
            onChange={(e) => handleChange('address.city', e.target.value)}
            onBlur={() => handleBlur('address.city')}
            error={errors['address.city']}
            required
            disabled={disabled}
            placeholder="New York"
          />
          
          <Input
            label="State/Province"
            name="state"
            value={data.address?.state || ''}
            onChange={(e) => handleChange('address.state', e.target.value)}
            onBlur={() => handleBlur('address.state')}
            error={errors['address.state']}
            required
            disabled={disabled}
            placeholder="NY"
          />
          
          <Input
            label="Postal Code"
            name="postalCode"
            value={data.address?.postalCode || ''}
            onChange={(e) => handleChange('address.postalCode', e.target.value)}
            onBlur={() => handleBlur('address.postalCode')}
            error={errors['address.postalCode']}
            required
            disabled={disabled}
            placeholder="10001"
          />
        </div>
        
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            id="country"
            name="country"
            value={data.address?.country || ''}
            onChange={(e) => handleChange('address.country', e.target.value)}
            onBlur={() => handleBlur('address.country')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors['address.country'] ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            {countryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors['address.country'] && (
            <p className="mt-1 text-sm text-red-600">{errors['address.country']}</p>
          )}
        </div>
      </div>
    </div>
  );
};

PersonalInfoForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  onFieldBlur: PropTypes.func,
  disabled: PropTypes.bool,
  showValidation: PropTypes.bool,
};

export default PersonalInfoForm;