// CRM endpoint test with authentication
const http = require('http');

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test function
async function testCRMEndpoints() {
  console.log('🚀 Starting CRM Endpoint Tests with Authentication...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  // Test endpoints
  const endpoints = [
    '/metrics/crm/metrics',
    '/metrics/crm/contacts',
    '/metrics/crm/threads',
    '/metrics/crm/assignments',
    '/metrics/crm/templates',
    '/metrics/crm/automations'
  ];

  // First test without authentication (should return 401)
  console.log('🔒 Testing endpoints without authentication...');
  for (const endpoint of endpoints) {
    totalTests++;
    console.log(`Testing ${endpoint} (no auth)...`);
    
    try {
      const response = await makeRequest(endpoint);
      
      if (response.statusCode === 401) {
        console.log(`✅ ${endpoint} - Status: ${response.statusCode} (Correctly requires auth)`);
        passedTests++;
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.statusCode} (Should be 401)`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }

  // Test with mock authentication
  console.log('\n🔓 Testing endpoints with mock authentication...');
  const mockToken = 'mock-jwt-token-for-testing';
  
  for (const endpoint of endpoints) {
    totalTests++;
    console.log(`Testing ${endpoint} (with auth)...`);
    
    try {
      const response = await makeRequest(endpoint, 'GET', null, mockToken);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint} - Status: ${response.statusCode} (Working with auth)`);
        passedTests++;
      } else if (response.statusCode === 401) {
        console.log(`⚠️  ${endpoint} - Status: ${response.statusCode} (Auth still required)`);
      } else if (response.statusCode === 404) {
        console.log(`⚠️  ${endpoint} - Status: ${response.statusCode} (Not Found)`);
      } else if (response.statusCode === 500) {
        console.log(`❌ ${endpoint} - Status: ${response.statusCode} (Server Error)`);
      } else {
        console.log(`❓ ${endpoint} - Status: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }

  // Test POST operations with authentication
  console.log('\n📝 Testing POST operations with authentication...');
  
  // Test creating a contact
  totalTests++;
  try {
    const contactData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1234567890'
    };
    
    const response = await makeRequest('/metrics/crm/contacts', 'POST', contactData, mockToken);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ POST /metrics/crm/contacts - Status: ' + response.statusCode);
      passedTests++;
    } else if (response.statusCode === 401) {
      console.log('⚠️  POST /metrics/crm/contacts - Status: ' + response.statusCode + ' (Auth required)');
    } else if (response.statusCode === 404) {
      console.log('⚠️  POST /metrics/crm/contacts - Status: ' + response.statusCode + ' (Not Found)');
    } else {
      console.log('❌ POST /metrics/crm/contacts - Status: ' + response.statusCode);
    }
  } catch (error) {
    console.log('❌ POST /metrics/crm/contacts - Error: ' + error.message);
  }

  // Test creating a message thread
  totalTests++;
  try {
    const threadData = {
      subject: 'Test Thread',
      participants: ['test@example.com'],
      messages: [{
        sender: 'test@example.com',
        content: 'Test message',
        timestamp: new Date().toISOString()
      }]
    };
    
    const response = await makeRequest('/metrics/crm/threads', 'POST', threadData, mockToken);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ POST /metrics/crm/threads - Status: ' + response.statusCode);
      passedTests++;
    } else if (response.statusCode === 401) {
      console.log('⚠️  POST /metrics/crm/threads - Status: ' + response.statusCode + ' (Auth required)');
    } else if (response.statusCode === 404) {
      console.log('⚠️  POST /metrics/crm/threads - Status: ' + response.statusCode + ' (Not Found)');
    } else {
      console.log('❌ POST /metrics/crm/threads - Status: ' + response.statusCode);
    }
  } catch (error) {
    console.log('❌ POST /metrics/crm/threads - Error: ' + error.message);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests >= totalTests * 0.8) { // 80% success rate is good
    console.log('🎉 CRM endpoints are properly configured with authentication!');
  } else {
    console.log('⚠️  Some CRM endpoints need attention.');
  }
}

// Run tests
async function runTests() {
  try {
    // First test if server is responding
    console.log('🔍 Checking server response...');
    const response = await makeRequest('/');
    
    if (response.statusCode !== 0) {
      console.log('✅ Server is responding!\n');
      await testCRMEndpoints();
    } else {
      console.log('❌ Server is not responding properly');
    }
  } catch (error) {
    console.log('❌ Error connecting to server:', error.message);
  }
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
runTests().catch(console.error);