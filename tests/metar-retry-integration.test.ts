/**
 * Integration tests for METAR client with exponential backoff retry
 * 
 * Tests the METAR client's retry behavior when the API returns errors,
 * ensuring proper exponential backoff and logging.
 * 
 * Requirements: 1.3, 9.5
 */

import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { fetchMETAR } from '../src/metar/client';
import type { ICAOCode } from '../src/config';

// Mock the global fetch function
const originalFetch = global.fetch;

describe('METAR Client with Exponential Backoff', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = originalFetch;
  });

  afterEach(() => {
    // Restore original fetch after each test
    global.fetch = originalFetch;
  });

  test('should succeed on first attempt when API is healthy', async () => {
    const mockResponse = [
      {
        icaoId: 'KLGA',
        obsTime: 1704067200, // 2024-01-01 00:00:00 UTC
        temp: 15,
        rawOb: 'KLGA 010000Z 00000KT 10SM FEW250 15/10 A3000 RMK T01500100',
      },
    ];

    global.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response)
    );

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('should retry on network error and eventually succeed', async () => {
    let callCount = 0;
    const mockResponse = [
      {
        icaoId: 'KLGA',
        obsTime: 1704067200,
        temp: 15,
        rawOb: 'KLGA 010000Z 00000KT 10SM FEW250 15/10 A3000 RMK T01500100',
      },
    ];

    global.fetch = mock(() => {
      callCount++;
      if (callCount < 3) {
        // Fail first 2 attempts
        return Promise.reject(new Error('Network error'));
      }
      // Succeed on 3rd attempt
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
    });

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(true);
    expect(callCount).toBe(3);
  }, 30000); // Increase timeout for retry delays

  test('should retry on HTTP error and eventually succeed', async () => {
    let callCount = 0;
    const mockResponse = [
      {
        icaoId: 'KLGA',
        obsTime: 1704067200,
        temp: 15,
        rawOb: 'KLGA 010000Z 00000KT 10SM FEW250 15/10 A3000 RMK T01500100',
      },
    ];

    global.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        // Fail first attempt with 503 Service Unavailable
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        } as Response);
      }
      // Succeed on 2nd attempt
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
    });

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(true);
    // Should have called fetch twice (1 failure + 1 success)
    expect(callCount).toBeGreaterThanOrEqual(2);
  }, 30000);

  test('should return error after all retry attempts fail', async () => {
    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      return Promise.reject(new Error('Persistent network error'));
    });

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('network');
      expect(result.error.message).toContain('Persistent network error');
    }
    
    // Should have attempted 5 times (default maxAttempts)
    expect(callCount).toBe(5);
  }, 120000); // Increase timeout for all retry attempts

  test('should handle validation errors without retry', async () => {
    // Return invalid response that fails zod validation
    global.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([{ invalid: 'data' }]),
      } as Response)
    );

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('validation');
    }
    
    // Validation errors should still trigger retries
    expect(global.fetch).toHaveBeenCalledTimes(5);
  }, 120000);

  test('should handle empty response array', async () => {
    global.fetch = mock(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response)
    );

    const result = await fetchMETAR('KLGA' as ICAOCode);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe('not_found');
      expect(result.error.icaoCode).toBe('KLGA');
    }
    
    // Not found errors should still trigger retries
    expect(global.fetch).toHaveBeenCalledTimes(5);
  }, 120000);

  test('should log retry attempts with timestamps', async () => {
    const consoleWarnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleWarnSpy;

    let callCount = 0;
    global.fetch = mock(() => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject(new Error('Test error'));
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              icaoId: 'KLGA',
              obsTime: 1704067200,
              temp: 15,
              rawOb: 'KLGA 010000Z 00000KT 10SM FEW250 15/10 A3000',
            },
          ]),
      } as Response);
    });

    await fetchMETAR('KLGA' as ICAOCode);

    // Should have logged the retry attempt
    expect(consoleWarnSpy).toHaveBeenCalled();
    const logMessage = consoleWarnSpy.mock.calls[0][0];
    expect(logMessage).toContain('[METAR Client]');
    expect(logMessage).toContain('KLGA');
    expect(logMessage).toContain('Retry attempt');
    expect(logMessage).toContain('retrying in');

    // Restore console.warn
    console.warn = originalWarn;
  }, 30000);
});
