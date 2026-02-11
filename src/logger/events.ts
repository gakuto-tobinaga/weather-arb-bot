/**
 * Logging Event Helpers
 * 
 * Structured logging for significant system events.
 * 
 * Requirements: 6.5, 7.5, 10.1, 10.2, 10.3, 10.4
 */

import { getLogger } from './index';
import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';

/**
 * Log METAR fetch event
 * 
 * Requirement 10.1: Log METAR fetches with timestamp, ICAO, temperature
 * 
 * @param icaoCode - ICAO station code
 * @param temperature - Temperature from METAR
 * @param timestamp - Observation timestamp
 * @param success - Whether fetch was successful
 */
export function logMETARFetch(
  icaoCode: string,
  temperature: PrecisionTemperature | null,
  timestamp: Timestamp,
  success: boolean
): void {
  const logger = getLogger();
  
  if (success && temperature !== null) {
    logger.info('metar-client', 'metar-fetch-success', {
      icaoCode,
      temperature: temperature as number,
      timestamp: timestamp.utc.toISOString(),
    });
  } else {
    logger.error('metar-client', 'metar-fetch-failed', {
      icaoCode,
      timestamp: timestamp.utc.toISOString(),
    });
  }
}

/**
 * Log probability calculation
 * 
 * Requirement 10.2: Log probability calculations with inputs and outputs
 * 
 * @param icaoCode - ICAO station code
 * @param currentTemp - Current temperature
 * @param threshold - Temperature threshold
 * @param probability - Calculated probability
 * @param ev - Expected value
 */
export function logProbabilityCalculation(
  icaoCode: string,
  currentTemp: PrecisionTemperature,
  threshold: PrecisionTemperature,
  probability: number,
  ev: number
): void {
  const logger = getLogger();
  
  logger.info('probability-engine', 'probability-calculated', {
    icaoCode,
    currentTemp: currentTemp as number,
    threshold: threshold as number,
    probability,
    ev,
  });
}

/**
 * Log order placement
 * 
 * Requirement 10.3: Log order placements with market ID, side, price, size
 * 
 * @param marketId - Market identifier
 * @param tokenId - Token identifier
 * @param side - Order side (BUY/SELL)
 * @param price - Order price
 * @param size - Order size
 * @param orderId - Order ID (if successful)
 * @param success - Whether order was successful
 */
export function logOrderPlacement(
  marketId: string,
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number,
  orderId: string,
  success: boolean
): void {
  const logger = getLogger();
  
  if (success) {
    logger.info('order-executor', 'order-placed', {
      marketId,
      tokenId,
      side,
      price,
      size,
      orderId,
    });
  } else {
    logger.error('order-executor', 'order-failed', {
      marketId,
      tokenId,
      side,
      price,
      size,
    });
  }
}

/**
 * Log kill-switch activation
 * 
 * Requirement 7.5, 10.4: Log kill-switch activations with reason and state
 * 
 * @param reason - Kill-switch reason type
 * @param message - Detailed message
 * @param timestamp - Activation timestamp
 */
export function logKillSwitchActivation(
  reason: string,
  message: string,
  timestamp: Timestamp
): void {
  const logger = getLogger();
  
  logger.error('risk-manager', 'kill-switch-activated', {
    reason,
    message,
    timestamp: timestamp.utc.toISOString(),
  });
}

/**
 * Log kill-switch deactivation
 * 
 * @param previousReason - Previous kill-switch reason
 */
export function logKillSwitchDeactivation(previousReason: string | null): void {
  const logger = getLogger();
  
  logger.info('risk-manager', 'kill-switch-deactivated', {
    previousReason: previousReason ?? 'none',
  });
}

/**
 * Log trading signal generation
 * 
 * Requirement 6.5: Log signal generation with EV and market info
 * 
 * @param marketId - Market identifier
 * @param action - Trading action
 * @param ev - Expected value
 * @param probability - Calculated probability
 * @param marketPrice - Current market price
 */
export function logTradingSignal(
  marketId: string,
  action: 'BUY' | 'SELL' | 'HOLD',
  ev: number,
  probability: number,
  marketPrice: number
): void {
  const logger = getLogger();
  
  logger.info('signal-generator', 'signal-generated', {
    marketId,
    action,
    ev,
    probability,
    marketPrice,
  });
}

/**
 * Log market discovery
 * 
 * @param totalMarkets - Total markets discovered
 * @param filteredMarkets - Markets after filtering
 * @param icaoCodes - ICAO codes used for filtering
 */
export function logMarketDiscovery(
  totalMarkets: number,
  filteredMarkets: number,
  icaoCodes: string[]
): void {
  const logger = getLogger();
  
  logger.info('market-discovery', 'markets-discovered', {
    totalMarkets,
    filteredMarkets,
    icaoCodes,
  });
}

/**
 * Log P&L update
 * 
 * @param realized - Realized P&L
 * @param unrealized - Unrealized P&L
 * @param total - Total P&L
 */
export function logPnLUpdate(
  realized: number,
  unrealized: number,
  total: number
): void {
  const logger = getLogger();
  
  logger.info('risk-manager', 'pnl-updated', {
    realized,
    unrealized,
    total,
  });
}

/**
 * Log system initialization
 * 
 * @param monitoringMode - Whether in monitoring mode
 * @param budget - Trading budget
 * @param minEV - Minimum EV threshold
 */
export function logSystemInitialization(
  monitoringMode: boolean,
  budget: number,
  minEV: number
): void {
  const logger = getLogger();
  
  logger.info('system', 'initialization', {
    monitoringMode,
    budget,
    minEV,
  });
}

/**
 * Log system shutdown
 */
export function logSystemShutdown(): void {
  const logger = getLogger();
  
  logger.info('system', 'shutdown', {
    timestamp: new Date().toISOString(),
  });
}
