/**
 * Market Range Enhancement Tests
 * 
 * Tests for city name detection, temperature range parsing,
 * and range-based probability calculations.
 */

import { describe, test, expect } from 'bun:test';
import { extractMarketData } from '../src/market/extractor';
import { calculateRangeProbability } from '../src/probability/calculator';
import { PrecisionTemperature } from '../src/types/temperature';
import { Duration } from '../src/types/timestamp';
import type { GammaMarketResponse } from '../src/market/types';

describe('Market Range Enhancement', () => {
  describe('City Name Detection', () => {
    test('should detect NYC and map to KLGA', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will NYC temperature be 40-41°F on Jan 15?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.icaoCode).toBe('KLGA');
      }
    });

    test('should detect Chicago and map to KORD', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will Chicago hit 75 or higher?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.icaoCode).toBe('KORD');
      }
    });

    test('should detect London and map to EGLC', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will London drop below 10°C?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.icaoCode).toBe('EGLC');
      }
    });
  });

  describe('Temperature Range Parsing', () => {
    test('should parse temperature range 40-41°F', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will NYC temperature be 40-41°F on Jan 15?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const minC = PrecisionTemperature.value(result.market.minThreshold);
        const maxC = PrecisionTemperature.value(result.market.maxThreshold);
        
        // 40°F ≈ 4.4°C, 41°F ≈ 5.0°C
        expect(minC).toBeCloseTo(4.4, 1);
        expect(maxC).toBeCloseTo(5.0, 1);
      }
    });

    test('should parse ceiling "75 or higher"', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will Chicago hit 75 or higher?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const minC = PrecisionTemperature.value(result.market.minThreshold);
        const maxC = PrecisionTemperature.value(result.market.maxThreshold);
        
        // 75°F ≈ 23.9°C
        expect(minC).toBeCloseTo(23.9, 1);
        expect(maxC).toBe(Infinity);
      }
    });

    test('should parse floor "10 or below"', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will London drop below 10°C?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        const minC = PrecisionTemperature.value(result.market.minThreshold);
        const maxC = PrecisionTemperature.value(result.market.maxThreshold);
        
        expect(minC).toBe(-Infinity);
        expect(maxC).toBe(10.0);
      }
    });
  });

  describe('Range-Based Probability Calculation', () => {
    test('should calculate probability for finite range', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(4.0);
      const minThreshold = PrecisionTemperature.fromCelsius(4.4);
      const maxThreshold = PrecisionTemperature.fromCelsius(5.0);
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000); // 12 hours
      
      const prob = calculateRangeProbability(
        currentTemp,
        minThreshold,
        maxThreshold,
        'KLGA',
        duration
      );
      
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });

    test('should calculate probability for ceiling', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(20.0);
      const minThreshold = PrecisionTemperature.fromCelsius(23.9);
      const maxThreshold = Infinity as any as PrecisionTemperature;
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const prob = calculateRangeProbability(
        currentTemp,
        minThreshold,
        maxThreshold,
        'KORD',
        duration
      );
      
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });

    test('should calculate probability for floor', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(12.0);
      const minThreshold = -Infinity as any as PrecisionTemperature;
      const maxThreshold = PrecisionTemperature.fromCelsius(10.0);
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      const prob = calculateRangeProbability(
        currentTemp,
        minThreshold,
        maxThreshold,
        'EGLC',
        duration
      );
      
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });

    test('should handle zero time remaining for range', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(4.5);
      const minThreshold = PrecisionTemperature.fromCelsius(4.4);
      const maxThreshold = PrecisionTemperature.fromCelsius(5.0);
      const duration = Duration.fromMilliseconds(0);
      
      const prob = calculateRangeProbability(
        currentTemp,
        minThreshold,
        maxThreshold,
        'KLGA',
        duration
      );
      
      // Current temp is within range
      expect(prob).toBe(1.0);
    });

    test('should throw error for invalid range (min > max)', () => {
      const currentTemp = PrecisionTemperature.fromCelsius(20.0);
      const minThreshold = PrecisionTemperature.fromCelsius(25.0);
      const maxThreshold = PrecisionTemperature.fromCelsius(20.0);
      const duration = Duration.fromMilliseconds(12 * 60 * 60 * 1000);
      
      expect(() => {
        calculateRangeProbability(
          currentTemp,
          minThreshold,
          maxThreshold,
          'KLGA',
          duration
        );
      }).toThrow('Invalid range');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain backward compatibility for single threshold markets', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KLGA exceed 75°F?',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        // For single threshold, all three fields should be equal
        const threshold = PrecisionTemperature.value(result.market.threshold);
        const minThreshold = PrecisionTemperature.value(result.market.minThreshold);
        const maxThreshold = PrecisionTemperature.value(result.market.maxThreshold);
        
        expect(threshold).toBe(minThreshold);
        expect(threshold).toBe(maxThreshold);
      }
    });
  });
});
