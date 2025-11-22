#!/usr/bin/env node

/**
 * Comprehensive test script for all backend endpoints
 * Tests user authentication, investor profile management, and KYC document management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:5000',
  timeout: 30000,
  endpoints: {
    // User Authentication & Registration
    auth: [
      { path: '/api/users', method: 'POST', requiresAuth: false, description: 'User registration' },
      { path: '/auth/signin', method: 'POST', requiresAuth: false, description: 'User login' },
      { path: '/auth/signout', method: 'GET', requiresAuth: true, description: 'User logout' },
      { path: '/forgot-password', method: 'POST', requiresAuth: false, description: 'Password reset request' },
      { path: '/reset-password/test-token', method: 'POST', requiresAuth: false, description: 'Password reset' }
    ],
    
    // Investor Profile Management
    investors: [
      { path: '/metrics/investors', method: 'POST', requiresAuth: true, description: 'Create investor' },
      { path: '/metrics/investors', method: 'GET', requiresAuth: true, description: 'List investors' },
      { path: '/metrics/investors/test-investor-id', method: 'GET', requiresAuth: true, description: 'Get investor details' },
      { path: '/metrics/investors/test-investor-id', method: 'PUT', requiresAuth: true, description: 'Update investor' }
    ],
    
    // KYC Document Management
    kyc: [
      { path: '/metrics/investors/test-investor-id/kyc', method: 'POST', requiresAuth: true, description: 'Upload KYC document' },
      { path: '/metrics/investors/test-investor-id/kyc', method: 'GET', requiresAuth: true, description: 'Get investor KYC documents' },
      { path: '/metrics/investors/test-investor-id/kyc/test-document-id/verify', method: 'PUT', requiresAuth: true, description: 'Verify KYC document' },
      { path: '/metrics/investors/test-investor-id/kyc/test-document-id/reject', method: 'PUT', requiresAuth: true, description: 'Reject KYC document' },
      { path: '/metrics/kyc', method: 'GET', requiresAuth: true, description: 'Get KYC metrics' },
      { path: '/metrics/kyc/list', method: 'GET', requiresAuth: true, description: 'List KYC documents' }
    ]
  }
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  performance: [],
  auth: {
    token: null,
    user: null
  }
};

// Helper function to make HTTP requests
async function makeRequest(endpoint, data = null, token = null, isFormData = false) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint.path}`;
  const startTime = Date.now();
  
  try {
    const headers = {};
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(TEST_CONFIG.timeout)
    };
    
    if (data) {
      if (isFormData) {
        options.body = data;
      } else {
        options.body = JSON.stringify(data);
      }
    }
    
    const response = await fetch(url, options);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { raw: await response.text() };
    }
    
    return {
      status: response.status,
      data: responseData,
      responseTime,
      success: response.ok,
      headers: response.headers
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      status: 0,
      error: error.message,
      responseTime: endTime - startTime,
      success: false
    };
  }
}

// Test authentication
async function authenticateUser() {
  console.log('\n🔐 Testing User Authentication Flow...');
  
  // First, register a test user
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    phone: '+1234567890'
  };
  
  console.log('📝 Registering test user...');
  const registerResult = await makeRequest(
    TEST_CONFIG.endpoints.auth[0], 
    testUser
  );
  
  if (registerResult.success) {
    console.log('✅ User registration successful');
  } else {
    console.log('⚠️  User registration failed (user might already exist)');
  }
  
  // Now try to sign in
  console.log('🔑 Signing in test user...');
  const loginResult = await makeRequest(
    TEST_CONFIG.endpoints.auth[1], 
    { email: testUser.email, password: testUser.password }
  );
  
  if (loginResult.success && loginResult.data.token) {
    testResults.auth.token = loginResult.data.token;
    testResults.auth.user = loginResult.data.user;
    console.log('✅ User login successful');
    return loginResult.data.token;
  } else {
    console.log('❌ User login failed');
    console.log('Response:', loginResult.data);
    return null;
  }
}

// Test a single endpoint
async function testEndpoint(endpoint, category, token = null) {
  console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path} (${endpoint.description})`);
  
  let testData = null;
  let isFormData = false;
  
  // Prepare test data based on endpoint
  if (endpoint.method === 'POST' && endpoint.path === '/api/users') {
    testData = {
      name: 'Test User ' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      phone: '+1234567890'
    };
  } else if (endpoint.method === 'POST' && endpoint.path === '/auth/signin') {
    testData = {
      email: 'test@example.com',
      password: 'password123'
    };
  } else if (endpoint.method === 'POST' && endpoint.path === '/forgot-password') {
    testData = {
      email: 'test@example.com'
    };
  } else if (endpoint.method === 'POST' && endpoint.path === '/reset-password/test-token') {
    testData = {
      password: 'newpassword123'
    };
  } else if (endpoint.method === 'POST' && endpoint.path.includes('/metrics/investors')) {
    testData = {
      firstName: 'Test',
      lastName: 'Investor',
      email: `investor${Date.now()}@example.com`,
      phone: '+1234567890',
      investorType: 'individual',
      riskProfile: 'moderate',
      investmentPreferences: {
        preferredRegions: ['North America', 'Europe'],
        investmentRange: { min: 1000, max: 50000 },
        preferredSectors: ['solar', 'renewable']
      }
    };
  } else if (endpoint.method === 'POST' && endpoint.path.includes('/kyc')) {
    // Create a mock file for KYC upload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const formData = `--${boundary}\r\nContent-Disposition: form-data; name="documentType"\r\n\r\npassport\r\n--${boundary}\r\nContent-Disposition: form-data; name="documentNumber"\r\n\r\nP123456789\r\n--${boundary}\r\nContent-Disposition: form-data; name="issuingAuthority"\r\n\r\nGovernment\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 mock content\r\n--${boundary}--\r\n`;
    
    testData = formData;
    isFormData = true;
  } else if (endpoint.method === 'PUT' && endpoint.path.includes('/verify')) {
    testData = {
      verificationScore: 95,
      notes: {
        comments: 'Document verified successfully',
        confidence: 'high'
      }
    };
  } else if (endpoint.method === 'PUT' && endpoint.path.includes('/reject')) {
    testData = {
      rejectionReason: 'Document quality is poor',
      notes: {
        comments: 'Please upload a clearer version',
        confidence: 'low'
      }
    };
  } else if (endpoint.method === 'PUT' && endpoint.path.includes('/metrics/investors/')) {
    testData = {
      firstName: 'Updated',
      lastName: 'Investor',
      riskProfile: 'conservative'
    };
  }
  
  const result = await makeRequest(endpoint, testData, token, isFormData);
  
  const testResult = {
    category,
    endpoint: endpoint.path,
    method: endpoint.method,
    description: endpoint.description,
    status: result.status,
    responseTime: result.responseTime,
    success: result.success,
    requiresAuth: endpoint.requiresAuth,
    error: result.error,
    data: result.data
  };
  
  if (result.success) {
    testResults.passed.push(testResult);
    console.log(`✅ PASSED - Status: ${result.status}, Time: ${result.responseTime}ms`);
    
    // Store performance data
    testResults.performance.push({
      endpoint: endpoint.path,
      responseTime: result.responseTime
    });
    
    // Store important IDs for subsequent tests
    if (endpoint.path === '/metrics/investors' && endpoint.method === 'POST' && result.data.data) {
      testResults.investorId = result.data.data._id || result.data.data.id;
    }
    
    return testResult;
  } else if (result.status === 401 && endpoint.requiresAuth) {
    testResults.skipped.push(testResult);
    console.log(`⏭️  SKIPPED - Authentication required (Status: ${result.status})`);
    return testResult;
  } else {
    testResults.failed.push(testResult);
    console.log(`❌ FAILED - Status: ${result.status}, Error: ${result.error || 'Unknown error'}`);
    if (result.data) {
      console.log('Response data:', JSON.stringify(result.data, null, 2));
    }
    return testResult;
  }
}

// Generate performance report
function generatePerformanceReport() {
  if (testResults.performance.length === 0) {
    return;
  }
  
  const times = testResults.performance.map(p => p.responseTime);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log('\n📊 Performance Report:');
  console.log(`   Average Response Time: ${avg.toFixed(2)}ms`);
  console.log(`   Min Response Time: ${min}ms`);
  console.log(`   Max Response Time: ${max}ms`);
  
  // Identify slow endpoints
  const slowThreshold = 1000; // 1 second
  const slowEndpoints = testResults.performance.filter(p => p.responseTime > slowThreshold);
  
  if (slowEndpoints.length > 0) {
    console.log(`\n⚠️  Slow Endpoints (>${slowThreshold}ms):`);
    slowEndpoints.forEach(endpoint => {
      console.log(`   ${endpoint.endpoint}: ${endpoint.responseTime}ms`);
    });
  }
}

// Generate summary report
function generateSummary() {
  const total = testResults.passed.length + testResults.failed.length + testResults.skipped.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⏭️  Skipped: ${testResults.skipped.length}`);
  console.log(`Success Rate: ${((testResults.passed.length / total) * 100).toFixed(2)}%`);
  
  // Category breakdown
  console.log('\n📈 Category Breakdown:');
  const categories = ['auth', 'investors', 'kyc'];
  categories.forEach(category => {
    const categoryPassed = testResults.passed.filter(t => t.category === category).length;
    const categoryFailed = testResults.failed.filter(t => t.category === category).length;
    const categorySkipped = testResults.skipped.filter(t => t.category === category).length;
    const categoryTotal = categoryPassed + categoryFailed + categorySkipped;
    
    console.log(`   ${category.toUpperCase()}:`);
    console.log(`     Total: ${categoryTotal}, Passed: ${categoryPassed}, Failed: ${categoryFailed}, Skipped: ${categorySkipped}`);
  });
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - Status: ${test.status}, Error: ${test.error || 'Unknown'}`);
    });
  }
  
  generatePerformanceReport();
  
  console.log('\n' + '='.repeat(60));
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Comprehensive Backend Endpoint Tests');
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  
  const totalEndpoints = Object.values(TEST_CONFIG.endpoints).flat().length;
  console.log(`Total Endpoints: ${totalEndpoints}`);
  
  // Check if server is running
  try {
    const healthCheck = await makeRequest({ 
      path: '/metrics/health', 
      method: 'GET', 
      requiresAuth: false 
    });
    if (!healthCheck.success) {
      console.error('❌ Server is not responding. Please ensure the server is running.');
      process.exit(1);
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Cannot connect to server:', error.message);
    console.log('💡 Make sure the backend server is running on', TEST_CONFIG.baseUrl);
    process.exit(1);
  }
  
  // Get authentication token
  const token = await authenticateUser();
  if (!token) {
    console.log('⚠️  Could not authenticate. Some tests will be skipped.');
  }
  
  // Test all endpoints by category
  for (const [category, endpoints] of Object.entries(TEST_CONFIG.endpoints)) {
    console.log(`\n🔍 Testing ${category.toUpperCase()} endpoints...`);
    
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint, category, token);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Generate summary
  generateSummary();
  
  // Exit with appropriate code
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});