/**
 * Test Real-time Notifications
 *
 * This script tests the real-time notification implementation:
 * - WebSocket connection test
 * - Server-Sent Events (SSE) connection test
 * - Notification sending test
 * - Authentication test
 * - Connection statistics test
 */

import io from 'socket.io-client';
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:7000/api';
const SOCKET_URL = 'http://localhost:7000';

class RealtimeNotificationTester {
  constructor() {
    this.testResults = {
      websocket: { connected: false, messages: 0, errors: 0 },
      sse: { connected: false, messages: 0, errors: 0 },
      authentication: { passed: 0, failed: 0 },
      notification: { sent: 0, received: 0, errors: 0 },
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Real-time Notification Tests...\n');

    try {
      // Test 1: WebSocket connection
      await this.testWebSocketConnection();

      // Test 2: SSE connection
      await this.testSSEConnection();

      // Test 3: Authentication
      await this.testAuthentication();

      // Test 4: Notification sending
      await this.testNotificationSending();

      // Test 5: Connection statistics
      await this.testConnectionStats();

      // Print summary
      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  /**
   * Test WebSocket connection
   */
  async testWebSocketConnection() {
    console.log('📡 Testing WebSocket connection...');

    try {
      const socket = io(SOCKET_URL, {
        auth: {
          token: 'test-token-invalid', // Test invalid token first
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        this.testResults.websocket.connected = true;
      });

      socket.on('connect_error', (error) => {
        console.log('❌ WebSocket connection failed:', error.message);
        this.testResults.websocket.errors++;
      });

      socket.on('notification', (data) => {
        console.log('📨 Received notification via WebSocket:', data);
        this.testResults.notification.received++;
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
      });

      // Test with valid token
      const validSocket = io(SOCKET_URL, {
        auth: {
          token: await this.getValidTestToken(),
        },
        transports: ['websocket'],
      });

      validSocket.on('connect', () => {
        console.log('✅ WebSocket connected with valid token');
        this.testResults.websocket.connected = true;
      });

      validSocket.on('notification', (data) => {
        console.log('📨 Received notification via WebSocket (valid):', data);
        this.testResults.websocket.messages++;
        this.testResults.notification.received++;
      });

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clean up
      socket.disconnect();
      validSocket.disconnect();

    } catch (error) {
      console.error('❌ WebSocket test failed:', error.message);
      this.testResults.websocket.errors++;
    }
  }

  /**
   * Test Server-Sent Events connection
   */
  async testSSEConnection() {
    console.log('📡 Testing SSE connection...');

    try {
      const token = await this.getValidTestToken();
      const response = await fetch(`${API_BASE}/notifications/realtime/sse?token=${token}`, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      let messageCount = 0;

      const readStream = () => {
        return new Promise((resolve, reject) => {
          const read = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                resolve();
                return;
              }

              const lines = value.toString().split('\n');
              lines.forEach(line => {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    console.log('📨 Received SSE message:', data);
                    messageCount++;
                    this.testResults.sse.messages++;
                    this.testResults.notification.received++;
                  } catch (error) {
                    console.log('⚠️ Invalid SSE message:', error.message);
                  }
                }
              });
            });
          };

          reader.read().catch(reject);
          read();
        });
      };

      await readStream();

      this.testResults.sse.connected = true;
      console.log(`✅ SSE connected, received ${messageCount} messages`);

    } catch (error) {
      console.error('❌ SSE test failed:', error.message);
      this.testResults.sse.errors++;
    }
  }

  /**
   * Test authentication
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication...');

    try {
      // Test invalid token
      const invalidResponse = await fetch(`${API_BASE}/notifications/realtime/stats`, {
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      if (invalidResponse.status === 401) {
        console.log('✅ Invalid token properly rejected');
        this.testResults.authentication.passed++;
      } else {
        console.log('❌ Invalid token should be rejected');
        this.testResults.authentication.failed++;
      }

      // Test valid token
      const validToken = await this.getValidTestToken();
      const validResponse = await fetch(`${API_BASE}/notifications/realtime/stats`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      if (validResponse.status === 200) {
        console.log('✅ Valid token accepted');
        this.testResults.authentication.passed++;
      } else {
        console.log('❌ Valid token rejected');
        this.testResults.authentication.failed++;
      }

    } catch (error) {
      console.error('❌ Authentication test failed:', error.message);
      this.testResults.authentication.failed++;
    }
  }

  /**
   * Test notification sending
   */
  async testNotificationSending() {
    console.log('📤 Testing notification sending...');

    try {
      const token = await this.getValidTestToken();
      const testNotification = {
        userId: '507f1f77bcf86b7c4a0e8e2c', // Test user ID
        type: 'in_app',
        category: 'test',
        priority: 'medium',
        subject: 'Test Real-time Notification',
        content: 'This is a test notification for real-time delivery',
      };

      const response = await fetch(`${API_BASE}/notifications/realtime/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testNotification),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test notification sent successfully');
        this.testResults.notification.sent++;
      } else {
        console.log('❌ Failed to send test notification');
        this.testResults.notification.errors++;
      }

    } catch (error) {
      console.error('❌ Notification sending test failed:', error.message);
      this.testResults.notification.errors++;
    }
  }

  /**
   * Test connection statistics
   */
  async testConnectionStats() {
    console.log('📊 Testing connection statistics...');

    try {
      const token = await this.getValidTestToken();
      const response = await fetch(`${API_BASE}/notifications/realtime/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        console.log('✅ Connection stats retrieved');
        console.log('📈 Stats:', JSON.stringify(stats.data, null, 2));
      } else {
        console.log('❌ Failed to get connection stats');
      }

    } catch (error) {
      console.error('❌ Connection stats test failed:', error.message);
    }
  }

  /**
   * Get a valid test token
   */
  async getValidTestToken() {
    try {
      // Create a test user and get token
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@boosty.com',
          password: 'testpassword123',
        }),
      });

      if (loginResponse.ok) {
        const loginResult = await loginResponse.json();
        return loginResult.data.token;
      } else {
        throw new Error('Failed to get test token');
      }
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n🎯 Real-time Notification Test Summary');
    console.log('=====================================');

    console.log('📡 WebSocket Tests:');
    console.log(`  Connected: ${this.testResults.websocket.connected ? '✅' : '❌'}`);
    console.log(`  Messages: ${this.testResults.websocket.messages}`);
    console.log(`  Errors: ${this.testResults.websocket.errors}`);

    console.log('📡 SSE Tests:');
    console.log(`  Connected: ${this.testResults.sse.connected ? '✅' : '❌'}`);
    console.log(`  Messages: ${this.testResults.sse.messages}`);
    console.log(`  Errors: ${this.testResults.sse.errors}`);

    console.log('🔐 Authentication Tests:');
    console.log(`  Passed: ${this.testResults.authentication.passed}`);
    console.log(`  Failed: ${this.testResults.authentication.failed}`);

    console.log('📤 Notification Tests:');
    console.log(`  Sent: ${this.testResults.notification.sent}`);
    console.log(`  Received: ${this.testResults.notification.received}`);
    console.log(`  Errors: ${this.testResults.notification.errors}`);

    const totalPassed = Object.values(this.testResults).reduce(
      (sum, category) => sum + (category.connected || category.passed || category.sent || category.received),
      0
    );
    const totalTests = Object.values(this.testResults).reduce(
      (sum, category) => sum + (category.connected || category.passed || category.sent || category.received || category.errors),
      0
    );

    console.log('=====================================');
    console.log(`🏆 Overall: ${totalPassed}/${totalTests} tests passed`);

    if (totalPassed === totalTests) {
      console.log('🎉 All tests passed! Real-time notifications are working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RealtimeNotificationTester();
  await tester.runAllTests();
}

export default RealtimeNotificationTester;