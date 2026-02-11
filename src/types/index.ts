/**
 * Core Type Definitions
 * 
 * Branded types and core data structures for type-safe temperature and time handling.
 */

// Export PrecisionTemperature branded type
export { PrecisionTemperature } from './temperature';
export type { PrecisionTemperature as PrecisionTemperatureType } from './temperature';

// Export Timestamp and Duration branded types
export { Timestamp, Duration } from './timestamp';
export type { Timestamp as TimestampType, Duration as DurationType } from './timestamp';

// ICAO airport codes
export type ICAOCode = 'KLGA' | 'KORD' | 'EGLC';

// Export timezone mapping and helper
export { ICAO_TIMEZONE_MAP, getTimezoneForICAO } from './timezone';
