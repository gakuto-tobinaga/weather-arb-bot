/**
 * Unit tests for exponential backoff retry logic
 * 
 * Tests the retry utilities to ensure correct exponential backoff behavior,
 * proper logging, and error handling.
 * 
 * Requirements: 1.3, 9.5
 */

import { describe, test, expect, mock } from 'bun:test';
import {
  calculateBackoffDelay,
  withExponentialBackoff,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
  type RetryAttempt,
} from '../src/utils/retry';

describe('calculateBackoffDelay', () => {
  test('should calculate correct delays with default config', () => {
    // Requirement 9.5: Start at 5 seconds, double on each retry, max 60 seconds
    expect(calculateBackoffDelay(0)).toBe(5000); // 5s
    expect(calculateBackoffDelay(1)).toBe(10000); // 10s
    expect(calculateBackoffDelay(2)).toBe(20000); // 20s
    expect(calculateBackoffDelay(3)).toBe(40000); // 40s
    expect(calculateBackoffDelay(4)).toBe(60000); // 60s (capped at max)
    expect(calculateBackoffDelay(5)).toBe(60000); // 60s (capped at max)
  });

  test('should respect custom config', () => {
    const customConfig: RetryConfig = {
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      maxAttempts: 5,
      backoffMultiplier: 3,
    };

    expect(calculateBackoffDelay(0, customConfig)).toBe(1000); // 1s
    expect(calculateBackoffDelay(1, customConfig)).toBe(3000); // 3s
    expect(calculateBackoffDelay(2, customConfig)).toBe(9000); // 9s
    expect(calculateBackoffDelay(3, customConfig)).toBe(10000); // 10s (capped)
  });

  test('should handle zero attempt number', () => {
    expect(calculateBackoffDelay(0)).toBe(5000);
  });

  test('should cap at maxDelayMs', () => {
    const config: RetryConfig = {
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      maxAttempts: 10,
      backoffMultiplier: 2,
    };

    // After a few attempts, delay should be capped
    expect(calculateBackoffDelay(10, config)).toBe(5000);
    expect(calculateBackoffDelay(100, config)).toBe(5000);
  });
});

describe('withExponentialBackoff', () => {
  test('should succeed on first attempt if operation succeeds', async () => {
    const operation = mock(() => Promise.resolve('success'));
    const logger = mock(() => {});

    const result = await withExponentialBackoff(operation, DEFAULT_RETRY_CONFIG, logger);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(logger).not.toHaveBeenCalled(); // No retries needed
  });

  test('should retry on failure and eventually succeed', async () => {
    let attemptCount = 0;
    const operation = mock(() => {
      attemptCount++;
      if (attemptCount < 3) {
        return Promise.reject(new Error('Temporary failure'));
      }
      return Promise.resolve('success');
    });
    const logger = mock(() => {});

    const config: RetryConfig = {
      initialDelayMs: 10, // Use small delays for testing
      maxDelayMs: 100,
      maxAttempts: 5,
      backoffMultiplier: 2,
    };

    const result = await withExponentialBackoff(operation, config, logger);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger).toHaveBeenCalledTimes(2); // 2 retries before success
  });

  test('should log retry attempts with correct information', async () => {
    let attemptCount = 0;
    const operation = mock(() => {
      attemptCount++;
      if (attemptCount < 2) {
        return Promise.reject(new Error('Test error'));
      }
      return Promise.resolve('success');
    });

    const loggedAttempts: RetryAttempt[] = [];
    const logger = mock((attempt: RetryAttempt) => {
      loggedAttempts.push(attempt);
    });

    const config: RetryConfig = {
      initialDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 5,
      backoffMultiplier: 2,
    };

    await withExponentialBackoff(operation, config, logger);

    // Should have logged 1 retry attempt
    expect(loggedAttempts).toHaveLength(1);
    expect(loggedAttempts[0].attemptNumber).toBe(0);
    expect(loggedAttempts[0].delayMs).toBe(10);
    expect(loggedAttempts[0].timestamp).toBeInstanceOf(Date);
    expect(loggedAttempts[0].error).toBeInstanceOf(Error);
  });

  test('should throw last error after all attempts fail', async () => {
    const testError = new Error('Persistent failure');
    const operation = mock(() => Promise.reject(testError));
    const logger = mock(() => {});

    const config: RetryConfig = {
      initialDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 3,
      backoffMultiplier: 2,
    };

    await expect(
      withExponentialBackoff(operation, config, logger)
    ).rejects.toThrow('Persistent failure');

    expect(operation).toHaveBeenCalledTimes(3);
    expect(logger).toHaveBeenCalledTimes(2); // 2 retries before final failure
  });

  test('should respect maxAttempts', async () => {
    const operation = mock(() => Promise.reject(new Error('Always fails')));
    const logger = mock(() => {});

    const config: RetryConfig = {
      initialDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 2,
      backoffMultiplier: 2,
    };

    await expect(
      withExponentialBackoff(operation, config, logger)
    ).rejects.toThrow();

    expect(operation).toHaveBeenCalledTimes(2);
    expect(logger).toHaveBeenCalledTimes(1); // Only 1 retry for 2 max attempts
  });

  test('should use exponential backoff delays', async () => {
    const operation = mock(() => Promise.reject(new Error('Fail')));
    const loggedDelays: number[] = [];
    const logger = mock((attempt: RetryAttempt) => {
      loggedDelays.push(attempt.delayMs);
    });

    const config: RetryConfig = {
      initialDelayMs: 5,
      maxDelayMs: 100,
      maxAttempts: 4,
      backoffMultiplier: 2,
    };

    await expect(
      withExponentialBackoff(operation, config, logger)
    ).rejects.toThrow();

    // Should have exponentially increasing delays: 5, 10, 20
    expect(loggedDelays).toEqual([5, 10, 20]);
  });

  test('should handle non-Error exceptions', async () => {
    const operation = mock(() => Promise.reject('String error'));
    const logger = mock(() => {});

    const config: RetryConfig = {
      initialDelayMs: 10,
      maxDelayMs: 100,
      maxAttempts: 2,
      backoffMultiplier: 2,
    };

    await expect(
      withExponentialBackoff(operation, config, logger)
    ).rejects.toBe('String error');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('should work with default config when not provided', async () => {
    const operation = mock(() => Promise.resolve('success'));

    const result = await withExponentialBackoff(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  test('should have correct default values', () => {
    // Requirement 9.5: Start at 5 seconds, double on each retry, max 60 seconds
    expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(5000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(60000);
    expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(5);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
  });
});
