import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * AdvancedFilterPanel component for complex filtering with multiple criteria
 */
const AdvancedFilterPanel = ({
  filters = {},
  onFiltersChange,
  onReset,
  availableFilters = [],
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Count active filters whenever filters change
  React.useEffect(() => {
    const count = Object.keys(filters).filter(key => {
      const value = filters[key];
      return value !== '' && value !== null && value !== undefined && 
             (Array.isArray(value) ? value.length > 0 : true);
    }).length;
    setActiveFilterCount(count);
  }, [filters]);

  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === null || value === undefined) {
      delete newFilters[filterKey];
    } else {
      newFilters[filterKey] = value;
    }
    
    onFiltersChange(newFilters);
  };

  const handleMultiSelectChange = (filterKey, optionValue) => {
    const currentValues = filters[filterKey] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    
    handleFilterChange(filterKey, newValues);
  };

  const handleReset = () => {
    onFiltersChange({});
    if (onReset) onReset();
  };

  const renderFilterInput = (filter) => {
    const value = filters[filter.key] || (filter.type === 'multiselect' ? [] : '');

    switch (filter.type) {
      case 'text':
        return (
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={filter.placeholder || `Filter by ${filter.label}`}
          />
        );

      case 'number':
        return (
          <div className="flex space-x-2">
            <input
              type="number"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={value.min || ''}
              onChange={(e) => handleFilterChange(filter.key, { 
                ...value, 
                min: e.target.value ? Number(e.target.value) : undefined 
              })}
              placeholder="Min"
            />
            <input
              type="number"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={value.max || ''}
              onChange={(e) => handleFilterChange(filter.key, { 
                ...value, 
                max: e.target.value ? Number(e.target.value) : undefined 
              })}
              placeholder="Max"
            />
          </div>
        );

      case 'select':
        return (
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
            {filter.options?.map(option => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={value.includes(option.value)}
                  onChange={() => handleMultiSelectChange(filter.key, option.value)}
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          />
        );

      case 'daterange':
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={value.start || ''}
              onChange={(e) => handleFilterChange(filter.key, { 
                ...value, 
                start: e.target.value 
              })}
              placeholder="Start date"
            />
            <input
              type="date"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={value.end || ''}
              onChange={(e) => handleFilterChange(filter.key, { 
                ...value, 
                end: e.target.value 
              })}
              placeholder="End date"
            />
          </div>
        );

      case 'boolean':
        return (
          <select
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={value === '' ? '' : value.toString()}
            onChange={(e) => handleFilterChange(filter.key, e.target.value === '' ? '' : e.target.value === 'true')}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={value}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            placeholder={`Filter by ${filter.label}`}
          />
        );
    }
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Advanced Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFilterCount} active
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={handleReset}
              >
                Reset all
              </button>
            )}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide' : 'Show'} filters
              <svg
                className={`ml-1 h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableFilters.map((filter) => (
              <div key={filter.key}>
                <label htmlFor={`filter-${filter.key}`} className="block text-sm font-medium text-gray-700">
                  {filter.label}
                </label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        )}

        {!isExpanded && activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              
              const filter = availableFilters.find(f => f.key === key);
              if (!filter) return null;

              let displayValue = value;
              if (filter.type === 'select') {
                const option = filter.options?.find(opt => opt.value === value);
                displayValue = option?.label || value;
              } else if (filter.type === 'multiselect' && Array.isArray(value)) {
                displayValue = value.map(v => {
                  const option = filter.options?.find(opt => opt.value === v);
                  return option?.label || v;
                }).join(', ');
              } else if (filter.type === 'daterange') {
                displayValue = `${value.start || ''} - ${value.end || ''}`;
              } else if (filter.type === 'number' && typeof value === 'object') {
                displayValue = `${value.min || ''} - ${value.max || ''}`;
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span className="ml-1">{displayValue}</span>
                  <button
                    type="button"
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    onClick={() => handleFilterChange(key, '')}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

AdvancedFilterPanel.propTypes = {
  filters: PropTypes.object,
  onFiltersChange: PropTypes.func.isRequired,
  onReset: PropTypes.func,
  availableFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['text', 'number', 'select', 'multiselect', 'date', 'daterange', 'boolean']).isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.any.isRequired,
          label: PropTypes.string.isRequired,
        })
      ),
      placeholder: PropTypes.string,
    })
  ),
  className: PropTypes.string,
};

export default AdvancedFilterPanel;