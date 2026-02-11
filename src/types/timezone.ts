/**
 * Timezone Mapping for ICAO Airport Codes
 * 
 * Maps ICAO airport codes to their respective IANA timezone identifiers.
 * This mapping is critical for correctly parsing observation end times from
 * Polymarket's Ancillary_Data, which are specified in the market's local timezone.
 * 
 * Requirements: 3.4
 */

import type { ICAOCode } from './index';

/**
 * ICAO to Timezone Mapping
 * 
 * Each market has its own observation end time in its local timezone:
 * - KLGA (LaGuardia): Eastern Time (ET)
 * - KORD (O'Hare): Central Time (CT)
 * - EGLC (London City): Greenwich Mean Time (GMT)
 * 
 * These timezone strings are IANA timezone identifiers compatible with
 * date-fns-tz and other timezone libraries.
 */
export const ICAO_TIMEZONE_MAP: Record<ICAOCode, string> = {
  'KLGA': 'America/New_York',    // Eastern Time
  'KORD': 'America/Chicago',     // Central Time
  'EGLC': 'Europe/London'        // Greenwich Mean Time
} as const;

/**
 * Get the timezone identifier for a given ICAO airport code
 * 
 * @param icao - The ICAO airport code
 * @returns The IANA timezone identifier for the airport's location
 * 
 * @example
 * ```typescript
 * const timezone = getTimezoneForICAO('KLGA');
 * // Returns: 'America/New_York'
 * ```
 */
export function getTimezoneForICAO(icao: ICAOCode): string {
  return ICAO_TIMEZONE_MAP[icao];
}
