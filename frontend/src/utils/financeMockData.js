/**
 * Finance Mock Data Generator
 *
 * Generates realistic mock data for testing finance components
 * including KPIs, transactions, payouts, ROI analytics, and charts
 */

// Helper functions
const randomFloat = (min, max, decimals = 2) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomChoice = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const randomDate = (start, end) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

const formatDate = (date) => {
  return date.toISOString();
};

// Generate random IDs
const generateId = (prefix = "") => {
  return `${prefix}${randomInt(100000, 999999)}`;
};

// Mock user data
const generateUser = () => ({
  id: generateId("user_"),
  name: randomChoice([
    "John Doe",
    "Jane Smith",
    "Michael Johnson",
    "Emily Davis",
    "Robert Wilson",
    "Sarah Brown",
    "David Jones",
    "Lisa Miller",
    "James Garcia",
    "Mary Martinez",
    "William Anderson",
    "Patricia Taylor",
  ]),
  email: `user${randomInt(1, 9999)}@example.com`,
  phone: `+234${randomInt(800000000, 999999999)}`,
  kycStatus: randomChoice(["verified", "pending", "rejected"]),
  joinDate: formatDate(randomDate(new Date(2020, 0, 1), new Date())),
});

// KPI Data Generator
export const generateKPIData = (overrides = {}) => {
  const baseRevenue = randomFloat(500000, 2000000);
  const revenueGrowth = randomFloat(-15, 25);
  const totalInvestments = randomFloat(1000000, 5000000);
  const activeInvestors = randomInt(50, 500);
  const repaymentRate = randomFloat(85, 98);

  return {
    revenue: {
      total: baseRevenue,
      monthlyRecurring: baseRevenue * randomFloat(0.6, 0.9),
      growth: {
        percentage: revenueGrowth,
        trend:
          revenueGrowth > 5 ? "up" : revenueGrowth < -5 ? "down" : "stable",
      },
    },
    investment: {
      total: totalInvestments,
      active: activeInvestors,
      roi: repaymentRate,
    },
    payout: {
      pending: {
        count: randomInt(5, 50),
        amount: randomFloat(50000, 500000),
      },
      processed: {
        count: randomInt(100, 500),
        amount: randomFloat(500000, 2000000),
      },
      totalVolume: baseRevenue * randomFloat(0.8, 1.2),
    },
    roi: {
      percentage: randomFloat(8, 25),
      trend: randomChoice(["up", "down", "stable"]),
      performance: randomFloat(60, 95),
    },
    ...overrides,
  };
};

// Transaction Data Generator
export const generateTransactionData = (count = 50, overrides = {}) => {
  const transactions = [];
  const types = ["credit", "debit", "deposit", "withdrawal", "transfer", "fee"];
  const statuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
    "reversed",
  ];

  for (let i = 0; i < count; i++) {
    const type = randomChoice(types);
    const status = randomChoice(statuses);
    const amount = randomFloat(100, 50000);
    const user = generateUser();

    transactions.push({
      transactionId: generateId("txn_"),
      amount: type === "credit" || type === "deposit" ? amount : -amount,
      type,
      status,
      user,
      description: randomChoice([
        "Investment deposit",
        "ROI payout",
        "Referral bonus",
        "Withdrawal request",
        "Transaction fee",
        "Account credit",
        "Monthly return",
        "Profit sharing",
      ]),
      reference: generateId("ref_"),
      balance: randomFloat(1000, 100000),
      createdAt: formatDate(randomDate(new Date(2023, 0, 1), new Date())),
      processedAt:
        status === "completed"
          ? formatDate(randomDate(new Date(2023, 0, 1), new Date()))
          : null,
      ...overrides,
    });
  }

  return transactions.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

// Payout Data Generator
export const generatePayoutData = (count = 30, overrides = {}) => {
  const payouts = [];
  const types = [
    "investment_return",
    "profit_sharing",
    "dividend",
    "referral_bonus",
  ];
  const statuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "cancelled",
  ];

  for (let i = 0; i < count; i++) {
    const status = randomChoice(statuses);
    const recipient = generateUser();

    payouts.push({
      payoutId: generateId("payout_"),
      type: randomChoice(types),
      amount: randomFloat(1000, 100000),
      status,
      recipient,
      createdAt: formatDate(randomDate(new Date(2023, 0, 1), new Date())),
      processedAt:
        status === "completed"
          ? formatDate(randomDate(new Date(2023, 0, 1), new Date()))
          : null,
      dueDate: formatDate(randomDate(new Date(), new Date(2024, 11, 31))),
      metadata: {
        investmentId: generateId("inv_"),
        period: `Q${randomInt(1, 4)} 2024`,
        calculationMethod: randomChoice([
          "standard",
          "accelerated",
          "performance_based",
        ]),
      },
      ...overrides,
    });
  }

  return payouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ROI Analytics Data Generator
