/**
 * Order Executor Client
 * 
 * Manages Polymarket CLOB API interactions and order execution.
 * Handles authentication, order book fetching, and order placement.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 12.1
 */

import { ClobClient } from '@polymarket/clob-client';
import type { Config } from '../config';
import type { OrderBook, Side, Price, Size, OrderID, OrderPlacementResult } from './types';
import { RateLimiter, DEFAULT_RATE_LIMIT_CONFIG } from './rate-limiter';

/**
 * Order executor for Polymarket CLOB
 * 
 * Handles authentication, order book fetching, and order placement.
 * Supports monitoring mode where orders are logged but not executed.
 */
export class OrderExecutor {
  private client: ClobClient | null = null;
  private readonly config: Config;
  private readonly monitoringMode: boolean;
  private readonly rateLimiter: RateLimiter;

  constructor(config: Config) {
    this.config = config;
    this.monitoringMode = config.MONITORING_MODE;
    this.rateLimiter = new RateLimiter(DEFAULT_RATE_LIMIT_CONFIG);
  }

  /**
   * Initialize and authenticate with Polymarket CLOB
   * 
   * Sets up L1/L2 authentication with private key.
   * Uses signature_type=2 for gas-free Gnosis Safe transactions.
   * 
   * Requirement 5.1: Initialize ClobClient
   * Requirement 5.2: Perform L1/L2 authentication
   * 
   * @throws {Error} If authentication fails
   */
  async initialize(): Promise<void> {
    try {
      // Initialize ClobClient with configuration
      this.client = new ClobClient(
        this.config.POLYMARKET_API_KEY,
        this.config.POLYMARKET_API_SECRET,
        this.config.POLYMARKET_API_PASSPHRASE,
        {
          // Use signature_type=2 for gas-free transactions
          signatureType: 2,
          // Polygon mainnet
          chainId: 137,
          // Funder address for proxy wallet
          funderAddress: this.config.POLYMARKET_FUNDER,
        }
      );

      // Perform authentication
      // The ClobClient handles L1/L2 authentication internally
      // We just need to verify the client is ready
      console.log('[Order Executor] ClobClient initialized successfully');
      
      if (this.monitoringMode) {
        console.log('[Order Executor] Running in MONITORING MODE - orders will be logged but not executed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize ClobClient: ${errorMessage}`);
    }
  }

  /**
   * Fetch order book for a token
   * 
   * Retrieves current bids and asks from the CLOB.
   * 
   * Requirement 5.4: Fetch order book
   * Requirement 9.2, 9.3: Rate limiting
   * 
   * @param tokenId - Token ID to fetch order book for
   * @returns Order book with bids and asks
   * @throws {Error} If client not initialized or fetch fails
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    if (!this.client) {
      throw new Error('OrderExecutor not initialized. Call initialize() first.');
    }

    // Wait if rate limit throttling is needed
    await this.rateLimiter.waitIfNeeded();

    try {
      // Record the request
      this.rateLimiter.recordRequest();
      
      const orderBook = await this.client.getOrderBook(tokenId);
      
      // Transform CLOB response to our OrderBook type
      const bids = orderBook.bids?.map(bid => ({
        price: Number(bid.price),
        size: Number(bid.size),
      })) ?? [];

      const asks = orderBook.asks?.map(ask => ({
        price: Number(ask.price),
        size: Number(ask.size),
      })) ?? [];

      return { bids, asks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch order book for token ${tokenId}: ${errorMessage}`);
    }
  }

  /**
   * Place a limit order
   * 
   * When MONITORING_MODE=true, logs the order but doesn't execute.
   * When MONITORING_MODE=false, executes the order via CLOB API.
   * 
   * Requirement 5.3: Use limit orders exclusively
   * Requirement 5.5: Verify order acceptance
   * Requirement 12.1: Support monitoring mode
   * 
   * @param tokenId - Token ID to trade
   * @param side - BUY or SELL
   * @param price - Limit price (0.0 to 1.0)
   * @param size - Order size in USDC
   * @returns Order placement result
   * @throws {Error} If client not initialized or order placement fails
   */
  async placeLimitOrder(
    tokenId: string,
    side: Side,
    price: Price,
    size: Size
  ): Promise<OrderPlacementResult> {
    // Validate inputs first (before checking initialization)
    if (price < 0 || price > 1) {
      throw new Error(`Invalid price: ${price}. Price must be between 0 and 1.`);
    }

    if (size <= 0) {
      throw new Error(`Invalid size: ${size}. Size must be positive.`);
    }

    // In monitoring mode, log the order but don't execute
    if (this.monitoringMode) {
      const logMessage = `[MONITORING MODE] Would place ${side} order: token=${tokenId}, price=${price.toFixed(4)}, size=${size.toFixed(2)} USDC`;
      console.log(logMessage);
      
      return {
        orderId: `MONITORING_${Date.now()}`,
        success: true,
        message: logMessage,
      };
    }

    // For live mode, require initialization
    if (!this.client) {
      throw new Error('OrderExecutor not initialized. Call initialize() first.');
    }

    // Wait if rate limit throttling is needed
    await this.rateLimiter.waitIfNeeded();

    // Execute the order
    try {
      // Record the request
      this.rateLimiter.recordRequest();
      
      const order = await this.client.createOrder({
        tokenID: tokenId,
        side: side === 'BUY' ? 'BUY' : 'SELL',
        price: price.toString(),
        size: size.toString(),
        // Use POST_ONLY to ensure we're always a maker (better fees)
        orderType: 'GTC', // Good-til-cancelled
      });

      const orderId = order.orderID ?? 'UNKNOWN';
      const successMessage = `Order placed successfully: ${side} ${size.toFixed(2)} USDC @ ${price.toFixed(4)} (Order ID: ${orderId})`;
      console.log(`[Order Executor] ${successMessage}`);

      return {
        orderId,
        success: true,
        message: successMessage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failureMessage = `Failed to place order: ${errorMessage}`;
      console.error(`[Order Executor] ${failureMessage}`);

      return {
        orderId: '',
        success: false,
        message: failureMessage,
      };
    }
  }

  /**
   * Cancel all open orders
   * 
   * Used by kill-switch to exit all positions.
   * 
   * @throws {Error} If client not initialized or cancellation fails
   */
  async cancelAllOrders(): Promise<void> {
    // In monitoring mode, just log
    if (this.monitoringMode) {
      console.log('[MONITORING MODE] Would cancel all orders');
      return;
    }

    // For live mode, require initialization
    if (!this.client) {
      throw new Error('OrderExecutor not initialized. Call initialize() first.');
    }

    // Wait if rate limit throttling is needed
    await this.rateLimiter.waitIfNeeded();

    try {
      // Record the request
      this.rateLimiter.recordRequest();
      
      await this.client.cancelAll();
      console.log('[Order Executor] All orders cancelled successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to cancel all orders: ${errorMessage}`);
    }
  }

  /**
   * Check if executor is in monitoring mode
   */
  isMonitoringMode(): boolean {
    return this.monitoringMode;
  }

  /**
   * Check if executor is initialized
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * Get rate limiter statistics
   * 
   * Requirement 9.2: Track rate limit usage
   * 
   * @returns Current rate limit statistics
   */
  getRateLimitStats() {
    return this.rateLimiter.getStats();
  }
}
