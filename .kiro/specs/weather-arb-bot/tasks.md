# Implementation Plan: Weather-Arb-Bot

## Overview

This implementation plan breaks down the weather-arb-bot feature into discrete coding tasks. The plan follows a phased approach prioritizing core type safety, METAR parsing accuracy, and monitoring mode validation before live trading capabilities.

Key priorities based on design review:
1. Core types and validation (zod schemas + branded types)
2. METAR T-Group parsing with 100% accuracy
3. Monitoring mode with Brier score validation (target < 0.1 over 3 days)

## Tasks

- [x] 1. Set up project structure and core type system
  - Create project directory structure (src/, tests/, logs/)
  - Initialize Bun project with TypeScript configuration
  - Configure strict TypeScript compiler options (strict: true, noImplicitAny: true)
  - Set up testing framework (Bun test + fast-check for property-based testing)
  - _Requirements: 11.1, 11.2, 14.1_

- [x] 2. Implement branded types and core type definitions
  - [x] 2.1 Create PrecisionTemperature branded type with factory functions
    - Implement fromCelsius, fromFahrenheit, toFahrenheit, value functions
    - Ensure 0.1°C precision rounding in all conversions
    - _Requirements: 14.4, 14.7_
  
  - [ ]* 2.2 Write property test for temperature unit conversion
    - **Property 3: Temperature Unit Conversion Accuracy**
    - **Validates: Requirements 2.7**
  
  - [x] 2.3 Create Timestamp branded type with timezone awareness
    - Implement fromUTC, fromLocalTime, now, subtract functions
    - Use date-fns-tz or Luxon for timezone parsing
    - _Requirements: 14.5, 14.8, 3.4_
  
  - [ ]* 2.4 Write property test for timezone-aware time parsing
    - **Property 5: Timezone-Aware Time Parsing**
    - **Validates: Requirements 3.4**
  
  - [x] 2.5 Create Duration type for time calculations
    - Implement fromMilliseconds, isNegative, isPositive functions
    - _Requirements: 3.5_
  
  - [ ]* 2.6 Write property test for time remaining calculation
    - **Property 6: Time Remaining Calculation Correctness**
    - **Validates: Requirements 3.5, 3.9**

- [x] 3. Implement configuration validation with zod
  - [x] 3.1 Create ConfigSchema with zod validation
    - Validate POLYMARKET_PK (64-char hex), POLYMARKET_FUNDER (Ethereum address)
    - Validate POLYGON_RPC_URL (valid URL), TARGET_ICAO (enum)
    - Transform and validate numeric fields (MIN_EV, BUDGET, POLL_INTERVAL)
    - _Requirements: 11.4, 11.5, 11.6, 11.7, 14.2_
  
  - [ ]* 3.2 Write property test for configuration validation
    - **Property 26: Configuration Validation**
    - **Validates: Requirements 11.5, 11.6, 11.7**
  
  - [x] 3.3 Implement config loading and validation at startup
    - Load environment variables from .env file
    - Validate with ConfigSchema and exit with descriptive error on failure
    - Export typed Config object
    - _Requirements: 11.2, 11.4, 11.5_

- [x] 4. Checkpoint - Ensure type system tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement METAR client and T-Group parsing (CRITICAL)
  - [x] 5.1 Create METAR client for aviationweather.gov API
    - Implement fetchMETAR function with HTTP client
    - Use endpoint: https://aviationweather.gov/api/data/metar?ids={ICAO}&format=json
    - Implement parallel fetching for multiple stations with Promise.all
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 5.2 Create zod schema for METAR API response validation
    - Define METARResponseSchema with required fields (icaoId, obsTime, temp, rawOb)
    - Validate all API responses before processing
    - _Requirements: 14.3_
  
  - [ ]* 5.3 Write property test for API response validation
    - **Property 29: API Response Validation**
    - **Validates: Requirements 14.3**
  
  - [x] 5.4 Implement T-Group parsing with regex (TARGET: 100% accuracy)
    - Create regex pattern: T([01])(\d{3})([01])(\d{3})
    - Extract temperature sign (0=positive, 1=negative) and 3-digit code
    - Convert to PrecisionTemperature (e.g., 172 → 17.2°C)
    - Return Option<TGroupResult> (None for missing/malformed data)
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 5.5 Write property test for T-Group parsing correctness
    - **Property 1: T-Group Parsing Correctness**
    - **Validates: Requirements 2.1, 2.4, 2.5**
  
  - [ ]* 5.6 Write property test for T-Group round-trip consistency
    - **Property 2: T-Group Round-Trip Consistency**
    - **Validates: Requirements 2.5**
  
  - [ ]* 5.7 Write property test for invalid T-Group rejection
    - **Property 4: Invalid T-Group Rejection**
    - **Validates: Requirements 2.6**
  
  - [x] 5.8 Implement exponential backoff for METAR API errors
    - Start at 5 seconds, double on each retry, max 60 seconds
    - Log all retry attempts with timestamps
    - _Requirements: 1.3, 9.5_
  
  - [ ]* 5.9 Write property test for exponential backoff pattern
    - **Property 21: Exponential Backoff Pattern**
    - **Validates: Requirements 1.3, 9.1**

