/**
 * Unit tests for probability engine configuration
 */

import { describe, test, expect } from 'bun:test';
import { BASE_SIGMA_CONFIG, getBaseSigma } from '../src/probability/config';
import type { ICAOCode } from '../src/config';

describe('Probability Engine Configuration', () => {
  describe('BASE_SIGMA_CONFIG', () => {
    test('should have sigma value for KLGA', () => {
      expect(BASE_SIGMA_CONFIG['KLGA']).toBe(3.5);
    });

    test('should have sigma value for KORD', () => {
      expect(BASE_SIGMA_CONFIG['KORD']).toBe(4.2);
    });

    test('should have sigma value for EGLC', () => {
      expect(BASE_SIGMA_CONFIG['EGLC']).toBe(2.8);
    });

    test('should have entries for all supported ICAO codes', () => {
      const supportedCodes: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
      
      for (const code of supportedCodes) {
        expect(BASE_SIGMA_CONFIG[code]).toBeDefined();
        expect(typeof BASE_SIGMA_CONFIG[code]).toBe('number');
      }
    });

    test('should have positive sigma values', () => {
      const sigmaValues = Object.values(BASE_SIGMA_CONFIG);
      
      for (const sigma of sigmaValues) {
        expect(sigma).toBeGreaterThan(0);
      }
    });

    test('should have reasonable sigma values (between 1 and 10)', () => {
      const sigmaValues = Object.values(BASE_SIGMA_CONFIG);
      
      for (const sigma of sigmaValues) {
        expect(sigma).toBeGreaterThanOrEqual(1);
        expect(sigma).toBeLessThanOrEqual(10);
      }
    });

    test('KORD should have highest volatility', () => {
      // Chicago has continental climate with higher temperature swings
      expect(BASE_SIGMA_CONFIG['KORD']).toBeGreaterThan(BASE_SIGMA_CONFIG['KLGA']);
      expect(BASE_SIGMA_CONFIG['KORD']).toBeGreaterThan(BASE_SIGMA_CONFIG['EGLC']);
    });

    test('EGLC should have lowest volatility', () => {
      // London has maritime climate with more stable temperatures
      expect(BASE_SIGMA_CONFIG['EGLC']).toBeLessThan(BASE_SIGMA_CONFIG['KLGA']);
      expect(BASE_SIGMA_CONFIG['EGLC']).toBeLessThan(BASE_SIGMA_CONFIG['KORD']);
    });

    test('KLGA should have moderate volatility', () => {
      // New York is between Chicago and London
      expect(BASE_SIGMA_CONFIG['KLGA']).toBeGreaterThan(BASE_SIGMA_CONFIG['EGLC']);
      expect(BASE_SIGMA_CONFIG['KLGA']).toBeLessThan(BASE_SIGMA_CONFIG['KORD']);
    });
  });

  describe('getBaseSigma', () => {
    test('should return correct sigma for KLGA', () => {
      const sigma = getBaseSigma('KLGA');
      expect(sigma).toBe(3.5);
    });

    test('should return correct sigma for KORD', () => {
      const sigma = getBaseSigma('KORD');
      expect(sigma).toBe(4.2);
    });

    test('should return correct sigma for EGLC', () => {
      const sigma = getBaseSigma('EGLC');
      expect(sigma).toBe(2.8);
    });

    test('should return consistent results for same ICAO code', () => {
      const sigma1 = getBaseSigma('KLGA');
      const sigma2 = getBaseSigma('KLGA');
      expect(sigma1).toBe(sigma2);
    });

    test('should return different sigmas for different ICAO codes', () => {
      const sigmaKLGA = getBaseSigma('KLGA');
      const sigmaKORD = getBaseSigma('KORD');
      const sigmaEGLC = getBaseSigma('EGLC');

      // All should be different
      expect(sigmaKLGA).not.toBe(sigmaKORD);
      expect(sigmaKLGA).not.toBe(sigmaEGLC);
      expect(sigmaKORD).not.toBe(sigmaEGLC);
    });
  });

  describe('Climate characteristics', () => {
    test('continental climate (KORD) should have higher volatility than maritime (EGLC)', () => {
      const continentalSigma = getBaseSigma('KORD');
      const maritimeSigma = getBaseSigma('EGLC');
      
      expect(continentalSigma).toBeGreaterThan(maritimeSigma);
      
      // Continental should be at least 30% higher
      expect(continentalSigma / maritimeSigma).toBeGreaterThan(1.3);
    });

    test('coastal city (KLGA) should have moderate volatility', () => {
      const coastalSigma = getBaseSigma('KLGA');
      const continentalSigma = getBaseSigma('KORD');
      const maritimeSigma = getBaseSigma('EGLC');
      
      // Should be between maritime and continental
      expect(coastalSigma).toBeGreaterThan(maritimeSigma);
      expect(coastalSigma).toBeLessThan(continentalSigma);
    });
  });
});
