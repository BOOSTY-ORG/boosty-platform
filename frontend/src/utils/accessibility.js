/**
 * Accessibility utilities for the financial dashboard
 * Provides ARIA labels, keyboard navigation, screen reader support, and focus management
 */

/**
 * ARIA label generators
 */
export const ariaLabels = {
  /**
   * Generate ARIA label for data tables
   */
  table: (title, rowCount, columnCount) => `${title} data table with ${rowCount} rows and ${columnCount} columns`,
  
  /**
   * Generate ARIA label for sortable columns
   */
  sortableColumn: (columnName, sortDirection) => {
    const direction = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'unsorted';
    return `${columnName} column, currently sorted ${direction}. Activate to sort.`;
  },
  
  /**
   * Generate ARIA label for charts
   */
  chart: (chartType, title, description) => `${chartType} chart: ${title}. ${description}`,
  
  /**
   * Generate ARIA label for KPI cards
   */
  kpiCard: (title, value, trend, trendDirection) => {
    const trendText = trendDirection ? `${trend} ${trendDirection}` : '';
    return `${title}: ${value}. ${trendText}`;
  },
  
  /**
   * Generate ARIA label for navigation
   */
  navigation: (label, isActive) => `${label} ${isActive ? 'current page' : 'page'}`,
  
  /**
   * Generate ARIA label for buttons with icons
   */
  iconButton: (action, iconDescription) => `${action}. ${iconDescription}`,
  
  /**
   * Generate ARIA label for form inputs
   */
  formInput: (label, type, required, error) => {
    let description = `${label} input field, type ${type}`;
    if (required) description += ', required';
    if (error) description += `, error: ${error}`;
    return description;
  },
  
  /**
   * Generate ARIA label for status indicators
   */
  status: (status, description) => `Status: ${status}. ${description}`,
  
  /**
   * Generate ARIA label for progress indicators
   */
  progress: (label, value, max) => `${label}: ${value} of ${max} complete`,
  
  /**
   * Generate ARIA label for tabs
   */
  tab: (label, isSelected, panelId) => `${label} tab${isSelected ? ', selected' : ''}, controls ${panelId}`,
  
  /**
   * Generate ARIA label for modals
   */
  modal: (title, description) => `Dialog: ${title}. ${description}`,
};

/**
 * Keyboard navigation utilities
 */
