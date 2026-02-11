/**
 * PrecisionTemperature Branded Type
 * 
 * A branded type that ensures all temperature values maintain 0.1°C precision
 * and prevents mixing with regular numbers for type safety.
 * 
 * Requirements: 14.4, 14.7
 */

// Branded type for 0.1°C precision temperatures
declare const PrecisionTemperatureBrand: unique symbol;
export type PrecisionTemperature = number & { [PrecisionTemperatureBrand]: true };

/**
 * Factory functions and utilities for PrecisionTemperature
 */
export const PrecisionTemperature = {
  /**
   * Create a PrecisionTemperature from a Celsius value
   * Rounds to 0.1°C precision
   * 
   * @param value - Temperature in Celsius
   * @returns PrecisionTemperature with 0.1°C precision
   */
  fromCelsius: (value: number): PrecisionTemperature => {
    // Round to 0.1°C precision
    return Math.round(value * 10) / 10 as PrecisionTemperature;
  },
  
  /**
   * Create a PrecisionTemperature from a Fahrenheit value
   * Converts to Celsius and rounds to 0.1°C precision
   * 
   * @param value - Temperature in Fahrenheit
   * @returns PrecisionTemperature with 0.1°C precision
   */
  fromFahrenheit: (value: number): PrecisionTemperature => {
    const celsius = (value - 32) * 5 / 9;
    return PrecisionTemperature.fromCelsius(celsius);
  },
  
  /**
   * Convert a PrecisionTemperature to Fahrenheit
   * 
   * @param temp - PrecisionTemperature value
   * @returns Temperature in Fahrenheit
   */
  toFahrenheit: (temp: PrecisionTemperature): number => {
    return (temp as number) * 9 / 5 + 32;
  },
  
  /**
   * Extract the numeric value from a PrecisionTemperature
   * Use this when you need the raw number for calculations
   * 
   * @param temp - PrecisionTemperature value
   * @returns Numeric value in Celsius
   */
  value: (temp: PrecisionTemperature): number => temp as number,
};
