/**
 * Rate Limiter Tests
 * 
 * Tests for rate limiting functionality including sliding window tracking,
 * throttling, and usage statistics.
 * 
 * Requirements: 9.2, 9.3
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { RateLimiter, DEFAULT_RATE_LIMIT_CONFIG } from '../src/order/rate-limiter';

describe('Rate Limiter', () => {
  describe('Configuration', () => {
    test('should use default configuration', () => {
      const limiter = new RateLimiter();
      const stats = limiter.getStats();
      
      expect(stats.maxRequests).toBe(3500);
      expect(stats.currentCount).toBe(0);
    });

    test('should accept custom configuration', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 5000,
        throttleThreshold: 0.8,
      });
      
      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(100);
    });

    test('DEFAULT_RATE_LIMIT_CONFIG should have correct values', () => {
      expect(DEFAULT_RATE_LIMIT_CONFIG.maxRequests).toBe(3500);
      expect(DEFAULT_RATE_LIMIT_CONFIG.windowMs).toBe(10000);
      expect(DEFAULT_RATE_LIMIT_CONFIG.throttleThreshold).toBe(0.9);
    });
  });

  describe('Request Tracking', () => {
    test('should start with zero requests', () => {
      const limiter = new RateLimiter();
      expect(limiter.getCurrentCount()).toBe(0);
    });

    test('should track single request', () => {
      const limiter = new RateLimiter();
      limiter.recordRequest();
      expect(limiter.getCurrentCount()).toBe(1);
    });

    test('should track multiple requests', () => {
      const limiter = new RateLimiter();
      
      limiter.recordRequest();
      limiter.recordRequest();
      limiter.recordRequest();
      
      expect(limiter.getCurrentCount()).toBe(3);
    });

    test('should track many requests accurately', () => {
      const limiter = new RateLimiter();
      
      for (let i = 0; i < 100; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.getCurrentCount()).toBe(100);
    });
  });

  describe('Sliding Window', () => {
    test('should remove expired timestamps', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 100, // 100ms window for fast testing
        throttleThreshold: 0.9,
      });
      
      limiter.recordRequest();
      limiter.recordRequest();
      expect(limiter.getCurrentCount()).toBe(2);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(limiter.getCurrentCount()).toBe(0);
    });

    test('should keep recent requests in window', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 200, // 200ms window
        throttleThreshold: 0.9,
      });
      
      limiter.recordRequest();
      await new Promise(resolve => setTimeout(resolve, 50));
      limiter.recordRequest();
      
      expect(limiter.getCurrentCount()).toBe(2);
      
      // Wait for first request to expire but not second
      await new Promise(resolve => setTimeout(resolve, 160));
      
      expect(limiter.getCurrentCount()).toBe(1);
    });

    test('should handle mixed old and new requests', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 150,
        throttleThreshold: 0.9,
      });
      
      limiter.recordRequest();
      limiter.recordRequest();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      limiter.recordRequest();
      limiter.recordRequest();
      
      // Should have 4 requests (2 old, 2 new)
      expect(limiter.getCurrentCount()).toBe(4);
      
      // Wait for old requests to expire
      await new Promise(resolve => setTimeout(resolve, 60));
      
      // Should only have 2 new requests
      expect(limiter.getCurrentCount()).toBe(2);
    });
  });

  describe('Throttling', () => {
    test('should not throttle when below threshold', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9, // 90 requests
      });
      
      for (let i = 0; i < 80; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.shouldThrottle()).toBe(false);
    });

    test('should throttle when at threshold', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9, // 90 requests
      });
      
      for (let i = 0; i < 90; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.shouldThrottle()).toBe(true);
    });

    test('should throttle when above threshold', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9, // 90 requests
      });
      
      for (let i = 0; i < 95; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.shouldThrottle()).toBe(true);
    });

    test('should respect custom throttle threshold', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.5, // 50 requests
      });
      
      for (let i = 0; i < 50; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.shouldThrottle()).toBe(true);
    });
  });

  describe('Limit Exceeded', () => {
    test('should not exceed limit when below max', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 99; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.isLimitExceeded()).toBe(false);
    });

    test('should exceed limit when at max', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 100; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.isLimitExceeded()).toBe(true);
    });

    test('should exceed limit when above max', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 150; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.isLimitExceeded()).toBe(true);
    });
  });

  describe('Usage Percentage', () => {
    test('should calculate 0% usage when no requests', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      expect(limiter.getUsagePercentage()).toBe(0);
    });

    test('should calculate 50% usage', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 50; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.getUsagePercentage()).toBe(0.5);
    });

    test('should calculate 100% usage', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 100; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.getUsagePercentage()).toBe(1.0);
    });

    test('should handle usage over 100%', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 150; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.getUsagePercentage()).toBe(1.5);
    });
  });

  describe('Time Until Reset', () => {
    test('should return 0 when no requests', () => {
      const limiter = new RateLimiter();
      expect(limiter.getTimeUntilReset()).toBe(0);
    });

    test('should return time until oldest request expires', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 1000,
        throttleThreshold: 0.9,
      });
      
      limiter.recordRequest();
      
      const timeUntilReset = limiter.getTimeUntilReset();
      expect(timeUntilReset).toBeGreaterThan(900);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);
    });

    test('should decrease over time', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 1000,
        throttleThreshold: 0.9,
      });
      
      limiter.recordRequest();
      
      const time1 = limiter.getTimeUntilReset();
      await new Promise(resolve => setTimeout(resolve, 100));
      const time2 = limiter.getTimeUntilReset();
      
      expect(time2).toBeLessThan(time1);
    });
  });

  describe('Reset', () => {
    test('should clear all requests', () => {
      const limiter = new RateLimiter();
      
      for (let i = 0; i < 50; i++) {
        limiter.recordRequest();
      }
      
      expect(limiter.getCurrentCount()).toBe(50);
      
      limiter.reset();
      
      expect(limiter.getCurrentCount()).toBe(0);
    });

    test('should allow new requests after reset', () => {
      const limiter = new RateLimiter();
      
      limiter.recordRequest();
      limiter.reset();
      limiter.recordRequest();
      
      expect(limiter.getCurrentCount()).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should provide complete statistics', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 50; i++) {
        limiter.recordRequest();
      }
      
      const stats = limiter.getStats();
      
      expect(stats.currentCount).toBe(50);
      expect(stats.maxRequests).toBe(100);
      expect(stats.usagePercentage).toBe(0.5);
      expect(stats.shouldThrottle).toBe(false);
      expect(stats.isLimitExceeded).toBe(false);
      expect(stats.timeUntilReset).toBeGreaterThan(0);
    });

    test('should show throttling in stats', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 95; i++) {
        limiter.recordRequest();
      }
      
      const stats = limiter.getStats();
      
      expect(stats.shouldThrottle).toBe(true);
      expect(stats.isLimitExceeded).toBe(false);
    });

    test('should show limit exceeded in stats', () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 100; i++) {
        limiter.recordRequest();
      }
      
      const stats = limiter.getStats();
      
      expect(stats.shouldThrottle).toBe(true);
      expect(stats.isLimitExceeded).toBe(true);
    });
  });

  describe('Wait If Needed', () => {
    test('should not wait when below threshold', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 10000,
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 50; i++) {
        limiter.recordRequest();
      }
      
      const startTime = Date.now();
      await limiter.waitIfNeeded();
      const elapsed = Date.now() - startTime;
      
      // Should return immediately (< 10ms)
      expect(elapsed).toBeLessThan(10);
    });

    test('should wait when throttling is needed', async () => {
      const limiter = new RateLimiter({
        maxRequests: 100,
        windowMs: 200, // Short window for testing
        throttleThreshold: 0.9,
      });
      
      for (let i = 0; i < 95; i++) {
        limiter.recordRequest();
      }
      
      const startTime = Date.now();
      await limiter.waitIfNeeded();
      const elapsed = Date.now() - startTime;
      
      // Should wait approximately windowMs (with some tolerance)
      expect(elapsed).toBeGreaterThan(150);
      expect(elapsed).toBeLessThan(300);
    });
  });
});
