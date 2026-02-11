/**
 * Unit tests for sigma calculation
 */

import { describe, test, expect } from 'bun:test';
import { calculateSigma, isSigmaMonotonic } from '../src/probability/sigma';
import { Duration } from '../src/types/timestamp';
import type { ICAOCode } from '../src/config';

describe('Sigma Calculation', () => {
  describe('calculateSigma', () => {
    describe('Basic calculations', () => {
      test('should return base sigma when 24 hours remain', () => {
        const duration = Duration.fromMilliseconds(24 * 60 * 60 * 1000);
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        const sigmaKORD = calculateSigma('KORD', duration);
        const sigmaEGLC = calculateSigma('EGLC', duration);
        
        expect(sigmaKLGA).toBe(3.5);
        expect(sigmaKORD).toBe(4.2);
        expect(sigmaEGLC).toBe(2.8);
      });

      test('should return approximately 0.707 * base_sigma when 12 hours remain', () => {
        // sqrt(12/24) = sqrt(0.5) ≈ 0.707
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        // 3.5 * 0.707 ≈ 2.47
        expect(sigmaKLGA).toBeCloseTo(2.47, 1);
      });

      test('should return 0.5 * base_sigma when 6 hours remain', () => {
        // sqrt(6/24) = sqrt(0.25) = 0.5
        const duration = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        // 3.5 * 0.5 = 1.75
        expect(sigmaKLGA).toBeCloseTo(1.75, 2);
      });

      test('should return small sigma when 1 hour remains', () => {
        // sqrt(1/24) ≈ 0.204
        const duration = Duration.fromMilliseconds(1 * 60 * 60 * 1000);
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        // 3.5 * 0.204 ≈ 0.71
        expect(sigmaKLGA).toBeCloseTo(0.71, 1);
        expect(sigmaKLGA).toBeLessThan(1);
      });

      test('should return 0 when no time remains', () => {
        const duration = Duration.fromMilliseconds(0);
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        expect(sigmaKLGA).toBe(0);
      });

      test('should return base sigma when more than 24 hours remain', () => {
        const duration = Duration.fromMilliseconds(48 * 60 * 60 * 1000); // 48 hours
        
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        // Should cap at base sigma
        expect(sigmaKLGA).toBe(3.5);
      });
    });

    describe('Monotonic decrease property', () => {
      test('sigma should decrease as time decreases', () => {
        const times = [24, 18, 12, 6, 3, 1, 0.5, 0];
        const sigmas: number[] = [];
        
        for (const hours of times) {
          const duration = Duration.fromMilliseconds(hours * 60 * 60 * 1000);
          const sigma = calculateSigma('KLGA', duration);
          sigmas.push(sigma);
        }
        
        // Each sigma should be less than or equal to the previous
        for (let i = 1; i < sigmas.length; i++) {
          expect(sigmas[i]).toBeLessThanOrEqual(sigmas[i - 1]);
        }
      });

      test('sigma should never be negative', () => {
        const times = [24, 12, 6, 3, 1, 0.5, 0];
        
        for (const hours of times) {
          const duration = Duration.fromMilliseconds(hours * 60 * 60 * 1000);
          const sigma = calculateSigma('KLGA', duration);
          
          expect(sigma).toBeGreaterThanOrEqual(0);
        }
      });

      test('sigma should approach 0 as time approaches 0', () => {
        const duration = Duration.fromMilliseconds(0.1 * 60 * 60 * 1000); // 6 minutes
        
        const sigma = calculateSigma('KLGA', duration);
        
        expect(sigma).toBeLessThan(0.5);
        expect(sigma).toBeGreaterThanOrEqual(0);
      });
    });

    describe('City-specific behavior', () => {
      test('KORD should have higher sigma than KLGA for same time remaining', () => {
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const sigmaKORD = calculateSigma('KORD', duration);
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        expect(sigmaKORD).toBeGreaterThan(sigmaKLGA);
      });

      test('EGLC should have lower sigma than KLGA for same time remaining', () => {
        const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
        
        const sigmaEGLC = calculateSigma('EGLC', duration);
        const sigmaKLGA = calculateSigma('KLGA', duration);
        
        expect(sigmaEGLC).toBeLessThan(sigmaKLGA);
      });

      test('relative differences should be preserved across time scales', () => {
        const duration = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
        
        const sigmaKORD = calculateSigma('KORD', duration);
        const sigmaKLGA = calculateSigma('KLGA', duration);
        const sigmaEGLC = calculateSigma('EGLC', duration);
        
        // Order should be preserved
        expect(sigmaKORD).toBeGreaterThan(sigmaKLGA);
        expect(sigmaKLGA).toBeGreaterThan(sigmaEGLC);
      });
    });

    describe('Edge cases', () => {
      test('should handle negative time remaining (expired market)', () => {
        const duration = Duration.fromMilliseconds(-1 * 60 * 60 * 1000); // -1 hour
        
        const sigma = calculateSigma('KLGA', duration);
        
        // Should return 0 for expired markets
        expect(sigma).toBe(0);
      });

      test('should handle very small time remaining', () => {
        const duration = Duration.fromMilliseconds(60 * 1000); // 1 minute
        
        const sigma = calculateSigma('KLGA', duration);
        
        expect(sigma).toBeGreaterThanOrEqual(0);
        expect(sigma).toBeLessThan(0.2);
      });

      test('should handle very large time remaining', () => {
        const duration = Duration.fromMilliseconds(100 * 60 * 60 * 1000); // 100 hours
        
        const sigma = calculateSigma('KLGA', duration);
        
        // Should cap at base sigma
        expect(sigma).toBe(3.5);
      });
    });
  });

  describe('isSigmaMonotonic', () => {
    test('should return true when time1 > time2', () => {
      const time1 = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      const time2 = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
      
      const result = isSigmaMonotonic('KLGA', time1, time2);
      
      expect(result).toBe(true);
    });

    test('should return true when time1 = time2', () => {
      const time1 = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      const time2 = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const result = isSigmaMonotonic('KLGA', time1, time2);
      
      expect(result).toBe(true);
    });

    test('should return false when time1 < time2', () => {
      const time1 = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
      const time2 = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const result = isSigmaMonotonic('KLGA', time1, time2);
      
      expect(result).toBe(false);
    });

    test('should work for all ICAO codes', () => {
      const time1 = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      const time2 = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
      
      const codes: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
      
      for (const code of codes) {
        const result = isSigmaMonotonic(code, time1, time2);
        expect(result).toBe(true);
      }
    });
  });

  describe('Mathematical properties', () => {
    test('sigma should follow square root scaling', () => {
      // If time is reduced by factor of 4, sigma should be reduced by factor of 2
      const time1 = Duration.fromMilliseconds(24 * 60 * 60 * 1000);
      const time2 = Duration.fromMilliseconds(6 * 60 * 60 * 1000); // 1/4 of time1
      
      const sigma1 = calculateSigma('KLGA', time1);
      const sigma2 = calculateSigma('KLGA', time2);
      
      // sigma2 should be approximately sigma1 / 2
      expect(sigma2).toBeCloseTo(sigma1 / 2, 1);
    });

    test('sigma at 6 hours should be half of sigma at 24 hours', () => {
      const time24 = Duration.fromMilliseconds(24 * 60 * 60 * 1000);
      const time6 = Duration.fromMilliseconds(6 * 60 * 60 * 1000);
      
      const sigma24 = calculateSigma('KLGA', time24);
      const sigma6 = calculateSigma('KLGA', time6);
      
      // sqrt(6/24) = sqrt(1/4) = 1/2
      expect(sigma6).toBeCloseTo(sigma24 / 2, 2);
    });
  });
});
