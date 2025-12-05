/**
 * Finance Component Test Scenarios
 *
 * Defines test scenarios for finance components including:
 * - KPI cards testing scenarios
 * - Chart component testing scenarios
 * - Table component testing scenarios
 * - Edge cases and error states
 */

import { testScenarios, testConfig } from "./testConfig.js";
import financeMockData from "./financeMockData.js";

// KPI Cards Test Scenarios
export const kpiTestScenarios = {
  // Normal scenarios
  normalRevenue: {
    name: "Normal Revenue KPI",
    description: "Revenue KPI with normal values",
    data: financeMockData.generateKPIData({
      revenue: {
        total: 1500000,
        monthlyRecurring: 850000,
        growth: { percentage: 12.5, trend: "up" },
      },
    }),
    expected: {
      totalDisplay: "₦1,500,000",
      monthlyDisplay: "₦850,000",
      growthDisplay: "+12.5%",
      trendIcon: "up",
    },
  },

  negativeGrowth: {
    name: "Negative Revenue Growth",
    description: "Revenue KPI with negative growth",
    data: financeMockData.generateKPIData({
      revenue: {
        total: 1200000,
        monthlyRecurring: 650000,
        growth: { percentage: -8.3, trend: "down" },
      },
    }),
    expected: {
      totalDisplay: "₦1,200,000",
      monthlyDisplay: "₦650,000",
      growthDisplay: "-8.3%",
      trendIcon: "down",
    },
  },

  highROI: {
    name: "High ROI Performance",
    description: "ROI KPI with excellent performance",
    data: financeMockData.generateKPIData({
      roi: {
        percentage: 28.5,
        trend: "up",
        performance: 92,
      },
    }),
    expected: {
      roiDisplay: "28.5%",
      statusDisplay: "Excellent",
      performanceScore: "92/100",
      trendIcon: "up",
    },
  },

  lowROI: {
    name: "Low ROI Performance",
    description: "ROI KPI with poor performance",
    data: financeMockData.generateKPIData({
      roi: {
        percentage: 2.1,
        trend: "down",
        performance: 25,
      },
    }),
    expected: {
      roiDisplay: "2.1%",
      statusDisplay: "Low",
      performanceScore: "25/100",
      trendIcon: "down",
    },
  },

  highPayoutVolume: {
    name: "High Payout Volume",
    description: "Payout KPI with high volume and good processing rate",
    data: financeMockData.generateKPIData({
      payout: {
        pending: { count: 15, amount: 250000 },
        processed: { count: 450, amount: 3200000 },
        totalVolume: 3450000,
      },
    }),
    expected: {
      totalVolumeDisplay: "₦3,450,000",
      pendingCount: "15 pending",
      processedCount: "450 processed",
      processingRate: "96.8%",
    },
  },
};

// Chart Test Scenarios
export const chartTestScenarios = {
  // Revenue Chart Scenarios
  revenueGrowth: {
    name: "Revenue Growth Chart",
    description: "Revenue chart showing consistent growth",
    data: financeMockData.generateRevenueData("monthly", {
      revenue: [
        45000, 48000, 52000, 58000, 62000, 68000, 72000, 75000, 78000, 82000,
        85000, 88000,
      ],
      growth: [null, 6.7, 8.3, 11.5, 6.9, 9.7, 5.9, 4.2, 4.0, 5.1, 3.7, 3.5],
    }),
    expected: {
      dataPoints: 12,
      lastValue: "₦88,000",
      growthTrend: "positive",
    },
  },

  revenueVolatility: {
    name: "Revenue Volatility Chart",
    description: "Revenue chart showing volatile patterns",
    data: financeMockData.generateRevenueData("monthly", {
      revenue: [
        45000, 62000, 38000, 71000, 42000, 68000, 35000, 72000, 41000, 69000,
        38000, 70000,
      ],
      growth: [
        null,
        37.8,
        -38.7,
        86.8,
        -40.8,
        61.9,
        -48.5,
        105.7,
        -43.1,
        68.3,
        -44.9,
        84.2,
      ],
    }),
    expected: {
      dataPoints: 12,
      volatility: "high",
      growthTrend: "volatile",
    },
  },

  // ROI Analytics Scenarios
  roiPerformance: {
    name: "ROI Performance Chart",
    description: "ROI chart showing consistent outperformance",
    data: financeMockData.generateROIAnalyticsData("monthly", {
      portfolioROI: [
        2.1, 2.5, 2.8, 3.2, 3.5, 3.8, 4.1, 4.3, 4.5, 4.7, 4.9, 5.2,
      ],
      benchmark: [1.8, 1.9, 2.0, 2.1, 2.0, 2.2, 2.1, 2.0, 2.2, 2.3, 2.2, 2.4],
      riskAdjusted: [
        1.9, 2.2, 2.5, 2.8, 3.0, 3.2, 3.5, 3.7, 3.8, 4.0, 4.2, 4.3,
      ],
    }),
    expected: {
      outperformance: true,
      trend: "positive",
      riskAdjustedReturn: "good",
    },
  },

  roiUnderperformance: {
    name: "ROI Underperformance Chart",
    description: "ROI chart showing underperformance vs benchmark",
    data: financeMockData.generateROIAnalyticsData("monthly", {
      portfolioROI: [
        1.5, 1.2, 1.8, 1.4, 1.6, 1.3, 1.7, 1.4, 1.5, 1.2, 1.6, 1.3,
      ],
      benchmark: [1.8, 1.9, 2.0, 2.1, 2.0, 2.2, 2.1, 2.0, 2.2, 2.3, 2.2, 2.4],
      riskAdjusted: [
        1.3, 1.0, 1.5, 1.2, 1.4, 1.1, 1.5, 1.2, 1.3, 1.0, 1.4, 1.1,
      ],
    }),
    expected: {
      outperformance: false,
      trend: "negative",
      riskAdjustedReturn: "poor",
    },
  },
};

