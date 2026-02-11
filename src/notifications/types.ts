/**
 * Slack Notification Types
 * 
 * Type definitions for Slack notifications sent via webhook.
 * Supports real-time monitoring of bot activities from mobile devices.
 * 
 * Requirements: 15.1, 16.1, 16.7
 */

import type { PrecisionTemperature } from '../types/temperature';
import type { Timestamp, Duration } from '../types/timestamp';
import type { Market, Price, Size, OrderID } from '../market/types';
import type { TradingSignal } from '../signal/types';

/**
 * Notification types for different bot events
 * 
 * - SCAN: Market scanning cycle started
 * - SIGNAL: Positive EV opportunity detected
 * - ORDER: Order placed on exchange
 * - SKIP: Opportunity skipped due to constraints
 * - RESULT: Position closed with P&L
 * - ALERT: Error or kill-switch activation
 */
export type NotificationType = 
  | 'SCAN'
  | 'SIGNAL'
  | 'ORDER'
  | 'SKIP'
  | 'RESULT'
  | 'ALERT';

/**
 * Notification color codes for visual distinction
 * 
 * Requirement 16.1: Color-coded notifications for quick identification
 */
export type NotificationColor = 
  | '#808080'  // Gray - SCAN
  | '#2196F3'  // Blue - SIGNAL
  | '#FFC107'  // Yellow - ORDER
  | '#FF9800'  // Orange - SKIP
  | '#4CAF50'  // Green - RESULT (profit)
  | '#F44336'; // Red - ALERT/RESULT (loss)

/**
 * Mapping of notification types to colors
 * 
 * Requirement 16.1: Consistent color coding across all notifications
 */
export const NOTIFICATION_COLORS: Record<NotificationType, NotificationColor> = {
  SCAN: '#808080',
  SIGNAL: '#2196F3',
  ORDER: '#FFC107',
  SKIP: '#FF9800',
  RESULT: '#4CAF50',  // Default, can be red for losses
  ALERT: '#F44336',
};

/**
 * Emoji indicators for notification types
 * 
 * Requirement 16.7: Visual indicators for mobile readability
 */
export const NOTIFICATION_EMOJIS: Record<NotificationType, string> = {
  SCAN: '🔍',
  SIGNAL: '💡',
  ORDER: '📊',
  SKIP: '⏭️',
  RESULT: '✅',  // Can be ❌ for losses
  ALERT: '❌',
};

/**
 * Slack field for key-value pairs in notifications
 */
export type SlackField = {
  readonly type: 'mrkdwn';
  readonly text: string;
};

/**
 * Slack block types for structured content
 */
export type SlackBlock = 
  | {
      readonly type: 'section';
      readonly text: {
        readonly type: 'mrkdwn';
        readonly text: string;
      };
    }
  | {
      readonly type: 'section';
      readonly fields: SlackField[];
    }
  | {
      readonly type: 'context';
      readonly elements: SlackField[];
    };

/**
 * Slack attachment with color and blocks
 */
export type SlackAttachment = {
  readonly color: NotificationColor;
  readonly blocks: SlackBlock[];
};

/**
 * Complete Slack notification payload
 */
export type SlackNotification = {
  readonly attachments: SlackAttachment[];
};

/**
 * Data for SCAN notification
 * 
 * Requirement 15.2: Market scanning cycle notification
 */
export type ScanNotificationData = {
  readonly timestamp: Timestamp;
  readonly marketsCount: number;
};

/**
 * Data for SIGNAL notification
 * 
 * Requirement 15.3: Positive EV opportunity notification
 */
export type SignalNotificationData = {
  readonly signal: TradingSignal;
  readonly market: Market;
  readonly currentTemp: PrecisionTemperature;
  readonly threshold: PrecisionTemperature;
};

/**
 * Data for ORDER notification
 * 
 * Requirement 15.4: Order placement notification
 */
export type OrderNotificationData = {
  readonly market: Market;
  readonly side: 'BUY' | 'SELL';
  readonly price: Price;
  readonly size: Size;
  readonly orderId: OrderID;
};

/**
 * Data for SKIP notification
 * 
 * Requirement 15.5: Skipped opportunity notification
 */
export type SkipNotificationData = {
  readonly market: Market;
  readonly ev: number;
  readonly reason: string;
};

/**
 * Data for RESULT notification
 * 
 * Requirement 15.6: Position closed notification
 */
export type ResultNotificationData = {
  readonly market: Market;
  readonly pnl: number;
  readonly pnlPercent: number;
  readonly entryPrice: Price;
  readonly exitPrice: Price;
};

/**
 * Data for ALERT notification
 * 
 * Requirement 15.7, 15.8: Error and kill-switch notifications
 */
export type AlertNotificationData = {
  readonly reason: string;
  readonly details: string;
  readonly timestamp: Timestamp;
  readonly actionTaken: string;
};

/**
 * Daily summary data
 * 
 * Requirement 15.9, 16.6: Daily summary notification
 */
export type DailySummary = {
  readonly date: string;
  readonly totalPnL: number;
  readonly totalPnLPercent: number;
  readonly currentBalance: number;
  readonly brierScore: number;
  readonly totalTrades: number;
  readonly winningTrades: number;
  readonly losingTrades: number;
  readonly winRate: number;
  readonly topPerformingMarket: {
    readonly market: string;
    readonly pnl: number;
  } | null;
  readonly averageEV: number;
  readonly averageHoldTime: Duration;
};
