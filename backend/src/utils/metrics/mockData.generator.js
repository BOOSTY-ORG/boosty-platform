const mongoose = require("mongoose");
const User = require("../../models/user.model.js");
const Investor = require("../../models/metrics/investor.model.js");
const SolarApplication = require("../../models/metrics/solarApplication.model.js");
const Transaction = require("../../models/metrics/transaction.model.js");
const Investment = require("../../models/metrics/investment.model.js");
const KYCDocument = require("../../models/metrics/kycDocument.model.js");
const bcrypt = require("bcrypt");

// Configuration for mock data generation
const MOCK_CONFIG = {
  users: 500,
  investors: 150,
  applications: 800,
  transactions: 2000,
  investments: 600,
  kycDocuments: 1200,
  dateRange: {
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    end: new Date()
  }
};

// Nigerian states for realistic data
const NIGERIAN_STATES = [
  'Lagos', 'Abuja', 'Kano', 'Kaduna', 'Rivers', 'Oyo', 'Ogun', 'Delta', 
  'Edo', 'Anambra', 'Imo', 'Enugu', 'Akwa Ibom', 'Cross River', 'Benue',
  'Niger', 'Bauchi', 'Borno', 'Yobe', 'Gombe', 'Adamawa', 'Taraba',
  'Plateau', 'Nasarawa', 'Kogi', 'Kwara', 'Ekiti', 'Ondo', 'Osun'
];

// Nigerian names for realistic data
const NIGERIAN_NAMES = {
  firstNames: [
    'Adebayo', 'Chukwu', 'Fatima', 'Ibrahim', 'Ngozi', 'Oluwaseun', 'Aisha', 
    'Emeka', 'Funke', 'Tunde', 'Zainab', 'Uche', 'Bola', 'Sani', 'Grace',
    'David', 'Mariam', 'Ahmed', 'Chioma', 'Kunle', 'Rashida', 'Peter', 'Amina'
  ],
  lastNames: [
    'Adebayo', 'Okonkwo', 'Mohammed', 'Okafor', 'Eze', 'Bello', 'Ogunleye',
    'Nwankwo', 'Yusuf', 'Okeke', 'Ibrahim', 'Obi', 'Umar', 'Eze', 'Suleiman',
    'Ojo', 'Nwosu', 'Garba', 'Adeleke', 'Olawale', 'Abubakar', 'Eze', 'Bakare'
  ]
};

// Helper functions
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max, decimals = 2) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};
const getRandomBoolean = (probability = 0.5) => Math.random() < probability;

// Generate mock users
const generateUsers = async (count) => {
  const users = [];
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  for (let i = 0; i < count; i++) {
    const firstName = getRandomElement(NIGERIAN_NAMES.firstNames);
    const lastName = getRandomElement(NIGERIAN_NAMES.lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    
    users.push({
      name,
      email,
      password: hashedPassword,
      createdAt: getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end),
      lastLoginAt: getRandomBoolean(0.7) ? 
        getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()) : null
    });
  }
  
  return users;
};

// Generate mock investors
const generateInvestors = async (userIds) => {
  const investors = [];
  const investorTypes = ['individual', 'institutional', 'corporate'];
  const riskProfiles = ['conservative', 'moderate', 'aggressive'];
  
  for (let i = 0; i < Math.min(MOCK_CONFIG.investors, userIds.length); i++) {
    const investorType = getRandomElement(investorTypes);
    const riskProfile = getRandomElement(riskProfiles);
    const totalInvested = getRandomFloat(100000, 5000000);
    const actualReturns = getRandomFloat(0, totalInvested * 0.15);
    
    investors.push({
      userId: userIds[i],
      investorType,
      totalInvested,
      availableFunds: getRandomFloat(50000, 1000000),
      expectedReturns: totalInvested * getRandomFloat(0.08, 0.20),
      actualReturns,
      riskProfile,
      investmentPreferences: {
        minAmount: getRandomFloat(50000, 200000),
        maxAmount: getRandomFloat(500000, 2000000),
        preferredRegions: [getRandomElement(NIGERIAN_STATES), getRandomElement(NIGERIAN_STATES)],
        preferredTerms: ['12 months', '24 months', '36 months']
      },
      verificationStatus: getRandomElement(['pending', 'verified', 'rejected']),
      verificationDocuments: generateVerificationDocuments(),
      bankAccounts: generateBankAccounts(),
      performance: {
        totalInvestments: getRandomInt(1, 20),
        activeInvestments: getRandomInt(0, 10),
        completedInvestments: getRandomInt(0, 15),
        averageROI: getRandomFloat(5, 25),
        onTimePaymentRate: getRandomFloat(70, 100),
        defaultRate: getRandomFloat(0, 10)
      },
      isActive: getRandomBoolean(0.85),
      joinedAt: getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end)
    });
  }
  
  return investors;
};

