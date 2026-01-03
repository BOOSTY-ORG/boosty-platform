/**
 * Test Configuration Utility
 *
 * Provides configuration for testing environments including:
 * - Mock data toggling
 * - Test scenario management
 * - Environment detection
 */

// Environment detection
export const isDevelopment = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
export const isProduction = process.env.NODE_ENV === "production";

// Test configuration
export const testConfig = {
  // Enable mock data in development or when explicitly set
  useMockData:
    isDevelopment || localStorage.getItem("USE_MOCK_DATA") === "true",

  // Test scenarios
  scenarios: {
    LOADING: "loading",
    ERROR: "error",
    EMPTY: "empty",
    SUCCESS: "success",
    PARTIAL_DATA: "partial_data",
    EDGE_CASES: "edge_cases",
  },

  // Data sizes for testing
  dataSizes: {
    SMALL: 5,
    MEDIUM: 25,
    LARGE: 100,
    EXTRA_LARGE: 500,
  },

  // Performance thresholds
  performance: {
    MAX_RESPONSE_TIME: 2000, // ms
    MAX_RENDER_TIME: 100, // ms
    MAX_MEMORY_USAGE: 50 * 1024 * 1024, // 50MB
  },

  // Visual regression settings
  visualRegression: {
    ENABLED: isDevelopment,
    SCREENSHOTS_DIR: "./test-screenshots",
    VIEWPORTS: [
      { width: 320, height: 568 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Desktop
      { width: 1920, height: 1080 }, // Large Desktop
    ],
  },
};

// Mock data configuration
export const mockDataConfig = {
  // Default data sizes
  defaultSizes: {
    transactions: testConfig.dataSizes.MEDIUM,
    payouts: testConfig.dataSizes.SMALL,
    investments: testConfig.dataSizes.MEDIUM,
    investors: testConfig.dataSizes.SMALL,
  },

  // Latency simulation
  latency: {
    MIN: 100,
    MAX: 800,
    ERROR_RATE: 0.05, // 5% chance of error
  },

  // Data variation
  variation: {
    ENABLED: true,
    REFRESH_INTERVAL: 30000, // 30 seconds
  },
};

// Test scenario configurations
export const testScenarios = {
  [testConfig.scenarios.LOADING]: {
    name: "Loading State",
    description: "Components should show loading indicators",
    config: {
      delay: 2000,
      useEmptyData: true,
      showLoadingState: true,
    },
  },

  [testConfig.scenarios.ERROR]: {
    name: "Error State",
    description: "Components should handle errors gracefully",
    config: {
      simulateError: true,
      errorType: "network",
      retryCount: 3,
    },
  },

  [testConfig.scenarios.EMPTY]: {
    name: "Empty State",
    description: "Components should display empty states appropriately",
    config: {
      dataSize: 0,
      showEmptyMessage: true,
    },
  },

  [testConfig.scenarios.SUCCESS]: {
    name: "Success State",
    description: "Components should display data correctly",
    config: {
      dataSize: testConfig.dataSizes.MEDIUM,
      includeAllFields: true,
    },
  },

  [testConfig.scenarios.PARTIAL_DATA]: {
    name: "Partial Data",
    description: "Components should handle missing or incomplete data",
    config: {
      includeMissingFields: true,
      includeNullValues: true,
      dataSize: testConfig.dataSizes.SMALL,
    },
  },

  [testConfig.scenarios.EDGE_CASES]: {
    name: "Edge Cases",
    description: "Components should handle extreme values and edge cases",
    config: {
      includeExtremeValues: true,
      includeSpecialCharacters: true,
      includeVeryLongStrings: true,
      dataSize: testConfig.dataSizes.SMALL,
    },
  },
};

// Utility functions for test configuration
export const enableMockData = () => {
  localStorage.setItem("USE_MOCK_DATA", "true");
  testConfig.useMockData = true;
  console.log("Mock data enabled");
};

export const disableMockData = () => {
  localStorage.setItem("USE_MOCK_DATA", "false");
  testConfig.useMockData = false;
  console.log("Mock data disabled");
};

export const toggleMockData = () => {
  if (testConfig.useMockData) {
    disableMockData();
  } else {
    enableMockData();
  }
  return testConfig.useMockData;
};

export const setTestScenario = (scenario) => {
  if (testScenarios[scenario]) {
    localStorage.setItem("TEST_SCENARIO", scenario);
    console.log(`Test scenario set to: ${testScenarios[scenario].name}`);
    return testScenarios[scenario];
  } else {
    console.error(`Unknown test scenario: ${scenario}`);
    return null;
  }
};

export const getCurrentScenario = () => {
  const scenario =
    localStorage.getItem("TEST_SCENARIO") || testConfig.scenarios.SUCCESS;
  return testScenarios[scenario] || testScenarios[testConfig.scenarios.SUCCESS];
};

export const setDataSize = (size) => {
  if (testConfig.dataSizes[size.toUpperCase()]) {
    localStorage.setItem("TEST_DATA_SIZE", size.toUpperCase());
    console.log(`Test data size set to: ${size.toUpperCase()}`);
    return testConfig.dataSizes[size.toUpperCase()];
  } else {
    console.error(`Unknown data size: ${size}`);
    return null;
  }
};

export const getCurrentDataSize = () => {
  const size = localStorage.getItem("TEST_DATA_SIZE") || "MEDIUM";
  return testConfig.dataSizes[size] || testConfig.dataSizes.MEDIUM;
};

// Performance monitoring
export const performanceMonitor = {
  startTime: null,

  start() {
    this.startTime = performance.now();
  },

  end(label) {
    if (this.startTime) {
      const duration = performance.now() - this.startTime;
      console.log(`${label}: ${duration.toFixed(2)}ms`);

      if (duration > testConfig.performance.MAX_RESPONSE_TIME) {
        console.warn(
          `Performance warning: ${label} exceeded threshold of ${testConfig.performance.MAX_RESPONSE_TIME}ms`
        );
      }

      this.startTime = null;
      return duration;
    }
    return 0;
  },

  measureRender(componentName, renderFunction) {
    this.start();
    const result = renderFunction();
    const duration = this.end(`${componentName} render`);

    if (duration > testConfig.performance.MAX_RENDER_TIME) {
      console.warn(
        `Render performance warning: ${componentName} exceeded threshold of ${testConfig.performance.MAX_RENDER_TIME}ms`
      );
    }

    return result;
  },
};

// Visual regression helper
export const visualRegressionHelper = {
  takeScreenshot(name, viewport = testConfig.visualRegression.VIEWPORTS[0]) {
    if (!testConfig.visualRegression.ENABLED) {
      return;
    }

    // This would integrate with a visual regression testing library
    console.log(
      `Taking screenshot: ${name} at ${viewport.width}x${viewport.height}`
    );

    // Implementation would depend on the chosen visual regression tool
    // e.g., Percy, Chromatic, or custom implementation
  },

  compareScreenshots(before, after) {
    // Implementation for comparing screenshots
    console.log(`Comparing screenshots: ${before} vs ${after}`);
  },
};

// Export default configuration
export default {
  ...testConfig,
  mockDataConfig,
  testScenarios,
  enableMockData,
  disableMockData,
  toggleMockData,
  setTestScenario,
  getCurrentScenario,
  setDataSize,
  getCurrentDataSize,
  performanceMonitor,
  visualRegressionHelper,
};
