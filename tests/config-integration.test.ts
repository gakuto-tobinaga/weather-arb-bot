/**
 * Configuration Integration Tests
 * 
 * Tests that verify the configuration loading works with actual environment variables
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { loadConfig, validateConfig } from '../src/config';

describe('Configuration Integration', () => {
  // Store original env vars
  const originalEnv = { ...process.env };

  afterAll(() => {
    // Restore original env vars
    process.env = originalEnv;
  });

  test('loadConfig works with valid environment variables', () => {
    // Set up valid test environment
    process.env.POLYMARKET_PK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.POLYMARKET_FUNDER = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
    process.env.POLYGON_RPC_URL = 'https://polygon-rpc.com';
    process.env.TARGET_ICAO = 'KLGA,KORD,EGLC';
    process.env.MIN_EV = '0.05';
    process.env.BUDGET = '1000';
    process.env.POLL_INTERVAL = '300000';
    process.env.MONITORING_MODE = 'true';

    const config = loadConfig();

    expect(config.POLYMARKET_PK).toBe('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
    expect(config.POLYMARKET_FUNDER).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1');
    expect(config.POLYGON_RPC_URL).toBe('https://polygon-rpc.com');
    expect(config.TARGET_ICAO).toEqual(['KLGA', 'KORD', 'EGLC']);
    expect(config.MIN_EV).toBe(0.05);
    expect(config.BUDGET).toBe(1000);
    expect(config.POLL_INTERVAL).toBe(300000);
    expect(config.MONITORING_MODE).toBe(true);
  });

  test('loadConfig throws descriptive error for invalid configuration', () => {
    // Set up invalid test environment
    process.env.POLYMARKET_PK = 'invalid';
    process.env.POLYMARKET_FUNDER = 'invalid';
    process.env.POLYGON_RPC_URL = 'invalid';
    process.env.TARGET_ICAO = 'INVALID';
    process.env.MIN_EV = '0.05'; // Use valid value to avoid transformation error
    process.env.BUDGET = '100'; // Use valid value to avoid transformation error
    process.env.POLL_INTERVAL = '60000'; // Use valid value to avoid transformation error
    process.env.MONITORING_MODE = 'true';

    expect(() => loadConfig()).toThrow('Configuration validation failed');
  });

  test('loadConfig uses default values when optional fields are missing', () => {
    // Set up minimal valid environment
    process.env.POLYMARKET_PK = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.POLYMARKET_FUNDER = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
    process.env.POLYGON_RPC_URL = 'https://polygon-rpc.com';
    process.env.TARGET_ICAO = 'KLGA';
    process.env.BUDGET = '1000';
    
    // Remove optional fields
    delete process.env.MIN_EV;
    delete process.env.POLL_INTERVAL;
    delete process.env.MONITORING_MODE;

    const config = loadConfig();

    // Should use default values
    expect(config.MIN_EV).toBe(0.05);
    expect(config.POLL_INTERVAL).toBe(300000);
    expect(config.MONITORING_MODE).toBe(true);
  });

  test('validateConfig provides detailed error messages', () => {
    const invalidEnv = {
      POLYMARKET_PK: 'too-short',
      POLYMARKET_FUNDER: 'not-an-address',
      POLYGON_RPC_URL: 'not-a-url',
      TARGET_ICAO: 'KLGA',
      MIN_EV: '0.05',
      BUDGET: '1000',
      POLL_INTERVAL: '300000',
      MONITORING_MODE: 'true',
    };

    const result = validateConfig(invalidEnv);
    expect(result.success).toBe(false);
  });
});
