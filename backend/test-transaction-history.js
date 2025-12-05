/**
 * Test file for Transaction History Endpoints
 * This file tests the new transaction history functionality
 */

import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000/api/metrics/transactions';

// Test data
const testCases = [
  {
    name: 'Get Transaction History',
    endpoint: '/history',
    method: 'GET',
    params: {
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  },
  {
    name: 'Get Transaction History with Filters',
    endpoint: '/history',
    method: 'GET',
    params: {
      page: 1,
      limit: 5,
      status: ['completed', 'pending'],
      type: ['investment', 'repayment'],
      dateRange: 'week',
      sortBy: 'amount',
      sortOrder: 'desc',
    },
  },
  {
    name: 'Get Transaction Timeline',
    endpoint: '/history/timeline',
    method: 'GET',
    params: {
      granularity: 'day',
      dateRange: 'week',
      includeMetrics: true,
    },
  },
  {
    name: 'Get Transaction Summary',
    endpoint: '/history/summary',
    method: 'GET',
    params: {
      dateRange: 'month',
    },
  },
  {
    name: 'Export Transaction History (CSV)',
    endpoint: '/history/export',
    method: 'GET',
    params: {
      format: 'csv',
      limit: 100,
      includeHeaders: true,
      dateRange: 'week',
    },
  },
];

/**
 * Run a single test case
 */
async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📡 Request: ${testCase.method} ${BASE_URL}${testCase.endpoint}`);

  try {
    const config = {
      method: testCase.method,
      url: `${BASE_URL}${testCase.endpoint}`,
      params: testCase.params,
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
    };

    const response = await axios(config);

    console.log(`✅ Success: ${response.status}`);
    console.log(`📊 Response structure:`, {
      hasData: !!response.data.data,
      hasPagination: !!response.data.pagination,
      hasSummary: !!response.data.summary,
      hasMeta: !!response.data.meta,
      dataLength: response.data.data?.length || 0,
    });

    if (response.data.data && response.data.data.length > 0) {
      console.log(`📄 Sample transaction:`, {
        id: response.data.data[0].id,
        transactionId: response.data.data[0].transactionId,
        type: response.data.data[0].type,
        status: response.data.data[0].status,
        amount: response.data.data[0].amount,
        formattedAmount: response.data.data[0].formattedAmount,
      });
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`📄 Error Response:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }
    return { success: false, error: error.message };
  }
}

/**
 * Run all test cases
 */
async function runAllTests() {
  console.log('🚀 Starting Transaction History API Tests\n');
  console.log('📍 Base URL:', BASE_URL);

  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({ ...testCase, ...result });
  }

  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('='.repeat(50));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📊 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`
  );

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter((r) => !r.success)
      .forEach((test) => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
  }

  console.log('\n🎉 Testing completed!');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/history`, { params: { page: 1, limit: 1 } });
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Please start the server before running tests');
    console.log('💡 Example: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const serverIsRunning = await checkServer();
  if (serverIsRunning) {
    await runAllTests();
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
main().catch(console.error);
