const mongoose = require('mongoose');
const { generateMockData, generateTestUser, generateTestInvestor } = require('../../src/utils/metrics/mockData.generator.js');
const User = require('../../src/models/user.model.js');
const Investor = require('../../src/models/metrics/investor.model.js');
const SolarApplication = require('../../src/models/metrics/solarApplication.model.js');
const Transaction = require('../../src/models/metrics/transaction.model.js');
const Investment = require('../../src/models/metrics/investment.model.js');
const KYCDocument = require('../../src/models/metrics/kycDocument.model.js');

// Test database setup
const setupTestDatabase = async () => {
  // Use a test database
  const mongoUri = process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_metrics_test';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
  
  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Investor.deleteMany({}),
    SolarApplication.deleteMany({}),
    Transaction.deleteMany({}),
    Investment.deleteMany({}),
    KYCDocument.deleteMany({})
  ]);
};

const teardownTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

// Create test data
const createTestData = async (options = {}) => {
  const {
    users = 5,
    investors = 2,
    applications = 10,
    transactions = 20,
    investments = 5,
    kycDocuments = 15
  } = options;

  // Create test users
  const testUsers = [];
  for (let i = 0; i < users; i++) {
    const user = await generateTestUser();
    user.email = `testuser${i}@example.com`;
    await user.save();
    testUsers.push(user);
  }

  // Create test investors
  const testInvestors = [];
  for (let i = 0; i < investors; i++) {
    const investor = await generateTestInvestor(testUsers[i]._id);
    testInvestors.push(investor);
  }

  // Create test applications
  const testApplications = [];
  for (let i = 0; i < applications; i++) {
    const application = new SolarApplication({
      userId: testUsers[i % users]._id,
      applicationId: `TESTAPP${String(i + 1).padStart(4, '0')}`,
      personalInfo: {
        fullName: `Test User ${i}`,
        phone: `+23480000000${i}`,
        address: `${i} Test Street`,
        city: 'Test City',
        state: 'Lagos',
        country: 'Nigeria'
      },
      propertyDetails: {
        propertyType: 'residential',
        monthlyElectricityBill: 10000,
        averageDailyConsumption: 20,
        appliances: [
          { name: 'Refrigerator', wattage: 150, quantity: 1, hoursPerDay: 24 }
        ]
      },
      financialInfo: {
        monthlyIncome: 100000,
        employmentStatus: 'employed',
        creditScore: 700,
        existingLoans: 0
      },
      systemRequirements: {
        estimatedCost: 500000,
        systemSize: 5,
        panelCount: 10,
        batteryCapacity: 10,
        installationType: 'rooftop'
      },
      applicationStatus: 'approved',
      kycStatus: 'verified',
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      fundedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      installedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });
    await application.save();
    testApplications.push(application);
  }

  // Create test transactions
  const testTransactions = [];
  for (let i = 0; i < transactions; i++) {
    const transaction = new Transaction({
      transactionId: `TESTTXN${String(i + 1).padStart(6, '0')}`,
      type: i % 2 === 0 ? 'investment' : 'repayment',
      fromEntity: i % 2 === 0 ? 'investor' : 'user',
      toEntity: i % 2 === 0 ? 'user' : 'investor',
      fromEntityId: i % 2 === 0 ? testInvestors[i % investors]._id : testUsers[i % users]._id,
      toEntityId: i % 2 === 0 ? testUsers[i % users]._id : testInvestors[i % investors]._id,
      amount: 100000 + (i * 10000),
      currency: 'NGN',
      status: 'completed',
      paymentMethod: 'bank_transfer',
      paymentReference: `TESTREF${i}`,
      relatedApplication: testApplications[i % applications]._id,
      fees: {
        processingFee: 1000,
        platformFee: 500,
        transactionFee: 200
      },
      processedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    });
    await transaction.save();
    testTransactions.push(transaction);
  }

  // Create test investments
  const testInvestments = [];
  for (let i = 0; i < investments; i++) {
    const investment = new Investment({
      investmentId: `TESTINV${String(i + 1).padStart(5, '0')}`,
      investorId: testInvestors[i % investors]._id,
      applicationId: testApplications[i % applications]._id,
      amount: 200000 + (i * 50000),
      expectedReturn: 240000 + (i * 60000),
      actualReturn: i < 3 ? 50000 + (i * 10000) : 0,
      interestRate: 15 + i,
      term: 24,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 18 * 30 * 24 * 60 * 60 * 1000),
      status: i < 3 ? 'active' : 'pending',
      repaymentSchedule: [
        {
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 20000,
          principal: 15000,
          interest: 5000,
          status: 'pending'
        }
      ],
      riskAssessment: {
        creditScore: 700,
        riskLevel: 'low',
        riskFactors: []
      },
      performance: {
        roi: i < 3 ? 12.5 : 0,
        daysActive: 30,
        onTimePayments: i < 3 ? 3 : 0,
        latePayments: 0
      }
    });
    await investment.save();
    testInvestments.push(investment);
  }

  // Create test KYC documents
  const testKYCDocuments = [];
  for (let i = 0; i < kycDocuments; i++) {
    const document = new KYCDocument({
      userId: testUsers[i % users]._id,
      applicationId: testApplications[i % applications]._id,
      documentType: ['government_id', 'utility_bill', 'bank_statement', 'proof_of_income'][i % 4],
      documentUrl: `https://test.example.com/doc${i}.pdf`,
      documentNumber: `DOC${String(i + 1).padStart(8, '0')}`,
      issuingAuthority: 'Test Authority',
      issueDate: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
      verificationStatus: i < 10 ? 'verified' : 'pending',
      verificationScore: 85 + (i % 10),
      rejectionReason: i >= 10 ? 'Under review' : null,
      reviewedBy: i < 10 ? testUsers[0]._id : null,
      reviewedAt: i < 10 ? new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) : null,
      aiAnalysis: {
        authenticityScore: 90 + (i % 10),
        extractedData: {
          name: `Test User ${i}`,
          dateOfBirth: new Date(1990, 0, 1)
        },
        flags: i % 5 === 0 ? ['Manual review required'] : []
      },
      uploadedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    });
    await document.save();
    testKYCDocuments.push(document);
  }

  return {
    users: testUsers,
    investors: testInvestors,
    applications: testApplications,
    transactions: testTransactions,
    investments: testInvestments,
    kycDocuments: testKYCDocuments
  };
};

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    role: 'admin'
  };
  next();
};

