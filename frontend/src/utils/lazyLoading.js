/**
 * Lazy loading utilities for charts and heavy components
 * Provides code splitting, dynamic imports, and loading states
 */

import React, { Suspense, lazy } from "react";

/**
 * Create a lazy-loaded component with loading fallback
 */
export const createLazyComponent = (
  importFunc,
  fallback = null,
  loadingComponent = null
) => {
  const LazyComponent = lazy(importFunc);

  return (props) => (
    <Suspense
      fallback={loadingComponent || fallback || <DefaultLoadingFallback />}
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

/**
 * Chart-specific loading fallback
 */
export const ChartLoadingFallback = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-center h-64">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
  </div>
);

/**
 * Table-specific loading fallback
 */
export const TableLoadingFallback = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
    </div>
  </div>
);

/**
 * KPI-specific loading fallback
 */
export const KPILoadingFallback = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    ))}
  </div>
);

/**
 * Error fallback component
 */
export const ErrorFallback = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <div className="text-red-600 mb-2">Failed to load component</div>
    <div className="text-sm text-red-700 mb-4">
      {error?.message || "An error occurred"}
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
        ...options,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);

  return isIntersecting;
};

/**
 * Preload component when it's likely to be needed
 */
export const usePreloadComponent = (importFunc, trigger = "hover") => {
  const [shouldPreload, setShouldPreload] = React.useState(false);

  React.useEffect(() => {
    let timeoutId;

    const handlePreload = () => {
      importFunc();
      setShouldPreload(true);
    };

    if (trigger === "hover") {
      const handleMouseEnter = () => {
        timeoutId = setTimeout(handlePreload, 200);
      };

      const element = document.querySelector("[data-preload-target]");
      if (element) {
        element.addEventListener("mouseenter", handleMouseEnter);
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const element = document.querySelector("[data-preload-target]");
      if (element) {
        element.removeEventListener("mouseenter", handleMouseEnter);
      }
    };
  }, [importFunc, trigger]);

  return { shouldPreload };
};

/**
 * Progressive image loading
 */
export const ProgressiveImage = ({ src, alt, className = "", ...props }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    img.src = src;
  }, [src]);

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h8m-4-4v4m0 4h8"
            />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        {...props}
      />
    </div>
  );
};

/**
 * Skeleton loader for various content types
 */
export const SkeletonLoader = ({ type = "default", className = "" }) => {
  const skeletons = {
    default: (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ),
    chart: <div className="h-64 bg-gray-200 rounded animate-pulse" />,
    table: (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    ),
    text: (
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ),
    kpi: (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    ),
  };

  return (
    <div
      className={`animate-pulse ${className}`}
      role="status"
      aria-label="Loading content"
    >
      {skeletons[type] || skeletons.default}
    </div>
  );
};

/**
 * Resource monitoring for lazy loading
 */
export const useResourceMonitoring = () => {
  const [resources, setResources] = React.useState({
    images: 0,
    scripts: 0,
    stylesheets: 0,
  });

  React.useEffect(() => {
    const updateResources = () => {
      const images = document.images.length;
      const scripts = document.scripts.length;
      const stylesheets = document.styleSheets.length;

      setResources({
        images,
        scripts,
        stylesheets,
      });
    };

    // Monitor resource loading
    const observer = new MutationObserver(updateResources);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return resources;
};

/**
 * Component preload manager
 */
class ComponentPreloader {
  constructor() {
    this.preloadedComponents = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Preload a component
   */
  async preload(importFunc, componentKey) {
    if (this.preloadedComponents.has(componentKey)) {
      return this.preloadedComponents.get(componentKey);
    }

    if (this.loadingPromises.has(componentKey)) {
      return this.loadingPromises.get(componentKey);
    }

    const loadingPromise = importFunc()
      .then((component) => {
        this.preloadedComponents.set(componentKey, component);
        this.loadingPromises.delete(componentKey);
        return component;
      })
      .catch((error) => {
        this.loadingPromises.delete(componentKey);
        console.error(`Failed to preload component ${componentKey}:`, error);
        throw error;
      });

    this.loadingPromises.set(componentKey, loadingPromise);
    return loadingPromise;
  }

  /**
   * Check if component is preloaded
   */
  isPreloaded(componentKey) {
    return this.preloadedComponents.has(componentKey);
  }

  /**
   * Clear preloaded components
   */
  clear() {
    this.preloadedComponents.clear();
    this.loadingPromises.clear();
  }
}

export const componentPreloader = new ComponentPreloader();

/**
 * Lazy loading with priority queue
 */
export const usePriorityLoader = () => {
  const [queue, setQueue] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const addToQueue = React.useCallback((item) => {
    setQueue((prev) => [...prev, item]);
  }, []);

  const processQueue = React.useCallback(async () => {
    if (queue.length === 0 || loading) return;

    setLoading(true);

    try {
      // Process items in priority order
      const sortedQueue = [...queue].sort((a, b) => a.priority - b.priority);

      for (const item of sortedQueue) {
        await item.load();
      }

      setQueue([]);
    } catch (error) {
      console.error("Error loading queue items:", error);
    } finally {
      setLoading(false);
    }
  }, [queue, loading]);

  React.useEffect(() => {
    if (queue.length > 0 && !loading) {
      processQueue();
    }
  }, [queue, loading, processQueue]);

  return {
    addToQueue,
    loading,
    queue,
  };
};

export default {
  createLazyComponent,
  ChartLoadingFallback,
  TableLoadingFallback,
  KPILoadingFallback,
  ErrorFallback,
  useIntersectionObserver,
  usePreloadComponent,
  ProgressiveImage,
  SkeletonLoader,
  useResourceMonitoring,
  componentPreloader,
  usePriorityLoader,
};
