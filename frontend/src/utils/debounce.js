/**
 * Debouncing utilities for optimizing search and filter inputs
 * Reduces API calls and improves performance by delaying execution
 */

/**
 * Simple debounce function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function (...args) {
    const context = this;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
};

/**
 * Debounce hook for React components
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Debounced callback hook
 */
export const useDebouncedCallback = (callback, delay, deps = []) => {
  const callbackRef = React.useRef(callback);
  const [debouncedCallback, setDebouncedCallback] = React.useRef(() => {});
  
  // Update callback ref when callback changes
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Create debounced function
  React.useEffect(() => {
    const debouncedFn = debounce((...args) => {
      callbackRef.current(...args);
    }, delay);
    
    setDebouncedCallback.current = debouncedFn;
    
    return () => {
      // Cleanup function
    };
  }, [delay, ...deps]);
  
  return React.useCallback((...args) => {
    debouncedCallback.current(...args);
  }, []);
};

/**
 * Advanced debounce with options
 */
export const createAdvancedDebounce = (func, options = {}) => {
  const {
    delay = 300,
    maxWait = 0,
    leading = false,
    trailing = true,
    onError = null,
  } = options;
  
  let timeoutId = null;
  let maxTimeoutId = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs = null;
  let lastThis = null;
  let result = undefined;
  
  const invokeFunc = (time) => {
    const args = lastArgs;
    const thisArg = lastThis;
    
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  };
  
  const leadingEdge = (time) => {
    // Reset any last invoke time
    lastInvokeTime = time;
    
    // Start the timer for the trailing edge
    timeoutId = setTimeout(timerExpired, delay);
    
    // Invoke the leading edge
    return leading ? invokeFunc(time) : result;
  };
  
  const remainingWait = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;
    
    return timeWaiting;
  };
  
  const shouldInvoke = (time) => {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    
    // Either this is the first call, or
    // we've waited longer than the delay, or
    // we've hit the max wait time
    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait > 0 && timeSinceLastInvoke >= maxWait)
    );
  };
  
  const timerExpired = () => {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    
    // Restart the timer
    const remaining = remainingWait(time);
    timeoutId = setTimeout(timerExpired, remaining);
  };
  
  const trailingEdge = (time) => {
    timeoutId = null;
    
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    
    lastArgs = lastThis = undefined;
    return result;
  };
  
  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }
    
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeoutId = maxTimeoutId = undefined;
  };
  
  const flush = () => {
    return timeoutId === null ? result : trailingEdge(Date.now());
  };
  
  const pending = () => {
    return timeoutId !== null;
  };
  
  const debounced = function (...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    
    lastArgs = args;
    lastThis = this;
    lastCallTime = time;
    
    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      
      if (maxWait > 0) {
        // Handle max wait
        timeoutId = setTimeout(timerExpired, delay);
        maxTimeoutId = setTimeout(() => {
          if (lastArgs) {
            invokeFunc(Date.now());
            cancel();
          }
        }, maxWait);
      }
    }
    
    if (timeoutId === null && maxWait > 0) {
      maxTimeoutId = setTimeout(() => {
        if (lastArgs) {
          invokeFunc(Date.now());
          cancel();
        }
      }, maxWait);
    }
    
    return result;
  };
  
  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;
  
  return debounced;
};

/**
 * Debounced search component
 */