// Table Test Scenarios
export const tableTestScenarios = {
  // Transaction Table Scenarios
  normalTransactions: {
    name: "Normal Transaction Table",
    description: "Transaction table with mixed transaction types",
    data: financeMockData.generateTransactionData(25),
    expected: {
      rowCount: 25,
      hasCredits: true,
      hasDebits: true,
      hasPending: true,
      hasCompleted: true,
    },
  },

  highVolumeTransactions: {
    name: "High Volume Transaction Table",
    description: "Transaction table with many records",
    data: financeMockData.generateTransactionData(100),
    expected: {
      rowCount: 100,
      paginationRequired: true,
      hasMultiplePages: true,
    },
  },

  failedTransactions: {
    name: "Failed Transaction Table",
    description: "Transaction table with many failed transactions",
    data: financeMockData.generateTransactionData(20, {
      status: "failed",
    }),
    expected: {
      rowCount: 20,
      allFailed: true,
      errorIndicators: true,
    },
  },

  // Payout Table Scenarios
  pendingPayouts: {
    name: "Pending Payouts Table",
    description: "Payout table with many pending payouts",
    data: financeMockData.generatePayoutData(15, {
      status: "pending",
    }),
    expected: {
      rowCount: 15,
      allPending: true,
      urgencyIndicators: true,
    },
  },

  diversePayouts: {
    name: "Diverse Payouts Table",
    description: "Payout table with different types and statuses",
    data: financeMockData.generatePayoutData(30),
    expected: {
      rowCount: 30,
      hasMultipleTypes: true,
      hasMultipleStatuses: true,
      hasRecentActivity: true,
    },
  },

  // Investor Performance Scenarios
  topPerformers: {
    name: "Top Performers Table",
    description: "Investor performance table with high ROI investors",
    data: financeMockData.generateInvestorPerformanceData(20, {
      roi: 25,
    }),
    expected: {
      rowCount: 20,
      allHighPerformers: true,
      positiveReturns: true,
    },
  },

  mixedPerformance: {
    name: "Mixed Performance Table",
    description: "Investor performance table with varied results",
    data: financeMockData.generateInvestorPerformanceData(25),
    expected: {
      rowCount: 25,
      hasHighPerformers: true,
      hasLowPerformers: true,
      hasNegativeReturns: true,
    },
  },
};

