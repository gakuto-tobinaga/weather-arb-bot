/**
 * METAR Module
 * 
 * Public API for METAR data fetching and parsing.
 */

export { fetchMETAR, fetchAllStations } from './client';
export { parseTGroup, encodeTGroup, encodeTGroupTemperature } from './parser';
export type {
  METARObservation,
  METARError,
  METARResponse,
  TGroupResult,
  Option,
  Result,
} from './types';
export { Option } from './types';