export const generateROIAnalyticsData = (
  period = "monthly",
  overrides = {}
) => {
  const periods = {
    monthly: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      dataPoints: 12,
    },
    quarterly: {
      labels: [
        "Q1 2023",
        "Q2 2023",
        "Q3 2023",
        "Q4 2023",
        "Q1 2024",
        "Q2 2024",
      ],
      dataPoints: 6,
    },
    yearly: {
      labels: ["2020", "2021", "2022", "2023", "2024"],
      dataPoints: 5,
    },
  };

  const config = periods[period] || periods.monthly;

  const generateSeries = (min, max) => {
    return Array.from({ length: config.dataPoints }, () =>
      randomFloat(min, max)
    );
  };

  return {
    labels: config.labels,
    portfolioROI: generateSeries(2, 8),
    benchmark: generateSeries(1.5, 3),
    riskAdjusted: generateSeries(1.8, 6),
    volatility: generateSeries(0.5, 1.5),
    sharpeRatio: generateSeries(1.0, 2.5),
    categories: {
      "Solar Bonds": generateSeries(1.5, 5),
      "Green Energy": generateSeries(3, 10),
      Infrastructure: generateSeries(1, 4),
    },
    summary: {
      totalROI: randomFloat(15, 35),
      annualizedReturn: randomFloat(12, 28),
      maxDrawdown: randomFloat(-15, -5),
      volatility: randomFloat(8, 20),
      sharpeRatio: randomFloat(1.2, 2.8),
      sortinoRatio: randomFloat(1.5, 3.2),
      alpha: randomFloat(-2, 8),
      beta: randomFloat(0.7, 1.3),
    },
    ...overrides,
  };
};

// Revenue Data Generator
export const generateRevenueData = (period = "monthly", overrides = {}) => {
  const periods = {
    monthly: {
      labels: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      dataPoints: 12,
    },
    quarterly: {
      labels: [
        "Q1 2023",
        "Q2 2023",
        "Q3 2023",
        "Q4 2023",
        "Q1 2024",
        "Q2 2024",
      ],
      dataPoints: 6,
    },
    yearly: {
      labels: ["2020", "2021", "2022", "2023", "2024"],
      dataPoints: 5,
    },
  };

  const config = periods[period] || periods.monthly;
  const baseRevenue = randomFloat(40000, 80000);

  const generateRevenueSeries = () => {
    let current = baseRevenue;
    return Array.from({ length: config.dataPoints }, () => {
      const growth = randomFloat(-0.1, 0.2);
      current = current * (1 + growth);
      return Math.max(current, baseRevenue * 0.5);
    });
  };

  const revenue = generateRevenueSeries();
  const growth = revenue.map((value, index) => {
    if (index === 0) return null;
    return ((value - revenue[index - 1]) / revenue[index - 1]) * 100;
  });

  return {
    labels: config.labels,
    revenue: revenue.map((v) => Math.round(v)),
    growth: growth.map((v) => (v !== null ? parseFloat(v.toFixed(1)) : null)),
    targets: revenue.map((v) => Math.round(v * randomFloat(0.9, 1.1))),
    breakdown: {
      investments: revenue.map((v) => Math.round(v * randomFloat(0.4, 0.6))),
      fees: revenue.map((v) => Math.round(v * randomFloat(0.05, 0.15))),
      services: revenue.map((v) => Math.round(v * randomFloat(0.1, 0.25))),
      other: revenue.map((v) => Math.round(v * randomFloat(0.05, 0.15))),
    },
    ...overrides,
  };
};

// Investment Data Generator
export const generateInvestmentData = (count = 100, overrides = {}) => {
  const investments = [];
  const types = [
    "solar_bond",
    "green_energy",
    "infrastructure",
    "renewable_fund",
  ];
  const statuses = ["active", "matured", "pending", "cancelled"];

  for (let i = 0; i < count; i++) {
    const type = randomChoice(types);
    const status = randomChoice(statuses);
    const amount = randomFloat(10000, 500000);
    const roi = randomFloat(8, 25);

    investments.push({
      investmentId: generateId("inv_"),
      investorId: generateId("investor_"),
      investorName: randomChoice([
        "Alpha Investments",
        "Beta Capital",
        "Gamma Ventures",
        "Delta Holdings",
        "Epsilon Group",
        "Zeta Partners",
        "Eta Financial",
        "Theta Trust",
      ]),
      type,
      amount,
      currentValue: amount * (1 + roi / 100),
      roi,
      status,
      startDate: formatDate(
        randomDate(new Date(2020, 0, 1), new Date(2023, 0, 1))
      ),
      maturityDate: formatDate(
        randomDate(new Date(2024, 0, 1), new Date(2030, 0, 1))
      ),
      description: `${type.replace("_", " ")} investment opportunity`,
      riskLevel: randomChoice(["low", "medium", "high"]),
      expectedReturn: randomFloat(10, 30),
      actualReturn: status === "matured" ? roi : null,
      ...overrides,
    });
  }

  return investments.sort(
    (a, b) => new Date(b.startDate) - new Date(a.startDate)
  );
};

