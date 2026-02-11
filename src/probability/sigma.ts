/**
 * Sigma (Standard Deviation) Calculation
 * 
 * Calculates the time-adjusted standard deviation for temperature probability
 * calculations. The σ value decreases as time approaches the observation end,
 * reflecting reduced uncertainty about the maximum temperature.
 */

import { getBaseSigma } from './config';
import type { ICAOCode } from '../config';
import type { Duration } from '../types/timestamp';

/**
 * Calculate time-adjusted standard deviation (σ)
 * 
 * The formula adjusts the base σ based on time remaining:
 * σ = base_σ[icao] * sqrt(hours_remaining / 24)
 * 
 * This ensures:
 * - σ decreases monotonically as time approaches zero
 * - σ = base_σ when 24 hours remain
 * - σ approaches 0 as observation end approaches
 * 
 * @param icao - ICAO airport code
 * @param timeRemaining - Duration until observation end
 * @returns Adjusted standard deviation in degrees Celsius
 * 
 * @example
 * ```typescript
 * const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000); // 12 hours
 * const sigma = calculateSigma('KLGA', duration);
 * // sigma ≈ 3.5 * sqrt(12/24) ≈ 2.47°C
 * ```
 */
export function calculateSigma(icao: ICAOCode, timeRemaining: Duration): number {
  const baseSigma = getBaseSigma(icao);
  const hoursRemaining = timeRemaining.hours;
  
  // Handle edge cases
  if (hoursRemaining <= 0) {
    // No time remaining - uncertainty is minimal
    return 0;
  }
  
  if (hoursRemaining >= 24) {
    // 24+ hours remaining - use full base sigma
    return baseSigma;
  }
  
  // Calculate time-adjusted sigma
  // σ = base_σ * sqrt(hours_remaining / 24)
  const timeAdjustment = Math.sqrt(hoursRemaining / 24);
  const adjustedSigma = baseSigma * timeAdjustment;
  
  return adjustedSigma;
}

/**
 * Validate that sigma decreases monotonically with time
 * 
 * This is a helper function for testing the monotonic property.
 * 
 * @param icao - ICAO airport code
 * @param time1 - First time remaining (should be greater)
 * @param time2 - Second time remaining (should be less)
 * @returns true if sigma(time1) >= sigma(time2)
 */
export function isSigmaMonotonic(
  icao: ICAOCode,
  time1: Duration,
  time2: Duration
): boolean {
  if (time1.hours < time2.hours) {
    // time1 should be >= time2 for this check
    return false;
  }
  
  const sigma1 = calculateSigma(icao, time1);
  const sigma2 = calculateSigma(icao, time2);
  
  // sigma1 should be >= sigma2 (more time = more uncertainty)
  return sigma1 >= sigma2;
}
