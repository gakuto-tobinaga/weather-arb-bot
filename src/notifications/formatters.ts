/**
 * Slack Notification Formatters
 * 
 * Functions to format different types of notifications for Slack.
 * All notifications use Slack Block Kit for mobile-optimized display.
 * 
 * Requirements: 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 16.2, 16.3, 16.4, 16.5, 16.8
 */

import { PrecisionTemperature } from '../types/temperature';
import { Timestamp } from '../types/timestamp';
import type {
  SlackNotification,
  SlackAttachment,
  SlackBlock,
  SlackField,
  NotificationColor,
  ScanNotificationData,
  SignalNotificationData,
  OrderNotificationData,
  SkipNotificationData,
  ResultNotificationData,
  AlertNotificationData,
  DailySummary,
  NOTIFICATION_COLORS,
  NOTIFICATION_EMOJIS,
} from './types';

// Import constants
import { NOTIFICATION_COLORS, NOTIFICATION_EMOJIS } from './types';

/**
 * Truncate text to maximum length for mobile readability
 * 
 * Requirement 16.8: Limit text to 280 characters
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 280)
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text: string, maxLength: number = 280): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format timestamp for display
 * 
 * @param timestamp - Timestamp to format
 * @returns Formatted timestamp string
 */
function formatTimestamp(timestamp: Timestamp): string {
  return Timestamp.format(timestamp, 'yyyy-MM-dd HH:mm:ss zzz');
}

/**
 * Create a Slack field
 * 
 * @param label - Field label
 * @param value - Field value
 * @returns SlackField object
 */
function createField(label: string, value: string): SlackField {
  return {
    type: 'mrkdwn',
    text: `*${label}:*\n${value}`,
  };
}

/**
 * Format SCAN notification
 * 
 * Requirement 15.2: Market scanning cycle notification
 * 
 * @param data - Scan notification data
 * @returns Slack notification payload
 */
