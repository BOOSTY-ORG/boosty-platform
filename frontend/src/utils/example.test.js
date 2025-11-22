/**
 * Example test to verify ES modules work with Jest
 */

// Test importing ES modules
import { formatCurrency } from './formatters';

describe('ES Modules Test', () => {
  test('should import and use ES module functions', () => {
    // This test verifies that ES module imports work correctly
    expect(typeof formatCurrency).toBe('function');
  });
  
  test('should handle ES module exports', () => {
    // This test verifies that ES module exports work correctly
    const testValue = 1000;
    const formatted = formatCurrency(testValue);
    expect(typeof formatted).toBe('string');
  });
});