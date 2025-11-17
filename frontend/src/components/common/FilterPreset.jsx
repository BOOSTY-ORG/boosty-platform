import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * FilterPreset component for saving and loading filter configurations
 */
const FilterPreset = ({
  filters = {},
  onFiltersChange,
  availableFilters = [],
  className = '',
}) => {
  const [presets, setPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load presets from localStorage on component mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('filterPresets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Error loading filter presets:', error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('filterPresets', JSON.stringify(presets));
  }, [presets]);

  const savePreset = async () => {
    if (!presetName.trim()) return;

    setIsSaving(true);
    try {
      const newPreset = {
        id: Date.now().toString(),
        name: presetName.trim(),
        filters: { ...filters },
        createdAt: new Date().toISOString(),
      };

      setPresets([...presets, newPreset]);
      setPresetName('');
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Error saving preset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadPreset = (preset) => {
    onFiltersChange({ ...preset.filters });
  };

  const deletePreset = (presetId) => {
    setPresets(presets.filter(p => p.id !== presetId));
  };

  const updatePreset = (presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const updatedPreset = {
        ...preset,
        filters: { ...filters },
        updatedAt: new Date().toISOString(),
      };

      setPresets(presets.map(p => p.id === presetId ? updatedPreset : p));
    }
  };

  const getActivePreset = () => {
    return presets.find(preset => {
      const presetKeys = Object.keys(preset.filters);
      const currentKeys = Object.keys(filters);
      
      if (presetKeys.length !== currentKeys.length) return false;
      
      return presetKeys.every(key => {
        const presetValue = preset.filters[key];
        const currentValue = filters[key];
        
        if (Array.isArray(presetValue) && Array.isArray(currentValue)) {
          return JSON.stringify(presetValue.sort()) === JSON.stringify(currentValue.sort());
        }
        
        return JSON.stringify(presetValue) === JSON.stringify(currentValue);
      });
    });
  };

  const activePreset = getActivePreset();

  const formatFilterDisplay = (filterKey, filterValue) => {
    const filter = availableFilters.find(f => f.key === filterKey);
    if (!filter) return `${filterKey}: ${filterValue}`;

    let displayValue = filterValue;
    
    switch (filter.type) {
      case 'select':
        const option = filter.options?.find(opt => opt.value === filterValue);
        displayValue = option?.label || filterValue;
        break;
        
      case 'multiselect':
        if (Array.isArray(filterValue)) {
          displayValue = filterValue.map(v => {
            const opt = filter.options?.find(o => o.value === v);
            return opt?.label || v;
          }).join(', ');
        }
        break;
        
      case 'daterange':
        if (typeof filterValue === 'object' && filterValue) {
          displayValue = `${filterValue.start || ''} - ${filterValue.end || ''}`;
        }
        break;
        
      case 'number':
        if (typeof filterValue === 'object' && filterValue) {
          displayValue = `${filterValue.min || ''} - ${filterValue.max || ''}`;
        }
        break;
        
      case 'boolean':
        displayValue = filterValue ? 'Yes' : 'No';
        break;
        
      default:
        break;
    }

    return `${filter.label}: ${displayValue}`;
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Filter Presets
          </h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowSaveDialog(true)}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
              </svg>
              Save Current
            </button>
          </div>
        </div>

        {presets.length === 0 ? (
          <div className="text-center py-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No presets saved</h3>
            <p className="mt-1 text-sm text-gray-500">
              Save your frequently used filter combinations for quick access.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`border rounded-lg p-3 ${
                  activePreset?.id === preset.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{preset.name}</h4>
                    <div className="mt-1 text-xs text-gray-500">
                      Created: {new Date(preset.createdAt).toLocaleDateString()}
                      {preset.updatedAt && (
                        <span className="ml-2">
                          Updated: {new Date(preset.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(preset.filters).map(([key, value]) => (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800"
                        >
                          {formatFilterDisplay(key, value)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => loadPreset(preset)}
                      title="Load preset"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    {activePreset?.id === preset.id && (
                      <button
                        type="button"
                        className="text-green-600 hover:text-green-900"
                        onClick={() => updatePreset(preset.id)}
                        title="Update preset"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-900"
                      onClick={() => deletePreset(preset.id)}
                      title="Delete preset"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePreset && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">
                Currently using preset: {activePreset.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Save Filter Preset</h3>
            <div className="mb-4">
              <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 mb-2">
                Preset Name
              </label>
              <input
                type="text"
                id="preset-name"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name..."
                autoFocus
              />
            </div>
            
            {Object.keys(filters).length === 0 ? (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm text-yellow-800">
                    No active filters to save. Apply some filters first.
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Filters to save:</p>
                <div className="space-y-1">
                  {Object.entries(filters).map(([key, value]) => (
                    <div key={key} className="text-xs text-gray-500">
                      {formatFilterDisplay(key, value)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => {
                  setShowSaveDialog(false);
                  setPresetName('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={savePreset}
                disabled={!presetName.trim() || Object.keys(filters).length === 0 || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

FilterPreset.propTypes = {
  filters: PropTypes.object,
  onFiltersChange: PropTypes.func.isRequired,
  availableFilters: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      options: PropTypes.array,
    })
  ),
  className: PropTypes.string,
};

export default FilterPreset;