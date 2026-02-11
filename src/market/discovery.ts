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
 * Discover active markets from Polymarket Gamma API
 * 
 * Queries the Gamma API for all active markets. The response includes
 * market metadata, token IDs, and ancillary data needed for trading.
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
    // Build query parameters
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append('active', 'true');
    }
    
    const url = `${GAMMA_API_BASE_URL}/markets?${params.toString()}`;
    
    // Fetch markets from Gamma API
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
    
    // Validate response structure
    try {
      const markets = validateMarketsArray(data);
      
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
 * one of the specified ICAO airport codes in their question or
 * ancillary data.
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
  return markets.filter(market => {
    // Create regex patterns for exact ICAO code matching (word boundaries)
    const patterns = icaoCodes.map(code => 
      new RegExp(`\\b${code}\\b`, 'i')
    );
    
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
    
    return false;
  });
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
