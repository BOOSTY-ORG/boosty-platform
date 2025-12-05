import React, { useState, useMemo, useCallback } from 'react';

const FinanceFilterPanel = ({ filters, onFilterChange, onClose }) => {
  const [localFilters, setLocalFilters] = useState({
    investorType: filters.investorType || '',
    status: filters.status || '',
    amountRange: {
      min: filters.amountRange?.min || '',
      max: filters.amountRange?.max || '',
    },
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc',
    transactionType: filters.transactionType || '',
    payoutStatus: filters.payoutStatus || '',
    roiRange: {
      min: filters.roiRange?.min || '',
      max: filters.roiRange?.max || '',
    },
  });

  const handleInputChange = useCallback((field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setLocalFilters(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setLocalFilters(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFilterChange(localFilters);
  }, [localFilters, onFilterChange]);

  const handleResetFilters = useCallback(() => {
    const resetFilters = {
      investorType: '',
      status: '',
      amountRange: { min: '', max: '' },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      transactionType: '',
      payoutStatus: '',
      roiRange: { min: '', max: '' },
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  }, [onFilterChange]);

  return (
    <div className="space-y-6" role="form" aria-label="Financial filters">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Financial Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
          aria-label="Close filters"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Investor Type Filter */}
        <div>
          <label htmlFor="investorType" className="block text-sm font-medium text-gray-700 mb-1">
            Investor Type
          </label>
          <select
            id="investorType"
            value={localFilters.investorType}
            onChange={(e) => handleInputChange('investorType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-describedby="investorType-desc"
          >
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
            <option value="institutional">Institutional</option>
            <option value="retail">Retail</option>
          </select>
          <div id="investorType-desc" className="sr-only">
            Select investor type to filter by individual, corporate, institutional, or retail investors
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Transaction Type Filter */}
        <div>
          <label htmlFor="transactionType" className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Type
          </label>
          <select
            id="transactionType"
            value={localFilters.transactionType}
            onChange={(e) => handleInputChange('transactionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="investment">Investment</option>
            <option value="payout">Payout</option>
            <option value="refund">Refund</option>
            <option value="fee">Fee</option>
            <option value="bonus">Bonus</option>
          </select>
        </div>

        {/* Payout Status Filter */}
        <div>
          <label htmlFor="payoutStatus" className="block text-sm font-medium text-gray-700 mb-1">
            Payout Status
          </label>
          <select
            id="payoutStatus"
            value={localFilters.payoutStatus}
            onChange={(e) => handleInputChange('payoutStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sort By Filter */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sortBy"
            value={localFilters.sortBy}
            onChange={(e) => handleInputChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="createdAt">Date Created</option>
            <option value="amount">Amount</option>
            <option value="investorName">Investor Name</option>
            <option value="roi">ROI</option>
            <option value="status">Status</option>
            <option value="updatedAt">Last Updated</option>
          </select>
        </div>

        {/* Sort Order Filter */}
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            Sort Order
          </label>
          <select
            id="sortOrder"
            value={localFilters.sortOrder}
            onChange={(e) => handleInputChange('sortOrder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Amount Range Filter */}
      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">Amount Range</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="amountMin" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Amount
            </label>
            <input
              type="number"
              id="amountMin"
              value={localFilters.amountRange.min}
              onChange={(e) => handleInputChange('amountRange.min', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="amountMax" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum Amount
            </label>
            <input
              type="number"
              id="amountMax"
              value={localFilters.amountRange.max}
              onChange={(e) => handleInputChange('amountRange.max', e.target.value)}
              placeholder="1000000.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* ROI Range Filter */}
      <div className="border-t pt-4">
        <h4 className="text-md font-medium text-gray-900 mb-3">ROI Range (%)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="roiMin" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum ROI
            </label>
            <input
              type="number"
              id="roiMin"
              value={localFilters.roiRange.min}
              onChange={(e) => handleInputChange('roiRange.min', e.target.value)}
              placeholder="0"
              step="0.1"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="roiMax" className="block text-sm font-medium text-gray-700 mb-1">
              Maximum ROI
            </label>
            <input
              type="number"
              id="roiMax"
              value={localFilters.roiRange.max}
              onChange={(e) => handleInputChange('roiRange.max', e.target.value)}
              placeholder="100"
              step="0.1"
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          onClick={handleResetFilters}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Reset
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default FinanceFilterPanel;