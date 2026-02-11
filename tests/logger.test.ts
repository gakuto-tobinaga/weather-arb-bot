/**
 * Unit tests for logger utility
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Logger, initLogger, getLogger } from '../src/logger';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Logger', () => {
  const testLogDir = './test-logs';
  
  beforeEach(() => {
    // Clean up test log directory
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testLogDir)) {
      rmSync(testLogDir, { recursive: true, force: true });
    }
  });

  describe('Logger initialization', () => {
    test('should create log directory if it does not exist', () => {
      new Logger({ logDir: testLogDir });
      
      expect(existsSync(testLogDir)).toBe(true);
    });

    test('should not throw if log directory already exists', () => {
      mkdirSync(testLogDir, { recursive: true });
      
      expect(() => new Logger({ logDir: testLogDir })).not.toThrow();
    });

    test('should use default configuration when not provided', () => {
      const logger = new Logger();
      
      // Should not throw
      logger.info('test', 'test event');
    });
  });

  describe('Log level filtering', () => {
    test('should log messages at or above minimum level', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
        minLevel: 'warn',
      });

      logger.debug('test', 'debug event');
      logger.info('test', 'info event');
      logger.warn('test', 'warn event');
      logger.error('test', 'error event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');

      // Should only contain warn and error
      expect(content).not.toContain('debug event');
      expect(content).not.toContain('info event');
      expect(content).toContain('warn event');
      expect(content).toContain('error event');
    });

    test('should log all messages when minLevel is debug', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
        minLevel: 'debug',
      });

      logger.debug('test', 'debug event');
      logger.info('test', 'info event');
      logger.warn('test', 'warn event');
      logger.error('test', 'error event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');

      expect(content).toContain('debug event');
      expect(content).toContain('info event');
      expect(content).toContain('warn event');
      expect(content).toContain('error event');
    });
  });

  describe('Dual output (console + file)', () => {
    test('should write to file when logToFile is true', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test-component', 'test-event', { key: 'value' });

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      
      expect(existsSync(logFile)).toBe(true);
      
      const content = readFileSync(logFile, 'utf8');
      expect(content).toContain('test-component');
      expect(content).toContain('test-event');
      expect(content).toContain('value');
    });

    test('should not write to file when logToFile is false', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: true,
        logToFile: false,
      });

      logger.info('test-component', 'test-event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      
      expect(existsSync(logFile)).toBe(false);
    });
  });

  describe('Log entry format', () => {
    test('should include timestamp in log entry', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('string');
      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should include level in log entry', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.warn('test', 'event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.level).toBe('warn');
    });

    test('should include component in log entry', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('METAR_Client', 'fetch_complete');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.component).toBe('METAR_Client');
    });

    test('should include event in log entry', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'order_placed');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.event).toBe('order_placed');
    });

    test('should include data in log entry when provided', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'event', { icao: 'KLGA', temp: 20.5 });

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.data).toBeDefined();
      expect(entry.data.icao).toBe('KLGA');
      expect(entry.data.temp).toBe(20.5);
    });

    test('should handle log entry without data', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'event');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const entry = JSON.parse(content.trim());

      expect(entry.data).toBeUndefined();
    });
  });

  describe('Multiple log entries', () => {
    test('should append multiple log entries to same file', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'event1');
      logger.info('test', 'event2');
      logger.info('test', 'event3');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toContain('event1');
      expect(lines[1]).toContain('event2');
      expect(lines[2]).toContain('event3');
    });

    test('should maintain log entry order', () => {
      const logger = new Logger({
        logDir: testLogDir,
        logToConsole: false,
        logToFile: true,
      });

      logger.info('test', 'first');
      logger.warn('test', 'second');
      logger.error('test', 'third');

      const date = new Date().toISOString().split('T')[0];
      const logFile = join(testLogDir, `weather-arb-bot-${date}.log`);
      const content = readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      const entries = lines.map(line => JSON.parse(line));
      expect(entries[0].event).toBe('first');
      expect(entries[1].event).toBe('second');
      expect(entries[2].event).toBe('third');
    });
  });

  describe('Global logger', () => {
    test('initLogger should create and return logger instance', () => {
      const logger = initLogger({ logDir: testLogDir });
      
      expect(logger).toBeInstanceOf(Logger);
    });

    test('getLogger should return same instance after initLogger', () => {
      const logger1 = initLogger({ logDir: testLogDir });
      const logger2 = getLogger();
      
      expect(logger2).toBe(logger1);
    });

    test('getLogger should create default logger if not initialized', () => {
      const logger = getLogger();
      
      expect(logger).toBeInstanceOf(Logger);
    });
  });
});