export const useDebouncedSearch = (initialValue = '', delay = 300, options = {}) => {
  const [searchTerm, setSearchTerm] = React.useState(initialValue);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState([]);
  
  const debouncedSearch = useDebouncedCallback((value) => {
    setIsSearching(true);
    
    // Add to search history
    if (value && value.trim() && !searchHistory.includes(value)) {
      setSearchHistory(prev => [value, ...prev.slice(0, 9)]); // Keep last 10 searches
    }
    
    // Simulate search completion (replace with actual search)
    setTimeout(() => {
      setIsSearching(false);
    }, 100);
  }, delay, []);
  
  const handleSearchChange = React.useCallback((value) => {
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);
  
  const clearSearch = React.useCallback(() => {
    setSearchTerm('');
    debouncedSearch('');
  }, [debouncedSearch]);
  
  const clearHistory = React.useCallback(() => {
    setSearchHistory([]);
  }, []);
  
  return {
    searchTerm,
    isSearching,
    searchHistory,
    handleSearchChange,
    clearSearch,
    clearHistory,
  };
};

/**
 * Debounced filter component
 */
export const useDebouncedFilters = (initialFilters = {}, delay = 500) => {
  const [filters, setFilters] = React.useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = React.useState(initialFilters);
  const [isApplying, setIsApplying] = React.useState(false);
  
  const debouncedApplyFilters = useDebouncedCallback((newFilters) => {
    setIsApplying(true);
    setAppliedFilters(newFilters);
    
    // Simulate filter application (replace with actual filter logic)
    setTimeout(() => {
      setIsApplying(false);
    }, 100);
  }, delay);
  
  const updateFilter = React.useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    debouncedApplyFilters(newFilters);
  }, [filters, debouncedApplyFilters]);
  
  const updateFilters = React.useCallback((newFilters) => {
    setFilters(newFilters);
    debouncedApplyFilters(newFilters);
  }, [debouncedApplyFilters]);
  
  const resetFilters = React.useCallback(() => {
    const resetFilters = { ...initialFilters };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
  }, [initialFilters]);
  
  const hasActiveFilters = React.useMemo(() => {
    return Object.keys(appliedFilters).some(key => {
      const value = appliedFilters[key];
      return value !== '' && value !== null && value !== undefined && 
             (typeof value !== 'object' || Object.keys(value).length > 0);
    });
  }, [appliedFilters]);
  
  return {
    filters,
    appliedFilters,
    isApplying,
    hasActiveFilters,
    updateFilter,
    updateFilters,
    resetFilters,
  };
};

/**
 * Performance-optimized debounced API call hook
 */
export const useDebouncedApiCall = (apiCall, delay = 300, options = {}) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastCallTime, setLastCallTime] = React.useState(null);
  
  const { maxWait = 0, retryOnError = false } = options;
  
  const executeCall = React.useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      setLastCallTime(Date.now());
      
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      
      if (retryOnError) {
        // Retry once after a delay
        setTimeout(() => {
          executeCall(...args);
        }, delay * 2);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall, delay, retryOnError]);
  
  const debouncedCall = React.useMemo(() => {
    return createAdvancedDebounce(executeCall, {
      delay,
      maxWait,
      leading: false,
      trailing: true,
    });
  }, [executeCall, delay, maxWait]);
  
  const cancel = React.useCallback(() => {
    debouncedCall.cancel();
    setLoading(false);
  }, [debouncedCall]);
  
  const reset = React.useCallback(() => {
    cancel();
    setData(null);
    setError(null);
    setLastCallTime(null);
  }, [cancel]);
  
  return {
    data,
    loading,
    error,
    lastCallTime,
    execute: debouncedCall,
    cancel,
    reset,
  };
};

/**
 * Debounced resize observer hook
 */
export const useDebouncedResize = (callback, delay = 100) => {
  const callbackRef = React.useRef(callback);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  React.useEffect(() => {
    let resizeObserver;
    let timeoutId;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          callbackRef.current(entries);
        }, delay);
      });
      
      return () => {
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        clearTimeout(timeoutId);
      };
    }
    
    return () => {};
  }, [delay]);
};

/**
 * Debounced scroll hook
 */
export const useDebouncedScroll = (callback, delay = 100) => {
  const callbackRef = React.useRef(callback);
  
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  React.useEffect(() => {
    let timeoutId;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callbackRef.current();
      }, delay);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [delay]);
};

export default {
  debounce,
  useDebounce,
  useDebouncedCallback,
  createAdvancedDebounce,
  useDebouncedSearch,
  useDebouncedFilters,
  useDebouncedApiCall,
  useDebouncedResize,
  useDebouncedScroll,
};