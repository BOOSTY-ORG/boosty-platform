const { describe, it, expect } = require('@jest/globals');

// Skip the global setup for this test
describe('Simple Test (No DB)', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should add numbers correctly', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle string operations', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});