// Generate mock solar applications
const generateSolarApplications = async (userIds) => {
  const applications = [];
  const propertyTypes = ['residential', 'commercial', 'industrial'];
  const employmentStatuses = ['employed', 'self-employed', 'unemployed', 'retired'];
  const installationTypes = ['rooftop', 'ground-mount', 'hybrid'];
  const statuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'funded', 'installation_scheduled', 'installed', 'active', 'completed'];
  
  for (let i = 0; i < MOCK_CONFIG.applications; i++) {
    const userId = getRandomElement(userIds);
    const applicationStatus = getRandomElement(statuses);
    const submittedAt = applicationStatus !== 'draft' ? 
      getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end) : null;
    const reviewedAt = ['under_review', 'approved', 'rejected'].includes(applicationStatus) ? 
      getRandomDate(submittedAt || MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end) : null;
    const approvedAt = applicationStatus === 'approved' ? 
      getRandomDate(reviewedAt || MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end) : null;
    const fundedAt = ['funded', 'installation_scheduled', 'installed', 'active', 'completed'].includes(applicationStatus) ? 
      getRandomDate(approvedAt || MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end) : null;
    const installedAt = ['installed', 'active', 'completed'].includes(applicationStatus) ? 
      getRandomDate(fundedAt || MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end) : null;
    
    applications.push({
      userId,
      applicationId: `APP${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`,
      personalInfo: {
        fullName: `${getRandomElement(NIGERIAN_NAMES.firstNames)} ${getRandomElement(NIGERIAN_NAMES.lastNames)}`,
        phone: `+234${getRandomInt(8000000000, 9999999999)}`,
        address: `${getRandomInt(1, 999)} ${getRandomElement(['Main', 'Airport', 'Independence', 'Oba', 'Ahmadu'])} Road`,
        city: getRandomElement(['Lagos', 'Abuja', 'Kano', 'Port Harcourt', 'Ibadan']),
        state: getRandomElement(NIGERIAN_STATES),
        country: 'Nigeria'
      },
      propertyDetails: {
        propertyType: getRandomElement(propertyTypes),
        monthlyElectricityBill: getRandomFloat(5000, 50000),
        averageDailyConsumption: getRandomFloat(10, 100),
        appliances: generateAppliances()
      },
      financialInfo: {
        monthlyIncome: getRandomFloat(50000, 500000),
        employmentStatus: getRandomElement(employmentStatuses),
        creditScore: getRandomInt(300, 850),
        existingLoans: getRandomFloat(0, 100000)
      },
      systemRequirements: {
        estimatedCost: getRandomFloat(200000, 2000000),
        systemSize: getRandomFloat(2, 20),
        panelCount: getRandomInt(5, 50),
        batteryCapacity: getRandomFloat(5, 50),
        installationType: getRandomElement(installationTypes)
      },
      applicationStatus,
      kycStatus: getRandomElement(['not_started', 'pending', 'under_review', 'verified', 'rejected']),
      assignedInvestor: null, // Will be populated later
      fundingAmount: approvedAt ? getRandomFloat(200000, 2000000) : null,
      repaymentSchedule: approvedAt ? generateRepaymentSchedule(approvedAt) : [],
      aiScore: getRandomFloat(60, 95),
      aiRecommendations: generateAIRecommendations(),
      submittedAt,
      reviewedAt,
      approvedAt,
      fundedAt,
      installedAt
    });
  }
  
  return applications;
};

