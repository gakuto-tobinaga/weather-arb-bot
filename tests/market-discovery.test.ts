/**
 * Unit tests for market discovery
 */

import { describe, test, expect } from 'bun:test';
import { filterMarketsByICAO } from '../src/market/discovery';
import type { GammaMarketResponse } from '../src/market/types';
import type { ICAOCode } from '../src/config';

describe('Market Discovery', () => {
  describe('filterMarketsByICAO', () => {
    const createMockMarket = (
      id: string,
      question: string,
      ancillaryData?: string,
      description?: string
    ): GammaMarketResponse => ({
      conditionId: id,
      question,
      description,
      active: true,
      closed: false,
      tokens: [
        { tokenId: '0xyes', outcome: 'Yes' },
        { tokenId: '0xno', outcome: 'No' }
      ],
      ancillaryData,
    });

    test('should filter markets by ICAO code in question', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature at KLGA exceed 75°F?'),
        createMockMarket('2', 'Will temperature at KORD exceed 80°F?'),
        createMockMarket('3', 'Will it rain in Seattle?'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(1);
      expect(filtered[0].conditionId).toBe('1');
    });

    test('should filter markets by multiple ICAO codes', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature at KLGA exceed 75°F?'),
        createMockMarket('2', 'Will temperature at KORD exceed 80°F?'),
        createMockMarket('3', 'Will temperature at EGLC exceed 20°C?'),
        createMockMarket('4', 'Will it rain in Seattle?'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA', 'KORD']);

      expect(filtered.length).toBe(2);
      expect(filtered.map(m => m.conditionId)).toContain('1');
      expect(filtered.map(m => m.conditionId)).toContain('2');
    });

    test('should be case-insensitive when matching ICAO codes', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature at klga exceed 75°F?'),
        createMockMarket('2', 'Will temperature at Klga exceed 75°F?'),
        createMockMarket('3', 'Will temperature at KLGA exceed 75°F?'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(3);
    });

    test('should filter by ICAO code in ancillaryData', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Temperature market', 'Station: KLGA, Threshold: 75°F'),
        createMockMarket('2', 'Temperature market', 'Station: KORD, Threshold: 80°F'),
        createMockMarket('3', 'Temperature market', 'Station: KSEA, Threshold: 70°F'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(1);
      expect(filtered[0].conditionId).toBe('1');
    });

    test('should filter by ICAO code in description', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Temperature market', undefined, 'Market for KLGA airport'),
        createMockMarket('2', 'Temperature market', undefined, 'Market for KORD airport'),
        createMockMarket('3', 'Temperature market', undefined, 'Market for Seattle'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(1);
      expect(filtered[0].conditionId).toBe('1');
    });

    test('should match ICAO code in any field', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature exceed 75°F?', 'Station: KLGA'),
        createMockMarket('2', 'Will temperature at KORD exceed 80°F?'),
        createMockMarket('3', 'Temperature market', undefined, 'Market for EGLC'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA', 'KORD', 'EGLC']);

      expect(filtered.length).toBe(3);
    });

    test('should return empty array when no markets match', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will it rain in Seattle?'),
        createMockMarket('2', 'Will it snow in Denver?'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(0);
    });

    test('should return empty array for empty input', () => {
      const filtered = filterMarketsByICAO([], ['KLGA']);

      expect(filtered.length).toBe(0);
    });

    test('should handle markets with missing optional fields', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature at KLGA exceed 75°F?'),
        {
          conditionId: '2',
          question: 'Will temperature at KORD exceed 80°F?',
          end_date_iso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xyes', outcome: 'Yes' }],
          // No ancillaryData or description
        },
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA', 'KORD']);

      expect(filtered.length).toBe(2);
    });

    test('should not match partial ICAO codes', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'Will temperature at KLG exceed 75°F?'), // Missing 'A'
        createMockMarket('2', 'Will temperature at KLGAA exceed 75°F?'), // Extra 'A'
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      // Should not match partial codes
      expect(filtered.length).toBe(0);
    });

    test('should handle all supported ICAO codes', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'KLGA market'),
        createMockMarket('2', 'KORD market'),
        createMockMarket('3', 'EGLC market'),
      ];

      const codes: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
      const filtered = filterMarketsByICAO(markets, codes);

      expect(filtered.length).toBe(3);
    });

    test('should preserve market order', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'KLGA market 1'),
        createMockMarket('2', 'KORD market'),
        createMockMarket('3', 'KLGA market 2'),
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA']);

      expect(filtered.length).toBe(2);
      expect(filtered[0].conditionId).toBe('1');
      expect(filtered[1].conditionId).toBe('3');
    });

    test('should not modify original array', () => {
      const markets: GammaMarketResponse[] = [
        createMockMarket('1', 'KLGA market'),
        createMockMarket('2', 'KORD market'),
      ];

      const originalLength = markets.length;
      filterMarketsByICAO(markets, ['KLGA']);

      expect(markets.length).toBe(originalLength);
    });
  });

  describe('Integration scenarios', () => {
    test('should filter realistic weather markets', () => {
      const markets: GammaMarketResponse[] = [
        {
          conditionId: '0x123',
          question: 'Will the temperature at LaGuardia Airport (KLGA) exceed 75°F on January 15?',
          description: 'Market resolves based on METAR data from KLGA',
          end_date_iso: '2024-01-15T23:59:00-05:00',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes', outcome: 'Yes', price: '0.45' },
            { tokenId: '0xno', outcome: 'No', price: '0.55' }
          ],
          ancillaryData: 'Station: KLGA, Observation end: 2024-01-15 23:59 ET'
        },
        {
          conditionId: '0x456',
          question: 'Will Bitcoin exceed $50,000?',
          end_date_iso: '2024-01-15T23:59:00Z',
          active: true,
          closed: false,
          tokens: [
            { tokenId: '0xyes', outcome: 'Yes' },
            { tokenId: '0xno', outcome: 'No' }
          ]
        }
      ];

      const filtered = filterMarketsByICAO(markets, ['KLGA', 'KORD', 'EGLC']);

      expect(filtered.length).toBe(1);
      expect(filtered[0].question).toContain('KLGA');
    });
  });
});
