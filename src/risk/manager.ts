/**
 * Risk Manager
 * 
 * Monitors system health and enforces kill-switch conditions.
 * Tracks P&L in rolling 24-hour window and checks data quality.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4
 */

import type { Config } from '../config';
import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';
import type {
  KillSwitchStatus,
  KillSwitchReason,
  Trade,
  PnL,
  TemperatureComparison,
} from './types';

/**
 * Risk Manager
 * 
 * Monitors system health and enforces kill-switch conditions.
 */
export class RiskManager {
  private readonly config: Config;
  private trades: Trade[] = [];
  private killSwitchStatus: KillSwitchStatus = {
    active: false,
    reason: null,
    activatedAt: null,
  };

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Add a trade to the tracking system
   * 
   * Requirement 7.1: Track all trades with timestamps
   * 
   * @param trade - Trade to add
   */
  addTrade(trade: Trade): void {
    this.trades.push(trade);
    console.log(
      `[Risk Manager] Trade recorded: ${trade.side} ${trade.size} @ ${trade.price} (Order: ${trade.orderId})`
    );
  }

  /**
   * Get P&L for rolling 24-hour window
   * 
   * Requirement 7.1: Calculate cumulative P&L over rolling window
   * 
   * @param now - Current timestamp
   * @returns P&L summary
   */
  getRollingPnL(now: Timestamp): PnL {
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(now.utc.getTime() - windowMs);

    // Filter trades within the 24-hour window
    const recentTrades = this.trades.filter(
      trade => trade.timestamp.utc >= cutoffTime
    );

    // Calculate realized P&L (trades with settled pnl)
    const realized = recentTrades
      .filter(trade => trade.pnl !== null)
      .reduce((sum, trade) => sum + (trade.pnl ?? 0), 0);

    // Calculate unrealized P&L (trades without settled pnl)
    // For now, assume unrealized is 0 (will be updated when positions are marked to market)
    const unrealized = 0;

    const total = realized + unrealized;

    return {
      realized,
      unrealized,
      total,
    };
  }

  /**
   * Check macro kill-switch condition
   * 
   * Requirement 7.2: Trigger when loss > 20% of budget
   * 
   * @param now - Current timestamp
   * @returns Kill-switch status
   */
  checkMacroKillSwitch(now: Timestamp): KillSwitchStatus {
    const pnl = this.getRollingPnL(now);
    const lossThreshold = this.config.BUDGET * 0.2; // 20% of budget

    if (pnl.total < -lossThreshold) {
      const reason: KillSwitchReason = {
        type: 'MACRO_LOSS',
        loss: Math.abs(pnl.total),
        threshold: lossThreshold,
        message: `24-hour loss ($${Math.abs(pnl.total).toFixed(2)}) exceeds 20% of budget ($${lossThreshold.toFixed(2)})`,
      };

      return {
        active: true,
        reason,
        activatedAt: now,
      };
    }

    return {
      active: false,
      reason: null,
      activatedAt: null,
    };
  }

  /**
   * Check data quality kill-switch condition
   * 
   * Requirement 8.1, 8.2: Trigger when divergence > 5°F or METAR is null
   * 
   * @param metarTemp - Temperature from METAR (can be null)
   * @param noaaTemp - Temperature from NOAA API (can be null)
   * @param icaoCode - ICAO code for logging
   * @param now - Current timestamp
   * @returns Kill-switch status
   */
  checkDataQualityKillSwitch(
    metarTemp: PrecisionTemperature | null,
    noaaTemp: number | null,
    icaoCode: string,
    now: Timestamp
  ): KillSwitchStatus {
    // Requirement 8.3: Trigger when METAR returns null
    if (metarTemp === null) {
      const reason: KillSwitchReason = {
        type: 'METAR_UNAVAILABLE',
        icaoCode,
        message: `METAR data unavailable for ${icaoCode}`,
      };

      return {
        active: true,
        reason,
        activatedAt: now,
      };
    }

    // If NOAA data is available, check divergence
    if (noaaTemp !== null) {
      const metarTempF = (metarTemp as number) * 9 / 5 + 32;
      const divergence = Math.abs(metarTempF - noaaTemp);

      // Requirement 8.2: Trigger when divergence > 5°F
      if (divergence > 5) {
        const reason: KillSwitchReason = {
          type: 'DATA_QUALITY',
          divergence,
          message: `Temperature divergence (${divergence.toFixed(1)}°F) exceeds 5°F threshold for ${icaoCode}`,
        };

        return {
          active: true,
          reason,
          activatedAt: now,
        };
      }
    }

    return {
      active: false,
      reason: null,
      activatedAt: null,
    };
  }

  /**
   * Activate kill-switch
   * 
   * Requirement 7.5: Log kill-switch activation
   * 
   * @param reason - Reason for activation
   * @param now - Current timestamp
   */
  activateKillSwitch(reason: KillSwitchReason, now: Timestamp): void {
    this.killSwitchStatus = {
      active: true,
      reason,
      activatedAt: now,
    };

    console.error(
      `[Risk Manager] KILL-SWITCH ACTIVATED: ${reason.type} - ${reason.message}`
    );
  }

  /**
   * Deactivate kill-switch
   * 
   * Used for recovery after conditions improve.
   */
  deactivateKillSwitch(): void {
    if (this.killSwitchStatus.active) {
      console.log(
        `[Risk Manager] Kill-switch deactivated. Previous reason: ${this.killSwitchStatus.reason?.type}`
      );
    }

    this.killSwitchStatus = {
      active: false,
      reason: null,
      activatedAt: null,
    };
  }

  /**
   * Check if kill-switch is active
   * 
   * Requirement 7.3, 7.4: Prevent trading when kill-switch is active
   * 
   * @returns True if kill-switch is active
   */
  isKillSwitchActive(): boolean {
    return this.killSwitchStatus.active;
  }

  /**
   * Get current kill-switch status
   * 
   * @returns Current kill-switch status
   */
  getKillSwitchStatus(): KillSwitchStatus {
    return this.killSwitchStatus;
  }

  /**
   * Compare METAR and NOAA temperatures
   * 
   * Requirement 8.1: Compare temperatures for data quality check
   * 
   * @param metarTemp - Temperature from METAR
   * @param noaaTemp - Temperature from NOAA (Fahrenheit)
   * @returns Temperature comparison result
   */
  compareTemperatures(
    metarTemp: PrecisionTemperature | null,
    noaaTemp: number | null
  ): TemperatureComparison {
    if (metarTemp === null || noaaTemp === null) {
      return {
        metarTemp,
        noaaTemp,
        divergenceFahrenheit: null,
        isValid: false,
      };
    }

    const metarTempF = (metarTemp as number) * 9 / 5 + 32;
    const divergence = Math.abs(metarTempF - noaaTemp);
    const isValid = divergence <= 5;

    return {
      metarTemp,
      noaaTemp,
      divergenceFahrenheit: divergence,
      isValid,
    };
  }

  /**
   * Get all trades
   * 
   * @returns Array of all trades
   */
  getAllTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Get trades in rolling 24-hour window
   * 
   * @param now - Current timestamp
   * @returns Array of trades in window
   */
  getRecentTrades(now: Timestamp): Trade[] {
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(now.utc.getTime() - windowMs);

    return this.trades.filter(trade => trade.timestamp.utc >= cutoffTime);
  }

  /**
   * Reset risk manager state
   * 
   * Useful for testing.
   */
  reset(): void {
    this.trades = [];
    this.killSwitchStatus = {
      active: false,
      reason: null,
      activatedAt: null,
    };
  }
}
