/**
 * Unit Tests for Test Configuration Utility
 *
 * Tests the test configuration functions to ensure they properly
 * manage test scenarios, mock data toggling, and performance monitoring
 */

import {
  testConfig,
  enableMockData,
  disableMockData,
  toggleMockData,
  setTestScenario,
  getCurrentScenario,
  setDataSize,
  getCurrentDataSize,
  performanceMonitor,
  visualRegressionHelper,
} from "../testConfig.js";

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock performance API
const performanceMock = {
  now: jest.fn(() => Date.now()),
  getEntriesByName: jest.fn(() => []),
};
global.performance = performanceMock;

describe("Test Configuration Utility", () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    performanceMock.now.mockClear();
  });

  describe("testConfig", () => {
    test("should have correct default configuration", () => {
      expect(testConfig).toHaveProperty("useMockData");
      expect(testConfig).toHaveProperty("scenarios");
      expect(testConfig).toHaveProperty("dataSizes");
      expect(testConfig).toHaveProperty("performance");
      expect(testConfig).toHaveProperty("visualRegression");

      expect(testConfig.scenarios).toHaveProperty("LOADING");
      expect(testConfig.scenarios).toHaveProperty("ERROR");
      expect(testConfig.scenarios).toHaveProperty("EMPTY");
      expect(testConfig.scenarios).toHaveProperty("SUCCESS");
      expect(testConfig.scenarios).toHaveProperty("PARTIAL_DATA");
      expect(testConfig.scenarios).toHaveProperty("EDGE_CASES");

      expect(testConfig.dataSizes).toHaveProperty("SMALL", 5);
      expect(testConfig.dataSizes).toHaveProperty("MEDIUM", 25);
      expect(testConfig.dataSizes).toHaveProperty("LARGE", 100);
      expect(testConfig.dataSizes).toHaveProperty("EXTRA_LARGE", 500);
    });

    test("should have performance thresholds", () => {
      expect(testConfig.performance).toHaveProperty("MAX_RESPONSE_TIME", 2000);
      expect(testConfig.performance).toHaveProperty("MAX_RENDER_TIME", 100);
      expect(testConfig.performance).toHaveProperty("MAX_MEMORY_USAGE");
    });

    test("should have visual regression settings", () => {
      expect(testConfig.visualRegression).toHaveProperty("ENABLED");
      expect(testConfig.visualRegression).toHaveProperty("SCREENSHOTS_DIR");
      expect(testConfig.visualRegression).toHaveProperty("VIEWPORTS");

      expect(Array.isArray(testConfig.visualRegression.VIEWPORTS)).toBe(true);
      expect(testConfig.visualRegression.VIEWPORTS).toHaveLength(4);
    });
  });

  describe("Mock Data Toggling", () => {
    test("enableMockData should set localStorage and update config", () => {
      enableMockData();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "USE_MOCK_DATA",
        "true"
      );
      expect(testConfig.useMockData).toBe(true);
    });

    test("disableMockData should set localStorage and update config", () => {
      disableMockData();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "USE_MOCK_DATA",
        "false"
      );
      expect(testConfig.useMockData).toBe(false);
    });

    test("toggleMockData should switch between enabled and disabled", () => {
      // Start with disabled
      testConfig.useMockData = false;

      // First toggle should enable
      const result1 = toggleMockData();
      expect(result1).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "USE_MOCK_DATA",
        "true"
      );

      // Second toggle should disable
      const result2 = toggleMockData();
      expect(result2).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "USE_MOCK_DATA",
        "false"
      );
    });
  });

  describe("Test Scenario Management", () => {
    test("setTestScenario should set valid scenario", () => {
      const result = setTestScenario("LOADING");

      expect(result).toBeDefined();
      expect(result.name).toBe("Loading State");
      expect(result.description).toBe(
        "Components should show loading indicators"
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "TEST_SCENARIO",
        "LOADING"
      );
    });

    test("setTestScenario should handle invalid scenario", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = setTestScenario("INVALID_SCENARIO");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unknown test scenario: INVALID_SCENARIO"
      );

      consoleSpy.mockRestore();
    });

    test("getCurrentScenario should return current scenario", () => {
      localStorageMock.getItem.mockReturnValue("ERROR");

      const scenario = getCurrentScenario();

      expect(scenario).toBeDefined();
      expect(scenario.name).toBe("Error State");
      expect(localStorageMock.getItem).toHaveBeenCalledWith("TEST_SCENARIO");
    });

    test("getCurrentScenario should return default when none set", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const scenario = getCurrentScenario();

      expect(scenario.name).toBe("Success State");
    });
  });

  describe("Data Size Management", () => {
    test("setDataSize should set valid data size", () => {
      const result = setDataSize("LARGE");

      expect(result).toBe(100);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "TEST_DATA_SIZE",
        "LARGE"
      );
    });

    test("setDataSize should handle invalid data size", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = setDataSize("INVALID_SIZE");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unknown data size: INVALID_SIZE"
      );

      consoleSpy.mockRestore();
    });

    test("getCurrentDataSize should return current data size", () => {
      localStorageMock.getItem.mockReturnValue("SMALL");

      const size = getCurrentDataSize();

      expect(size).toBe(5);
      expect(localStorageMock.getItem).toHaveBeenCalledWith("TEST_DATA_SIZE");
    });

    test("getCurrentDataSize should return default when none set", () => {
      localStorageMock.getItem.mockReturnValue(null);

      const size = getCurrentDataSize();

      expect(size).toBe(25); // Default is MEDIUM
    });
  });

  describe("Performance Monitor", () => {
    test("should start and end timing correctly", () => {
      const startTime = 1000;
      const endTime = 1500;

      performanceMock.now.mockReturnValueOnce(startTime);
      performanceMonitor.start();

      performanceMock.now.mockReturnValueOnce(endTime);
      const duration = performanceMonitor.end("Test Operation");

      expect(duration).toBe(500);
    });

    test("should return 0 when end called without start", () => {
      const duration = performanceMonitor.end("Test Operation");

      expect(duration).toBe(0);
    });

    test("should log performance warnings for slow operations", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      performanceMonitor.start();

      // Simulate slow operation
      performanceMock.now.mockReturnValueOnce(1000);
      performanceMock.now.mockReturnValueOnce(4000); // 3000ms, exceeds 2000ms threshold

      performanceMonitor.end("Slow Operation");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Performance warning: Slow Operation exceeded threshold of 2000ms"
      );

      consoleSpy.mockRestore();
    });

    test("should measure render performance", () => {
      const renderFunction = jest.fn(() => "render result");

      performanceMock.now.mockReturnValueOnce(1000);
      performanceMock.now.mockReturnValueOnce(1050); // 50ms render time

      const result = performanceMonitor.measureRender(
        "Test Component",
        renderFunction
      );

      expect(renderFunction).toHaveBeenCalled();
      expect(result).toBe("render result");
    });

    test("should log render performance warnings", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const renderFunction = jest.fn(() => "render result");

      performanceMock.now.mockReturnValueOnce(1000);
      performanceMock.now.mockReturnValueOnce(1200); // 200ms render time, exceeds 100ms threshold

      performanceMonitor.measureRender("Slow Component", renderFunction);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Render performance warning: Slow Component exceeded threshold of 100ms"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Visual Regression Helper", () => {
    test("should take screenshot when enabled", () => {
      // Enable visual regression
      testConfig.visualRegression.ENABLED = true;

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      visualRegressionHelper.takeScreenshot("test-screenshot", {
        width: 1920,
        height: 1080,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Taking screenshot: test-screenshot at 1920x1080"
      );

      consoleSpy.mockRestore();
    });

    test("should skip screenshot when disabled", () => {
      // Disable visual regression
      testConfig.visualRegression.ENABLED = false;

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      visualRegressionHelper.takeScreenshot("test-screenshot", {
        width: 1920,
        height: 1080,
      });

      // Should not log anything when disabled
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test("should compare screenshots", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      visualRegressionHelper.compareScreenshots("before.png", "after.png");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Comparing screenshots: before.png vs after.png"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Test Scenarios Configuration", () => {
    test("should have all required scenario configurations", () => {
      const scenarios = testConfig.scenarios;

      Object.entries(scenarios).forEach(([key, value]) => {
        expect(value).toBeTypeOf("string");
        expect(value.length).toBeGreaterThan(0);
      });
    });

    test("should have valid scenario configurations", () => {
      // Import testScenarios to check their structure
      const { testScenarios } = require("../financeTestScenarios.js");

      Object.entries(testScenarios).forEach(([key, scenario]) => {
        expect(scenario).toHaveProperty("name");
        expect(scenario).toHaveProperty("description");
        expect(typeof scenario.name).toBe("string");
        expect(typeof scenario.description).toBe("string");
        expect(scenario.name.length).toBeGreaterThan(0);
        expect(scenario.description.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Environment Detection", () => {
    test("should detect development environment", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      // Re-require the module to test environment detection
      jest.resetModules();
      const { isDevelopment } = require("../testConfig.js");

      expect(isDevelopment).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
    });

    test("should detect test environment", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      jest.resetModules();
      const { isTest } = require("../testConfig.js");

      expect(isTest).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
    });

    test("should detect production environment", () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      jest.resetModules();
      const { isProduction } = require("../testConfig.js");

      expect(isProduction).toBe(true);

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