// Edge Case Scenarios
export const edgeCaseScenarios = {
  // Empty Data
  emptyKPI: {
    name: "Empty KPI Data",
    description: "KPI components with no data",
    data: null,
    expected: {
      showsEmptyState: true,
      handlesNullGracefully: true,
    },
  },

  emptyChart: {
    name: "Empty Chart Data",
    description: "Chart components with no data points",
    data: { labels: [], revenue: [], growth: [] },
    expected: {
      showsEmptyState: true,
      noDataMessage: true,
    },
  },

  emptyTable: {
    name: "Empty Table Data",
    description: "Table components with no records",
    data: [],
    expected: {
      showsEmptyMessage: true,
      noRecordsMessage: true,
    },
  },

  // Extreme Values
  extremeRevenue: {
    name: "Extreme Revenue Values",
    description: "KPI with very large revenue values",
    data: financeMockData.generateKPIData({
      revenue: {
        total: 999999999,
        monthlyRecurring: 888888888,
        growth: { percentage: 999.9, trend: "up" },
      },
    }),
    expected: {
      handlesLargeNumbers: true,
      properFormatting: true,
    },
  },

  negativeValues: {
    name: "Negative Financial Values",
    description: "Financial data with negative values",
    data: financeMockData.generateTransactionData(10, {
      amount: -50000,
      type: "debit",
    }),
    expected: {
      showsNegativeValues: true,
      properColorCoding: true,
    },
  },

  zeroValues: {
    name: "Zero Financial Values",
    description: "Financial data with zero values",
    data: financeMockData.generateKPIData({
      revenue: {
        total: 0,
        monthlyRecurring: 0,
        growth: { percentage: 0, trend: "stable" },
      },
    }),
    expected: {
      showsZeroValues: true,
      handlesZeroGracefully: true,
    },
  },

  // Data Issues
  missingFields: {
    name: "Missing Data Fields",
    description: "Data with missing or undefined fields",
    data: financeMockData.generateTransactionData(10, {
      description: undefined,
      reference: null,
      user: null,
    }),
    expected: {
      handlesMissingFields: true,
      showsFallbacks: true,
    },
  },

  invalidData: {
    name: "Invalid Data Types",
    description: "Data with incorrect data types",
    data: financeMockData.generateTransactionData(10, {
      amount: "invalid",
      createdAt: "not-a-date",
      status: 123,
    }),
    expected: {
      handlesInvalidData: true,
      showsErrorStates: true,
    },
  },

  veryLongStrings: {
    name: "Very Long String Values",
    description: "Data with extremely long string values",
    data: financeMockData.generateTransactionData(5, {
      description:
        "This is an extremely long transaction description that goes on and on and should be properly truncated in the display without breaking the layout or causing overflow issues in the user interface components.",
      reference: "REF" + "X".repeat(100),
    }),
    expected: {
      truncatesLongStrings: true,
      maintainsLayout: true,
    },
  },
};

// Performance Test Scenarios
export const performanceTestScenarios = {
  largeDataset: {
    name: "Large Dataset Performance",
    description: "Test performance with large datasets",
    dataSize: testConfig.dataSizes.EXTRA_LARGE,
    expected: {
      maxRenderTime: testConfig.performance.MAX_RENDER_TIME,
      maxResponseTime: testConfig.performance.MAX_RESPONSE_TIME,
    },
  },

  frequentUpdates: {
    name: "Frequent Updates Performance",
    description: "Test performance with frequent data updates",
    updateInterval: 100, // ms
    duration: 5000, // ms
    expected: {
      maintainsResponsiveness: true,
      noMemoryLeaks: true,
    },
  },

  complexCharts: {
    name: "Complex Charts Performance",
    description: "Test performance with complex chart visualizations",
    dataPoints: 1000,
    expected: {
      smoothInteractions: true,
      noLagOnHover: true,
    },
  },
};

// Responsive Design Test Scenarios
export const responsiveTestScenarios = {
  mobileView: {
    name: "Mobile View",
    description: "Test components on mobile screen sizes",
    viewport: { width: 375, height: 667 },
    expected: {
      readableText: true,
      accessibleControls: true,
      noHorizontalScroll: true,
    },
  },

  tabletView: {
    name: "Tablet View",
    description: "Test components on tablet screen sizes",
    viewport: { width: 768, height: 1024 },
    expected: {
      optimalLayout: true,
      touchFriendly: true,
    },
  },

  desktopView: {
    name: "Desktop View",
    description: "Test components on desktop screen sizes",
    viewport: { width: 1920, height: 1080 },
    expected: {
      fullFunctionality: true,
      efficientSpaceUsage: true,
    },
  },

  ultraWideView: {
    name: "Ultra-Wide View",
    description: "Test components on ultra-wide screens",
    viewport: { width: 2560, height: 1440 },
    expected: {
      contentCentered: true,
      noExcessiveWhitespace: true,
    },
  },
};

// Accessibility Test Scenarios
export const accessibilityTestScenarios = {
  keyboardNavigation: {
    name: "Keyboard Navigation",
    description: "Test keyboard accessibility",
    expected: {
      tabOrderLogical: true,
      focusVisible: true,
      skipLinksAvailable: true,
    },
  },

  screenReader: {
    name: "Screen Reader Support",
    description: "Test screen reader compatibility",
    expected: {
      semanticHTML: true,
      ariaLabels: true,
      altTextForImages: true,
    },
  },

  colorContrast: {
    name: "Color Contrast",
    description: "Test color contrast compliance",
    expected: {
      wcagCompliant: true,
      textReadable: true,
    },
  },
};

// Export all test scenarios
export const financeTestScenarios = {
  kpi: kpiTestScenarios,
  chart: chartTestScenarios,
  table: tableTestScenarios,
  edgeCases: edgeCaseScenarios,
  performance: performanceTestScenarios,
  responsive: responsiveTestScenarios,
  accessibility: accessibilityTestScenarios,
};

export default financeTestScenarios;
