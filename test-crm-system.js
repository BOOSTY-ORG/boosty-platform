/**
 * CRM System End-to-End Test Script
 * 
 * This script performs comprehensive testing of the entire CRM system
 * from frontend API calls through backend to database.
 * 
 * Usage: node test-crm-system.js [options]
 * Options:
 *   --verbose     Enable verbose logging
 *   --skip-auth   Skip authentication tests
 *   --skip-perf   Skip performance tests
 *   --report      Generate detailed test report
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:7000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  performance: {},
  coverage: {},
  startTime: null,
  endTime: null
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  skipAuth: args.includes('--skip-auth'),
  skipPerf: args.includes('--skip-perf'),
  report: args.includes('--report')
};

// Utility functions
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (options.verbose || level === 'success' || level === 'error') {
    console.log(`${prefix} ${message}`);
  }
}

function logSuccess(message) {
  log(message, 'success');
}

function logError(message) {
  log(message, 'error');
  testResults.errors.push(message);
}

function logVerbose(message) {
  if (options.verbose) {
    log(message, 'verbose');
  }
}

async function makeRequest(url, options = {}) {
  const fetch = require('node-fetch');
  const defaultOptions = {
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const requestOptions = { ...defaultOptions, ...options };
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      logVerbose(`Making request to ${url} (attempt ${attempt})`);
      const response = await fetch(`${config.backendUrl}${url}`, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logVerbose(`Request failed (attempt ${attempt}): ${error.message}`);
      
      if (attempt === config.retryAttempts) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
}

async function runTest(testName, testFunction) {
  testResults.total++;
  log(`Running test: ${testName}`);
  
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    testResults.performance[testName] = duration;
    testResults.passed++;
    
    logSuccess(`✓ ${testName} (${duration}ms)`);
    return result;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    testResults.performance[testName] = duration;
    testResults.failed++;
    
    logError(`✗ ${testName} (${duration}ms): ${error.message}`);
    throw error;
  }
}

// Authentication tests
async function testAuthentication() {
  if (options.skipAuth) {
    log('Skipping authentication tests');
    return;
  }

  await runTest('Authentication - Login', async () => {
    const loginData = {
      email: 'admin@boosty.com',
      password: 'admin123'
    };
    
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    if (!response.success) {
      throw new Error('Login failed');
    }
    
    return response.data.token;
  });

  await runTest('Authentication - Token Validation', async () => {
    const token = 'test-token';
    
    const response = await makeRequest('/api/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.success) {
      throw new Error('Token validation failed');
    }
    
    return response.data;
  });
}

// CRM Overview tests
async function testCRMOverview() {
  await runTest('CRM Overview - Get Overview', async () => {
    const response = await makeRequest('/api/metrics/crm', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get CRM overview');
    }
    
    const requiredFields = ['summary', 'modules'];
    for (const field of requiredFields) {
      if (!response.data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return response.data;
  });

  await runTest('CRM Overview - Health Check', async () => {
    const response = await makeRequest('/api/metrics/crm/health');
    
    if (response.status !== 'healthy') {
      throw new Error('CRM health check failed');
    }
    
    return response.data;
  });
}

// CRM Communications tests
async function testCRMCommunications() {
  let communicationId;
  
  await runTest('Communications - Get Metrics', async () => {
    const response = await makeRequest('/api/metrics/crm/communications', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get communication metrics');
    }
    
    return response.data;
  });

  await runTest('Communications - Create', async () => {
    const communicationData = {
      communicationId: `test-comm-${Date.now()}`,
      entityType: 'contact',
      entityId: 'test-contact-id',
      interactionType: 'outbound',
      channel: 'email',
      direction: 'outbound',
      content: 'Test communication content',
      agentId: 'test-agent-id'
    };
    
    const response = await makeRequest('/api/metrics/crm/communications', {
      method: 'POST',
      body: JSON.stringify(communicationData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to create communication');
    }
    
    communicationId = response.data.id;
    return response.data;
  });

  await runTest('Communications - Get List', async () => {
    const response = await makeRequest('/api/metrics/crm/communications/list?page=1&limit=10', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get communications list');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Communications list is not an array');
    }
    
    return response.data;
  });

  await runTest('Communications - Search', async () => {
    const response = await makeRequest('/api/metrics/crm/communications/search?q=test', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to search communications');
    }
    
    return response.data;
  });

  if (communicationId) {
    await runTest('Communications - Update', async () => {
      const updateData = {
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        followUpNotes: 'Test follow-up notes'
      };
      
      const response = await makeRequest(`/api/metrics/crm/communications/${communicationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to update communication');
      }
      
      return response.data;
    });

    await runTest('Communications - Mark Response Received', async () => {
      const response = await makeRequest(`/api/metrics/crm/communications/${communicationId}/response-received`, {
        method: 'POST',
        body: JSON.stringify({ responseDate: new Date().toISOString() }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to mark response as received');
      }
      
      return response.data;
    });

    await runTest('Communications - Add Follow-up', async () => {
      const followUpData = {
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Test follow-up notes'
      };
      
      const response = await makeRequest(`/api/metrics/crm/communications/${communicationId}/follow-up`, {
        method: 'POST',
        body: JSON.stringify(followUpData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to add follow-up');
      }
      
      return response.data;
    });

    await runTest('Communications - Delete', async () => {
      const response = await makeRequest(`/api/metrics/crm/communications/${communicationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to delete communication');
      }
      
      return response.data;
    });
  }

  await runTest('Communications - Get Overdue Responses', async () => {
    const response = await makeRequest('/api/metrics/crm/communications/overdue/responses', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get overdue responses');
    }
    
    return response.data;
  });

  await runTest('Communications - Get Overdue Follow-ups', async () => {
    const response = await makeRequest('/api/metrics/crm/communications/overdue/follow-ups', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get overdue follow-ups');
    }
    
    return response.data;
  });

  await runTest('Communications - Bulk Update', async () => {
    const bulkData = {
      communicationIds: ['test-id-1', 'test-id-2'],
      updateData: { status: 'completed' }
    };
    
    const response = await makeRequest('/api/metrics/crm/communications/bulk/update', {
      method: 'POST',
      body: JSON.stringify(bulkData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to bulk update communications');
    }
    
    return response.data;
  });
}

// CRM Contacts tests
async function testCRMContacts() {
  let contactId;
  
  await runTest('Contacts - Get Metrics', async () => {
    const response = await makeRequest('/api/metrics/crm/contacts', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get contact metrics');
    }
    
    return response.data;
  });

  await runTest('Contacts - Create', async () => {
    const contactData = {
      firstName: 'Test',
      lastName: 'Contact',
      email: `test-${Date.now()}@example.com`,
      phone: '+1234567890',
      contactType: 'lead',
      contactSource: 'website'
    };
    
    const response = await makeRequest('/api/metrics/crm/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to create contact');
    }
    
    contactId = response.data.id;
    return response.data;
  });

  await runTest('Contacts - Get List', async () => {
    const response = await makeRequest('/api/metrics/crm/contacts/list?page=1&limit=10', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get contacts list');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Contacts list is not an array');
    }
    
    return response.data;
  });

  await runTest('Contacts - Search', async () => {
    const response = await makeRequest('/api/metrics/crm/contacts/search?q=Test', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to search contacts');
    }
    
    return response.data;
  });

  if (contactId) {
    await runTest('Contacts - Update', async () => {
      const updateData = {
        phone: '+9876543210',
        company: 'Test Company'
      };
      
      const response = await makeRequest(`/api/metrics/crm/contacts/${contactId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to update contact');
      }
      
      return response.data;
    });

    await runTest('Contacts - Give Marketing Consent', async () => {
      const response = await makeRequest(`/api/metrics/crm/contacts/${contactId}/consent/marketing`, {
        method: 'POST',
        body: JSON.stringify({ method: 'email' }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to give marketing consent');
      }
      
      return response.data;
    });

    await runTest('Contacts - Assign to User', async () => {
      const response = await makeRequest(`/api/metrics/crm/contacts/${contactId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ userId: 'test-user-id' }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to assign contact to user');
      }
      
      return response.data;
    });

    await runTest('Contacts - Delete', async () => {
      const response = await makeRequest(`/api/metrics/crm/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to delete contact');
      }
      
      return response.data;
    });
  }

  await runTest('Contacts - Get High Value Leads', async () => {
    const response = await makeRequest('/api/metrics/crm/contacts/high-value-leads', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get high value leads');
    }
    
    return response.data;
  });

  await runTest('Contacts - Bulk Assign', async () => {
    const bulkData = {
      contactIds: ['test-contact-1', 'test-contact-2'],
      userId: 'test-user-id'
    };
    
    const response = await makeRequest('/api/metrics/crm/contacts/bulk/assign', {
      method: 'POST',
      body: JSON.stringify(bulkData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to bulk assign contacts');
    }
    
    return response.data;
  });
}

// CRM Templates tests
async function testCRMTemplates() {
  let templateId;
  
  await runTest('Templates - Get Metrics', async () => {
    const response = await makeRequest('/api/metrics/crm/templates', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get template metrics');
    }
    
    return response.data;
  });

  await runTest('Templates - Create', async () => {
    const templateData = {
      name: `Test Template ${Date.now()}`,
      description: 'Test template description',
      category: 'welcome',
      channel: 'email',
      type: 'transactional',
      subject: 'Test Subject',
      body: 'Hello {{firstName}}, welcome to our platform!',
      version: '1.0.0'
    };
    
    const response = await makeRequest('/api/metrics/crm/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to create template');
    }
    
    templateId = response.data.id;
    return response.data;
  });

  await runTest('Templates - Get List', async () => {
    const response = await makeRequest('/api/metrics/crm/templates/list?page=1&limit=10', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get templates list');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Templates list is not an array');
    }
    
    return response.data;
  });

  await runTest('Templates - Search', async () => {
    const response = await makeRequest('/api/metrics/crm/templates/search?q=Test', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to search templates');
    }
    
    return response.data;
  });

  if (templateId) {
    await runTest('Templates - Update', async () => {
      const updateData = {
        description: 'Updated template description',
        subject: 'Updated Subject'
      };
      
      const response = await makeRequest(`/api/metrics/crm/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to update template');
      }
      
      return response.data;
    });

    await runTest('Templates - Approve', async () => {
      const response = await makeRequest(`/api/metrics/crm/templates/${templateId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to approve template');
      }
      
      return response.data;
    });

    await runTest('Templates - Create Version', async () => {
      const response = await makeRequest(`/api/metrics/crm/templates/${templateId}/version`, {
        method: 'POST',
        body: JSON.stringify({ version: '2.0.0' }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to create template version');
      }
      
      return response.data;
    });

    await runTest('Templates - Delete', async () => {
      const response = await makeRequest(`/api/metrics/crm/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to delete template');
      }
      
      return response.data;
    });
  }

  await runTest('Templates - Get Top Performing', async () => {
    const response = await makeRequest('/api/metrics/crm/templates/top-performing', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get top performing templates');
    }
    
    return response.data;
  });
}

// CRM Automations tests
async function testCRMAutomations() {
  let automationId;
  
  await runTest('Automations - Get Metrics', async () => {
    const response = await makeRequest('/api/metrics/crm/automations', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get automation metrics');
    }
    
    return response.data;
  });

  await runTest('Automations - Create', async () => {
    const automationData = {
      name: `Test Automation ${Date.now()}`,
      description: 'Test automation description',
      category: 'lead_nurturing',
      trigger: {
        type: 'event',
        event: {
          name: 'contact_created',
          source: 'crm'
        }
      },
      actions: [
        {
          name: 'Send Welcome Email',
          type: 'send_email',
          templateId: 'template-id',
          delay: 0,
          delayUnit: 'minutes'
        }
      ]
    };
    
    const response = await makeRequest('/api/metrics/crm/automations', {
      method: 'POST',
      body: JSON.stringify(automationData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to create automation');
    }
    
    automationId = response.data.id;
    return response.data;
  });

  await runTest('Automations - Get List', async () => {
    const response = await makeRequest('/api/metrics/crm/automations/list?page=1&limit=10', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get automations list');
    }
    
    if (!Array.isArray(response.data.data)) {
      throw new Error('Automations list is not an array');
    }
    
    return response.data;
  });

  await runTest('Automations - Search', async () => {
    const response = await makeRequest('/api/metrics/crm/automations/search?q=Test', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to search automations');
    }
    
    return response.data;
  });

  if (automationId) {
    await runTest('Automations - Update', async () => {
      const updateData = {
        description: 'Updated automation description',
        enabled: true
      };
      
      const response = await makeRequest(`/api/metrics/crm/automations/${automationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to update automation');
      }
      
      return response.data;
    });

    await runTest('Automations - Enable', async () => {
      const response = await makeRequest(`/api/metrics/crm/automations/${automationId}/enable`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to enable automation');
      }
      
      return response.data;
    });

    await runTest('Automations - Test', async () => {
      const response = await makeRequest(`/api/metrics/crm/automations/${automationId}/test`, {
        method: 'POST',
        body: JSON.stringify({ testData: { contactId: 'test-contact-id' } }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to test automation');
      }
      
      return response.data;
    });

    await runTest('Automations - Execute', async () => {
      const response = await makeRequest(`/api/metrics/crm/automations/${automationId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ triggerData: { contactId: 'test-contact-id' } }),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to execute automation');
      }
      
      return response.data;
    });

    await runTest('Automations - Delete', async () => {
      const response = await makeRequest(`/api/metrics/crm/automations/${automationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      if (!response.success) {
        throw new Error('Failed to delete automation');
      }
      
      return response.data;
    });
  }

  await runTest('Automations - Get Due for Execution', async () => {
    const response = await makeRequest('/api/metrics/crm/automations/due-for-execution', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get automations due for execution');
    }
    
    return response.data;
  });

  await runTest('Automations - Bulk Enable', async () => {
    const bulkData = {
      automationIds: ['test-automation-1', 'test-automation-2']
    };
    
    const response = await makeRequest('/api/metrics/crm/automations/bulk/enable', {
      method: 'POST',
      body: JSON.stringify(bulkData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to bulk enable automations');
    }
    
    return response.data;
  });
}

// Performance tests
async function testPerformance() {
  if (options.skipPerf) {
    log('Skipping performance tests');
    return;
  }

  await runTest('Performance - Concurrent Requests', async () => {
    const fetch = require('node-fetch');
    const promises = [];
    
    // Make 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      promises.push(
        fetch(`${config.backendUrl}/api/metrics/crm`, {
          headers: { 'Authorization': 'Bearer test-token' }
        }).then(res => res.json())
      );
    }
    
    const results = await Promise.all(promises);
    
    // Check if all requests succeeded
    const failedRequests = results.filter(result => !result.success);
    if (failedRequests.length > 0) {
      throw new Error(`${failedRequests.length} concurrent requests failed`);
    }
    
    return results;
  });

  await runTest('Performance - Large Dataset', async () => {
    const startTime = Date.now();
    
    // Request with large pagination
    const response = await makeRequest('/api/metrics/crm/communications/list?page=1&limit=100', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime > 5000) { // 5 seconds threshold
      throw new Error(`Large dataset request took too long: ${responseTime}ms`);
    }
    
    return { response, responseTime };
  });

  await runTest('Performance - Response Time', async () => {
    const startTime = Date.now();
    
    const response = await makeRequest('/api/metrics/crm', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (responseTime > 2000) { // 2 seconds threshold
      throw new Error(`Overview request took too long: ${responseTime}ms`);
    }
    
    return { response, responseTime };
  });
}

// Error handling tests
async function testErrorHandling() {
  await runTest('Error Handling - Invalid Endpoint', async () => {
    try {
      await makeRequest('/api/metrics/crm/invalid-endpoint');
      throw new Error('Should have failed with 404');
    } catch (error) {
      if (!error.message.includes('HTTP 404')) {
        throw new Error('Expected 404 error but got different error');
      }
    }
    
    return true;
  });

  await runTest('Error Handling - Invalid ID', async () => {
    try {
      await makeRequest('/api/metrics/crm/communications/invalid-id', {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      throw new Error('Should have failed with validation error');
    } catch (error) {
      if (!error.message.includes('HTTP 400')) {
        throw new Error('Expected 400 error but got different error');
      }
    }
    
    return true;
  });

  await runTest('Error Handling - Missing Auth', async () => {
    try {
      await makeRequest('/api/metrics/crm');
      throw new Error('Should have failed with auth error');
    } catch (error) {
      if (!error.message.includes('HTTP 401')) {
        throw new Error('Expected 401 error but got different error');
      }
    }
    
    return true;
  });

  await runTest('Error Handling - Invalid Data', async () => {
    try {
      const invalidData = { invalid: 'data' };
      await makeRequest('/api/metrics/crm/contacts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Authorization': 'Bearer test-token' }
      });
      throw new Error('Should have failed with validation error');
    } catch (error) {
      if (!error.message.includes('HTTP 400')) {
        throw new Error('Expected 400 error but got different error');
      }
    }
    
    return true;
  });
}

// Integration with ticket system
async function testTicketIntegration() {
  await runTest('Ticket Integration - Communication Link', async () => {
    const communicationData = {
      communicationId: `test-comm-${Date.now()}`,
      entityType: 'ticket',
      entityId: 'test-ticket-id',
      interactionType: 'outbound',
      channel: 'email',
      direction: 'outbound',
      content: 'Test communication linked to ticket',
      agentId: 'test-agent-id',
      ticketId: 'test-ticket-id'
    };
    
    const response = await makeRequest('/api/metrics/crm/communications', {
      method: 'POST',
      body: JSON.stringify(communicationData),
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to create communication linked to ticket');
    }
    
    return response.data;
  });

  await runTest('Ticket Integration - Get Communications by Ticket', async () => {
    const response = await makeRequest('/api/metrics/crm/communications/entity/ticket/test-ticket-id', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Failed to get communications by ticket');
    }
    
    return response.data;
  });
}

// Specific frontend expectation test for `/metrics/crm/communications`
async function testFrontendExpectations() {
  await runTest('Frontend Expectations - Communications Endpoint', async () => {
    const response = await makeRequest('/api/metrics/crm/communications', {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    
    if (!response.success) {
      throw new Error('Communications endpoint failed');
    }
    
    // Verify expected structure for frontend
    const expectedFields = ['summary', 'breakdowns', 'performance', 'alerts', 'trends'];
    for (const field of expectedFields) {
      if (!response.data[field]) {
        throw new Error(`Missing expected field in communications response: ${field}`);
      }
    }
    
    // Verify summary structure
    const summaryFields = ['totalCommunications', 'inboundCommunications', 'outboundCommunications'];
    for (const field of summaryFields) {
      if (typeof response.data.summary[field] !== 'number') {
        throw new Error(`Summary field ${field} should be a number`);
      }
    }
    
    // Verify breakdowns structure
    const breakdownFields = ['channel', 'interactionType', 'direction'];
    for (const field of breakdownFields) {
      if (!response.data.breakdowns[field] || typeof response.data.breakdowns[field] !== 'object') {
        throw new Error(`Breakdown field ${field} should be an object`);
      }
    }
    
    // Verify performance structure
    const performanceFields = ['averageEngagementScore', 'agentPerformance', 'financialMetrics'];
    for (const field of performanceFields) {
      if (!response.data.performance[field]) {
        throw new Error(`Missing performance field: ${field}`);
      }
    }
    
    return response.data;
  });
}

// Generate test report
function generateReport() {
  if (!options.report) {
    return;
  }

  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%',
      duration: testResults.endTime - testResults.startTime,
      timestamp: new Date().toISOString()
    },
    performance: testResults.performance,
    errors: testResults.errors,
    config: config,
    options: options
  };

  const reportPath = path.join(__dirname, 'crm-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`Test report generated: ${reportPath}`);
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(report);
  const htmlReportPath = path.join(__dirname, 'crm-test-report.html');
  fs.writeFileSync(htmlReportPath, htmlReport);
  
  log(`HTML test report generated: ${htmlReportPath}`);
}

function generateHTMLReport(report) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>CRM System Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; flex: 1; }
        .metric h3 { margin: 0; color: #495057; }
        .metric .value { font-size: 24px; font-weight: bold; color: #007bff; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .test-results { margin-bottom: 20px; }
        .test-item { padding: 10px; border-bottom: 1px solid #eee; }
        .test-name { font-weight: bold; }
        .test-time { color: #6c757d; font-size: 0.9em; }
        .errors { background: #f8d7da; padding: 15px; border-radius: 5px; }
        .error-item { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>CRM System Test Report</h1>
        <p>Generated on: ${report.summary.timestamp}</p>
        <p>Total duration: ${report.summary.duration}ms</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.summary.total}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value passed">${report.summary.passed}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value failed">${report.summary.failed}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value">${report.summary.successRate}</div>
        </div>
    </div>
    
    <h2>Test Results</h2>
    <div class="test-results">
        ${Object.entries(report.performance).map(([testName, duration]) => `
            <div class="test-item">
                <span class="test-name">${testName}</span>
                <span class="test-time">(${duration}ms)</span>
            </div>
        `).join('')}
    </div>
    
    ${report.errors.length > 0 ? `
        <h2>Errors</h2>
        <div class="errors">
            ${report.errors.map(error => `
                <div class="error-item">
                    <strong>Error:</strong> ${error}
                </div>
            `).join('')}
        </div>
    ` : ''}
    
    <h2>Performance Analysis</h2>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Duration (ms)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(report.performance).map(([testName, duration]) => `
                <tr>
                    <td>${testName}</td>
                    <td>${duration}</td>
                    <td>${duration < 1000 ? '<span class="passed">Fast</span>' : duration < 3000 ? '<span class="passed">Normal</span>' : '<span class="failed">Slow</span>'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
  `;
}

// Main test execution function
async function runTests() {
  log('Starting CRM System End-to-End Tests');
  log(`Backend URL: ${config.backendUrl}`);
  log(`Options: ${JSON.stringify(options)}`);
  
  testResults.startTime = Date.now();
  
  try {
    // Run all test suites
    await testAuthentication();
    await testCRMOverview();
    await testCRMCommunications();
    await testCRMContacts();
    await testCRMTemplates();
    await testCRMAutomations();
    await testPerformance();
    await testErrorHandling();
    await testTicketIntegration();
    await testFrontendExpectations();
    
    testResults.endTime = Date.now();
    
    // Print summary
    log('\n=== Test Summary ===');
    log(`Total Tests: ${testResults.total}`);
    log(`Passed: ${testResults.passed}`);
    log(`Failed: ${testResults.failed}`);
    log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    log(`Duration: ${testResults.endTime - testResults.startTime}ms`);
    
    if (testResults.errors.length > 0) {
      log('\n=== Errors ===');
      testResults.errors.forEach((error, index) => {
        log(`${index + 1}. ${error}`);
      });
    }
    
    // Generate report if requested
    generateReport();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    testResults.endTime = Date.now();
    logError(`Test execution failed: ${error.message}`);
    generateReport();
    process.exit(1);
  }
}

// Check if node-fetch is available, install if needed
try {
  require('node-fetch');
} catch (error) {
  log('Installing node-fetch dependency...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch', { stdio: 'inherit' });
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  config,
  testResults
};