/**
 * Timezone mapping and utilities for ICAO weather stations
 * 
 * Maps ICAO airport codes to their respective IANA timezone identifiers.
 * This is critical for correctly parsing market observation end times
 * which are specified in local time.
 */

import type { ICAOCode } from '../config';

/**
 * ICAO to IANA timezone mapping
 * 
 * Each weather station operates in a specific timezone:
 * - KLGA (LaGuardia, NYC): Eastern Time
 * - KORD (O'Hare, Chicago): Central Time
 * - EGLC (London City): Greenwich Mean Time
 */
export const ICAO_TIMEZONE_MAP: Record<ICAOCode, string> = {
  'KLGA': 'America/New_York',    // Eastern Time (ET)
  'KORD': 'America/Chicago',     // Central Time (CT)
  'EGLC': 'Europe/London'        // Greenwich Mean Time (GMT)
} as const;

/**
 * Get the IANA timezone identifier for a given ICAO code
 * 
 * @param icao - ICAO airport code
 * @returns IANA timezone identifier (e.g., "America/New_York")
 * 
 * @example
 * ```typescript
 * const tz = getTimezoneForICAO('KLGA');
 * console.log(tz); // "America/New_York"
 * ```
 */
export function getTimezoneForICAO(icao: ICAOCode): string {
  return ICAO_TIMEZONE_MAP[icao];
}
