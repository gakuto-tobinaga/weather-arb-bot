/**
 * Risk Management Types
 * 
 * Type definitions for kill-switch logic, P&L tracking, and risk monitoring.
 * 
 * Requirements: 7.1, 7.2, 8.1, 8.2, 8.3
 */

import type { Timestamp } from '../types/timestamp';
import type { PrecisionTemperature } from '../types/temperature';

/**
 * Kill-switch reason types
 * 
 * Requirement 7.1: Macro loss kill-switch
 * Requirement 8.1: Data quality kill-switch
 */
export type KillSwitchReason =
  | {
      type: 'MACRO_LOSS';
      loss: number;
      threshold: number;
      message: string;
    }
  | {
      type: 'DATA_QUALITY';
      divergence: number;
      message: string;
    }
  | {
      type: 'METAR_UNAVAILABLE';
      icaoCode: string;
      message: string;
    };

/**
 * Kill-switch status
 * 
 * Tracks whether kill-switch is active and why.
 */
export type KillSwitchStatus = {
  readonly active: boolean;
  readonly reason: KillSwitchReason | null;
  readonly activatedAt: Timestamp | null;
};

/**
 * Trade record for P&L tracking
 */
export type Trade = {
  readonly orderId: string;
  readonly tokenId: string;
  readonly side: 'BUY' | 'SELL';
  readonly price: number;
  readonly size: number;
  readonly timestamp: Timestamp;
  readonly pnl: number | null; // Set after settlement
};

/**
 * P&L summary
 * 
 * Requirement 7.1: Track P&L in rolling 24-hour window
 */
export type PnL = {
  readonly realized: number;
  readonly unrealized: number;
  readonly total: number;
};

/**
 * Temperature comparison for data quality check
 * 
 * Requirement 8.1, 8.2: Compare METAR with NOAA temperature
 */
export type TemperatureComparison = {
  readonly metarTemp: PrecisionTemperature | null;
  readonly noaaTemp: number | null; // Fahrenheit
  readonly divergenceFahrenheit: number | null;
  readonly isValid: boolean;
};
