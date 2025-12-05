import React, { useState } from 'react';

const DateRangeFilter = ({ dateRange, onChange }) => {
  const [localDateRange, setLocalDateRange] = useState({
    startDate: dateRange?.startDate || '',
    endDate: dateRange?.endDate || '',
  });

  const [presetSelected, setPresetSelected] = useState('');

  const presetRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'Last 90 Days', value: 'last90days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Quarter', value: 'thisQuarter' },
    { label: 'Last Quarter', value: 'lastQuarter' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Last Year', value: 'lastYear' },
    { label: 'Custom', value: 'custom' },
  ];

  const handlePresetChange = (preset) => {
    setPresetSelected(preset);
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (preset) {
      case 'today':
        startDate = today;
        endDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(today);
        endDate.setDate(today.getDate() - 1);
        break;
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        endDate = today;
        break;
      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = today;
        break;
      case 'last90days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        endDate = today;
        break;
      case 'thisMonth':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), currentQuarter * 3 + 3, 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        startDate = new Date(today.getFullYear(), lastQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), lastQuarter * 3 + 3, 0);
        break;
      case 'thisYear':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        startDate = new Date(today.getFullYear() - 1, 0, 1);
        endDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        // Don't change dates for custom
        return;
      default:
        break;
    }

    const newDateRange = {
      startDate: formatDateForInput(startDate),
      endDate: formatDateForInput(endDate),
    };

    setLocalDateRange(newDateRange);
    onChange(newDateRange);
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setLocalDateRange(prev => ({ ...prev, startDate: newStartDate }));
    setPresetSelected('custom');
    
    if (localDateRange.endDate && newStartDate > localDateRange.endDate) {
      // If start date is after end date, update end date to start date
      const newDateRange = {
        startDate: newStartDate,
        endDate: newStartDate,
      };
      setLocalDateRange(newDateRange);
      onChange(newDateRange);
    } else {
      onChange({ ...localDateRange, startDate: newStartDate });
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setLocalDateRange(prev => ({ ...prev, endDate: newEndDate }));
    setPresetSelected('custom');
    
    if (localDateRange.startDate && newEndDate < localDateRange.startDate) {
      // If end date is before start date, update start date to end date
      const newDateRange = {
        startDate: newEndDate,
        endDate: newEndDate,
      };
      setLocalDateRange(newDateRange);
      onChange(newDateRange);
    } else {
      onChange({ ...localDateRange, endDate: newEndDate });
    }
  };

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleApply = () => {
    onChange(localDateRange);
  };

  const handleClear = () => {
    const clearedRange = {
      startDate: '',
      endDate: '',
    };
    setLocalDateRange(clearedRange);
    setPresetSelected('');
    onChange(clearedRange);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Preset Dropdown */}
      <div className="flex items-center space-x-2">
        <label htmlFor="preset" className="text-sm font-medium text-gray-700">
          Period:
        </label>
        <select
          id="preset"
          value={presetSelected}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">Select Period</option>
          {presetRanges.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Inputs */}
      <div className="flex items-center space-x-2">
        <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
          From:
        </label>
        <input
          type="date"
          id="startDate"
          value={localDateRange.startDate}
          onChange={handleStartDateChange}
          max={localDateRange.endDate || formatDateForInput(new Date())}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      <div className="flex items-center space-x-2">
        <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
          To:
        </label>
        <input
          type="date"
          id="endDate"
          value={localDateRange.endDate}
          onChange={handleEndDateChange}
          min={localDateRange.startDate}
          max={formatDateForInput(new Date())}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleClear}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          disabled={!localDateRange.startDate || !localDateRange.endDate}
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </div>

      {/* Display Current Range */}
      {localDateRange.startDate && localDateRange.endDate && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Selected:</span> {new Date(localDateRange.startDate).toLocaleDateString()} - {new Date(localDateRange.endDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;