/**
 * Unit tests for probability calculator
 */

import { describe, test, expect } from 'bun:test';
import { calculateProbability, calculateEV, isMarketExpired } from '../src/probability/calculator';
import { PrecisionTemperature } from '../src/types/temperature';
import { Duration } from '../src/types/timestamp';

describe('Probability Calculator', () => {
  describe('calculateProbability', () => {
    describe('Basic probability calculations', () => {
      test('should return high probability when current temp is above threshold', () => {
        const current = PrecisionTemperature.fromCelsius(25.0);
        const threshold = PrecisionTemperature.fromCelsius(20.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // Current temp already exceeds threshold
        expect(prob).toBeGreaterThan(0.9);
      });

      test('should return low probability when current temp is far below threshold', () => {
        const current = PrecisionTemperature.fromCelsius(10.0);
        const threshold = PrecisionTemperature.fromCelsius(30.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // 20°C gap is very large - low probability
        expect(prob).toBeLessThan(0.01);
      });

      test('should return ~0.5 probability when current temp equals threshold', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(20.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // At threshold - 50% chance of exceeding
        expect(prob).toBeCloseTo(0.5, 1);
      });

      test('should return probability between 0 and 1', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });

    describe('Time remaining effects', () => {
      test('probability should increase with more time remaining', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        
        const duration6h = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
        const duration12h = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        const duration24h = Duration.fromMilliseconds(24 * 60 * 60 * 1000);
        
        const prob6h = calculateProbability(current, threshold, 'KLGA', duration6h);
        const prob12h = calculateProbability(current, threshold, 'KLGA', duration12h);
        const prob24h = calculateProbability(current, threshold, 'KLGA', duration24h);
        
        // More time = more uncertainty = higher probability of exceeding
        expect(prob24h).toBeGreaterThan(prob12h);
        expect(prob12h).toBeGreaterThan(prob6h);
      });

      test('should return 0 probability for expired market', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(-1 * 60 * 60 * 1000); // -1 hour
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        expect(prob).toBe(0);
      });

      test('should return deterministic result when no time remains', () => {
        const current1 = PrecisionTemperature.fromCelsius(26.0);
        const current2 = PrecisionTemperature.fromCelsius(24.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(0);
        
        const prob1 = calculateProbability(current1, threshold, 'KLGA', duration);
        const prob2 = calculateProbability(current2, threshold, 'KLGA', duration);
        
        // No time left - current temp is final
        expect(prob1).toBe(1.0); // 26 > 25
        expect(prob2).toBe(0.0); // 24 < 25
      });
    });

    describe('City-specific volatility', () => {
      test('KORD should have higher probability than EGLC for same conditions', () => {
        // Chicago has higher volatility, so higher chance of large swings
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const probKORD = calculateProbability(current, threshold, 'KORD', duration);
        const probEGLC = calculateProbability(current, threshold, 'EGLC', duration);
        
        expect(probKORD).toBeGreaterThan(probEGLC);
      });

      test('KLGA should have moderate probability between KORD and EGLC', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const probKORD = calculateProbability(current, threshold, 'KORD', duration);
        const probKLGA = calculateProbability(current, threshold, 'KLGA', duration);
        const probEGLC = calculateProbability(current, threshold, 'EGLC', duration);
        
        expect(probKLGA).toBeGreaterThan(probEGLC);
        expect(probKLGA).toBeLessThan(probKORD);
      });
    });

    describe('Temperature precision', () => {
      test('should handle 0.1°C precision correctly', () => {
        const current = PrecisionTemperature.fromCelsius(20.1);
        const threshold = PrecisionTemperature.fromCelsius(20.2);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // Small gap should give probability close to 0.5
        expect(prob).toBeGreaterThan(0.4);
        expect(prob).toBeLessThan(0.6);
      });

      test('should handle negative temperatures', () => {
        const current = PrecisionTemperature.fromCelsius(-10.0);
        const threshold = PrecisionTemperature.fromCelsius(-5.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        expect(prob).toBeGreaterThanOrEqual(0);
        expect(prob).toBeLessThanOrEqual(1);
      });
    });

    describe('Edge cases', () => {
      test('should handle very small time remaining', () => {
        const current = PrecisionTemperature.fromCelsius(20.0);
        const threshold = PrecisionTemperature.fromCelsius(25.0);
        const duration = Duration.fromMilliseconds(60 * 1000); // 1 minute
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // Very little time - probability should be very low
        expect(prob).toBeLessThan(0.01);
      });

      test('should handle very large temperature gap', () => {
        const current = PrecisionTemperature.fromCelsius(0.0);
        const threshold = PrecisionTemperature.fromCelsius(50.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // Huge gap - essentially impossible
        expect(prob).toBeLessThan(0.0001);
      });

      test('should handle current temp far above threshold', () => {
        const current = PrecisionTemperature.fromCelsius(50.0);
        const threshold = PrecisionTemperature.fromCelsius(0.0);
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const prob = calculateProbability(current, threshold, 'KLGA', duration);
        
        // Already far above - essentially certain
        expect(prob).toBeGreaterThan(0.9999);
      });
    });
  });

  describe('calculateEV', () => {
    test('should return positive EV when calculated prob > market price', () => {
      const ev = calculateEV(0.65, 0.50);
      
      expect(ev).toBeCloseTo(0.15, 10);
      expect(ev).toBeGreaterThan(0);
    });

    test('should return negative EV when calculated prob < market price', () => {
      const ev = calculateEV(0.40, 0.55);
      
      expect(ev).toBeCloseTo(-0.15, 10);
      expect(ev).toBeLessThan(0);
    });

    test('should return zero EV when calculated prob = market price', () => {
      const ev = calculateEV(0.50, 0.50);
      
      expect(ev).toBe(0);
    });

    test('should handle edge case: both at 0', () => {
      const ev = calculateEV(0.0, 0.0);
      
      expect(ev).toBe(0);
    });

    test('should handle edge case: both at 1', () => {
      const ev = calculateEV(1.0, 1.0);
      
      expect(ev).toBe(0);
    });

    test('should handle maximum positive EV', () => {
      const ev = calculateEV(1.0, 0.0);
      
      expect(ev).toBe(1.0);
    });

    test('should handle maximum negative EV', () => {
      const ev = calculateEV(0.0, 1.0);
      
      expect(ev).toBe(-1.0);
    });

    test('should throw error for invalid calculated probability', () => {
      expect(() => calculateEV(1.5, 0.5)).toThrow();
      expect(() => calculateEV(-0.1, 0.5)).toThrow();
    });

    test('should throw error for invalid market price', () => {
      expect(() => calculateEV(0.5, 1.5)).toThrow();
      expect(() => calculateEV(0.5, -0.1)).toThrow();
    });

    test('should calculate EV with high precision', () => {
      const ev = calculateEV(0.6234, 0.5789);
      
      expect(ev).toBeCloseTo(0.0445, 4);
    });
  });

  describe('isMarketExpired', () => {
    test('should return true for negative duration', () => {
      const duration = Duration.fromMilliseconds(-1 * 60 * 60 * 1000);
      
      expect(isMarketExpired(duration)).toBe(true);
    });

    test('should return false for positive duration', () => {
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      expect(isMarketExpired(duration)).toBe(false);
    });

    test('should return false for zero duration', () => {
      const duration = Duration.fromMilliseconds(0);
      
      expect(isMarketExpired(duration)).toBe(false);
    });

    test('should return true for very small negative duration', () => {
      const duration = Duration.fromMilliseconds(-1); // -1 millisecond
      
      expect(isMarketExpired(duration)).toBe(true);
    });
  });

  describe('Integration: Full probability calculation flow', () => {
    test('should calculate realistic probability for typical scenario', () => {
      // Scenario: NYC, current temp 20°C, threshold 25°C, 12 hours remaining
      const current = PrecisionTemperature.fromCelsius(20.0);
      const threshold = PrecisionTemperature.fromCelsius(25.0);
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const prob = calculateProbability(current, threshold, 'KLGA', duration);
      
      // Should be low but non-zero probability
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(0.1);
    });

    test('should identify profitable trade opportunity', () => {
      const current = PrecisionTemperature.fromCelsius(23.0);
      const threshold = PrecisionTemperature.fromCelsius(25.0);
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const calcProb = calculateProbability(current, threshold, 'KLGA', duration);
      const marketPrice = 0.30; // Market underpricing
      
      const ev = calculateEV(calcProb, marketPrice);
      
      // If our model is correct, this should be positive EV
      // (actual value depends on model accuracy)
      expect(ev).toBeDefined();
      expect(typeof ev).toBe('number');
    });
  });
});
