# Requirements Document

## Introduction

This specification enhances the weather arbitrage bot's market discovery and probability calculation capabilities to support real-world market formats. Current markets use city names (NYC, Chicago, London) instead of ICAO codes, and specify temperature ranges (40-41°F) instead of single thresholds. The system must detect these patterns and calculate probabilities for temperature ranges rather than simple threshold crossings.

## Glossary

- **Market_Extractor**: The component that parses market data from Polymarket Gamma API to extract trading-relevant information
- **ICAO_Code**: International Civil Aviation Organization airport identifier (KLGA, KORD, EGLC)
- **City_Name**: Common city names used in market questions (NYC, New York, Chicago, London)
- **Temperature_Range**: A temperature bucket specified as min-max (e.g., "40-41°F")
- **Temperature_Ceiling**: A temperature threshold specified as "X or higher"
- **Temperature_Floor**: A temperature threshold specified as "X or below"
- **Probability_Calculator**: The component that calculates the probability of temperature outcomes using normal distribution
- **Temperature_Unit**: Either Fahrenheit (°F) or Celsius (°C)
- **Market_Question**: The question field from Polymarket Gamma API containing market description
- **Market_Type**: The Market data structure containing all trading-relevant information
- **Min_Threshold**: The lower bound of a temperature range (can be -infinity)
- **Max_Threshold**: The upper bound of a temperature range (can be +infinity)

## Requirements

### Requirement 1: City Name to ICAO Code Mapping

**User Story:** As a trader, I want the system to recognize city names in market questions, so that I can trade on markets that use "NYC" or "Chicago" instead of airport codes.

#### Acceptance Criteria

1. WHEN a Market_Question contains "NYC" or "New York" or "LaGuardia", THE Market_Extractor SHALL map it to ICAO_Code "KLGA"
2. WHEN a Market_Question contains "Chicago" or "O'Hare", THE Market_Extractor SHALL map it to ICAO_Code "KORD"
3. WHEN a Market_Question contains "London" or "London City", THE Market_Extractor SHALL map it to ICAO_Code "EGLC"
4. WHEN a Market_Question contains both a City_Name and an ICAO_Code, THE Market_Extractor SHALL prioritize the ICAO_Code
5. WHEN a Market_Question contains an unrecognized city name, THE Market_Extractor SHALL return null for ICAO_Code

### Requirement 2: Automatic Temperature Unit Detection

**User Story:** As a trader, I want the system to automatically detect whether temperatures are in Fahrenheit or Celsius based on the city, so that I don't need to manually specify units for each market.

#### Acceptance Criteria

1. WHEN a Market_Question contains "NYC" or "Chicago", THE Market_Extractor SHALL interpret temperature values as Fahrenheit
2. WHEN a Market_Question contains "London", THE Market_Extractor SHALL interpret temperature values as Celsius
3. WHEN a Market_Question explicitly specifies "°F" or "F", THE Market_Extractor SHALL use Fahrenheit regardless of city
4. WHEN a Market_Question explicitly specifies "°C" or "C", THE Market_Extractor SHALL use Celsius regardless of city
5. WHEN temperature units cannot be determined, THE Market_Extractor SHALL return an error

### Requirement 3: Temperature Range Parsing

**User Story:** As a trader, I want the system to parse temperature ranges like "40-41°F", so that I can trade on bucket markets that specify temperature ranges instead of single thresholds.

#### Acceptance Criteria

1. WHEN a Market_Question contains a pattern "X-Y°F" or "X-Y°C", THE Market_Extractor SHALL extract min=X and max=Y
2. WHEN a Market_Question contains a pattern "X-Y F" or "X-Y C" (with space), THE Market_Extractor SHALL extract min=X and max=Y
3. WHEN a Market_Question contains a pattern "X to Y°F" or "X to Y°C", THE Market_Extractor SHALL extract min=X and max=Y
4. WHEN a Market_Question contains decimal values in ranges like "40.5-41.5°F", THE Market_Extractor SHALL preserve decimal precision
5. WHEN a Market_Question contains an invalid range where min > max, THE Market_Extractor SHALL return an error

### Requirement 4: Temperature Ceiling Parsing

**User Story:** As a trader, I want the system to parse ceiling thresholds like "75 or higher", so that I can trade on markets with open-ended upper bounds.

#### Acceptance Criteria

1. WHEN a Market_Question contains "X or higher", THE Market_Extractor SHALL extract min=X and max=infinity
2. WHEN a Market_Question contains "X or above", THE Market_Extractor SHALL extract min=X and max=infinity
3. WHEN a Market_Question contains "X+", THE Market_Extractor SHALL extract min=X and max=infinity
4. WHEN a Market_Question contains "above X", THE Market_Extractor SHALL extract min=X and max=infinity
5. WHEN a Market_Question contains "> X" or "greater than X", THE Market_Extractor SHALL extract min=X and max=infinity

### Requirement 5: Temperature Floor Parsing

**User Story:** As a trader, I want the system to parse floor thresholds like "40 or below", so that I can trade on markets with open-ended lower bounds.

#### Acceptance Criteria

