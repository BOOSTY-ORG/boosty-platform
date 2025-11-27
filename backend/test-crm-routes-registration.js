import axios from 'axios';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:7000';
const TEST_TIMEOUT = 5000; // 5 seconds

// Test all CRM routes to ensure they're properly registered
const crmRouteTests = [
  {
    name: 'CRM Overview',
    endpoint: '/metrics/crm',
    description: 'Main CRM overview endpoint'
  },
  {
    name: 'CRM Health',
    endpoint: '/metrics/crm/health',
    description: 'CRM health check endpoint'
  },
  {
    name: 'CRM Metrics',
    endpoint: '/metrics/crm/metrics',
    description: 'Comprehensive CRM metrics endpoint'
  },
  {
    name: 'CRM Metrics Realtime',
    endpoint: '/metrics/crm/metrics/realtime',
    description: 'Real-time CRM metrics endpoint'
  },
  {
    name: 'CRM Communications',
    endpoint: '/metrics/crm/communications',
    description: 'CRM communications sub-route'
  },
  {
    name: 'CRM Contacts',
    endpoint: '/metrics/crm/contacts',
    description: 'CRM contacts sub-route'
  },
  {
    name: 'CRM Templates',
    endpoint: '/metrics/crm/templates',
    description: 'CRM templates sub-route'
  },
  {
    name: 'CRM Automations',
    endpoint: '/metrics/crm/automations',
    description: 'CRM automations sub-route'
  },
  {
    name: 'CRM Tickets',
    endpoint: '/metrics/crm/tickets',
    description: 'CRM tickets sub-route'
  },
  {
    name: 'CRM Threads',
    endpoint: '/metrics/crm/threads',
    description: 'CRM message threads sub-route'
  },
  {
    name: 'CRM Assignments',
    endpoint: '/metrics/crm/assignments',
    description: 'CRM assignment metrics sub-route'
  }
];

// Helper function to make HTTP requests
async function makeRequest(endpoint) {
  try {
    const response = await axios({
      method: 'GET',
      url: `${API_BASE_URL}${endpoint}`,
      timeout: TEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
        // No auth header to test auth requirement
      }
    });
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
}

// Test runner
async function runRouteTests() {
  console.log('🚀 Testing CRM Routes Registration\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Timeout: ${TEST_TIMEOUT}ms\n`);
  
  let passedTests = 0;
  let totalTests = crmRouteTests.length;
  
  for (const test of crmRouteTests) {
    console.log(`📋 Testing: ${test.name}`);
    console.log(`   Description: ${test.description}`);
    console.log(`   Endpoint: GET ${test.endpoint}`);
    
    const startTime = Date.now();
    const result = await makeRequest(test.endpoint);
    const endTime = Date.now();
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${endTime - startTime}ms`);
    
    // All routes should require authentication (401 status)
    if (result.status === 401 && result.error && result.error.error && result.error.error.code === 'AUTHENTICATION_REQUIRED') {
      console.log('   ✅ PASSED - Route is properly registered and requires authentication');
      passedTests++;
    } else if (result.status === 404) {
      console.log('   ❌ FAILED - Route not found (404)');
    } else {
      console.log(`   ❌ FAILED - Unexpected response: ${result.status}`);
      console.log(`   Error: ${JSON.stringify(result.error, null, 2)}`);
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 CRM Routes Registration Test Results:');
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All CRM routes are properly registered!');
    console.log('\n✅ Route Registration Summary:');
    console.log('   - Main metrics routes are mounted at /metrics');
    console.log('   - CRM routes are properly mounted at /metrics/crm');
    console.log('   - All CRM sub-routes are properly registered:');
    console.log('     • /metrics/crm/communications');
    console.log('     • /metrics/crm/contacts');
    console.log('     • /metrics/crm/templates');
    console.log('     • /metrics/crm/automations');
    console.log('     • /metrics/crm/tickets');
    console.log('     • /metrics/crm/threads');
    console.log('     • /metrics/crm/assignments');
    console.log('   - All routes properly require authentication');
    console.log('   - Authentication middleware is working correctly');
    console.log('   - Route hierarchy is properly structured');
    
    process.exit(0);
  } else {
    console.log('\n❌ Some CRM routes are not properly registered.');
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
runRouteTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});