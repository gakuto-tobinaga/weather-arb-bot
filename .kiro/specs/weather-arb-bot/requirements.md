# Requirements Document: Weather-Arb-Bot

## Introduction

Weather-Arb-Bot is an automated arbitrage trading system for Polymarket weather prediction markets. The system exploits the information gap between high-precision METAR aviation weather data and market prices by leveraging real-time temperature observations with 0.1°C precision, probability density function modeling, and low-latency execution through the Polymarket CLOB API.

The bot targets weather markets for major cities (New York, Chicago, London) where temperature thresholds determine market outcomes. By accessing METAR data 1-5 minutes after observation versus 60-180 minutes for standard APIs, the system gains a critical timing advantage for identifying arbitrage opportunities.

The system is implemented using Bun runtime with TypeScript for maximum execution speed and type safety. The technology stack includes:
- Runtime: Bun (high-performance JavaScript runtime)
- Language: TypeScript (strict type safety)
- Polymarket SDK: @polymarket/clob-client (official SDK)
- Wallet/Crypto: ethers v6 (blockchain interactions)
- Validation: zod (schema validation for environment variables and API responses)
- Statistics: @stdlib/stats-base-dists-normal-cdf (Gaussian CDF calculations)

## Glossary

- **METAR**: Meteorological Aerodrome Report - aviation weather observation format providing real-time temperature data
- **T-Group**: Precision temperature field in METAR Remark section encoding temperature to 0.1°C accuracy
- **CLOB**: Central Limit Order Book - Polymarket's off-chain order matching system
- **UMA_Oracle**: Universal Market Access optimistic oracle used for Polymarket market settlement
- **ICAO_Code**: International Civil Aviation Organization airport identifier (e.g., KLGA, KORD, EGLC)
- **EV**: Expected Value - calculated probability minus market price
- **Polymarket_Bot**: The automated trading system being specified (Bun + TypeScript implementation)
- **METAR_Client**: Component responsible for fetching and parsing METAR data
- **Probability_Engine**: Component calculating temperature threshold crossing probabilities using normal distribution CDF
- **Risk_Manager**: Component monitoring system health and enforcing kill-switch conditions
- **Order_Executor**: Component managing Polymarket CLOB API interactions and order execution using @polymarket/clob-client
- **Ancillary_Data**: Market-specific metadata defining settlement rules, observation times, and data sources

## Requirements

### Requirement 1: METAR Data Acquisition

**User Story:** As a trading bot, I want to fetch real-time METAR weather data from aviationweather.gov, so that I can access temperature observations with minimal latency.

#### Acceptance Criteria

1. WHEN the system starts, THE METAR_Client SHALL establish connection to aviationweather.gov JSON endpoint
2. THE METAR_Client SHALL fetch METAR data for configured ICAO stations (KLGA, KORD, EGLC) every 1-5 minutes
3. WHEN METAR data is unavailable or returns error, THE METAR_Client SHALL log the failure and retry with exponential backoff
4. THE METAR_Client SHALL parse the raw METAR observation and extract the Remark section
5. WHEN multiple observation stations are configured, THE METAR_Client SHALL fetch data for all stations in parallel

### Requirement 2: T-Group Temperature Parsing

**User Story:** As a trading bot, I want to extract precise temperature values from METAR T-Group data, so that I can detect 0.1°C temperature changes before they appear in standard weather APIs.

#### Acceptance Criteria

1. WHEN a METAR Remark contains a T-Group field (format: T[sign][temp][sign][dewpoint]), THE METAR_Client SHALL extract the temperature value using custom parsing logic
2. THE METAR_Client SHALL NOT rely on existing METAR libraries for T-Group parsing, as most libraries ignore the Remarks section
3. THE METAR_Client SHALL implement regex-based or manual parsing to extract T-Group from the raw METAR string
4. THE METAR_Client SHALL decode the sign indicator (0 for positive, 1 for negative)
5. THE METAR_Client SHALL convert the 3-digit temperature code to decimal degrees Celsius (e.g., 172 → 17.2°C)
6. WHEN T-Group data is missing or malformed, THE METAR_Client SHALL return None and log a warning
7. THE METAR_Client SHALL convert Celsius temperatures to Fahrenheit when required by market settlement rules

### Requirement 3: Probability Calculation Engine (CRITICAL PRIORITY)

**User Story:** As a trading bot, I want to calculate the probability of temperature thresholds being crossed, so that I can identify arbitrage opportunities against market prices.

**Priority:** CRITICAL - Incorrect timezone handling or time-remaining calculations lead to mispriced probabilities and false arbitrage signals.

#### Acceptance Criteria