1. WHEN a Market_Question contains "X or below", THE Market_Extractor SHALL extract min=-infinity and max=X
2. WHEN a Market_Question contains "X or lower", THE Market_Extractor SHALL extract min=-infinity and max=X
3. WHEN a Market_Question contains "X or less", THE Market_Extractor SHALL extract min=-infinity and max=X
4. WHEN a Market_Question contains "below X", THE Market_Extractor SHALL extract min=-infinity and max=X
5. WHEN a Market_Question contains "< X" or "less than X", THE Market_Extractor SHALL extract min=-infinity and max=X

### Requirement 6: Range-Based Probability Calculation

**User Story:** As a trader, I want the system to calculate the probability that temperature falls within a specific range, so that I can evaluate bucket markets that pay out for temperature ranges rather than threshold crossings.

#### Acceptance Criteria

1. WHEN calculating probability for a Temperature_Range with finite min and max, THE Probability_Calculator SHALL compute P(min ≤ T_max ≤ max) using the normal distribution CDF
2. WHEN calculating probability for a Temperature_Ceiling, THE Probability_Calculator SHALL compute P(T_max ≥ min)
3. WHEN calculating probability for a Temperature_Floor, THE Probability_Calculator SHALL compute P(T_max ≤ max)
4. WHEN min equals max (single threshold), THE Probability_Calculator SHALL compute P(T_max > threshold) for backward compatibility
5. WHEN min is greater than max, THE Probability_Calculator SHALL return an error

### Requirement 7: Normal Distribution CDF Formula

**User Story:** As a system, I want to use the correct statistical formula for range probabilities, so that probability calculations are mathematically accurate.

#### Acceptance Criteria

1. THE Probability_Calculator SHALL compute range probability as Φ((max - μ) / σ) - Φ((min - μ) / σ)
2. WHEN max is infinity, THE Probability_Calculator SHALL compute 1 - Φ((min - μ) / σ)
3. WHEN min is negative infinity, THE Probability_Calculator SHALL compute Φ((max - μ) / σ)
4. THE Probability_Calculator SHALL use the existing sigma calculation function for σ
5. THE Probability_Calculator SHALL use current temperature as μ

### Requirement 8: Market Type Extension

**User Story:** As a system maintainer, I want the Market type to support both single thresholds and temperature ranges, so that the system can handle both legacy and new market formats.

#### Acceptance Criteria

1. THE Market_Type SHALL include a minThreshold field of type PrecisionTemperature
2. THE Market_Type SHALL include a maxThreshold field of type PrecisionTemperature
3. THE Market_Type SHALL maintain the existing threshold field for backward compatibility
4. WHEN a market has a single threshold, THE Market_Extractor SHALL set minThreshold = threshold and maxThreshold = threshold
5. WHEN a market has a temperature range, THE Market_Extractor SHALL set minThreshold and maxThreshold to the range bounds

### Requirement 9: Backward Compatibility

**User Story:** As a system maintainer, I want the enhanced system to remain compatible with existing single-threshold markets, so that existing functionality continues to work without modification.

#### Acceptance Criteria

1. WHEN a market specifies a single threshold without range syntax, THE Market_Extractor SHALL set threshold, minThreshold, and maxThreshold to the same value
2. WHEN calculating probability for a market where minThreshold equals maxThreshold, THE Probability_Calculator SHALL compute P(T_max > threshold)
3. WHEN a Market_Question contains both old-style ICAO codes and new-style city names, THE system SHALL process both correctly
4. THE system SHALL maintain the existing PrecisionTemperature type and precision requirements
5. THE existing calculateProbability function signature SHALL remain unchanged for backward compatibility

### Requirement 9: Backward Compatibility

**User Story:** As a system maintainer, I want the enhanced system to remain compatible with existing single-threshold markets, so that existing functionality continues to work without modification.

#### Acceptance Criteria

1. WHEN a market specifies a single threshold without range syntax, THE Market_Extractor SHALL set threshold, minThreshold, and maxThreshold to the same value
2. WHEN calculating probability for a market where minThreshold equals maxThreshold, THE Probability_Calculator SHALL compute P(T_max > threshold)
3. WHEN a Market_Question contains both old-style ICAO codes and new-style city names, THE system SHALL process both correctly
4. THE system SHALL maintain the existing PrecisionTemperature type and precision requirements
5. THE existing calculateProbability function signature SHALL remain unchanged for backward compatibility

### Requirement 10: Error Handling for Ambiguous Markets

**User Story:** As a trader, I want the system to reject markets with ambiguous or unparseable temperature specifications, so that I don't trade on markets the system cannot properly evaluate.

#### Acceptance Criteria

1. WHEN a Market_Question contains multiple conflicting temperature ranges, THE Market_Extractor SHALL return an error
2. WHEN a Market_Question contains both range and ceiling/floor syntax, THE Market_Extractor SHALL return an error
3. WHEN a Market_Question contains temperature values without units and city cannot be determined, THE Market_Extractor SHALL return an error
4. WHEN a Market_Question contains invalid temperature values (non-numeric), THE Market_Extractor SHALL return an error
5. THE Market_Extractor SHALL provide descriptive error messages indicating why parsing failed
