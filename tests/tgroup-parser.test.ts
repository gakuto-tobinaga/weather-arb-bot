/**
 * T-Group Parser Unit Tests
 * 
 * Tests for METAR T-Group parsing functionality with specific examples and edge cases.
 * 
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6
 */

import { describe, test, expect } from 'bun:test';
import { parseTGroup, encodeTGroup, encodeTGroupTemperature } from '../src/metar/parser';
import { PrecisionTemperature } from '../src/types/temperature';
import { Option } from '../src/metar/types';

describe('T-Group Parser - Unit Tests', () => {
  describe('parseTGroup - Valid T-Groups', () => {
    test('should parse positive temperature and dewpoint', () => {
      // T01720158 = temp: 17.2°C, dewpoint: 15.8°C
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T01720158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(17.2, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(15.8, 1);
        expect(result.value.rawString).toBe('T01720158');
      }
    });

    test('should parse negative temperature with positive dewpoint', () => {
      // T10520158 = temp: -5.2°C, dewpoint: 15.8°C
      const rawMETAR = 'KORD 121853Z 09008KT 10SM FEW250 -5/16 A3012 RMK T10520158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(-5.2, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(15.8, 1);
        expect(result.value.rawString).toBe('T10520158');
      }
    });

    test('should parse positive temperature with negative dewpoint', () => {
      // T01721052 = temp: 17.2°C, dewpoint: -5.2°C
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/-5 A3012 RMK T01721052';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(17.2, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(-5.2, 1);
        expect(result.value.rawString).toBe('T01721052');
      }
    });

    test('should parse both negative temperature and dewpoint', () => {
      // T10521158 = temp: -5.2°C, dewpoint: -15.8°C
      const rawMETAR = 'KORD 121853Z 09008KT 10SM FEW250 -5/-16 A3012 RMK T10521158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(-5.2, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(-15.8, 1);
        expect(result.value.rawString).toBe('T10521158');
      }
    });

    test('should parse zero temperature', () => {
      // T00000000 = temp: 0.0°C, dewpoint: 0.0°C
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 00/00 A3012 RMK T00000000';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(0.0, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(0.0, 1);
        expect(result.value.rawString).toBe('T00000000');
      }
    });

    test('should parse extreme cold temperature', () => {
      // T14561389 = temp: -45.6°C, dewpoint: -38.9°C
      const rawMETAR = 'EGLC 121853Z 09008KT 10SM FEW250 -46/-39 A3012 RMK T14561389';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(-45.6, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(-38.9, 1);
        expect(result.value.rawString).toBe('T14561389');
      }
    });

    test('should parse extreme hot temperature', () => {
      // T04560389 = temp: 45.6°C, dewpoint: 38.9°C
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 46/39 A3012 RMK T04560389';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(45.6, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(38.9, 1);
        expect(result.value.rawString).toBe('T04560389');
      }
    });

    test('should parse T-Group with leading zeros', () => {
      // T00010002 = temp: 0.1°C, dewpoint: 0.2°C
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 00/00 A3012 RMK T00010002';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(0.1, 1);
        expect(PrecisionTemperature.value(result.value.dewpoint)).toBeCloseTo(0.2, 1);
        expect(result.value.rawString).toBe('T00010002');
      }
    });

    test('should parse T-Group anywhere in METAR string', () => {
      // T-Group can appear anywhere in the Remarks section
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK AO2 SLP201 T01720158 TSNO';
      const result = parseTGroup(rawMETAR);

      expect(Option.isSome(result)).toBe(true);
      if (Option.isSome(result)) {
        expect(PrecisionTemperature.value(result.value.temperature)).toBeCloseTo(17.2, 1);
        expect(result.value.rawString).toBe('T01720158');
      }
    });
  });

  describe('parseTGroup - Invalid/Missing T-Groups', () => {
    test('should return None when T-Group is missing', () => {
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK AO2 SLP201';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for malformed T-Group (too short)', () => {
      // Missing one digit
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T0172015';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for malformed T-Group (too long)', () => {
      // Extra digit
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T017201589';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for invalid sign character', () => {
      // Sign must be 0 or 1, not 2
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T21720158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for non-numeric temperature code', () => {
      // Temperature code must be digits
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK T0ABC0158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for empty string', () => {
      const result = parseTGroup('');
      expect(Option.isNone(result)).toBe(true);
    });

    test('should return None for string without T prefix', () => {
      // Missing 'T' prefix
      const rawMETAR = 'KLGA 121853Z 09008KT 10SM FEW250 18/16 A3012 RMK 01720158';
      const result = parseTGroup(rawMETAR);

      expect(Option.isNone(result)).toBe(true);
    });
  });

  describe('encodeTGroupTemperature', () => {
    test('should encode positive temperature correctly', () => {
      const temp = PrecisionTemperature.fromCelsius(17.2);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('0172');
    });

    test('should encode negative temperature correctly', () => {
      const temp = PrecisionTemperature.fromCelsius(-5.2);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('1052');
    });

    test('should encode zero temperature correctly', () => {
      const temp = PrecisionTemperature.fromCelsius(0.0);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('0000');
    });

    test('should encode small positive temperature with leading zeros', () => {
      const temp = PrecisionTemperature.fromCelsius(0.1);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('0001');
    });

    test('should encode small negative temperature with leading zeros', () => {
      const temp = PrecisionTemperature.fromCelsius(-0.1);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('1001');
    });

    test('should encode extreme cold temperature', () => {
      const temp = PrecisionTemperature.fromCelsius(-45.6);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('1456');
    });

    test('should encode extreme hot temperature', () => {
      const temp = PrecisionTemperature.fromCelsius(45.6);
      const encoded = encodeTGroupTemperature(temp);
      expect(encoded).toBe('0456');
    });
  });

  describe('encodeTGroup', () => {
    test('should encode full T-Group with positive values', () => {
      const temp = PrecisionTemperature.fromCelsius(17.2);
      const dewpoint = PrecisionTemperature.fromCelsius(15.8);
      const encoded = encodeTGroup(temp, dewpoint);
      expect(encoded).toBe('T01720158');
    });

    test('should encode full T-Group with negative temperature', () => {
      const temp = PrecisionTemperature.fromCelsius(-5.2);
      const dewpoint = PrecisionTemperature.fromCelsius(15.8);
      const encoded = encodeTGroup(temp, dewpoint);
      expect(encoded).toBe('T10520158');
    });

    test('should encode full T-Group with both negative values', () => {
      const temp = PrecisionTemperature.fromCelsius(-5.2);
      const dewpoint = PrecisionTemperature.fromCelsius(-15.8);
      const encoded = encodeTGroup(temp, dewpoint);
      expect(encoded).toBe('T10521158');
    });

    test('should encode full T-Group with zero values', () => {
      const temp = PrecisionTemperature.fromCelsius(0.0);
      const dewpoint = PrecisionTemperature.fromCelsius(0.0);
      const encoded = encodeTGroup(temp, dewpoint);
      expect(encoded).toBe('T00000000');
    });
  });

  describe('Round-trip consistency', () => {
    test('should maintain value through encode-parse cycle', () => {
      const originalTemp = PrecisionTemperature.fromCelsius(17.2);
      const originalDewpoint = PrecisionTemperature.fromCelsius(15.8);
      
      // Encode to T-Group
      const encoded = encodeTGroup(originalTemp, originalDewpoint);
      
      // Parse back
      const parsed = parseTGroup(`METAR RMK ${encoded}`);
      
      expect(Option.isSome(parsed)).toBe(true);
      if (Option.isSome(parsed)) {
        expect(PrecisionTemperature.value(parsed.value.temperature))
          .toBeCloseTo(PrecisionTemperature.value(originalTemp), 1);
        expect(PrecisionTemperature.value(parsed.value.dewpoint))
          .toBeCloseTo(PrecisionTemperature.value(originalDewpoint), 1);
      }
    });

    test('should maintain negative values through encode-parse cycle', () => {
      const originalTemp = PrecisionTemperature.fromCelsius(-5.2);
      const originalDewpoint = PrecisionTemperature.fromCelsius(-15.8);
      
      const encoded = encodeTGroup(originalTemp, originalDewpoint);
      const parsed = parseTGroup(`METAR RMK ${encoded}`);
      
      expect(Option.isSome(parsed)).toBe(true);
      if (Option.isSome(parsed)) {
        expect(PrecisionTemperature.value(parsed.value.temperature))
          .toBeCloseTo(PrecisionTemperature.value(originalTemp), 1);
        expect(PrecisionTemperature.value(parsed.value.dewpoint))
          .toBeCloseTo(PrecisionTemperature.value(originalDewpoint), 1);
      }
    });

    test('should maintain zero through encode-parse cycle', () => {
      const originalTemp = PrecisionTemperature.fromCelsius(0.0);
      const originalDewpoint = PrecisionTemperature.fromCelsius(0.0);
      
      const encoded = encodeTGroup(originalTemp, originalDewpoint);
      const parsed = parseTGroup(`METAR RMK ${encoded}`);
      
      expect(Option.isSome(parsed)).toBe(true);
      if (Option.isSome(parsed)) {
        expect(PrecisionTemperature.value(parsed.value.temperature))
          .toBeCloseTo(PrecisionTemperature.value(originalTemp), 1);
        expect(PrecisionTemperature.value(parsed.value.dewpoint))
          .toBeCloseTo(PrecisionTemperature.value(originalDewpoint), 1);
      }
    });
  });
});
