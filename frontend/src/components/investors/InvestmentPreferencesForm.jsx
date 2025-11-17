import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { validateInvestorField } from '../../utils/investorValidation.js';

const InvestmentPreferencesForm = ({ 
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

  // Handle checkbox group changes
  const handleCheckboxGroupChange = (field, value, isChecked) => {
    const currentValues = data[field] || [];
    let newValues;
    
    if (isChecked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(item => item !== value);
    }
    
    handleChange(field, newValues);
  };

  // Investment goals options
  const investmentGoalsOptions = [
    { value: 'capital_preservation', label: 'Capital Preservation', description: 'Protect initial investment' },
    { value: 'steady_income', label: 'Steady Income', description: 'Regular returns and dividends' },
    { value: 'balanced_growth', label: 'Balanced Growth', description: 'Moderate growth with some income' },
    { value: 'high_growth', label: 'High Growth', description: 'Maximum growth potential' },
    { value: 'speculative', label: 'Speculative', description: 'High-risk, high-reward opportunities' },
    { value: 'retirement', label: 'Retirement Planning', description: 'Long-term wealth building' },
    { value: 'education', label: 'Education Fund', description: 'Save for education expenses' },
    { value: 'property', label: 'Property Investment', description: 'Real estate opportunities' },
  ];

  // Preferred sectors options
  const sectorOptions = [
    { value: 'technology', label: 'Technology', description: 'Software, hardware, and IT services' },
    { value: 'healthcare', label: 'Healthcare', description: 'Medical devices, pharma, and services' },
    { value: 'financial_services', label: 'Financial Services', description: 'Banking, insurance, and fintech' },
    { value: 'energy', label: 'Energy', description: 'Oil, gas, and renewable energy' },
    { value: 'real_estate', label: 'Real Estate', description: 'Property and REITs' },
    { value: 'consumer_goods', label: 'Consumer Goods', description: 'Retail and consumer products' },
    { value: 'industrial', label: 'Industrial', description: 'Manufacturing and infrastructure' },
    { value: 'telecommunications', label: 'Telecommunications', description: 'Communication services and networks' },
    { value: 'utilities', label: 'Utilities', description: 'Water, electricity, and gas services' },
    { value: 'government_bonds', label: 'Government Bonds', description: 'Low-risk government securities' },
    { value: 'corporate_bonds', label: 'Corporate Bonds', description: 'Corporate debt instruments' },
    { value: 'mutual_funds', label: 'Mutual Funds', description: 'Professionally managed portfolios' },
    { value: 'etfs', label: 'ETFs', description: 'Exchange-traded funds' },
    { value: 'blue_chips', label: 'Blue Chip Stocks', description: 'Large, established companies' },
    { value: 'emerging_markets', label: 'Emerging Markets', description: 'Developing economy investments' },
    { value: 'cryptocurrency', label: 'Cryptocurrency', description: 'Digital assets and blockchain' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Investment Preferences</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="riskTolerance" className="block text-sm font-medium text-gray-700 mb-1">
            Risk Tolerance <span className="text-red-500">*</span>
          </label>
          <select
            id="riskTolerance"
            name="riskTolerance"
            value={data.riskTolerance || ''}
            onChange={(e) => handleChange('riskTolerance', e.target.value)}
            onBlur={() => handleBlur('riskTolerance')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.riskTolerance ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Risk Level</option>
            <option value="conservative">Conservative - Low risk, stable returns</option>
            <option value="moderate">Moderate - Balanced risk and returns</option>
            <option value="aggressive">Aggressive - High risk, high returns</option>
          </select>
          {errors.riskTolerance && (
            <p className="mt-1 text-sm text-red-600">{errors.riskTolerance}</p>
          )}
        </div>
        
        <div>
          <label htmlFor="investmentDuration" className="block text-sm font-medium text-gray-700 mb-1">
            Investment Duration <span className="text-red-500">*</span>
          </label>
          <select
            id="investmentDuration"
            name="investmentDuration"
            value={data.investmentDuration || ''}
            onChange={(e) => handleChange('investmentDuration', e.target.value)}
            onBlur={() => handleBlur('investmentDuration')}
            disabled={disabled}
            required
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
              errors.investmentDuration ? 'border-red-300' : ''
            } ${disabled ? 'bg-gray-100' : ''}`}
          >
            <option value="">Select Duration</option>
            <option value="short_term">Short Term (1-3 years)</option>
            <option value="medium_term">Medium Term (3-7 years)</option>
            <option value="long_term">Long Term (7+ years)</option>
          </select>
          {errors.investmentDuration && (
            <p className="mt-1 text-sm text-red-600">{errors.investmentDuration}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Investment Goals <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {investmentGoalsOptions.map(option => (
            <div key={option.value} className="flex items-start">
              <input
                type="checkbox"
                id={`goal-${option.value}`}
                name="investmentGoals"
                value={option.value}
                checked={(data.investmentGoals || []).includes(option.value)}
                onChange={(e) => handleCheckboxGroupChange('investmentGoals', option.value, e.target.checked)}
                disabled={disabled}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor={`goal-${option.value}`} className="text-sm font-medium text-gray-700">
                  {option.label}
                </label>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
        {errors.investmentGoals && (
          <p className="mt-1 text-sm text-red-600">{errors.investmentGoals}</p>
        )}
      </div>

      <div>
        <label htmlFor="expectedReturn" className="block text-sm font-medium text-gray-700 mb-1">
          Expected Annual Return (%)
        </label>
        <input
          type="number"
          id="expectedReturn"
          name="expectedReturn"
          value={data.expectedReturn || ''}
          onChange={(e) => handleChange('expectedReturn', e.target.value)}
          onBlur={() => handleBlur('expectedReturn')}
          disabled={disabled}
          min="0"
          max="100"
          step="0.1"
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
            errors.expectedReturn ? 'border-red-300' : ''
          } ${disabled ? 'bg-gray-100' : ''}`}
          placeholder="e.g., 8.5"
        />
        {errors.expectedReturn && (
          <p className="mt-1 text-sm text-red-600">{errors.expectedReturn}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Realistic expectations help us recommend suitable investments
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Preferred Investment Sectors
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Select all sectors you're interested in investing in (optional)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sectorOptions.map(option => (
            <div key={option.value} className="flex items-start">
              <input
                type="checkbox"
                id={`sector-${option.value}`}
                name="preferredSectors"
                value={option.value}
                checked={(data.preferredSectors || []).includes(option.value)}
                onChange={(e) => handleCheckboxGroupChange('preferredSectors', option.value, e.target.checked)}
                disabled={disabled}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor={`sector-${option.value}`} className="text-sm font-medium text-gray-700">
                  {option.label}
                </label>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
        {errors.preferredSectors && (
          <p className="mt-1 text-sm text-red-600">{errors.preferredSectors}</p>
        )}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Investment Preferences</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your investment preferences help us create a personalized portfolio that matches your:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Risk tolerance and financial goals</li>
                <li>Time horizon and liquidity needs</li>
                <li>Values and sector interests</li>
                <li>Expected returns and income requirements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

InvestmentPreferencesForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  onFieldBlur: PropTypes.func,
  disabled: PropTypes.bool,
  showValidation: PropTypes.bool,
};

export default InvestmentPreferencesForm;