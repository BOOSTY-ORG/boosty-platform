/**
 * Jest setup file
 */
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.location using a complete replacement approach
const mockLocation = {
  href: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Skip window.location mocking completely to avoid JSDOM navigation errors
// The tests will use the default JSDOM location object

// Mock atob function for JWT token parsing
global.atob = jest.fn((str) => {
  // Simple mock implementation for basic base64 decoding
  // This is a simplified version that works for test purposes
  try {
    return Buffer.from(str, 'base64').toString('binary');
  } catch (error) {
    throw new Error('Invalid base64 string');
  }
});

// Mock btoa function for completeness
global.btoa = jest.fn((str) => {
  // Simple mock implementation for basic base64 encoding
  try {
    return Buffer.from(str, 'binary').toString('base64');
  } catch (error) {
    throw new Error('Invalid string for base64 encoding');
  }
});

// Mock fetch if needed for API calls
global.fetch = jest.fn();

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Clear all mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

console.log('Jest setup completed with browser API mocks');