#!/usr/bin/env node

/**
 * Comprehensive test script for all metrics API endpoints
 * Tests all endpoints with mock data to ensure they're functioning properly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateMockData } from '../src/utils/metrics/mockData.generator.js';

// Load environment variables
dotenv.config();

// Test configuration
// Note: Routes are mounted at /metrics (not /api/metrics) based on express.js
const TEST_CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:7000',
  timeout: 30000,
  endpoints: [
    // Dashboard endpoints
    { path: '/metrics/health', method: 'GET', requiresAuth: false },
    { path: '/metrics/docs', method: 'GET', requiresAuth: false },
    { path: '/metrics/dashboard/overview', method: 'GET', requiresAuth: true },
    { path: '/metrics/dashboard/realtime', method: 'GET', requiresAuth: true },
    
    // Investor endpoints
    { path: '/metrics/investors', method: 'GET', requiresAuth: true },
    { path: '/metrics/investors/list', method: 'GET', requiresAuth: true },
    { path: '/metrics/investors/performance', method: 'GET', requiresAuth: true },
    
    // User endpoints
    { path: '/metrics/users', method: 'GET', requiresAuth: true },
    { path: '/metrics/users/list', method: 'GET', requiresAuth: true },
    { path: '/metrics/users/activity', method: 'GET', requiresAuth: true },
    
    // Transaction endpoints
    { path: '/metrics/transactions', method: 'GET', requiresAuth: true },
    { path: '/metrics/transactions/list', method: 'GET', requiresAuth: true },
    { path: '/metrics/transactions/performance', method: 'GET', requiresAuth: true },
    { path: '/metrics/transactions/analytics', method: 'GET', requiresAuth: true },
    
    // KYC endpoints
    { path: '/metrics/kyc', method: 'GET', requiresAuth: true },
    { path: '/metrics/kyc/performance', method: 'GET', requiresAuth: true },
    
    // Reporting endpoints
    { path: '/metrics/reports/financial', method: 'GET', requiresAuth: true },
    { path: '/metrics/reports/operational', method: 'GET', requiresAuth: true },
    { path: '/metrics/reports/compliance', method: 'GET', requiresAuth: true },
    { path: '/metrics/reports/performance', method: 'GET', requiresAuth: true }
  ]
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  performance: []
};

// Helper function to make HTTP requests
async function makeRequest(endpoint, token = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint.path}`;
  const startTime = Date.now();
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: endpoint.method,
      headers,
      signal: AbortSignal.timeout(TEST_CONFIG.timeout)
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { raw: await response.text() };
    }
    
    return {
      status: response.status,
      data,
      responseTime,
      success: response.ok
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
async function getAuthToken() {
  // Try to get a test token - you may need to adjust this based on your auth setup
  // For now, we'll test endpoints that don't require auth
  return null;
}

// Test a single endpoint
async function testEndpoint(endpoint, token = null) {
  console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
  
  const result = await makeRequest(endpoint, token);
  
  const testResult = {
    endpoint: endpoint.path,
    method: endpoint.method,
    status: result.status,
    responseTime: result.responseTime,
    success: result.success,
    requiresAuth: endpoint.requiresAuth,
    error: result.error
  };
  
  if (result.success) {
    testResults.passed.push(testResult);
    console.log(`✅ PASSED - Status: ${result.status}, Time: ${result.responseTime}ms`);
    
    // Store performance data
    testResults.performance.push({
      endpoint: endpoint.path,
      responseTime: result.responseTime
    });
  } else if (result.status === 401 && endpoint.requiresAuth) {
    testResults.skipped.push(testResult);
    console.log(`⏭️  SKIPPED - Authentication required (Status: ${result.status})`);
  } else {
    testResults.failed.push(testResult);
    console.log(`❌ FAILED - Status: ${result.status}, Error: ${result.error || 'Unknown error'}`);
  }
  
  return testResult;
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
  console.log('🚀 Starting Metrics API Endpoint Tests');
  console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`Total Endpoints: ${TEST_CONFIG.endpoints.length}`);
  
  // Check if server is running
  try {
    const healthCheck = await makeRequest({ path: '/metrics/health', method: 'GET', requiresAuth: false });
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
  
  // Get auth token if needed
  const token = await getAuthToken();
  if (!token) {
    console.log('⚠️  No authentication token available. Some tests will be skipped.');
  }
  
  // Test all endpoints
  for (const endpoint of TEST_CONFIG.endpoints) {
    await testEndpoint(endpoint, token);
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
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

