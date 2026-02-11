/**
 * Ancillary Data Parser
 * 
 * Parses observation end time from Polymarket Gamma API Ancillary_Data field.
 * The Ancillary_Data contains market settlement rules including the observation
 * end time in the market's local timezone.
 * 
 * WARNING: Polymarket's Gamma API returns ancillary_data with non-standard
 * text formats. This parser uses flexible regex patterns to handle various
 * date/time formats and edge cases.
 */

import { fromZonedTime } from 'date-fns-tz';
import { parse, isValid } from 'date-fns';
import { Timestamp } from '../types/timestamp';
import { getTimezoneForICAO } from './index';
import type { ICAOCode } from '../config';

/**
 * Result type for Ancillary Data parsing
 */
export type AncillaryDataParseResult = 
  | { success: true; observationEnd: Timestamp }
  | { success: false; error: string };

/**
 * Parse observation end time from Ancillary_Data string
 * 
 * Extracts the observation end time from market metadata and converts it
 * to a UTC Timestamp. The time is parsed in the market's local timezone
 * (determined by ICAO code) to ensure correct handling of DST transitions.
 * 
 * @param ancillaryData - Raw Ancillary_Data string from Gamma API
 * @param icaoCode - ICAO code to determine timezone
 * @returns Parse result with Timestamp or error message
 * 
 * @example
 * ```typescript
 * const data = "...observation end: 2024-01-15 23:59...";
 * const result = parseObservationEndTime(data, 'KLGA');
 * if (result.success) {
 *   console.log(result.observationEnd.utc);
 * }
 * ```
 */
export function parseObservationEndTime(
  ancillaryData: string,
  icaoCode: ICAOCode
): AncillaryDataParseResult {
  if (!ancillaryData || ancillaryData.trim().length === 0) {
    return {
      success: false,
      error: 'Ancillary_Data is empty or undefined'
    };
  }

  // Get timezone for this ICAO code
  const timezone = getTimezoneForICAO(icaoCode);

  // Try multiple regex patterns to handle various formats
  const patterns = [
    // Format: "observation end: 2024-01-15 23:59"
    /observation\s+end[:\s]+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i,
    
    // Format: "end time: 2024-01-15 23:59:00"
    /end\s+time[:\s]+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/i,
    
    // Format: "settlement time: 2024-01-15T23:59"
    /settlement\s+time[:\s]+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/i,
    
    // Format: "ends at 2024-01-15 23:59"
    /ends?\s+at[:\s]+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i,
    
    // Format: "until 2024-01-15 23:59"
    /until[:\s]+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i,
    
    // Format: JSON-like "observation_end":"2024-01-15 23:59"
    /"observation_end"\s*:\s*"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})"/i,
  ];

  let dateTimeStr: string | null = null;

  // Try each pattern until one matches
  for (const pattern of patterns) {
    const match = ancillaryData.match(pattern);
    if (match && match[1]) {
      dateTimeStr = match[1];
      break;
    }
  }

  if (!dateTimeStr) {
    return {
      success: false,
      error: 'Could not find observation end time in Ancillary_Data'
    };
  }

  // Normalize the date string (replace T with space if present)
  const normalizedDateStr = dateTimeStr.replace('T', ' ').trim();

  // Try parsing with different formats
  const dateFormats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd HH:mm',
  ];

  let parsedDate: Date | null = null;

  for (const format of dateFormats) {
    try {
      const date = parse(normalizedDateStr, format, new Date());
      if (isValid(date)) {
        parsedDate = date;
        break;
      }
    } catch {
      // Try next format
      continue;
    }
  }

  if (!parsedDate || !isValid(parsedDate)) {
    return {
      success: false,
      error: `Could not parse date string: ${dateTimeStr}`
    };
  }

  // Convert from local timezone to UTC
  try {
    const utcDate = fromZonedTime(parsedDate, timezone);
    
    if (!isValid(utcDate)) {
      return {
        success: false,
        error: 'Timezone conversion resulted in invalid date'
      };
    }

    const timestamp = Timestamp.fromUTC(utcDate);

    return {
      success: true,
      observationEnd: timestamp
    };
  } catch (error) {
    return {
      success: false,
      error: `Timezone conversion failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate that Ancillary_Data contains required settlement information
 * 
 * @param ancillaryData - Raw Ancillary_Data string
 * @returns true if data appears valid, false otherwise
 */
export function validateAncillaryData(ancillaryData: string): boolean {
  if (!ancillaryData || ancillaryData.trim().length === 0) {
    return false;
  }

  // Check for presence of time-related keywords
  const hasTimeInfo = /observation|end|time|settlement|until/i.test(ancillaryData);
  
  // Check for presence of date pattern
  const hasDatePattern = /\d{4}-\d{2}-\d{2}/.test(ancillaryData);

  return hasTimeInfo && hasDatePattern;
}
