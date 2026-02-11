/**
 * Logger Events Tests
 * 
 * Tests for structured logging of significant system events.
 * 
 * Requirements: 6.5, 7.5, 10.1, 10.2, 10.3, 10.4
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, unlinkSync } from 'fs';
import { initLogger } from '../src/logger';
import {
  logMETARFetch,
  logProbabilityCalculation,
  logOrderPlacement,
  logKillSwitchActivation,
  logKillSwitchDeactivation,
  logTradingSignal,
  logMarketDiscovery,
  logPnLUpdate,
  logSystemInitialization,
  logSystemShutdown,
} from '../src/logger/events';
import { PrecisionTemperature } from '../src/types/temperature';
import { Timestamp } from '../src/types/timestamp';

describe('Logger Events', () => {
  const testLogFile = 'logs/test-events.log';

  beforeEach(() => {
    // Initialize logger for testing
    initLogger({
      minLevel: 'debug',
      logToFile: true,
      logFilePath: testLogFile,
    });
  });

  afterEach(() => {
    // Clean up test log file
    if (existsSync(testLogFile)) {
      unlinkSync(testLogFile);
    }
  });

  describe('METAR Fetch Logging', () => {
    test('should log successful METAR fetch', () => {
      const temp = PrecisionTemperature.fromCelsius(20);
      const timestamp = Timestamp.now();

      // Should not throw
      expect(() => {
        logMETARFetch('KLGA', temp, timestamp, true);
      }).not.toThrow();
    });

    test('should log failed METAR fetch', () => {
      const timestamp = Timestamp.now();

      expect(() => {
        logMETARFetch('KLGA', null, timestamp, false);
      }).not.toThrow();
    });
  });

  describe('Probability Calculation Logging', () => {
    test('should log probability calculation', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(22);
      const threshold = PrecisionTemperature.fromCelsius(20);

      expect(() => {
        logProbabilityCalculation('KLGA', currentTemp, threshold, 0.75, 0.15);
      }).not.toThrow();
    });
  });

  describe('Order Placement Logging', () => {
    test('should log successful order placement', () => {
      expect(() => {
        logOrderPlacement(
          'market-1',
          'token-1',
          'BUY',
          0.55,
          100,
          'order-123',
          true
        );
      }).not.toThrow();
    });

    test('should log failed order placement', () => {
      expect(() => {
        logOrderPlacement(
          'market-1',
          'token-1',
          'SELL',
          0.45,
          50,
          '',
          false
        );
      }).not.toThrow();
    });
  });

  describe('Kill-Switch Logging', () => {
    test('should log kill-switch activation', () => {
      const timestamp = Timestamp.now();

      expect(() => {
        logKillSwitchActivation(
          'MACRO_LOSS',
          'Loss exceeds 20% of budget',
          timestamp
        );
      }).not.toThrow();
    });

    test('should log kill-switch deactivation', () => {
      expect(() => {
        logKillSwitchDeactivation('MACRO_LOSS');
      }).not.toThrow();
    });

    test('should log kill-switch deactivation with no previous reason', () => {
      expect(() => {
        logKillSwitchDeactivation(null);
      }).not.toThrow();
    });
  });

  describe('Trading Signal Logging', () => {
    test('should log trading signal generation', () => {
      expect(() => {
        logTradingSignal('market-1', 'BUY', 0.15, 0.75, 0.60);
      }).not.toThrow();
    });

    test('should log HOLD signal', () => {
      expect(() => {
        logTradingSignal('market-1', 'HOLD', 0.02, 0.52, 0.50);
      }).not.toThrow();
    });
  });

  describe('Market Discovery Logging', () => {
    test('should log market discovery', () => {
      expect(() => {
        logMarketDiscovery(50, 10, ['KLGA', 'KORD']);
      }).not.toThrow();
    });
  });

  describe('P&L Logging', () => {
    test('should log P&L update', () => {
      expect(() => {
        logPnLUpdate(50, 10, 60);
      }).not.toThrow();
    });

    test('should log negative P&L', () => {
      expect(() => {
        logPnLUpdate(-30, -10, -40);
      }).not.toThrow();
    });
  });

  describe('System Lifecycle Logging', () => {
    test('should log system initialization', () => {
      expect(() => {
        logSystemInitialization(true, 1000, 0.05);
      }).not.toThrow();
    });

    test('should log system shutdown', () => {
      expect(() => {
        logSystemShutdown();
      }).not.toThrow();
    });
  });

  describe('Log File Creation', () => {
    test('should create log file when logging events', () => {
      const temp = PrecisionTemperature.fromCelsius(20);
      const timestamp = Timestamp.now();

      logMETARFetch('KLGA', temp, timestamp, true);

      // Log file should exist
      expect(existsSync(testLogFile)).toBe(true);
    });
  });
});
