/**
 * Tests for PrecisionTemperature branded type
 * 
 * Validates Requirements 14.4, 14.7
 */

import { describe, test, expect } from 'bun:test';
import fc from 'fast-check';
import { PrecisionTemperature } from '../src/types';

describe('PrecisionTemperature', () => {
  describe('Unit Tests', () => {
    test('fromCelsius rounds to 0.1°C precision', () => {
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(17.23))).toBe(17.2);
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(17.25))).toBe(17.3);
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(17.27))).toBe(17.3);
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(-5.44))).toBe(-5.4);
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(-5.45))).toBe(-5.4); // Math.round behavior
      expect(PrecisionTemperature.value(PrecisionTemperature.fromCelsius(-5.46))).toBe(-5.5);
    });

    test('fromFahrenheit converts and rounds to 0.1°C precision', () => {
      // 32°F = 0°C
      expect(PrecisionTemperature.value(PrecisionTemperature.fromFahrenheit(32))).toBe(0);
      
      // 68°F = 20°C
      expect(PrecisionTemperature.value(PrecisionTemperature.fromFahrenheit(68))).toBe(20);
      
      // 50°F = 10°C
      expect(PrecisionTemperature.value(PrecisionTemperature.fromFahrenheit(50))).toBe(10);
    });

    test('toFahrenheit converts correctly', () => {
      const temp0C = PrecisionTemperature.fromCelsius(0);
      expect(PrecisionTemperature.toFahrenheit(temp0C)).toBe(32);
      
      const temp20C = PrecisionTemperature.fromCelsius(20);
      expect(PrecisionTemperature.toFahrenheit(temp20C)).toBe(68);
      
      const temp10C = PrecisionTemperature.fromCelsius(10);
      expect(PrecisionTemperature.toFahrenheit(temp10C)).toBe(50);
    });

    test('value extracts numeric value', () => {
      const temp = PrecisionTemperature.fromCelsius(17.2);
      expect(PrecisionTemperature.value(temp)).toBe(17.2);
      expect(typeof PrecisionTemperature.value(temp)).toBe('number');
    });

    test('handles negative temperatures', () => {
      const tempNeg = PrecisionTemperature.fromCelsius(-10.3);
      expect(PrecisionTemperature.value(tempNeg)).toBe(-10.3);
      expect(PrecisionTemperature.toFahrenheit(tempNeg)).toBeCloseTo(13.46, 1);
    });

    test('handles zero temperature', () => {
      const tempZero = PrecisionTemperature.fromCelsius(0);
      expect(PrecisionTemperature.value(tempZero)).toBe(0);
      expect(PrecisionTemperature.toFahrenheit(tempZero)).toBe(32);
    });

    test('handles extreme temperatures', () => {
      const tempHot = PrecisionTemperature.fromCelsius(50);
      expect(PrecisionTemperature.value(tempHot)).toBe(50);
      expect(PrecisionTemperature.toFahrenheit(tempHot)).toBe(122);
      
      const tempCold = PrecisionTemperature.fromCelsius(-40);
      expect(PrecisionTemperature.value(tempCold)).toBe(-40);
      expect(PrecisionTemperature.toFahrenheit(tempCold)).toBe(-40); // -40°C = -40°F
    });
  });

  describe('Property-Based Tests', () => {
    test('Property: fromCelsius always rounds to 0.1°C precision', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
          (celsius) => {
            const temp = PrecisionTemperature.fromCelsius(celsius);
            const value = PrecisionTemperature.value(temp);
            
            // Value should be rounded to 0.1°C precision
            const rounded = Math.round(value * 10) / 10;
            expect(value).toBe(rounded);
            
            // Check that the value is within 0.05°C of the original
            expect(Math.abs(value - celsius)).toBeLessThanOrEqual(0.05);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: fromFahrenheit always rounds to 0.1°C precision', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -58, max: 122, noNaN: true, noDefaultInfinity: true }),
          (fahrenheit) => {
            const temp = PrecisionTemperature.fromFahrenheit(fahrenheit);
            const value = PrecisionTemperature.value(temp);
            
            // Value should be rounded to 0.1°C precision
            const rounded = Math.round(value * 10) / 10;
            expect(value).toBe(rounded);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: Celsius to Fahrenheit and back preserves value within precision', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
          (celsius) => {
            const temp1 = PrecisionTemperature.fromCelsius(celsius);
            const fahrenheit = PrecisionTemperature.toFahrenheit(temp1);
            const temp2 = PrecisionTemperature.fromFahrenheit(fahrenheit);
            
            // After round-trip conversion, values should be equal within 0.1°C precision
            expect(PrecisionTemperature.value(temp1)).toBeCloseTo(
              PrecisionTemperature.value(temp2),
              1 // 0.1°C precision
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: value always returns a number', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
          (celsius) => {
            const temp = PrecisionTemperature.fromCelsius(celsius);
            const value = PrecisionTemperature.value(temp);
            
            expect(typeof value).toBe('number');
            expect(Number.isFinite(value)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: toFahrenheit conversion is consistent', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -50, max: 50, noNaN: true, noDefaultInfinity: true }),
          (celsius) => {
            const temp = PrecisionTemperature.fromCelsius(celsius);
            const fahrenheit = PrecisionTemperature.toFahrenheit(temp);
            
            // Manual conversion check: F = C * 9/5 + 32
            const expectedF = PrecisionTemperature.value(temp) * 9 / 5 + 32;
            expect(fahrenheit).toBeCloseTo(expectedF, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: fromCelsius is idempotent for already-rounded values', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -500, max: 500 }), // Generate integers for tenths
          (tenths) => {
            const celsius = tenths / 10; // Already at 0.1°C precision
            const temp1 = PrecisionTemperature.fromCelsius(celsius);
            const temp2 = PrecisionTemperature.fromCelsius(PrecisionTemperature.value(temp1));
            
            expect(PrecisionTemperature.value(temp1)).toBe(PrecisionTemperature.value(temp2));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
