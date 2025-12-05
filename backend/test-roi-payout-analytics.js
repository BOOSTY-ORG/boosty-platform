/**
 * Test file for ROI and Payout Analytics endpoints
 * This file tests the newly implemented analytics services
 */

import mongoose from 'mongoose';

// Test configuration
const TEST_CONFIG = {
  mongodb: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty-platform-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  server: {
    port: process.env.PORT || 3000,
    host: 'localhost'
  }
};

// Sample test data
const sampleInvestment = {
  investmentId: 'INV20240001',
  investorId: '507f1f77bcf86cd799439011',
  applicationId: '507f1f77bcf86cd799439012',
  amount: 100000,
  expectedReturn: 125000,
  actualReturn: 0,
  interestRate: 15,
  term: 12,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  status: 'active',
  repaymentSchedule: [
    {
      dueDate: new Date('2024-02-01'),
      amount: 10417,
      principal: 8333,
      interest: 2084,
      status: 'pending'
    },
    {
      dueDate: new Date('2024-03-01'),
      amount: 10417,
      principal: 8333,
      interest: 2084,
      status: 'pending'
    }
  ],
  riskAssessment: {
    creditScore: 750,
    riskLevel: 'medium',
    riskFactors: ['new_investor', 'medium_term']
  },
  performance: {
    roi: 0,
    daysActive: 30,
    onTimePayments: 0,
    latePayments: 0
  }
};

const samplePayouts = [
  {
    payoutId: 'PAY202401001',
    type: 'roi_payment',
    amount: 5000,
    currency: 'NGN',
    status: 'completed',
    recipientId: '507f1f77bcf86cd799439011',
    recipientType: 'investor',
    recipientEmail: 'investor@example.com',
    recipientAccount: {
      accountNumber: '1234567890',
      bankCode: '057',
      bankName: 'Zenith Bank',
      accountName: 'John Doe'
    },
    relatedInvestment: '507f1f77bcf86cd799439013',
    gatewayReference: 'PAYSTACK_REF_001',
    gatewayTransferId: 'TRANSFER_001',
    gatewayRecipientCode: 'RCP_001',
    scheduledFor: new Date('2024-01-15'),
    processedAt: new Date('2024-01-15T10:00:00Z'),
    completedAt: new Date('2024-01-15T10:05:00Z'),
    calculationBasis: {
      investmentAmount: 100000,
      investmentPeriod: 12,
      interestRate: 15,
      roiPercentage: 5,
      profitAmount: 5000,
      bonusAmount: 0,
      penaltyAmount: 0
    },
    fees: {
      processingFee: 50,
      transferFee: 100,
      taxWithheld: 0,
      platformFee: 25
    },
    approvalStatus: 'approved',
    approvedBy: '507f1f77bcf86cd799439014',
    approvedAt: new Date('2024-01-15T09:00:00Z'),
    kycVerified: true,
    complianceChecked: true,
    verifiedAt: new Date('2024-01-14T16:00:00Z'),
    notificationSent: true,
    notificationMethod: 'email',
    notifiedAt: new Date('2024-01-15T11:00:00Z'),
    description: 'Monthly ROI payment for solar investment',
    metadata: {
      source: 'automated_calculation',
      batchId: null
    },
    tags: ['roi', 'monthly', 'solar'],
    priority: 'normal',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    processedBy: '507f1f77bcf86cd799439014'
  },
  {
    payoutId: 'PAY202401002',
    type: 'profit_sharing',
    amount: 2500,
    currency: 'NGN',
    status: 'processing',
    recipientId: '507f1f77bcf86cd799439011',
    recipientType: 'investor',
    recipientEmail: 'investor@example.com',
    scheduledFor: new Date('2024-02-15'),
    processedAt: new Date('2024-02-15T14:00:00Z'),
    calculationBasis: {
      investmentAmount: 100000,
      investmentPeriod: 12,
      profitSharingRate: 2.5,
      profitAmount: 2500
    },
    fees: {
      processingFee: 25,
      transferFee: 50,
      taxWithheld: 125,
      platformFee: 12.5
    },
    approvalStatus: 'approved',
    approvedBy: '507f1f77bcf86cd799439014',
    approvedAt: new Date('2024-02-14T16:00:00Z'),
    kycVerified: true,
    complianceChecked: true,
    description: 'Quarterly profit sharing distribution'
  }
];

