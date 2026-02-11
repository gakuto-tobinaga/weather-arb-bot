/**
 * Order Executor Tests
 * 
 * Tests for OrderExecutor initialization, order book fetching,
 * and order placement in both monitoring and live modes.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { OrderExecutor } from '../src/order';
import type { Config } from '../src/config';

describe('Order Executor', () => {
  // Mock configuration for testing
  const mockConfig: Config = {
    POLYMARKET_PK: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    POLYMARKET_FUNDER: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    POLYMARKET_API_KEY: 'test-api-key',
    POLYMARKET_API_SECRET: 'test-api-secret',
    POLYMARKET_API_PASSPHRASE: 'test-passphrase',
    POLYGON_RPC_URL: 'https://polygon-rpc.com',
    TARGET_ICAO: ['KLGA', 'KORD', 'EGLC'],
    MIN_EV: 0.05,
    BUDGET: 1000,
    POLL_INTERVAL: 300000,
    MONITORING_MODE: true,
  };

  describe('Initialization', () => {
    test('should create OrderExecutor instance', () => {
      const executor = new OrderExecutor(mockConfig);
      expect(executor).toBeDefined();
      expect(executor.isMonitoringMode()).toBe(true);
      expect(executor.isInitialized()).toBe(false);
    });

    test('should detect monitoring mode from config', () => {
      const monitoringExecutor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: true });
      expect(monitoringExecutor.isMonitoringMode()).toBe(true);

      const liveExecutor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      expect(liveExecutor.isMonitoringMode()).toBe(false);
    });

    test('should not be initialized before initialize() is called', () => {
      const executor = new OrderExecutor(mockConfig);
      expect(executor.isInitialized()).toBe(false);
    });
  });

  describe('Monitoring Mode', () => {
    test('should log order in monitoring mode without executing', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: true });
      
      // In monitoring mode, we can place orders without initialization
      // (since we're not actually calling the API)
      const result = await executor.placeLimitOrder('test-token-id', 'BUY', 0.55, 10);
      
      expect(result.success).toBe(true);
      expect(result.orderId).toContain('MONITORING_');
      expect(result.message).toContain('MONITORING MODE');
      expect(result.message).toContain('BUY');
      expect(result.message).toContain('0.5500');
      expect(result.message).toContain('10.00');
    });

    test('should handle SELL orders in monitoring mode', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: true });
      
      const result = await executor.placeLimitOrder('test-token-id', 'SELL', 0.45, 20);
      
      expect(result.success).toBe(true);
      expect(result.orderId).toContain('MONITORING_');
      expect(result.message).toContain('SELL');
    });

    test('should log cancel all orders in monitoring mode', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: true });
      
      // Should not throw in monitoring mode
      await expect(executor.cancelAllOrders()).resolves.toBeUndefined();
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid price (< 0)', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      await expect(
        executor.placeLimitOrder('test-token-id', 'BUY', -0.1, 10)
      ).rejects.toThrow('Invalid price');
    });

    test('should reject invalid price (> 1)', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      await expect(
        executor.placeLimitOrder('test-token-id', 'BUY', 1.5, 10)
      ).rejects.toThrow('Invalid price');
    });

    test('should reject invalid size (<= 0)', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      await expect(
        executor.placeLimitOrder('test-token-id', 'BUY', 0.5, 0)
      ).rejects.toThrow('Invalid size');
    });

    test('should reject negative size', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      await expect(
        executor.placeLimitOrder('test-token-id', 'BUY', 0.5, -10)
      ).rejects.toThrow('Invalid size');
    });

    test('should accept valid price at boundary (0)', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      const result = await executor.placeLimitOrder('test-token-id', 'BUY', 0, 10);
      expect(result.success).toBe(true);
    });

    test('should accept valid price at boundary (1)', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      const result = await executor.placeLimitOrder('test-token-id', 'BUY', 1, 10);
      expect(result.success).toBe(true);
    });

    test('should accept valid price in middle range', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      const result = await executor.placeLimitOrder('test-token-id', 'BUY', 0.5, 10);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when getOrderBook called before initialization', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      
      await expect(
        executor.getOrderBook('test-token-id')
      ).rejects.toThrow('OrderExecutor not initialized');
    });

    test('should throw error when cancelAllOrders called before initialization in live mode', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      
      await expect(
        executor.cancelAllOrders()
      ).rejects.toThrow('OrderExecutor not initialized');
    });

    test('should throw error when placeLimitOrder called before initialization in live mode', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      
      await expect(
        executor.placeLimitOrder('test-token-id', 'BUY', 0.5, 10)
      ).rejects.toThrow('OrderExecutor not initialized');
    });
  });

  describe('Order Placement', () => {
    test('should format order details correctly in monitoring mode', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      const result = await executor.placeLimitOrder('token-123', 'BUY', 0.6234, 15.5);
      
      expect(result.message).toContain('token=token-123');
      expect(result.message).toContain('price=0.6234');
      expect(result.message).toContain('size=15.50');
    });

    test('should generate unique order IDs in monitoring mode', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      const result1 = await executor.placeLimitOrder('token-1', 'BUY', 0.5, 10);
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const result2 = await executor.placeLimitOrder('token-2', 'SELL', 0.6, 20);
      
      expect(result1.orderId).not.toBe(result2.orderId);
      expect(result1.orderId).toContain('MONITORING_');
      expect(result2.orderId).toContain('MONITORING_');
    });
  });

  describe('Order Book Fetching', () => {
    test('should throw error when getOrderBook called before initialization', async () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      
      await expect(
        executor.getOrderBook('test-token-id')
      ).rejects.toThrow('OrderExecutor not initialized');
    });

    test('should require initialization for order book fetching', () => {
      const executor = new OrderExecutor({ ...mockConfig, MONITORING_MODE: false });
      
      expect(executor.isInitialized()).toBe(false);
    });

    test('getOrderBook should be available as a method', () => {
      const executor = new OrderExecutor(mockConfig);
      
      expect(typeof executor.getOrderBook).toBe('function');
    });
  });

  describe('Rate Limiting', () => {
    test('should provide rate limit statistics', () => {
      const executor = new OrderExecutor(mockConfig);
      
      const stats = executor.getRateLimitStats();
      
      expect(stats).toBeDefined();
      expect(stats.currentCount).toBe(0);
      expect(stats.maxRequests).toBe(3500);
      expect(stats.usagePercentage).toBe(0);
      expect(stats.shouldThrottle).toBe(false);
      expect(stats.isLimitExceeded).toBe(false);
    });

    test('should track requests in rate limiter', async () => {
      const executor = new OrderExecutor(mockConfig);
      
      // Place some orders (in monitoring mode, so no actual API calls)
      await executor.placeLimitOrder('token-1', 'BUY', 0.5, 10);
      await executor.placeLimitOrder('token-2', 'SELL', 0.6, 20);
      
      // Rate limiter should not track monitoring mode orders
      const stats = executor.getRateLimitStats();
      expect(stats.currentCount).toBe(0);
    });

    test('getRateLimitStats should be available', () => {
      const executor = new OrderExecutor(mockConfig);
      
      expect(typeof executor.getRateLimitStats).toBe('function');
    });
  });
});