1. WHEN current temperature and threshold are provided, THE Probability_Engine SHALL calculate P(T_max > X) using normal distribution CDF
2. THE Probability_Engine SHALL use a statistical library (e.g., @stdlib/stats-base-dists-normal-cdf) for probability calculations
3. THE Probability_Engine SHALL retrieve market-specific observation end time from Ancillary_Data via Gamma API for each market
4. **[CRITICAL]** THE Probability_Engine SHALL parse observation end time in the market's local timezone (e.g., ET for KLGA/KORD, GMT for EGLC) and convert to UTC for calculations
5. **[CRITICAL]** THE Probability_Engine SHALL dynamically calculate time remaining until observation end for each market independently, accounting for timezone differences
6. THE Probability_Engine SHALL adjust standard deviation (σ) based on time remaining until market-specific observation end
7. WHEN observation end time approaches, THE Probability_Engine SHALL decrease σ to reflect reduced uncertainty
8. THE Probability_Engine SHALL calculate Expected Value as EV = P(calculated) - P(market_price)
9. **[CRITICAL]** THE Probability_Engine SHALL validate that calculated time remaining is positive; negative values indicate expired markets and SHALL NOT generate trading signals

### Requirement 4: Polymarket Market Discovery

**User Story:** As a trading bot, I want to automatically discover relevant weather markets on Polymarket, so that I can monitor and trade appropriate temperature threshold markets.

#### Acceptance Criteria

1. WHEN the system starts, THE Order_Executor SHALL query Polymarket Gamma API for active weather markets
2. THE Order_Executor SHALL filter markets by configured ICAO station codes
3. THE Order_Executor SHALL extract market condition_id, yes_token_id, no_token_id, and Ancillary_Data for each relevant market
4. THE Order_Executor SHALL parse Ancillary_Data to determine observation end time and settlement rules for each market
5. WHEN market data changes, THE Order_Executor SHALL refresh market information every 60 seconds
6. THE Order_Executor SHALL validate that market settlement source matches configured ICAO station

### Requirement 5: CLOB Authentication and Order Execution

**User Story:** As a trading bot, I want to authenticate with Polymarket CLOB API and execute limit orders, so that I can trade on identified arbitrage opportunities with minimal slippage.

#### Acceptance Criteria

1. WHEN the system initializes, THE Order_Executor SHALL perform L1/L2 authentication using provided private key
2. THE Order_Executor SHALL use signature_type=2 (Gnosis Safe/Proxy) for gas-free transactions
3. WHEN placing orders, THE Order_Executor SHALL use limit orders exclusively (no market orders)
4. THE Order_Executor SHALL fetch current order book via CLOB API /book endpoint before placing orders
5. WHEN an order is placed, THE Order_Executor SHALL verify order acceptance and log order ID

### Requirement 6: Arbitrage Signal Generation

**User Story:** As a trading bot, I want to generate trading signals when Expected Value exceeds minimum thresholds, so that I only trade when profit potential justifies execution risk.

#### Acceptance Criteria

1. WHEN EV is calculated, THE Polymarket_Bot SHALL compare EV against minimum threshold (0.05 USDC)
2. THE Polymarket_Bot SHALL only generate buy signals when EV > minimum threshold
3. THE Polymarket_Bot SHALL calculate optimal position size based on EV and available capital
4. WHEN multiple markets have positive EV, THE Polymarket_Bot SHALL prioritize markets with highest EV
5. THE Polymarket_Bot SHALL log all signal generation decisions with timestamp, market, EV, and action

### Requirement 7: Macro Kill-Switch (Budget Protection)

**User Story:** As a risk manager, I want the system to stop trading when losses exceed acceptable limits, so that I can protect capital from catastrophic drawdown.

#### Acceptance Criteria

1. THE Risk_Manager SHALL track cumulative profit/loss over rolling 24-hour window
2. WHEN 24-hour loss exceeds 20% of configured budget, THE Risk_Manager SHALL trigger macro kill-switch
3. WHEN macro kill-switch activates, THE Risk_Manager SHALL cancel all open orders
4. WHEN macro kill-switch activates, THE Risk_Manager SHALL prevent new order placement
5. THE Risk_Manager SHALL log kill-switch activation with reason and loss amount

### Requirement 8: Data Quality Kill-Switch

**User Story:** As a risk manager, I want the system to stop trading when data quality degrades, so that I avoid trading on unreliable information.

#### Acceptance Criteria

1. THE Risk_Manager SHALL compare METAR temperature with NOAA API temperature when both available
2. WHEN temperature divergence exceeds 5°F between sources, THE Risk_Manager SHALL trigger data kill-switch
3. WHEN METAR returns N/A or null values, THE Risk_Manager SHALL trigger data kill-switch
4. WHEN data kill-switch activates, THE Risk_Manager SHALL cancel all open orders and pause trading
5. THE Risk_Manager SHALL attempt data source recovery every 5 minutes and resume if quality restored

### Requirement 9: API Rate Limit Management

**User Story:** As a system operator, I want the bot to handle API rate limits gracefully, so that the system remains operational without being blocked by API providers.

#### Acceptance Criteria

1. WHEN Polymarket API returns 429 (rate limit) error, THE Order_Executor SHALL implement exponential backoff
2. THE Order_Executor SHALL track request counts per 10-second window (limit: 3,500 for POST /order)
3. WHEN approaching rate limits, THE Order_Executor SHALL throttle request frequency
4. THE Order_Executor SHALL log all rate limit encounters with timestamp and endpoint
5. WHEN aviationweather.gov returns errors, THE METAR_Client SHALL implement exponential backoff starting at 5 seconds

