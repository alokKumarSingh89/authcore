import { describe, expect, it } from 'vitest';

import { durationToMs } from './duration.util.js';

describe('durationToMs', () => {
  it('should convert seconds', () => {
    expect(durationToMs('10s')).toBe(10_000);
  });

  it('should convert minutes', () => {
    expect(durationToMs('10m')).toBe(600_000);
  });

  it('should convert hours', () => {
    expect(durationToMs('2h')).toBe(7_200_000);
  });

  it('should convert days', () => {
    expect(durationToMs('30d')).toBe(2_592_000_000);
  });

  it('should reject invalid duration', () => {
    expect(() => durationToMs('10months')).toThrow();
  });
});
