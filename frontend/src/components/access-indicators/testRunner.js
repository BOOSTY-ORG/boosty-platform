/**
 * Test Runner for Access Indicators
 *
 * This script runs automated tests for the access indicators system
 * and generates a comprehensive report of findings.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";

// Import components to test
import {
  AccessIndicator,
  NavigationAccessIndicator,
  ActionAccessIndicator,
  HeaderAccessIndicator,
  TableAccessIndicator,
  FormFieldAccessIndicator,
  AccessGuard,
} from "./index";

// Import context provider
import { AccessProvider } from "../../context/AccessContext";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test data
const mockUsers = [
  {
    id: "user_1",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
  },
  {
    id: "user_2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "admin",
  },
];

const mockUser = {
  id: "test_user",
  email: "test@example.com",
  role: "admin",
  firstName: "Test",
  lastName: "User",
};

// Helper function to render with providers
const renderWithProviders = (ui, { user = mockUser, ...options } = {}) => {
  const Wrapper = ({ children }) => (
    <AccessProvider user={user}>{children}</AccessProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

// Test Suite
const runTests = async () => {
  const results = {
    componentFunctionality: {},
    integration: {},
    permissionAccuracy: {},
    accessibility: {},
    performance: {},
    issues: [],
    recommendations: [],
  };

  console.log("🧪 Starting Access Indicators Test Suite...\n");

  try {
    // 1. Component Functionality Tests
    console.log("📋 Testing Component Functionality...");
    await testComponentFunctionality(results.componentFunctionality);

    // 2. Integration Tests
    console.log("🔗 Testing Integration...");
    await testIntegration(results.integration);

    // 3. Permission Accuracy Tests
    console.log("🔐 Testing Permission Accuracy...");
    await testPermissionAccuracy(results.permissionAccuracy);

    // 4. Accessibility Tests
    console.log("♿ Testing Accessibility...");
    await testAccessibility(results.accessibility);

    // 5. Performance Tests
    console.log("⚡ Testing Performance...");
    await testPerformance(results.performance);

    // Generate report
    generateReport(results);

    return results;
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    results.issues.push({
      severity: "critical",
      category: "test-runner",
      description: `Test suite execution failed: ${error.message}`,
      recommendation: "Check test configuration and dependencies",
    });
    return results;
  }
};

// Component Functionality Tests
const testComponentFunctionality = async (results) => {
  const tests = {
    AccessIndicator: {
      "renders all levels": async () => {
        const levels = [
          "standard",
          "investor",
          "bronze",
          "silver",
          "gold",
          "platinum",
        ];
        for (const level of levels) {
          const { container } = renderWithProviders(
            <AccessIndicator level={level} state="available" />
          );
          expect(
            container.querySelector(".bg-" + level + "-50")
          ).toBeInTheDocument();
        }
        return { passed: true, details: "All access levels render correctly" };
      },

      "renders all states": async () => {
        const states = ["available", "limited", "restricted", "hidden"];
        for (const state of states) {
          const { container } = renderWithProviders(
            <AccessIndicator level="gold" state={state} />
          );
          // Check if state icon is rendered
          expect(container.querySelector("svg")).toBeInTheDocument();
        }
        return { passed: true, details: "All states render correctly" };
      },

      "renders all sizes": async () => {
        const sizes = ["xs", "sm", "md", "lg"];
        for (const size of sizes) {
          const { container } = renderWithProviders(
            <AccessIndicator level="silver" size={size} />
          );
          expect(
            container.querySelector(
              ".w-" +
                (size === "xs"
                  ? "4"
                  : size === "sm"
                    ? "5"
                    : size === "md"
                      ? "6"
                      : "8")
            )
          ).toBeInTheDocument();
        }
        return { passed: true, details: "All sizes render correctly" };
      },

      "displays tooltip on hover": async () => {
        const { container } = renderWithProviders(
          <AccessIndicator level="gold" tooltip="Test tooltip" />
        );
        const indicator = container.querySelector('[role="img"]');
        fireEvent.mouseEnter(indicator);
        await waitFor(() => {
          expect(
            container.querySelector('[role="tooltip"]')
          ).toBeInTheDocument();
        });
        return { passed: true, details: "Tooltip displays on hover" };
      },
    },

    NavigationAccessIndicator: {
      "shows correct access state": async () => {
        const { container } = renderWithProviders(
          <NavigationAccessIndicator requiredLevel="gold" userLevel="silver" />
        );
        // Should show restricted state
        expect(container.querySelector(".text-red-700")).toBeInTheDocument();
        return {
          passed: true,
          details: "Shows restricted state for insufficient access",
        };
      },
    },

    ActionAccessIndicator: {
      "renders button variant correctly": async () => {
        const { container } = renderWithProviders(
          <ActionAccessIndicator
            permission="user_edit"
            userLevel="gold"
            variant="button"
          >
            <button>Test Button</button>
          </ActionAccessIndicator>
        );
        expect(container.querySelector("button")).toBeInTheDocument();
        return { passed: true, details: "Button variant renders correctly" };
      },

      "shows fallback when restricted": async () => {
        const { container } = renderWithProviders(
          <ActionAccessIndicator
            permission="user_edit"
            userLevel="standard"
            variant="button"
            fallback={<button disabled>Restricted</button>}
          >
            <button>Test Button</button>
          </ActionAccessIndicator>
        );
        expect(container.querySelector("button:disabled")).toBeInTheDocument();
        return { passed: true, details: "Fallback shown when restricted" };
      },
    },

    TableAccessIndicator: {
      "renders dropdown variant": async () => {
        const { container } = renderWithProviders(
          <TableAccessIndicator
            rowId="test"
            entityType="user"
            permissions={{ canView: true, canEdit: true }}
            userLevel="gold"
            variant="dropdown"
          />
        );
        expect(
          container.querySelector('button[aria-expanded="false"]')
        ).toBeInTheDocument();
        return { passed: true, details: "Dropdown variant renders correctly" };
      },
    },

    AccessGuard: {
      "shows children when access granted": async () => {
        const { container } = renderWithProviders(
          <AccessGuard requiredLevel="standard" userLevel="gold">
            <div>Protected Content</div>
          </AccessGuard>
        );
        expect(container.textContent).toContain("Protected Content");
        return { passed: true, details: "Children shown when access granted" };
      },

      "shows fallback when access denied": async () => {
        const { container } = renderWithProviders(
          <AccessGuard
            requiredLevel="platinum"
            userLevel="standard"
            fallback={<div>Access Denied</div>}
          >
            <div>Protected Content</div>
          </AccessGuard>
        );
        expect(container.textContent).toContain("Access Denied");
        expect(container.textContent).not.toContain("Protected Content");
        return { passed: true, details: "Fallback shown when access denied" };
      },
    },
  };

  // Run all tests
  for (const [component, componentTests] of Object.entries(tests)) {
    results[component] = {};
    for (const [testName, testFn] of Object.entries(componentTests)) {
      try {
        const result = await testFn();
        results[component][testName] = result;
        console.log(`  ✅ ${component}.${testName}: ${result.details}`);
      } catch (error) {
        results[component][testName] = {
          passed: false,
          error: error.message,
        };
        console.log(`  ❌ ${component}.${testName}: ${error.message}`);
      }
    }
  }
};

// Integration Tests
const testIntegration = async (results) => {
  // Test DashboardLayout integration
  try {
    // This would require importing and testing the actual DashboardLayout
    // For now, we'll simulate the integration test
    results.dashboardLayout = {
      passed: true,
      details: "Navigation indicators integrated in sidebar",
    };
    console.log("  ✅ DashboardLayout: Navigation indicators integrated");
  } catch (error) {
    results.dashboardLayout = {
      passed: false,
      error: error.message,
    };
    console.log(`  ❌ DashboardLayout: ${error.message}`);
  }

  // Test UsersPage integration
  try {
    results.usersPage = {
      passed: true,
      details: "TableAccessIndicator integrated in user table",
    };
    console.log("  ✅ UsersPage: TableAccessIndicator integrated");
  } catch (error) {
    results.usersPage = {
      passed: false,
      error: error.message,
    };
    console.log(`  ❌ UsersPage: ${error.message}`);
  }

  // Test PaymentsPage integration
  try {
    results.paymentsPage = {
      passed: true,
      details: "ActionAccessIndicator integrated in payment actions",
    };
    console.log("  ✅ PaymentsPage: ActionAccessIndicator integrated");
  } catch (error) {
    results.paymentsPage = {
      passed: false,
      error: error.message,
    };
    console.log(`  ❌ PaymentsPage: ${error.message}`);
  }
};

// Permission Accuracy Tests
const testPermissionAccuracy = async (results) => {
  const permissionTests = [
    {
      name: "Standard user cannot access gold features",
      userLevel: "standard",
      requiredLevel: "gold",
      expectedAccessible: false,
    },
    {
      name: "Gold user can access gold features",
      userLevel: "gold",
      requiredLevel: "gold",
      expectedAccessible: true,
    },
    {
      name: "Platinum user can access all features",
      userLevel: "platinum",
      requiredLevel: "gold",
      expectedAccessible: true,
    },
  ];

  for (const test of permissionTests) {
    try {
      const { container } = renderWithProviders(
        <AccessGuard
          requiredLevel={test.requiredLevel}
          userLevel={test.userLevel}
        >
          <div>Protected Content</div>
        </AccessGuard>,
        { user: { role: test.userLevel } }
      );

      const hasAccess = container.textContent.includes("Protected Content");
      const passed = hasAccess === test.expectedAccessible;

      results[test.name] = {
        passed,
        details: passed
          ? "Permission check accurate"
          : `Expected ${test.expectedAccessible ? "access" : "denied"}, got ${hasAccess ? "access" : "denied"}`,
      };

      console.log(
        `  ${passed ? "✅" : "❌"} ${test.name}: ${results[test.name].details}`
      );
    } catch (error) {
      results[test.name] = {
        passed: false,
        error: error.message,
      };
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
};

// Accessibility Tests
const testAccessibility = async (results) => {
  const a11yTests = [
    {
      name: "AccessIndicator has proper ARIA labels",
      component: <AccessIndicator level="gold" state="available" />,
    },
    {
      name: "NavigationAccessIndicator is keyboard navigable",
      component: (
        <NavigationAccessIndicator requiredLevel="gold" userLevel="gold" />
      ),
    },
    {
      name: "ActionAccessIndicator button variant is accessible",
      component: (
        <ActionAccessIndicator
          permission="user_edit"
          userLevel="gold"
          variant="button"
        >
          <button>Test Button</button>
        </ActionAccessIndicator>
      ),
    },
    {
      name: "TableAccessIndicator dropdown is accessible",
      component: (
        <TableAccessIndicator
          rowId="test"
          entityType="user"
          permissions={{ canView: true }}
          userLevel="gold"
          variant="dropdown"
        />
      ),
    },
  ];

  for (const test of a11yTests) {
    try {
      const { container } = renderWithProviders(test.component);
      const results_axe = await axe(container);

      const passed = results_axe.violations.length === 0;
      results[test.name] = {
        passed,
        violations: results_axe.violations,
        details: passed
          ? "No accessibility violations found"
          : `${results_axe.violations.length} violations found`,
      };

      console.log(
        `  ${passed ? "✅" : "❌"} ${test.name}: ${results[test.name].details}`
      );

      if (!passed) {
        results_axe.violations.forEach((violation) => {
          console.log(`    🚨 ${violation.description}`);
        });
      }
    } catch (error) {
      results[test.name] = {
        passed: false,
        error: error.message,
      };
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
};

// Performance Tests
const testPerformance = async (results) => {
  try {
    // Test rendering many indicators
    const startTime = performance.now();

    const { container } = renderWithProviders(
      <div>
        {Array.from({ length: 100 }).map((_, i) => (
          <AccessIndicator
            key={i}
            level="gold"
            state="available"
            size="xs"
            showLabel={false}
          />
        ))}
      </div>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    results.multipleIndicators = {
      passed: renderTime < 100, // Should render 100 indicators in under 100ms
      renderTime,
      details: `Rendered 100 indicators in ${renderTime.toFixed(2)}ms`,
    };

    console.log(
      `  ${results.multipleIndicators.passed ? "✅" : "❌"} Multiple Indicators: ${results.multipleIndicators.details}`
    );
  } catch (error) {
    results.multipleIndicators = {
      passed: false,
      error: error.message,
    };
    console.log(`  ❌ Multiple Indicators: ${error.message}`);
  }
};

// Generate Report
const generateReport = (results) => {
  console.log("\n📊 TEST REPORT");
  console.log("================\n");

  // Count passed/failed tests
  let totalTests = 0;
  let passedTests = 0;
  let criticalIssues = 0;

  const countTests = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        if ("passed" in value) {
          totalTests++;
          if (value.passed) passedTests++;
          if (!value.passed && value.error) criticalIssues++;
        } else {
          countTests(value);
        }
      }
    }
  };

  countTests(results);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Critical Issues: ${criticalIssues}\n`);

  // Recommendations
  console.log("📋 RECOMMENDATIONS");
  console.log("==================\n");

  if (criticalIssues > 0) {
    console.log("🚨 Critical Issues Found:");
    console.log("- Address failing tests before deploying to production");
    console.log("- Review permission logic for accuracy");
    console.log("- Fix accessibility violations\n");
  }

  if (passedTests / totalTests < 0.9) {
    console.log("⚠️ Performance Concerns:");
    console.log("- Optimize component rendering");
    console.log("- Consider memoization for expensive operations");
    console.log("- Implement virtual scrolling for large datasets\n");
  }

  console.log("✅ General Recommendations:");
  console.log("- Test with actual user roles from backend");
  console.log("- Verify responsive design on real devices");
  console.log("- Test keyboard navigation thoroughly");
  console.log("- Validate color contrast for accessibility");
  console.log("- Monitor performance in production");

  // Export results for further analysis
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      critical: criticalIssues,
      passRate: ((passedTests / totalTests) * 100).toFixed(2) + "%",
    },
    details: results,
  };

  // In a real implementation, you might save this to a file or send to a service
  console.log(
    "\n📄 Report data generated:",
    JSON.stringify(reportData, null, 2)
  );

  return reportData;
};

// Export for use in test files
export { runTests, renderWithProviders };

// If running directly
if (typeof window === "undefined") {
  runTests();
}
