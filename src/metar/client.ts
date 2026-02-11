/**
 * METAR Client for aviationweather.gov API
 * 
 * Fetches real-time METAR weather data from the aviationweather.gov JSON endpoint.
 * Implements parallel fetching for multiple stations to minimize latency.
 * 
 * Requirements: 1.1, 1.2, 1.5
 */

import type { ICAOCode } from '../config';
import type { METARObservation, METARError, Result } from './types';
import { METARResponseSchema } from './types';
import { PrecisionTemperature } from '../types/temperature';
import { Timestamp } from '../types/timestamp';
import { Option } from './types';
import { parseTGroup } from './parser';
import { withExponentialBackoff, DEFAULT_RETRY_CONFIG } from '../utils/retry';

/**
 * Base URL for aviationweather.gov METAR API
 */
const METAR_API_BASE = 'https://aviationweather.gov/api/data/metar';

/**
 * Internal function to fetch METAR data for a single ICAO station (without retry logic)
 * 
 * Uses the aviationweather.gov JSON endpoint:
 * https://aviationweather.gov/api/data/metar?ids={ICAO}&format=json
 * 
 * Requirement 1.1: Establish connection to aviationweather.gov JSON endpoint
 * Requirement 1.2: Fetch METAR data for configured ICAO stations
 * 
 * @param icaoCode - ICAO airport code (e.g., 'KLGA', 'KORD', 'EGLC')
 * @returns Result containing METARObservation or METARError
 * 
 * @internal This function is used internally by fetchMETAR which adds retry logic
 */
async function fetchMETARInternal(
  icaoCode: ICAOCode
): Promise<Result<METARObservation, METARError>> {
  try {
    // Construct API URL with ICAO code and JSON format
    const url = `${METAR_API_BASE}?ids=${icaoCode}&format=json`;

    // Fetch data from aviationweather.gov
    const response = await fetch(url);

    // Check for HTTP errors
    if (!response.ok) {
      return {
        success: false,
        error: {
          type: 'network',
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        },
      };
    }

    // Parse JSON response
    const json = await response.json();

    // Validate response structure with zod
    const parseResult = METARResponseSchema.safeParse(json);

    if (!parseResult.success) {
      return {
        success: false,
        error: {
          type: 'validation',
          message: 'Invalid METAR API response format',
          errors: parseResult.error,
        },
      };
    }

    const data = parseResult.data;

    // Check if we got any results
    if (data.length === 0) {
      return {
        success: false,
        error: {
          type: 'not_found',
          icaoCode,
        },
      };
    }

    // Extract the first (and should be only) observation
    const observation = data[0];

    // Convert observation to our internal types
    const metarObservation: METARObservation = {
      icaoCode: icaoCode,
      // obsTime is in seconds since epoch, convert to milliseconds
      observationTime: Timestamp.fromUTC(new Date(observation.obsTime * 1000)),
      temperature: PrecisionTemperature.fromCelsius(observation.temp),
      rawMETAR: observation.rawOb,
      // Parse T-Group from raw METAR string for 0.1°C precision
      tGroup: parseTGroup(observation.rawOb),
    };

    return {
      success: true,
      value: metarObservation,
    };
  } catch (error) {
    // Handle network errors, JSON parsing errors, etc.
    return {
      success: false,
      error: {
        type: 'network',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Fetch METAR data for a single ICAO station with exponential backoff retry
 * 
 * This function wraps fetchMETARInternal with exponential backoff retry logic
 * to handle transient API failures gracefully.
 * 
 * Requirement 1.3: When METAR data is unavailable or returns error, retry with exponential backoff
 * Requirement 9.5: When aviationweather.gov returns errors, implement exponential backoff starting at 5 seconds
 * 
 * Retry behavior:
 * - Initial delay: 5 seconds
 * - Delay doubles on each retry (5s, 10s, 20s, 40s, 60s)
 * - Maximum delay: 60 seconds
 * - Maximum attempts: 5
 * - All retry attempts are logged with timestamps
 * 
 * @param icaoCode - ICAO airport code (e.g., 'KLGA', 'KORD', 'EGLC')
 * @returns Result containing METARObservation or METARError
 * 
 * @example
 * ```typescript
 * const result = await fetchMETAR('KLGA');
 * if (result.success) {
 *   console.log(`Temperature at ${result.value.icaoCode}: ${result.value.temperature}°C`);
 * } else {
 *   console.error(`Failed to fetch METAR: ${result.error.message}`);
 * }
 * ```
 */
export async function fetchMETAR(
  icaoCode: ICAOCode
): Promise<Result<METARObservation, METARError>> {
  try {
    // Wrap the internal fetch with exponential backoff retry logic
    // Convert Result type to exception-based flow for retry logic
    return await withExponentialBackoff(
      async () => {
        const result = await fetchMETARInternal(icaoCode);
        if (!result.success) {
          // Convert error Result to exception so retry logic can catch it
          throw result.error;
        }
        return result;
      },
      DEFAULT_RETRY_CONFIG,
      (attempt) => {
        const errorMsg = 
          attempt.error && typeof attempt.error === 'object' && 'message' in attempt.error
            ? (attempt.error as { message: string }).message
            : String(attempt.error);
        
        console.warn(
          `[METAR Client] Retry attempt ${attempt.attemptNumber + 1} for ${icaoCode} ` +
          `at ${attempt.timestamp.toISOString()}, retrying in ${attempt.delayMs}ms. ` +
          `Error: ${errorMsg}`
        );
      }
    );
  } catch (error) {
    // If all retries failed, return an error result
    // Check if error is already a METARError
    if (error && typeof error === 'object' && 'type' in error) {
      return {
        success: false,
        error: error as METARError,
      };
    }
    
    return {
      success: false,
      error: {
        type: 'network',
        message: `All retry attempts failed for ${icaoCode}: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}

/**
 * Fetch METAR data for multiple stations in parallel
 * 
 * Uses Promise.all to fetch all stations concurrently, minimizing total latency.
 * This is critical for the bot's performance requirement of completing
 * METAR fetch to order submission within 5 seconds.
 * 
 * Requirement 1.5: Fetch data for all stations in parallel
 * 
 * @param stations - Array of ICAO codes to fetch
 * @returns Map of ICAO codes to METARObservation results
 * 
 * @example
 * ```typescript
 * const stations: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
 * const results = await fetchAllStations(stations);
 * 
 * for (const [icao, result] of results) {
 *   if (result.success) {
 *     console.log(`${icao}: ${result.value.temperature}°C`);
 *   } else {
 *     console.error(`${icao}: ${result.error.message}`);
 *   }
 * }
 * ```
 */
export async function fetchAllStations(
  stations: ICAOCode[]
): Promise<Map<ICAOCode, Result<METARObservation, METARError>>> {
  // Fetch all stations in parallel using Promise.all
  const promises = stations.map(async (icao) => {
    const result = await fetchMETAR(icao);
    return [icao, result] as const;
  });

  // Wait for all fetches to complete
  const results = await Promise.all(promises);

  // Convert array of tuples to Map
  return new Map(results);
}