export const keyboardNavigation = {
  /**
   * Handle keyboard events for navigation
   */
  handleNavigation: (event, handlers) => {
    const { key, altKey, ctrlKey, shiftKey } = event;
    
    const action = {
      key,
      alt: altKey,
      ctrl: ctrlKey,
      shift: shiftKey,
    };
    
    if (handlers[action.key]) {
      event.preventDefault();
      handlers[action.key](action);
    }
  },
  
  /**
   * Create keyboard navigation for lists
   */
  createListNavigation: (items, onSelect, options = {}) => {
    const { orientation = 'vertical', wrap = true } = options;
    let currentIndex = 0;
    
    return {
      handleKeyDown: (event) => {
        const { key } = event;
        
        switch (key) {
          case 'ArrowDown':
          case 'ArrowRight':
            event.preventDefault();
            currentIndex = orientation === 'vertical' ? currentIndex + 1 : currentIndex;
            break;
            
          case 'ArrowUp':
          case 'ArrowLeft':
            event.preventDefault();
            currentIndex = orientation === 'vertical' ? currentIndex - 1 : currentIndex;
            break;
            
          case 'Home':
            event.preventDefault();
            currentIndex = 0;
            break;
            
          case 'End':
            event.preventDefault();
            currentIndex = items.length - 1;
            break;
            
          case 'Enter':
          case ' ':
            event.preventDefault();
            if (items[currentIndex]) {
              onSelect(items[currentIndex], currentIndex);
            }
            return;
            
          default:
            return;
        }
        
        // Wrap around if enabled
        if (wrap) {
          if (currentIndex < 0) currentIndex = items.length - 1;
          if (currentIndex >= items.length) currentIndex = 0;
        } else {
          currentIndex = Math.max(0, Math.min(currentIndex, items.length - 1));
        }
        
        // Focus the current item
        const currentItem = document.querySelector(`[data-list-index="${currentIndex}"]`);
        if (currentItem) {
          currentItem.focus();
        }
      },
      
      getCurrentIndex: () => currentIndex,
      
      setCurrentIndex: (index) => {
        currentIndex = Math.max(0, Math.min(index, items.length - 1));
      },
    };
  },
  
  /**
   * Create keyboard navigation for grids
   */
  createGridNavigation: (rows, cols, onSelect, options = {}) => {
    const { wrap = true } = options;
    let currentRow = 0;
    let currentCol = 0;
    
    return {
      handleKeyDown: (event) => {
        const { key } = event;
        
        switch (key) {
          case 'ArrowUp':
            event.preventDefault();
            currentRow = Math.max(0, currentRow - 1);
            break;
            
          case 'ArrowDown':
            event.preventDefault();
            currentRow = Math.min(rows - 1, currentRow + 1);
            break;
            
          case 'ArrowLeft':
            event.preventDefault();
            currentCol = Math.max(0, currentCol - 1);
            break;
            
          case 'ArrowRight':
            event.preventDefault();
            currentCol = Math.min(cols - 1, currentCol + 1);
            break;
            
          case 'Home':
            event.preventDefault();
            currentRow = 0;
            currentCol = 0;
            break;
            
          case 'End':
            event.preventDefault();
            currentRow = rows - 1;
            currentCol = cols - 1;
            break;
            
          case 'Enter':
          case ' ':
            event.preventDefault();
            onSelect(currentRow, currentCol);
            return;
            
          default:
            return;
        }
        
        // Focus the current cell
        const currentCell = document.querySelector(`[data-grid-row="${currentRow}"][data-grid-col="${currentCol}"]`);
        if (currentCell) {
          currentCell.focus();
        }
      },
      
      getCurrentPosition: () => ({ row: currentRow, col: currentCol }),
      
      setCurrentPosition: (row, col) => {
        currentRow = Math.max(0, Math.min(row, rows - 1));
        currentCol = Math.max(0, Math.min(col, cols - 1));
      },
    };
  },
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Trap focus within a container
   */
  createFocusTrap: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return {
      activate: () => {
        if (firstElement) {
          firstElement.focus();
        }
      },
      
      deactivate: () => {
        container.removeEventListener('keydown', handleKeyDown);
      },
    };
  },
  
  /**
   * Restore focus to previous element
   */
  restoreFocus: () => {
    const previousFocus = document.activeElement;
    
    return {
      save: () => {
        return document.activeElement;
      },
      
      restore: (element = previousFocus) => {
        if (element && typeof element.focus === 'function') {
          element.focus();
        }
      },
    };
  },
  
  /**
   * Manage focus for modals
   */
  manageModalFocus: (modal) => {
    const focusTrap = focusManagement.createFocusTrap(modal);
    const focusRestorer = focusManagement.restoreFocus();
    
    // Save current focus before opening modal
    const previousFocus = focusRestorer.save();
    
    // Activate focus trap
    focusTrap.activate();
    
    return {
      close: () => {
        focusTrap.deactivate();
        focusRestorer.restore(previousFocus);
      },
    };
  },
  
  /**
   * Skip to main content link
   */
  createSkipLink: (targetId, text = 'Skip to main content') => {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50';
    skipLink.setAttribute('aria-label', text);
    
    return skipLink;
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Announce message to screen readers
   */
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
  
  /**
   * Create screen reader only content
   */
  createSROnly: (content) => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = content;
    return element;
  },
  
  /**
   * Create chart description for screen readers
   */
  createChartDescription: (chartData, options = {}) => {
    const { type = 'chart', title = 'Data visualization' } = options;
    
    let description = `${title}. `;
    
    if (chartData.labels && chartData.values) {
      description += `Data points: `;
      chartData.labels.forEach((label, index) => {
        const value = chartData.values[index];
        description += `${label}: ${value}. `;
      });
    }
    
    if (chartData.summary) {
      description += `Summary: ${chartData.summary}. `;
    }
    
    return description;
  },
  
  /**
   * Create table summary for screen readers
   */
  createTableSummary: (tableData, options = {}) => {
    const { title = 'Data table' } = options;
    
    let summary = `${title}. `;
    summary += `${tableData.rows.length} rows and ${tableData.columns.length} columns. `;
    
    if (tableData.sortColumn) {
      summary += `Currently sorted by ${tableData.sortColumn} in ${tableData.sortDirection} order. `;
    }
    
    if (tableData.filters) {
      summary += `Filters applied: ${Object.keys(tableData.filters).join(', ')}. `;
    }
    
    return summary;
  },
};

