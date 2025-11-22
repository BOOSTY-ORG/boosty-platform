import React, { useState, useEffect } from 'react';
import { Modal, Button, useNotification } from '../common/index.js';
import { usersAPI } from '../../api/users.js';

const ExportModal = ({ isOpen, onClose, userIds = [], currentFilters = {} }) => {
  const { showNotification } = useNotification();
  
  // Export configuration states
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportScope, setExportScope] = useState(userIds.length > 0 ? 'selected' : 'filtered');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [includeRelatedData, setIncludeRelatedData] = useState({
    applications: false,
    installations: false,
    communications: false,
    documents: false,
  });
  const [csvOptions, setCsvOptions] = useState({
    delimiter: ',',
    includeHeaders: true,
    encoding: 'utf-8',
  });
  const [excelOptions, setExcelOptions] = useState({
    includeCharts: false,
    freezeHeader: true,
    autoFilter: true,
  });
  const [pdfOptions, setPdfOptions] = useState({
    orientation: 'portrait',
    pageSize: 'A4',
    includeTableOfContents: false,
    includeSummary: true,
  });
  const [scheduleOptions, setScheduleOptions] = useState({
    enabled: false,
    frequency: 'once',
    emailRecipients: '',
    scheduleDate: '',
    scheduleTime: '',
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Available columns for export
  const availableColumns = [
    { key: '_id', label: 'ID', category: 'basic' },
    { key: 'userId', label: 'User ID', category: 'basic' },
    { key: 'firstName', label: 'First Name', category: 'basic' },
    { key: 'lastName', label: 'Last Name', category: 'basic' },
    { key: 'email', label: 'Email', category: 'contact' },
    { key: 'phone', label: 'Phone', category: 'contact' },
    { key: 'address', label: 'Address', category: 'contact' },
    { key: 'city', label: 'City', category: 'contact' },
    { key: 'country', label: 'Country', category: 'contact' },
    { key: 'status', label: 'Status', category: 'status' },
    { key: 'applicationStatus', label: 'Application Status', category: 'status' },
    { key: 'installationStatus', label: 'Installation Status', category: 'status' },
    { key: 'kycStatus', label: 'KYC Status', category: 'status' },
    { key: 'riskLevel', label: 'Risk Level', category: 'status' },
    { key: 'joinedDate', label: 'Joined Date', category: 'dates' },
    { key: 'lastActiveDate', label: 'Last Active Date', category: 'dates' },
    { key: 'createdAt', label: 'Created At', category: 'dates' },
    { key: 'updatedAt', label: 'Updated At', category: 'dates' },
  ];

  // Load export templates on component mount
  useEffect(() => {
    if (isOpen) {
      loadExportTemplates();
      // Set default selected columns
      setSelectedColumns([
        'userId', 'firstName', 'lastName', 'email', 'phone', 
        'status', 'applicationStatus', 'installationStatus', 'joinedDate'
      ]);
    }
  }, [isOpen]);

  const loadExportTemplates = async () => {
    try {
      const response = await usersAPI.getExportTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to load export templates:', error);
    }
  };

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t._id === templateId);
      if (template) {
        setExportFormat(template.format);
        setSelectedColumns(template.columns || []);
        setIncludeRelatedData(template.includeRelatedData || {});
        setCsvOptions(template.csvOptions || csvOptions);
        setExcelOptions(template.excelOptions || excelOptions);
        setPdfOptions(template.pdfOptions || pdfOptions);
      }
    }
  };

  const handleColumnToggle = (columnKey) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map(col => col.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleRelatedDataToggle = (dataType) => {
    setIncludeRelatedData(prev => ({
      ...prev,
      [dataType]: !prev[dataType]
    }));
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      showNotification({
        type: 'error',
        message: 'Please select at least one column to export'
      });
      return;
    }

    setIsExporting(true);
    try {
      const exportOptions = {
        format: exportFormat,
        scope: exportScope,
        userIds: exportScope === 'selected' ? userIds : undefined,
        filters: exportScope === 'filtered' ? currentFilters : undefined,
        columns: selectedColumns,
        includeRelatedData,
        csvOptions: exportFormat === 'csv' ? csvOptions : undefined,
        excelOptions: exportFormat === 'xlsx' ? excelOptions : undefined,
        pdfOptions: exportFormat === 'pdf' ? pdfOptions : undefined,
        scheduleOptions: scheduleOptions.enabled ? scheduleOptions : undefined,
      };

      // Save as template if requested
      if (saveAsTemplate && templateName) {
        await usersAPI.createExportTemplate({
          name: templateName,
          format: exportFormat,
          columns: selectedColumns,
          includeRelatedData,
          csvOptions,
          excelOptions,
          pdfOptions,
        });
      }

      const response = await usersAPI.exportUsersAdvanced(exportOptions);
      
      // For large exports, the response might contain an export ID instead of file data
      if (response.data?.exportId) {
        showNotification({
          type: 'info',
          message: 'Export started. You can track progress in the export history.'
        });
        onClose();
      } else {
        // Direct download for small exports
        const blob = new Blob([response.data], {
          type: getContentType(exportFormat)
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        showNotification({
          type: 'success',
          message: `Successfully exported users in ${exportFormat.toUpperCase()} format`
        });

        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      showNotification({
        type: 'error',
        message: 'Export failed. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getContentType = (format) => {
    switch (format) {
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  };

  const groupColumnsByCategory = () => {
    const grouped = {};
    availableColumns.forEach(column => {
      if (!grouped[column.category]) {
        grouped[column.category] = [];
      }
      grouped[column.category].push(column);
    });
    return grouped;
  };

  const groupedColumns = groupColumnsByCategory();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Users"
      size="xl"
    >
      <div className="space-y-6">
        {/* Export Scope */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Export Scope</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="scope"
                value="all"
                checked={exportScope === 'all'}
                onChange={(e) => setExportScope(e.target.value)}
                className="mr-2"
              />
              <span>All Users</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="scope"
                value="filtered"
                checked={exportScope === 'filtered'}
                onChange={(e) => setExportScope(e.target.value)}
                className="mr-2"
                disabled={Object.keys(currentFilters).length === 0}
              />
              <span>Filtered Results ({Object.keys(currentFilters).length > 0 ? 'Active' : 'No filters applied'})</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="scope"
                value="selected"
                checked={exportScope === 'selected'}
                onChange={(e) => setExportScope(e.target.value)}
                className="mr-2"
                disabled={userIds.length === 0}
              />
              <span>Selected Users ({userIds.length})</span>
            </label>
          </div>
        </div>

        {/* Export Format */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Export Format</h3>
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value="xlsx"
                checked={exportFormat === 'xlsx'}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2"
              />
              <div>
                <div className="font-medium">Excel (.xlsx)</div>
                <div className="text-sm text-gray-500">Best for data analysis</div>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2"
              />
              <div>
                <div className="font-medium">CSV (.csv)</div>
                <div className="text-sm text-gray-500">Universal format</div>
              </div>
            </label>
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mr-2"
              />
              <div>
                <div className="font-medium">PDF (.pdf)</div>
                <div className="text-sm text-gray-500">For reports and sharing</div>
              </div>
            </label>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Export Template</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="">Select a template (optional)</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => {
                setSelectedTemplate('');
                setSelectedColumns([
                  'userId', 'firstName', 'lastName', 'email', 'phone', 
                  'status', 'applicationStatus', 'installationStatus', 'joinedDate'
                ]);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Column Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Select Columns</h3>
            <div className="space-x-2">
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-800"
                onClick={handleSelectAllColumns}
              >
                Select All
              </button>
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-800"
                onClick={handleDeselectAllColumns}
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
            {Object.entries(groupedColumns).map(([category, columns]) => (
              <div key={category} className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2 capitalize">{category}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map(column => (
                    <label key={column.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.key)}
                        onChange={() => handleColumnToggle(column.key)}
                        className="mr-2"
                      />
                      <span className="text-sm">{column.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Related Data */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Include Related Data</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRelatedData.applications}
                onChange={() => handleRelatedDataToggle('applications')}
                className="mr-2"
              />
              <span>Application Details</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRelatedData.installations}
                onChange={() => handleRelatedDataToggle('installations')}
                className="mr-2"
              />
              <span>Installation Details</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRelatedData.communications}
                onChange={() => handleRelatedDataToggle('communications')}
                className="mr-2"
              />
              <span>Communication History</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeRelatedData.documents}
                onChange={() => handleRelatedDataToggle('documents')}
                className="mr-2"
              />
              <span>KYC Document Status</span>
            </label>
          </div>
        </div>

        {/* Format-specific Options */}
        {exportFormat === 'csv' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">CSV Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delimiter</label>
                <select
                  value={csvOptions.delimiter}
                  onChange={(e) => setCsvOptions({...csvOptions, delimiter: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Encoding</label>
                <select
                  value={csvOptions.encoding}
                  onChange={(e) => setCsvOptions({...csvOptions, encoding: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="utf-16">UTF-16</option>
                  <option value="iso-8859-1">ISO-8859-1</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={csvOptions.includeHeaders}
                  onChange={(e) => setCsvOptions({...csvOptions, includeHeaders: e.target.checked})}
                  className="mr-2"
                />
                <span>Include Headers</span>
              </label>
            </div>
          </div>
        )}

        {exportFormat === 'xlsx' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Excel Options</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.freezeHeader}
                  onChange={(e) => setExcelOptions({...excelOptions, freezeHeader: e.target.checked})}
                  className="mr-2"
                />
                <span>Freeze Header Row</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.autoFilter}
                  onChange={(e) => setExcelOptions({...excelOptions, autoFilter: e.target.checked})}
                  className="mr-2"
                />
                <span>Enable AutoFilter</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.includeCharts}
                  onChange={(e) => setExcelOptions({...excelOptions, includeCharts: e.target.checked})}
                  className="mr-2"
                />
                <span>Include Summary Charts</span>
              </label>
            </div>
          </div>
        )}

        {exportFormat === 'pdf' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">PDF Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orientation</label>
                <select
                  value={pdfOptions.orientation}
                  onChange={(e) => setPdfOptions({...pdfOptions, orientation: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                <select
                  value={pdfOptions.pageSize}
                  onChange={(e) => setPdfOptions({...pdfOptions, pageSize: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pdfOptions.includeTableOfContents}
                  onChange={(e) => setPdfOptions({...pdfOptions, includeTableOfContents: e.target.checked})}
                  className="mr-2"
                />
                <span>Include Table of Contents</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pdfOptions.includeSummary}
                  onChange={(e) => setPdfOptions({...pdfOptions, includeSummary: e.target.checked})}
                  className="mr-2"
                />
                <span>Include Summary Statistics</span>
              </label>
            </div>
          </div>
        )}

        {/* Save as Template */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="mr-2"
            />
            <span>Save as Template</span>
          </label>
          {saveAsTemplate && (
            <div className="mt-2">
              <input
                type="text"
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              />
            </div>
          )}
        </div>

        {/* Schedule Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule Export</h3>
          <label className="flex items-center mb-3">
            <input
              type="checkbox"
              checked={scheduleOptions.enabled}
              onChange={(e) => setScheduleOptions({...scheduleOptions, enabled: e.target.checked})}
              className="mr-2"
            />
            <span>Schedule this export</span>
          </label>
          {scheduleOptions.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={scheduleOptions.frequency}
                  onChange={(e) => setScheduleOptions({...scheduleOptions, frequency: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Recipients</label>
                <input
                  type="text"
                  placeholder="email@example.com, email2@example.com"
                  value={scheduleOptions.emailRecipients}
                  onChange={(e) => setScheduleOptions({...scheduleOptions, emailRecipients: e.target.value})}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                />
              </div>
              {scheduleOptions.frequency === 'once' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleOptions.scheduleDate}
                      onChange={(e) => setScheduleOptions({...scheduleOptions, scheduleDate: e.target.value})}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleOptions.scheduleTime}
                      onChange={(e) => setScheduleOptions({...scheduleOptions, scheduleTime: e.target.value})}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isExporting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isExporting || selectedColumns.length === 0}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>
    </Modal>
  );
};

export default ExportModal;