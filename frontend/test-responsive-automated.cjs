/**
 * Automated Responsive Testing Script for Boosty Platform
 *
 * This script systematically tests responsive design across multiple viewports
 * and generates a detailed report of findings.
 */

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

// Test configuration
const CONFIG = {
  baseUrl: "http://localhost:3000",
  viewports: [
    { name: "Mobile Small", width: 320, height: 568, type: "mobile" },
    { name: "Mobile Large", width: 375, height: 667, type: "mobile" },
    { name: "Tablet", width: 768, height: 1024, type: "tablet" },
    { name: "Desktop Small", width: 1024, height: 768, type: "desktop" },
    { name: "Desktop Medium", width: 1280, height: 720, type: "desktop" },
    { name: "Desktop Large", width: 1920, height: 1080, type: "desktop" },
  ],
  pages: [
    { name: "Dashboard", path: "/" },
    { name: "Admin Dashboard", path: "/admin" },
    { name: "Investors", path: "/investors" },
    { name: "KYC Dashboard", path: "/kyc" },
    { name: "Register", path: "/auth/register" },
    { name: "Login", path: "/auth/login" },
    { name: "Forgot Password", path: "/auth/forgot-password" },
  ],
  outputDir: "./test-results",
  screenshotsDir: "./test-results/screenshots",
};

// Test criteria
const TESTS = {
  // Layout tests
  layout: {
    noHorizontalScroll: "No horizontal scrolling on mobile",
    properViewportScaling: "Content scales properly with viewport",
    sidebarBehavior: "Sidebar behaves correctly across viewports",
    navigationAdaptation: "Navigation adapts to screen size",
  },

  // Touch tests
  touch: {
    touchTargets44px: "Touch targets meet 44px minimum",
    touchSpacing: "Adequate spacing between touch targets",
    touchActions: "Touch actions work properly",
  },

  // Typography tests
  typography: {
    readableTextSize: "Text remains readable at all sizes",
    properLineHeight: "Line height appropriate for screen size",
    responsiveScaling: "Typography scales with viewport",
  },

  // Component tests
  components: {
    tableResponsive: "Tables adapt to mobile (card view)",
    modalSizing: "Modals sized appropriately for viewport",
    formLayouts: "Forms adapt to single column on mobile",
    kpiCards: "KPI cards stack properly on mobile",
  },

  // Performance tests
  performance: {
    layoutShifts: "No significant layout shifts",
    loadTime: "Page loads within acceptable time",
    responsiveTransitions: "Smooth responsive transitions",
  },
};

class ResponsiveTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {};
    this.screenshots = [];
  }

  async initialize() {
    console.log("🚀 Initializing responsive testing...");

    // Create output directories
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    if (!fs.existsSync(CONFIG.screenshotsDir)) {
      fs.mkdirSync(CONFIG.screenshotsDir, { recursive: true });
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    console.log("✅ Browser initialized successfully");
  }

  async testViewport(viewport, pageConfig) {
    const viewportKey = `${viewport.name}-${pageConfig.name}`;
    console.log(
      `📱 Testing ${pageConfig.name} at ${viewport.name} (${viewport.width}x${viewport.height})`
    );

    // Set viewport
    await this.page.setViewport({
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.type === "mobile",
      hasTouch: viewport.type !== "desktop",
    });

    // Navigate to page
    const url = `${CONFIG.baseUrl}${pageConfig.path}`;
    await this.page.goto(url, { waitUntil: "networkidle2" });

    // Wait for any dynamic content to load
    await this.page.waitForTimeout(2000);

    const testResults = {
      viewport: viewport.name,
      page: pageConfig.name,
      url: url,
      timestamp: new Date().toISOString(),
      tests: {},
    };

    // Run layout tests
    testResults.tests.layout = await this.testLayout(viewport);

    // Run touch tests (only for mobile/tablet)
    if (viewport.type !== "desktop") {
      testResults.tests.touch = await this.testTouch(viewport);
    }

    // Run typography tests
    testResults.tests.typography = await this.testTypography(viewport);

    // Run component tests
    testResults.tests.components = await this.testComponents(
      viewport,
      pageConfig
    );

    // Run performance tests
    testResults.tests.performance = await this.testPerformance(viewport);

    // Take screenshot
    const screenshotPath = path.join(
      CONFIG.screenshotsDir,
      `${viewportKey.replace(/\s+/g, "-").toLowerCase()}.png`
    );
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    testResults.screenshot = screenshotPath;

    return testResults;
  }

  async testLayout(viewport) {
    const results = {};

    // Test for horizontal scrolling
    const bodyWidth = await this.page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await this.page.evaluate(() => window.innerWidth);
    results.noHorizontalScroll = {
      passed: bodyWidth <= viewportWidth,
      details: `Body width: ${bodyWidth}px, Viewport: ${viewportWidth}px`,
    };

    // Test sidebar behavior
    const sidebarVisible = await this.page.evaluate(() => {
      const sidebar = document.querySelector(
        '[data-testid="sidebar"], .sidebar, nav'
      );
      if (!sidebar) return { present: false };

      const styles = window.getComputedStyle(sidebar);
      return {
        present: true,
        display: styles.display,
        position: styles.position,
        transform: styles.transform,
        width: styles.width,
      };
    });

    results.sidebarBehavior = {
      passed: viewport.type === "desktop" ? sidebarVisible.present : true,
      details: sidebarVisible,
    };

    // Test navigation adaptation
    const hamburgerVisible = await this.page.evaluate(() => {
      const hamburger = document.querySelector(
        '[data-testid="hamburger"], .hamburger, button[aria-label*="menu"]'
      );
      return hamburger
        ? window.getComputedStyle(hamburger).display !== "none"
        : false;
    });

    results.navigationAdaptation = {
      passed: viewport.type === "mobile" ? hamburgerVisible : !hamburgerVisible,
      details: `Hamburger visible: ${hamburgerVisible}, Viewport type: ${viewport.type}`,
    };

    return results;
  }

  async testTouch(viewport) {
    const results = {};

    // Test touch target sizes
    const touchTargets = await this.page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"]'
        )
      );
      return buttons.map((btn) => {
        const rect = btn.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          tagName: btn.tagName,
          text:
            btn.textContent?.trim() || btn.placeholder || btn.name || "unnamed",
        };
      });
    });

    const undersizedTargets = touchTargets.filter(
      (target) => target.width < 44 || target.height < 44
    );

    results.touchTargets44px = {
      passed: undersizedTargets.length === 0,
      details: {
        totalTargets: touchTargets.length,
        undersizedTargets: undersizedTargets.length,
        examples: undersizedTargets.slice(0, 3),
      },
    };

    return results;
  }

  async testTypography(viewport) {
    const results = {};

    // Test text readability
    const textElements = await this.page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div")
      );
      return elements.map((el) => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: parseFloat(styles.fontSize),
          lineHeight: parseFloat(styles.lineHeight),
          tagName: el.tagName,
          text: el.textContent?.trim().substring(0, 50),
        };
      });
    });

    const smallText = textElements.filter((el) => el.fontSize < 14);

    results.readableTextSize = {
      passed: smallText.length === 0,
      details: {
        totalElements: textElements.length,
        smallTextElements: smallText.length,
        averageFontSize:
          textElements.reduce((sum, el) => sum + el.fontSize, 0) /
          textElements.length,
      },
    };

    return results;
  }

  async testComponents(viewport, pageConfig) {
    const results = {};

    // Test table responsiveness
    if (
      pageConfig.path.includes("investors") ||
      pageConfig.path.includes("users")
    ) {
      const tableResponsive = await this.page.evaluate(() => {
        const tables = document.querySelectorAll("table");
        if (tables.length === 0) return { present: false };

        const table = tables[0];
        const container = table.closest(".overflow-x-auto, .table-container");

        return {
          present: true,
          hasHorizontalScroll: !!container,
          isCardView: table.closest(".card-view") !== null,
        };
      });

      results.tableResponsive = {
        passed:
          viewport.type === "mobile"
            ? tableResponsive.isCardView
            : tableResponsive.present,
        details: tableResponsive,
      };
    }

    // Test KPI cards
    if (pageConfig.path === "/" || pageConfig.path.includes("dashboard")) {
      const kpiCards = await this.page.evaluate(() => {
        const cards = document.querySelectorAll(
          '.kpi-card, [data-testid="kpi-card"], .stat-card'
        );
        return Array.from(cards).map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
          };
        });
      });

      results.kpiCards = {
        passed: kpiCards.length > 0,
        details: {
          cardCount: kpiCards.length,
          averageWidth:
            kpiCards.reduce((sum, card) => sum + card.width, 0) /
            kpiCards.length,
        },
      };
    }

    return results;
  }

  async testPerformance(viewport) {
    const results = {};

    // Test for layout shifts
    const layoutShifts = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let shifts = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "layout-shift" && !entry.hadRecentInput) {
              shifts += entry.value;
            }
          }
        });

        observer.observe({ entryTypes: ["layout-shift"] });

        // Wait a bit to collect shift data
        setTimeout(() => {
          observer.disconnect();
          resolve(shifts);
        }, 1000);
      });
    });

    results.layoutShifts = {
      passed: layoutShifts < 0.1,
      details: `Cumulative layout shift: ${layoutShifts.toFixed(3)}`,
    };

    return results;
  }

  async runAllTests() {
    console.log("🧪 Starting comprehensive responsive testing...");

    const page = await this.browser.newPage();
    this.page = page;

    // Test each page at each viewport
    for (const pageConfig of CONFIG.pages) {
      for (const viewport of CONFIG.viewports) {
        try {
          const result = await this.testViewport(viewport, pageConfig);
          const key = `${viewport.name}-${pageConfig.name}`;
          this.results[key] = result;
        } catch (error) {
          console.error(
            `❌ Error testing ${pageConfig.name} at ${viewport.name}:`,
            error.message
          );
          this.results[`${viewport.name}-${pageConfig.name}`] = {
            error: error.message,
            viewport: viewport.name,
            page: pageConfig.name,
          };
        }
      }
    }

    await page.close();
  }

  generateReport() {
    console.log("📊 Generating comprehensive test report...");

    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Save JSON report
    const reportPath = path.join(
      CONFIG.outputDir,
      `responsive-test-report-${Date.now()}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(
      CONFIG.outputDir,
      `responsive-test-report-${Date.now()}.html`
    );
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`📋 Reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);

    return { reportPath, htmlPath };
  }

  generateSummary() {
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter((result) => {
      if (result.error) return false;
      return Object.values(result.tests).every((testGroup) =>
        Object.values(testGroup).every((test) => test.passed)
      );
    }).length;

    const issues = [];

    Object.values(this.results).forEach((result) => {
      if (result.error) {
        issues.push({
          type: "error",
          viewport: result.viewport,
          page: result.page,
          message: result.error,
        });
        return;
      }

      Object.entries(result.tests).forEach(([category, tests]) => {
        Object.entries(tests).forEach(([testName, test]) => {
          if (!test.passed) {
            issues.push({
              type: "failure",
              viewport: result.viewport,
              page: result.page,
              category,
              test: testName,
              details: test.details,
            });
          }
        });
      });
    });

    return {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: ((passedTests / totalTests) * 100).toFixed(1) + "%",
      issues: issues.slice(0, 20), // Limit to top 20 issues
    };
  }

  generateRecommendations() {
    const recommendations = [];

    // Analyze common issues and generate recommendations
    const issues = this.summary?.issues || [];

    const touchIssues = issues.filter((issue) => issue.category === "touch");
    if (touchIssues.length > 0) {
      recommendations.push({
        priority: "high",
        category: "Touch Optimization",
        description: "Multiple touch target size issues detected",
        action:
          "Ensure all interactive elements meet minimum 44px touch target size",
        affectedPages: [...new Set(touchIssues.map((issue) => issue.page))],
      });
    }

    const layoutIssues = issues.filter((issue) => issue.category === "layout");
    if (layoutIssues.length > 0) {
      recommendations.push({
        priority: "high",
        category: "Layout Responsiveness",
        description: "Layout issues detected across multiple viewports",
        action: "Review and fix responsive layout implementations",
        affectedPages: [...new Set(layoutIssues.map((issue) => issue.page))],
      });
    }

    return recommendations;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Boosty Platform Responsive Test Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .status-pass { color: #059669; }
        .status-fail { color: #dc2626; }
        .status-pending { color: #d97706; }
        .test-result { margin-bottom: 1rem; padding: 1rem; border-radius: 0.5rem; }
        .test-pass { background: #ecfdf5; border-left: 4px solid #059669; }
        .test-fail { background: #fef2f2; border-left: 4px solid #dc2626; }
    </style>
</head>
<body class="bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Boosty Platform Responsive Test Report</h1>
            <p class="text-gray-600">Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </header>

        <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-4">Test Summary</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Total Tests</h3>
                    <p class="text-2xl font-bold text-blue-600">${report.summary.totalTests}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Passed</h3>
                    <p class="text-2xl font-bold text-green-600">${report.summary.passedTests}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Failed</h3>
                    <p class="text-2xl font-bold text-red-600">${report.summary.failedTests}</p>
                </div>
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-medium text-gray-900">Pass Rate</h3>
                    <p class="text-2xl font-bold text-blue-600">${report.summary.passRate}</p>
                </div>
            </div>
        </section>

        <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-4">Issues Found</h2>
            <div class="space-y-4">
                ${report.summary.issues
                  .map(
                    (issue) => `
                    <div class="test-result ${issue.type === "error" ? "test-fail" : "test-fail"}">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-medium text-gray-900">${issue.page} - ${issue.viewport}</h3>
                                <p class="text-sm text-gray-600">${issue.category}: ${issue.test}</p>
                                <p class="text-sm text-gray-500">${JSON.stringify(issue.details)}</p>
                            </div>
                            <span class="text-sm font-medium status-fail">${issue.type.toUpperCase()}</span>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </section>

        <section class="mb-8">
            <h2 class="text-2xl font-semibold mb-4">Recommendations</h2>
            <div class="space-y-4">
                ${report.recommendations
                  .map(
                    (rec) => `
                    <div class="bg-white p-4 rounded-lg shadow border-l-4 ${
                      rec.priority === "high"
                        ? "border-red-500"
                        : "border-yellow-500"
                    }">
                        <h3 class="font-medium text-gray-900">${rec.category}</h3>
                        <p class="text-gray-600 mb-2">${rec.description}</p>
                        <p class="text-sm text-gray-700"><strong>Action:</strong> ${rec.action}</p>
                        <p class="text-sm text-gray-500"><strong>Affected pages:</strong> ${rec.affectedPages.join(", ")}</p>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </section>
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log("🧹 Browser closed");
    }
  }
}

// Main execution
async function runResponsiveTests() {
  const tester = new ResponsiveTester();

  try {
    await tester.initialize();
    await tester.runAllTests();
    const reports = tester.generateReport();

    console.log("\n✅ Responsive testing completed successfully!");
    console.log(`📊 Overall pass rate: ${tester.summary?.passRate || "N/A"}`);

    return reports;
  } catch (error) {
    console.error("❌ Error during testing:", error);
    throw error;
  } finally {
    await tester.cleanup();
  }
}

// Export for use as module
module.exports = { ResponsiveTester, runResponsiveTests };

// Run if called directly
if (require.main === module) {
  runResponsiveTests().catch(console.error);
}
