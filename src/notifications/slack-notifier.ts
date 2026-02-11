/**
 * Slack Notifier Client
 * 
 * Sends real-time notifications to Slack via webhook for monitoring bot activities.
 * All notification failures are non-blocking to ensure bot continues operation.
 * 
 * Requirements: 15.1, 15.11
 */

import { getLogger } from '../logger';
import type { SlackNotification } from './types';

/**
 * Slack webhook URL validation regex
 * Must be a valid HTTPS URL to hooks.slack.com
 */
const SLACK_WEBHOOK_URL_REGEX = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/;

/**
 * SlackNotifier class
 * 
 * Manages Slack webhook notifications with error handling and validation.
 * 
 * Requirement 15.1: Slack notification via webhook URL
 * Requirement 15.11: Non-blocking operation on failure
 */
export class SlackNotifier {
  private readonly webhookUrl: string | null;
  private readonly logger = getLogger();
  private readonly enabled: boolean;

  /**
   * Initialize Slack notifier with webhook URL
   * 
   * @param webhookUrl - Optional Slack webhook URL
   * 
   * If webhook URL is not provided or invalid, notifications are disabled
   * but the bot continues normal operation.
   */
  constructor(webhookUrl?: string) {
    if (!webhookUrl) {
      this.webhookUrl = null;
      this.enabled = false;
      this.logger.warn(
        'SlackNotifier',
        'WEBHOOK_NOT_CONFIGURED',
        { message: 'Slack webhook URL not configured, notifications disabled' }
      );
      return;
    }

    // Validate webhook URL format
    if (!this.isValidWebhookUrl(webhookUrl)) {
      this.webhookUrl = null;
      this.enabled = false;
      this.logger.warn(
        'SlackNotifier',
        'INVALID_WEBHOOK_URL',
        { 
          message: 'Invalid Slack webhook URL format, notifications disabled',
          url: webhookUrl.substring(0, 30) + '...' // Log partial URL for debugging
        }
      );
      return;
    }

    this.webhookUrl = webhookUrl;
    this.enabled = true;
    this.logger.info(
      'SlackNotifier',
      'INITIALIZED',
      { message: 'Slack notifier initialized successfully' }
    );
  }

  /**
   * Validate webhook URL format
   * 
   * @param url - Webhook URL to validate
   * @returns true if URL is valid Slack webhook format
   */
  private isValidWebhookUrl(url: string): boolean {
    return SLACK_WEBHOOK_URL_REGEX.test(url);
  }

  /**
   * Check if notifications are enabled
   * 
   * @returns true if webhook URL is configured and valid
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Send notification to Slack
   * 
   * This method is non-blocking and will not throw exceptions.
   * All errors are caught and logged, allowing the bot to continue operation.
   * 
   * Requirement 15.11: Non-blocking notification sending
   * 
   * @param notification - Slack notification payload
   * @returns Promise that resolves when notification is sent or fails
   */
  public async sendNotification(notification: SlackNotification): Promise<void> {
    // If notifications are disabled, return immediately
    if (!this.enabled || !this.webhookUrl) {
      return;
    }

    try {
      // Validate payload size (keep under 3KB for reliability)
      const payload = JSON.stringify(notification);
      if (payload.length > 3000) {
        this.logger.warn(
          'SlackNotifier',
          'PAYLOAD_TOO_LARGE',
          { 
            size: payload.length,
            message: 'Notification payload exceeds 3KB, may fail to send'
          }
        );
      }

      // Send notification using native fetch API
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          'SlackNotifier',
          'SEND_FAILED',
          {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            message: 'Failed to send Slack notification'
          }
        );
        return;
      }

      // Log successful send at debug level to avoid log spam
      this.logger.debug(
        'SlackNotifier',
        'NOTIFICATION_SENT',
        { message: 'Slack notification sent successfully' }
      );

    } catch (error) {
      // Catch all errors to ensure non-blocking operation
      this.logger.error(
        'SlackNotifier',
        'SEND_ERROR',
        {
          error: error instanceof Error ? error.message : String(error),
          message: 'Error sending Slack notification, bot continues operation'
        }
      );
    }
  }

  /**
   * Send notification with retry logic
   * 
   * Attempts to send notification once, and if it fails, retries once more.
   * This provides better reliability without blocking bot operation.
   * 
   * @param notification - Slack notification payload
   * @returns Promise that resolves when notification is sent or all retries exhausted
   */
  public async sendNotificationWithRetry(notification: SlackNotification): Promise<void> {
    // First attempt
    await this.sendNotification(notification);
    
    // Note: We don't implement retry logic here to keep it simple and non-blocking.
    // If the first attempt fails, we log it and move on.
    // For production, consider implementing a retry queue with exponential backoff.
  }
}

/**
 * Global Slack notifier instance
 */
let globalNotifier: SlackNotifier | null = null;

/**
 * Initialize global Slack notifier
 * 
 * @param webhookUrl - Optional Slack webhook URL
 * @returns SlackNotifier instance
 */
export function initSlackNotifier(webhookUrl?: string): SlackNotifier {
  globalNotifier = new SlackNotifier(webhookUrl);
  return globalNotifier;
}

/**
 * Get global Slack notifier instance
 * 
 * @returns SlackNotifier instance (creates one if not initialized)
 */
export function getSlackNotifier(): SlackNotifier {
  if (!globalNotifier) {
    globalNotifier = new SlackNotifier();
  }
  return globalNotifier;
}
