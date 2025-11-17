import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * DateRangePicker component with preset options for date range selection
 */
const DateRangePicker = ({
  value = { start: '', end: '' },
  onChange,
  className = '',
  label = 'Date Range',
  presets = [],
  maxDate,
  minDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState({ start: value.start || '', end: value.end || '' });
  const [selectedPreset, setSelectedPreset] = useState('');

  // Default presets if none provided
  const defaultPresets = [
    {
      label: 'Today',
      value: () => {
        const today = new Date();
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Yesterday',
      value: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last 7 Days',
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last 30 Days',
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'This Month',
      value: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last Month',
      value: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'This Year',
      value: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Last Year',
      value: () => {
        const lastYear = new Date().getFullYear() - 1;
        const start = new Date(lastYear, 0, 1);
        const end = new Date(lastYear, 11, 31);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
        };
      },
    },
  ];

  const allPresets = [...defaultPresets, ...presets];

  // Update temp value when prop value changes
  useEffect(() => {
    setTempValue({ start: value.start || '', end: value.end || '' });
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.date-range-picker')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetClick = (preset) => {
    const range = preset.value();
    setTempValue(range);
    setSelectedPreset(preset.label);
  };

  const handleDateChange = (field, date) => {
    const newValue = { ...tempValue, [field]: date };
    setTempValue(newValue);
    setSelectedPreset(''); // Clear preset when manually changing dates
  };

  const handleApply = () => {
    onChange(tempValue);
    setIsOpen(false);
  };

  const handleClear = () => {
    const clearedValue = { start: '', end: '' };
    setTempValue(clearedValue);
    setSelectedPreset('');
    onChange(clearedValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue({ start: value.start || '', end: value.end || '' });
    setIsOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getDisplayText = () => {
    if (!value.start && !value.end) return label;
    
    if (value.start === value.end) {
      return formatDate(value.start);
    }
    
    return `${formatDate(value.start)} - ${formatDate(value.end)}`;
  };

  return (
    <div className={`date-range-picker relative ${className}`}>
      <button
        type="button"
        className="w-full md:w-auto inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="mr-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {getDisplayText()}
        <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-96 bg-white shadow-lg rounded-md border border-gray-200">
          <div className="p-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Select</h4>
              <div className="grid grid-cols-2 gap-2">
                {allPresets.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`px-3 py-2 text-xs font-medium rounded-md ${
                      selectedPreset === preset.label
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Custom Range</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start-date" className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={tempValue.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    max={maxDate}
                    min={minDate}
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={tempValue.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    max={maxDate}
                    min={minDate}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={handleClear}
              >
                Clear
              </button>
              <div className="space-x-2">
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={handleApply}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DateRangePicker.propTypes = {
  value: PropTypes.shape({
    start: PropTypes.string,
    end: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  className: PropTypes.string,
  label: PropTypes.string,
  presets: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.func.isRequired,
    })
  ),
  maxDate: PropTypes.string,
  minDate: PropTypes.string,
};

export default DateRangePicker;