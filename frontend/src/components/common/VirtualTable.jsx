import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

/**
 * VirtualTable component for efficiently rendering large datasets
 * Implements virtual scrolling to only render visible rows
 */
const VirtualTable = ({
  data = [],
  columns = [],
  height = 400,
  rowHeight = 50,
  headerHeight = 40,
  overscan = 5,
  className = '',
  loading = false,
  onSort,
  sortField,
  sortDirection,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  emptyMessage = 'No data available',
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [columnWidths, setColumnWidths] = useState({});
  const [resizingColumn, setResizingColumn] = useState(null);
  const tableRef = useRef(null);
  const scrollElementRef = useRef(null);

  // Calculate visible rows
  const visibleRows = useMemo(() => {
    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIdx = Math.min(
      data.length,
      Math.ceil((scrollTop + height) / rowHeight) + overscan
    );
    
    return {
      start: startIdx,
      end: endIdx,
      rows: data.slice(startIdx, endIdx),
      offsetY: startIdx * rowHeight,
    };
  }, [data, scrollTop, rowHeight, height, overscan]);

  // Handle scroll event
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Handle column resize
  const handleColumnResizeStart = (columnKey, e) => {
    e.preventDefault();
    setResizingColumn(columnKey);
    
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || getDefaultColumnWidth(columnKey);
    
    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth,
      }));
    };
    
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get default column width
  const getDefaultColumnWidth = (columnKey) => {
    const column = columns.find(col => col.key === columnKey);
    return column?.defaultWidth || 150;
  };

  // Handle sort
  const handleSort = (columnKey) => {
    if (onSort) {
      const newDirection = sortField === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnKey, newDirection);
    }
  };

  // Handle row selection
  const handleRowSelect = (rowIndex, selected) => {
    if (onSelectionChange) {
      let newSelection;
      if (selected) {
        newSelection = [...selectedRows, rowIndex];
      } else {
        newSelection = selectedRows.filter(i => i !== rowIndex);
      }
      onSelectionChange(newSelection);
    }
  };

  // Handle select all
  const handleSelectAll = (selected) => {
    if (onSelectionChange) {
      if (selected) {
        onSelectionChange(data.map((_, index) => index));
      } else {
        onSelectionChange([]);
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!tableRef.current) return;
    
    const { key } = e;
    const currentFocus = document.activeElement;
    const isTableRow = currentFocus?.closest('[data-row-index]');
    
    if (isTableRow) {
      const currentIndex = parseInt(currentFocus.dataset.rowIndex);
      
      switch (key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            const prevRow = tableRef.current.querySelector(`[data-row-index="${currentIndex - 1}"]`);
            prevRow?.focus();
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < data.length - 1) {
            const nextRow = tableRef.current.querySelector(`[data-row-index="${currentIndex + 1}"]`);
            nextRow?.focus();
          }
          break;
          
        case 'Home':
          e.preventDefault();
          const firstRow = tableRef.current.querySelector('[data-row-index="0"]');
          firstRow?.focus();
          break;
          
        case 'End':
          e.preventDefault();
          const lastRow = tableRef.current.querySelector(`[data-row-index="${data.length - 1}"]`);
          lastRow?.focus();
          break;
      }
    }
  }, [data.length]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render cell content
  const renderCell = (column, row, rowIndex) => {
    const value = row[column.key];
    const content = column.render ? column.render(value, row, rowIndex) : value;
    
    return (
      <div
        className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis"
        style={{ width: columnWidths[column.key] || getDefaultColumnWidth(column.key) }}
        title={typeof content === 'string' ? content : undefined}
      >
        {content}
      </div>
    );
  };

  // Render header cell
  const renderHeaderCell = (column) => {
    const isSortable = column.sortable !== false;
    const isSorted = sortField === column.key;
    const width = columnWidths[column.key] || getDefaultColumnWidth(column.key);
    
    return (
      <div
        key={column.key}
        className="relative flex items-center px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-b border-gray-200"
        style={{ width }}
      >
        {isSortable ? (
          <button
            onClick={() => handleSort(column.key)}
            className="flex items-center gap-1 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={`Sort by ${column.title}`}
            aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            {column.title}
            {isSorted && (
              sortDirection === 'asc' ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )
            )}
          </button>
        ) : (
          <span>{column.title}</span>
        )}
        
        {/* Resize handle */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500"
          onMouseDown={(e) => handleColumnResizeStart(column.key, e)}
          aria-label={`Resize ${column.title} column`}
        />
      </div>
    );
  };

  // Render row
  const renderRow = (row, rowIndex) => {
    const globalIndex = visibleRows.start + rowIndex;
    const isSelected = selectedRows.includes(globalIndex);
    
    return (
      <div
        key={row.id || globalIndex}
        data-row-index={globalIndex}
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
          isSelected ? 'bg-blue-50' : ''
        } ${onRowClick ? 'cursor-pointer' : ''}`}
        style={{ height: rowHeight }}
        onClick={() => onRowClick?.(row, globalIndex)}
        tabIndex={0}
        role="row"
        aria-selected={isSelected}
      >
        {/* Selection checkbox */}
        {onSelectionChange && (
          <div className="px-4 py-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelect(globalIndex, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              aria-label={`Select row ${globalIndex + 1}`}
            />
          </div>
        )}
        
        {/* Data cells */}
        {columns.map(column => renderCell(column, row, globalIndex))}
      </div>
    );
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 bg-white border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200" style={{ height: headerHeight }}>
        {/* Select all checkbox */}
        {onSelectionChange && (
          <div className="px-4 py-3">
            <input
              type="checkbox"
              checked={selectedRows.length === data.length && data.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              aria-label="Select all rows"
            />
          </div>
        )}
        
        {/* Column headers */}
        {columns.map(renderHeaderCell)}
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollElementRef}
        className="overflow-auto"
        style={{ height }}
        onScroll={handleScroll}
        role="table"
        aria-label="Data table with virtual scrolling"
      >
        {/* Spacer for visible rows offset */}
        <div style={{ height: visibleRows.offsetY }} />
        
        {/* Visible rows */}
        {visibleRows.rows.map((row, index) => renderRow(row, index))}
        
        {/* Spacer for remaining rows */}
        <div style={{ height: (data.length - visibleRows.end) * rowHeight }} />
      </div>

      {/* Resize cursor */}
      {resizingColumn && (
        <div className="fixed inset-0 cursor-col-resize z-50" />
      )}

      {/* Row count indicator */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
        Showing {visibleRows.start + 1}-{Math.min(visibleRows.end, data.length)} of {data.length} rows
      </div>
    </div>
  );
};

export default VirtualTable;