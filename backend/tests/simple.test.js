const { describe, it, expect } = require('@jest/globals');

describe('Simple Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should add numbers correctly', () => {
    expect(2 + 2).toBe(4);
  });
});