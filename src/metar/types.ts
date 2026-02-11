/**
 * METAR-specific type definitions
 * 
 * Defines types for METAR observations, API responses, and related data structures.
 * 
 * Requirements: 1.1, 1.2, 14.1, 14.3
 */

import { z } from 'zod';
import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';
import type { ICAOCode } from '../config';

/**
 * T-Group parsing result
 * Contains the extracted temperature and dewpoint from METAR Remarks section
 * 
 * Requirement 14.6: Define custom types for T-Group parsing results
 */
export type TGroupResult = {
  readonly temperature: PrecisionTemperature;
  readonly dewpoint: PrecisionTemperature;
  readonly rawString: string;
};

/**
 * Option type for values that may or may not exist
 * Used for T-Group data which may be missing from METAR observations
 */
export type Option<T> = { type: 'some'; value: T } | { type: 'none' };

/**
 * Helper functions for Option type
 */
export const Option = {
  some: <T>(value: T): Option<T> => ({ type: 'some', value }),
  none: <T>(): Option<T> => ({ type: 'none' }),
  isSome: <T>(opt: Option<T>): opt is { type: 'some'; value: T } => opt.type === 'some',
  isNone: <T>(opt: Option<T>): opt is { type: 'none' } => opt.type === 'none',
  unwrap: <T>(opt: Option<T>): T => {
    if (opt.type === 'some') return opt.value;
    throw new Error('Called unwrap on None');
  },
  unwrapOr: <T>(opt: Option<T>, defaultValue: T): T => {
    return opt.type === 'some' ? opt.value : defaultValue;
  },
};

/**
 * Complete METAR observation data
 * 
 * Requirement 14.1: Define TypeScript interfaces for all data structures
 */
export type METARObservation = {
  readonly icaoCode: ICAOCode;
  readonly observationTime: Timestamp;
  readonly temperature: PrecisionTemperature;
  readonly rawMETAR: string;
  readonly tGroup: Option<TGroupResult>;
};

/**
 * Zod schema for aviationweather.gov JSON API response
 * 
 * The API returns an array of METAR observations with the following structure:
 * - icaoId: ICAO airport code (e.g., "KLGA")
 * - obsTime: Observation time in seconds since epoch (Unix timestamp)
 * - temp: Temperature in Celsius (rounded to 1°C)
 * - rawOb: Raw METAR string including Remarks section
 * 
 * Requirement 14.3: Use zod schema validation for all external API responses
 */
export const METARResponseSchema = z.array(
  z.object({
    icaoId: z.string(),
    obsTime: z.number(), // Unix timestamp in seconds (not milliseconds!)
    temp: z.number(), // Temperature in Celsius (1°C precision)
    rawOb: z.string(), // Raw METAR observation string
  })
);

/**
 * Type inferred from the METAR response schema
 */
export type METARResponse = z.infer<typeof METARResponseSchema>;

/**
 * Error types for METAR fetching operations
 */
export type METARError =
  | { type: 'network'; message: string; statusCode?: number }
  | { type: 'validation'; message: string; errors: unknown }
  | { type: 'parsing'; message: string }
  | { type: 'not_found'; icaoCode: string };

/**
 * Result type for operations that can fail
 */
export type Result<T, E> = { success: true; value: T } | { success: false; error: E };
