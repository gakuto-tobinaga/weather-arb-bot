/**
 * Brier Score Calculation
 * 
 * Implements Brier score calculation for prediction accuracy validation.
 * Used in monitoring mode to validate model performance before live trading.
 * 
 * Requirements: 12.2, 12.3, 12.4
 */

import type { Timestamp } from '../types/timestamp';

/**
 * Prediction record
 * 
 * Stores a single prediction with its outcome for Brier score calculation.
 */
export type Prediction = {
  readonly predictionId: string;
  readonly marketId: string;
  readonly probability: number; // 0.0 to 1.0
  readonly timestamp: Timestamp;
  readonly outcome: boolean | null; // true = event occurred, false = did not occur, null = not yet settled
  readonly settled: boolean;
};

/**
 * Brier score result
 */
export type BrierScoreResult = {
  readonly score: number;
  readonly count: number;
  readonly predictions: Prediction[];
};

/**
 * Calculate Brier score for a set of predictions
 * 
 * Brier score = (1/N) * Σ(prediction - outcome)²
 * 
 * Lower scores are better:
 * - 0.0 = perfect predictions
 * - 0.25 = random guessing (for binary outcomes)
 * - 1.0 = worst possible predictions
 * 
 * Requirement 12.4: Calculate Brier score for prediction accuracy
 * 
 * @param predictions - Array of predictions with outcomes
 * @returns Brier score result
 */
export function calculateBrierScore(predictions: Prediction[]): BrierScoreResult {
  // Filter to only settled predictions
  const settledPredictions = predictions.filter(p => p.settled && p.outcome !== null);
  
  if (settledPredictions.length === 0) {
    return {
      score: 0,
      count: 0,
      predictions: settledPredictions,
    };
  }
  
  // Calculate sum of squared errors
  const sumSquaredErrors = settledPredictions.reduce((sum, prediction) => {
    const outcome = prediction.outcome ? 1 : 0;
    const error = prediction.probability - outcome;
    return sum + (error * error);
  }, 0);
  
  // Calculate mean squared error (Brier score)
  const score = sumSquaredErrors / settledPredictions.length;
  
  return {
    score,
    count: settledPredictions.length,
    predictions: settledPredictions,
  };
}

/**
 * Calculate rolling Brier score for a time window
 * 
 * Requirement 12.3: Calculate rolling Brier score over time period
 * 
 * @param predictions - All predictions
 * @param windowStart - Start of time window
 * @param windowEnd - End of time window
 * @returns Brier score for predictions in window
 */
export function calculateRollingBrierScore(
  predictions: Prediction[],
  windowStart: Timestamp,
  windowEnd: Timestamp
): BrierScoreResult {
  // Filter predictions within time window
  const windowPredictions = predictions.filter(p => {
    const predTime = p.timestamp.utc.getTime();
    const startTime = windowStart.utc.getTime();
    const endTime = windowEnd.utc.getTime();
    return predTime >= startTime && predTime <= endTime;
  });
  
  return calculateBrierScore(windowPredictions);
}

/**
 * Check if Brier score meets target threshold
 * 
 * Requirement 12.3: Target Brier score < 0.1 over 3-day period
 * 
 * @param score - Brier score to check
 * @param threshold - Target threshold (default: 0.1)
 * @returns True if score meets target
 */
export function meetsTargetScore(score: number, threshold: number = 0.1): boolean {
  return score < threshold;
}

/**
 * Get Brier score quality rating
 * 
 * @param score - Brier score
 * @returns Quality rating string
 */
export function getBrierScoreRating(score: number): string {
  if (score < 0.05) return 'Excellent';
  if (score < 0.1) return 'Good';
  if (score < 0.15) return 'Fair';
  if (score < 0.25) return 'Poor';
  return 'Very Poor';
}
