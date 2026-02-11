# Implementation Plan: Market Range Enhancement

## Overview

This implementation plan enhances the weather arbitrage bot to support real-world Polymarket market formats with city names and temperature ranges. The work focuses on two core modules: Market Extractor for parsing enhanced market formats, and Probability Calculator for range-based probability calculations.

## Tasks

- [x] 1. Extend Market type to support temperature ranges
  - Modify `src/market/types.ts` to add `minThreshold` and `maxThreshold` fields to Market type
  - Maintain existing `threshold` field for backward compatibility
  - Update type exports and documentation
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 2. Implement city name detection and mapping
  - [x] 2.1 Create city mapping configuration in `src/market/extractor.ts`
    - Define `CityMapping` type with patterns, icaoCode, and defaultUnit
    - Create `CITY_MAPPINGS` array with NYC, Chicago, and London mappings
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 2.2 Implement `detectCityAndUnit` function
    - Search market question for city name patterns using regex
    - Return ICAO code and default temperature unit
    - Handle case-insensitive matching
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_
  
  - [ ]* 2.3 Write property test for city name mapping
    - **Property 1: City Name to ICAO Mapping**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [ ]* 2.4 Write property test for ICAO code priority
    - **Property 2: ICAO Code Priority**
    - **Validates: Requirements 1.4**
  
  - [ ]* 2.5 Write property test for unrecognized city rejection
    - **Property 3: Unrecognized City Rejection**
    - **Validates: Requirements 1.5**

- [ ] 3. Implement temperature specification parsing
  - [x] 3.1 Define `TemperatureSpec` type
    - Create union type for range, ceiling, floor, and single threshold
    - Include min, max, value, and unit fields as appropriate
    - _Requirements: 3.1, 4.1, 5.1_
  
  - [x] 3.2 Implement `parseTemperatureSpec` function
    - Parse range patterns: "X-Y°F", "X to Y°C"
    - Parse ceiling patterns: "X or higher", "X+", "> X"
    - Parse floor patterns: "X or below", "< X"
    - Parse single threshold patterns: "X°F"
    - Handle explicit unit markers with priority over default unit
    - Preserve decimal precision
    - Return null if no valid pattern found
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.3 Write property test for temperature unit detection
    - **Property 4: Temperature Unit Detection**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
  
  - [ ]* 3.4 Write property test for range parsing
    - **Property 5: Range Parsing**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  
  - [ ]* 3.5 Write property test for ceiling parsing
    - **Property 7: Ceiling Parsing**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  
  - [ ]* 3.6 Write property test for floor parsing
    - **Property 8: Floor Parsing**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 4. Checkpoint - Ensure parsing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Enhance extractMarketData function
  - [x] 5.1 Update `extractMarketData` to use city detection
    - Try extracting ICAO code directly first (backward compatibility)
    - Fall back to city name detection if no ICAO code found
    - Search question, ancillaryData, and description fields
    - _Requirements: 1.4, 1.5_
  
  - [x] 5.2 Integrate temperature specification parsing
    - Call `parseTemperatureSpec` with detected default unit
    - Handle all four temperature spec types (range, ceiling, floor, single)
    - Convert parsed values to PrecisionTemperature based on unit
    - Set threshold, minThreshold, and maxThreshold fields appropriately
    - _Requirements: 8.4, 8.5, 9.1_
  
  - [x] 5.3 Add error handling for invalid specifications
    - Validate that min <= max for ranges
    - Return descriptive errors for parsing failures
    - Handle missing units when city cannot be determined
    - Handle non-numeric temperature values
    - _Requirements: 2.5, 3.5, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 5.4 Write property test for invalid range rejection
    - **Property 6: Invalid Range Rejection**
    - **Validates: Requirements 3.5**
  
  - [ ]* 5.5 Write property test for single threshold field consistency
    - **Property 14: Single Threshold Field Consistency**
    - **Validates: Requirements 8.4, 9.1**
  
  - [ ]* 5.6 Write property test for range field population
    - **Property 15: Range Field Population**
    - **Validates: Requirements 8.5**
  
  - [ ]* 5.7 Write property test for conflicting range rejection
    - **Property 16: Conflicting Range Rejection**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 5.8 Write property test for invalid temperature value rejection
    - **Property 17: Invalid Temperature Value Rejection**
    - **Validates: Requirements 10.4**
  
  - [ ]* 5.9 Write unit tests for specific market examples
    - Test "Will NYC temperature be 40-41°F?" → KLGA, range
    - Test "Will Chicago hit 75 or higher?" → KORD, ceiling
    - Test "Will London drop below 10°C?" → EGLC, floor
    - Test backward compatibility with single threshold markets
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 4.1, 5.1, 8.4_

