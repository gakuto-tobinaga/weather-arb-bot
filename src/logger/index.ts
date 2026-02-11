/**
 * Logger Utility
 * 
 * Provides dual-output logging (console + file) with structured JSON format.
 * All significant system events are logged with timestamps and context.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry structure
 */
export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  component: string;
  event: string;
  data?: Record<string, unknown>;
};

/**
 * Logger configuration
 */
export type LoggerConfig = {
  logDir: string;
  logToConsole: boolean;
  logToFile: boolean;
  minLevel: LogLevel;
  logFilePath?: string;
};

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  logDir: './logs',
  logToConsole: true,
  logToFile: true,
  minLevel: 'info',
};

/**
 * Log level priorities for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger class with dual output (console + file)
 */
export class Logger {
  private config: LoggerConfig;
  private logFilePath: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Use custom log file path if provided, otherwise generate default
    if (config.logFilePath) {
      this.logFilePath = config.logFilePath;
      // Ensure directory exists for custom path
      const dir = this.logFilePath.substring(0, this.logFilePath.lastIndexOf('/'));
      if (dir && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } else {
      // Ensure log directory exists
      if (this.config.logToFile && !existsSync(this.config.logDir)) {
        mkdirSync(this.config.logDir, { recursive: true });
      }
      
      // Create log file path with date
      const date = new Date().toISOString().split('T')[0];
      this.logFilePath = join(this.config.logDir, `weather-arb-bot-${date}.log`);
    }
  }

  /**
   * Check if a log level should be logged based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Format log entry as JSON string
   */
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    
    switch (entry.level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    try {
      const formatted = this.formatLogEntry(entry) + '\n';
      appendFileSync(this.logFilePath, formatted, 'utf8');
    } catch (error) {
      // If file writing fails, at least log to console
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log a message with specified level
   */
  private log(
    level: LogLevel,
    component: string,
    event: string,
    data?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      event,
      data,
    };

    if (this.config.logToConsole) {
      this.writeToConsole(entry);
    }

    if (this.config.logToFile) {
      this.writeToFile(entry);
    }
  }

  /**
   * Log debug message
   */
  debug(component: string, event: string, data?: Record<string, unknown>): void {
    this.log('debug', component, event, data);
  }

  /**
   * Log info message
   */
  info(component: string, event: string, data?: Record<string, unknown>): void {
    this.log('info', component, event, data);
  }

  /**
   * Log warning message
   */
  warn(component: string, event: string, data?: Record<string, unknown>): void {
    this.log('warn', component, event, data);
  }

  /**
   * Log error message
   */
  error(component: string, event: string, data?: Record<string, unknown>): void {
    this.log('error', component, event, data);
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize global logger
 */
export function initLogger(config: Partial<LoggerConfig> = {}): Logger {
  globalLogger = new Logger(config);
  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

// Export logging event helpers
export {
  logMETARFetch,
  logProbabilityCalculation,
  logOrderPlacement,
  logKillSwitchActivation,
  logKillSwitchDeactivation,
  logTradingSignal,
  logMarketDiscovery,
  logPnLUpdate,
  logSystemInitialization,
  logSystemShutdown,
} from './events';
