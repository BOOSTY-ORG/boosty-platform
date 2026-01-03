import React, { useState } from 'react';

const ExportModal = ({ onClose, onExport }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportOptions, setExportOptions] = useState({
    includeHeaders: true,
    includeCharts: false,
    includeFilters: true,
    includeMetadata: false,
    dateRange: 'current',
    customDateRange: {
      startDate: '',
      endDate: '',
    },
    selectedSections: {
      kpi: true,
      transactions: true,
      payouts: true,
      roi: true,
      performance: true,
    },
    fileName: `financial-data-${new Date().toISOString().split('T')[0]}`,
  });

  const formatOptions = [
    { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheet applications' },
    { value: 'excel', label: 'Excel', description: 'Microsoft Excel format with multiple sheets' },
    { value: 'pdf', label: 'PDF', description: 'Portable Document Format for reports and presentations' },
    { value: 'json', label: 'JSON', description: 'JavaScript Object Notation for developers' },
    { value: 'xml', label: 'XML', description: 'eXtensible Markup Language for data exchange' },
  ];

  const sections = [
    { key: 'kpi', label: 'KPI Data', description: 'Key performance indicators and metrics' },
    { key: 'transactions', label: 'Transaction Data', description: 'All transaction records and details' },
    { key: 'payouts', label: 'Payout Data', description: 'Payout records and distribution information' },
    { key: 'roi', label: 'ROI Analytics', description: 'Return on investment calculations and analysis' },
    { key: 'performance', label: 'Performance Data', description: 'Portfolio and investor performance metrics' },
  ];

  const handleFormatChange = (format) => {
    setExportFormat(format);
  };

  const handleOptionChange = (option, value) => {
    if (option.includes('.')) {
      const [parent, child] = option.split('.');
      setExportOptions(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else if (option.includes('selectedSections')) {
      setExportOptions(prev => ({
        ...prev,
        selectedSections: {
          ...prev.selectedSections,
          [option.split('.')[1]]: value,
        },
      }));
    } else {
      setExportOptions(prev => ({
        ...prev,
        [option]: value,
      }));
    }
  };

  const handleExport = () => {
    onExport(exportFormat, exportOptions);
  };

  const handleClose = () => {
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getFileExtension = () => {
    switch (exportFormat) {
      case 'excel':
        return '.xlsx';
      case 'csv':
        return '.csv';
      case 'pdf':
        return '.pdf';
      case 'json':
        return '.json';
      case 'xml':
        return '.xml';
      default:
        return '.csv';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={handleOverlayClick}
    >
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Export Financial Data</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              {formatOptions.map((format) => (
                <div key={format.value} className="flex items-start">
                  <input
                    type="radio"
                    id={format.value}
                    name="format"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={() => handleFormatChange(format.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <label htmlFor={format.value} className="text-sm font-medium text-gray-900">
                      {format.label}
                    </label>
                    <p className="text-sm text-gray-500">{format.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* File Name */}
          <div>
            <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
              File Name
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                id="fileName"
                value={exportOptions.fileName}
                onChange={(e) => handleOptionChange('fileName', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-500">{getFileExtension()}</span>
            </div>
          </div>

          {/* Data Sections */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Sections
            </label>
            <div className="space-y-2">
              {sections.map((section) => (
                <div key={section.key} className="flex items-start">
                  <input
                    type="checkbox"
                    id={section.key}
                    checked={exportOptions.selectedSections[section.key]}
                    onChange={(e) => handleOptionChange(`selectedSections.${section.key}`, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <label htmlFor={section.key} className="text-sm font-medium text-gray-900">
                      {section.label}
                    </label>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Options
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeHeaders"
                  checked={exportOptions.includeHeaders}
                  onChange={(e) => handleOptionChange('includeHeaders', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeHeaders" className="ml-2 text-sm text-gray-700">
                  Include column headers
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeCharts"
                  checked={exportOptions.includeCharts}
                  onChange={(e) => handleOptionChange('includeCharts', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeCharts" className="ml-2 text-sm text-gray-700">
                  Include charts and graphs (PDF only)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeFilters"
                  checked={exportOptions.includeFilters}
                  onChange={(e) => handleOptionChange('includeFilters', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeFilters" className="ml-2 text-sm text-gray-700">
                  Include current filters
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeMetadata"
                  checked={exportOptions.includeMetadata}
                  onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeMetadata" className="ml-2 text-sm text-gray-700">
                  Include metadata (export date, user, etc.)
                </label>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="current"
                  name="dateRange"
                  value="current"
                  checked={exportOptions.dateRange === 'current'}
                  onChange={() => handleOptionChange('dateRange', 'current')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="current" className="ml-2 text-sm text-gray-700">
                  Use current date range
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="all"
                  name="dateRange"
                  value="all"
                  checked={exportOptions.dateRange === 'all'}
                  onChange={() => handleOptionChange('dateRange', 'all')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="all" className="ml-2 text-sm text-gray-700">
                  All available data
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="custom"
                  name="dateRange"
                  value="custom"
                  checked={exportOptions.dateRange === 'custom'}
                  onChange={() => handleOptionChange('dateRange', 'custom')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="custom" className="ml-2 text-sm text-gray-700">
                  Custom date range
                </label>
              </div>
            </div>

            {exportOptions.dateRange === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={exportOptions.customDateRange.startDate}
                    onChange={(e) => handleOptionChange('customDateRange.startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={exportOptions.customDateRange.endDate}
                    onChange={(e) => handleOptionChange('customDateRange.endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;