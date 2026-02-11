/**
 * Unit tests for METAR client
 * 
 * Tests the fetchMETAR and fetchAllStations functions with real API calls
 * and validates the response structure.
 */

import { describe, test, expect } from 'bun:test';
import { fetchMETAR, fetchAllStations } from '../src/metar/client';
import type { ICAOCode } from '../src/config';

describe('METAR Client', () => {
  describe('fetchMETAR', () => {
    test('should fetch METAR data for KLGA', async () => {
      const result = await fetchMETAR('KLGA');

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.icaoCode).toBe('KLGA');
        expect(result.value.rawMETAR).toBeDefined();
        expect(result.value.rawMETAR.length).toBeGreaterThan(0);
        expect(typeof result.value.temperature).toBe('number');
        expect(result.value.observationTime).toBeDefined();
        expect(result.value.observationTime.utc).toBeInstanceOf(Date);
      }
    }, 10000); // 10 second timeout for network request

    test('should fetch METAR data for KORD', async () => {
      const result = await fetchMETAR('KORD');

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.icaoCode).toBe('KORD');
        expect(result.value.rawMETAR).toBeDefined();
      }
    }, 20000); // Increased timeout as KORD can be slower

    test('should fetch METAR data for EGLC', async () => {
      const result = await fetchMETAR('EGLC');

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.value.icaoCode).toBe('EGLC');
        expect(result.value.rawMETAR).toBeDefined();
      }
    }, 10000);

    test('should return temperature with correct precision', async () => {
      const result = await fetchMETAR('KLGA');

      expect(result.success).toBe(true);

      if (result.success) {
        // Temperature should be a number
        const temp = result.value.temperature as number;
        
        // Should be within reasonable range for weather (-50°C to 50°C)
        expect(temp).toBeGreaterThanOrEqual(-50);
        expect(temp).toBeLessThanOrEqual(50);
        
        // Should have at most 1 decimal place (0.1°C precision)
        const decimalPlaces = (temp.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(1);
      }
    }, 10000);
  });

  describe('fetchAllStations', () => {
    test('should fetch METAR data for multiple stations in parallel', async () => {
      const stations: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
      const results = await fetchAllStations(stations);

      // Should return a Map with all requested stations
      expect(results.size).toBe(3);
      expect(results.has('KLGA')).toBe(true);
      expect(results.has('KORD')).toBe(true);
      expect(results.has('EGLC')).toBe(true);

      // All results should be successful
      for (const [icao, result] of results) {
        expect(result.success).toBe(true);
        
        if (result.success) {
          expect(result.value.icaoCode).toBe(icao);
          expect(result.value.rawMETAR).toBeDefined();
        }
      }
    }, 15000); // 15 second timeout for parallel requests

    test('should fetch all stations and return results', async () => {
      const stations: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];

      // Verify parallel fetching works correctly
      const results = await fetchAllStations(stations);

      // Should return all results
      expect(results.size).toBe(3);
      
      // All stations should be present
      for (const station of stations) {
        expect(results.has(station)).toBe(true);
      }
    }, 15000); // 15 second timeout
  });

  describe('Error handling', () => {
    test('should handle network errors gracefully', async () => {
      // Mock fetch to simulate network error
      const originalFetch = global.fetch;
      global.fetch = async () => {
        throw new Error('Network error');
      };

      const result = await fetchMETAR('KLGA');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('network');
        expect(result.error.message).toContain('Network error');
      }

      // Restore original fetch
      global.fetch = originalFetch;
    }, 120000); // Increase timeout to account for retry logic (5 attempts with exponential backoff)

    test('should handle HTTP errors', async () => {
      // Mock fetch to simulate 404 error
      const originalFetch = global.fetch;
      global.fetch = async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await fetchMETAR('KLGA');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('network');
        expect(result.error.statusCode).toBe(404);
      }

      // Restore original fetch
      global.fetch = originalFetch;
    }, 120000); // Increase timeout to account for retry logic
  });
});
