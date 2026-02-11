# Weather-Arb-Bot

Automated arbitrage trading system for Polymarket weather prediction markets. Exploits information asymmetry between high-precision METAR aviation weather data and market prices.

## Features

- **High-Precision Temperature Data**: Leverages METAR T-Group data with 0.1°C precision
- **Real-Time Arbitrage**: Accesses METAR data 1-5 minutes after observation vs 60-180 minutes for standard APIs
- **Timezone-Aware**: Correctly handles observation end times across different timezones (ET, CT, GMT)
- **Probability Modeling**: Uses normal distribution CDF with city-specific volatility parameters
- **Type-Safe**: Strict TypeScript with branded types for temperatures and timestamps
- **Risk Management**: Built-in kill-switches for macro losses and data quality issues
- **Monitoring Mode**: Validate predictions before live trading (target: Brier score < 0.1)

## Technology Stack

- **Runtime**: Bun (high-performance JavaScript runtime)
- **Language**: TypeScript (strict type safety)
- **Blockchain**: ethers v6 (Polygon network)
- **Validation**: zod (schema validation)
- **Statistics**: @stdlib/stats-base-dists-normal-cdf (probability calculations)
- **Time Handling**: date-fns-tz (timezone-aware parsing)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3.8 or later
- Polymarket account with API credentials
- Polygon RPC endpoint (e.g., Infura, Alchemy, or public RPC)
- USDC on Polygon network for trading

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd weather-arb-bot

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# IMPORTANT: Set MONITORING_MODE=true for initial testing
nano .env
```

### Configuration

Edit `.env` with your settings:

```bash
# Polymarket Authentication
POLYMARKET_PK=your_private_key_here
POLYMARKET_FUNDER=0xYourEthereumAddress
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com

# Trading Configuration
TARGET_ICAO=KLGA,KORD,EGLC  # NYC, Chicago, London
MIN_EV=0.05                  # 5% minimum edge
BUDGET=20                    # Start small!
POLL_INTERVAL=300000         # 5 minutes

# Mode
MONITORING_MODE=true         # ALWAYS start with true!
```

### Running the Bot

#### Development Mode

```bash
# Run with Bun
bun run src/index.ts

# Run tests
bun test

# Run specific test file
bun test tests/probability-calculator.test.ts
```

#### Production Mode (Docker)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Monitoring Mode

**CRITICAL**: Always start with `MONITORING_MODE=true`!

In monitoring mode, the bot:
- Fetches METAR data and discovers markets
- Calculates probabilities and expected values
- Logs all trading signals (but does NOT place orders)
- Tracks prediction accuracy with Brier score

**Validation Criteria**:
- Run for at least 3 days in monitoring mode
- Achieve Brier score < 0.1 (lower is better)
- Review logs to ensure signals are reasonable

Only switch to `MONITORING_MODE=false` after successful validation.

## Architecture

### Core Components

1. **METAR Client** (`src/metar/`): Fetches and parses aviation weather data
   - Custom T-Group parsing (0.1°C precision)
   - Parallel station fetching
   - Exponential backoff retry logic

2. **Probability Engine** (`src/probability/`): Calculates threshold crossing probabilities
   - City-specific volatility parameters (σ)
   - Time-adjusted standard deviation
   - Normal distribution CDF calculations
   - Expected value (EV) computation

3. **Market Discovery** (`src/market/`): Finds and filters Polymarket markets
   - Gamma API integration
   - ICAO code filtering
   - Ancillary data parsing

4. **Timezone Handling** (`src/timezone/`): Manages observation end times
   - ICAO → timezone mapping
   - Local time → UTC conversion
   - DST-aware calculations

5. **Logger** (`src/logger/`): Dual-output logging system
   - Console + file output
   - Structured JSON format
   - Configurable log levels

### Type System

The bot uses branded types for type safety:

```typescript
// Temperature with 0.1°C precision
type PrecisionTemperature = number & { __brand: 'PrecisionTemperature' }

// Timezone-aware timestamp
type Timestamp = {
  utc: Date;
  timezone: string;
}

// Duration for time calculations
type Duration = {
  milliseconds: number;
  hours: number;
  isNegative(): boolean;
}
```

## Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific test suite
bun test tests/tgroup-parser.test.ts
```

Test categories:
- Unit tests: Specific examples and edge cases
- Property-based tests: Universal properties across all inputs
- Integration tests: End-to-end workflows

## Risk Management

### Kill-Switches

1. **Macro Kill-Switch**: Activates when 24-hour loss > 20% of budget
2. **Data Quality Kill-Switch**: Activates when:
   - METAR temperature diverges > 5°F from NOAA
   - METAR returns null/N/A values

When activated, kill-switches:
- Cancel all open orders
- Prevent new order placement
- Log activation reason

### Position Sizing

- Calculated based on EV and available capital
- Never exceeds configured budget
- Prioritizes highest EV opportunities

## Supported Markets

Currently supports weather markets for:
- **KLGA** (LaGuardia Airport, NYC) - Eastern Time
- **KORD** (O'Hare Airport, Chicago) - Central Time
- **EGLC** (London City Airport) - Greenwich Mean Time

Each station has city-specific volatility parameters:
- KLGA: σ = 3.5°C (moderate volatility)
- KORD: σ = 4.2°C (higher volatility, continental climate)
- EGLC: σ = 2.8°C (lower volatility, maritime climate)

## Logs

Logs are written to:
- Console (stdout/stderr)
- File: `./logs/weather-arb-bot-YYYY-MM-DD.log`

Log format (JSON):
```json
{
  "timestamp": "2024-01-15T12:34:56.789Z",
  "level": "info",
  "component": "METAR_Client",
  "event": "fetch_complete",
  "data": {
    "icao": "KLGA",
    "temperature": 20.5,
    "tgroup": "T00205"
  }
}
```

## Troubleshooting

### Common Issues

**"Invalid POLYMARKET_PK format"**
- Ensure private key is 64 hex characters (no 0x prefix)
- Check for extra spaces or quotes

**"Could not find observation end time"**
- Market may have non-standard ancillary data format
- Check logs for raw ancillary_data content

**"METAR fetch failed"**
- aviationweather.gov may be temporarily unavailable
- Bot will retry with exponential backoff

**"Rate limit exceeded"**
- Reduce POLL_INTERVAL
- Bot automatically throttles requests

## Security

- Never commit `.env` file to version control
- Use environment variables for all secrets
- Run with minimal permissions (non-root user in Docker)
- Start with small budget ($20-100) for testing
- Always validate in monitoring mode first

## Performance

Expected latency:
- METAR fetch to order submission: < 5 seconds
- Probability calculation: < 100 milliseconds
- Order submission: < 1 second

Target uptime: 99% during market active hours

## License

[Your License Here]

## Disclaimer

This software is for educational purposes only. Trading involves risk of loss. Use at your own risk. The authors are not responsible for any financial losses incurred through use of this software.

## Support

For issues or questions:
- Check logs in `./logs/`
- Review test output: `bun test`
- Ensure all environment variables are set correctly
