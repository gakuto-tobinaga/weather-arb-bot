/**
 * Timestamp Branded Type
 * 
 * A branded type that ensures all timestamps have explicit timezone information
 * to prevent timezone confusion when calculating time remaining for markets
 * in different cities (NYC, Chicago, London).
 * 
 * CRITICAL: This type is essential for correct probability calculations.
 * Incorrect timezone handling leads to mispriced probabilities and false arbitrage signals.
 * 
 * Requirements: 14.5, 14.8, 3.4
 */

import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Branded type for timezone-aware timestamps
declare const TimestampBrand: unique symbol;

/**
 * Timestamp type that explicitly tracks timezone information
 * All timestamps are stored in UTC internally but remember their source timezone
 */
export type Timestamp = {
  readonly utc: Date;
  readonly timezone: string;
  readonly __brand: typeof TimestampBrand;
};

/**
 * Duration type for time calculations
 * Represents a time span with multiple unit representations
 */
export type Duration = {
  readonly milliseconds: number;
  readonly seconds: number;
  readonly minutes: number;
  readonly hours: number;
  isNegative: () => boolean;
  isPositive: () => boolean;
};

/**
 * Factory functions and utilities for Duration
 */
export const Duration = {
  /**
   * Create a Duration from milliseconds
   * 
   * @param ms - Duration in milliseconds
   * @returns Duration object with all unit representations
   */
  fromMilliseconds: (ms: number): Duration => ({
    milliseconds: ms,
    seconds: ms / 1000,
    minutes: ms / 60000,
    hours: ms / 3600000,
    isNegative: () => ms < 0,
    isPositive: () => ms > 0,
  }),
};

/**
 * Factory functions and utilities for Timestamp
 */
export const Timestamp = {
  /**
   * Create a Timestamp from a UTC Date object
   * 
   * @param date - Date object in UTC
   * @returns Timestamp with UTC timezone
   */
  fromUTC: (date: Date): Timestamp => ({
    utc: date,
    timezone: 'UTC',
  } as Timestamp),

  /**
   * Create a Timestamp from a local time string and timezone
   * 
   * This is CRITICAL for parsing observation end times from Polymarket markets.
   * Each market has its observation end time in its local timezone:
   * - KLGA (LaGuardia): Eastern Time (America/New_York)
   * - KORD (O'Hare): Central Time (America/Chicago)
   * - EGLC (London City): Greenwich Mean Time (Europe/London)
   * 
   * @param dateStr - Date string in ISO format or parseable format
   * @param timezone - IANA timezone identifier (e.g., 'America/New_York')
   * @returns Timestamp with the specified timezone
   * 
   * @example
   * // Parse a market observation end time in Eastern Time
   * const endTime = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
   */
  fromLocalTime: (dateStr: string, timezone: string): Timestamp => {
    // Parse the date string as if it's in the specified timezone
    // This handles DST transitions correctly
    const utc = fromZonedTime(dateStr, timezone);
    
    return {
      utc,
      timezone,
    } as Timestamp;
  },

  /**
   * Get the current time as a Timestamp
   * 
   * @returns Timestamp representing the current moment in UTC
   */
  now: (): Timestamp => Timestamp.fromUTC(new Date()),

  /**
   * Calculate the duration between two timestamps
   * 
   * CRITICAL: Both timestamps are converted to UTC before subtraction
   * to ensure correct time remaining calculations across timezones.
   * 
   * @param t1 - First timestamp (later time)
   * @param t2 - Second timestamp (earlier time)
   * @returns Duration representing t1 - t2
   * 
   * @example
   * // Calculate time remaining until market observation end
   * const now = Timestamp.now();
   * const observationEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
   * const remaining = Timestamp.subtract(observationEnd, now);
   * 
   * if (remaining.isNegative()) {
   *   // Market has expired, do not trade
   *   return null;
   * }
   */
  subtract: (t1: Timestamp, t2: Timestamp): Duration => {
    const ms = t1.utc.getTime() - t2.utc.getTime();
    return Duration.fromMilliseconds(ms);
  },

  /**
   * Format a Timestamp in its original timezone
   * Useful for logging and debugging
   * 
   * @param timestamp - Timestamp to format
   * @param format - Format string (date-fns format)
   * @returns Formatted date string in the timestamp's timezone
   */
  format: (timestamp: Timestamp, format: string = 'yyyy-MM-dd HH:mm:ss zzz'): string => {
    return formatInTimeZone(timestamp.utc, timestamp.timezone, format);
  },

  /**
   * Convert a Timestamp to a different timezone
   * Returns a new Timestamp with the same UTC moment but different timezone
   * 
   * @param timestamp - Timestamp to convert
   * @param timezone - Target timezone
   * @returns New Timestamp in the target timezone
   */
  toTimezone: (timestamp: Timestamp, timezone: string): Timestamp => {
    return {
      utc: timestamp.utc,
      timezone,
    } as Timestamp;
  },
};
