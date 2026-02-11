/**
 * Slack Notifications Module
 * 
 * Exports all notification functionality for easy import.
 */

// Export types
export type {
  NotificationType,
  NotificationColor,
  SlackField,
  SlackBlock,
  SlackAttachment,
  SlackNotification,
  ScanNotificationData,
  SignalNotificationData,
  OrderNotificationData,
  SkipNotificationData,
  ResultNotificationData,
  AlertNotificationData,
  DailySummary,
} from './types';

// Export constants
export {
  NOTIFICATION_COLORS,
  NOTIFICATION_EMOJIS,
} from './types';

// Export notifier
export {
  SlackNotifier,
  initSlackNotifier,
  getSlackNotifier,
} from './slack-notifier';

// Export formatters
export {
  formatScanNotification,
  formatSignalNotification,
  formatOrderNotification,
  formatSkipNotification,
  formatResultNotification,
  formatAlertNotification,
  formatDailySummaryNotification,
} from './formatters';
