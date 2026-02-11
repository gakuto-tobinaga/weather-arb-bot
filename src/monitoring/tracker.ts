/**
 * Prediction Tracker
 * 
 * Tracks predictions and outcomes for monitoring mode validation.
 * Stores predictions to file for persistence across restarts.
 * 
 * Requirements: 12.2, 12.3
 */

import type { Timestamp } from '../types/timestamp';
import type { Prediction, BrierScoreResult } from './brier';
import { calculateBrierScore, calculateRollingBrierScore, meetsTargetScore, getBrierScoreRating } from './brier';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Prediction Tracker
 * 
 * Manages prediction storage and Brier score calculation.
 */
export class PredictionTracker {
  private predictions: Prediction[] = [];
  private readonly storageDir: string;
  private readonly storageFile: string;

  constructor(storageDir: string = './logs') {
    this.storageDir = storageDir;
    this.storageFile = join(storageDir, 'predictions.json');
    
    // Ensure storage directory exists
    if (!existsSync(storageDir)) {
      mkdirSync(storageDir, { recursive: true });
    }
    
    // Load existing predictions
    this.loadPredictions();
  }

  /**
   * Add a new prediction
   * 
   * Requirement 12.2: Log all trading signals with predictions
   * 
   * @param prediction - Prediction to add
   */
  addPrediction(prediction: Prediction): void {
    this.predictions.push(prediction);
    this.savePredictions();
    
    console.log(
      `[Prediction Tracker] Recorded prediction: ${prediction.predictionId} (P=${prediction.probability.toFixed(4)})`
    );
  }

  /**
   * Update prediction outcome
   * 
   * Called when market settles to record actual outcome.
   * 
   * @param predictionId - ID of prediction to update
   * @param outcome - Actual outcome (true/false)
   */
  updateOutcome(predictionId: string, outcome: boolean): void {
    const prediction = this.predictions.find(p => p.predictionId === predictionId);
    
    if (!prediction) {
      console.warn(`[Prediction Tracker] Prediction not found: ${predictionId}`);
      return;
    }
    
    // Update prediction with outcome
    const updatedPrediction: Prediction = {
      ...prediction,
      outcome,
      settled: true,
    };
    
    // Replace in array
    const index = this.predictions.findIndex(p => p.predictionId === predictionId);
    this.predictions[index] = updatedPrediction;
    
    this.savePredictions();
    
    console.log(
      `[Prediction Tracker] Updated outcome: ${predictionId} (Outcome=${outcome})`
    );
  }

  /**
   * Get all predictions
   * 
   * @returns Array of all predictions
   */
  getAllPredictions(): Prediction[] {
    return [...this.predictions];
  }

  /**
   * Get settled predictions
   * 
   * @returns Array of settled predictions
   */
  getSettledPredictions(): Prediction[] {
    return this.predictions.filter(p => p.settled);
  }

  /**
   * Get unsettled predictions
   * 
   * @returns Array of unsettled predictions
   */
  getUnsettledPredictions(): Prediction[] {
    return this.predictions.filter(p => !p.settled);
  }

  /**
   * Calculate current Brier score
   * 
   * Requirement 12.4: Calculate Brier score for all settled predictions
   * 
   * @returns Brier score result
   */
  calculateBrierScore(): BrierScoreResult {
    return calculateBrierScore(this.predictions);
  }

  /**
   * Calculate rolling Brier score for time window
   * 
   * Requirement 12.3: Calculate rolling Brier score
   * 
   * @param windowStart - Start of time window
   * @param windowEnd - End of time window
   * @returns Brier score result
   */
  calculateRollingBrierScore(windowStart: Timestamp, windowEnd: Timestamp): BrierScoreResult {
    return calculateRollingBrierScore(this.predictions, windowStart, windowEnd);
  }

  /**
   * Get daily Brier score summary
   * 
   * Requirement 12.3: Log daily Brier score summary
   * 
   * @param date - Date to get summary for
   * @returns Brier score result for the day
   */
  getDailyBrierScore(date: Date): BrierScoreResult {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { Timestamp } = require('../types/timestamp');
    const windowStart = Timestamp.fromUTC(startOfDay);
    const windowEnd = Timestamp.fromUTC(endOfDay);
    
    return this.calculateRollingBrierScore(windowStart, windowEnd);
  }

  /**
   * Check if meets target Brier score
   * 
   * Requirement 12.3: Target Brier score < 0.1 over 3-day period
   * 
   * @param days - Number of days to check (default: 3)
   * @param threshold - Target threshold (default: 0.1)
   * @returns True if meets target
   */
  meetsTarget(days: number = 3, threshold: number = 0.1): boolean {
    const { Timestamp } = require('../types/timestamp');
    const now = Timestamp.now();
    const windowStart = Timestamp.fromUTC(
      new Date(now.utc.getTime() - days * 24 * 60 * 60 * 1000)
    );
    
    const result = this.calculateRollingBrierScore(windowStart, now);
    
    if (result.count === 0) {
      return false; // Not enough data
    }
    
    return meetsTargetScore(result.score, threshold);
  }

  /**
   * Get statistics summary
   * 
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    settled: number;
    unsettled: number;
    brierScore: number;
    rating: string;
  } {
    const brierResult = this.calculateBrierScore();
    
    return {
      total: this.predictions.length,
      settled: this.getSettledPredictions().length,
      unsettled: this.getUnsettledPredictions().length,
      brierScore: brierResult.score,
      rating: getBrierScoreRating(brierResult.score),
    };
  }

  /**
   * Load predictions from file
   */
  private loadPredictions(): void {
    if (!existsSync(this.storageFile)) {
      return;
    }
    
    try {
      const data = readFileSync(this.storageFile, 'utf8');
      const parsed = JSON.parse(data);
      
      // Reconstruct Timestamp objects
      this.predictions = parsed.map((p: any) => ({
        ...p,
        timestamp: {
          utc: new Date(p.timestamp.utc),
          timezone: p.timestamp.timezone,
        },
      }));
      
      console.log(`[Prediction Tracker] Loaded ${this.predictions.length} predictions from storage`);
    } catch (error) {
      console.error('[Prediction Tracker] Failed to load predictions:', error);
    }
  }

  /**
   * Save predictions to file
   */
  private savePredictions(): void {
    try {
      const data = JSON.stringify(this.predictions, null, 2);
      writeFileSync(this.storageFile, data, 'utf8');
    } catch (error) {
      console.error('[Prediction Tracker] Failed to save predictions:', error);
    }
  }

  /**
   * Clear all predictions
   * 
   * Useful for testing.
   */
  clear(): void {
    this.predictions = [];
    this.savePredictions();
  }
}
