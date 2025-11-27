const config = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*crm*.test.js',
    '**/tests/**/*crm*.test.jsx'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.cjs'],
  
  // Module name mapping for mocking
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Global variables
  globals: {
    'NODE_ENV': 'test'
  },
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Coverage
  collectCoverage: false,
};

module.exports = config;