export function formatScanNotification(data: ScanNotificationData): SlackNotification {
  const emoji = NOTIFICATION_EMOJIS.SCAN;
  const color = NOTIFICATION_COLORS.SCAN;
  
  const mainText = truncateText(`${emoji} [SCAN] 市場をスキャン中...`);
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Markets', data.marketsCount.toString()),
        createField('Time', formatTimestamp(data.timestamp)),
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format SIGNAL notification
 * 
 * Requirement 15.3, 16.3: Positive EV opportunity notification
 * 
 * @param data - Signal notification data
 * @returns Slack notification payload
 */
export function formatSignalNotification(data: SignalNotificationData): SlackNotification {
  const emoji = NOTIFICATION_EMOJIS.SIGNAL;
  const color = NOTIFICATION_COLORS.SIGNAL;
  
  const { signal, market, currentTemp, threshold } = data;
  
  const mainText = truncateText(
    `${emoji} [SIGNAL] 期待値(EV) ${signal.ev.toFixed(3)} のエントリーチャンス発見`
  );
  
  const currentTempF = PrecisionTemperature.toFahrenheit(currentTemp).toFixed(1);
  const thresholdF = PrecisionTemperature.toFahrenheit(threshold).toFixed(1);
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Market', market.description || market.conditionId.substring(0, 20)),
        createField('ICAO', market.icaoCode),
        createField('Current Temp', `${currentTempF}°F`),
        createField('Threshold', `${thresholdF}°F`),
        createField('Probability', `${(signal.calculatedProbability * 100).toFixed(1)}%`),
        createField('Market Price', `${(signal.marketPrice * 100).toFixed(1)}%`),
        createField('EV', signal.ev.toFixed(3)),
        createField('Action', signal.action),
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Timestamp: ${formatTimestamp(signal.timestamp)}`,
        },
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format ORDER notification
 * 
 * Requirement 15.4, 16.4: Order placement notification
 * 
 * @param data - Order notification data
 * @returns Slack notification payload
 */
export function formatOrderNotification(data: OrderNotificationData): SlackNotification {
  const emoji = NOTIFICATION_EMOJIS.ORDER;
  const color = NOTIFICATION_COLORS.ORDER;
  
  const { market, side, price, size, orderId } = data;
  
  const mainText = truncateText(
    `${emoji} [ORDER] $${size.toFixed(2)} 分の ${side} を購入注文`
  );
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Market', market.description || market.conditionId.substring(0, 20)),
        createField('Side', side),
        createField('Price', `${(price * 100).toFixed(1)}%`),
        createField('Size', `$${size.toFixed(2)}`),
        createField('Order ID', orderId.substring(0, 16) + '...'),
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format SKIP notification
 * 
 * Requirement 15.5: Skipped opportunity notification
 * 
 * @param data - Skip notification data
 * @returns Slack notification payload
 */
export function formatSkipNotification(data: SkipNotificationData): SlackNotification {
  const emoji = NOTIFICATION_EMOJIS.SKIP;
  const color = NOTIFICATION_COLORS.SKIP;
  
  const { market, ev, reason } = data;
  
  const mainText = truncateText(
    `${emoji} [SKIP] チャンスですが板が薄すぎるため見送り`
  );
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Market', market.description || market.conditionId.substring(0, 20)),
        createField('EV', ev.toFixed(3)),
        createField('Reason', truncateText(reason, 100)),
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format RESULT notification
 * 
 * Requirement 15.6, 16.5: Position closed notification
 * 
 * @param data - Result notification data
 * @returns Slack notification payload
 */
export function formatResultNotification(data: ResultNotificationData): SlackNotification {
  const { market, pnl, pnlPercent, entryPrice, exitPrice } = data;
  
  // Use green for profit, red for loss
  const isProfit = pnl > 0;
  const emoji = isProfit ? '✅' : '❌';
  const color: NotificationColor = isProfit ? '#4CAF50' : '#F44336';
  
  const pnlSign = pnl > 0 ? '+' : '';
  const mainText = truncateText(
    `${emoji} [RESULT] 決済完了。${isProfit ? '利益' : '損失'}: ${pnlSign}$${pnl.toFixed(2)}`
  );
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Market', market.description || market.conditionId.substring(0, 20)),
        createField('Entry Price', `${(entryPrice * 100).toFixed(1)}%`),
        createField('Exit Price', `${(exitPrice * 100).toFixed(1)}%`),
        createField('P&L', `${pnlSign}$${pnl.toFixed(2)} (${pnlSign}${pnlPercent.toFixed(1)}%)`),
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format ALERT notification
 * 
 * Requirement 15.7, 15.8: Error and kill-switch notifications
 * 
 * @param data - Alert notification data
 * @returns Slack notification payload
 */
export function formatAlertNotification(data: AlertNotificationData): SlackNotification {
  const emoji = NOTIFICATION_EMOJIS.ALERT;
  const color = NOTIFICATION_COLORS.ALERT;
  
  const { reason, details, timestamp, actionTaken } = data;
  
  const mainText = truncateText(`${emoji} [ALERT] ${reason}`);
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields: [
        createField('Details', truncateText(details, 150)),
        createField('Action Taken', truncateText(actionTaken, 100)),
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Timestamp: ${formatTimestamp(timestamp)}`,
        },
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}

/**
 * Format daily summary notification
 * 
 * Requirement 15.9, 16.6: Daily summary notification
 * 
 * @param summary - Daily summary data
 * @returns Slack notification payload
 */
export function formatDailySummaryNotification(summary: DailySummary): SlackNotification {
  const isProfit = summary.totalPnL > 0;
  const color: NotificationColor = isProfit ? '#4CAF50' : '#F44336';
  
  const pnlSign = summary.totalPnL > 0 ? '+' : '';
  const mainText = `📊 [DAILY SUMMARY] ${summary.date}`;
  
  const fields: SlackField[] = [
    createField('Total P&L', `${pnlSign}$${summary.totalPnL.toFixed(2)} (${pnlSign}${summary.totalPnLPercent.toFixed(1)}%)`),
    createField('Current Balance', `$${summary.currentBalance.toFixed(2)}`),
    createField('Brier Score', summary.brierScore.toFixed(3)),
    createField('Total Trades', summary.totalTrades.toString()),
    createField('Win Rate', `${summary.winRate.toFixed(1)}% (${summary.winningTrades}W / ${summary.losingTrades}L)`),
    createField('Average EV', summary.averageEV.toFixed(3)),
  ];
  
  if (summary.topPerformingMarket) {
    fields.push(
      createField(
        'Top Market',
        `${summary.topPerformingMarket.market.substring(0, 30)} (+$${summary.topPerformingMarket.pnl.toFixed(2)})`
      )
    );
  }
  
  fields.push(
    createField('Avg Hold Time', `${summary.averageHoldTime.hours.toFixed(1)}h`)
  );
  
  const blocks: SlackBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: mainText,
      },
    },
    {
      type: 'section',
      fields,
    },
  ];

  const attachment: SlackAttachment = {
    color,
    blocks,
  };

  return {
    attachments: [attachment],
  };
}