- [x] 6. Checkpoint - Ensure METAR parsing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement timezone handling and ICAO mapping
  - [x] 7.1 Create ICAO_TIMEZONE_MAP constant
    - Map KLGA → America/New_York, KORD → America/Chicago, EGLC → Europe/London
    - Implement getTimezoneForICAO helper function
    - _Requirements: 3.4_
  
  - [x] 7.2 Implement observation end time parsing from Ancillary_Data
    - Parse time string in market's local timezone using ICAO_TIMEZONE_MAP
    - Convert to UTC Timestamp
    - Return error for malformed Ancillary_Data
    - _Requirements: 3.3, 3.4, 4.4_
  
  - [ ]* 7.3 Write property test for Ancillary_Data parsing
    - **Property 11: Ancillary Data Parsing Completeness**
    - **Validates: Requirements 4.4**

- [x] 8. Implement probability engine with city-specific sigma
  - [x] 8.1 Create BASE_SIGMA_CONFIG constant
    - Define city-specific base_σ: KLGA=3.5, KORD=4.2, EGLC=2.8
    - Add comment about periodic updates from historical data
    - _Requirements: 3.6_
  
  - [x] 8.2 Implement sigma calculation function
    - Calculate σ = base_σ[icao] * sqrt(hours_remaining / 24)
    - Ensure σ decreases monotonically as time approaches zero
    - _Requirements: 3.6, 3.7_
  
  - [ ]* 8.3 Write property test for sigma decreases with time
    - **Property 7: Standard Deviation Decreases with Time**
    - **Validates: Requirements 3.6**
  
  - [x] 8.4 Implement probability calculation using normal CDF
    - Use @stdlib/stats-base-dists-normal-cdf for Φ function
    - Calculate P(T_max > X) = 1 - Φ((X - μ) / σ)
    - μ = current temperature, X = threshold
    - _Requirements: 3.1, 3.2_
  
  - [x] 8.5 Implement time remaining calculation
    - Calculate observationEnd - now (both UTC Timestamps)
    - Return Duration with validation for negative values
    - _Requirements: 3.5_
  
  - [x] 8.6 Implement EV calculation
    - Calculate EV = P(calculated) - P(market_price)
    - _Requirements: 3.8_
  
  - [ ]* 8.7 Write property test for EV calculation
    - **Property 8: Expected Value Calculation**
    - **Validates: Requirements 3.8**
  
  - [x] 8.7 Implement expired market validation
    - Check if time remaining is negative
    - Return null/None for expired markets (no signal generation)
    - _Requirements: 3.9_
  
  - [ ]* 8.8 Write property test for expired market signal suppression
    - **Property 9: Expired Market Signal Suppression**
    - **Validates: Requirements 3.9**

- [x] 9. Checkpoint - Ensure probability engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Polymarket market discovery
  - [x] 10.1 Create Market type and zod schema
    - Define Market with conditionId, tokenIds, ICAO, threshold, observationEnd
    - Create MarketSchema for Gamma API response validation
    - _Requirements: 4.3, 14.3_
  
  - [x] 10.2 Implement market discovery from Gamma API
    - Query https://gamma-api.polymarket.com/markets?active=true
    - Parse response and validate with MarketSchema
    - _Requirements: 4.1_
  
  - [x] 10.3 Implement market filtering by ICAO
    - Filter markets by configured TARGET_ICAO codes
    - Validate settlement source matches ICAO station
    - _Requirements: 4.2, 4.6_
  
  - [ ]* 10.4 Write property test for market filtering
    - **Property 10: Market Filtering by ICAO**
    - **Validates: Requirements 4.2, 4.6**
  
  - [x] 10.5 Implement market data extraction
    - Extract condition_id, yes_token_id, no_token_id, ancillary_data
    - Parse observation end time from ancillary_data
    - _Requirements: 4.3, 4.4_

