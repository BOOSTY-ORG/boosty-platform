import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable Table component with multi-column sorting, filtering, and pagination support
 */
const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  tableClassName = '',
  theadClassName = '',
  tbodyClassName = '',
  trClassName = '',
  thClassName = '',
  tdClassName = '',
  sortable = false,
  onSort,
  defaultSortField,
  defaultSortDirection = 'asc',
  multiColumnSort = false,
  pagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  rowsPerPage = 10,
  onRowsPerPageChange,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  filterable = false,
  onFilter,
  columnVisibility = true,
  defaultVisibleColumns,
  ...props
}) => {
  const [sortFields, setSortFields] = useState(
    multiColumnSort && defaultSortField
      ? [{ field: defaultSortField, direction: defaultSortDirection }]
      : []
  );
  const [singleSortField, setSingleSortField] = useState(defaultSortField);
  const [singleSortDirection, setSingleSortDirection] = useState(defaultSortDirection);
  const [filters, setFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(
    defaultVisibleColumns || columns.map(col => col.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  
  const handleSort = (field) => {
    if (!sortable || !onSort) return;
    
    if (multiColumnSort) {
      const existingIndex = sortFields.findIndex(s => s.field === field);
      let newSortFields;
      
      if (existingIndex !== -1) {
        // Toggle direction or remove if already descending
        if (sortFields[existingIndex].direction === 'asc') {
          newSortFields = sortFields.map((s, i) =>
            i === existingIndex ? { ...s, direction: 'desc' } : s
          );
        } else {
          newSortFields = sortFields.filter((_, i) => i !== existingIndex);
        }
      } else {
        // Add new sort field
        newSortFields = [...sortFields, { field, direction: 'asc' }];
      }
      
      setSortFields(newSortFields);
      onSort(newSortFields);
    } else {
      let newDirection = 'asc';
      if (singleSortField === field && singleSortDirection === 'asc') {
        newDirection = 'desc';
      }
      
      setSingleSortField(field);
      setSingleSortDirection(newDirection);
      onSort(field, newDirection);
    }
  };
  
  const handleFilter = (field, value) => {
    if (!filterable || !onFilter) return;
    
    const newFilters = { ...filters };
    if (value === '' || value === null || value === undefined) {
      delete newFilters[field];
    } else {
      newFilters[field] = value;
    }
    
    setFilters(newFilters);
    onFilter(newFilters);
  };
  
  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };
  
  const handleSelectAll = (checked) => {
    if (!selectable || !onSelectionChange) return;
    
    if (checked) {
      const allIds = data.map(row => row.id || row._id);
      onSelectionChange([...new Set([...selectedRows, ...allIds])]);
    } else {
      onSelectionChange([]);
    }
  };
  
  const handleSelectRow = (id, checked) => {
    if (!selectable || !onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedRows, id]);
    } else {
      onSelectionChange(selectedRows.filter(rowId => rowId !== id));
    }
  };
  
  const isAllSelected = selectable && data.length > 0 && 
    data.every(row => selectedRows.includes(row.id || row._id));
  
  const isIndeterminate = selectable && 
    selectedRows.length > 0 && 
    selectedRows.length < data.length;
  
  const renderSortIcon = (field) => {
    if (!sortable) return null;
    
    if (multiColumnSort) {
      const sortField = sortFields.find(s => s.field === field);
      const isActive = !!sortField;
      const isAsc = isActive && sortField.direction === 'asc';
      const sortIndex = sortFields.findIndex(s => s.field === field);
      
      return (
        <span className="ml-2 flex items-center">
          {isActive ? (
            <div className="flex items-center">
              <span className="text-xs font-medium text-blue-600 mr-1">{sortIndex + 1}</span>
              {isAsc ? (
                <svg className="inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
          ) : (
            <svg className="inline h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </span>
      );
    } else {
      const isActive = singleSortField === field;
      const isAsc = isActive && singleSortDirection === 'asc';
      
      return (
        <span className="ml-2">
          {isActive ? (
            isAsc ? (
              <svg className="inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="inline h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )
          ) : (
            <svg className="inline h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </span>
      );
    }
  };
  
  const renderFilterInput = (column) => {
    if (!filterable || !column.filterable) return null;
    
    const filterValue = filters[column.key] || '';
    
    switch (column.filterType) {
      case 'select':
        return (
          <select
            className="mt-1 block w-full pl-3 pr-10 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded"
            value={filterValue}
            onChange={(e) => handleFilter(column.key, e.target.value)}
          >
            <option value="">All</option>
            {column.filterOptions?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'date':
        return (
          <input
            type="date"
            className="mt-1 block w-full pl-3 pr-10 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded"
            value={filterValue}
            onChange={(e) => handleFilter(column.key, e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className="mt-1 block w-full pl-3 pr-10 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded"
            value={filterValue}
            onChange={(e) => handleFilter(column.key, e.target.value)}
            placeholder="Filter..."
          />
        );
      default:
        return (
          <input
            type="text"
            className="mt-1 block w-full pl-3 pr-10 py-1 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded"
            value={filterValue}
            onChange={(e) => handleFilter(column.key, e.target.value)}
            placeholder="Filter..."
          />
        );
    }
  };
  
  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className={`overflow-x-auto ${className}`}>
      {columnVisibility && (
        <div className="mb-2 flex justify-end">
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Columns
            </button>
            
            {showColumnMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu">
                  {columns.map((column) => (
                    <label
                      key={column.key}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      role="menuitem"
                    >
                      <input
                        type="checkbox"
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={visibleColumns.includes(column.key)}
                        onChange={() => toggleColumnVisibility(column.key)}
                      />
                      {column.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <table className={`min-w-full divide-y divide-gray-200 ${tableClassName}`} {...props}>
        <thead className={`bg-gray-50 ${theadClassName}`}>
          <tr>
            {selectable && (
              <th scope="col" className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
            )}
            {columns
              .filter(column => visibleColumns.includes(column.key))
              .map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                } ${thClassName}`}
                onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
              >
                <div>
                  {column.title}
                  {sortable && column.sortable !== false && renderSortIcon(column.key)}
                </div>
                {filterable && column.filterable && renderFilterInput(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={`bg-white divide-y divide-gray-200 ${tbodyClassName}`}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length + (selectable ? 1 : 0)} className="px-6 py-4 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || row._id || index} className={`hover:bg-gray-50 ${trClassName}`}>
                {selectable && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.includes(row.id || row._id)}
                      onChange={(e) => handleSelectRow(row.id || row._id, e.target.checked)}
                    />
                  </td>
                )}
                {columns
                  .filter(column => visibleColumns.includes(column.key))
                  .map((column) => (
                  <td key={column.key} className={`px-6 py-4 whitespace-nowrap ${tdClassName}`}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {pagination && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * rowsPerPage, data.length)}
                </span>{' '}
                of <span className="font-medium">{totalPages * rowsPerPage}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      filterable: PropTypes.bool,
      filterType: PropTypes.oneOf(['text', 'select', 'date', 'number']),
      filterOptions: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.any.isRequired,
          label: PropTypes.string.isRequired,
        })
      ),
      render: PropTypes.func,
    })
  ),
  data: PropTypes.array,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  className: PropTypes.string,
  tableClassName: PropTypes.string,
  theadClassName: PropTypes.string,
  tbodyClassName: PropTypes.string,
  trClassName: PropTypes.string,
  thClassName: PropTypes.string,
  tdClassName: PropTypes.string,
  sortable: PropTypes.bool,
  onSort: PropTypes.func,
  defaultSortField: PropTypes.string,
  defaultSortDirection: PropTypes.oneOf(['asc', 'desc']),
  multiColumnSort: PropTypes.bool,
  pagination: PropTypes.bool,
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  onPageChange: PropTypes.func,
  rowsPerPage: PropTypes.number,
  onRowsPerPageChange: PropTypes.func,
  selectable: PropTypes.bool,
  selectedRows: PropTypes.array,
  onSelectionChange: PropTypes.func,
  filterable: PropTypes.bool,
  onFilter: PropTypes.func,
  columnVisibility: PropTypes.bool,
  defaultVisibleColumns: PropTypes.array,
};

export default Table;