// Generate mock transactions
const generateTransactions = async (userIds, investorIds, applicationIds) => {
  const transactions = [];
  const types = ['investment', 'repayment', 'fee', 'refund', 'penalty'];
  const entities = ['investor', 'user', 'system'];
  const paymentMethods = ['bank_transfer', 'card', 'wallet', 'auto_debit'];
  const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
  
  for (let i = 0; i < MOCK_CONFIG.transactions; i++) {
    const type = getRandomElement(types);
    const status = getRandomElement(statuses);
    const createdAt = getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end);
    const processedAt = status !== 'pending' ? 
      getRandomDate(createdAt, MOCK_CONFIG.dateRange.end) : null;
    const completedAt = status === 'completed' ? 
      getRandomDate(processedAt || createdAt, MOCK_CONFIG.dateRange.end) : null;
    
    let fromEntity, toEntity, fromEntityId, toEntityId;
    
    if (type === 'investment') {
      fromEntity = 'investor';
      toEntity = 'user';
      fromEntityId = getRandomElement(investorIds);
      toEntityId = getRandomElement(userIds);
    } else if (type === 'repayment') {
      fromEntity = 'user';
      toEntity = 'investor';
      fromEntityId = getRandomElement(userIds);
      toEntityId = getRandomElement(investorIds);
    } else {
      fromEntity = 'user';
      toEntity = 'system';
      fromEntityId = getRandomElement(userIds);
      toEntityId = null;
    }
    
    transactions.push({
      transactionId: `TXN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(i + 1).padStart(6, '0')}`,
      type,
      fromEntity,
      toEntity,
      fromEntityId,
      toEntityId,
      amount: getRandomFloat(1000, 500000),
      currency: 'NGN',
      status,
      paymentMethod: getRandomElement(paymentMethods),
      paymentReference: `REF${Date.now()}${i}`,
      relatedApplication: type === 'investment' ? getRandomElement(applicationIds) : null,
      relatedInvestment: null, // Will be populated later
      fees: {
        processingFee: getRandomFloat(0, 5000),
        platformFee: getRandomFloat(0, 3000),
        transactionFee: getRandomFloat(0, 2000)
      },
      metadata: {
        source: 'web',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      processedAt,
      completedAt,
      failedAt: status === 'failed' ? getRandomDate(createdAt, MOCK_CONFIG.dateRange.end) : null,
      failureReason: status === 'failed' ? getRandomElement(['Insufficient funds', 'Invalid account', 'Bank error']) : null
    });
  }
  
  return transactions;
};

// Generate mock investments
const generateInvestments = async (investorIds, applicationIds) => {
  const investments = [];
  const statuses = ['pending', 'active', 'completed', 'defaulted', 'terminated'];
  
  for (let i = 0; i < MOCK_CONFIG.investments; i++) {
    const status = getRandomElement(statuses);
    const startDate = getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end);
    const term = getRandomInt(12, 36); // months
    const endDate = new Date(startDate.getTime() + term * 30 * 24 * 60 * 60 * 1000);
    const amount = getRandomFloat(100000, 1000000);
    const interestRate = getRandomFloat(8, 20);
    const expectedReturn = amount * (1 + (interestRate / 100) * (term / 12));
    const actualReturn = status === 'completed' ? 
      expectedReturn * getRandomFloat(0.95, 1.05) : getRandomFloat(0, expectedReturn * 0.8);
    
    investments.push({
      investmentId: `INV${new Date().getFullYear()}${String(i + 1).padStart(5, '0')}`,
      investorId: getRandomElement(investorIds),
      applicationId: getRandomElement(applicationIds),
      amount,
      expectedReturn,
      actualReturn,
      interestRate,
      term,
      startDate,
      endDate,
      status,
      repaymentSchedule: generateInvestmentRepaymentSchedule(startDate, endDate, amount, interestRate),
      riskAssessment: {
        creditScore: getRandomInt(300, 850),
        riskLevel: getRandomElement(['low', 'medium', 'high']),
        riskFactors: generateRiskFactors()
      },
      performance: {
        roi: ((actualReturn - amount) / amount) * 100,
        daysActive: status === 'completed' ? term * 30 : Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)),
        onTimePayments: getRandomInt(0, term),
        latePayments: getRandomInt(0, Math.floor(term * 0.2))
      }
    });
  }
  
  return investments;
};

