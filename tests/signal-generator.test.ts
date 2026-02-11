/**
 * Signal Generator Tests
 * 
 * Tests for EV threshold filtering and signal generation.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { SignalGenerator } from '../src/signal';
import type { MarketInfo } from '../src/signal';
import { PrecisionTemperature } from '../src/types/temperature';
import { Timestamp } from '../src/types/timestamp';
import type { Config } from '../src/config';

// Mock config for testing
const mockConfig: Config = {
  POLYMARKET_PK: '0'.repeat(64),
  POLYMARKET_API_KEY: 'test-key',
  POLYMARKET_API_SECRET: 'test-secret',
  POLYMARKET_API_PASSPHRASE: 'test-passphrase',
  POLYMARKET_FUNDER: '0x' + '0'.repeat(40),
  POLYGON_RPC_URL: 'https://polygon-rpc.com',
  TARGET_ICAO: 'KLGA',
  MIN_EV: 0.05,
  BUDGET: 1000,
  POLL_INTERVAL: 300000,
  MONITORING_MODE: false,
};

describe('Signal Generator', () => {
  let generator: SignalGenerator;
  let now: Timestamp;

  beforeEach(() => {
    generator = new SignalGenerator(mockConfig);
    now = Timestamp.now();
  });

  describe('EV Threshold Filtering', () => {
    test('should generate signal when EV > MIN_EV', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000) // 6 hours
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.4, // Market underprices
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);

      const signal = generator.generateSignal(market, currentTemp, now);

      expect(signal).not.toBeNull();
      expect(signal?.ev).toBeGreaterThan(mockConfig.MIN_EV);
      expect(signal?.action).toBe('BUY');
    });

    test('should not generate signal when EV <= MIN_EV', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.95, // Market correctly priced
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal = generator.generateSignal(market, currentTemp, now);

      expect(signal).toBeNull();
    });

    test('should not generate signal for expired market', () => {
      const pastTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: pastTime,
        marketPrice: 0.4,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal = generator.generateSignal(market, currentTemp, now);

      expect(signal).toBeNull();
    });

    test('should filter by exact MIN_EV threshold', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      // Create market where EV will be exactly MIN_EV
      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(15),
        observationEnd: futureTime,
        marketPrice: 0.5,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(15);
      const signal = generator.generateSignal(market, currentTemp, now);

      // EV should be close to 0, which is <= MIN_EV (0.05)
      expect(signal).toBeNull();
    });
  });

  describe('Signal Generation', () => {
    test('should include all required fields in signal', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.4,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal = generator.generateSignal(market, currentTemp, now);

      expect(signal).not.toBeNull();
      expect(signal?.marketId).toBe('market-1');
      expect(signal?.tokenId).toBe('token-1');
      expect(signal?.action).toBe('BUY');
      expect(signal?.currentTemp).toBe(currentTemp);
      expect(signal?.threshold).toBe(market.threshold);
      expect(signal?.calculatedProbability).toBeGreaterThan(0);
      expect(signal?.marketPrice).toBe(0.4);
      expect(signal?.ev).toBeGreaterThan(0);
      expect(signal?.recommendedPrice).toBeGreaterThan(0);
      expect(signal?.recommendedSize).toBeGreaterThan(0);
      expect(signal?.icaoCode).toBe('KLGA');
    });

    test('should calculate recommended price below calculated probability', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.4,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal = generator.generateSignal(market, currentTemp, now);

      expect(signal).not.toBeNull();
      expect(signal!.recommendedPrice).toBeLessThan(signal!.calculatedProbability);
      expect(signal!.recommendedPrice).toBeGreaterThanOrEqual(0);
      expect(signal!.recommendedPrice).toBeLessThanOrEqual(1);
    });
  });

  describe('Multiple Markets', () => {
    test('should generate signals for multiple markets', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-1',
          tokenId: 'token-1',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.4,
        },
        {
          marketId: 'market-2',
          tokenId: 'token-2',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(25),
          observationEnd: futureTime,
          marketPrice: 0.3,
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = generator.generateSignals(markets, currentTemp, now);

      expect(result.signals.length).toBeGreaterThan(0);
      expect(result.totalSignals).toBe(result.signals.length);
    });

    test('should sort signals by EV descending', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-1',
          tokenId: 'token-1',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.5, // Lower EV
        },
        {
          marketId: 'market-2',
          tokenId: 'token-2',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.3, // Higher EV
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = generator.generateSignals(markets, currentTemp, now);

      if (result.signals.length >= 2) {
        expect(result.signals[0].ev).toBeGreaterThanOrEqual(result.signals[1].ev);
      }
    });

    test('should track filtered markets', () => {
      const futureTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() + 6 * 60 * 60 * 1000)
      );
      const pastTime = Timestamp.fromUTC(
        new Date(now.utc.getTime() - 1 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-1',
          tokenId: 'token-1',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.4, // Good EV
        },
        {
          marketId: 'market-2',
          tokenId: 'token-2',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.95, // Low EV
        },
        {
          marketId: 'market-3',
          tokenId: 'token-3',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: pastTime, // Expired
          marketPrice: 0.4,
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = generator.generateSignals(markets, currentTemp, now);

      expect(result.filteredByExpired).toBeGreaterThan(0);
      expect(result.filteredByEV).toBeGreaterThan(0);
    });
  });

  describe('Helper Methods', () => {
    test('shouldGenerateSignal returns true when EV > MIN_EV', () => {
      expect(generator.shouldGenerateSignal(0.1)).toBe(true);
      expect(generator.shouldGenerateSignal(0.06)).toBe(true);
    });

    test('shouldGenerateSignal returns false when EV <= MIN_EV', () => {
      expect(generator.shouldGenerateSignal(0.05)).toBe(false);
      expect(generator.shouldGenerateSignal(0.04)).toBe(false);
      expect(generator.shouldGenerateSignal(0)).toBe(false);
      expect(generator.shouldGenerateSignal(-0.1)).toBe(false);
    });

    test('getMinEV returns configured MIN_EV', () => {
      expect(generator.getMinEV()).toBe(mockConfig.MIN_EV);
    });
  });
});


  describe('Position Sizing', () => {
    test('should calculate size proportional to EV', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      // Create two markets with different EVs
      const highEVMarket: MarketInfo = {
        marketId: 'market-high',
        tokenId: 'token-high',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.3, // High EV
      };

      const lowEVMarket: MarketInfo = {
        marketId: 'market-low',
        tokenId: 'token-low',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.6, // Lower EV
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const highSignal = testGenerator.generateSignal(highEVMarket, currentTemp, testNow);
      const lowSignal = testGenerator.generateSignal(lowEVMarket, currentTemp, testNow);

      expect(highSignal).not.toBeNull();
      expect(lowSignal).not.toBeNull();
      
      // Higher EV should result in larger position size
      if (highSignal && lowSignal) {
        expect(highSignal.recommendedSize).toBeGreaterThan(lowSignal.recommendedSize);
      }
    });

    test('should ensure size is non-negative', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.4,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal = testGenerator.generateSignal(market, currentTemp, testNow);

      expect(signal).not.toBeNull();
      expect(signal!.recommendedSize).toBeGreaterThanOrEqual(0);
    });

    test('should not exceed budget', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.1, // Very high EV
      };

      const currentTemp = PrecisionTemperature.fromCelsius(25);
      const signal = testGenerator.generateSignal(market, currentTemp, testNow);

      expect(signal).not.toBeNull();
      expect(signal!.recommendedSize).toBeLessThanOrEqual(mockConfig.BUDGET);
    });

    test('should cap size at maximum allocation percentage', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.1,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(25);
      const signal = testGenerator.generateSignal(market, currentTemp, testNow);

      expect(signal).not.toBeNull();
      // Should not exceed 10% of budget (max allocation)
      const maxAllocation = mockConfig.BUDGET * 0.1;
      expect(signal!.recommendedSize).toBeLessThanOrEqual(maxAllocation);
    });

    test('should handle small EV with appropriate sizing', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.55, // Small EV
      };

      const currentTemp = PrecisionTemperature.fromCelsius(21);
      const signal = testGenerator.generateSignal(market, currentTemp, testNow);

      if (signal) {
        // Small EV should result in small position size
        expect(signal.recommendedSize).toBeGreaterThan(0);
        expect(signal.recommendedSize).toBeLessThan(mockConfig.BUDGET * 0.05);
      }
    });

    test('position size should be deterministic for same inputs', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const market: MarketInfo = {
        marketId: 'market-1',
        tokenId: 'token-1',
        icaoCode: 'KLGA',
        threshold: PrecisionTemperature.fromCelsius(20),
        observationEnd: futureTime,
        marketPrice: 0.4,
      };

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const signal1 = testGenerator.generateSignal(market, currentTemp, testNow);
      const signal2 = testGenerator.generateSignal(market, currentTemp, testNow);

      expect(signal1).not.toBeNull();
      expect(signal2).not.toBeNull();
      expect(signal1!.recommendedSize).toBe(signal2!.recommendedSize);
    });
  });


  describe('Market Prioritization', () => {
    test('should prioritize markets by EV descending', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-low',
          tokenId: 'token-low',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.6, // Low EV
        },
        {
          marketId: 'market-high',
          tokenId: 'token-high',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.3, // High EV
        },
        {
          marketId: 'market-medium',
          tokenId: 'token-medium',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.45, // Medium EV
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = testGenerator.generateSignals(markets, currentTemp, testNow);

      // Verify signals are sorted by EV descending
      expect(result.signals.length).toBeGreaterThan(0);
      for (let i = 0; i < result.signals.length - 1; i++) {
        expect(result.signals[i].ev).toBeGreaterThanOrEqual(result.signals[i + 1].ev);
      }

      // Highest EV market should be first
      if (result.signals.length > 0) {
        expect(result.signals[0].marketId).toBe('market-high');
      }
    });

    test('should maintain EV ordering with multiple markets', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      // Create 5 markets with different EVs
      const markets: MarketInfo[] = [
        { marketId: 'm1', tokenId: 't1', icaoCode: 'KLGA', threshold: PrecisionTemperature.fromCelsius(20), observationEnd: futureTime, marketPrice: 0.5 },
        { marketId: 'm2', tokenId: 't2', icaoCode: 'KLGA', threshold: PrecisionTemperature.fromCelsius(20), observationEnd: futureTime, marketPrice: 0.2 },
        { marketId: 'm3', tokenId: 't3', icaoCode: 'KLGA', threshold: PrecisionTemperature.fromCelsius(20), observationEnd: futureTime, marketPrice: 0.7 },
        { marketId: 'm4', tokenId: 't4', icaoCode: 'KLGA', threshold: PrecisionTemperature.fromCelsius(20), observationEnd: futureTime, marketPrice: 0.35 },
        { marketId: 'm5', tokenId: 't5', icaoCode: 'KLGA', threshold: PrecisionTemperature.fromCelsius(20), observationEnd: futureTime, marketPrice: 0.55 },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = testGenerator.generateSignals(markets, currentTemp, testNow);

      // Verify all signals are in descending EV order
      for (let i = 0; i < result.signals.length - 1; i++) {
        expect(result.signals[i].ev).toBeGreaterThanOrEqual(result.signals[i + 1].ev);
      }
    });

    test('should process highest EV market first', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-1',
          tokenId: 'token-1',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.8,
        },
        {
          marketId: 'market-2',
          tokenId: 'token-2',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.2, // Best opportunity
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = testGenerator.generateSignals(markets, currentTemp, testNow);

      expect(result.signals.length).toBeGreaterThan(0);
      // First signal should be the one with highest EV (lowest market price)
      expect(result.signals[0].marketId).toBe('market-2');
    });

    test('should handle markets with equal EV', () => {
      const testGenerator = new SignalGenerator(mockConfig);
      const testNow = Timestamp.now();
      const futureTime = Timestamp.fromUTC(
        new Date(testNow.utc.getTime() + 6 * 60 * 60 * 1000)
      );

      const markets: MarketInfo[] = [
        {
          marketId: 'market-1',
          tokenId: 'token-1',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.4,
        },
        {
          marketId: 'market-2',
          tokenId: 'token-2',
          icaoCode: 'KLGA',
          threshold: PrecisionTemperature.fromCelsius(20),
          observationEnd: futureTime,
          marketPrice: 0.4, // Same price = same EV
        },
      ];

      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const result = testGenerator.generateSignals(markets, currentTemp, testNow);

      // Should handle equal EVs without error
      expect(result.signals.length).toBe(2);
      expect(result.signals[0].ev).toBeCloseTo(result.signals[1].ev, 5);
    });
  });
