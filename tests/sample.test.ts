import { describe, it, expect } from 'vitest';

describe('tooling setup', () => {
  it('runs unit tests in happy-dom environment', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(true).toBe(true);
  });
});
