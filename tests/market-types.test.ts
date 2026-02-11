/**
 * Unit tests for market types and schemas
 */

import { describe, test, expect } from 'bun:test';
import { 
  GammaMarketResponseSchema, 
  GammaMarketsArraySchema,
  validateMarketResponse,
  validateMarketsArray 
} from '../src/market/types';

describe('Market Types and Schemas', () => {
  describe('GammaMarketResponseSchema', () => {
    test('should validate valid market response', () => {
      const validMarket = {
        conditionId: '0x123abc',
        question: 'Will temperature exceed 75°F?',
        description: 'Market for NYC temperature',
        endDateIso: '2024-01-15T23:59:00Z',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xabc', outcome: 'Yes' },
          { tokenId: '0xdef', outcome: 'No' }
        ],
        ancillaryData: 'observation end: 2024-01-15 23:59'
      };

      const result = GammaMarketResponseSchema.safeParse(validMarket);
      expect(result.success).toBe(true);
    });

    test('should validate market with minimal required fields', () => {
      const minimalMarket = {
        conditionId: '0x123',
        question: 'Test question',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xabc', outcome: 'Yes' }
        ]
      };

      const result = GammaMarketResponseSchema.safeParse(minimalMarket);
      expect(result.success).toBe(true);
    });

    test('should validate market with optional fields', () => {
      const marketWithOptionals = {
        conditionId: '0x123',
        question: 'Test question',
        description: 'Test description',
        endDateIso: '2024-01-15T23:59:00Z',
        gameStartTime: '2024-01-14T00:00:00Z',
        questionId: 'q123',
        marketSlug: 'test-market',
        minIncentiveSize: 100,
        maxIncentiveSpread: 0.05,
        active: true,
        closed: false,
        archived: false,
        acceptingOrders: true,
        tokens: [
          { 
            tokenId: '0xabc', 
            outcome: 'Yes',
            price: '0.55',
            winner: false
          }
        ],
        rewards: {
          minSize: '100',
          maxSpread: '0.05',
          eventStartDate: '2024-01-14T00:00:00Z',
          eventEndDate: '2024-01-15T23:59:00Z'
        },
        ancillaryData: 'test data',
        umadata: 'uma data'
      };

      const result = GammaMarketResponseSchema.safeParse(marketWithOptionals);
      expect(result.success).toBe(true);
    });

    test('should reject market missing condition_id', () => {
      const invalidMarket = {
        question: 'Test question',
        active: true,
        closed: false,
        tokens: []
      };

      const result = GammaMarketResponseSchema.safeParse(invalidMarket);
      expect(result.success).toBe(false);
    });

    test('should reject market missing question', () => {
      const invalidMarket = {
        conditionId: '0x123',
        active: true,
        closed: false,
        tokens: []
      };

      const result = GammaMarketResponseSchema.safeParse(invalidMarket);
      expect(result.success).toBe(false);
    });

    test('should accept market missing tokens (defaults to empty array)', () => {
      const marketWithoutTokens = {
        conditionId: '0x123',
        question: 'Test question',
        active: true,
        closed: false
      };

      const result = GammaMarketResponseSchema.safeParse(marketWithoutTokens);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toEqual([]);
      }
    });

    test('should reject market with invalid token structure', () => {
      const invalidMarket = {
        conditionId: '0x123',
        question: 'Test question',
        active: true,
        closed: false,
        tokens: [
          { tokenId: '0xabc' } // Missing outcome
        ]
      };

      const result = GammaMarketResponseSchema.safeParse(invalidMarket);
      expect(result.success).toBe(false);
    });

    test('should reject market with wrong type for active', () => {
      const invalidMarket = {
        conditionId: '0x123',
        question: 'Test question',
        active: 'true', // Should be boolean
        closed: false,
        tokens: []
      };

      const result = GammaMarketResponseSchema.safeParse(invalidMarket);
      expect(result.success).toBe(false);
    });
  });

  describe('GammaMarketsArraySchema', () => {
    test('should validate array of valid markets', () => {
      const markets = [
        {
          conditionId: '0x123',
          question: 'Market 1',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xabc', outcome: 'Yes' }]
        },
        {
          conditionId: '0x456',
          question: 'Market 2',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xdef', outcome: 'Yes' }]
        }
      ];

      const result = GammaMarketsArraySchema.safeParse(markets);
      expect(result.success).toBe(true);
    });

    test('should validate empty array', () => {
      const result = GammaMarketsArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    test('should reject array with invalid market', () => {
      const markets = [
        {
          conditionId: '0x123',
          question: 'Market 1',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xabc', outcome: 'Yes' }]
        },
        {
          // Missing required fields
          conditionId: '0x456',
          tokens: []
        }
      ];

      const result = GammaMarketsArraySchema.safeParse(markets);
      expect(result.success).toBe(false);
    });

    test('should reject non-array input', () => {
      const result = GammaMarketsArraySchema.safeParse({ not: 'an array' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateMarketResponse', () => {
    test('should return parsed market for valid input', () => {
      const validMarket = {
        conditionId: '0x123',
        question: 'Test question',
        active: true,
        closed: false,
        tokens: [{ tokenId: '0xabc', outcome: 'Yes' }]
      };

      const result = validateMarketResponse(validMarket);
      expect(result.conditionId).toBe('0x123');
      expect(result.question).toBe('Test question');
    });

    test('should throw error for invalid input', () => {
      const invalidMarket = {
        conditionId: '0x123'
        // Missing required fields
      };

      expect(() => validateMarketResponse(invalidMarket)).toThrow();
    });
  });

  describe('validateMarketsArray', () => {
    test('should return parsed array for valid input', () => {
      const markets = [
        {
          conditionId: '0x123',
          question: 'Market 1',
          active: true,
          closed: false,
          tokens: [{ tokenId: '0xabc', outcome: 'Yes' }]
        }
      ];

      const result = validateMarketsArray(markets);
      expect(result.length).toBe(1);
      expect(result[0].conditionId).toBe('0x123');
    });

    test('should throw error for invalid input', () => {
      const invalidMarkets = [
        { conditionId: '0x123' } // Missing required fields
      ];

      expect(() => validateMarketsArray(invalidMarkets)).toThrow();
    });
  });

  describe('Real-world market examples', () => {
    test('should validate realistic Polymarket weather market', () => {
      const realisticMarket = {
        conditionId: '0x1234567890abcdef',
        question: 'Will the temperature at LaGuardia Airport exceed 75°F on January 15, 2024?',
        description: 'This market resolves to "Yes" if the maximum temperature recorded at KLGA exceeds 75°F during the observation period.',
        endDateIso: '2024-01-15T23:59:00-05:00',
        gameStartTime: '2024-01-14T00:00:00-05:00',
        marketSlug: 'klga-temp-75f-jan15',
        active: true,
        closed: false,
        archived: false,
        acceptingOrders: true,
        tokens: [
          {
            tokenId: '0xyes123',
            outcome: 'Yes',
            price: '0.45',
            winner: false
          },
          {
            tokenId: '0xno456',
            outcome: 'No',
            price: '0.55',
            winner: false
          }
        ],
        ancillaryData: 'Station: KLGA, Observation end: 2024-01-15 23:59 ET, Threshold: 75°F, Source: aviationweather.gov'
      };

      const result = GammaMarketResponseSchema.safeParse(realisticMarket);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.tokens.length).toBe(2);
        expect(result.data.ancillaryData).toContain('KLGA');
      }
    });
  });
});
