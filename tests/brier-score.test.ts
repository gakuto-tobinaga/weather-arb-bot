/**
 * Tests for Brier Score Calculation
 * 
 * Requirements: 12.4
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateBrierScore,
  calculateRollingBrierScore,
  meetsTargetScore,
  getBrierScoreRating,
  type Prediction,
} from '../src/monitoring/brier';
import { Timestamp } from '../src/types/timestamp';

describe('Brier Score Calculation', () => {
  test('perfect predictions return score of 0.0', () => {
    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 1.0,
        timestamp: Timestamp.now(),
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.0,
        timestamp: Timestamp.now(),
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateBrierScore(predictions);
    
    expect(result.score).toBe(0.0);
    expect(result.count).toBe(2);
  });

  test('worst predictions return score of 1.0', () => {
    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 0.0,
        timestamp: Timestamp.now(),
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 1.0,
        timestamp: Timestamp.now(),
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateBrierScore(predictions);
    
    expect(result.score).toBe(1.0);
    expect(result.count).toBe(2);
  });

  test('random guessing returns score around 0.25', () => {
    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 0.5,
        timestamp: Timestamp.now(),
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.5,
        timestamp: Timestamp.now(),
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateBrierScore(predictions);
    
    expect(result.score).toBe(0.25);
    expect(result.count).toBe(2);
  });

  test('ignores unsettled predictions', () => {
    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 1.0,
        timestamp: Timestamp.now(),
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.5,
        timestamp: Timestamp.now(),
        outcome: null,
        settled: false,
      },
    ];

    const result = calculateBrierScore(predictions);
    
    expect(result.score).toBe(0.0);
    expect(result.count).toBe(1);
  });

  test('returns 0 score for empty predictions', () => {
    const result = calculateBrierScore([]);
    
    expect(result.score).toBe(0);
    expect(result.count).toBe(0);
  });

  test('calculates correct score for mixed predictions', () => {
    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 0.8,
        timestamp: Timestamp.now(),
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.3,
        timestamp: Timestamp.now(),
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateBrierScore(predictions);
    
    // (0.8 - 1)^2 + (0.3 - 0)^2 = 0.04 + 0.09 = 0.13
    // 0.13 / 2 = 0.065
    expect(result.score).toBeCloseTo(0.065, 3);
    expect(result.count).toBe(2);
  });
});

describe('Rolling Brier Score', () => {
  test('filters predictions by time window', () => {
    const now = Timestamp.now();
    const yesterday = Timestamp.fromUTC(
      new Date(now.utc.getTime() - 24 * 60 * 60 * 1000)
    );
    const twoDaysAgo = Timestamp.fromUTC(
      new Date(now.utc.getTime() - 2 * 24 * 60 * 60 * 1000)
    );

    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 1.0,
        timestamp: now,
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.0,
        timestamp: twoDaysAgo,
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateRollingBrierScore(predictions, yesterday, now);
    
    // Should only include prediction from today
    expect(result.count).toBe(1);
    expect(result.score).toBe(0.0);
  });

  test('includes predictions at window boundaries', () => {
    const now = Timestamp.now();
    const yesterday = Timestamp.fromUTC(
      new Date(now.utc.getTime() - 24 * 60 * 60 * 1000)
    );

    const predictions: Prediction[] = [
      {
        predictionId: '1',
        marketId: 'm1',
        probability: 1.0,
        timestamp: now,
        outcome: true,
        settled: true,
      },
      {
        predictionId: '2',
        marketId: 'm2',
        probability: 0.0,
        timestamp: yesterday,
        outcome: false,
        settled: true,
      },
    ];

    const result = calculateRollingBrierScore(predictions, yesterday, now);
    
    // Should include both predictions
    expect(result.count).toBe(2);
    expect(result.score).toBe(0.0);
  });
});

describe('Target Score Validation', () => {
  test('returns true when score meets target', () => {
    expect(meetsTargetScore(0.05, 0.1)).toBe(true);
    expect(meetsTargetScore(0.09, 0.1)).toBe(true);
  });

  test('returns false when score exceeds target', () => {
    expect(meetsTargetScore(0.1, 0.1)).toBe(false);
    expect(meetsTargetScore(0.15, 0.1)).toBe(false);
  });

  test('uses default threshold of 0.1', () => {
    expect(meetsTargetScore(0.05)).toBe(true);
    expect(meetsTargetScore(0.15)).toBe(false);
  });
});

describe('Brier Score Rating', () => {
  test('returns correct rating for score ranges', () => {
    expect(getBrierScoreRating(0.03)).toBe('Excellent');
    expect(getBrierScoreRating(0.07)).toBe('Good');
    expect(getBrierScoreRating(0.12)).toBe('Fair');
    expect(getBrierScoreRating(0.20)).toBe('Poor');
    expect(getBrierScoreRating(0.30)).toBe('Very Poor');
  });

  test('handles boundary values', () => {
    expect(getBrierScoreRating(0.05)).toBe('Good');
    expect(getBrierScoreRating(0.1)).toBe('Fair');
    expect(getBrierScoreRating(0.15)).toBe('Poor');
    expect(getBrierScoreRating(0.25)).toBe('Very Poor');
  });
});
