const config = {
  // Use ES modules
  preset: null,
  
  // Transform ES modules
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.jsx'
  ],
  
  // Coverage
  collectCoverage: false,
  
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
  
  // Test environment
  testEnvironment: 'node',
  
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
};

module.exports = config;