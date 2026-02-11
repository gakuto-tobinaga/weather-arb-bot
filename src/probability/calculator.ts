/**
 * Probability Calculator
 * 
 * Calculates the probability of temperature threshold crossings using
 * normal distribution CDF. Models maximum temperature over remaining
 * time period as a normal distribution.
 */

import cdf from '@stdlib/stats-base-dists-normal-cdf';
import { calculateSigma } from './sigma';
import { PrecisionTemperature } from '../types/temperature';
import type { ICAOCode } from '../config';
import type { Duration } from '../types/timestamp';

/**
 * Calculate probability that maximum temperature falls within range
 * 
 * Models T_max ~ N(μ = T_current, σ = f(time_remaining, icao))
 * 
 * For finite range [min, max]:
 *   P(min ≤ T_max ≤ max) = Φ((max - μ) / σ) - Φ((min - μ) / σ)
 * 
 * For ceiling [min, ∞):
 *   P(T_max ≥ min) = 1 - Φ((min - μ) / σ)
 * 
 * For floor (-∞, max]:
 *   P(T_max ≤ max) = Φ((max - μ) / σ)
 * 
 * For single threshold (min = max):
 *   P(T_max > threshold) = 1 - Φ((threshold - μ) / σ)
 * 
 * @param currentTemp - Current temperature observation
 * @param minThreshold - Minimum temperature (can be -Infinity)
 * @param maxThreshold - Maximum temperature (can be Infinity)
 * @param icao - ICAO airport code
 * @param timeRemaining - Duration until observation end
 * @returns Probability (0.0 to 1.0) that max temp falls in range
 * 
 * @example
 * ```typescript
 * const current = PrecisionTemperature.fromCelsius(20.0);
 * const min = PrecisionTemperature.fromCelsius(22.0);
 * const max = PrecisionTemperature.fromCelsius(24.0);
 * const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
 * 
 * const prob = calculateRangeProbability(current, min, max, 'KLGA', duration);
 * // prob ≈ probability that max temp falls between 22-24°C
 * ```
 */
export function calculateRangeProbability(
  currentTemp: PrecisionTemperature,
  minThreshold: PrecisionTemperature,
  maxThreshold: PrecisionTemperature,
  icao: ICAOCode,
  timeRemaining: Duration
): number {
  // Extract numeric values
  const mu = PrecisionTemperature.value(currentTemp);
  const min = PrecisionTemperature.value(minThreshold);
  const max = PrecisionTemperature.value(maxThreshold);
  
  // Validate range
  if (min > max) {
    throw new Error(`Invalid range: min (${min}) > max (${max})`);
  }
  
  // Calculate time-adjusted sigma
  const sigma = calculateSigma(icao, timeRemaining);
  
  // Handle edge cases
  if (sigma === 0) {
    // No time remaining - current temp is final temp
    if (min === max) {
      // Single threshold: check if current > threshold
      return mu > min ? 1.0 : 0.0;
    }
    // Range: check if current is within range
    return (mu >= min && mu <= max) ? 1.0 : 0.0;
  }
  
  if (timeRemaining.isNegative()) {
    // Market expired - no probability
    return 0.0;
  }
  
  // Handle single threshold (backward compatibility)
  if (min === max) {
    const zScore = (min - mu) / sigma;
    const cdfValue = cdf(zScore, 0, 1);
    return Math.max(0, Math.min(1, 1 - cdfValue));
  }
  
  // Handle ceiling: [min, ∞)
  if (!isFinite(max)) {
    const zScore = (min - mu) / sigma;
    const cdfValue = cdf(zScore, 0, 1);
    return Math.max(0, Math.min(1, 1 - cdfValue));
  }
  
  // Handle floor: (-∞, max]
  if (!isFinite(min)) {
    const zScore = (max - mu) / sigma;
    const cdfValue = cdf(zScore, 0, 1);
    return Math.max(0, Math.min(1, cdfValue));
  }
  
  // Handle finite range: [min, max]
  const zScoreMax = (max - mu) / sigma;
  const zScoreMin = (min - mu) / sigma;
  
  const cdfMax = cdf(zScoreMax, 0, 1);
  const cdfMin = cdf(zScoreMin, 0, 1);
  
  const probability = cdfMax - cdfMin;
  
  // Clamp to [0, 1] range
  return Math.max(0, Math.min(1, probability));
}

/**
 * Calculate probability that maximum temperature exceeds threshold
 * 
 * Backward-compatible wrapper for existing calculateProbability function.
 * Maintains existing API for single-threshold markets.
 * Internally calls calculateRangeProbability with threshold as both min and max.
 * 
 * Models T_max ~ N(μ = T_current, σ = f(time_remaining, icao))
 * Calculates P(T_max > X) = 1 - Φ((X - μ) / σ)
 * 
 * Where:
 * - Φ is the standard normal CDF
 * - μ = current temperature
 * - X = threshold temperature
 * - σ = time-adjusted standard deviation
 * 
 * @param currentTemp - Current temperature observation
 * @param threshold - Temperature threshold to exceed
 * @param icao - ICAO airport code
 * @param timeRemaining - Duration until observation end
 * @returns Probability (0.0 to 1.0) that max temp exceeds threshold
 * 
 * @example
 * ```typescript
 * const current = PrecisionTemperature.fromCelsius(20.0);
 * const threshold = PrecisionTemperature.fromCelsius(25.0);
 * const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
 * 
 * const prob = calculateProbability(current, threshold, 'KLGA', duration);
 * // prob ≈ 0.02 (2% chance of exceeding 25°C from 20°C in 12 hours)
 * ```
 */
export function calculateProbability(
  currentTemp: PrecisionTemperature,
  threshold: PrecisionTemperature,
  icao: ICAOCode,
  timeRemaining: Duration
): number {
  return calculateRangeProbability(
    currentTemp,
    threshold,
    threshold,
    icao,
    timeRemaining
  );
}

/**
 * Calculate expected value (EV) for a market
 * 
 * EV = P(calculated) - P(market_price)
 * 
 * Positive EV indicates the market is underpricing the probability,
 * suggesting a profitable trading opportunity.
 * 
 * @param calculatedProbability - Probability from our model (0.0 to 1.0)
 * @param marketPrice - Current market price (0.0 to 1.0)
 * @returns Expected value (-1.0 to 1.0)
 * 
 * @example
 * ```typescript
 * const calcProb = 0.65; // Our model says 65% chance
 * const marketPrice = 0.50; // Market prices at 50%
 * 
 * const ev = calculateEV(calcProb, marketPrice);
 * // ev = 0.15 (15% edge - good trading opportunity)
 * ```
 */
export function calculateEV(
  calculatedProbability: number,
  marketPrice: number
): number {
  // Validate inputs
  if (calculatedProbability < 0 || calculatedProbability > 1) {
    throw new Error(`Invalid probability: ${calculatedProbability}. Must be between 0 and 1.`);
  }
  
  if (marketPrice < 0 || marketPrice > 1) {
    throw new Error(`Invalid market price: ${marketPrice}. Must be between 0 and 1.`);
  }
  
  return calculatedProbability - marketPrice;
}

/**
 * Check if a market has expired (negative time remaining)
 * 
 * @param timeRemaining - Duration until observation end
 * @returns true if market has expired, false otherwise
 */
export function isMarketExpired(timeRemaining: Duration): boolean {
  return timeRemaining.isNegative();
}
