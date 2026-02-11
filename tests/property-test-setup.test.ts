/**
 * Property-Based Testing Setup Verification
 * 
 * Verifies that fast-check is properly configured for property-based testing.
 */

import { test, expect } from 'bun:test';
import fc from 'fast-check';

test('fast-check is working with basic property', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => {
      // Property: adding zero to any integer returns the same integer
      expect(n + 0).toBe(n);
    }),
    { numRuns: 100 }
  );
});

test('fast-check can generate complex data structures', () => {
  fc.assert(
    fc.property(
      fc.record({
        temperature: fc.float({ min: -50, max: 50, noNaN: true }),
        timestamp: fc.date(),
        station: fc.constantFrom('KLGA', 'KORD', 'EGLC')
      }),
      (data) => {
        // Property: generated data should have all required fields
        expect(data).toHaveProperty('temperature');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('station');
        expect(['KLGA', 'KORD', 'EGLC']).toContain(data.station);
      }
    ),
    { numRuns: 100 }
  );
});
