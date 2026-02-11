/**
 * Type Safety Tests for PrecisionTemperature
 * 
 * These tests demonstrate that PrecisionTemperature prevents mixing with regular numbers
 * and enforces type safety at compile time.
 */

import { describe, test, expect } from 'bun:test';
import { PrecisionTemperature } from '../src/types';

describe('PrecisionTemperature Type Safety', () => {
  test('PrecisionTemperature cannot be created from raw numbers without factory', () => {
    // This demonstrates type safety - you MUST use factory functions
    const temp = PrecisionTemperature.fromCelsius(20);
    
    // You can extract the value
    const value = PrecisionTemperature.value(temp);
    expect(value).toBe(20);
    
    // But you cannot assign a raw number to PrecisionTemperature
    // @ts-expect-error - This should fail at compile time
    const invalidTemp: typeof temp = 20;
    
    // The branded type prevents accidental mixing
    expect(typeof temp).toBe('number'); // Runtime: it's still a number
    // But TypeScript treats it as a distinct type
  });

  test('Factory functions ensure precision is always maintained', () => {
    // All factory functions guarantee 0.1°C precision
    const temp1 = PrecisionTemperature.fromCelsius(17.234567);
    const temp2 = PrecisionTemperature.fromFahrenheit(63.0223);
    
    // Both are rounded to 0.1°C precision
    expect(PrecisionTemperature.value(temp1)).toBe(17.2);
    expect(PrecisionTemperature.value(temp2)).toBe(17.2);
  });

  test('Type system prevents arithmetic on branded types', () => {
    const temp1 = PrecisionTemperature.fromCelsius(10);
    const temp2 = PrecisionTemperature.fromCelsius(20);
    
    // You cannot directly add PrecisionTemperature values
    // @ts-expect-error - This should fail at compile time
    const sum: typeof temp1 = temp1 + temp2;
    
    // You must extract values first, then create a new PrecisionTemperature
    const correctSum = PrecisionTemperature.fromCelsius(
      PrecisionTemperature.value(temp1) + PrecisionTemperature.value(temp2)
    );
    
    expect(PrecisionTemperature.value(correctSum)).toBe(30);
  });

  test('Conversions maintain type safety', () => {
    const tempC = PrecisionTemperature.fromCelsius(20);
    
    // toFahrenheit returns a regular number, not PrecisionTemperature
    const tempF = PrecisionTemperature.toFahrenheit(tempC);
    expect(typeof tempF).toBe('number');
    expect(tempF).toBe(68);
    
    // To get back to PrecisionTemperature, use fromFahrenheit
    const tempC2 = PrecisionTemperature.fromFahrenheit(tempF);
    expect(PrecisionTemperature.value(tempC2)).toBe(20);
  });
});
