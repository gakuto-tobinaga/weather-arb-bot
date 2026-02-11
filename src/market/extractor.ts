/**
 * Market Data Extractor
 * 
 * Extracts trading-relevant data from Gamma API market responses.
 * Parses condition IDs, token IDs, thresholds, and observation end times.
 */

import { parseObservationEndTime } from '../timezone/ancillary-parser';
import { PrecisionTemperature } from '../types/temperature';
import type { GammaMarketResponse } from './types';
import type { Market } from './types';
import type { ICAOCode } from '../config';

/**
 * Result type for market extraction
 */
export type MarketExtractionResult = 
  | { success: true; market: Market }
  | { success: false; error: string };

/**
 * Extract ICAO code from market data
 * 
 * Searches question, ancillary_data, and description for ICAO codes.
 * 
 * @param marketData - Raw market data from Gamma API
 * @returns ICAO code if found, null otherwise
 */
function extractICAOCode(marketData: GammaMarketResponse): ICAOCode | null {
  const validCodes: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
  
  // Search in question
  for (const code of validCodes) {
    const pattern = new RegExp(`\\b${code}\\b`, 'i');
    if (pattern.test(marketData.question)) {
      return code;
    }
  }
  
  // Search in ancillaryData
  if (marketData.ancillaryData) {
    for (const code of validCodes) {
      const pattern = new RegExp(`\\b${code}\\b`, 'i');
      if (pattern.test(marketData.ancillaryData)) {
        return code;
      }
    }
  }
  
  // Search in description
  if (marketData.description) {
    for (const code of validCodes) {
      const pattern = new RegExp(`\\b${code}\\b`, 'i');
      if (pattern.test(marketData.description)) {
        return code;
      }
    }
  }
  
  return null;
}

/**
 * Extract temperature threshold from market data
 * 
 * Searches for temperature values in Fahrenheit or Celsius.
 * 
 * @param marketData - Raw market data from Gamma API
 * @returns Temperature threshold if found, null otherwise
 */
function extractThreshold(marketData: GammaMarketResponse): PrecisionTemperature | null {
  // Pattern for Fahrenheit: "75°F", "75 °F", "75F", "75 degrees F"
  const fahrenheitPattern = /(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*F\b/i;
  
  // Pattern for Celsius: "24°C", "24 °C", "24C", "24 degrees C"
  const celsiusPattern = /(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*C\b/i;
  
  // Search in question
  let match = marketData.question.match(fahrenheitPattern);
  if (match) {
    const tempF = parseFloat(match[1]);
    return PrecisionTemperature.fromFahrenheit(tempF);
  }
  
  match = marketData.question.match(celsiusPattern);
  if (match) {
    const tempC = parseFloat(match[1]);
    return PrecisionTemperature.fromCelsius(tempC);
  }
  
  // Search in ancillaryData
  if (marketData.ancillaryData) {
    match = marketData.ancillaryData.match(fahrenheitPattern);
    if (match) {
      const tempF = parseFloat(match[1]);
      return PrecisionTemperature.fromFahrenheit(tempF);
    }
    
    match = marketData.ancillaryData.match(celsiusPattern);
    if (match) {
      const tempC = parseFloat(match[1]);
      return PrecisionTemperature.fromCelsius(tempC);
    }
  }
  
  return null;
}

/**
 * Extract market data for trading
 * 
 * Extracts all necessary information from a Gamma API market response:
 * - Condition ID
 * - Token IDs (yes/no)
 * - ICAO code
 * - Temperature threshold
 * - Observation end time
 * 
 * @param marketData - Raw market data from Gamma API
 * @returns Extraction result with Market object or error
 * 
 * @example
 * ```typescript
 * const result = extractMarketData(gammaResponse);
 * if (result.success) {
 *   console.log(`Market: ${result.market.description}`);
 *   console.log(`Threshold: ${result.market.threshold}°C`);
 * }
 * ```
 */
export function extractMarketData(
  marketData: GammaMarketResponse
): MarketExtractionResult {
  // Extract condition ID
  const conditionId = marketData.conditionId;
  
  // Extract token IDs
  if (!marketData.tokens || marketData.tokens.length < 2) {
    return {
      success: false,
      error: 'Market must have at least 2 tokens (Yes/No)'
    };
  }
  
  const yesToken = marketData.tokens.find(t => 
    t.outcome.toLowerCase() === 'yes'
  );
  const noToken = marketData.tokens.find(t => 
    t.outcome.toLowerCase() === 'no'
  );
  
  if (!yesToken || !noToken) {
    return {
      success: false,
      error: 'Could not find Yes/No tokens'
    };
  }
  
  // Extract ICAO code
  const icaoCode = extractICAOCode(marketData);
  if (!icaoCode) {
    return {
      success: false,
      error: 'Could not extract ICAO code from market data'
    };
  }
  
  // Extract threshold
  const threshold = extractThreshold(marketData);
  if (!threshold) {
    return {
      success: false,
      error: 'Could not extract temperature threshold from market data'
    };
  }
  
  // Extract observation end time from ancillary data
  const ancillaryData = marketData.ancillaryData || marketData.umadata || '';
  if (!ancillaryData) {
    return {
      success: false,
      error: 'Market missing ancillaryData field'
    };
  }
  
  const timeResult = parseObservationEndTime(ancillaryData, icaoCode);
  if (!timeResult.success) {
    return {
      success: false,
      error: `Failed to parse observation end time: ${timeResult.error}`
    };
  }
  
  // Build Market object
  const market: Market = {
    conditionId,
    yesTokenId: yesToken.tokenId,
    noTokenId: noToken.tokenId,
    icaoCode,
    threshold,
    observationEnd: timeResult.observationEnd,
    ancillaryData,
    description: marketData.question,
    active: marketData.active,
  };
  
  return {
    success: true,
    market
  };
}

/**
 * Extract multiple markets from array
 * 
 * Convenience function to extract data from multiple markets.
 * Returns only successfully extracted markets.
 * 
 * @param marketsData - Array of raw market data
 * @returns Array of successfully extracted markets
 */
export function extractMultipleMarkets(
  marketsData: GammaMarketResponse[]
): Market[] {
  const extracted: Market[] = [];
  
  for (const marketData of marketsData) {
    const result = extractMarketData(marketData);
    if (result.success) {
      extracted.push(result.market);
    }
  }
  
  return extracted;
}
