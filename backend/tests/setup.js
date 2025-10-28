import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

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
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/boosty_test';

// Global test setup
beforeAll(async () => {
  // Add any global setup logic here
});

// Global test teardown
afterAll(async () => {
  // Add any global teardown logic here
});

// Setup before each test
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Add any cleanup logic here
});