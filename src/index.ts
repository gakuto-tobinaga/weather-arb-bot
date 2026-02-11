/**
 * Weather-Arb-Bot - Main Entry Point
 * 
 * Automated arbitrage trading system for Polymarket weather prediction markets.
 * Exploits information asymmetry using real-time METAR aviation weather data.
 * 
 * Requirements: 11.4, 1.2, 4.5, 6.1, 6.5, 12.1
 */

import { loadConfig } from './config';
import type { Config } from './config';
import { initLogger, logSystemInitialization } from './logger';
import { OrderExecutor } from './order/client';
import { RiskManager } from './risk/manager';
import { SignalGenerator } from './signal/generator';
import { PredictionTracker } from './monitoring/tracker';

/**
 * Main Controller
 * 
 * Orchestrates the trading loop and coordinates all components.
 */
class MainController {
  private config: Config;
  private orderExecutor: OrderExecutor;
  private riskManager: RiskManager;
  private signalGenerator: SignalGenerator;
  private predictionTracker: PredictionTracker | null = null;
  private isRunning: boolean = false;
  private lastDailySummaryDate: string | null = null;

  constructor() {
    // Load and validate configuration
    this.config = loadConfig();

    // Initialize logger
    // Use 'warn' level in production to reduce log volume
    const logLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'info';
    initLogger({
      minLevel: logLevel,
      logToFile: true,
      logToConsole: true,
    });

    // Log system initialization
    logSystemInitialization(
      this.config.MONITORING_MODE,
      this.config.BUDGET,
      this.config.MIN_EV
    );

    // Initialize components
    this.orderExecutor = new OrderExecutor(this.config);
    this.riskManager = new RiskManager(this.config);
    this.signalGenerator = new SignalGenerator(this.config);

    // Initialize prediction tracker in monitoring mode
    if (this.config.MONITORING_MODE) {
      this.predictionTracker = new PredictionTracker('./logs');
      console.log('✓ Prediction tracker initialized');
    }

    console.log('✓ Configuration validated');
    console.log('✓ Components initialized');
    console.log(`✓ Monitoring mode: ${this.config.MONITORING_MODE ? 'ENABLED' : 'DISABLED'}`);
    console.log(`✓ Target stations: ${this.config.TARGET_ICAO.join(', ')}`);
    console.log(`✓ Budget: $${this.config.BUDGET}`);
    console.log(`✓ Min EV threshold: ${this.config.MIN_EV}`);
  }

  /**
   * Initialize the system
   * 
   * Authenticates with Polymarket CLOB and performs initial setup.
   */
  async initialize(): Promise<void> {
    console.log('\nInitializing system...');

    // Initialize order executor (authenticate with CLOB)
    if (!this.config.MONITORING_MODE) {
      await this.orderExecutor.initialize();
      console.log('✓ Authenticated with Polymarket CLOB');
    } else {
      console.log('✓ Monitoring mode - skipping CLOB authentication');
    }

    console.log('✓ System initialization complete\n');
  }

  /**
   * Start the trading loop
   * 
   * Requirement 1.2: Fetch METAR data for all stations in parallel
   * Requirement 4.5: Discover active markets
   * Requirement 6.1: Generate signals for markets with EV > threshold
   * Requirement 6.5: Log signal generation
   * Requirement 12.1: Check kill-switch status before each cycle
   */
  async start(): Promise<void> {
    this.isRunning = true;
    console.log('Starting trading loop...\n');

    while (this.isRunning) {
      try {
        await this.runTradingCycle();
        
        // Sleep for configured interval before next cycle
        await this.sleep(this.config.POLL_INTERVAL);
      } catch (error) {
        console.error('Error in trading cycle:', error);
        // Continue running despite errors
        await this.sleep(60000); // Wait 1 minute before retrying
      }
    }
  }

