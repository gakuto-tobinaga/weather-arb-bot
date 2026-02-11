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
 * City mapping configuration
 * Maps city name patterns to ICAO codes and default temperature units
 */
type CityMapping = {
  patterns: RegExp[];
  icaoCode: ICAOCode;
  defaultUnit: 'F' | 'C';
};

/**
 * City name to ICAO code mappings
 */
const CITY_MAPPINGS: CityMapping[] = [
  {
    patterns: [/\bNYC\b/i, /\bNew York\b/i, /\bLaGuardia\b/i],
    icaoCode: 'KLGA',
    defaultUnit: 'F'
  },
  {
    patterns: [/\bChicago\b/i, /\bO'Hare\b/i, /\bOHare\b/i],
    icaoCode: 'KORD',
    defaultUnit: 'F'
  },
  {
    patterns: [/\bLondon\b/i, /\bLondon City\b/i],
    icaoCode: 'EGLC',
    defaultUnit: 'C'
  }
];

/**
 * Detect city name and default temperature unit from text
 * 
 * Searches text for recognized city name patterns and returns
 * the corresponding ICAO code and default temperature unit.
 * 
 * @param text - Text to search for city names
 * @returns ICAO code and default unit if found, null otherwise
 */
function detectCityAndUnit(text: string): {
  icaoCode: ICAOCode | null;
  defaultUnit: 'F' | 'C' | null;
} {
  for (const mapping of CITY_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (pattern.test(text)) {
        return {
          icaoCode: mapping.icaoCode,
          defaultUnit: mapping.defaultUnit
        };
      }
    }
  }
  return { icaoCode: null, defaultUnit: null };
}

/**
 * Temperature specification types
 * Internal parsing result for different temperature formats
 */
type TemperatureSpec = 
  | { type: 'range'; min: number; max: number; unit: 'F' | 'C' }
  | { type: 'ceiling'; min: number; unit: 'F' | 'C' }
  | { type: 'floor'; max: number; unit: 'F' | 'C' }
  | { type: 'single'; value: number; unit: 'F' | 'C' };

/**
 * Parse temperature specification from text
 * 
 * Extracts temperature ranges, ceilings, floors, or single thresholds
 * from market question text. Supports multiple formats:
 * - Range: "40-41°F", "40 to 41°C"
 * - Ceiling: "75 or higher", "75+", "> 75"
 * - Floor: "40 or below", "< 40"
 * - Single: "75°F"
 * 
 * @param text - Text to parse for temperature specification
 * @param defaultUnit - Default unit if not explicitly specified
 * @returns Temperature specification or null if not found
 */
