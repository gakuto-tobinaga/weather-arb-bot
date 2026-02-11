/**
 * Unit Tests for Timestamp Branded Type
 * 
 * Tests timezone-aware timestamp handling, duration calculations,
 * and time remaining validation.
 * 
 * Requirements: 14.5, 14.8, 3.4, 3.5, 3.9
 */

import { describe, test, expect } from 'bun:test';
import { Timestamp, Duration } from '../src/types';

describe('Timestamp', () => {
  describe('fromUTC', () => {
    test('creates timestamp from UTC date', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const timestamp = Timestamp.fromUTC(date);
      
      expect(timestamp.utc).toEqual(date);
      expect(timestamp.timezone).toBe('UTC');
    });

    test('preserves exact UTC time', () => {
      const date = new Date('2024-06-15T23:59:59.999Z');
      const timestamp = Timestamp.fromUTC(date);
      
      expect(timestamp.utc.getTime()).toBe(date.getTime());
    });
  });

  describe('fromLocalTime', () => {
    test('parses Eastern Time correctly', () => {
      // January 15, 2024 23:59 ET = January 16, 2024 04:59 UTC (EST, UTC-5)
      const timestamp = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
      
      expect(timestamp.timezone).toBe('America/New_York');
      expect(timestamp.utc.getUTCHours()).toBe(4); // 23:59 ET + 5 hours = 04:59 UTC next day
      expect(timestamp.utc.getUTCDate()).toBe(16);
    });

    test('parses Central Time correctly', () => {
      // January 15, 2024 23:59 CT = January 16, 2024 05:59 UTC (CST, UTC-6)
      const timestamp = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/Chicago');
      
      expect(timestamp.timezone).toBe('America/Chicago');
      expect(timestamp.utc.getUTCHours()).toBe(5); // 23:59 CT + 6 hours = 05:59 UTC next day
      expect(timestamp.utc.getUTCDate()).toBe(16);
    });

    test('parses London Time correctly', () => {
      // January 15, 2024 23:59 GMT = January 15, 2024 23:59 UTC (GMT, UTC+0)
      const timestamp = Timestamp.fromLocalTime('2024-01-15 23:59', 'Europe/London');
      
      expect(timestamp.timezone).toBe('Europe/London');
      expect(timestamp.utc.getUTCHours()).toBe(23);
      expect(timestamp.utc.getUTCDate()).toBe(15);
    });

    test('handles DST transition correctly (spring forward)', () => {
      // March 10, 2024 02:30 ET doesn't exist (DST starts at 2am, clocks jump to 3am)
      // date-fns-tz should handle this gracefully
      const timestamp = Timestamp.fromLocalTime('2024-03-10 02:30', 'America/New_York');
      
      expect(timestamp.timezone).toBe('America/New_York');
      // Should be interpreted as EDT (UTC-4) after the transition
      expect(timestamp.utc.getUTCHours()).toBe(6); // 02:30 EDT + 4 hours = 06:30 UTC
    });

    test('handles DST transition correctly (fall back)', () => {
      // November 3, 2024 01:30 ET occurs twice (DST ends at 2am, clocks fall back to 1am)
      // date-fns-tz interprets ambiguous times as the first occurrence (EDT)
      const timestamp = Timestamp.fromLocalTime('2024-11-03 01:30', 'America/New_York');
      
      expect(timestamp.timezone).toBe('America/New_York');
      // Should be interpreted as EDT (UTC-4) before the transition
      expect(timestamp.utc.getUTCHours()).toBe(5); // 01:30 EDT + 4 hours = 05:30 UTC
    });

    test('handles ISO format date strings', () => {
      const timestamp = Timestamp.fromLocalTime('2024-01-15T23:59:00', 'America/New_York');
      
      expect(timestamp.timezone).toBe('America/New_York');
      expect(timestamp.utc.getUTCHours()).toBe(4);
    });
  });

  describe('now', () => {
    test('creates timestamp for current time', () => {
      const before = Date.now();
      const timestamp = Timestamp.now();
      const after = Date.now();
      
      expect(timestamp.utc.getTime()).toBeGreaterThanOrEqual(before);
      expect(timestamp.utc.getTime()).toBeLessThanOrEqual(after);
      expect(timestamp.timezone).toBe('UTC');
    });
  });

  describe('subtract', () => {
    test('calculates positive duration for future time', () => {
      const now = Timestamp.fromUTC(new Date('2024-01-15T12:00:00Z'));
      const future = Timestamp.fromUTC(new Date('2024-01-15T14:30:00Z'));
      
      const duration = Timestamp.subtract(future, now);
      
      expect(duration.hours).toBe(2.5);
      expect(duration.minutes).toBe(150);
      expect(duration.seconds).toBe(9000);
      expect(duration.milliseconds).toBe(9000000);
      expect(duration.isPositive()).toBe(true);
      expect(duration.isNegative()).toBe(false);
    });

    test('calculates negative duration for past time', () => {
      const now = Timestamp.fromUTC(new Date('2024-01-15T12:00:00Z'));
      const past = Timestamp.fromUTC(new Date('2024-01-15T10:00:00Z'));
      
      const duration = Timestamp.subtract(past, now);
      
      expect(duration.hours).toBe(-2);
      expect(duration.minutes).toBe(-120);
      expect(duration.isNegative()).toBe(true);
      expect(duration.isPositive()).toBe(false);
    });

    test('calculates zero duration for same time', () => {
      const time = Timestamp.fromUTC(new Date('2024-01-15T12:00:00Z'));
      
      const duration = Timestamp.subtract(time, time);
      
      expect(duration.milliseconds).toBe(0);
      expect(duration.isNegative()).toBe(false);
      expect(duration.isPositive()).toBe(false);
    });

    test('works correctly across different timezones', () => {
      // Same UTC moment, different timezone representations
      const nyTime = Timestamp.fromLocalTime('2024-01-15 18:00', 'America/New_York'); // 23:00 UTC
      const londonTime = Timestamp.fromLocalTime('2024-01-15 23:00', 'Europe/London'); // 23:00 UTC
      
      const duration = Timestamp.subtract(nyTime, londonTime);
      
      // Should be zero because they represent the same UTC moment
      expect(duration.milliseconds).toBe(0);
    });

    test('calculates time remaining for market observation end', () => {
      // Simulate: Current time is 2024-01-15 20:00 ET (01:00 UTC next day)
      // Market observation ends at 2024-01-15 23:59 ET (04:59 UTC next day)
      const now = Timestamp.fromLocalTime('2024-01-15 20:00', 'America/New_York');
      const observationEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
      
      const remaining = Timestamp.subtract(observationEnd, now);
      
      expect(remaining.hours).toBeCloseTo(3.983, 2); // ~3 hours 59 minutes
      expect(remaining.isPositive()).toBe(true);
    });

    test('detects expired market (negative time remaining)', () => {
      // Simulate: Current time is after observation end
      const now = Timestamp.fromLocalTime('2024-01-16 00:30', 'America/New_York');
      const observationEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
      
      const remaining = Timestamp.subtract(observationEnd, now);
      
      expect(remaining.isNegative()).toBe(true);
      // This should trigger "do not trade" logic in probability engine
    });
  });

  describe('format', () => {
    test('formats timestamp in its original timezone', () => {
      const timestamp = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
      const formatted = Timestamp.format(timestamp);
      
      expect(formatted).toContain('2024-01-15');
      expect(formatted).toContain('23:59');
    });

    test('formats with custom format string', () => {
      const timestamp = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
      const formatted = Timestamp.format(timestamp, 'yyyy-MM-dd HH:mm');
      
      expect(formatted).toBe('2024-01-15 23:59');
    });
  });

  describe('toTimezone', () => {
    test('converts timestamp to different timezone', () => {
      const nyTime = Timestamp.fromLocalTime('2024-01-15 18:00', 'America/New_York');
      const londonTime = Timestamp.toTimezone(nyTime, 'Europe/London');
      
      expect(londonTime.timezone).toBe('Europe/London');
      expect(londonTime.utc.getTime()).toBe(nyTime.utc.getTime()); // Same UTC moment
    });

    test('preserves UTC time when converting timezone', () => {
      const original = Timestamp.fromUTC(new Date('2024-01-15T12:00:00Z'));
      const converted = Timestamp.toTimezone(original, 'America/Chicago');
      
      expect(converted.utc.getTime()).toBe(original.utc.getTime());
      expect(converted.timezone).toBe('America/Chicago');
    });
  });
});