// Generate mock KYC documents
const generateKYCDocuments = async (userIds, applicationIds) => {
  const documents = [];
  const documentTypes = ['government_id', 'utility_bill', 'bank_statement', 'proof_of_income', 'property_document'];
  const statuses = ['pending', 'under_review', 'verified', 'rejected'];
  
  for (let i = 0; i < MOCK_CONFIG.kycDocuments; i++) {
    const documentType = getRandomElement(documentTypes);
    const verificationStatus = getRandomElement(statuses);
    const uploadedAt = getRandomDate(MOCK_CONFIG.dateRange.start, MOCK_CONFIG.dateRange.end);
    const reviewedAt = verificationStatus !== 'pending' ? 
      getRandomDate(uploadedAt, MOCK_CONFIG.dateRange.end) : null;
    
    documents.push({
      userId: getRandomElement(userIds),
      applicationId: getRandomBoolean(0.6) ? getRandomElement(applicationIds) : null,
      documentType,
      documentUrl: `https://storage.example.com/documents/${documentType}_${i}.pdf`,
      documentNumber: documentType === 'government_id' ? 
        `${getRandomElement(['NIN', 'VIN', 'DL'])}${getRandomInt(1000000000, 9999999999)}` : null,
      issuingAuthority: documentType === 'government_id' ? 
        getRandomElement(['NIMC', 'FRSC', 'Immigration']) : null,
      issueDate: documentType === 'government_id' ? 
        getRandomDate(new Date(2010, 0, 1), new Date(2020, 0, 1)) : null,
      expiryDate: documentType === 'government_id' ? 
        getRandomDate(new Date(2025, 0, 1), new Date(2035, 0, 1)) : null,
      verificationStatus,
      verificationScore: getRandomFloat(60, 98),
      rejectionReason: verificationStatus === 'rejected' ? 
        getRandomElement(['Blurry document', 'Expired document', 'Invalid format', 'Information mismatch']) : null,
      reviewedBy: verificationStatus !== 'pending' ? getRandomElement(userIds) : null,
      reviewedAt,
      aiAnalysis: {
        authenticityScore: getRandomFloat(70, 99),
        extractedData: {
          name: `${getRandomElement(NIGERIAN_NAMES.firstNames)} ${getRandomElement(NIGERIAN_NAMES.lastNames)}`,
          dateOfBirth: getRandomDate(new Date(1960, 0, 1), new Date(2000, 0, 1)),
          documentNumber: `DOC${getRandomInt(1000000, 9999999)}`
        },
        flags: getRandomBoolean(0.2) ? [getRandomElement(['Low quality', 'Suspicious pattern', 'Manual review required'])] : []
      },
      uploadedAt
    });
  }
  
  return documents;
};

// Helper functions for generating nested data
const generateVerificationDocuments = () => {
  const types = ['government_id', 'proof_of_address', 'bank_statement'];
  return types.slice(0, getRandomInt(1, 3)).map(type => ({
    type,
    url: `https://storage.example.com/verification/${type}_${Date.now()}.pdf`,
    uploadedAt: new Date()
  }));
};

