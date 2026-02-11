/**
 * Configuration and Validation
 * 
 * Defines the configuration schema and validation logic for the weather-arb-bot.
 * Uses zod for runtime validation of environment variables to ensure type safety
 * and prevent runtime errors from invalid configuration.
 * 
 * Requirements: 11.4, 11.5, 11.6, 11.7, 14.2
 */

import { z } from 'zod';

/**
 * ICAO airport codes supported by the bot
 * - KLGA: LaGuardia Airport (New York, Eastern Time)
 * - KORD: O'Hare International Airport (Chicago, Central Time)
 * - EGLC: London City Airport (London, Greenwich Mean Time)
 */
export type ICAOCode = 'KLGA' | 'KORD' | 'EGLC';

/**
 * Zod schema for validating environment variables
 * 
 * This schema validates all required configuration at startup and transforms
 * string values to appropriate types (numbers, booleans, arrays).
 * 
 * Validation rules:
 * - POLYMARKET_PK: Must be exactly 64 hexadecimal characters (private key)
 * - POLYMARKET_FUNDER: Must be a valid Ethereum address (0x + 40 hex chars)
 * - POLYGON_RPC_URL: Must be a valid HTTP/HTTPS URL
 * - TARGET_ICAO: Comma-separated list of valid ICAO codes
 * - MIN_EV: Minimum expected value threshold (0-1 range)
 * - BUDGET: Total trading budget in USDC (must be positive)
 * - POLL_INTERVAL: Polling interval in milliseconds (minimum 1 minute)
 * - MONITORING_MODE: Boolean flag for monitoring-only mode
 */
export const ConfigSchema = z.object({
  /**
   * Private key for Polymarket authentication
   * Must be 64 hexadecimal characters (32 bytes)
   * 
   * Requirement 11.6: Validate POLYMARKET_PK format
   */
  POLYMARKET_PK: z.string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'POLYMARKET_PK must be a 64-character hexadecimal string (private key without 0x prefix)'
    ),

  /**
   * Ethereum address of the Polymarket funder/proxy wallet
   * Must be a valid Ethereum address (0x + 40 hex characters)
   * 
   * Requirement 11.5: Validate POLYMARKET_FUNDER (Ethereum address)
   */
  POLYMARKET_FUNDER: z.string()
    .regex(
      /^0x[0-9a-fA-F]{40}$/,
      'POLYMARKET_FUNDER must be a valid Ethereum address (0x followed by 40 hexadecimal characters)'
    ),

  /**
   * Polymarket API Key for CLOB access
   * UUID format string
   * 
   * Requirement 11.5: Validate POLYMARKET_API_KEY
   */
  POLYMARKET_API_KEY: z.string()
    .min(1, 'POLYMARKET_API_KEY is required'),

  /**
   * Polymarket API Secret for CLOB access
   * Base64-encoded string
   * 
   * Requirement 11.5: Validate POLYMARKET_API_SECRET
   */
  POLYMARKET_API_SECRET: z.string()
    .min(1, 'POLYMARKET_API_SECRET is required'),

  /**
   * Polymarket API Passphrase for CLOB access
   * Hexadecimal string
   * 
   * Requirement 11.5: Validate POLYMARKET_API_PASSPHRASE
   */
  POLYMARKET_API_PASSPHRASE: z.string()
    .min(1, 'POLYMARKET_API_PASSPHRASE is required'),

  /**
   * Polygon RPC URL for blockchain interactions
   * Must be a valid HTTP or HTTPS URL
   * 
   * Requirement 11.7: Validate POLYGON_RPC_URL format
   */
  POLYGON_RPC_URL: z.string()
    .url('POLYGON_RPC_URL must be a valid HTTP/HTTPS URL'),

  /**
   * Target ICAO airport codes for weather monitoring
   * Comma-separated list that gets transformed into an array
   * Each code must be one of: KLGA, KORD, EGLC
   * 
   * Requirement 11.7: Validate TARGET_ICAO (enum)
   */
  TARGET_ICAO: z.string()
    .transform((s) => s.split(',').map((code) => code.trim()))
    .pipe(
      z.array(z.enum(['KLGA', 'KORD', 'EGLC']))
        .min(1, 'TARGET_ICAO must contain at least one valid ICAO code')
    ),

  /**
   * Minimum expected value threshold for trade signals
   * String input transformed to number, must be between 0 and 1
   * Default: 0.05 (5% edge)
   * 
   * Requirement 14.2: Transform and validate numeric fields
   */
  MIN_EV: z.string()
    .default('0.05')
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error('MIN_EV must be a valid number');
      }
      return num;
    })
    .pipe(
      z.number()
        .min(0, 'MIN_EV must be at least 0')
        .max(1, 'MIN_EV must be at most 1')
    ),

  /**
   * Total trading budget in USDC
   * String input transformed to number, must be positive
   * 
   * Requirement 14.2: Transform and validate numeric fields
   */
  BUDGET: z.string()
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error('BUDGET must be a valid number');
      }
      return num;
    })
    .pipe(
      z.number()
        .positive('BUDGET must be a positive number')
    ),

  /**
   * Polling interval in milliseconds
   * String input transformed to number, minimum 1 minute (60000ms)
   * Default: 300000 (5 minutes)
   * 
   * Requirement 14.2: Transform and validate numeric fields
   */
  POLL_INTERVAL: z.string()
    .default('300000')
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error('POLL_INTERVAL must be a valid number');
      }
      return num;
    })
    .pipe(
      z.number()
        .min(60000, 'POLL_INTERVAL must be at least 60000 milliseconds (1 minute)')
    ),

  /**
   * Monitoring mode flag
   * When true, the bot logs signals but doesn't place actual orders
   * String input transformed to boolean
   * Default: true (safe default for initial deployment)
   * 
   * Requirement 14.2: Transform and validate boolean fields
   */
  MONITORING_MODE: z.string()
    .default('true')
    .transform((val) => val.toLowerCase() === 'true'),
});

