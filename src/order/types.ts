/**
 * Order Executor Types
 * 
 * Type definitions for order execution, order books, and trading signals.
 * 
 * Requirements: 5.1, 5.3, 5.4, 6.1
 */

import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp } from '../types/timestamp';
import type { ICAOCode } from '../config';

/**
 * Trading side
 */
export type Side = 'BUY' | 'SELL';

/**
 * Price in probability space (0.0 to 1.0)
 */
export type Price = number;

/**
 * Size in USDC
 */
export type Size = number;

/**
 * Probability (0.0 to 1.0)
 */
export type Probability = number;

/**
 * Order ID from CLOB API
 */
export type OrderID = string;

/**
 * Order in the order book
 */
export type Order = {
  readonly price: Price;
  readonly size: Size;
};

/**
 * Order book with bids and asks
 */
export type OrderBook = {
  readonly bids: Order[];
  readonly asks: Order[];
};

/**
 * Expected value calculation result
 */
export type ExpectedValue = {
  readonly probability: Probability;
  readonly marketPrice: Price;
  readonly ev: number; // probability - marketPrice
  readonly recommendedPrice: Price;
  readonly recommendedSize: Size;
};

/**
 * Trading signal
 */
export type TradingSignal = {
  readonly tokenId: string;
  readonly side: Side;
  readonly currentTemp: PrecisionTemperature;
  readonly ev: ExpectedValue;
  readonly timestamp: Timestamp;
  readonly action: 'BUY' | 'SELL' | 'HOLD';
};

/**
 * Order placement result
 */
export type OrderPlacementResult = {
  readonly orderId: OrderID;
  readonly success: boolean;
  readonly message: string;
};
