/**
 * METAR T-Group Parser
 * 
 * Implements custom regex-based parsing for T-Group temperature data from METAR Remarks section.
 * T-Group provides 0.1°C precision temperature data that is critical for the bot's information advantage.
 * 
 * T-Group Format: T[sign][temp][sign][dewpoint]
 * - First sign: 0 = positive temperature, 1 = negative temperature
 * - temp: 3-digit temperature code in tenths of °C (e.g., 172 = 17.2°C)
 * - Second sign: 0 = positive dewpoint, 1 = negative dewpoint
 * - dewpoint: 3-digit dewpoint code in tenths of °C
 * 
 * Example: T01720158
 * - Temperature: 0 (positive) + 172 = 17.2°C
 * - Dewpoint: 0 (positive) + 158 = 15.8°C
 * 
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6
 */

import { PrecisionTemperature } from '../types/temperature';
import type { TGroupResult, Option } from './types';
import { Option as Opt } from './types';

/**
 * Regex pattern for T-Group extraction
 * 
 * Pattern: T([01])(\d{3})([01])(\d{3})\b
 * - T: Literal 'T' character
 * - ([01]): Temperature sign (0=positive, 1=negative)
 * - (\d{3}): Temperature code (3 digits)
 * - ([01]): Dewpoint sign (0=positive, 1=negative)
 * - (\d{3}): Dewpoint code (3 digits)
 * - \b: Word boundary to prevent matching longer strings
 * 
 * Requirement 2.3: Implement regex-based parsing to extract T-Group
 */
const T_GROUP_PATTERN = /T([01])(\d{3})([01])(\d{3})\b/;

/**
 * Parse T-Group data from raw METAR string
 * 
 * Extracts precision temperature and dewpoint from METAR Remarks section.
 * Returns None if T-Group is missing or malformed.
 * 
 * Requirement 2.1: Extract temperature value from T-Group field
 * Requirement 2.4: Decode sign indicator (0=positive, 1=negative)
 * Requirement 2.5: Convert 3-digit code to decimal degrees Celsius
 * Requirement 2.6: Return None for missing/malformed data
 * 
 * @param rawMETAR - Raw METAR observation string including Remarks section
 * @returns Option<TGroupResult> - Some(result) if T-Group found, None otherwise
 * 
 * @example
 * ```typescript
 * // Valid T-Group
 * const result1 = parseTGroup("KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T01720158");
 * // result1 = Some({ temperature: 17.2°C, dewpoint: 15.8°C, rawString: "T01720158" })
 * 
 * // Negative temperature
 * const result2 = parseTGroup("KORD 121853Z 09008KT 10SM FEW250 -5/16 A3012 RMK T10520158");
 * // result2 = Some({ temperature: -5.2°C, dewpoint: 15.8°C, rawString: "T10520158" })
 * 
 * // Missing T-Group
 * const result3 = parseTGroup("KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012");
 * // result3 = None
 * 
 * // Malformed T-Group
 * const result4 = parseTGroup("KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T0172015");
 * // result4 = None (missing one digit)
 * ```
 */
export function parseTGroup(rawMETAR: string): Option<TGroupResult> {
  // Attempt to match T-Group pattern in the raw METAR string
  const match = rawMETAR.match(T_GROUP_PATTERN);

  // Return None if no match found (missing T-Group)
  if (!match) {
    return Opt.none();
  }

  // Extract matched groups
  const [fullMatch, tempSign, tempCode, dewpointSign, dewpointCode] = match;

  // Validate that we have all required groups
  if (!tempSign || !tempCode || !dewpointSign || !dewpointCode) {
    return Opt.none();
  }

  try {
    // Parse temperature
    // Requirement 2.4: Decode sign indicator (0=positive, 1=negative)
    const tempSignMultiplier = tempSign === '0' ? 1 : -1;
    
    // Requirement 2.5: Convert 3-digit code to decimal degrees Celsius
    // e.g., 172 → 17.2°C
    const tempValue = parseInt(tempCode, 10) / 10;
    const temperature = PrecisionTemperature.fromCelsius(tempSignMultiplier * tempValue);

    // Parse dewpoint (same logic)
    const dewpointSignMultiplier = dewpointSign === '0' ? 1 : -1;
    const dewpointValue = parseInt(dewpointCode, 10) / 10;
    const dewpoint = PrecisionTemperature.fromCelsius(dewpointSignMultiplier * dewpointValue);

    // Return successful parse result
    return Opt.some({
      temperature,
      dewpoint,
      rawString: fullMatch,
    });
  } catch (error) {
    // Requirement 2.6: Return None for malformed data
    // This catches any parsing errors (e.g., invalid number format)
    return Opt.none();
  }
}

/**
 * Encode a PrecisionTemperature back to T-Group format
 * 
 * This is primarily used for testing round-trip consistency.
 * Converts a temperature value to the T-Group encoding format.
 * 
 * Note: This only encodes the temperature portion, not the full T-Group
 * (which would require both temperature and dewpoint).
 * 
 * @param temp - Temperature to encode
 * @returns T-Group temperature encoding (e.g., "0172" for 17.2°C, "1052" for -5.2°C)
 * 
 * @example
 * ```typescript
 * const temp1 = PrecisionTemperature.fromCelsius(17.2);
 * encodeTGroupTemperature(temp1); // "0172"
 * 
 * const temp2 = PrecisionTemperature.fromCelsius(-5.2);
 * encodeTGroupTemperature(temp2); // "1052"
 * ```
 */
export function encodeTGroupTemperature(temp: PrecisionTemperature): string {
  const value = PrecisionTemperature.value(temp);
  
  // Determine sign: 0 for positive, 1 for negative
  const sign = value >= 0 ? '0' : '1';
  
  // Convert to tenths and take absolute value
  const tenths = Math.abs(Math.round(value * 10));
  
  // Format as 3-digit code with leading zeros
  const code = tenths.toString().padStart(3, '0');
  
  return sign + code;
}

/**
 * Encode a full T-Group string from temperature and dewpoint
 * 
 * Creates a complete T-Group string for testing purposes.
 * 
 * @param temperature - Temperature value
 * @param dewpoint - Dewpoint value
 * @returns Full T-Group string (e.g., "T01720158")
 * 
 * @example
 * ```typescript
 * const temp = PrecisionTemperature.fromCelsius(17.2);
 * const dewpoint = PrecisionTemperature.fromCelsius(15.8);
 * encodeTGroup(temp, dewpoint); // "T01720158"
 * ```
 */
export function encodeTGroup(
  temperature: PrecisionTemperature,
  dewpoint: PrecisionTemperature
): string {
  return 'T' + encodeTGroupTemperature(temperature) + encodeTGroupTemperature(dewpoint);
}
