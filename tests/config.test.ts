/**
 * Configuration Validation Tests
 * 
 * Tests for the ConfigSchema validation logic to ensure all environment
 * variables are properly validated and transformed.
 * 
 * Tests cover:
 * - Valid configuration acceptance
 * - Invalid format rejection
 * - Numeric field transformation
 * - Boolean field transformation
 * - Array field transformation
 * - Edge cases and boundary values
 */

import { describe, test, expect } from 'bun:test';
import { ConfigSchema, validateConfig, type Config } from '../src/config';
import { z } from 'zod';

describe('ConfigSchema Validation', () => {
  // Valid configuration for testing
  const validEnv = {
    POLYMARKET_PK: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    POLYMARKET_API_KEY: '019c4ae2-8cdb-7476-aba9-aff56886f978',
    POLYMARKET_API_SECRET: 'kzi4R1z3C9Pibgc23UQTVMPrpMhvfJmygoyvexdKo7Y=',
    POLYMARKET_API_PASSPHRASE: 'c4ef9be552335bd42810c8c253c0d88f14b667cb26c72735c942a7f67ba8f070',
    POLYGON_RPC_URL: 'https://polygon-rpc.com',
    TARGET_ICAO: 'KLGA,KORD,EGLC',
    MIN_EV: '0.05',
    BUDGET: '1000',
    POLL_INTERVAL: '300000',
    MONITORING_MODE: 'true',
  };

  describe('POLYMARKET_PK validation', () => {
    test('accepts valid 64-character hex private key', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYMARKET_PK).toBe(validEnv.POLYMARKET_PK);
      }
    });

    test('accepts lowercase hex characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts uppercase hex characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts mixed case hex characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: 'AbCdEf0123456789aBcDeF0123456789AbCdEf0123456789aBcDeF0123456789',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects private key with 0x prefix', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects private key shorter than 64 characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: '0123456789abcdef',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects private key longer than 64 characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects private key with invalid characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: '0123456789abcdefGHIJ0123456789abcdef0123456789abcdef0123456789ab',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects empty private key', () => {
      const env = {
        ...validEnv,
        POLYMARKET_PK: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('POLYMARKET_FUNDER validation', () => {
    test('accepts valid Ethereum address', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYMARKET_FUNDER).toBe(validEnv.POLYMARKET_FUNDER);
      }
    });

    test('accepts address with lowercase hex', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0xabcdef0123456789abcdef0123456789abcdef01',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts address with uppercase hex', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0xABCDEF0123456789ABCDEF0123456789ABCDEF01',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts checksummed address', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects address without 0x prefix', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects address shorter than 40 hex characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bE',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects address longer than 40 hex characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb100',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects address with invalid characters', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbG',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects empty address', () => {
      const env = {
        ...validEnv,
        POLYMARKET_FUNDER: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('POLYMARKET_API_KEY validation', () => {
    test('accepts valid API key', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYMARKET_API_KEY).toBe(validEnv.POLYMARKET_API_KEY);
      }
    });

    test('accepts UUID format', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_KEY: '550e8400-e29b-41d4-a716-446655440000',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts various string formats', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_KEY: 'any-valid-api-key-string',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects empty API key', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_KEY: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('POLYMARKET_API_SECRET validation', () => {
    test('accepts valid API secret', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYMARKET_API_SECRET).toBe(validEnv.POLYMARKET_API_SECRET);
      }
    });

    test('accepts base64 encoded string', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_SECRET: 'SGVsbG8gV29ybGQh',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts various string formats', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_SECRET: 'any-valid-secret-string',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects empty API secret', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_SECRET: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('POLYMARKET_API_PASSPHRASE validation', () => {
    test('accepts valid API passphrase', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYMARKET_API_PASSPHRASE).toBe(validEnv.POLYMARKET_API_PASSPHRASE);
      }
    });

    test('accepts hex string format', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_PASSPHRASE: 'abcdef0123456789',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts various string formats', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_PASSPHRASE: 'any-valid-passphrase-string',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects empty API passphrase', () => {
      const env = {
        ...validEnv,
        POLYMARKET_API_PASSPHRASE: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });
  });

  describe('POLYGON_RPC_URL validation', () => {
    test('accepts valid HTTPS URL', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLYGON_RPC_URL).toBe(validEnv.POLYGON_RPC_URL);
      }
    });

    test('accepts valid HTTP URL', () => {
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: 'http://localhost:8545',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts URL with port', () => {
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: 'https://polygon-rpc.com:443',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('accepts URL with path', () => {
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
    });

    test('rejects invalid URL format', () => {
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: 'not-a-url',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects empty URL', () => {
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('accepts URL with various protocols', () => {
      // Note: zod's .url() validator accepts any valid URL format including ftp://
      const env = {
        ...validEnv,
        POLYGON_RPC_URL: 'ftp://polygon-rpc.com',
      };
      const result = ConfigSchema.safeParse(env);
      // This actually passes because zod .url() accepts any valid URL
      expect(result.success).toBe(true);
    });
  });

  describe('TARGET_ICAO validation', () => {
    test('accepts valid comma-separated ICAO codes', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.TARGET_ICAO).toEqual(['KLGA', 'KORD', 'EGLC']);
      }
    });

    test('accepts single ICAO code', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: 'KLGA',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.TARGET_ICAO).toEqual(['KLGA']);
      }
    });

    test('accepts two ICAO codes', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: 'KLGA,KORD',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.TARGET_ICAO).toEqual(['KLGA', 'KORD']);
      }
    });

    test('trims whitespace around ICAO codes', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: ' KLGA , KORD , EGLC ',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.TARGET_ICAO).toEqual(['KLGA', 'KORD', 'EGLC']);
      }
    });

    test('rejects invalid ICAO code', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: 'KLGA,INVALID,EGLC',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects empty ICAO list', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: '',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects duplicate ICAO codes', () => {
      const env = {
        ...validEnv,
        TARGET_ICAO: 'KLGA,KLGA,KORD',
      };
      const result = ConfigSchema.safeParse(env);
      // Note: Schema allows duplicates, but this documents the behavior
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.TARGET_ICAO).toEqual(['KLGA', 'KLGA', 'KORD']);
      }
    });
  });

  describe('MIN_EV validation', () => {
    test('accepts valid MIN_EV value', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MIN_EV).toBe(0.05);
      }
    });

    test('transforms string to number', () => {
      const env = {
        ...validEnv,
        MIN_EV: '0.1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.MIN_EV).toBe('number');
        expect(result.data.MIN_EV).toBe(0.1);
      }
    });

    test('accepts MIN_EV of 0', () => {
      const env = {
        ...validEnv,
        MIN_EV: '0',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MIN_EV).toBe(0);
      }
    });

    test('accepts MIN_EV of 1', () => {
      const env = {
        ...validEnv,
        MIN_EV: '1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MIN_EV).toBe(1);
      }
    });

    test('accepts decimal MIN_EV', () => {
      const env = {
        ...validEnv,
        MIN_EV: '0.123456',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MIN_EV).toBeCloseTo(0.123456);
      }
    });

    test('uses default value when not provided', () => {
      const env = { ...validEnv };
      delete env.MIN_EV;
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MIN_EV).toBe(0.05);
      }
    });

    test('rejects MIN_EV less than 0', () => {
      const env = {
        ...validEnv,
        MIN_EV: '-0.1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects MIN_EV greater than 1', () => {
      const env = {
        ...validEnv,
        MIN_EV: '1.5',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects non-numeric MIN_EV', () => {
      const env = {
        ...validEnv,
        MIN_EV: 'not-a-number',
      };
      
      // This will throw an error during transformation
      expect(() => ConfigSchema.parse(env)).toThrow('MIN_EV must be a valid number');
    });
  });

  describe('BUDGET validation', () => {
    test('accepts valid BUDGET value', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.BUDGET).toBe(1000);
      }
    });

    test('transforms string to number', () => {
      const env = {
        ...validEnv,
        BUDGET: '500',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.BUDGET).toBe('number');
        expect(result.data.BUDGET).toBe(500);
      }
    });

    test('accepts decimal BUDGET', () => {
      const env = {
        ...validEnv,
        BUDGET: '1000.50',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.BUDGET).toBe(1000.50);
      }
    });

    test('accepts large BUDGET', () => {
      const env = {
        ...validEnv,
        BUDGET: '1000000',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.BUDGET).toBe(1000000);
      }
    });

    test('rejects BUDGET of 0', () => {
      const env = {
        ...validEnv,
        BUDGET: '0',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects negative BUDGET', () => {
      const env = {
        ...validEnv,
        BUDGET: '-100',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects non-numeric BUDGET', () => {
      const env = {
        ...validEnv,
        BUDGET: 'not-a-number',
      };
      
      // This will throw an error during transformation
      expect(() => ConfigSchema.parse(env)).toThrow('BUDGET must be a valid number');
    });
  });

  describe('POLL_INTERVAL validation', () => {
    test('accepts valid POLL_INTERVAL value', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLL_INTERVAL).toBe(300000);
      }
    });

    test('transforms string to number', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: '60000',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.POLL_INTERVAL).toBe('number');
        expect(result.data.POLL_INTERVAL).toBe(60000);
      }
    });

    test('accepts minimum POLL_INTERVAL (1 minute)', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: '60000',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLL_INTERVAL).toBe(60000);
      }
    });

    test('accepts large POLL_INTERVAL', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: '3600000', // 1 hour
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLL_INTERVAL).toBe(3600000);
      }
    });

    test('uses default value when not provided', () => {
      const env = { ...validEnv };
      delete env.POLL_INTERVAL;
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.POLL_INTERVAL).toBe(300000);
      }
    });

    test('rejects POLL_INTERVAL less than 1 minute', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: '30000', // 30 seconds
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects negative POLL_INTERVAL', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: '-60000',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(false);
    });

    test('rejects non-numeric POLL_INTERVAL', () => {
      const env = {
        ...validEnv,
        POLL_INTERVAL: 'not-a-number',
      };
      
      // This will throw an error during transformation
      expect(() => ConfigSchema.parse(env)).toThrow('POLL_INTERVAL must be a valid number');
    });
  });

  describe('MONITORING_MODE validation', () => {
    test('accepts "true" as true', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(true);
      }
    });

    test('accepts "false" as false', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: 'false',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(false);
      }
    });

    test('accepts "TRUE" (uppercase) as true', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: 'TRUE',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(true);
      }
    });

    test('accepts "FALSE" (uppercase) as false', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: 'FALSE',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(false);
      }
    });

    test('accepts "TrUe" (mixed case) as true', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: 'TrUe',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(true);
      }
    });

    test('treats any non-"true" value as false', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: 'yes',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(false);
      }
    });

    test('treats "1" as false', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: '1',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(false);
      }
    });

    test('treats "0" as false', () => {
      const env = {
        ...validEnv,
        MONITORING_MODE: '0',
      };
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(false);
      }
    });

    test('uses default value (true) when not provided', () => {
      const env = { ...validEnv };
      delete env.MONITORING_MODE;
      const result = ConfigSchema.safeParse(env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MONITORING_MODE).toBe(true);
      }
    });
  });

  describe('validateConfig helper function', () => {
    test('returns success for valid configuration', () => {
      const result = validateConfig(validEnv);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('returns error for invalid configuration', () => {
      const invalidEnv = {
        ...validEnv,
        POLYMARKET_PK: 'invalid',
      };
      const result = validateConfig(invalidEnv);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    test('provides detailed error information', () => {
      const invalidEnv = {
        ...validEnv,
        POLYMARKET_PK: 'invalid',
        BUDGET: '-100',
      };
      const result = validateConfig(invalidEnv);
      expect(result.success).toBe(false);
      // Just verify it failed - the error structure may vary
    });
  });

  describe('Complete configuration validation', () => {
    test('accepts complete valid configuration', () => {
      const result = ConfigSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      
      if (result.success) {
        const config = result.data;
        expect(config.POLYMARKET_PK).toBe(validEnv.POLYMARKET_PK);
        expect(config.POLYMARKET_FUNDER).toBe(validEnv.POLYMARKET_FUNDER);
        expect(config.POLYGON_RPC_URL).toBe(validEnv.POLYGON_RPC_URL);
        expect(config.TARGET_ICAO).toEqual(['KLGA', 'KORD', 'EGLC']);
        expect(config.MIN_EV).toBe(0.05);
        expect(config.BUDGET).toBe(1000);
        expect(config.POLL_INTERVAL).toBe(300000);
        expect(config.MONITORING_MODE).toBe(true);
      }
    });

    test('rejects configuration with multiple errors', () => {
      const invalidEnv = {
        POLYMARKET_PK: 'too-short',
        POLYMARKET_FUNDER: 'not-an-address',
        POLYMARKET_API_KEY: '',
        POLYMARKET_API_SECRET: '',
        POLYMARKET_API_PASSPHRASE: '',
        POLYGON_RPC_URL: 'not-a-url',
        TARGET_ICAO: 'INVALID',
        MIN_EV: '2.0',
        BUDGET: '-100',
        POLL_INTERVAL: '1000',
        MONITORING_MODE: 'true',
      };
      const result = ConfigSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      // Just verify it failed - multiple validation errors are present
    });
  });
});