/**
 * High contrast mode support
 */
export const highContrast = {
  /**
   * Check if high contrast mode is enabled
   */
  isEnabled: () => {
    // Check for Windows high contrast mode
    if (window.matchMedia) {
      return window.matchMedia('(forced-colors: active)').matches ||
             window.matchMedia('(prefers-contrast: high)').matches;
    }
    return false;
  },
  
  /**
   * Toggle high contrast mode
   */
  toggle: () => {
    document.body.classList.toggle('high-contrast');
  },
  
  /**
   * Enable high contrast mode
   */
  enable: () => {
    document.body.classList.add('high-contrast');
  },
  
  /**
   * Disable high contrast mode
   */
  disable: () => {
    document.body.classList.remove('high-contrast');
  },
  
  /**
   * Get high contrast styles
   */
  getStyles: () => ({
    background: 'Window',
    text: 'WindowText',
    border: 'WindowFrame',
    focus: 'Highlight',
    link: 'HotText',
  }),
};

/**
 * Reduced motion support
 */
export const reducedMotion = {
  /**
   * Check if reduced motion is preferred
   */
  isPreferred: () => {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  },
  
  /**
   * Get animation settings based on motion preference
   */
  getAnimationSettings: () => {
    return {
      duration: reducedMotion.isPreferred() ? 0 : 300,
      easing: reducedMotion.isPreferred() ? 'none' : 'ease-in-out',
    };
  },
};

/**
 * Accessibility testing utilities
 */
export const a11yTesting = {
  /**
   * Check for missing alt text on images
   */
  checkImageAltText: () => {
    const images = document.querySelectorAll('img:not([alt])');
    return images.length === 0;
  },
  
  /**
   * Check for proper heading structure
   */
  checkHeadingStructure: () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    
    for (const heading of headings) {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > lastLevel + 1) {
        return false; // Skipped heading level
      }
      lastLevel = level;
    }
    
    return true;
  },
  
  /**
   * Check for proper form labels
   */
  checkFormLabels: () => {
    const inputs = document.querySelectorAll('input, select, textarea');
    let hasErrors = false;
    
    inputs.forEach(input => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`) ||
                     input.getAttribute('aria-label') ||
                     input.getAttribute('aria-labelledby');
      
      if (!hasLabel) {
        hasErrors = true;
      }
    });
    
    return !hasErrors;
  },
  
  /**
   * Check for sufficient color contrast
   */
  checkColorContrast: () => {
    // This would require a color contrast calculation library
    // Placeholder implementation
    return true;
  },
  
  /**
   * Run basic accessibility checks
   */
  runBasicChecks: () => {
    const results = {
      imageAltText: a11yTesting.checkImageAltText(),
      headingStructure: a11yTesting.checkHeadingStructure(),
      formLabels: a11yTesting.checkFormLabels(),
      colorContrast: a11yTesting.checkColorContrast(),
    };
    
    return {
      ...results,
      overall: Object.values(results).every(Boolean),
    };
  },
};

/**
 * Initialize accessibility features
 */
export const initializeAccessibility = () => {
  // Add skip links
  const skipLink = focusManagement.createSkipLink('main-content');
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Check for high contrast mode
  if (highContrast.isEnabled()) {
    highContrast.enable();
  }
  
  // Listen for high contrast mode changes
  if (window.matchMedia) {
    const highContrastQuery = window.matchMedia('(forced-colors: active)');
    highContrastQuery.addListener((e) => {
      if (e.matches) {
        highContrast.enable();
      } else {
        highContrast.disable();
      }
    });
  }
  
  // Listen for reduced motion preference changes
  if (window.matchMedia) {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addListener((e) => {
      // Update animations based on preference
      document.body.classList.toggle('reduced-motion', e.matches);
    });
    
    // Set initial state
    document.body.classList.toggle('reduced-motion', reducedMotionQuery.matches);
  }
  
  // Add keyboard navigation hints
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });
  
  // Run accessibility checks in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      const results = a11yTesting.runBasicChecks();
      if (!results.overall) {
        console.warn('Accessibility issues detected:', results);
      }
    }, 1000);
  }
};

// Initialize accessibility when module loads
if (typeof window !== 'undefined') {
  initializeAccessibility();
}

export default {
  ariaLabels,
  keyboardNavigation,
  focusManagement,
  screenReader,
  highContrast,
  reducedMotion,
  a11yTesting,
  initializeAccessibility,
};