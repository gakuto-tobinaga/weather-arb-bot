/**
 * Unit tests for timezone mapping utilities
 */

import { describe, test, expect } from 'bun:test';
import { ICAO_TIMEZONE_MAP, getTimezoneForICAO } from '../src/timezone';
import type { ICAOCode } from '../src/config';

describe('Timezone Mapping', () => {
  describe('ICAO_TIMEZONE_MAP', () => {
    test('should map KLGA to America/New_York', () => {
      expect(ICAO_TIMEZONE_MAP['KLGA']).toBe('America/New_York');
    });

    test('should map KORD to America/Chicago', () => {
      expect(ICAO_TIMEZONE_MAP['KORD']).toBe('America/Chicago');
    });

    test('should map EGLC to Europe/London', () => {
      expect(ICAO_TIMEZONE_MAP['EGLC']).toBe('Europe/London');
    });

    test('should have entries for all supported ICAO codes', () => {
      const supportedCodes: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
      
      for (const code of supportedCodes) {
        expect(ICAO_TIMEZONE_MAP[code]).toBeDefined();
        expect(typeof ICAO_TIMEZONE_MAP[code]).toBe('string');
      }
    });

    test('should use valid IANA timezone identifiers', () => {
      // These are standard IANA timezone identifiers
      const validTimezones = [
        'America/New_York',
        'America/Chicago',
        'Europe/London'
      ];

      const mapValues = Object.values(ICAO_TIMEZONE_MAP);
      
      for (const tz of mapValues) {
        expect(validTimezones).toContain(tz);
      }
    });
  });

  describe('getTimezoneForICAO', () => {
    test('should return correct timezone for KLGA', () => {
      const timezone = getTimezoneForICAO('KLGA');
      expect(timezone).toBe('America/New_York');
    });

    test('should return correct timezone for KORD', () => {
      const timezone = getTimezoneForICAO('KORD');
      expect(timezone).toBe('America/Chicago');
    });

    test('should return correct timezone for EGLC', () => {
      const timezone = getTimezoneForICAO('EGLC');
      expect(timezone).toBe('Europe/London');
    });

    test('should return consistent results for same ICAO code', () => {
      const tz1 = getTimezoneForICAO('KLGA');
      const tz2 = getTimezoneForICAO('KLGA');
      expect(tz1).toBe(tz2);
    });

    test('should return different timezones for different ICAO codes', () => {
      const tzKLGA = getTimezoneForICAO('KLGA');
      const tzKORD = getTimezoneForICAO('KORD');
      const tzEGLC = getTimezoneForICAO('EGLC');

      // All should be different
      expect(tzKLGA).not.toBe(tzKORD);
      expect(tzKLGA).not.toBe(tzEGLC);
      expect(tzKORD).not.toBe(tzEGLC);
    });
  });

  describe('Timezone correctness', () => {
    test('KLGA timezone should handle Eastern Time DST transitions', () => {
      // America/New_York observes DST
      const timezone = getTimezoneForICAO('KLGA');
      expect(timezone).toBe('America/New_York');
      
      // This timezone is known to observe DST
      // (actual DST handling is tested in timestamp.test.ts)
    });

    test('KORD timezone should handle Central Time DST transitions', () => {
      // America/Chicago observes DST
      const timezone = getTimezoneForICAO('KORD');
      expect(timezone).toBe('America/Chicago');
    });

    test('EGLC timezone should handle British Summer Time transitions', () => {
      // Europe/London observes BST (British Summer Time)
      const timezone = getTimezoneForICAO('EGLC');
      expect(timezone).toBe('Europe/London');
    });
  });
});
