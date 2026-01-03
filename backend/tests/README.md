# Boosty Platform - Notification System Tests

This directory contains comprehensive test suites for the Boosty Platform notification system. The test suite covers all aspects of the notification system including models, services, integrations, performance, and end-to-end flows.

## 📁 Test Structure

```
backend/tests/
├── helpers/
│   └── notification-test-fixtures.js    # Test data generators and utilities
├── notification-models.test.js           # Unit tests for notification models
├── notification-performance.test.js       # Performance and load testing
├── notification-services-integration.test.js # Service integration tests
└── README.md                             # This file
```

## 🚀 Quick Start

### Running All Tests

```bash
# Run the comprehensive test suite
node test-notification-system-complete.js

# Or use the test runner with different configurations
node run-notification-tests.js comprehensive

# Run all test configurations
node run-notification-tests.js all
```

### Running Individual Test Suites

```bash
# Run model tests
node run-notification-tests.js models

# Run performance tests
node run-notification-tests.js performance

# Run integration tests
node run-notification-tests.js integration

# Run Jest-based tests with coverage
node run-notification-tests.js coverage
```

## 📊 Test Coverage

### 1. Unit Tests (`notification-models.test.js`)

**Notification Model Tests:**

- Schema validation
- Virtual properties (`isScheduled`, `isDelivered`, `isFailed`)
- Instance methods (`markAsQueued`, `markAsSent`, `markAsDelivered`, etc.)
- Static methods (`getByUser`, `getStats`, `getPendingNotifications`)

**NotificationDelivery Model Tests:**

- Schema validation
- Virtual properties (`isDelivered`, `isFailed`, `isPending`)
- Instance methods for status tracking
- Static methods for delivery analytics

**NotificationTemplate Model Tests:**

- Template validation and rendering
- Variable substitution and validation
- Version management
- Usage tracking and approval workflow

**UserNotificationPreferences Model Tests:**

- Preference validation and defaults
- Channel and category enablement logic
- Quiet hours and frequency limits
- Device token management

### 2. Integration Tests (`notification-services-integration.test.js`)

**Service Integration:**

- Notification Service with external providers
- Preferences Service enforcement
- Template Service rendering
- Queue Manager job processing
- External service mock implementations

**External Service Integration:**

- Twilio SMS service integration
- Mailgun email service integration
- Real-time notification handling
- Webhook processing

### 3. Performance Tests (`notification-performance.test.js`)

**High-Volume Testing:**

- 1000+ notification batch processing
- 5000+ notification stress testing
- Sustained load performance analysis

**Queue System Testing:**

- Job throughput measurement
- Priority-based processing validation
- Concurrent queue operations

**Database Performance:**

- Large dataset queries
- Concurrent read/write operations
- Aggregation performance

**Resource Monitoring:**

- Memory usage tracking
- CPU performance measurement
- Rate limiting validation

### 4. End-to-End Tests (`test-notification-system-complete.js`)

**Complete Notification Flows:**

- Template-based notifications
- Multi-channel delivery
- Scheduled notifications
- Real-time updates

**Error Handling:**

- Invalid notification handling
- Service failure recovery
- Queue error management

## 🛠️ Test Configuration

### Environment Setup

Tests use in-memory MongoDB for isolated testing:

```javascript
// Automatic setup in test files
const mongoServer = await MongoMemoryServer.create();
const mongoUri = mongoServer.getUri();
await mongoose.connect(mongoUri);
```

### Mock Services

External services are mocked for testing:

```javascript
// Mock Twilio Service
const mockTwilio = {
  sendSMS: async () => ({ success: true, messageId: 'mock-id' }),
  sendBatchSMS: async () => ({ successful: recipients.length }),
  getDeliveryStatus: async () => ({ status: 'delivered' }),
};

// Mock Mailgun Service
const mockMailgun = {
  sendEmail: async () => ({ success: true, messageId: 'mock-id' }),
  sendBatchEmail: async () => ({ successful: recipients.length }),
  getDeliveryStatus: async () => ({ event: 'delivered' }),
};
```

## 📈 Performance Benchmarks

### Expected Performance Metrics

| Metric                  | Target   | Description                    |
| ----------------------- | -------- | ------------------------------ |
| Notification Processing | >30/sec  | Single notification throughput |
| Batch Processing        | >40/sec  | Bulk notification throughput   |
| Queue Throughput        | >100/sec | Job processing rate            |
| Memory Usage            | <100MB   | For 2000 notifications         |
| Query Response          | <100ms   | Average database query time    |
| Concurrent Operations   | >200/sec | Database operations            |