function parseTemperatureSpec(
  text: string,
  defaultUnit: 'F' | 'C' | null
): TemperatureSpec | null {
  // Priority 1: Explicit unit in text overrides default
  // Priority 2: Use default unit from city detection
  // Priority 3: Fail if no unit can be determined
  
  // Range patterns: "40-41°F", "40-41 F", "40 to 41°F"
  const rangePatterns = [
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i,
    /(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i
  ];
  
  // Ceiling patterns: "75 or higher", "75 or above", "75+", "> 75", "above 75", "greater than 75"
  const ceilingPatterns = [
    /(\d+(?:\.\d+)?)\s+or\s+(?:higher|above)\s*(?:°|degrees?)?\s*([FC])\b/i,
    /(\d+(?:\.\d+)?)\+\s*(?:°|degrees?)?\s*([FC])\b/i,
    />\s*(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i,
    /(?:above|greater than)\s+(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i
  ];
  
  // Floor patterns: "40 or below", "40 or lower", "40 or less", "< 40", "below 40", "less than 40"
  const floorPatterns = [
    /(\d+(?:\.\d+)?)\s+or\s+(?:below|lower|less)\s*(?:°|degrees?)?\s*([FC])\b/i,
    /<\s*(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i,
    /(?:below|less than)\s+(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i
  ];
  
  // Ceiling patterns without explicit unit (for use with default unit)
  const ceilingPatternsNoUnit = [
    /(\d+(?:\.\d+)?)\s+or\s+(?:higher|above)\b/i,
    /(?:hit|reach|exceed)\s+(\d+(?:\.\d+)?)\s+or\s+(?:higher|above)\b/i,
    /(?:above|greater than)\s+(\d+(?:\.\d+)?)\b/i
  ];
  
  // Floor patterns without explicit unit (for use with default unit)
  const floorPatternsNoUnit = [
    /(\d+(?:\.\d+)?)\s+or\s+(?:below|lower|less)\b/i,
    /(?:drop|fall)\s+(?:below|under)\s+(\d+(?:\.\d+)?)\b/i,
    /(?:below|less than)\s+(\d+(?:\.\d+)?)\b/i
  ];
  
  // Try range patterns
  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      const unit = match[3].toUpperCase() as 'F' | 'C';
      
      if (min > max) {
        throw new Error(`Invalid range: min (${min}) > max (${max})`);
      }
      
      return { type: 'range', min, max, unit };
    }
  }
  
  // Try ceiling patterns
  for (const pattern of ceilingPatterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const unit = match[2].toUpperCase() as 'F' | 'C';
      return { type: 'ceiling', min, unit };
    }
  }
  
  // Try floor patterns
  for (const pattern of floorPatterns) {
    const match = text.match(pattern);
    if (match) {
      const max = parseFloat(match[1]);
      const unit = match[2].toUpperCase() as 'F' | 'C';
      return { type: 'floor', max, unit };
    }
  }
  
  // Try ceiling patterns without explicit unit (use default unit)
  if (defaultUnit) {
    for (const pattern of ceilingPatternsNoUnit) {
      const match = text.match(pattern);
      if (match) {
        const min = parseFloat(match[1]);
        return { type: 'ceiling', min, unit: defaultUnit };
      }
    }
    
    // Try floor patterns without explicit unit (use default unit)
    for (const pattern of floorPatternsNoUnit) {
      const match = text.match(pattern);
      if (match) {
        const max = parseFloat(match[1]);
        return { type: 'floor', max, unit: defaultUnit };
      }
    }
  }
  
  // Try single threshold with explicit unit
  const singlePattern = /(\d+(?:\.\d+)?)\s*(?:°|degrees?)?\s*([FC])\b/i;
  const match = text.match(singlePattern);
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase() as 'F' | 'C';
    return { type: 'single', value, unit };
  }
  
  // Try single threshold with default unit
  if (defaultUnit) {
    const numberPattern = /(\d+(?:\.\d+)?)/;
    const match = text.match(numberPattern);
    if (match) {
      const value = parseFloat(match[1]);
      return { type: 'single', value, unit: defaultUnit };
    }
  }
  
  return null;
}

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
 * DEPRECATED: Use parseTemperatureSpec instead for enhanced parsing.
 * Kept for backward compatibility.
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
  // Step 1: Try to extract ICAO code directly (backward compatibility)
  let icaoCode = extractICAOCode(marketData);
  let defaultUnit: 'F' | 'C' | null = null;
  
  // Step 2: If no ICAO code found, try city name detection
  if (!icaoCode) {
    const cityDetection = detectCityAndUnit(marketData.question);
    icaoCode = cityDetection.icaoCode;
    defaultUnit = cityDetection.defaultUnit;
    
    // Also check ancillaryData and description
    if (!icaoCode && marketData.ancillaryData) {
      const ancillaryDetection = detectCityAndUnit(marketData.ancillaryData);
      icaoCode = ancillaryDetection.icaoCode;
      defaultUnit = ancillaryDetection.defaultUnit;
    }
    
    if (!icaoCode && marketData.description) {
      const descDetection = detectCityAndUnit(marketData.description);
      icaoCode = descDetection.icaoCode;
      defaultUnit = descDetection.defaultUnit;
    }
  }
  
  if (!icaoCode) {
    return {
      success: false,
      error: 'Could not extract ICAO code or city name from market data'
    };
  }
  
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
  
  // Step 3: Parse temperature specification
  let tempSpec: TemperatureSpec;
  try {
    // Try parsing from question first
    let parsed = parseTemperatureSpec(marketData.question, defaultUnit);
    
    // If not found in question, try ancillaryData
    if (!parsed && marketData.ancillaryData) {
      parsed = parseTemperatureSpec(marketData.ancillaryData, defaultUnit);
    }
    
    if (!parsed) {
      return {
        success: false,
        error: 'Could not extract temperature threshold from market data'
      };
    }
    tempSpec = parsed;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse temperature specification'
    };
  }
  
  // Step 4: Convert to PrecisionTemperature based on type
  let threshold: PrecisionTemperature;
  let minThreshold: PrecisionTemperature;
  let maxThreshold: PrecisionTemperature;
  
  switch (tempSpec.type) {
    case 'range':
      minThreshold = tempSpec.unit === 'F' 
        ? PrecisionTemperature.fromFahrenheit(tempSpec.min)
        : PrecisionTemperature.fromCelsius(tempSpec.min);
      maxThreshold = tempSpec.unit === 'F'
        ? PrecisionTemperature.fromFahrenheit(tempSpec.max)
        : PrecisionTemperature.fromCelsius(tempSpec.max);
      threshold = minThreshold; // Use min as legacy threshold
      break;
      
    case 'ceiling':
      minThreshold = tempSpec.unit === 'F'
        ? PrecisionTemperature.fromFahrenheit(tempSpec.min)
        : PrecisionTemperature.fromCelsius(tempSpec.min);
      maxThreshold = Infinity as any as PrecisionTemperature;
      threshold = minThreshold;
      break;
      
    case 'floor':
      minThreshold = -Infinity as any as PrecisionTemperature;
      maxThreshold = tempSpec.unit === 'F'
        ? PrecisionTemperature.fromFahrenheit(tempSpec.max)
        : PrecisionTemperature.fromCelsius(tempSpec.max);
      threshold = maxThreshold;
      break;
      
    case 'single':
      threshold = tempSpec.unit === 'F'
        ? PrecisionTemperature.fromFahrenheit(tempSpec.value)
        : PrecisionTemperature.fromCelsius(tempSpec.value);
      minThreshold = threshold;
      maxThreshold = threshold;
      break;
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
    minThreshold,
    maxThreshold,
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