### Requirement 10: Monitoring and Logging

**User Story:** As a system operator, I want comprehensive logging of all system activities, so that I can debug issues and analyze performance.

#### Acceptance Criteria

1. THE Polymarket_Bot SHALL log all METAR data fetches with timestamp, ICAO code, and parsed temperature
2. THE Polymarket_Bot SHALL log all probability calculations with inputs (T_current, threshold, σ) and outputs (P, EV)
3. THE Polymarket_Bot SHALL log all order placements with market ID, side, price, size, and order ID
4. THE Polymarket_Bot SHALL log all kill-switch activations with trigger reason and system state
5. THE Polymarket_Bot SHALL write logs to both console (stdout) and persistent file storage

### Requirement 11: Docker Containerization

**User Story:** As a deployment engineer, I want the bot packaged as a Docker container, so that I can deploy consistently across local and cloud environments.

#### Acceptance Criteria

1. THE Polymarket_Bot SHALL run in a Docker container based on oven/bun:latest image
2. THE Polymarket_Bot SHALL read configuration from environment variables (.env file)
3. THE Polymarket_Bot SHALL expose required environment variables: POLYMARKET_PK, POLYMARKET_FUNDER, POLYGON_RPC_URL, TARGET_ICAO
4. WHEN container starts, THE Polymarket_Bot SHALL validate all required environment variables using zod schema validation
5. WHEN environment variable validation fails, THE Polymarket_Bot SHALL immediately exit with descriptive error message
6. THE Polymarket_Bot SHALL validate POLYMARKET_PK format (64-character hex string)
7. THE Polymarket_Bot SHALL validate POLYGON_RPC_URL format (valid HTTP/HTTPS URL)
8. THE Polymarket_Bot SHALL include docker-compose.yml for multi-container orchestration

### Requirement 12: Initial Monitoring Mode

**User Story:** As a developer, I want to run the bot in monitoring-only mode initially, so that I can validate probability calculations without risking capital.

#### Acceptance Criteria

1. WHEN MONITORING_MODE environment variable is true, THE Polymarket_Bot SHALL fetch data and calculate EV but not place orders
2. THE Polymarket_Bot SHALL log all trading signals that would have been executed in monitoring mode
3. THE Polymarket_Bot SHALL compare calculated probabilities with actual market outcomes after settlement
4. THE Polymarket_Bot SHALL calculate Brier score to measure prediction accuracy
5. WHEN MONITORING_MODE is false, THE Polymarket_Bot SHALL execute actual trades

### Requirement 13: Performance Requirements

**User Story:** As a trading bot operator, I want the system to execute with low latency, so that I can capitalize on information advantages before they disappear.

#### Acceptance Criteria

1. THE Polymarket_Bot SHALL complete METAR fetch to order submission within 5 seconds for each trading cycle
2. THE Probability_Engine SHALL calculate probabilities in under 100 milliseconds
3. THE Order_Executor SHALL submit orders to CLOB API within 1 second of signal generation
4. THE Polymarket_Bot SHALL maintain 99% uptime during each market's active trading hours (determined dynamically from Ancillary_Data observation windows)
5. THE Polymarket_Bot SHALL process updates for all configured markets within 10 seconds per cycle

### Requirement 14: Type Safety and Validation (CRITICAL PRIORITY)

**User Story:** As a developer, I want strict TypeScript types for all data structures, so that I can prevent runtime errors and ensure data integrity.

**Priority:** CRITICAL - Type errors in temperature calculations or timezone handling can cause incorrect probability estimates and false trading signals.

#### Acceptance Criteria

1. THE Polymarket_Bot SHALL define TypeScript interfaces for all data structures (METAR observations, market data, orders)
2. THE Polymarket_Bot SHALL use zod schema validation for environment variables at startup
3. THE Polymarket_Bot SHALL use zod schema validation for all external API responses (aviationweather.gov, Polymarket Gamma API, CLOB API)
4. **[CRITICAL]** THE Polymarket_Bot SHALL define a PrecisionTemperature type (branded type or class) to represent 0.1°C precision temperature values and prevent mixing with regular numbers
5. **[CRITICAL]** THE Polymarket_Bot SHALL define a Timestamp type (branded type or class) with explicit timezone information to prevent timezone confusion
6. **[CRITICAL]** THE Polymarket_Bot SHALL define custom types for T-Group parsing results (TGroupResult) to prevent type degradation during calculations
7. **[CRITICAL]** THE Polymarket_Bot SHALL enforce that all temperature calculations use PrecisionTemperature type, not raw numbers
8. **[CRITICAL]** THE Polymarket_Bot SHALL enforce that all time calculations use Timestamp type with explicit timezone, not raw Date objects
9. THE Polymarket_Bot SHALL validate all numeric calculations use appropriate precision types
10. WHEN type validation fails, THE Polymarket_Bot SHALL log the error and reject the invalid data
11. THE Polymarket_Bot SHALL use ethers v6 for all blockchain interactions and wallet management
