/**
 * Rate Limiter for CLOB API
 * 
 * Tracks requests in a sliding window and throttles when approaching limits.
 * Polymarket CLOB API limit: 3,500 POST requests per 10 seconds.
 * 
 * Requirements: 9.2, 9.3
 */

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Throttle threshold (0.0 to 1.0) - throttle when usage exceeds this percentage */
  throttleThreshold: number;
}

/**
 * Default configuration for Polymarket CLOB API
 * Limit: 3,500 POST requests per 10 seconds
 * Throttle at 90% capacity (3,150 requests)
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimiterConfig = {
  maxRequests: 3500,
  windowMs: 10000, // 10 seconds
  throttleThreshold: 0.9, // 90%
};

/**
 * Rate limiter using sliding window algorithm
 * 
 * Tracks request timestamps and removes expired entries.
 * Provides throttling when approaching rate limits.
 */
export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private requestTimestamps: number[] = [];

  constructor(config: RateLimiterConfig = DEFAULT_RATE_LIMIT_CONFIG) {
    this.config = config;
  }

  /**
   * Record a request
   * 
   * Adds current timestamp to the sliding window.
   * Automatically removes expired timestamps.
   * 
   * Requirement 9.2: Track requests in sliding window
   */
  recordRequest(): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.removeExpiredTimestamps(now);
  }

  /**
   * Get current request count in the sliding window
   * 
   * Requirement 9.2: Track request count accurately
   * 
   * @returns Number of requests in current window
   */
  getCurrentCount(): number {
    const now = Date.now();
    this.removeExpiredTimestamps(now);
    return this.requestTimestamps.length;
  }

  /**
   * Check if we should throttle (approaching rate limit)
   * 
   * Requirement 9.3: Throttle when approaching limit
   * 
   * @returns True if current usage exceeds throttle threshold
   */
  shouldThrottle(): boolean {
    const currentCount = this.getCurrentCount();
    const threshold = this.config.maxRequests * this.config.throttleThreshold;
    return currentCount >= threshold;
  }

  /**
   * Check if rate limit is exceeded
   * 
   * @returns True if current count >= max requests
   */
  isLimitExceeded(): boolean {
    const currentCount = this.getCurrentCount();
    return currentCount >= this.config.maxRequests;
  }

  /**
   * Get usage percentage (0.0 to 1.0)
   * 
   * @returns Current usage as percentage of max requests
   */
  getUsagePercentage(): number {
    const currentCount = this.getCurrentCount();
    return currentCount / this.config.maxRequests;
  }

  /**
   * Get time until window resets (milliseconds)
   * 
   * @returns Milliseconds until oldest request expires, or 0 if no requests
   */
  getTimeUntilReset(): number {
    if (this.requestTimestamps.length === 0) {
      return 0;
    }

    const now = Date.now();
    const oldestTimestamp = this.requestTimestamps[0];
    const expiryTime = oldestTimestamp + this.config.windowMs;
    const timeUntilReset = Math.max(0, expiryTime - now);

    return timeUntilReset;
  }

  /**
   * Wait if throttling is needed
   * 
   * If shouldThrottle() returns true, waits until usage drops below threshold.
   * 
   * Requirement 9.3: Implement throttling mechanism
   * 
   * @returns Promise that resolves when safe to proceed
   */
  async waitIfNeeded(): Promise<void> {
    if (!this.shouldThrottle()) {
      return;
    }

    const timeToWait = this.getTimeUntilReset();
    
    if (timeToWait > 0) {
      console.log(
        `[Rate Limiter] Throttling: ${this.getCurrentCount()}/${this.config.maxRequests} requests. ` +
        `Waiting ${timeToWait}ms until window resets.`
      );
      
      await new Promise(resolve => setTimeout(resolve, timeToWait));
      
      // After waiting, remove expired timestamps
      this.removeExpiredTimestamps(Date.now());
    }
  }

  /**
   * Remove timestamps outside the sliding window
   * 
   * @param now - Current timestamp
   */
  private removeExpiredTimestamps(now: number): void {
    const cutoff = now - this.config.windowMs;
    
    // Remove all timestamps older than cutoff
    // Since timestamps are added in order, we can use binary search or simple filter
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);
  }

  /**
   * Reset the rate limiter (clear all timestamps)
   * 
   * Useful for testing or manual reset.
   */
  reset(): void {
    this.requestTimestamps = [];
  }

  /**
   * Get rate limiter statistics
   * 
   * @returns Object with current statistics
   */
  getStats(): {
    currentCount: number;
    maxRequests: number;
    usagePercentage: number;
    shouldThrottle: boolean;
    isLimitExceeded: boolean;
    timeUntilReset: number;
  } {
    return {
      currentCount: this.getCurrentCount(),
      maxRequests: this.config.maxRequests,
      usagePercentage: this.getUsagePercentage(),
      shouldThrottle: this.shouldThrottle(),
      isLimitExceeded: this.isLimitExceeded(),
      timeUntilReset: this.getTimeUntilReset(),
    };
  }
}