  /**
   * Run a single trading cycle
   */
  private async runTradingCycle(): Promise<void> {
    const { fetchAllStations } = await import('./metar/client');
    const { discoverMarketsForStations } = await import('./market/discovery');
    const { extractMultipleMarkets } = await import('./market/extractor');
    const { Timestamp } = await import('./types/timestamp');
    const { logTradingSignal, logPnLUpdate } = await import('./logger');

    // 1. Check kill-switch status
    if (this.riskManager.isKillSwitchActive()) {
      const status = this.riskManager.getKillSwitchStatus();
      console.log(`[Kill-Switch Active] ${status.reason?.type}: ${status.reason?.message}`);
      return;
    }

    // 2. Fetch METAR data for all stations in parallel
    console.log(`[${new Date().toISOString()}] Fetching METAR data...`);
    const metarResults = await fetchAllStations(this.config.TARGET_ICAO);
    
    // Log METAR fetch results
    for (const [icao, result] of metarResults.entries()) {
      if (result.success) {
        console.log(`  ✓ ${icao}: ${result.value.temperature}°C`);
      } else {
        const errorMsg = result.error.type === 'not_found' 
          ? `Not found for ${result.error.icaoCode}`
          : result.error.message;
        console.log(`  ✗ ${icao}: ${errorMsg}`);
      }
    }

    // 3. Discover active markets
    console.log('Discovering active markets...');
    const discoveryResult = await discoverMarketsForStations(this.config.TARGET_ICAO);
    
    if (!discoveryResult.success) {
      console.log(`  Failed to discover markets: ${discoveryResult.error}\n`);
      return;
    }
    
    const markets = extractMultipleMarkets(discoveryResult.markets);
    console.log(`  Found ${markets.length} relevant markets`);

    if (markets.length === 0) {
      console.log('No markets to process\n');
      return;
    }

    // 4. Generate signals for each market
    const now = Timestamp.now();
    let signalsGenerated = 0;

    for (const market of markets) {
      const metarResult = metarResults.get(market.icaoCode);
      
      if (!metarResult?.success) {
        console.log(`  Skipping ${market.conditionId}: No METAR data for ${market.icaoCode}`);
        continue;
      }

      const currentTemp = metarResult.value.temperature;

      // Generate signal
      const signal = this.signalGenerator.generateSignal(
        {
          marketId: market.conditionId,
          tokenId: market.yesTokenId,
          icaoCode: market.icaoCode,
          threshold: market.threshold,
          observationEnd: market.observationEnd,
          marketPrice: 0.5, // TODO: Fetch actual market price from order book
        },
        currentTemp,
        now
      );

      if (signal) {
        signalsGenerated++;
        
        // Log signal
        logTradingSignal(
          signal.marketId,
          signal.action,
          signal.ev,
          signal.calculatedProbability,
          signal.marketPrice
        );

        console.log(`  Signal: ${signal.action} ${market.icaoCode} @ ${signal.recommendedPrice.toFixed(4)} (EV: ${signal.ev.toFixed(4)})`);

        // Track prediction in monitoring mode
        // Requirement 12.2: Log all trading signals with predictions
        if (this.config.MONITORING_MODE && this.predictionTracker) {
          const predictionId = `${signal.marketId}-${now.utc.getTime()}`;
          this.predictionTracker.addPrediction({
            predictionId,
            marketId: signal.marketId,
            probability: signal.calculatedProbability,
            timestamp: now,
            outcome: null, // Will be updated after market settles
            settled: false,
          });
        }

        // Place order if action is BUY
        if (signal.action === 'BUY') {
          try {
            await this.orderExecutor.placeLimitOrder(
              signal.tokenId,
              'BUY',
              signal.recommendedPrice,
              signal.recommendedSize
            );
          } catch (error) {
            console.error(`  Failed to place order: ${error}`);
          }
        }
      }
    }

    console.log(`Generated ${signalsGenerated} trading signals`);

    // 5. Update P&L and check kill-switches
    const pnl = this.riskManager.getRollingPnL(now);
    logPnLUpdate(pnl.realized, pnl.unrealized, pnl.total);
    
    // Check macro kill-switch
    const macroStatus = this.riskManager.checkMacroKillSwitch(now);
    if (macroStatus.active && macroStatus.reason) {
      this.riskManager.activateKillSwitch(macroStatus.reason, now);
      console.error(`\n⚠️  MACRO KILL-SWITCH ACTIVATED: ${macroStatus.reason.message}\n`);
    }

    // Check data quality kill-switch for each station
    for (const [icao, result] of metarResults.entries()) {
      const metarTemp = result.success ? result.value.temperature : null;
      const dataQualityStatus = this.riskManager.checkDataQualityKillSwitch(
        metarTemp,
        null, // NOAA temp not implemented yet
        icao,
        now
      );
      
      if (dataQualityStatus.active && dataQualityStatus.reason) {
        this.riskManager.activateKillSwitch(dataQualityStatus.reason, now);
        console.error(`\n⚠️  DATA QUALITY KILL-SWITCH ACTIVATED: ${dataQualityStatus.reason.message}\n`);
        break;
      }
    }

    // Log Brier score in monitoring mode
    // Requirement 12.3: Calculate rolling Brier score
    if (this.config.MONITORING_MODE && this.predictionTracker) {
      const brierResult = this.predictionTracker.calculateBrierScore();
      if (brierResult.count > 0) {
        console.log(`\n[Brier Score] Score: ${brierResult.score.toFixed(4)} (${brierResult.count} predictions)`);
        
        // Check 3-day target
        const meetsTarget = this.predictionTracker.meetsTarget(3, 0.1);
        if (meetsTarget) {
          console.log('[Brier Score] ✓ Meets 3-day target (< 0.1)');
        } else if (brierResult.count >= 10) {
          console.log('[Brier Score] ⚠️  Does not meet 3-day target (< 0.1)');
        }
      }

      // Log daily summary once per day
      // Requirement 12.3: Log daily Brier score summary
      const currentDate = new Date().toISOString().split('T')[0] ?? '';
      if (this.lastDailySummaryDate !== currentDate) {
        this.logDailyBrierScoreSummary();
        this.lastDailySummaryDate = currentDate;
      }
    }

    console.log(''); // Empty line for readability
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log daily Brier score summary
   * 
   * Requirement 12.3: Log daily Brier score summary
   * Requirement 12.4: Alert if Brier score exceeds threshold
   */
  private logDailyBrierScoreSummary(): void {
    if (!this.config.MONITORING_MODE || !this.predictionTracker) {
      return;
    }

    const today = new Date();
    const dailyResult = this.predictionTracker.getDailyBrierScore(today);
    
    if (dailyResult.count === 0) {
      return; // No predictions today
    }

    const { getBrierScoreRating } = require('./monitoring/brier');
    const rating = getBrierScoreRating(dailyResult.score);
    
    console.log('\n=== Daily Brier Score Summary ===');
    console.log(`Date: ${today.toISOString().split('T')[0]}`);
    console.log(`Predictions: ${dailyResult.count}`);
    console.log(`Brier Score: ${dailyResult.score.toFixed(4)} (${rating})`);
    
    // Check 3-day target
    const meetsTarget = this.predictionTracker.meetsTarget(3, 0.1);
    const stats = this.predictionTracker.getStatistics();
    
    console.log(`\n3-Day Rolling Score: ${stats.brierScore.toFixed(4)} (${stats.rating})`);
    console.log(`Total Predictions: ${stats.total} (${stats.settled} settled, ${stats.unsettled} pending)`);
    
    if (meetsTarget) {
      console.log('✓ Meets 3-day target (< 0.1) - Ready for live trading');
    } else if (stats.settled >= 10) {
      console.log('⚠️  Does not meet 3-day target (< 0.1) - Continue monitoring');
    } else {
      console.log('ℹ️  Insufficient data for 3-day validation (need 10+ settled predictions)');
    }
    
    // Alert if score exceeds threshold
    if (dailyResult.score > 0.15 && dailyResult.count >= 5) {
      console.error('\n🚨 ALERT: Daily Brier score exceeds 0.15 - Model accuracy may be poor!');
      console.error('   Consider reviewing probability calculations and sigma parameters.');
    }
    
    console.log('================================\n');
  }

  /**
   * Stop the trading loop
   * 
   * Requirement 7.3: Cancel all open orders
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('\nStopping trading loop...');

    const { logSystemShutdown, logPnLUpdate } = await import('./logger');
    const { Timestamp } = await import('./types/timestamp');

    try {
      // Cancel all open orders
      if (!this.config.MONITORING_MODE) {
        console.log('Cancelling all open orders...');
        await this.orderExecutor.cancelAllOrders();
        console.log('✓ All orders cancelled');
      }

      // Log final P&L
      const now = Timestamp.now();
      const finalPnL = this.riskManager.getRollingPnL(now);
      console.log(`\nFinal P&L:`);
      console.log(`  Realized: $${finalPnL.realized.toFixed(2)}`);
      console.log(`  Unrealized: $${finalPnL.unrealized.toFixed(2)}`);
      console.log(`  Total: $${finalPnL.total.toFixed(2)}`);
      
      logPnLUpdate(finalPnL.realized, finalPnL.unrealized, finalPnL.total);

      // Log system shutdown
      logSystemShutdown();
      console.log('✓ System shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log('Weather-Arb-Bot initializing...\n');

  const controller = new MainController();
  
  // Handle graceful shutdown on SIGINT (Ctrl+C) and SIGTERM
  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT signal...');
    await controller.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived SIGTERM signal...');
    await controller.stop();
    process.exit(0);
  });

  try {
    await controller.initialize();
    await controller.start();
  } catch (error) {
    console.error('Fatal error:', error);
    await controller.stop();
    process.exit(1);
  }
}

// Run the bot
main();