### Load Testing Scenarios

1. **Normal Load**: 1000 notifications, 30+ notifications/second
2. **High Load**: 5000 notifications, 40+ notifications/second
3. **Extreme Load**: 10000 notifications, 20+ notifications/second
4. **Concurrent Load**: 50 concurrent requests, 30+ notifications/second

## 🔧 Test Data Generation

### Test Fixtures (`helpers/notification-test-fixtures.js`)

Comprehensive test data generators:

```javascript
// Generate test users
const users = await testFixtures.generateTestUsers(10);

// Generate notification templates
const templates = await testFixtures.generateNotificationTemplates(5);

// Generate notification data
const notifications = testFixtures.generateNotificationData(users, templates, {
  count: 100,
  useTemplates: true,
});

// Generate user preferences
const preferences = await testFixtures.generateUserPreferences(users);
```

### Data Categories

- **Users**: Admin and standard user types with various contact methods
- **Templates**: Email, SMS, in-app, and push notification templates
- **Preferences**: Different channel and category configurations
- **Notifications**: Various types, priorities, and categories

## 📋 Test Reports

### Comprehensive Reporting

The test suite generates detailed reports including:

```javascript
{
  "summary": {
    "total": 19,
    "passed": 19,
    "failed": 0,
    "passRate": "100.00%"
  },
  "categories": {
    "unit": { "passed": 5, "failed": 0, "total": 5 },
    "integration": { "passed": 5, "failed": 0, "total": 5 },
    "performance": { "passed": 3, "failed": 0, "total": 3 },
    "e2e": { "passed": 3, "failed": 0, "total": 3 },
    "errorHandling": { "passed": 3, "failed": 0, "total": 3 }
  },
  "environment": {
    "nodeVersion": "v18.x.x",
    "platform": "linux/win32/darwin",
    "memory": "heap usage in MB"
  }
}
```

### Performance Metrics

Detailed performance analysis:

- **Throughput**: Notifications per second
- **Latency**: Response times for operations
- **Resource Usage**: Memory and CPU consumption
- **Queue Performance**: Job processing rates
- **Database Performance**: Query execution times

## 🚨 Error Handling Tests

### Failure Scenarios

1. **Invalid Data**: Missing required fields, invalid channels/categories
2. **Service Failures**: External service unavailability
3. **Queue Errors**: Uninitialized queue, job processing failures
4. **Network Issues**: Connection timeouts, rate limiting
5. **Database Errors**: Connection failures, constraint violations

### Recovery Testing

- Automatic retry mechanisms
- Fallback channel delivery
- Graceful degradation
- Error logging and monitoring

## 🔐 Security Testing

### Authentication & Authorization

- Role-based access control
- API endpoint protection
- User permission validation

### Data Protection

- Sensitive data handling
- PII protection in logs
- Secure template rendering

## 📱 Real-Time Testing

### WebSocket/SSE Testing

- Connection management
- Multi-client scenarios
- Event broadcasting
- Connection recovery

### Push Notification Testing

- Device token management
- Platform-specific delivery
- Payload validation

## 🔄 Continuous Integration

### CI/CD Integration

```bash
# Run tests in CI environment
NODE_ENV=test node run-notification-tests.js comprehensive

# Generate coverage report
NODE_ENV=test node run-notification-tests.js coverage
```

### Test Requirements

- Node.js 18+
- MongoDB (in-memory for tests)
- Redis (for queue testing)
- Test environment variables

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure test ports are available
2. **Memory Issues**: Increase Node.js heap size for large tests
3. **Database Connections**: Check MongoDB connection string
4. **Queue Issues**: Verify Redis connection for queue tests

### Debug Mode

```bash
# Run with debug logging
DEBUG=notification:* node run-notification-tests.js comprehensive

# Run with verbose output
VERBOSE=true node run-notification-tests.js performance
```

## 📚 Additional Resources

- [Notification System Specification](../docs/notification-system-specification.md)
- [API Documentation](../docs/README.md)
- [Development Guidelines](../README.md)

## 🤝 Contributing

When adding new tests:

1. Follow existing test patterns and naming conventions
2. Add comprehensive test data to fixtures
3. Include both positive and negative test cases
4. Update this README with new test descriptions
5. Ensure all tests pass before submitting

## 📞 Support

For questions about the notification system tests:

1. Check this README and existing test files
2. Review the notification system specification
3. Check test logs for detailed error information
4. Contact the development team for assistance