const generateBankAccounts = () => {
  const banks = ['GTBank', 'First Bank', 'Access Bank', 'Zenith Bank', 'UBA', 'Stanbic IBTC'];
  const count = getRandomInt(1, 3);
  const accounts = [];
  
  for (let i = 0; i < count; i++) {
    accounts.push({
      bankName: getRandomElement(banks),
      accountNumber: `0${getRandomInt(1000000000, 9999999999)}`,
      accountName: `${getRandomElement(NIGERIAN_NAMES.firstNames)} ${getRandomElement(NIGERIAN_NAMES.lastNames)}`,
      isDefault: i === 0
    });
  }
  
  return accounts;
};

const generateAppliances = () => {
  const applianceTypes = [
    { name: 'Refrigerator', wattage: 150, quantity: getRandomInt(1, 2) },
    { name: 'Television', wattage: 100, quantity: getRandomInt(1, 3) },
    { name: 'Air Conditioner', wattage: 1500, quantity: getRandomInt(1, 2) },
    { name: 'Washing Machine', wattage: 500, quantity: 1 },
    { name: 'Microwave', wattage: 800, quantity: 1 },
    { name: 'Electric Kettle', wattage: 1500, quantity: 1 }
  ];
  
  return applianceTypes.slice(0, getRandomInt(2, 5)).map(appliance => ({
    ...appliance,
    hoursPerDay: getRandomFloat(2, 12)
  }));
};

const generateRepaymentSchedule = (startDate) => {
  const schedule = [];
  const months = 24; // 2 years repayment period
  const monthlyAmount = getRandomFloat(10000, 50000);
  
  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(startDate.getTime() + i * 30 * 24 * 60 * 60 * 1000);
    const status = i <= 6 ? 'paid' : getRandomElement(['pending', 'paid', 'overdue']);
    
    schedule.push({
      dueDate,
      amount: monthlyAmount,
      status,
      paidDate: status === 'paid' ? getRandomDate(dueDate, new Date()) : null
    });
  }
  
  return schedule;
};

const generateAIRecommendations = () => {
  const recommendations = [
    'Consider increasing system size for higher energy output',
    'Battery backup recommended for area with frequent outages',
    'High-efficiency panels recommended for space constraints',
    'Consider energy-efficient appliances to reduce load',
    'Regular maintenance schedule recommended'
  ];
  
  return recommendations.slice(0, getRandomInt(1, 3));
};

const generateInvestmentRepaymentSchedule = (startDate, endDate, principal, interestRate) => {
  const schedule = [];
  const months = Math.floor((endDate - startDate) / (30 * 24 * 60 * 60 * 1000));
  const monthlyInterest = principal * (interestRate / 100) / 12;
  const monthlyPrincipal = principal / months;
  const monthlyPayment = monthlyPrincipal + monthlyInterest;
  
  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(startDate.getTime() + i * 30 * 24 * 60 * 60 * 1000);
    const status = getRandomElement(['pending', 'paid', 'overdue']);
    
    schedule.push({
      dueDate,
      amount: monthlyPayment,
      principal: monthlyPrincipal,
      interest: monthlyInterest,
      status,
      paidDate: status === 'paid' ? getRandomDate(dueDate, new Date()) : null,
      paidAmount: status === 'paid' ? monthlyPayment : 0
    });
  }
  
  return schedule;
};

const generateRiskFactors = () => {
  const factors = [
    'First-time borrower',
    'High debt-to-income ratio',
    'Limited credit history',
    'Seasonal income variation',
    'Industry sector risk'
  ];
  
  return factors.slice(0, getRandomInt(0, 2));
};

