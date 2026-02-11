/**
 * Market Discovery
 * 
 * Discovers and fetches active weather markets from Polymarket Gamma API.
 */

import { validateMarketsArray, type GammaMarketResponse } from './types';
import type { ICAOCode } from '../config';

/**
 * Gamma API base URL
 */
const GAMMA_API_BASE_URL = 'https://gamma-api.polymarket.com';

/**
 * Result type for market discovery
 */
export type MarketDiscoveryResult = 
  | { success: true; markets: GammaMarketResponse[] }
  | { success: false; error: string };

/**
 * Discover active weather markets from Polymarket Gamma API
 * 
 * Queries the Gamma API for weather-tagged events and extracts their markets.
 * Uses the /events/pagination endpoint with tag_slug=weather for efficient filtering.
 * 
 * @param activeOnly - If true, only return active markets (default: true)
 * @returns Result with array of markets or error
 * 
 * @example
 * ```typescript
 * const result = await discoverMarkets();
 * if (result.success) {
 *   console.log(`Found ${result.markets.length} markets`);
 * }
 * ```
 */
export async function discoverMarkets(
  activeOnly: boolean = true
): Promise<MarketDiscoveryResult> {
  try {
    // Build query parameters for weather events
    const params = new URLSearchParams({
      limit: '100',
      active: 'true',
      archived: 'false',
      tag_slug: 'weather',
      closed: 'false',
      order: 'volume24hr',
      ascending: 'false',
      offset: '0'
    });
    
    const url = `${GAMMA_API_BASE_URL}/events/pagination?${params.toString()}`;
    
    // Fetch weather events from Gamma API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Gamma API returned ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    // Extract markets from events
    // The response structure is { data: [events...], count: number }
    const events = data.data || [];
    const allMarkets: GammaMarketResponse[] = [];
    
    for (const event of events) {
      if (event.markets && Array.isArray(event.markets)) {
        // Filter by active status if requested
        const markets = activeOnly 
          ? event.markets.filter((m: any) => m.active === true && m.closed === false)
          : event.markets;
        
        allMarkets.push(...markets);
      }
    }
    
    // Validate response structure
    try {
      const markets = validateMarketsArray(allMarkets);
      
      return {
        success: true,
        markets
      };
    } catch (validationError) {
      return {
        success: false,
        error: `Invalid market data structure: ${validationError instanceof Error ? validationError.message : String(validationError)}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Filter markets by ICAO codes
 * 
 * Filters a list of markets to only include those that reference
 * one of the specified ICAO airport codes OR city names in their question,
 * ancillary data, or description.
 * 
 * 超柔軟な都市名パターンマッチングを使用して、
 * "NYC (LGA)", "Chicago (ORD)", "London City" などのパターンも検出します。
 * 
 * @param markets - Array of markets to filter
 * @param icaoCodes - Array of ICAO codes to filter by
 * @returns Filtered array of markets
 * 
 * @example
 * ```typescript
 * const filtered = filterMarketsByICAO(allMarkets, ['KLGA', 'KORD']);
 * ```
 */
export function filterMarketsByICAO(
  markets: GammaMarketResponse[],
  icaoCodes: ICAOCode[]
): GammaMarketResponse[] {
  // 都市名パターンマッピング（extractorと同じロジック）
  const cityPatterns: Record<ICAOCode, RegExp[]> = {
    'KLGA': [
      /\bKLGA\b/i,
      /\bNYC\b/i,
      /\bNew York City\b/i,
      /\bNew York\b/i,
      /\bLaGuardia\b/i,
      /\bLGA\b/i,
      /NYC\s*\(LGA\)/i,
      /New York City\s*\(LGA\)/i
    ],
    'KORD': [
      /\bKORD\b/i,
      /\bChicago\b/i,
      /\bO'Hare\b/i,
      /\bOHare\b/i,
      /\bORD\b/i,
      /Chicago\s*\(ORD\)/i
    ],
    'EGLC': [
      /\bEGLC\b/i,
      /\bLondon\b/i,
      /\bLondon City\b/i
    ]
  };
  
  const filtered = markets.filter(market => {
    // 各ICAOコードに対して、そのコードまたは都市名パターンをチェック
    for (const icaoCode of icaoCodes) {
      const patterns = cityPatterns[icaoCode] || [];
      
      // Check question field
      const questionMatch = patterns.some(pattern => 
        pattern.test(market.question)
      );
      
      if (questionMatch) {
        return true;
      }
      
      // Check ancillaryData field if present
      if (market.ancillaryData) {
        const ancillaryMatch = patterns.some(pattern =>
          pattern.test(market.ancillaryData!)
        );
        
        if (ancillaryMatch) {
          return true;
        }
      }
      
      // Check umadata field if present
      if (market.umadata) {
        const umadataMatch = patterns.some(pattern =>
          pattern.test(market.umadata!)
        );
        
        if (umadataMatch) {
          return true;
        }
      }
      
      // Check description field if present
      if (market.description) {
        const descriptionMatch = patterns.some(pattern =>
          pattern.test(market.description!)
        );
        
        if (descriptionMatch) {
          return true;
        }
      }
    }
    
    return false;
  });
  
  return filtered;
}

/**
 * Discover markets for specific ICAO codes
 * 
 * Convenience function that discovers all active markets and filters
 * them by the specified ICAO codes.
 * 
 * @param icaoCodes - Array of ICAO codes to filter by
 * @returns Result with filtered markets or error
 * 
 * @example
 * ```typescript
 * const result = await discoverMarketsForStations(['KLGA', 'KORD']);
 * if (result.success) {
 *   console.log(`Found ${result.markets.length} relevant markets`);
 * }
 * ```
 */
export async function discoverMarketsForStations(
  icaoCodes: ICAOCode[]
): Promise<MarketDiscoveryResult> {
  const result = await discoverMarkets(true);
  
  if (!result.success) {
    return result;
  }
  
  const filteredMarkets = filterMarketsByICAO(result.markets, icaoCodes);
  
  return {
    success: true,
    markets: filteredMarkets
  };
}