// Portfolio Performance Data Generator
export const generatePortfolioPerformanceData = (overrides = {}) => {
  const periods = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"];
  const baseValue = 1000000;

  return {
    currentValue: baseValue * randomFloat(1.1, 1.8),
    totalReturn: randomFloat(10, 80),
    annualizedReturn: randomFloat(8, 25),
    volatility: randomFloat(8, 20),
    sharpeRatio: randomFloat(1.0, 2.5),
    maxDrawdown: randomFloat(-20, -5),
    performance: periods.map((period) => ({
      period,
      return: randomFloat(-5, 35),
      volatility: randomFloat(5, 25),
      sharpeRatio: randomFloat(0.5, 3.0),
    })),
    allocation: {
      "Solar Bonds": randomFloat(20, 40),
      "Green Energy": randomFloat(15, 35),
      Infrastructure: randomFloat(10, 30),
      Cash: randomFloat(5, 15),
      Other: randomFloat(5, 15),
    },
    topPerformers: generateInvestmentData(5),
    worstPerformers: generateInvestmentData(3),
    ...overrides,
  };
};

// Investor Performance Data Generator
export const generateInvestorPerformanceData = (count = 50, overrides = {}) => {
  const investors = [];

  for (let i = 0; i < count; i++) {
    const totalInvested = randomFloat(50000, 1000000);
    const currentValue = totalInvested * randomFloat(0.9, 1.5);
    const roi = ((currentValue - totalInvested) / totalInvested) * 100;

    investors.push({
      investorId: generateId("inv_"),
      investorName: randomChoice([
        "Alpha Investments",
        "Beta Capital",
        "Gamma Ventures",
        "Delta Holdings",
        "Epsilon Group",
        "Zeta Partners",
        "Eta Financial",
        "Theta Trust",
        "Iota Securities",
        "Kappa Assets",
        "Lambda Wealth",
        "Mu Capital",
      ]),
      totalInvested,
      currentValue,
      totalReturns: currentValue - totalInvested,
      roi,
      investmentCount: randomInt(1, 20),
      activeInvestments: randomInt(1, 10),
      lastActivity: formatDate(randomDate(new Date(2023, 0, 1), new Date())),
      joinDate: formatDate(
        randomDate(new Date(2020, 0, 1), new Date(2023, 0, 1))
      ),
      riskProfile: randomChoice(["conservative", "moderate", "aggressive"]),
      status: randomChoice(["active", "inactive", "suspended"]),
      kycStatus: randomChoice(["verified", "pending", "rejected"]),
      ...overrides,
    });
  }

  return investors.sort((a, b) => b.roi - a.roi);
};

// Financial Summary Generator
export const generateFinancialSummary = (overrides = {}) => {
  return {
    totalRevenue: randomFloat(1000000, 5000000),
    totalInvestments: randomFloat(2000000, 10000000),
    activeInvestors: randomInt(100, 1000),
    totalPayouts: randomFloat(500000, 3000000),
    averageROI: randomFloat(10, 25),
    portfolioValue: randomFloat(5000000, 20000000),
    monthlyGrowth: randomFloat(-10, 30),
    yearlyGrowth: randomFloat(-5, 50),
    pendingTransactions: randomInt(10, 100),
    failedTransactions: randomInt(1, 20),
    processingRate: randomFloat(85, 98),
    customerSatisfaction: randomFloat(3.5, 5.0),
    marketShare: randomFloat(5, 25),
    ...overrides,
  };
};

// Pagination Helper
export const createPaginatedResponse = (data, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      pages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1,
    },
  };
};

// Error Response Generator
export const generateErrorResponse = (
  message = "API Error",
  statusCode = 500
) => {
  return {
    error: true,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    details: {
      type: randomChoice([
        "validation_error",
        "database_error",
        "network_error",
        "authorization_error",
      ]),
      retryable: statusCode >= 500,
    },
  };
};

// Export all generators
export const financeMockData = {
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
};

export default financeMockData;