// Mock request object
const createMockRequest = (overrides = {}) => {
  return {
    query: {},
    params: {},
    body: {},
    user: {
      id: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      role: 'admin'
    },
    ...overrides
  };
};

// Mock response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const createMockNext = () => jest.fn();

// Generate test dates
const generateTestDates = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  return {
    now,
    thirtyDaysAgo,
    sixtyDaysAgo,
    ninetyDaysAgo
  };
};

// Common test data
const commonTestData = {
  validUser: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  },
  validInvestor: {
    investorType: 'individual',
    riskProfile: 'moderate',
    investmentPreferences: {
      minAmount: 100000,
      maxAmount: 1000000,
      preferredRegions: ['Lagos', 'Abuja'],
      preferredTerms: ['12 months', '24 months']
    }
  },
  validApplication: {
    personalInfo: {
      fullName: 'Test User',
      phone: '+2348000000000',
      address: '123 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria'
    },
    propertyDetails: {
      propertyType: 'residential',
      monthlyElectricityBill: 10000,
      averageDailyConsumption: 20
    },
    financialInfo: {
      monthlyIncome: 100000,
      employmentStatus: 'employed',
      creditScore: 700
    },
    systemRequirements: {
      estimatedCost: 500000,
      systemSize: 5
    }
  },
  validTransaction: {
    type: 'investment',
    amount: 100000,
    currency: 'NGN',
    paymentMethod: 'bank_transfer'
  },
  validKYCDocument: {
    documentType: 'government_id',
    documentUrl: 'https://example.com/doc.pdf',
    documentNumber: '1234567890'
  }
};

module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
  createTestData,
  mockAuthMiddleware,
  createMockRequest,
  createMockResponse,
  createMockNext,
  generateTestDates,
  commonTestData
};