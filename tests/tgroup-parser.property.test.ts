/**
 * T-Group Parser Property-Based Tests
 * 
 * Property-based tests verify universal correctness properties across all valid inputs.
 * Uses fast-check to generate random test cases and validate properties hold.
 * 
 * Requirements: 2.1, 2.4, 2.5, 2.6
 */

import { describe, test, expect } from 'bun:test';
import fc from 'fast-check';
import { parseTGroup, encodeTGroup, encodeTGroupTemperature } from '../src/metar/parser';
import { PrecisionTemperature } from '../src/types/temperature';
import { Option } from '../src/metar/types';

describe('T-Group Parser - Property-Based Tests', () => {
  /**
   * Property 1: T-Group Parsing Correctness
   * 
   * For any valid T-Group string in format T[sign][temp][sign][dewpoint],
   * parsing should correctly extract the temperature with proper sign and 0.1°C precision.
   * 
   * Validates: Requirements 2.1, 2.4, 2.5
   */
  test('Property 1: T-Group Parsing Correctness', () => {
    fc.assert(
      fc.property(
        // Generate random temperatures in realistic range (-50°C to 50°C)
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius, dewpointCelsius) => {
          // Convert to PrecisionTemperature (rounds to 0.1°C)
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const dewpoint = PrecisionTemperature.fromCelsius(dewpointCelsius);
          
          // Encode to T-Group format
          const tGroupString = encodeTGroup(temp, dewpoint);
          
          // Create a mock METAR with the T-Group
          const mockMETAR = `KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK ${tGroupString}`;
          
          // Parse the T-Group
          const result = parseTGroup(mockMETAR);
          
          // Should successfully parse
          expect(Option.isSome(result)).toBe(true);
          
          if (Option.isSome(result)) {
            // Temperature should match within 0.1°C precision
            expect(PrecisionTemperature.value(result.value.temperature))
              .toBeCloseTo(PrecisionTemperature.value(temp), 1);
            
            // Dewpoint should match within 0.1°C precision
            expect(PrecisionTemperature.value(result.value.dewpoint))
              .toBeCloseTo(PrecisionTemperature.value(dewpoint), 1);
            
            // Raw string should match the encoded T-Group
            expect(result.value.rawString).toBe(tGroupString);
          }
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  /**
   * Property 2: T-Group Round-Trip Consistency
   * 
   * For any PrecisionTemperature value, encoding to T-Group format then parsing back
   * should produce an equivalent temperature value.
   * 
   * Validates: Requirements 2.5
   */
  test('Property 2: T-Group Round-Trip Consistency', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius, dewpointCelsius) => {
          // Create PrecisionTemperature values
          const originalTemp = PrecisionTemperature.fromCelsius(tempCelsius);
          const originalDewpoint = PrecisionTemperature.fromCelsius(dewpointCelsius);
          
          // Encode to T-Group
          const encoded = encodeTGroup(originalTemp, originalDewpoint);
          
          // Parse back from T-Group
          const parsed = parseTGroup(`METAR RMK ${encoded}`);
          
          // Should successfully parse
          expect(Option.isSome(parsed)).toBe(true);
          
          if (Option.isSome(parsed)) {
            // Temperature should match original (within 0.1°C precision)
            expect(PrecisionTemperature.value(parsed.value.temperature))
              .toBeCloseTo(PrecisionTemperature.value(originalTemp), 1);
            
            // Dewpoint should match original (within 0.1°C precision)
            expect(PrecisionTemperature.value(parsed.value.dewpoint))
              .toBeCloseTo(PrecisionTemperature.value(originalDewpoint), 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Invalid T-Group Rejection
   * 
   * For any malformed T-Group string (wrong format, invalid characters, incorrect length),
   * parsing should return None and not throw exceptions.
   * 
   * Validates: Requirements 2.6
   */
  test('Property 4: Invalid T-Group Rejection', () => {
    fc.assert(
      fc.property(
        // Generate various invalid T-Group patterns
        fc.oneof(
          // Missing T prefix
          fc.string({ minLength: 8, maxLength: 8 }).filter(s => !s.startsWith('T')),
          // Wrong length (too short)
          fc.string({ minLength: 1, maxLength: 7 }),
          // Wrong length (too long)
          fc.string({ minLength: 10, maxLength: 20 }),
          // Invalid sign characters (not 0 or 1)
          fc.tuple(
            fc.constantFrom('2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B'),
            fc.string({ minLength: 7, maxLength: 7 })
          ).map(([sign, rest]) => `T${sign}${rest}`),
          // Non-numeric temperature codes
          fc.tuple(
            fc.constantFrom('0', '1'),
            fc.string({ minLength: 3, maxLength: 3 }).filter(s => !/^\d{3}$/.test(s)),
            fc.constantFrom('0', '1'),
            fc.string({ minLength: 3, maxLength: 3 })
          ).map(([s1, t, s2, d]) => `T${s1}${t}${s2}${d}`)
        ),
        (invalidTGroup) => {
          // Create METAR with invalid T-Group
          const mockMETAR = `KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK ${invalidTGroup}`;
          
          // Should not throw an exception
          let result;
          expect(() => {
            result = parseTGroup(mockMETAR);
          }).not.toThrow();
          
          // Should return None for invalid T-Group
          expect(Option.isNone(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sign Encoding Correctness
   * 
   * For any temperature value, the sign bit should be 0 for positive/zero
   * and 1 for negative values.
   */
  test('Property: Sign Encoding Correctness', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius) => {
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const encoded = encodeTGroupTemperature(temp);
          
          // First character should be the sign
          const signChar = encoded[0];
          const tempValue = PrecisionTemperature.value(temp);
          
          if (tempValue >= 0) {
            expect(signChar).toBe('0');
          } else {
            expect(signChar).toBe('1');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encoded Length Consistency
   * 
   * For any temperature value, the encoded T-Group temperature portion
   * should always be exactly 4 characters (1 sign + 3 digits).
   */
  test('Property: Encoded Length Consistency', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius) => {
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const encoded = encodeTGroupTemperature(temp);
          
          // Should always be 4 characters
          expect(encoded.length).toBe(4);
          
          // Should match pattern: [01]\d{3}
          expect(encoded).toMatch(/^[01]\d{3}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Full T-Group Format Consistency
   * 
   * For any temperature and dewpoint values, the encoded full T-Group
   * should always match the expected format: T[01]\d{3}[01]\d{3}
   */
  test('Property: Full T-Group Format Consistency', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius, dewpointCelsius) => {
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const dewpoint = PrecisionTemperature.fromCelsius(dewpointCelsius);
          const encoded = encodeTGroup(temp, dewpoint);
          
          // Should always be 9 characters (T + 4 + 4)
          expect(encoded.length).toBe(9);
          
          // Should match the T-Group pattern
          expect(encoded).toMatch(/^T[01]\d{3}[01]\d{3}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Precision Preservation
   * 
   * For any temperature value, encoding and parsing should preserve
   * the 0.1°C precision (no additional rounding errors).
   */
  test('Property: Precision Preservation', () => {
    fc.assert(
      fc.property(
        // Generate temperatures with exactly 0.1°C precision
        fc.integer({ min: -500, max: 500 }).map(tenths => tenths / 10),
        (tempCelsius) => {
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const dewpoint = PrecisionTemperature.fromCelsius(0); // Use 0 for simplicity
          
          const encoded = encodeTGroup(temp, dewpoint);
          const parsed = parseTGroup(`METAR RMK ${encoded}`);
          
          expect(Option.isSome(parsed)).toBe(true);
          
          if (Option.isSome(parsed)) {
            // Should match exactly (no additional rounding)
            const originalValue = PrecisionTemperature.value(temp);
            const parsedValue = PrecisionTemperature.value(parsed.value.temperature);
            
            // Both should be rounded to 0.1°C, so they should be exactly equal
            expect(Math.abs(parsedValue - originalValue)).toBeLessThan(0.01);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Missing T-Group Returns None
   * 
   * For any METAR string that doesn't contain a valid T-Group pattern,
   * parsing should return None.
   */
  test('Property: Missing T-Group Returns None', () => {
    fc.assert(
      fc.property(
        // Generate METAR-like strings without T-Group
        fc.string({ minLength: 10, maxLength: 100 })
          .filter(s => !s.match(/T[01]\d{3}[01]\d{3}/)),
        (metarWithoutTGroup) => {
          const result = parseTGroup(metarWithoutTGroup);
          expect(Option.isNone(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Absolute Value Encoding
   * 
   * For any temperature value, the 3-digit code should represent
   * the absolute value in tenths of degrees.
   */
  test('Property: Absolute Value Encoding', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -50, max: 50, noNaN: true }),
        (tempCelsius) => {
          const temp = PrecisionTemperature.fromCelsius(tempCelsius);
          const encoded = encodeTGroupTemperature(temp);
          
          // Extract the 3-digit code (skip sign)
          const code = encoded.substring(1);
          const codeValue = parseInt(code, 10);
          
          // Should represent absolute value in tenths
          const expectedValue = Math.abs(Math.round(PrecisionTemperature.value(temp) * 10));
          expect(codeValue).toBe(expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });
});
