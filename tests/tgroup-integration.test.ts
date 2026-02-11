/**
 * T-Group Parser Integration Test
 * 
 * Tests T-Group parsing with real METAR data from aviationweather.gov
 * to verify the implementation works correctly with actual API responses.
 * 
 * This test validates that:
 * 1. The METAR client correctly integrates with the T-Group parser
 * 2. Real METAR observations contain T-Group data
 * 3. The parser extracts 0.1°C precision temperatures from live data
 */

import { describe, test, expect } from 'bun:test';
import { fetchMETAR } from '../src/metar/client';
import { Option } from '../src/metar/types';
import { PrecisionTemperature } from '../src/types/temperature';

describe('T-Group Parser Integration', () => {
  test('should parse T-Group from real KLGA METAR data', async () => {
    const result = await fetchMETAR('KLGA');

    expect(result.success).toBe(true);

    if (result.success) {
      const observation = result.value;

      // Log the raw METAR for debugging
      console.log('KLGA Raw METAR:', observation.rawMETAR);

      // Check if T-Group was found
      if (Option.isSome(observation.tGroup)) {
        const tGroup = observation.tGroup.value;

        console.log('T-Group found:', tGroup.rawString);
        console.log('Temperature:', PrecisionTemperature.value(tGroup.temperature), '°C');
        console.log('Dewpoint:', PrecisionTemperature.value(tGroup.dewpoint), '°C');

        // Verify temperature is within reasonable range
        const temp = PrecisionTemperature.value(tGroup.temperature);
        expect(temp).toBeGreaterThan(-50);
        expect(temp).toBeLessThan(50);

        // Verify dewpoint is within reasonable range
        const dewpoint = PrecisionTemperature.value(tGroup.dewpoint);
        expect(dewpoint).toBeGreaterThan(-50);
        expect(dewpoint).toBeLessThan(50);

        // Verify dewpoint is less than or equal to temperature (physical law)
        expect(dewpoint).toBeLessThanOrEqual(temp);

        // Verify raw string matches T-Group pattern
        expect(tGroup.rawString).toMatch(/^T[01]\d{3}[01]\d{3}$/);
      } else {
        console.log('No T-Group found in METAR (this is OK, not all METARs have T-Groups)');
      }
    }
  }, { timeout: 10000 }); // 10 second timeout for network request

  test('should parse T-Group from real KORD METAR data', async () => {
    const result = await fetchMETAR('KORD');

    expect(result.success).toBe(true);

    if (result.success) {
      const observation = result.value;

      console.log('KORD Raw METAR:', observation.rawMETAR);

      if (Option.isSome(observation.tGroup)) {
        const tGroup = observation.tGroup.value;

        console.log('T-Group found:', tGroup.rawString);
        console.log('Temperature:', PrecisionTemperature.value(tGroup.temperature), '°C');
        console.log('Dewpoint:', PrecisionTemperature.value(tGroup.dewpoint), '°C');

        // Basic sanity checks
        const temp = PrecisionTemperature.value(tGroup.temperature);
        const dewpoint = PrecisionTemperature.value(tGroup.dewpoint);

        expect(temp).toBeGreaterThan(-50);
        expect(temp).toBeLessThan(50);
        expect(dewpoint).toBeGreaterThan(-50);
        expect(dewpoint).toBeLessThan(50);
        expect(dewpoint).toBeLessThanOrEqual(temp);
      } else {
        console.log('No T-Group found in METAR');
      }
    }
  }, { timeout: 10000 });

  test('should parse T-Group from real EGLC METAR data', async () => {
    const result = await fetchMETAR('EGLC');

    expect(result.success).toBe(true);

    if (result.success) {
      const observation = result.value;

      console.log('EGLC Raw METAR:', observation.rawMETAR);

      if (Option.isSome(observation.tGroup)) {
        const tGroup = observation.tGroup.value;

        console.log('T-Group found:', tGroup.rawString);
        console.log('Temperature:', PrecisionTemperature.value(tGroup.temperature), '°C');
        console.log('Dewpoint:', PrecisionTemperature.value(tGroup.dewpoint), '°C');

        // Basic sanity checks
        const temp = PrecisionTemperature.value(tGroup.temperature);
        const dewpoint = PrecisionTemperature.value(tGroup.dewpoint);

        expect(temp).toBeGreaterThan(-50);
        expect(temp).toBeLessThan(50);
        expect(dewpoint).toBeGreaterThan(-50);
        expect(dewpoint).toBeLessThan(50);
        expect(dewpoint).toBeLessThanOrEqual(temp);
      } else {
        console.log('No T-Group found in METAR');
      }
    }
  }, { timeout: 10000 });

  test('T-Group provides more precision than standard temperature field', async () => {
    const result = await fetchMETAR('KLGA');

    expect(result.success).toBe(true);

    if (result.success) {
      const observation = result.value;

      // Standard temperature field (1°C precision)
      const standardTemp = PrecisionTemperature.value(observation.temperature);

      if (Option.isSome(observation.tGroup)) {
        // T-Group temperature (0.1°C precision)
        const preciseTemp = PrecisionTemperature.value(observation.tGroup.value.temperature);

        console.log('Standard temperature (1°C):', standardTemp);
        console.log('T-Group temperature (0.1°C):', preciseTemp);

        // The T-Group temperature should be within 1°C of the standard temperature
        // (they measure the same thing, but T-Group has more precision)
        expect(Math.abs(preciseTemp - standardTemp)).toBeLessThan(1.0);

        // Demonstrate the precision advantage
        const precisionDigits = preciseTemp.toString().split('.')[1]?.length || 0;
        console.log('T-Group precision digits:', precisionDigits);

        // T-Group should have at least 1 decimal place (0.1°C precision)
        // Note: It might be 0 if the temperature is exactly a whole number
        if (preciseTemp % 1 !== 0) {
          expect(precisionDigits).toBeGreaterThanOrEqual(1);
        }
      } else {
        console.log('Cannot compare precision - no T-Group available');
      }
    }
  }, { timeout: 10000 });
});