// Test functions
async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(TEST_CONFIG.mongodb.url, TEST_CONFIG.mongodb.options);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function testROIAnalyticsService() {
  console.log('\n=== Testing ROI Analytics Service ===');
  
  try {
    const ROIAnalyticsService = await import('./src/services/payment/roiAnalytics.service.js');
    const roiService = new ROIAnalyticsService.default();
    
    // Test 1: Calculate investment ROI
    console.log('\n1. Testing calculateInvestmentROI...');
    const investmentROI = await roiService.calculateInvestmentROI('INV20240001');
    console.log('✅ Investment ROI calculated:', {
      investmentId: investmentROI.investmentId,
      roiPercentage: investmentROI.roiPercentage,
      annualizedROI: investmentROI.annualizedROI,
      riskAdjustedROI: investmentROI.riskAdjustedROI
    });
    
    // Test 2: Calculate portfolio ROI
    console.log('\n2. Testing calculatePortfolioROI...');
    const portfolioROI = await roiService.calculatePortfolioROI('507f1f77bcf86cd799439011');
    console.log('✅ Portfolio ROI calculated:', {
      totalInvestments: portfolioROI.totalInvestments,
      portfolioROI: portfolioROI.portfolioROI,
      annualizedPortfolioROI: portfolioROI.annualizedPortfolioROI
    });
    
    // Test 3: Get ROI performance tracking
    console.log('\n3. Testing getROIPerformanceTracking...');
    const performanceTracking = await roiService.getROIPerformanceTracking('507f1f77bcf86cd799439011', {
      period: 'monthly'
    });
    console.log('✅ ROI performance tracking retrieved:', {
      dataPoints: performanceTracking.performanceData.length,
      trend: performanceTracking.trends?.direction
    });
    
    // Test 4: Generate ROI projections
    console.log('\n4. Testing generateROIProjections...');
    const projections = await roiService.generateROIProjections('507f1f77bcf86cd799439011', {
      forecastPeriod: 6,
      scenario: 'moderate'
    });
    console.log('✅ ROI projections generated:', {
      projectedPortfolioROI: projections.projectedPortfolioROI,
      currentActiveInvestments: projections.currentActiveInvestments
    });
    
    // Test 5: Calculate risk-adjusted ROI
    console.log('\n5. Testing calculateRiskAdjustedROI...');
    const riskAdjustedROI = await roiService.calculateRiskAdjustedROI('INV20240001', null, {
      riskModel: 'standard'
    });
    console.log('✅ Risk-adjusted ROI calculated:', {
      investmentsCount: riskAdjustedROI.investments.length,
      averageRiskAdjustedROI: riskAdjustedROI.aggregatedMetrics?.averageRiskAdjustedROI
    });
    
    console.log('\n✅ ROI Analytics Service tests completed successfully');
    
  } catch (error) {
    console.error('❌ ROI Analytics Service test failed:', error.message);
  }
}

