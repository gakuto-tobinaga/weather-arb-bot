/**
 * Unit tests for market data extractor
 */

import { describe, test, expect } from 'bun:test';
import { extractMarketData, extractMultipleMarkets } from '../src/market/extractor';
import type { GammaMarketResponse } from '../src/market/types';
import { PrecisionTemperature } from '../src/types/temperature';

describe('Market Data Extractor', () => {
  describe('extractMarketData', () => {
    test('should extract data from valid market with Fahrenheit threshold', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123abc',
        question: 'Will temperature at KLGA exceed 75°F on January 15?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59, Threshold: 75°F'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.conditionId).toBe('0x123abc');
        expect(result.market.yesTokenId).toBe('0xyes');
        expect(result.market.noTokenId).toBe('0xno');
        expect(result.market.icaoCode).toBe('KLGA');
        expect(result.market.description).toBe(marketData.question);
        expect(result.market.active).toBe(true);
        
        // Threshold should be converted to Celsius
        const thresholdC = PrecisionTemperature.value(result.market.threshold);
        expect(thresholdC).toBeCloseTo(23.9, 1); // 75°F ≈ 23.9°C
      }
    });

    test('should extract data from market with Celsius threshold', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x456def',
        question: 'Will temperature at EGLC exceed 20°C?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'Station: EGLC, observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.icaoCode).toBe('EGLC');
        
        const thresholdC = PrecisionTemperature.value(result.market.threshold);
        expect(thresholdC).toBe(20.0);
      }
    });

    test('should handle different temperature formats', () => {
      const formats = [
        '75°F',
        '75 °F',
        '75F',
        '75 degrees F',
        '75 degree F',
      ];

      for (const format of formats) {
        const marketData: GammaMarketResponse = {
          conditionId: '0x123',
          question: `Will temperature exceed ${format}?`,
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes', outcome: 'Yes' },
            { tokenId: '0xno', outcome: 'No' }
          ],
          ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
        };

        const result = extractMarketData(marketData);
        expect(result.success).toBe(true);
      }
    });

    test('should extract ICAO code from question', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KORD exceed 80°F?',
        endDateIso: '2024-01-15T23:59:00Z',
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

    test('should extract ICAO code from ancillaryData', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature exceed 75°F?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.market.icaoCode).toBe('KLGA');
      }
    });

    test('should extract threshold from ancillaryData if not in question', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature exceed threshold?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'Station: KLGA, Threshold: 75°F, observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(true);
      if (result.success) {
        const thresholdC = PrecisionTemperature.value(result.market.threshold);
        expect(thresholdC).toBeCloseTo(23.9, 1);
      }
    });

    test('should return error for market with insufficient tokens', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KLGA exceed 75°F?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' }
          // Missing No token
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('tokens');
      }
    });

    test('should return error for market without ICAO code', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature exceed 75°F?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('ICAO');
      }
    });

    test('should return error for market without threshold', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KLGA be high?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ],
        ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('threshold');
      }
    });

    test('should return error for market without ancillaryData', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KLGA exceed 75°F?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'Yes' },
          { tokenId: '0xno', outcome: 'No' }
        ]
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('ancillaryData');
      }
    });

    test('should handle case-insensitive token outcomes', () => {
      const marketData: GammaMarketResponse = {
        conditionId: '0x123',
        question: 'Will temperature at KLGA exceed 75°F?',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xyes', outcome: 'YES' },
          { tokenId: '0xno', outcome: 'NO' }
        ],
        ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
      };

      const result = extractMarketData(marketData);

      expect(result.success).toBe(true);
    });
  });

  describe('extractMultipleMarkets', () => {
    test('should extract multiple valid markets', () => {
      const marketsData: GammaMarketResponse[] = [
        {
          conditionId: '0x123',
          question: 'Will temperature at KLGA exceed 75°F?',
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes1', outcome: 'Yes' },
            { tokenId: '0xno1', outcome: 'No' }
          ],
          ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
        },
        {
          conditionId: '0x456',
          question: 'Will temperature at KORD exceed 80°F?',
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes2', outcome: 'Yes' },
            { tokenId: '0xno2', outcome: 'No' }
          ],
          ancillaryData: 'Station: KORD, observation end: 2024-01-15 23:59'
        }
      ];

      const markets = extractMultipleMarkets(marketsData);

      expect(markets.length).toBe(2);
      expect(markets[0].icaoCode).toBe('KLGA');
      expect(markets[1].icaoCode).toBe('KORD');
    });

    test('should skip invalid markets and return only valid ones', () => {
      const marketsData: GammaMarketResponse[] = [
        {
          conditionId: '0x123',
          question: 'Will temperature at KLGA exceed 75°F?',
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes', outcome: 'Yes' },
            { tokenId: '0xno', outcome: 'No' }
          ],
          ancillaryData: 'Station: KLGA, observation end: 2024-01-15 23:59'
        },
        {
          conditionId: '0x456',
          question: 'Invalid market without threshold',
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes', outcome: 'Yes' },
            { tokenId: '0xno', outcome: 'No' }
          ],
          ancillaryData: 'Station: KORD, observation end: 2024-01-15 23:59'
        }
      ];

      const markets = extractMultipleMarkets(marketsData);

      expect(markets.length).toBe(1);
      expect(markets[0].conditionId).toBe('0x123');
    });

    test('should return empty array for all invalid markets', () => {
      const marketsData: GammaMarketResponse[] = [
        {
          conditionId: '0x123',
          question: 'Invalid market',
          endDateIso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xyes', outcome: 'Yes' }],
          ancillaryData: 'observation end: 2024-01-15 23:59'
        }
      ];

      const markets = extractMultipleMarkets(marketsData);

      expect(markets.length).toBe(0);
    });

    test('should return empty array for empty input', () => {
      const markets = extractMultipleMarkets([]);

      expect(markets.length).toBe(0);
    });
  });
});
