/**
 * Tests for Prediction Tracker
 * 
 * Requirements: 12.2, 12.3
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { PredictionTracker } from '../src/monitoring/tracker';
import type { Prediction } from '../src/monitoring/brier';
import { Timestamp } from '../src/types/timestamp';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_STORAGE_DIR = './logs/test-predictions';

describe('Prediction Tracker', () => {
  let tracker: PredictionTracker;

  beforeEach(() => {
    // Create test storage directory
    if (!existsSync(TEST_STORAGE_DIR)) {
      mkdirSync(TEST_STORAGE_DIR, { recursive: true });
    }
    
    tracker = new PredictionTracker(TEST_STORAGE_DIR);
    tracker.clear();
  });

  afterEach(() => {
    // Clean up test storage
    if (existsSync(TEST_STORAGE_DIR)) {
      rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
    }
  });

  test('adds prediction and persists to storage', () => {
    const prediction: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.75,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(prediction);

    const predictions = tracker.getAllPredictions();
    expect(predictions).toHaveLength(1);
    expect(predictions[0].predictionId).toBe('pred-1');
    expect(predictions[0].probability).toBe(0.75);
  });

  test('updates prediction outcome', () => {
    const prediction: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.75,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(prediction);
    tracker.updateOutcome('pred-1', true);

    const predictions = tracker.getAllPredictions();
    expect(predictions[0].outcome).toBe(true);
    expect(predictions[0].settled).toBe(true);
  });

  test('handles updating non-existent prediction', () => {
    tracker.updateOutcome('non-existent', true);
    
    // Should not throw, just log warning
    expect(tracker.getAllPredictions()).toHaveLength(0);
  });

  test('filters settled predictions', () => {
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.75,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.60,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    const settled = tracker.getSettledPredictions();
    const unsettled = tracker.getUnsettledPredictions();

    expect(settled).toHaveLength(1);
    expect(settled[0].predictionId).toBe('pred-1');
    expect(unsettled).toHaveLength(1);
    expect(unsettled[0].predictionId).toBe('pred-2');
  });

  test('calculates Brier score for all predictions', () => {
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 1.0,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.0,
      timestamp: Timestamp.now(),
      outcome: false,
      settled: true,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    const result = tracker.calculateBrierScore();
    
    expect(result.score).toBe(0.0);
    expect(result.count).toBe(2);
  });

  test('calculates rolling Brier score', () => {
    const now = Timestamp.now();
    const yesterday = Timestamp.fromUTC(
      new Date(now.utc.getTime() - 24 * 60 * 60 * 1000)
    );

    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 1.0,
      timestamp: now,
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.0,
      timestamp: yesterday,
      outcome: false,
      settled: true,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    const result = tracker.calculateRollingBrierScore(yesterday, now);
    
    expect(result.count).toBe(2);
    expect(result.score).toBe(0.0);
  });

  test('gets daily Brier score', () => {
    const today = new Date();
    const pred: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 1.0,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    tracker.addPrediction(pred);

    const result = tracker.getDailyBrierScore(today);
    
    expect(result.count).toBe(1);
    expect(result.score).toBe(0.0);
  });

  test('checks if meets target score', () => {
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.95,
      timestamp: Timestamp.now(),
      outcome: true,
      settled: true,
    };

    const pred2: Prediction = {
      predictionId: 'pred-2',
      marketId: 'market-2',
      probability: 0.05,
      timestamp: Timestamp.now(),
      outcome: false,
      settled: true,
    };

    tracker.addPrediction(pred1);
    tracker.addPrediction(pred2);

    // Score should be very low (good predictions)
    const meetsTarget = tracker.meetsTarget(3, 0.1);
    expect(meetsTarget).toBe(true);
  });

  test('returns false when not enough data', () => {
    const meetsTarget = tracker.meetsTarget(3, 0.1);
    expect(meetsTarget).toBe(false);
  });

  test('gets statistics summary', () => {
    const pred1: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 1.0,
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
    expect(stats.brierScore).toBe(0.0);
    expect(stats.rating).toBe('Excellent');
  });

  test('persists predictions across instances', () => {
    const prediction: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.75,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(prediction);

    // Create new tracker instance
    const newTracker = new PredictionTracker(TEST_STORAGE_DIR);
    const predictions = newTracker.getAllPredictions();

    expect(predictions).toHaveLength(1);
    expect(predictions[0].predictionId).toBe('pred-1');
  });

  test('clears all predictions', () => {
    const prediction: Prediction = {
      predictionId: 'pred-1',
      marketId: 'market-1',
      probability: 0.75,
      timestamp: Timestamp.now(),
      outcome: null,
      settled: false,
    };

    tracker.addPrediction(prediction);
    tracker.clear();

    expect(tracker.getAllPredictions()).toHaveLength(0);
  });
});
