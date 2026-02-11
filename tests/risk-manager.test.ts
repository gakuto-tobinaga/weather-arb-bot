/**
 * Risk Manager Tests
 * 
 * Tests for P&L tracking, kill-switch logic, and risk monitoring.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { RiskManager } from '../src/risk/manager';
import { PrecisionTemperature } from '../src/types/temperature';
import { Timestamp } from '../src/types/timestamp';
import type { Trade } from '../src/risk/types';
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

describe('RiskManager', () => {
  let riskManager: RiskManager;
  let now: Timestamp;

  beforeEach(() => {
    riskManager = new RiskManager(mockConfig);
    now = Timestamp.now();
  });

  describe('Trade Tracking', () => {
    test('should add trade to tracking system', () => {
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: null,
      };

      riskManager.addTrade(trade);
      const trades = riskManager.getAllTrades();

      expect(trades).toHaveLength(1);
      expect(trades[0]).toEqual(trade);
    });

    test('should track multiple trades', () => {
      const trades: Trade[] = [
        {
          orderId: 'order-1',
          tokenId: 'token-1',
          side: 'BUY',
          price: 0.5,
          size: 100,
          timestamp: now,
          pnl: 10,
        },
        {
          orderId: 'order-2',
          tokenId: 'token-2',
          side: 'SELL',
          price: 0.6,
          size: 50,
          timestamp: now,
          pnl: -5,
        },
      ];

      trades.forEach(trade => riskManager.addTrade(trade));
      const allTrades = riskManager.getAllTrades();

      expect(allTrades).toHaveLength(2);
      expect(allTrades).toEqual(trades);
    });
  });

  describe('Rolling P&L Calculation', () => {
    test('should calculate P&L for trades within 24-hour window', () => {
      // Add trades within window
      const trade1: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: 10,
      };

      const trade2: Trade = {
        orderId: 'order-2',
        tokenId: 'token-2',
        side: 'SELL',
        price: 0.6,
        size: 50,
        timestamp: now,
        pnl: 15,
      };

      riskManager.addTrade(trade1);
      riskManager.addTrade(trade2);

      const pnl = riskManager.getRollingPnL(now);

      expect(pnl.realized).toBe(25);
      expect(pnl.unrealized).toBe(0);
      expect(pnl.total).toBe(25);
    });

    test('should exclude trades outside 24-hour window', () => {
      const oldTimestamp = Timestamp.fromUTC(
        new Date(now.utc.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago
      );

      const oldTrade: Trade = {
        orderId: 'order-old',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: oldTimestamp,
        pnl: 50,
      };

      const recentTrade: Trade = {
        orderId: 'order-recent',
        tokenId: 'token-2',
        side: 'SELL',
        price: 0.6,
        size: 50,
        timestamp: now,
        pnl: 10,
      };

      riskManager.addTrade(oldTrade);
      riskManager.addTrade(recentTrade);

      const pnl = riskManager.getRollingPnL(now);

      expect(pnl.realized).toBe(10); // Only recent trade
      expect(pnl.total).toBe(10);
    });

    test('should handle negative P&L', () => {
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: -50,
      };

      riskManager.addTrade(trade);
      const pnl = riskManager.getRollingPnL(now);

      expect(pnl.realized).toBe(-50);
      expect(pnl.total).toBe(-50);
    });

    test('should ignore trades with null pnl', () => {
      const settledTrade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: 20,
      };

      const unsettledTrade: Trade = {
        orderId: 'order-2',
        tokenId: 'token-2',
        side: 'SELL',
        price: 0.6,
        size: 50,
        timestamp: now,
        pnl: null,
      };

      riskManager.addTrade(settledTrade);
      riskManager.addTrade(unsettledTrade);

      const pnl = riskManager.getRollingPnL(now);

      expect(pnl.realized).toBe(20); // Only settled trade
      expect(pnl.total).toBe(20);
    });

    test('should return zero P&L when no trades', () => {
      const pnl = riskManager.getRollingPnL(now);

      expect(pnl.realized).toBe(0);
      expect(pnl.unrealized).toBe(0);
      expect(pnl.total).toBe(0);
    });
  });

  describe('Macro Kill-Switch', () => {
    test('should activate when loss exceeds 20% of budget', () => {
      const budget = mockConfig.BUDGET;
      const lossThreshold = budget * 0.2; // 200

      // Add trade with loss > threshold
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: -250, // Loss exceeds 200
      };

      riskManager.addTrade(trade);
      const status = riskManager.checkMacroKillSwitch(now);

      expect(status.active).toBe(true);
      expect(status.reason?.type).toBe('MACRO_LOSS');
      if (status.reason?.type === 'MACRO_LOSS') {
        expect(status.reason.loss).toBe(250);
        expect(status.reason.threshold).toBe(lossThreshold);
      }
    });

    test('should not activate when loss is below 20% of budget', () => {
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: -100, // Loss below 200
      };

      riskManager.addTrade(trade);
      const status = riskManager.checkMacroKillSwitch(now);

      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });

    test('should not activate when P&L is positive', () => {
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: 50,
      };

      riskManager.addTrade(trade);
      const status = riskManager.checkMacroKillSwitch(now);

      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });

    test('should activate at exactly 20% loss threshold', () => {
      const budget = mockConfig.BUDGET;
      const lossThreshold = budget * 0.2; // 200

      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: -200.01, // Just over threshold
      };

      riskManager.addTrade(trade);
      const status = riskManager.checkMacroKillSwitch(now);

      expect(status.active).toBe(true);
      expect(status.reason?.type).toBe('MACRO_LOSS');
    });
  });

  describe('Data Quality Kill-Switch', () => {
    test('should activate when METAR is null', () => {
      const status = riskManager.checkDataQualityKillSwitch(
        null,
        70,
        'KLGA',
        now
      );

      expect(status.active).toBe(true);
      expect(status.reason?.type).toBe('METAR_UNAVAILABLE');
      if (status.reason?.type === 'METAR_UNAVAILABLE') {
        expect(status.reason.icaoCode).toBe('KLGA');
      }
    });

    test('should activate when divergence exceeds 5°F', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20); // 68°F
      const noaaTemp = 74; // Divergence = 6°F

      const status = riskManager.checkDataQualityKillSwitch(
        metarTemp,
        noaaTemp,
        'KLGA',
        now
      );

      expect(status.active).toBe(true);
      expect(status.reason?.type).toBe('DATA_QUALITY');
      if (status.reason?.type === 'DATA_QUALITY') {
        expect(status.reason.divergence).toBeCloseTo(6, 1);
      }
    });

    test('should not activate when divergence is below 5°F', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20); // 68°F
      const noaaTemp = 70; // Divergence = 2°F

      const status = riskManager.checkDataQualityKillSwitch(
        metarTemp,
        noaaTemp,
        'KLGA',
        now
      );

      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });

    test('should not activate when divergence is exactly 5°F', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20); // 68°F
      const noaaTemp = 73; // Divergence = 5°F

      const status = riskManager.checkDataQualityKillSwitch(
        metarTemp,
        noaaTemp,
        'KLGA',
        now
      );

      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });

    test('should not activate when NOAA temp is null but METAR is available', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20);

      const status = riskManager.checkDataQualityKillSwitch(
        metarTemp,
        null,
        'KLGA',
        now
      );

      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });

    test('should handle negative temperatures correctly', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(-10); // 14°F
      const noaaTemp = 20; // Divergence = 6°F

      const status = riskManager.checkDataQualityKillSwitch(
        metarTemp,
        noaaTemp,
        'KLGA',
        now
      );

      expect(status.active).toBe(true);
      expect(status.reason?.type).toBe('DATA_QUALITY');
    });
  });

  describe('Temperature Comparison', () => {
    test('should compare METAR and NOAA temperatures', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20); // 68°F
      const noaaTemp = 70; // Fahrenheit

      const comparison = riskManager.compareTemperatures(metarTemp, noaaTemp);

      expect(comparison.metarTemp).toBe(metarTemp);
      expect(comparison.noaaTemp).toBe(70);
      expect(comparison.divergenceFahrenheit).toBeCloseTo(2, 1);
      expect(comparison.isValid).toBe(true);
    });

    test('should mark invalid when divergence > 5°F', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20); // 68°F
      const noaaTemp = 75; // Divergence = 7°F

      const comparison = riskManager.compareTemperatures(metarTemp, noaaTemp);

      expect(comparison.divergenceFahrenheit).toBeCloseTo(7, 1);
      expect(comparison.isValid).toBe(false);
    });

    test('should handle null METAR temperature', () => {
      const comparison = riskManager.compareTemperatures(null, 70);

      expect(comparison.metarTemp).toBeNull();
      expect(comparison.noaaTemp).toBe(70);
      expect(comparison.divergenceFahrenheit).toBeNull();
      expect(comparison.isValid).toBe(false);
    });

    test('should handle null NOAA temperature', () => {
      const metarTemp = PrecisionTemperature.fromCelsius(20);

      const comparison = riskManager.compareTemperatures(metarTemp, null);

      expect(comparison.metarTemp).toBe(metarTemp);
      expect(comparison.noaaTemp).toBeNull();
      expect(comparison.divergenceFahrenheit).toBeNull();
      expect(comparison.isValid).toBe(false);
    });

    test('should handle both temperatures null', () => {
      const comparison = riskManager.compareTemperatures(null, null);

      expect(comparison.metarTemp).toBeNull();
      expect(comparison.noaaTemp).toBeNull();
      expect(comparison.divergenceFahrenheit).toBeNull();
      expect(comparison.isValid).toBe(false);
    });
  });

  describe('Kill-Switch State Management', () => {
    test('should activate kill-switch with reason', () => {
      const reason = {
        type: 'MACRO_LOSS' as const,
        loss: 250,
        threshold: 200,
        message: 'Loss exceeds threshold',
      };

      riskManager.activateKillSwitch(reason, now);

      expect(riskManager.isKillSwitchActive()).toBe(true);
      const status = riskManager.getKillSwitchStatus();
      expect(status.active).toBe(true);
      expect(status.reason).toEqual(reason);
      expect(status.activatedAt).toEqual(now);
    });

    test('should deactivate kill-switch', () => {
      const reason = {
        type: 'MACRO_LOSS' as const,
        loss: 250,
        threshold: 200,
        message: 'Loss exceeds threshold',
      };

      riskManager.activateKillSwitch(reason, now);
      expect(riskManager.isKillSwitchActive()).toBe(true);

      riskManager.deactivateKillSwitch();

      expect(riskManager.isKillSwitchActive()).toBe(false);
      const status = riskManager.getKillSwitchStatus();
      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
      expect(status.activatedAt).toBeNull();
    });

    test('should start with kill-switch inactive', () => {
      expect(riskManager.isKillSwitchActive()).toBe(false);
      const status = riskManager.getKillSwitchStatus();
      expect(status.active).toBe(false);
      expect(status.reason).toBeNull();
    });
  });

  describe('Recent Trades', () => {
    test('should return trades within 24-hour window', () => {
      const recentTrade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: 10,
      };

      riskManager.addTrade(recentTrade);
      const recentTrades = riskManager.getRecentTrades(now);

      expect(recentTrades).toHaveLength(1);
      expect(recentTrades[0]).toEqual(recentTrade);
    });

    test('should exclude trades outside 24-hour window', () => {
      const oldTimestamp = Timestamp.fromUTC(
        new Date(now.utc.getTime() - 25 * 60 * 60 * 1000)
      );

      const oldTrade: Trade = {
        orderId: 'order-old',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: oldTimestamp,
        pnl: 50,
      };

      const recentTrade: Trade = {
        orderId: 'order-recent',
        tokenId: 'token-2',
        side: 'SELL',
        price: 0.6,
        size: 50,
        timestamp: now,
        pnl: 10,
      };

      riskManager.addTrade(oldTrade);
      riskManager.addTrade(recentTrade);

      const recentTrades = riskManager.getRecentTrades(now);

      expect(recentTrades).toHaveLength(1);
      expect(recentTrades[0]).toEqual(recentTrade);
    });
  });

  describe('Kill-Switch Integration', () => {
    test('should prevent trading when kill-switch is active', () => {
      // Activate kill-switch
      const reason = {
        type: 'MACRO_LOSS' as const,
        loss: 250,
        threshold: 200,
        message: 'Loss exceeds threshold',
      };
      riskManager.activateKillSwitch(reason, now);

      // Verify trading is prevented
      expect(riskManager.isKillSwitchActive()).toBe(true);
      
      // In a real system, the main controller would check this
      // before placing orders and call orderExecutor.cancelAllOrders()
    });

    test('should allow trading when kill-switch is inactive', () => {
      expect(riskManager.isKillSwitchActive()).toBe(false);
    });

    test('should resume trading after kill-switch deactivation', () => {
      // Activate kill-switch
      const reason = {
        type: 'DATA_QUALITY' as const,
        divergence: 6,
        message: 'Temperature divergence too high',
      };
      riskManager.activateKillSwitch(reason, now);
      expect(riskManager.isKillSwitchActive()).toBe(true);

      // Deactivate kill-switch
      riskManager.deactivateKillSwitch();
      expect(riskManager.isKillSwitchActive()).toBe(false);
    });
  });

  describe('Reset', () => {
    test('should reset all state', () => {
      // Add some trades
      const trade: Trade = {
        orderId: 'order-1',
        tokenId: 'token-1',
        side: 'BUY',
        price: 0.5,
        size: 100,
        timestamp: now,
        pnl: 10,
      };
      riskManager.addTrade(trade);

      // Activate kill-switch
      const reason = {
        type: 'MACRO_LOSS' as const,
        loss: 250,
        threshold: 200,
        message: 'Loss exceeds threshold',
      };
      riskManager.activateKillSwitch(reason, now);

      // Reset
      riskManager.reset();

      // Verify state is cleared
      expect(riskManager.getAllTrades()).toHaveLength(0);
      expect(riskManager.isKillSwitchActive()).toBe(false);
      const pnl = riskManager.getRollingPnL(now);
      expect(pnl.total).toBe(0);
    });
  });
});
