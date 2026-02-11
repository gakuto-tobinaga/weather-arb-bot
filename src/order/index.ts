/**
 * Order Executor Module
 * 
 * Exports order execution functionality for Polymarket CLOB.
 */

export { OrderExecutor } from './client';
export type {
  Side,
  Price,
  Size,
  Probability,
  OrderID,
  Order,
  OrderBook,
  ExpectedValue,
  TradingSignal,
  OrderPlacementResult,
} from './types';
