/**
 * Retry utilities with exponential backoff
 * 
 * Implements exponential backoff for API errors to handle transient failures
 * gracefully without overwhelming external services.
 * 
 * Requirements: 1.3, 9.5
 */

/**
 * Configuration for exponential backoff retry logic
 */
export type RetryConfig = {
  /** Initial delay in milliseconds (default: 5000ms = 5 seconds) */
  readonly initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 60000ms = 60 seconds) */
  readonly maxDelayMs: number;
  /** Maximum number of retry attempts (default: 5) */
  readonly maxAttempts: number;
  /** Multiplier for exponential backoff (default: 2 for doubling) */
  readonly backoffMultiplier: number;
};

/**
 * Default retry configuration
 * - Start at 5 seconds
 * - Double on each retry
 * - Max 60 seconds
 * - Up to 5 attempts
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 5000,
  maxDelayMs: 60000,
  maxAttempts: 5,
  backoffMultiplier: 2,
};

/**
 * Information about a retry attempt
 */
export type RetryAttempt = {
  readonly attemptNumber: number;
  readonly delayMs: number;
  readonly timestamp: Date;
  readonly error: unknown;
};

/**
 * Logger function for retry attempts
 */
export type RetryLogger = (attempt: RetryAttempt) => void;

/**
 * Calculate the delay for a given retry attempt using exponential backoff
 * 
 * Formula: min(initialDelay * (multiplier ^ attemptNumber), maxDelay)
 * 
 * @param attemptNumber - The current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 * 
 * @example
 * ```typescript
 * calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG) // 5000ms (5s)
 * calculateBackoffDelay(1, DEFAULT_RETRY_CONFIG) // 10000ms (10s)
 * calculateBackoffDelay(2, DEFAULT_RETRY_CONFIG) // 20000ms (20s)
 * calculateBackoffDelay(3, DEFAULT_RETRY_CONFIG) // 40000ms (40s)
 * calculateBackoffDelay(4, DEFAULT_RETRY_CONFIG) // 60000ms (60s, capped at max)
 * calculateBackoffDelay(5, DEFAULT_RETRY_CONFIG) // 60000ms (60s, capped at max)
 * ```
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default logger that logs retry attempts to console
 */
const defaultLogger: RetryLogger = (attempt) => {
  console.warn(
    `[Retry] Attempt ${attempt.attemptNumber + 1} failed at ${attempt.timestamp.toISOString()}, ` +
    `retrying in ${attempt.delayMs}ms. Error: ${attempt.error instanceof Error ? attempt.error.message : String(attempt.error)}`
  );
};

/**
 * Execute an async operation with exponential backoff retry logic
 * 
 * Requirement 1.3: When METAR data is unavailable or returns error, retry with exponential backoff
 * Requirement 9.5: When aviationweather.gov returns errors, implement exponential backoff starting at 5 seconds
 * 
 * @param operation - Async function to execute
 * @param config - Retry configuration (optional, uses defaults if not provided)
 * @param logger - Logger function for retry attempts (optional, uses console.warn if not provided)
 * @returns Promise resolving to the operation result
 * @throws The last error if all retry attempts fail
 * 
 * @example
 * ```typescript
 * // Retry a METAR fetch with default config
 * const result = await withExponentialBackoff(
 *   () => fetchMETAR('KLGA')
 * );
 * 
 * // Retry with custom config
 * const result = await withExponentialBackoff(
 *   () => fetchMETAR('KLGA'),
 *   { initialDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 3, backoffMultiplier: 2 }
 * );
 * 
 * // Retry with custom logger
 * const result = await withExponentialBackoff(
 *   () => fetchMETAR('KLGA'),
 *   DEFAULT_RETRY_CONFIG,
 *   (attempt) => console.log(`Retry ${attempt.attemptNumber}: ${attempt.error}`)
 * );
 * ```
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger: RetryLogger = defaultLogger
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      // Try to execute the operation
      return await operation();
    } catch (error) {
      lastError = error;

      // If this was the last attempt, don't retry
      if (attempt === config.maxAttempts - 1) {
        break;
      }

      // Calculate delay for this attempt
      const delayMs = calculateBackoffDelay(attempt, config);

      // Log the retry attempt
      logger({
        attemptNumber: attempt,
        delayMs,
        timestamp: new Date(),
        error,
      });

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // All attempts failed, throw the last error
  throw lastError;
}
