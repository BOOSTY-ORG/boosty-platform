/**
 * Test Queue System Integration
 *
 * This file tests the notification queue system:
 * - Tests queue initialization
 * - Tests notification creation and processing
 * - Tests error handling
 * - Tests system shutdown
 */

import notificationSystem from './notificationSystem.service.js';

/**
 * Test queue system integration
 */
async function testQueueSystem() {
  console.log('Starting Queue System Integration Test...');

  try {
    // Test 1: Initialize the system
    console.log('\n=== Test 1: Initialize System ===');
    await notificationSystem.initialize();
    console.log('✅ System initialized successfully');

    // Test 2: Send a simple notification
    console.log('\n=== Test 2: Send Simple Notification ===');
    const notificationData = {
      userId: '507f1f77bcf86cd799439011', // Example MongoDB ObjectId
      type: 'email',
      channels: ['email'],
      recipient: {
        email: 'test@example.com',
      },
      subject: 'Test Notification',
      content: 'This is a test notification from the queue system.',
      category: 'general',
      priority: 'medium',
      sentBy: 'test-system',
    };

    const result = await notificationSystem.sendNotification(notificationData);
    console.log('✅ Notification sent successfully:', result);

    // Test 3: Get system metrics
    console.log('\n=== Test 3: Get System Metrics ===');
    const metrics = await notificationSystem.getSystemMetrics();
    console.log('✅ System metrics retrieved:', {
      queues: Object.keys(metrics.queues).length,
      workers: metrics.workers.totalWorkers,
      timestamp: metrics.timestamp,
    });

    // Test 4: Health check
    console.log('\n=== Test 4: Health Check ===');
    const health = await notificationSystem.healthCheck();
    console.log('✅ Health check completed:', health.status);

    // Test 5: Cleanup and shutdown
    console.log('\n=== Test 5: Cleanup and Shutdown ===');
    await notificationSystem.cleanup(0); // Cleanup all records for test
    console.log('✅ Cleanup completed');

    await notificationSystem.shutdown();
    console.log('✅ System shutdown completed');

    console.log('\n🎉 All tests passed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Try to shutdown even if test failed
    try {
      await notificationSystem.shutdown();
    } catch (shutdownError) {
      console.error(
        'Failed to shutdown system after test failure:',
        shutdownError
      );
    }

    return false;
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');

  try {
    // Test invalid notification data
    const invalidData = {
      // Missing required fields
      type: 'email',
      channels: ['email'],
    };

    await notificationSystem.sendNotification(invalidData);
    console.log('❌ Should have failed with invalid data');
    return false;
  } catch (error) {
    console.log('✅ Correctly caught error for invalid data:', error.message);
    return true;
  }
}

/**
 * Test bulk notifications
 */
async function testBulkNotifications() {
  console.log('\n=== Testing Bulk Notifications ===');

  try {
    const notificationsData = [
      {
        userId: '507f1f77bcf86cd799439011',
        type: 'email',
        channels: ['email'],
        recipient: {
          email: 'test1@example.com',
        },
        subject: 'Bulk Test 1',
        content: 'This is bulk test notification 1.',
        category: 'general',
        priority: 'low',
      },
      {
        userId: '507f1f77bcf86cd799439011',
        type: 'sms',
        channels: ['sms'],
        recipient: {
          phone: '+1234567890',
        },
        subject: 'Bulk Test 2',
        content: 'This is bulk test notification 2.',
        category: 'alert',
        priority: 'high',
      },
    ];

    const results =
      await notificationSystem.sendBulkNotifications(notificationsData);
    const successCount = results.filter((r) => r.success).length;
    console.log(
      `✅ Bulk notifications sent: ${successCount}/${results.length}`
    );
    return successCount === results.length;
  } catch (error) {
    console.error('❌ Bulk notification test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Queue System Integration Tests\n');

  const results = {
    initialization: false,
    basicNotification: false,
    metrics: false,
    healthCheck: false,
    errorHandling: false,
    bulkNotifications: false,
  };

  try {
    // Initialize system first
    await notificationSystem.initialize();
    results.initialization = true;

    // Run tests
    results.basicNotification = await testQueueSystem();
    results.errorHandling = await testErrorHandling();
    results.bulkNotifications = await testBulkNotifications();

    // Final metrics check
    const metrics = await notificationSystem.getSystemMetrics();
    results.metrics = !!metrics.queues;
    results.healthCheck =
      (await notificationSystem.healthCheck()).status === 'healthy';

    // Shutdown
    await notificationSystem.shutdown();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }

  // Print results
  console.log('\n📊 Test Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(
      `${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`
    );
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Queue system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }

  return passedTests === totalTests;
}

// Export test functions
export {
  testQueueSystem,
  testErrorHandling,
  testBulkNotifications,
  runAllTests,
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}
