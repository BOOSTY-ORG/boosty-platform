/**
 * Unit Tests for Finance Mock Data Generator
 *
 * Tests the mock data generation functions to ensure they produce
 * realistic and properly formatted data for testing purposes
 */

import {
  generateKPIData,
  generateTransactionData,
  generatePayoutData,
  generateROIAnalyticsData,
  generateRevenueData,
  generateInvestmentData,
  generatePortfolioPerformanceData,
  generateInvestorPerformanceData,
  generateFinancialSummary,
  createPaginatedResponse,
  generateErrorResponse,
} from "../financeMockData.js";

describe("Finance Mock Data Generator", () => {
  describe("generateKPIData", () => {
    test("should generate valid KPI data with default values", () => {
      const kpiData = generateKPIData();

      expect(kpiData).toHaveProperty("revenue");
      expect(kpiData).toHaveProperty("investment");
      expect(kpiData).toHaveProperty("payout");
      expect(kpiData).toHaveProperty("roi");

      expect(kpiData.revenue).toHaveProperty("total");
      expect(kpiData.revenue).toHaveProperty("monthlyRecurring");
      expect(kpiData.revenue).toHaveProperty("growth");

      expect(typeof kpiData.revenue.total).toBe("number");
      expect(typeof kpiData.revenue.monthlyRecurring).toBe("number");
      expect(typeof kpiData.revenue.growth.percentage).toBe("number");
      expect(["up", "down", "stable"]).toContain(kpiData.revenue.growth.trend);
    });

    test("should accept custom overrides", () => {
      const customData = {
        revenue: {
          total: 1000000,
          monthlyRecurring: 500000,
          growth: { percentage: 15, trend: "up" },
        },
      };

      const kpiData = generateKPIData(customData);

      expect(kpiData.revenue.total).toBe(1000000);
      expect(kpiData.revenue.monthlyRecurring).toBe(500000);
      expect(kpiData.revenue.growth.percentage).toBe(15);
      expect(kpiData.revenue.growth.trend).toBe("up");
    });

    test("should generate values within expected ranges", () => {
      const kpiData = generateKPIData();

      expect(kpiData.revenue.total).toBeGreaterThanOrEqual(500000);
      expect(kpiData.revenue.total).toBeLessThanOrEqual(2000000);

      expect(kpiData.roi.percentage).toBeGreaterThanOrEqual(8);
      expect(kpiData.roi.percentage).toBeLessThanOrEqual(25);
    });
  });

  describe("generateTransactionData", () => {
    test("should generate valid transaction data", () => {
      const transactions = generateTransactionData(10);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions).toHaveLength(10);

      transactions.forEach((transaction) => {
        expect(transaction).toHaveProperty("transactionId");
        expect(transaction).toHaveProperty("amount");
        expect(transaction).toHaveProperty("type");
        expect(transaction).toHaveProperty("status");
        expect(transaction).toHaveProperty("user");
        expect(transaction).toHaveProperty("createdAt");

        expect(typeof transaction.amount).toBe("number");
        expect([
          "credit",
          "debit",
          "deposit",
          "withdrawal",
          "transfer",
          "fee",
        ]).toContain(transaction.type);
        expect([
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
          "reversed",
        ]).toContain(transaction.status);
      });
    });

    test("should generate transactions with valid user data", () => {
      const transactions = generateTransactionData(5);

      transactions.forEach((transaction) => {
        expect(transaction.user).toHaveProperty("id");
        expect(transaction.user).toHaveProperty("name");
        expect(transaction.user).toHaveProperty("email");

        expect(typeof transaction.user.name).toBe("string");
        expect(typeof transaction.user.email).toBe("string");
        expect(transaction.user.email).toContain("@");
      });
    });

    test("should sort transactions by creation date (newest first)", () => {
      const transactions = generateTransactionData(10);

      for (let i = 1; i < transactions.length; i++) {
        const currentDate = new Date(transactions[i].createdAt);
        const previousDate = new Date(transactions[i - 1].createdAt);
        expect(currentDate.getTime()).toBeLessThanOrEqual(
          previousDate.getTime()
        );
      }
    });
  });

  describe("generatePayoutData", () => {
    test("should generate valid payout data", () => {
      const payouts = generatePayoutData(10);

      expect(Array.isArray(payouts)).toBe(true);
      expect(payouts).toHaveLength(10);

      payouts.forEach((payout) => {
        expect(payout).toHaveProperty("payoutId");
        expect(payout).toHaveProperty("type");
        expect(payout).toHaveProperty("amount");
        expect(payout).toHaveProperty("status");
        expect(payout).toHaveProperty("recipient");
        expect(payout).toHaveProperty("createdAt");

        expect(typeof payout.amount).toBe("number");
        expect([
          "investment_return",
          "profit_sharing",
          "dividend",
          "referral_bonus",
        ]).toContain(payout.type);
        expect([
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled",
        ]).toContain(payout.status);
      });
    });

    test("should generate payouts with valid recipient data", () => {
      const payouts = generatePayoutData(5);

      payouts.forEach((payout) => {
        expect(payout.recipient).toHaveProperty("id");
        expect(payout.recipient).toHaveProperty("name");
        expect(payout.recipient).toHaveProperty("email");

        expect(typeof payout.recipient.name).toBe("string");
        expect(typeof payout.recipient.email).toBe("string");
      });
    });
  });

  describe("generateROIAnalyticsData", () => {
    test("should generate valid ROI analytics data", () => {
      const roiData = generateROIAnalyticsData("monthly");

      expect(roiData).toHaveProperty("labels");
      expect(roiData).toHaveProperty("portfolioROI");
      expect(roiData).toHaveProperty("benchmark");
      expect(roiData).toHaveProperty("riskAdjusted");
      expect(roiData).toHaveProperty("volatility");
      expect(roiData).toHaveProperty("sharpeRatio");
      expect(roiData).toHaveProperty("categories");
      expect(roiData).toHaveProperty("summary");

      expect(Array.isArray(roiData.labels)).toBe(true);
      expect(Array.isArray(roiData.portfolioROI)).toBe(true);
      expect(Array.isArray(roiData.benchmark)).toBe(true);
      expect(Array.isArray(roiData.riskAdjusted)).toBe(true);

      expect(roiData.labels).toHaveLength(12); // Monthly has 12 data points
      expect(roiData.portfolioROI).toHaveLength(12);
    });

    test("should generate correct data points for different periods", () => {
      const monthlyData = generateROIAnalyticsData("monthly");
      const quarterlyData = generateROIAnalyticsData("quarterly");
      const yearlyData = generateROIAnalyticsData("yearly");

      expect(monthlyData.labels).toHaveLength(12);
      expect(quarterlyData.labels).toHaveLength(6);
      expect(yearlyData.labels).toHaveLength(5);
    });

    test("should generate realistic ROI values", () => {
      const roiData = generateROIAnalyticsData("monthly");

      roiData.portfolioROI.forEach((roi) => {
        expect(roi).toBeGreaterThanOrEqual(2);
        expect(roi).toBeLessThanOrEqual(8);
      });

      roiData.volatility.forEach((vol) => {
        expect(vol).toBeGreaterThanOrEqual(0.5);
        expect(vol).toBeLessThanOrEqual(1.5);
      });
    });
  });

  describe("generateRevenueData", () => {
    test("should generate valid revenue data", () => {
      const revenueData = generateRevenueData("monthly");

      expect(revenueData).toHaveProperty("labels");
      expect(revenueData).toHaveProperty("revenue");
      expect(revenueData).toHaveProperty("growth");
      expect(revenueData).toHaveProperty("targets");
      expect(revenueData).toHaveProperty("breakdown");

      expect(Array.isArray(revenueData.labels)).toBe(true);
      expect(Array.isArray(revenueData.revenue)).toBe(true);
      expect(Array.isArray(revenueData.growth)).toBe(true);
      expect(Array.isArray(revenueData.targets)).toBe(true);

      expect(revenueData.labels).toHaveLength(12); // Monthly has 12 data points
      expect(revenueData.revenue).toHaveLength(12);
    });

    test("should generate revenue breakdown with valid categories", () => {
      const revenueData = generateRevenueData("monthly");

      expect(revenueData.breakdown).toHaveProperty("investments");
      expect(revenueData.breakdown).toHaveProperty("fees");
      expect(revenueData.breakdown).toHaveProperty("services");
      expect(revenueData.breakdown).toHaveProperty("other");

      Object.values(revenueData.breakdown).forEach((category) => {
        expect(Array.isArray(category)).toBe(true);
        expect(category).toHaveLength(12);
      });
    });

    test("should calculate growth percentages correctly", () => {
      const revenueData = generateRevenueData("monthly");

      expect(revenueData.growth[0]).toBeNull(); // First period has no growth

      for (let i = 1; i < revenueData.growth.length; i++) {
        if (revenueData.growth[i] !== null) {
          expect(typeof revenueData.growth[i]).toBe("number");
          expect(revenueData.growth[i]).toBeGreaterThanOrEqual(-100);
          expect(revenueData.growth[i]).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe("generateInvestmentData", () => {
    test("should generate valid investment data", () => {
      const investments = generateInvestmentData(10);

      expect(Array.isArray(investments)).toBe(true);
      expect(investments).toHaveLength(10);

      investments.forEach((investment) => {
        expect(investment).toHaveProperty("investmentId");
        expect(investment).toHaveProperty("investorId");
        expect(investment).toHaveProperty("investorName");
        expect(investment).toHaveProperty("type");
        expect(investment).toHaveProperty("amount");
        expect(investment).toHaveProperty("currentValue");
        expect(investment).toHaveProperty("roi");
        expect(investment).toHaveProperty("status");
        expect(investment).toHaveProperty("startDate");
        expect(investment).toHaveProperty("maturityDate");

        expect(typeof investment.amount).toBe("number");
        expect(typeof investment.currentValue).toBe("number");
        expect(typeof investment.roi).toBe("number");
        expect([
          "solar_bond",
          "green_energy",
          "infrastructure",
          "renewable_fund",
        ]).toContain(investment.type);
        expect(["active", "matured", "pending", "cancelled"]).toContain(
          investment.status
        );
      });
    });

    test("should calculate current value correctly based on ROI", () => {
      const investments = generateInvestmentData(5);

      investments.forEach((investment) => {
        const expectedCurrentValue =
          investment.amount * (1 + investment.roi / 100);
        expect(investment.currentValue).toBeCloseTo(expectedCurrentValue, 2);
      });
    });
  });

  describe("generatePortfolioPerformanceData", () => {
    test("should generate valid portfolio performance data", () => {
      const portfolioData = generatePortfolioPerformanceData();

      expect(portfolioData).toHaveProperty("currentValue");
      expect(portfolioData).toHaveProperty("totalReturn");
      expect(portfolioData).toHaveProperty("annualizedReturn");
      expect(portfolioData).toHaveProperty("volatility");
      expect(portfolioData).toHaveProperty("sharpeRatio");
      expect(portfolioData).toHaveProperty("maxDrawdown");
      expect(portfolioData).toHaveProperty("performance");
      expect(portfolioData).toHaveProperty("allocation");
      expect(portfolioData).toHaveProperty("topPerformers");
      expect(portfolioData).toHaveProperty("worstPerformers");

      expect(typeof portfolioData.currentValue).toBe("number");
      expect(typeof portfolioData.totalReturn).toBe("number");
      expect(typeof portfolioData.annualizedReturn).toBe("number");

      expect(Array.isArray(portfolioData.performance)).toBe(true);
      expect(Array.isArray(portfolioData.topPerformers)).toBe(true);
      expect(Array.isArray(portfolioData.worstPerformers)).toBe(true);
    });

    test("should generate valid allocation data", () => {
      const portfolioData = generatePortfolioPerformanceData();

      expect(portfolioData.allocation).toHaveProperty("Solar Bonds");
      expect(portfolioData.allocation).toHaveProperty("Green Energy");
      expect(portfolioData.allocation).toHaveProperty("Infrastructure");
      expect(portfolioData.allocation).toHaveProperty("Cash");
      expect(portfolioData.allocation).toHaveProperty("Other");

      const totalAllocation = Object.values(portfolioData.allocation).reduce(
        (sum, value) => sum + value,
        0
      );
      expect(totalAllocation).toBeCloseTo(100, 1); // Should be close to 100%
    });
  });

  describe("generateInvestorPerformanceData", () => {
    test("should generate valid investor performance data", () => {
      const investors = generateInvestorPerformanceData(10);

      expect(Array.isArray(investors)).toBe(true);
      expect(investors).toHaveLength(10);

      investors.forEach((investor) => {
        expect(investor).toHaveProperty("investorId");
        expect(investor).toHaveProperty("investorName");
        expect(investor).toHaveProperty("totalInvested");
        expect(investor).toHaveProperty("currentValue");
        expect(investor).toHaveProperty("totalReturns");
        expect(investor).toHaveProperty("roi");
        expect(investor).toHaveProperty("investmentCount");
        expect(investor).toHaveProperty("activeInvestments");
        expect(investor).toHaveProperty("lastActivity");
        expect(investor).toHaveProperty("joinDate");
        expect(investor).toHaveProperty("riskProfile");
        expect(investor).toHaveProperty("status");
        expect(investor).toHaveProperty("kycStatus");

        expect(typeof investor.totalInvested).toBe("number");
        expect(typeof investor.currentValue).toBe("number");
        expect(typeof investor.roi).toBe("number");
        expect(["conservative", "moderate", "aggressive"]).toContain(
          investor.riskProfile
        );
        expect(["active", "inactive", "suspended"]).toContain(investor.status);
      });
    });

    test("should calculate ROI correctly", () => {
      const investors = generateInvestorPerformanceData(5);

      investors.forEach((investor) => {
        const expectedROI =
          ((investor.currentValue - investor.totalInvested) /
            investor.totalInvested) *
          100;
        expect(investor.roi).toBeCloseTo(expectedROI, 2);
      });
    });

    test("should sort investors by ROI (highest first)", () => {
      const investors = generateInvestorPerformanceData(10);

      for (let i = 1; i < investors.length; i++) {
        expect(investors[i].roi).toBeLessThanOrEqual(investors[i - 1].roi);
      }
    });
  });

  describe("generateFinancialSummary", () => {
    test("should generate valid financial summary", () => {
      const summary = generateFinancialSummary();

      expect(summary).toHaveProperty("totalRevenue");
      expect(summary).toHaveProperty("totalInvestments");
      expect(summary).toHaveProperty("activeInvestors");
      expect(summary).toHaveProperty("totalPayouts");
      expect(summary).toHaveProperty("averageROI");
      expect(summary).toHaveProperty("portfolioValue");
      expect(summary).toHaveProperty("monthlyGrowth");
      expect(summary).toHaveProperty("yearlyGrowth");
      expect(summary).toHaveProperty("pendingTransactions");
      expect(summary).toHaveProperty("failedTransactions");
      expect(summary).toHaveProperty("processingRate");
      expect(summary).toHaveProperty("customerSatisfaction");
      expect(summary).toHaveProperty("marketShare");

      Object.values(summary).forEach((value) => {
        expect(typeof value).toBe("number");
      });
    });

    test("should generate values within expected ranges", () => {
      const summary = generateFinancialSummary();

      expect(summary.totalRevenue).toBeGreaterThanOrEqual(1000000);
      expect(summary.totalRevenue).toBeLessThanOrEqual(5000000);

      expect(summary.averageROI).toBeGreaterThanOrEqual(10);
      expect(summary.averageROI).toBeLessThanOrEqual(25);

      expect(summary.processingRate).toBeGreaterThanOrEqual(85);
      expect(summary.processingRate).toBeLessThanOrEqual(98);
    });
  });

  describe("createPaginatedResponse", () => {
    test("should create valid paginated response", () => {
      const data = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      const paginated = createPaginatedResponse(data, 2, 10);

      expect(paginated).toHaveProperty("data");
      expect(paginated).toHaveProperty("pagination");

      expect(paginated.data).toHaveLength(10);
      expect(paginated.data[0].id).toBe(11); // Should start from item 11 (page 2)
      expect(paginated.data[9].id).toBe(20);

      expect(paginated.pagination).toHaveProperty("page", 2);
      expect(paginated.pagination).toHaveProperty("limit", 10);
      expect(paginated.pagination).toHaveProperty("total", 25);
      expect(paginated.pagination).toHaveProperty("pages", 3);
      expect(paginated.pagination).toHaveProperty("hasNext", true);
      expect(paginated.pagination).toHaveProperty("hasPrev", true);
    });

    test("should handle first page correctly", () => {
      const data = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
      const paginated = createPaginatedResponse(data, 1, 5);

      expect(paginated.data).toHaveLength(5);
      expect(paginated.data[0].id).toBe(1);
      expect(paginated.data[4].id).toBe(5);

      expect(paginated.pagination.hasPrev).toBe(false);
      expect(paginated.pagination.hasNext).toBe(true);
    });

    test("should handle last page correctly", () => {
      const data = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
      const paginated = createPaginatedResponse(data, 3, 5);

      expect(paginated.data).toHaveLength(2); // Last page has only 2 items
      expect(paginated.data[0].id).toBe(11);
      expect(paginated.data[1].id).toBe(12);

      expect(paginated.pagination.hasPrev).toBe(true);
      expect(paginated.pagination.hasNext).toBe(false);
    });
  });

  describe("generateErrorResponse", () => {
    test("should generate valid error response", () => {
      const error = generateErrorResponse("Test error message", 500);

      expect(error).toHaveProperty("error", true);
      expect(error).toHaveProperty("message", "Test error message");
      expect(error).toHaveProperty("statusCode", 500);
      expect(error).toHaveProperty("timestamp");
      expect(error).toHaveProperty("details");

      expect(error.details).toHaveProperty("type");
      expect(error.details).toHaveProperty("retryable");

      expect(typeof error.timestamp).toBe("string");
      expect([
        "validation_error",
        "database_error",
        "network_error",
        "authorization_error",
      ]).toContain(error.details.type);
    });

    test("should use default values when not provided", () => {
      const error = generateErrorResponse();

      expect(error.message).toBe("API Error");
      expect(error.statusCode).toBe(500);
      expect(error.details.retryable).toBe(true); // 500+ status codes are retryable
    });

    test("should set retryable based on status code", () => {
      const clientError = generateErrorResponse("Client error", 400);
      const serverError = generateErrorResponse("Server error", 500);

      expect(clientError.details.retryable).toBe(false);
      expect(serverError.details.retryable).toBe(true);
    });
  });
});