async function testPayoutAnalyticsService() {
  console.log('\n=== Testing Payout Analytics Service ===');
  
  try {
    const PayoutAnalyticsService = await import('./src/services/payment/payoutAnalytics.service.js');
    const payoutService = new PayoutAnalyticsService.default();
    
    // Test 1: Get comprehensive payout analytics
    console.log('\n1. Testing getPayoutAnalytics...');
    const analytics = await payoutService.getPayoutAnalytics({
      period: 'monthly',
      includeProjections: true
    });
    console.log('✅ Payout analytics retrieved:', {
      totalPayouts: analytics.summary.totalPayouts,
      totalAmount: analytics.summary.totalAmount,
      successRate: analytics.summary.successRate
    });
    
    // Test 2: Get payout distribution analysis
    console.log('\n2. Testing getPayoutDistributionAnalysis...');
    const distribution = await payoutService.getPayoutDistributionAnalysis({
      groupBy: 'type',
      includePercentiles: true,
      includeOutliers: true
    });
    console.log('✅ Payout distribution analysis completed:', {
      distributionCount: distribution.distributions.length,
      totalPayouts: distribution.summary.totalPayouts
    });
    
    // Test 3: Get payout efficiency analysis
    console.log('\n3. Testing getPayoutEfficiencyAnalysis...');
    const efficiency = await payoutService.getPayoutEfficiencyAnalysis({
      benchmarkPeriod: '30d',
      includeRecommendations: true
    });
    console.log('✅ Payout efficiency analysis completed:', {
      successRate: efficiency.efficiency.successRate,
      averageProcessingTime: efficiency.processing.averageProcessingTime,
      recommendationsCount: efficiency.recommendations?.length
    });
    
    // Test 4: Get payout forecasting
    console.log('\n4. Testing getPayoutForecasting...');
    const forecast = await payoutService.getPayoutForecasting({
      forecastPeriod: 30,
      confidenceLevel: 0.95,
      scenario: 'baseline'
    });
    console.log('✅ Payout forecasting completed:', {
      forecastedAmount: forecast.forecasts.totalAmount,
      confidenceLevel: forecast.confidenceLevel
    });
    
    // Test 5: Get payout optimization recommendations
    console.log('\n5. Testing getPayoutOptimizationRecommendations...');
    const optimization = await payoutService.getPayoutOptimizationRecommendations({
      analysisPeriod: 30,
      impactThreshold: 0.05
    });
    console.log('✅ Payout optimization recommendations completed:', {
      opportunitiesCount: optimization.opportunities.length,
      potentialSavings: optimization.impactAnalysis.totalPotentialSavings
    });
    
    console.log('\n✅ Payout Analytics Service tests completed successfully');
    
  } catch (error) {
    console.error('❌ Payout Analytics Service test failed:', error.message);
  }
}

async function testAPIEndpoints() {
  console.log('\n=== Testing API Endpoints ===');
  
  const baseURL = `http://${TEST_CONFIG.server.host}:${TEST_CONFIG.server.port}`;
  
  // Test ROI Analytics endpoints
  const roiEndpoints = [
    '/api/roi-analytics/investments/INV20240001',
    '/api/roi-analytics/portfolio/507f1f77bcf86cd799439011',
    '/api/roi-analytics/performance/507f1f77bcf86cd799439011',
    '/api/roi-analytics/projections/507f1f77bcf86cd799439011',
    '/api/roi-analytics/risk-adjusted/INV20240001',
    '/api/roi-analytics/dashboard/507f1f77bcf86cd799439011',
    '/api/roi-analytics/insights/507f1f77bcf86cd799439011'
  ];
  
  console.log('\nTesting ROI Analytics endpoints...');
  for (const endpoint of roiEndpoints) {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - ${response.status}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
  
  // Test Payout Analytics endpoints
  const payoutEndpoints = [
    '/api/payout-analytics/analytics',
    '/api/payout-analytics/distribution',
    '/api/payout-analytics/efficiency',
    '/api/payout-analytics/forecasting',
    '/api/payout-analytics/compliance',
    '/api/payout-analytics/optimization',
    '/api/payout-analytics/dashboard',
    '/api/payout-analytics/insights',
    '/api/payout-analytics/recipients/507f1f77bcf86cd799439011'
  ];
  
  console.log('\nTesting Payout Analytics endpoints...');
  for (const endpoint of payoutEndpoints) {
    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${endpoint} - ${response.status}`);
      } else {
        console.log(`❌ ${endpoint} - ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting ROI and Payout Analytics Tests');
  console.log('==========================================');
  
  // Connect to database
  await connectToDatabase();
  
  // Test services
  await testROIAnalyticsService();
  await testPayoutAnalyticsService();
  
  // Test API endpoints (if server is running)
  if (process.argv.includes('--api')) {
    await testAPIEndpoints();
  }
  
  console.log('\n✅ All tests completed!');
  
  // Close database connection
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

export {
  runTests,
  sampleInvestment,
  samplePayouts,
  TEST_CONFIG
};