- [x] 11. Implement order executor (monitoring mode only)
  - [x] 11.1 Initialize ClobClient from @polymarket/clob-client
    - Set up L1/L2 authentication with private key
    - Use signature_type=2 for gas-free transactions
    - _Requirements: 5.1, 5.2_
  
  - [x] 11.2 Implement order book fetching
    - Fetch current order book via /book endpoint
    - Parse bids and asks
    - _Requirements: 5.4_
  
  - [x] 11.3 Implement limit order placement (monitoring mode)
    - Create placeLimitOrder function
    - When MONITORING_MODE=true, log order but don't execute
    - When MONITORING_MODE=false, execute via CLOB API
    - Verify order acceptance and log order ID
    - _Requirements: 5.3, 5.5, 12.1_
  
  - [ ]* 11.4 Write property test for limit order type enforcement
    - **Property 12: Limit Order Type Enforcement**
    - **Validates: Requirements 5.3**
  
  - [ ]* 11.5 Write property test for monitoring mode order suppression
    - **Property 27: Monitoring Mode Order Suppression**
    - **Validates: Requirements 12.1, 12.2**
  
  - [x] 11.6 Implement rate limiting for CLOB API
    - Track requests in 10-second sliding window
    - Limit: 3,500 POST requests per 10 seconds
    - Throttle when approaching limit (> 90%)
    - _Requirements: 9.2, 9.3_
  
  - [ ]* 11.7 Write property test for rate limit tracking
    - **Property 22: Rate Limit Tracking Accuracy**
    - **Validates: Requirements 9.2**
  
  - [ ]* 11.8 Write property test for rate limit throttling
    - **Property 23: Rate Limit Throttling**
    - **Validates: Requirements 9.3**

- [x] 12. Implement risk manager and kill-switch logic
  - [x] 12.1 Create KillSwitchStatus and KillSwitchReason types
    - Define types for macro loss, data quality, METAR unavailable
    - _Requirements: 7.1, 8.1_
  
  - [x] 12.2 Implement P&L tracking with rolling 24-hour window
    - Track all trades with timestamps
    - Calculate cumulative P&L over rolling window
    - _Requirements: 7.1_
  
  - [ ]* 12.3 Write property test for rolling P&L calculation
    - **Property 16: Rolling P&L Calculation**
    - **Validates: Requirements 7.1**
  
  - [x] 12.4 Implement macro kill-switch logic
    - Check if 24-hour loss > 20% of budget
    - Activate kill-switch and log reason
    - _Requirements: 7.2, 7.5_
  
  - [ ]* 12.5 Write property test for macro kill-switch activation
    - **Property 17: Macro Kill-Switch Activation**
    - **Validates: Requirements 7.2**
  
  - [x] 12.6 Implement data quality kill-switch logic
    - Compare METAR temp with NOAA temp (when available)
    - Activate if divergence > 5°F or METAR is null
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 12.7 Write property test for temperature divergence detection
    - **Property 19: Temperature Divergence Detection**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 12.8 Write property test for null data kill-switch
    - **Property 20: Null Data Kill-Switch**
    - **Validates: Requirements 8.3**
  
  - [x] 12.9 Implement kill-switch actions
    - Cancel all open orders when kill-switch activates
    - Prevent new order placement while active
    - _Requirements: 7.3, 7.4, 8.4_
  
  - [ ]* 12.10 Write property test for kill-switch trading prevention
    - **Property 18: Kill-Switch Trading Prevention**
    - **Validates: Requirements 7.3, 7.4**

- [x] 13. Checkpoint - Ensure risk management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement signal generation and trading logic
  - [x] 14.1 Implement EV threshold filtering
    - Compare EV against MIN_EV threshold (default 0.05)
    - Generate signal only if EV > threshold
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 14.2 Write property test for EV threshold filtering
    - **Property 13: EV Threshold Filtering**
    - **Validates: Requirements 6.1**
  
  - [x] 14.3 Implement position sizing calculation
    - Calculate position size based on EV and available capital
    - Ensure size is non-negative and doesn't exceed capital
    - _Requirements: 6.3_
  
  - [ ]* 14.4 Write property test for position sizing consistency
    - **Property 14: Position Sizing Consistency**
    - **Validates: Requirements 6.3**
  
  - [x] 14.5 Implement market prioritization by EV
    - Sort markets by EV descending
    - Process highest EV markets first
    - _Requirements: 6.4_
  
  - [ ]* 14.6 Write property test for market prioritization
    - **Property 15: Market Prioritization by EV**
    - **Validates: Requirements 6.4**

