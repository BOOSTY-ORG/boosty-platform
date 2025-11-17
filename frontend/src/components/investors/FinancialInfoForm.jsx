import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Input from '../common/Input.jsx';
import { validateInvestorField } from '../../utils/investorValidation.js';

const FinancialInfoForm = ({ 
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

  // Format currency input
  const formatCurrency = (value) => {
    if (!value) return '';
    const numericValue = value.replace(/[^0-9.]/g, '');
    const floatValue = parseFloat(numericValue);
    if (isNaN(floatValue)) return '';
    return floatValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Handle currency input changes
  const handleCurrencyChange = (field, value) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    handleChange(field, numericValue);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            label="Annual Income"
            name="annualIncome"
            type="text"
            value={formatCurrency(data.annualIncome)}
            onChange={(e) => handleCurrencyChange('annualIncome', e.target.value)}
            onBlur={() => handleBlur('annualIncome')}
            error={errors.annualIncome}
            required
            disabled={disabled}
            placeholder="0.00"
            helperText="Enter your annual pre-tax income"
          />
          <p className="mt-1 text-sm text-gray-500">
            {data.annualIncome && parseFloat(data.annualIncome.replace(/[^0-9.]/g, '')) > 0 && 
              `$${parseFloat(data.annualIncome.replace(/[^0-9.]/g, '')).toLocaleString()}`
            }
          </p>
        </div>
        
        <div>
          <Input
            label="Net Worth"
            name="netWorth"
            type="text"
            value={formatCurrency(data.netWorth)}
            onChange={(e) => handleCurrencyChange('netWorth', e.target.value)}
            onBlur={() => handleBlur('netWorth')}
            error={errors.netWorth}
            required
            disabled={disabled}
            placeholder="0.00"
            helperText="Total value of all assets minus liabilities"
          />
          <p className="mt-1 text-sm text-gray-500">
            {data.netWorth && parseFloat(data.netWorth.replace(/[^0-9.]/g, '')) > 0 && 
              `$${parseFloat(data.netWorth.replace(/[^0-9.]/g, '')).toLocaleString()}`
            }
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            label="Initial Investment Amount"
            name="investmentAmount"
            type="text"
            value={formatCurrency(data.investmentAmount)}
            onChange={(e) => handleCurrencyChange('investmentAmount', e.target.value)}
            onBlur={() => handleBlur('investmentAmount')}
            error={errors.investmentAmount}
            required
            disabled={disabled}
            placeholder="1,000.00"
            helperText="Minimum investment is $1,000"
          />
          <p className="mt-1 text-sm text-gray-500">
            {data.investmentAmount && parseFloat(data.investmentAmount.replace(/[^0-9.]/g, '')) > 0 && 
              `$${parseFloat(data.investmentAmount.replace(/[^0-9.]/g, '')).toLocaleString()}`
            }
          </p>
        </div>
        
        <div>
          <label htmlFor="investmentFrequency" className="block text-sm font-medium text-gray-700 mb-1">
            Investment Frequency <span className="text-red-500">*</span>
          </label>
          <select
            id="investmentFrequency"
            name="investmentFrequency"
            value={data.investmentFrequency || ''}
            onChange={(e) => handleChange('investmentFrequency', e.target.value)}
            onBlur={() => handleBlur('investmentFrequency')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.investmentFrequency ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Frequency</option>
            <option value="one-time">One-time Investment</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
          {errors.investmentFrequency && (
            <p className="mt-1 text-sm text-red-600">{errors.investmentFrequency}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            How often do you plan to invest?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="sourceOfFunds" className="block text-sm font-medium text-gray-700 mb-1">
            Source of Funds <span className="text-red-500">*</span>
          </label>
          <select
            id="sourceOfFunds"
            name="sourceOfFunds"
            value={data.sourceOfFunds || ''}
            onChange={(e) => handleChange('sourceOfFunds', e.target.value)}
            onBlur={() => handleBlur('sourceOfFunds')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.sourceOfFunds ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Source</option>
            <option value="salary">Salary/ Employment Income</option>
            <option value="business_income">Business Income</option>
            <option value="investments">Investment Returns</option>
            <option value="inheritance">Inheritance</option>
            <option value="savings">Personal Savings</option>
            <option value="other">Other</option>
          </select>
          {errors.sourceOfFunds && (
            <p className="mt-1 text-sm text-red-600">{errors.sourceOfFunds}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Primary source of your investment funds
          </p>
        </div>
        
        <Input
          label="Tax Identification Number"
          name="taxIdentification"
          value={data.taxIdentification || ''}
          onChange={(e) => handleChange('taxIdentification', e.target.value)}
          onBlur={() => handleBlur('taxIdentification')}
          error={errors.taxIdentification}
          required
          disabled={disabled}
          placeholder="SSN, TIN, or Tax ID"
          helperText="For tax reporting purposes"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Financial Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Your financial information is encrypted and stored securely. We use this information to:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Verify your identity and assess investment suitability</li>
                <li>Ensure compliance with regulatory requirements</li>
                <li>Provide personalized investment recommendations</li>
                <li>Generate accurate tax documents</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

FinancialInfoForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  onFieldBlur: PropTypes.func,
  disabled: PropTypes.bool,
  showValidation: PropTypes.bool,
};

export default FinancialInfoForm;