describe('Duration', () => {
  describe('fromMilliseconds', () => {
    test('creates duration with all unit conversions', () => {
      const duration = Duration.fromMilliseconds(3600000); // 1 hour
      
      expect(duration.milliseconds).toBe(3600000);
      expect(duration.seconds).toBe(3600);
      expect(duration.minutes).toBe(60);
      expect(duration.hours).toBe(1);
    });

    test('handles fractional hours correctly', () => {
      const duration = Duration.fromMilliseconds(5400000); // 1.5 hours
      
      expect(duration.hours).toBe(1.5);
      expect(duration.minutes).toBe(90);
    });

    test('handles negative durations', () => {
      const duration = Duration.fromMilliseconds(-3600000);
      
      expect(duration.hours).toBe(-1);
      expect(duration.isNegative()).toBe(true);
      expect(duration.isPositive()).toBe(false);
    });

    test('handles zero duration', () => {
      const duration = Duration.fromMilliseconds(0);
      
      expect(duration.hours).toBe(0);
      expect(duration.isNegative()).toBe(false);
      expect(duration.isPositive()).toBe(false);
    });
  });
});

describe('Timezone-aware time remaining calculations (CRITICAL)', () => {
  test('correctly calculates time remaining across timezone boundaries', () => {
    // Real-world scenario: Trading bot in UTC timezone calculating time remaining
    // for a market in Eastern Time
    
    // Current time: 2024-01-15 18:00 UTC
    const now = Timestamp.fromUTC(new Date('2024-01-15T18:00:00Z'));
    
    // Market observation ends: 2024-01-15 23:59 ET
    // This is 2024-01-16 04:59 UTC (EST is UTC-5)
    const observationEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
    
    const remaining = Timestamp.subtract(observationEnd, now);
    
    // Time remaining should be ~10 hours 59 minutes
    expect(remaining.hours).toBeCloseTo(10.983, 2);
    expect(remaining.isPositive()).toBe(true);
  });

  test('handles multiple markets in different timezones simultaneously', () => {
    const now = Timestamp.fromUTC(new Date('2024-01-15T22:00:00Z'));
    
    // KLGA market ends at 23:59 ET (04:59 UTC next day)
    const klgaEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
    const klgaRemaining = Timestamp.subtract(klgaEnd, now);
    
    // KORD market ends at 23:59 CT (05:59 UTC next day)
    const kordEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/Chicago');
    const kordRemaining = Timestamp.subtract(kordEnd, now);
    
    // EGLC market ends at 23:59 GMT (23:59 UTC same day)
    const eglcEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'Europe/London');
    const eglcRemaining = Timestamp.subtract(eglcEnd, now);
    
    // KLGA should have ~6.98 hours remaining
    expect(klgaRemaining.hours).toBeCloseTo(6.983, 2);
    expect(klgaRemaining.isPositive()).toBe(true);
    
    // KORD should have ~7.98 hours remaining (1 hour more than KLGA)
    expect(kordRemaining.hours).toBeCloseTo(7.983, 2);
    expect(kordRemaining.isPositive()).toBe(true);
    
    // EGLC should have ~1.98 hours remaining
    expect(eglcRemaining.hours).toBeCloseTo(1.983, 2);
    expect(eglcRemaining.isPositive()).toBe(true);
  });

  test('prevents trading on expired markets', () => {
    // Current time: 2024-01-16 05:00 UTC
    const now = Timestamp.fromUTC(new Date('2024-01-16T05:00:00Z'));
    
    // Market observation ended at: 2024-01-15 23:59 ET (04:59 UTC)
    const observationEnd = Timestamp.fromLocalTime('2024-01-15 23:59', 'America/New_York');
    
    const remaining = Timestamp.subtract(observationEnd, now);
    
    // Market is expired (negative time remaining)
    expect(remaining.isNegative()).toBe(true);
    
    // This should trigger the probability engine to return null
    // and prevent signal generation (Requirement 3.9)
  });
});