- [x] 6. Checkpoint - Ensure extraction tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement range-based probability calculation
  - [-] 7.1 Create `calculateRangeProbability` function in `src/probability/calculator.ts`
    - Accept currentTemp, minThreshold, maxThreshold, icao, timeRemaining parameters
    - Extract numeric values from PrecisionTemperature
    - Validate that min <= max
    - Calculate time-adjusted sigma using existing `calculateSigma` function
    - _Requirements: 6.1, 6.5, 7.4, 7.5_
  
  - [x] 7.2 Implement finite range probability calculation
    - Handle case where both min and max are finite
    - Calculate z-scores for min and max: (value - μ) / σ
    - Compute P = Φ(z_max) - Φ(z_min) using existing CDF function
    - Clamp result to [0, 1] range
    - _Requirements: 6.1, 7.1_
  
  - [x] 7.3 Implement ceiling probability calculation
    - Handle case where max is Infinity
    - Calculate z-score for min: (min - μ) / σ
    - Compute P = 1 - Φ(z_min)
    - Clamp result to [0, 1] range
    - _Requirements: 6.2, 7.2_
  
  - [x] 7.4 Implement floor probability calculation
    - Handle case where min is -Infinity
    - Calculate z-score for max: (max - μ) / σ
    - Compute P = Φ(z_max)
    - Clamp result to [0, 1] range
    - _Requirements: 6.3, 7.3_
  
  - [x] 7.5 Implement single threshold backward compatibility
    - Handle case where min equals max
    - Use existing threshold-crossing formula: P = 1 - Φ((threshold - μ) / σ)
    - Ensure backward compatibility with existing markets
    - _Requirements: 6.4, 9.2_
  
  - [x] 7.6 Handle edge cases
    - Return 0.0 for expired markets (negative time remaining)
    - Return deterministic probability when sigma = 0
    - Handle Infinity and -Infinity correctly in all calculations
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 7.7 Write property test for finite range probability
    - **Property 9: Finite Range Probability**
    - **Validates: Requirements 6.1, 7.1**
  
  - [ ]* 7.8 Write property test for ceiling probability
    - **Property 10: Ceiling Probability**
    - **Validates: Requirements 6.2, 7.2**
  
  - [ ]* 7.9 Write property test for floor probability
    - **Property 11: Floor Probability**
    - **Validates: Requirements 6.3, 7.3**
  
  - [ ]* 7.10 Write property test for single threshold backward compatibility
    - **Property 12: Single Threshold Backward Compatibility**
    - **Validates: Requirements 6.4, 9.2**
  
  - [ ]* 7.11 Write property test for invalid range error
    - **Property 13: Invalid Range Error**
    - **Validates: Requirements 6.5**
  
  - [ ]* 7.12 Write property test for probability bounds
    - **Property 18: Probability Bounds**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [ ]* 7.13 Write unit tests for edge cases
    - Test expired markets (negative time remaining)
    - Test zero time remaining
    - Test zero sigma
    - Test Infinity and -Infinity bounds
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 8. Update existing calculateProbability function
  - [x] 8.1 Modify `calculateProbability` to call `calculateRangeProbability`
    - Maintain existing function signature for backward compatibility
    - Call `calculateRangeProbability` with threshold as both min and max
    - Ensure existing code using this function continues to work
    - _Requirements: 9.5_
  
  - [ ]* 8.2 Write integration test for backward compatibility
    - Test that existing single-threshold markets work unchanged
    - Verify probability calculations match previous implementation
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 9. Checkpoint - Ensure probability tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Add property-based test infrastructure
  - [ ] 10.1 Install fast-check library
    - Add fast-check as dev dependency
    - Configure test runner for property-based tests
  
  - [ ] 10.2 Create test data generators
    - Create generator for city names (NYC, Chicago, London)
    - Create generator for temperature ranges with min < max constraint
    - Create generator for market questions with city and temperature
    - Create generator for ICAO codes
    - Create generator for time durations
    - Create generator for PrecisionTemperature values
  
  - [ ]* 10.3 Write property test for temperature precision preservation
    - **Property 19: Temperature Precision Preservation**
    - **Validates: Requirements 3.4, 9.4**
  
  - [ ]* 10.4 Write property test for unit conversion consistency
    - **Property 20: Unit Conversion Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 11. Integration and verification
  - [x] 11.1 Update any code that creates Market objects
    - Ensure all Market object creation includes minThreshold and maxThreshold
    - Update any code that reads threshold field to handle ranges
    - Verify no breaking changes to existing functionality
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 11.2 Update any code that calls calculateProbability
    - Verify existing calls continue to work with backward-compatible wrapper
    - Consider migrating to calculateRangeProbability where appropriate
    - _Requirements: 9.5_
  
  - [ ]* 11.3 Write integration tests for end-to-end flow
    - Test Gamma API response → market extraction → probability calculation
    - Use real Polymarket market data examples
    - Verify NYC and Chicago markets now appear in monitoring logs
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility with existing single-threshold markets
- TypeScript is used throughout for type safety