/**
 * Inferred TypeScript type from the ConfigSchema
 * This provides full type safety for the configuration object
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * 
 * This function reads environment variables, validates them against the schema,
 * and returns a typed Config object. If validation fails, it throws a detailed
 * error message.
 * 
 * Requirement 11.4: Validate all required environment variables using zod schema
 * Requirement 11.5: Exit with descriptive error message on validation failure
 * 
 * @returns Validated and typed Config object
 * @throws {z.ZodError} If validation fails with detailed error messages
 * 
 * @example
 * ```typescript
 * try {
 *   const config = loadConfig();
 *   console.log(`Trading budget: ${config.BUDGET} USDC`);
 *   console.log(`Monitoring mode: ${config.MONITORING_MODE}`);
 * } catch (error) {
 *   console.error('Configuration validation failed:', error);
 *   process.exit(1);
 * }
 * ```
 */
export function loadConfig(): Config {
  const result = ConfigSchema.safeParse({
    POLYMARKET_PK: process.env.POLYMARKET_PK,
    POLYMARKET_FUNDER: process.env.POLYMARKET_FUNDER,
    POLYMARKET_API_KEY: process.env.POLYMARKET_API_KEY,
    POLYMARKET_API_SECRET: process.env.POLYMARKET_API_SECRET,
    POLYMARKET_API_PASSPHRASE: process.env.POLYMARKET_API_PASSPHRASE,
    POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
    TARGET_ICAO: process.env.TARGET_ICAO,
    MIN_EV: process.env.MIN_EV,
    BUDGET: process.env.BUDGET,
    POLL_INTERVAL: process.env.POLL_INTERVAL,
    MONITORING_MODE: process.env.MONITORING_MODE,
  });

  if (!result.success) {
    // In zod v4, the error structure is different
    // Format validation errors for better readability
    const error = result.error;
    const errorMessage = error.toString();

    throw new Error(
      `Configuration validation failed:\n${errorMessage}\n\n` +
      'Please check your .env file and ensure all required variables are set correctly.'
    );
  }

  return result.data;
}

/**
 * Validate configuration without loading it
 * Useful for testing and validation without side effects
 * 
 * @param env - Environment variables object to validate
 * @returns Validation result with success flag and data/error
 */
export function validateConfig(env: Record<string, string | undefined>): {
  success: boolean;
  data?: Config;
  error?: z.ZodError;
} {
  const result = ConfigSchema.safeParse(env);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
