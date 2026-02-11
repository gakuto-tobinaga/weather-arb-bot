/**
 * Signal Generator
 * 
 * Generates trading signals based on EV calculations.
 * Filters signals by EV threshold and market expiration.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type { Config } from '../config';
import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';
import type { TradingSignal, SignalAction, SignalGenerationResult } from './types';
import { calculateProbability, calculateEV, isMarketExpired } from '../probability/calculator';
import type { Duration } from '../types/timestamp';

/**
 * Market information for signal generation
 */
export type MarketInfo = {
  readonly marketId: string;
  readonly tokenId: string;
  readonly icaoCode: string;
  readonly threshold: PrecisionTemperature;
  readonly observationEnd: Timestamp;
  readonly marketPrice: number;
};

/**
 * Signal Generator
 * 
 * Generates trading signals based on EV calculations.
 */
export class SignalGenerator {
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Generate trading signal for a single market
   * 
   * Requirement 6.1: Generate signal only if EV > threshold
   * Requirement 6.2: Compare EV against MIN_EV threshold
   * 
   * @param market - Market information
   * @param currentTemp - Current temperature from METAR
   * @param now - Current timestamp
   * @returns Trading signal or null if filtered
   */
  generateSignal(
    market: MarketInfo,
    currentTemp: PrecisionTemperature,
    now: Timestamp
  ): TradingSignal | null {
    // Calculate time remaining
    const timeRemaining: Duration = {
      milliseconds: market.observationEnd.utc.getTime() - now.utc.getTime(),
      seconds: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 1000,
      minutes: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 60000,
      hours: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 3600000,
      isNegative: () => market.observationEnd.utc.getTime() - now.utc.getTime() < 0,
      isPositive: () => market.observationEnd.utc.getTime() - now.utc.getTime() > 0,
    };

    // Filter expired markets
    if (isMarketExpired(timeRemaining)) {
      return null;
    }

    // Calculate probability
    const probability = calculateProbability(
      currentTemp,
      market.threshold,
      market.icaoCode,
      timeRemaining
    );

    // Calculate EV
    const ev = calculateEV(probability, market.marketPrice);

    // Filter by EV threshold
    if (ev <= this.config.MIN_EV) {
      return null;
    }

    // Determine action based on EV
    const action: SignalAction = ev > 0 ? 'BUY' : 'HOLD';

    // Calculate recommended price (slightly better than market)
    const recommendedPrice = this.calculateRecommendedPrice(probability, market.marketPrice, action);

    // Calculate recommended size (will be implemented in Task 14.3)
    const recommendedSize = this.calculateRecommendedSize(ev);

    return {
      marketId: market.marketId,
      tokenId: market.tokenId,
      action,
      currentTemp,
      threshold: market.threshold,
      calculatedProbability: probability,
      marketPrice: market.marketPrice,
      ev,
      recommendedPrice,
      recommendedSize,
      timestamp: now,
      icaoCode: market.icaoCode,
    };
  }

  /**
   * Generate signals for multiple markets
   * 
   * Requirement 6.4: Process markets by EV priority
   * 
   * @param markets - Array of market information
   * @param currentTemp - Current temperature from METAR
   * @param now - Current timestamp
   * @returns Signal generation result with statistics
   */
  generateSignals(
    markets: MarketInfo[],
    currentTemp: PrecisionTemperature,
    now: Timestamp
  ): SignalGenerationResult {
    let filteredByEV = 0;
    let filteredByExpired = 0;

    // Generate signals for all markets
    const allSignals: (TradingSignal | null)[] = markets.map(market => {
      const signal = this.generateSignal(market, currentTemp, now);
      
      if (signal === null) {
        // Check if filtered by expiration or EV
        const timeRemaining: Duration = {
          milliseconds: market.observationEnd.utc.getTime() - now.utc.getTime(),
          seconds: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 1000,
          minutes: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 60000,
          hours: (market.observationEnd.utc.getTime() - now.utc.getTime()) / 3600000,
          isNegative: () => market.observationEnd.utc.getTime() - now.utc.getTime() < 0,
          isPositive: () => market.observationEnd.utc.getTime() - now.utc.getTime() > 0,
        };

        if (isMarketExpired(timeRemaining)) {
          filteredByExpired++;
        } else {
          filteredByEV++;
        }
      }

      return signal;
    });

    // Filter out null signals
    const signals = allSignals.filter((s): s is TradingSignal => s !== null);

    // Sort by EV descending (highest EV first)
    signals.sort((a, b) => b.ev - a.ev);

    return {
      signals,
      totalSignals: signals.length,
      filteredByEV,
      filteredByExpired,
    };
  }

  /**
   * Calculate recommended price for order placement
   * 
   * @param probability - Calculated probability
   * @param marketPrice - Current market price
   * @param action - Trading action
   * @returns Recommended price
   */
  private calculateRecommendedPrice(
    probability: number,
    marketPrice: number,
    action: SignalAction
  ): number {
    if (action === 'BUY') {
      // Place bid slightly below calculated probability
      // This ensures we're still getting value while being competitive
      return Math.max(0, Math.min(1, probability - 0.01));
    }

    // For HOLD, return market price
    return marketPrice;
  }

  /**
   * Calculate recommended position size
   * 
   * Requirement 6.3: Calculate position size based on EV and capital
   * 
   * Uses Kelly Criterion-inspired sizing:
   * - Size proportional to EV
   * - Capped at maximum percentage of budget
   * - Ensures size is non-negative
   * - Never exceeds available capital
   * 
   * @param ev - Expected value
   * @returns Recommended size in USDC
   */
  private calculateRecommendedSize(ev: number): number {
    // Kelly Criterion: f = edge / odds
    // Simplified: size proportional to EV, capped at max allocation
    
    const maxAllocationPercent = 0.1; // Max 10% of budget per trade
    const maxSize = this.config.BUDGET * maxAllocationPercent;
    
    // Base size proportional to EV
    // EV of 0.05 (5%) -> 5% of max allocation
    // EV of 0.20 (20%) -> 20% of max allocation
    const evRatio = Math.min(ev, 1.0); // Cap at 100%
    const size = maxSize * evRatio;
    
    // Ensure size is non-negative and doesn't exceed capital
    return Math.max(0, Math.min(size, this.config.BUDGET));
  }

  /**
   * Check if signal should be generated based on EV threshold
   * 
   * Requirement 6.1: Generate signal only if EV > threshold
   * 
   * @param ev - Expected value
   * @returns True if signal should be generated
   */
  shouldGenerateSignal(ev: number): boolean {
    return ev > this.config.MIN_EV;
  }

  /**
   * Get minimum EV threshold
   * 
   * @returns Minimum EV threshold
   */
  getMinEV(): number {
    return this.config.MIN_EV;
  }
}