// Main function to generate all mock data
const generateMockData = async () => {
  try {
    console.log('Starting mock data generation...');
    
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Investor.deleteMany({}),
      SolarApplication.deleteMany({}),
      Transaction.deleteMany({}),
      Investment.deleteMany({}),
      KYCDocument.deleteMany({})
    ]);
    
    console.log('Cleared existing data');
    
    // Generate users
    const users = await generateUsers(MOCK_CONFIG.users);
    const savedUsers = await User.insertMany(users);
    const userIds = savedUsers.map(user => user._id);
    console.log(`Generated ${savedUsers.length} users`);
    
    // Generate investors
    const investors = await generateInvestors(userIds);
    const savedInvestors = await Investor.insertMany(investors);
    const investorIds = savedInvestors.map(investor => investor._id);
    console.log(`Generated ${savedInvestors.length} investors`);
    
    // Generate applications
    const applications = await generateSolarApplications(userIds);
    const savedApplications = await SolarApplication.insertMany(applications);
    const applicationIds = savedApplications.map(app => app._id);
    console.log(`Generated ${savedApplications.length} applications`);
    
    // Generate transactions
    const transactions = await generateTransactions(userIds, investorIds, applicationIds);
    const savedTransactions = await Transaction.insertMany(transactions);
    console.log(`Generated ${savedTransactions.length} transactions`);
    
    // Generate investments
    const investments = await generateInvestments(investorIds, applicationIds);
    const savedInvestments = await Investment.insertMany(investments);
    console.log(`Generated ${savedInvestments.length} investments`);
    
    // Generate KYC documents
    const kycDocuments = await generateKYCDocuments(userIds, applicationIds);
    const savedKYCDocuments = await KYCDocument.insertMany(kycDocuments);
    console.log(`Generated ${savedKYCDocuments.length} KYC documents`);
    
    // Update relationships
    await updateRelationships(savedApplications, savedInvestors, savedInvestments, savedTransactions);
    
    console.log('Mock data generation completed successfully!');
    
    return {
      users: savedUsers.length,
      investors: savedInvestors.length,
      applications: savedApplications.length,
      transactions: savedTransactions.length,
      investments: savedInvestments.length,
      kycDocuments: savedKYCDocuments.length
    };
    
  } catch (error) {
    console.error('Error generating mock data:', error);
    throw error;
  }
};

// Update relationships between entities
const updateRelationships = async (applications, investors, investments, transactions) => {
  // Assign investors to applications
  for (const app of applications) {
    if (app.applicationStatus === 'funded' || app.applicationStatus === 'installed') {
      const randomInvestor = getRandomElement(investors);
      await SolarApplication.findByIdAndUpdate(app._id, { 
        assignedInvestor: randomInvestor._id 
      });
    }
  }
  
  // Link transactions to investments
  for (const investment of investments) {
    const relatedTransactions = transactions.filter(txn => 
      txn.type === 'investment' && 
      txn.amount === investment.amount &&
      txn.fromEntityId.toString() === investment.investorId.toString()
    );
    
    if (relatedTransactions.length > 0) {
      await Investment.findByIdAndUpdate(investment._id, {
        relatedTransaction: relatedTransactions[0]._id
      });
    }
  }
};

// Function to generate specific data for testing
const generateTestUser = async () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: await bcrypt.hash('test123', 10),
    createdAt: new Date(),
    lastLoginAt: new Date()
  };
  
  return await User.create(testUser);
};

const generateTestInvestor = async (userId) => {
  const testInvestor = {
    userId,
    investorType: 'individual',
    totalInvested: 1000000,
    availableFunds: 500000,
    expectedReturns: 1200000,
    actualReturns: 150000,
    riskProfile: 'moderate',
    investmentPreferences: {
      minAmount: 100000,
      maxAmount: 1000000,
      preferredRegions: ['Lagos', 'Abuja'],
      preferredTerms: ['12 months', '24 months']
    },
    verificationStatus: 'verified',
    verificationDocuments: [],
    bankAccounts: [{
      bankName: 'Test Bank',
      accountNumber: '0123456789',
      accountName: 'Test User',
      isDefault: true
    }],
    performance: {
      totalInvestments: 5,
      activeInvestments: 2,
      completedInvestments: 3,
      averageROI: 15.5,
      onTimePaymentRate: 95.0,
      defaultRate: 0.0
    },
    isActive: true,
    joinedAt: new Date()
  };
  
  return await Investor.create(testInvestor);
};

module.exports = {
  generateMockData,
  generateTestUser,
  generateTestInvestor,
  MOCK_CONFIG
};