- [x] 15. Implement comprehensive logging system
  - [x] 15.1 Create logger utility with dual output
    - Write to console (stdout) and file (logs/)
    - Format: JSON with timestamp, level, component, event, data
    - _Requirements: 10.5_
  
  - [ ]* 15.2 Write property test for dual log destination
    - **Property 25: Dual Log Destination**
    - **Validates: Requirements 10.5**
  
  - [x] 15.3 Implement logging for all significant events
    - Log METAR fetches with timestamp, ICAO, temperature
    - Log probability calculations with inputs and outputs
    - Log order placements with market ID, side, price, size
    - Log kill-switch activations with reason and state
    - _Requirements: 6.5, 7.5, 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 15.4 Write property test for comprehensive logging
    - **Property 24: Comprehensive Logging**
    - **Validates: Requirements 6.5, 7.5, 10.1, 10.2, 10.3**

- [x] 16. Implement main controller and trading loop
  - [x] 16.1 Create main controller initialization
    - Validate configuration with zod
    - Initialize all components (METAR client, probability engine, order executor, risk manager)
    - Authenticate with Polymarket CLOB
    - Discover initial markets
    - _Requirements: 11.4_
  
  - [x] 16.2 Implement trading loop
    - Check kill-switch status before each cycle
    - Fetch METAR data for all stations in parallel
    - Discover active markets
    - Calculate EV for each market
    - Generate signals for markets with EV > threshold
    - Place orders (or log in monitoring mode)
    - Update P&L and risk metrics
    - Sleep for POLL_INTERVAL before next cycle
    - _Requirements: 1.2, 4.5, 6.1, 6.5, 12.1_
  
  - [x] 16.3 Implement graceful shutdown
    - Cancel all open orders
    - Log final P&L
    - Flush logs to disk
    - Close API connections
    - _Requirements: 7.3_

- [x] 17. Implement monitoring mode with Brier score calculation (CRITICAL)
  - [x] 17.1 Implement Brier score calculation
    - Calculate Brier score = (1/N) * Σ(prediction - outcome)²
    - Track all predictions and outcomes
    - _Requirements: 12.4_
  
  - [ ]* 17.2 Write property test for Brier score calculation
    - **Property 28: Brier Score Calculation**
    - **Validates: Requirements 12.4**
  
  - [x] 17.3 Implement prediction tracking in monitoring mode
    - Log all trading signals with predictions
    - Compare with actual market outcomes after settlement
    - Calculate rolling Brier score
    - _Requirements: 12.2, 12.3_
  
  - [x] 17.4 Add monitoring mode validation logic
    - Target: Brier score < 0.1 over 3-day period
    - Log daily Brier score summary
    - Alert if Brier score exceeds threshold
    - _Requirements: 12.3, 12.4_

- [x] 18. Create Docker configuration
  - [x] 18.1 Create Dockerfile
    - Base image: oven/bun:latest
    - Copy package files and install dependencies
    - Build TypeScript to dist/
    - Set CMD to run bot
    - _Requirements: 11.1_
  
  - [x] 18.2 Create docker-compose.yml
    - Define service with env_file and volume mounts
    - Mount logs/ directory for persistent logs
    - Configure restart policy and logging
    - _Requirements: 11.8_
  
  - [x] 18.3 Create .env.example file
    - Document all required environment variables
    - Provide example values (with placeholders for secrets)
    - _Requirements: 11.3_

- [x] 19. Final checkpoint - Integration testing
  - Run full trading loop in monitoring mode
  - Verify METAR fetching works for all stations
  - Verify timezone handling across different markets
  - Verify kill-switches activate correctly
  - Verify all logs are written to both console and file
  - Ensure all property tests pass (100 iterations each)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- CRITICAL priorities: Type safety (tasks 2-3), T-Group parsing accuracy (task 5), Monitoring mode validation (task 17)
- Target: Brier score < 0.1 over 3-day monitoring period before enabling live trading

## Implementation Warnings

**Task 7.2 - Ancillary Data Parsing Difficulty**:
Polymarket's Gamma API returns ancillary_data with non-standard text formats. Extracting the settlement time requires flexible regex patterns. Be prepared to handle various date/time formats and edge cases. Test with real API responses early.

**Task 8.2 - Sigma Function Tuning**:
The formula σ = base_σ * sqrt(hours_remaining / 24) is a good starting approximation, but temperature volatility differs between daytime (higher volatility) and nighttime (more stable). Start with this simple model and monitor Brier scores. If accuracy is poor, consider adding time-of-day adjustments.

**Task 11.6 - Rate Limit Critical**:
Polymarket's CLOB API enforces strict rate limits. The 10-second sliding window tracking is critical for bot survival. Implement this carefully with accurate timestamp tracking. Getting rate-limited can cause missed trading opportunities or API bans.

## Execution Guidance

1. Complete Tasks 1-4 (robust type system) first and report when tests pass
2. Tasks 5 (T-Group parsing) and 17 (Brier score validation) are mission-critical
3. If you encounter errors or library selection questions, use MCP Context7 to share context
4. Report progress at each checkpoint for validation
