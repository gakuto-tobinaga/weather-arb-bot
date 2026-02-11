/**
 * Probability Engine Configuration
 * 
 * City-specific base standard deviation (σ) values for temperature volatility.
 * These values represent the expected temperature variation over a 24-hour period
 * and are used to calculate the probability of temperature threshold crossings.
 */

import type { ICAOCode } from '../config';

/**
 * Base standard deviation (σ) for each ICAO station
 * 
 * These values represent historical temperature volatility patterns:
 * - KLGA (New York): Moderate volatility (3.5°C)
 * - KORD (Chicago): Higher volatility due to continental climate (4.2°C)
 * - EGLC (London): Lower volatility due to maritime climate (2.8°C)
 * 
 * NOTE: These values should be periodically updated (e.g., monthly) based on
 * rolling historical data (past 30 days) to account for seasonal variations.
 * 
 * The actual σ used in probability calculations is adjusted based on time
 * remaining: σ = base_σ * sqrt(hours_remaining / 24)
 */
export const BASE_SIGMA_CONFIG: Record<ICAOCode, number> = {
  'KLGA': 3.5,  // New York LaGuardia - moderate volatility
  'KORD': 4.2,  // Chicago O'Hare - higher volatility (continental climate)
  'EGLC': 2.8   // London City - lower volatility (maritime climate)
} as const;

/**
 * Get the base standard deviation for a given ICAO code
 * 
 * @param icao - ICAO airport code
 * @returns Base σ value in degrees Celsius
 * 
 * @example
 * ```typescript
 * const baseSigma = getBaseSigma('KLGA');
 * console.log(baseSigma); // 3.5
 * ```
 */
export function getBaseSigma(icao: ICAOCode): number {
  return BASE_SIGMA_CONFIG[icao];
}
