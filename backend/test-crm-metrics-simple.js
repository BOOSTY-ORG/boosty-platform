import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from './src/models/user.model.js';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:7000';
const TEST_TIMEOUT = 30000; // 30 seconds

// Generate a test JWT token
async function generateTestToken() {
  try {
    // Find or create a test user
    let testUser = await User.findOne({ role: 'manager' });

    if (!testUser) {
      // Create a test user if none exists
      testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        role: 'manager',
        password: 'testpassword123',
      });
      await testUser.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: testUser._id,
        email: testUser.email,
        role: testUser.role,
      },
      process.env.JWT_SECRET || 'fallback-secret-for-testing',
      { expiresIn: '1h' }
    );

    return token;
  } catch (error) {
    console.error('Error generating test token:', error.message);
    // Return a fallback mock token for testing
    return 'mock-jwt-token-for-testing-only';
  }
}

// Test data
const testCases = [
  {
    name: 'Comprehensive CRM Metrics',
    endpoint: '/metrics/crm/metrics',
    method: 'GET',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      includePagination: 'true',
    },
  },
  {
    name: 'CRM Metrics by Category - Contacts',
    endpoint: '/metrics/crm/metrics/contacts',
    method: 'GET',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  },
  {
    name: 'CRM Metrics by Category - Communications',
    endpoint: '/metrics/crm/metrics/communications',
    method: 'GET',
    params: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  },
  {
    name: 'Real-time CRM Metrics',
    endpoint: '/metrics/crm/metrics/realtime',
    method: 'GET',
    params: {},
  },
  {
    name: 'Invalid Category Test',
    endpoint: '/metrics/crm/metrics/invalid',
    method: 'GET',
    params: {},
    expectedStatus: 400,
  },
];

// Helper function to make HTTP requests
async function makeRequest(config, authToken) {
  try {
    const response = await axios({
      method: config.method,
      url: `${API_BASE_URL}${config.endpoint}`,
      params: config.params,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime: response.headers['x-response-time'] || 'N/A',
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
      responseTime: error.response?.headers?.['x-response-time'] || 'N/A',
    };
  }
}

// Test runner
async function runTests() {
  console.log('🚀 Starting CRM Metrics Endpoint Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Timeout: ${TEST_TIMEOUT}ms\n`);

  // Generate test token
  const authToken = await generateTestToken();
  console.log(`🔑 Using test token: ${authToken.substring(0, 20)}...\n`);

  let passedTests = 0;
  const totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`   Endpoint: ${testCase.method} ${testCase.endpoint}`);
    console.log(`   Params: ${JSON.stringify(testCase.params, null, 2)}`);

    const startTime = Date.now();
    const result = await makeRequest(testCase, authToken);
    const endTime = Date.now();

    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${endTime - startTime}ms`);

    if (result.success) {
      console.log('   ✅ PASSED');

      // Validate response structure
      if (result.data.success && result.data.data) {
        console.log('   ✅ Valid response structure');

        // Check for specific data based on endpoint
        if (
          testCase.endpoint.includes('/metrics/crm/metrics') &&
          !testCase.endpoint.includes('/realtime')
        ) {
          const data = result.data.data;

          if (testCase.endpoint.includes('/metrics/')) {
            // Category-specific endpoint
            console.log(
              `   📊 Category data keys: ${Object.keys(data).join(', ')}`
            );
          } else {
            // Comprehensive metrics endpoint
            const expectedKeys = [
              'summary',
              'breakdowns',
              'trends',
              'performance',
              'alerts',
              'filters',
            ];
            const actualKeys = Object.keys(data);

            const missingKeys = expectedKeys.filter(
              (key) => !actualKeys.includes(key)
            );
            if (missingKeys.length === 0) {
              console.log('   ✅ All expected data sections present');
            } else {
              console.log(
                `   ⚠️  Missing data sections: ${missingKeys.join(', ')}`
              );
            }

            // Check summary data
            if (data.summary) {
              const summaryKeys = Object.keys(data.summary);
              console.log(`   📈 Summary metrics: ${summaryKeys.length} keys`);

              // Verify key metrics are present
              const keyMetrics = [
                'totalContacts',
                'totalCommunications',
                'totalAssignments',
                'totalMessages',
                'totalTemplates',
                'totalAutomations',
              ];

              const presentKeyMetrics = keyMetrics.filter(
                (metric) =>
                  summaryKeys.includes(metric) && data.summary[metric] >= 0
              );

              if (presentKeyMetrics.length === keyMetrics.length) {
                console.log('   ✅ All key metrics present and valid');
              } else {
                console.log(
                  `   ⚠️  Missing key metrics: ${keyMetrics.filter((m) => !presentKeyMetrics.includes(m)).join(', ')}`
                );
              }
            }

            // Check breakdowns data
            if (data.breakdowns) {
              const breakdownKeys = Object.keys(data.breakdowns);
              console.log(
                `   📊 Breakdown categories: ${breakdownKeys.join(', ')}`
              );
            }
          }
        } else {
          console.log('   ⚠️  Invalid response structure');
        }
      }

      passedTests++;
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);

      // Check if this was expected to fail
      if (
        testCase.expectedStatus &&
        result.status === testCase.expectedStatus
      ) {
        console.log('   ✅ Expected failure status');
        passedTests++;
      }
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(
    `   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed.');
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run tests
runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
