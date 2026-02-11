/**
 * Trading Signal Types
 * 
 * Type definitions for trading signals and signal generation.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';

/**
 * Trading signal action
 */
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

/**
 * Trading signal with EV and market information
 * 
 * Requirement 6.1: Generate signal only if EV > threshold
 */
export type TradingSignal = {
  readonly marketId: string;
  readonly tokenId: string;
  readonly action: SignalAction;
  readonly currentTemp: PrecisionTemperature;
  readonly threshold: PrecisionTemperature;
  readonly calculatedProbability: number;
  readonly marketPrice: number;
  readonly ev: number;
  readonly recommendedPrice: number;
  readonly recommendedSize: number;
  readonly timestamp: Timestamp;
  readonly icaoCode: string;
};

/**
 * Signal generation result
 */
export type SignalGenerationResult = {
  readonly signals: TradingSignal[];
  readonly totalSignals: number;
  readonly filteredByEV: number;
  readonly filteredByExpired: number;
};
