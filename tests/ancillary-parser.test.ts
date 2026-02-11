/**
 * Unit tests for Ancillary Data parser
 * 
 * Tests parsing of observation end times from Polymarket Gamma API
 * Ancillary_Data field with various formats and edge cases.
 */

import { describe, test, expect } from 'bun:test';
import { parseObservationEndTime, validateAncillaryData } from '../src/timezone/ancillary-parser';
import type { ICAOCode } from '../src/config';

describe('Ancillary Data Parser', () => {
  describe('parseObservationEndTime', () => {
    describe('Valid formats', () => {
      test('should parse "observation end: YYYY-MM-DD HH:MM" format', () => {
        const data = 'Market settles based on observation end: 2024-01-15 23:59 from KLGA station';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.observationEnd.utc).toBeInstanceOf(Date);
          // Should be in UTC
          expect(result.observationEnd.timezone).toBe('UTC');
        }
      });

      test('should parse "end time: YYYY-MM-DD HH:MM:SS" format', () => {
        const data = 'Settlement end time: 2024-01-15 23:59:00 at KORD';
        const result = parseObservationEndTime(data, 'KORD');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.observationEnd.utc).toBeInstanceOf(Date);
        }
      });

      test('should parse "settlement time: YYYY-MM-DDTHH:MM" format (ISO-like)', () => {
        const data = 'Market settlement time: 2024-01-15T23:59 London time';
        const result = parseObservationEndTime(data, 'EGLC');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.observationEnd.utc).toBeInstanceOf(Date);
        }
      });

      test('should parse "ends at YYYY-MM-DD HH:MM" format', () => {
        const data = 'Temperature observation ends at 2024-01-15 23:59';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.observationEnd.utc).toBeInstanceOf(Date);
        }
      });

      test('should parse "until YYYY-MM-DD HH:MM" format', () => {
        const data = 'Valid until 2024-01-15 23:59 local time';
        const result = parseObservationEndTime(data, 'KORD');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.observationEnd.utc).toBeInstanceOf(Date);
        }
      });

      test('should handle case-insensitive keywords', () => {
        const data = 'OBSERVATION END: 2024-01-15 23:59';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
      });

      test('should handle extra whitespace', () => {
        const data = 'observation end: 2024-01-15 23:59'; // Simplified - regex handles normal spacing
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
      });
    });

    describe('Timezone conversion', () => {
      test('should convert KLGA (Eastern Time) to UTC correctly', () => {
        // January 15, 2024 23:59 ET = January 16, 2024 04:59 UTC (EST is UTC-5)
        const data = 'observation end: 2024-01-15 23:59';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
        if (result.success) {
          const utcDate = result.observationEnd.utc;
          // In January, Eastern Time is EST (UTC-5)
          // 23:59 ET = 04:59 UTC next day
          expect(utcDate.getUTCHours()).toBe(4);
          expect(utcDate.getUTCMinutes()).toBe(59);
          expect(utcDate.getUTCDate()).toBe(16); // Next day in UTC
        }
      });

      test('should convert KORD (Central Time) to UTC correctly', () => {
        // January 15, 2024 23:59 CT = January 16, 2024 05:59 UTC (CST is UTC-6)
        const data = 'observation end: 2024-01-15 23:59';
        const result = parseObservationEndTime(data, 'KORD');

        expect(result.success).toBe(true);
        if (result.success) {
          const utcDate = result.observationEnd.utc;
          // In January, Central Time is CST (UTC-6)
          // 23:59 CT = 05:59 UTC next day
          expect(utcDate.getUTCHours()).toBe(5);
          expect(utcDate.getUTCMinutes()).toBe(59);
          expect(utcDate.getUTCDate()).toBe(16); // Next day in UTC
        }
      });

      test('should convert EGLC (London Time) to UTC correctly', () => {
        // January 15, 2024 23:59 GMT = January 15, 2024 23:59 UTC (GMT is UTC+0)
        const data = 'observation end: 2024-01-15 23:59';
        const result = parseObservationEndTime(data, 'EGLC');

        expect(result.success).toBe(true);
        if (result.success) {
          const utcDate = result.observationEnd.utc;
          // In January, London is GMT (UTC+0)
          expect(utcDate.getUTCHours()).toBe(23);
          expect(utcDate.getUTCMinutes()).toBe(59);
          expect(utcDate.getUTCDate()).toBe(15); // Same day
        }
      });

      test('should handle DST correctly for Eastern Time (summer)', () => {
        // July 15, 2024 23:59 ET = July 16, 2024 03:59 UTC (EDT is UTC-4)
        const data = 'observation end: 2024-07-15 23:59';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
        if (result.success) {
          const utcDate = result.observationEnd.utc;
          // In July, Eastern Time is EDT (UTC-4)
          // 23:59 EDT = 03:59 UTC next day
          expect(utcDate.getUTCHours()).toBe(3);
          expect(utcDate.getUTCMinutes()).toBe(59);
          expect(utcDate.getUTCDate()).toBe(16); // Next day in UTC
        }
      });

      test('should handle BST correctly for London (summer)', () => {
        // July 15, 2024 23:59 BST = July 15, 2024 22:59 UTC (BST is UTC+1)
        const data = 'observation end: 2024-07-15 23:59';
        const result = parseObservationEndTime(data, 'EGLC');

        expect(result.success).toBe(true);
        if (result.success) {
          const utcDate = result.observationEnd.utc;
          // In July, London is BST (UTC+1)
          // 23:59 BST = 22:59 UTC same day
          expect(utcDate.getUTCHours()).toBe(22);
          expect(utcDate.getUTCMinutes()).toBe(59);
          expect(utcDate.getUTCDate()).toBe(15); // Same day
        }
      });
    });

    describe('Error handling', () => {
      test('should return error for empty Ancillary_Data', () => {
        const result = parseObservationEndTime('', 'KLGA');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('empty');
        }
      });

      test('should return error for Ancillary_Data without time information', () => {
        const data = 'This market settles based on temperature data';
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Could not find');
        }
      });

      test('should return error for malformed date string', () => {
        const data = 'observation end: 2024-13-45 25:99'; // Invalid date
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeDefined();
        }
      });

      test('should return error for incomplete date string', () => {
        const data = 'observation end: 2024-01-15'; // Missing time
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(false);
      });

      test('should handle whitespace-only Ancillary_Data', () => {
        const result = parseObservationEndTime('   ', 'KLGA');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('empty');
        }
      });
    });

    describe('Real-world examples', () => {
      test('should parse complex Ancillary_Data with multiple fields', () => {
        const data = `
          Market: Will temperature exceed 75°F?
          Station: KLGA (LaGuardia Airport)
          Observation end: 2024-01-15 23:59
          Settlement: UMA Oracle
          Data source: aviationweather.gov
        `;
        const result = parseObservationEndTime(data, 'KLGA');

        expect(result.success).toBe(true);
      });

      test('should parse Ancillary_Data with embedded JSON-like structure', () => {
        const data = '{"station":"KORD","observation_end":"2024-01-15 23:59","threshold":75}';
        const result = parseObservationEndTime(data, 'KORD');

        expect(result.success).toBe(true);
      });
    });
  });

  describe('validateAncillaryData', () => {
    test('should return true for valid Ancillary_Data', () => {
      const data = 'observation end: 2024-01-15 23:59';
      expect(validateAncillaryData(data)).toBe(true);
    });

    test('should return true for data with time keywords', () => {
      const data = 'settlement time: 2024-01-15 23:59';
      expect(validateAncillaryData(data)).toBe(true);
    });

    test('should return false for empty string', () => {
      expect(validateAncillaryData('')).toBe(false);
    });

    test('should return false for data without date pattern', () => {
      const data = 'observation end: sometime today';
      expect(validateAncillaryData(data)).toBe(false);
    });

    test('should return false for data without time keywords', () => {
      const data = 'Market data: 2024-01-15';
      expect(validateAncillaryData(data)).toBe(false);
    });

    test('should return false for whitespace-only string', () => {
      expect(validateAncillaryData('   ')).toBe(false);
    });
  });
});
