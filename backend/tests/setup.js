import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { setupTestDatabase, teardownTestDatabase } from './helpers/metrics.test.helpers.js';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '7001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_metrics_test';

// Global test setup
beforeAll(async () => {
  // Setup test database for metrics tests
  await setupTestDatabase();
});

// Global test teardown
afterAll(async () => {
  // Cleanup test database
  await teardownTestDatabase();
});

// Setup before each test
beforeEach(async () => {
  // Reset mocks before each test
  jest.clearAllMocks();
  
  // Clear collections between tests for isolation
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Cleanup after each test
afterEach(() => {
  // Add any cleanup logic here
});