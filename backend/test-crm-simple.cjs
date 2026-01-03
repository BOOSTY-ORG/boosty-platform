// Simple CRM endpoint test without Jest
const http = require('http');
const { MongoClient } = require('mongodb');

// Test configuration
const config = {
  serverUrl: 'http://localhost:7000',
  testTimeout: 5000,
  endpoints: [
    '/metrics/crm/metrics',
    '/metrics/crm/contacts',
    '/metrics/crm/threads',
    '/metrics/crm/assignments',
    '/metrics/crm/templates',
    '/metrics/crm/automations'
  ]
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    };

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
          reject(error);
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
  console.log('🚀 Starting CRM Endpoint Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;

  // Test each endpoint
  for (const endpoint of config.endpoints) {
    totalTests++;
    console.log(`Testing ${endpoint}...`);
    
    try {
      const response = await makeRequest(endpoint);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${endpoint} - Status: ${response.statusCode}`);
        passedTests++;
      } else if (response.statusCode === 404) {
        console.log(`⚠️  ${endpoint} - Status: ${response.statusCode} (Not Found)`);
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }

  // Test POST operations
  console.log('\n📝 Testing POST operations...');
  
  // Test creating a contact
  totalTests++;
  try {
    const contactData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1234567890'
    };
    
    const response = await makeRequest('/metrics/crm/contacts', 'POST', contactData);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ POST /metrics/crm/contacts - Status: ' + response.statusCode);
      passedTests++;
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
    
    const response = await makeRequest('/metrics/crm/threads', 'POST', threadData);
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('✅ POST /metrics/crm/threads - Status: ' + response.statusCode);
      passedTests++;
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
  
  if (passedTests === totalTests) {
    console.log('🎉 All CRM endpoints are working correctly!');
  } else {
    console.log('⚠️  Some CRM endpoints need attention.');
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await makeRequest('/');
    return response.statusCode !== 0;
  } catch (error) {
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running. Please start the server with: npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is running!\n');
  await testCRMEndpoints();
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run the tests
runTests().catch(console.error);