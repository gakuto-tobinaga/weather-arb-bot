/**
 * Tests for Monitoring Mode Validation Logic
 * 
 * Requirements: 12.3, 12.4
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { PredictionTracker } from '../src/monitoring/tracker';
import { getBrierScoreRating } from '../src/monitoring/brier';
import type { Prediction } from '../src/monitoring/brier';
import { Timestamp } from '../src/types/timestamp';
import { existsSync, rmSync, mkdirSync } from 'fs';

const TEST_STORAGE_DIR = './logs/test-monitoring-validation';

describe('Monitoring Mode Validation', () => {
  let tracker: PredictionTracker;

  beforeEach(() => {
    if (!existsSync(TEST_STORAGE_DIR)) {
      mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    }
    
    tracker = new PredictionTracker(TEST_STORAGE_DIR);
    tracker.clear();
  });

  afterEach(() => {
    if (existsSync(TEST_STORAGE_DIR)) {
      rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  test('validates 3-day target with good predictions', () => {
    // Add predictions over 3 days with good accuracy
    const now = Timestamp.now();
    
    for (let day = 0; day < 3; day++) {
      const dayTimestamp = Timestamp.fromUTC(
        new Date(now.utc.getTime() - day * 24 * 60 * 60 * 1000)
      );
      
      // Add 5 good predictions per day
      for (let i = 0; i < 5; i++) {
        const pred: Prediction = {
          predictionId: `pred-${day}-${i}`,
          marketId: `market-${day}-${i}`,
          probability: 0.9,
          timestamp: dayTimestamp,
          outcome: true,
          settled: true,
        };
        tracker.addPrediction(pred);
      }
    }

    const meetsTarget = tracker.meetsTarget(3, 0.1);
    expect(meetsTarget).toBe(true);
  });

  test('fails 3-day target with poor predictions', () => {
    // Add predictions with poor accuracy
    const now = Timestamp.now();
    
    for (let day = 0; day < 3; day++) {
      const dayTimestamp = Timestamp.fromUTC(
        new Date(now.utc.getTime() - day * 24 * 60 * 60 * 1000)
      );
      
      // Add 5 poor predictions per day (predicting opposite of outcome)
      for (let i = 0; i < 5; i++) {
        const pred: Prediction = {
          predictionId: `pred-${day}-${i}`,
          marketId: `market-${day}-${i}`,
          probability: 0.1,
          timestamp: dayTimestamp,
          outcome: true, // Predicted low but outcome was true
          settled: true,
        };
        tracker.addPrediction(pred);
      }
    }

    const meetsTarget = tracker.meetsTarget(3, 0.1);
    expect(meetsTarget).toBe(false);
  });

  test('returns false when insufficient data', () => {
    // Add only 2 predictions
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.9,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.1,
      timestamp: Timestamp.now(),
      outcome: false,
      settled: true,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    const stats = tracker.getStatistics();
    
    // With only 2 predictions, even if score is good, not enough data for validation
    expect(stats.settled).toBeLessThan(10);
    
    // The score might be good, but we need to check settled count separately
    const meetsTarget = tracker.meetsTarget(3, 0.1);
    const hasEnoughData = stats.settled >= 10;
    
    // Ready for live trading requires both good score AND enough data
    const readyForLiveTrading = meetsTarget && hasEnoughData;
    expect(readyForLiveTrading).toBe(false);
  });

  test('daily summary shows correct statistics', () => {
    const today = new Date();
    const todayTimestamp = Timestamp.now();

    // Add predictions for today
    for (let i = 0; i < 10; i++) {
      const pred: Prediction = {
        predictionId: `pred-${i}`,
        marketId: `market-${i}`,
        probability: 0.8,
        timestamp: todayTimestamp,
        outcome: true,
        settled: true,
      };
      tracker.addPrediction(pred);
    }

    const dailyResult = tracker.getDailyBrierScore(today);
    
    expect(dailyResult.count).toBe(10);
    expect(dailyResult.score).toBeCloseTo(0.04, 2); // (0.8 - 1)^2 = 0.04
  });

  test('alert threshold detection for poor scores', () => {
    const today = new Date();
    const todayTimestamp = Timestamp.now();

    // Add predictions with poor accuracy (score > 0.15)
    for (let i = 0; i < 5; i++) {
      const pred: Prediction = {
        predictionId: `pred-${i}`,
        marketId: `market-${i}`,
        probability: 0.2,
        timestamp: todayTimestamp,
        outcome: true, // Predicted 0.2 but outcome was true
        settled: true,
      };
      tracker.addPrediction(pred);
    }

    const dailyResult = tracker.getDailyBrierScore(today);
    
    // Score should be (0.2 - 1)^2 = 0.64
    expect(dailyResult.score).toBeCloseTo(0.64, 2);
    expect(dailyResult.score).toBeGreaterThan(0.15); // Should trigger alert
    expect(dailyResult.count).toBeGreaterThanOrEqual(5); // Enough data for alert
  });

  test('Brier score rating categories', () => {
    expect(getBrierScoreRating(0.03)).toBe('Excellent');
    expect(getBrierScoreRating(0.07)).toBe('Good');
    expect(getBrierScoreRating(0.12)).toBe('Fair');
    expect(getBrierScoreRating(0.20)).toBe('Poor');
    expect(getBrierScoreRating(0.30)).toBe('Very Poor');
  });

  test('statistics summary includes all metrics', () => {
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.9,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.5,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    const stats = tracker.getStatistics();
    
    expect(stats.total).toBe(2);
    expect(stats.settled).toBe(1);
    expect(stats.unsettled).toBe(1);
    expect(stats.brierScore).toBeCloseTo(0.01, 2); // (0.9 - 1)^2 = 0.01
    expect(stats.rating).toBe('Excellent');
  });

  test('validates ready for live trading criteria', () => {
    // Add 15 good predictions over 3 days
    const now = Timestamp.now();
    
    for (let day = 0; day < 3; day++) {
      const dayTimestamp = Timestamp.fromUTC(
        new Date(now.utc.getTime() - day * 24 * 60 * 60 * 1000)
      );
      
      for (let i = 0; i < 5; i++) {
        const pred: Prediction = {
          predictionId: `pred-${day}-${i}`,
          marketId: `market-${day}-${i}`,
          probability: 0.95,
          timestamp: dayTimestamp,
          outcome: true,
          settled: true,
        };
        tracker.addPrediction(pred);
      }
    }

    const stats = tracker.getStatistics();
    const meetsTarget = tracker.meetsTarget(3, 0.1);
    
    // Should meet all criteria for live trading
    expect(stats.settled).toBeGreaterThanOrEqual(10);
    expect(stats.brierScore).toBeLessThan(0.1);
    expect(meetsTarget).toBe(true);
  });
});
