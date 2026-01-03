/**
 * Performance Alerting Service
 *
 * This service handles alert notifications for performance monitoring including:
 * - Email notifications
 * - Webhook notifications
 * - Log-based alerts
 * - Alert management and cooldowns
 */

import EventEmitter from 'events';
import monitoringConfig from '../config/monitoring.config.js';
import logger from '../helpers/logger.js';

class AlertingService extends EventEmitter {
  constructor() {
    super();
    this.alertHistory = new Map();
    this.cooldownPeriods = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the alerting service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Alerting service is already initialized');
      return;
    }

    try {
      logger.info('Initializing performance alerting service');

      // Initialize notification channels
      await this.initializeEmailChannel();
      await this.initializeWebhookChannel();

      this.isInitialized = true;
      logger.info('Performance alerting service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize alerting service:', error);
      throw error;
    }
  }

  /**
   * Process an alert and send notifications
   */
  async processAlert(alert) {
    if (!this.isInitialized) {
      logger.warn(
        'Alerting service not initialized, skipping alert processing'
      );
      return;
    }

    try {
      // Check if we're in cooldown period for this alert type
      if (this.isInCooldown(alert)) {
        logger.debug(`Alert ${alert.id} is in cooldown period, skipping`);
        return;
      }

      logger.info(`Processing performance alert: ${alert.message}`);

      // Send notifications through enabled channels
      const notificationPromises = [];

      if (monitoringConfig.alerts.channels.email.enabled) {
        notificationPromises.push(this.sendEmailAlert(alert));
      }

      if (monitoringConfig.alerts.channels.webhook.enabled) {
        notificationPromises.push(this.sendWebhookAlert(alert));
      }

      if (monitoringConfig.alerts.channels.log.enabled) {
        notificationPromises.push(this.sendLogAlert(alert));
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(notificationPromises);

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Notification channel ${index} failed:`, result.reason);
        }
      });

      // Update cooldown period
      this.updateCooldown(alert);

      // Store alert in history
      this.storeAlertInHistory(alert);

      // Emit alert processed event
      this.emit('alertProcessed', alert);
    } catch (error) {
      logger.error('Error processing alert:', error);
      this.emit('alertError', { alert, error });
    }
  }

  /**
   * Initialize email notification channel
   */
  async initializeEmailChannel() {
    if (!monitoringConfig.alerts.channels.email.enabled) {
      return;
    }

    try {
      // Check if email service is available
      const { mailgunService } = await import(
        '../services/notification/mailgun.service.js'
      );

      if (!mailgunService) {
        logger.warn('Mailgun service not available, email alerts disabled');
        monitoringConfig.alerts.channels.email.enabled = false;
        return;
      }

      logger.info('Email alert channel initialized');
    } catch (error) {
      logger.error('Failed to initialize email channel:', error);
      monitoringConfig.alerts.channels.email.enabled = false;
    }
  }

  /**
   * Initialize webhook notification channel
   */
  async initializeWebhookChannel() {
    if (!monitoringConfig.alerts.channels.webhook.enabled) {
      return;
    }

    if (!monitoringConfig.alerts.channels.webhook.url) {
      logger.warn('Webhook URL not configured, webhook alerts disabled');
      monitoringConfig.alerts.channels.webhook.enabled = false;
      return;
    }

    logger.info('Webhook alert channel initialized');
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    if (!monitoringConfig.alerts.channels.email.enabled) {
      return;
    }

    try {
      const { mailgunService } = await import(
        '../services/notification/mailgun.service.js'
      );

      const recipients = monitoringConfig.alerts.channels.email.recipients;
      if (recipients.length === 0) {
        logger.warn('No email recipients configured for alerts');
        return;
      }

      const subject = `Performance Alert [${alert.level.toUpperCase()}]: ${alert.metric}`;
      const html = this.generateEmailTemplate(alert);

      // Send email to all recipients
      const emailPromises = recipients.map((recipient) =>
        mailgunService.sendEmail({
          to: recipient,
          subject,
          html,
        })
      );

      await Promise.all(emailPromises);
      logger.info(`Email alert sent to ${recipients.length} recipients`);
    } catch (error) {
      logger.error('Failed to send email alert:', error);
      throw error;
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    if (!monitoringConfig.alerts.channels.webhook.enabled) {
      return;
    }

    try {
      const webhookUrl = monitoringConfig.alerts.channels.webhook.url;
      const timeout = monitoringConfig.alerts.channels.webhook.timeout;

      const payload = {
        alert,
        timestamp: new Date().toISOString(),
        service: 'performance-monitoring',
        environment: process.env.NODE_ENV || 'development',
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Boosty-Performance-Monitor/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeout),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook request failed: ${response.status} ${response.statusText}`
        );
      }

      logger.info(`Webhook alert sent successfully to ${webhookUrl}`);
    } catch (error) {
      logger.error('Failed to send webhook alert:', error);
      throw error;
    }
  }

  /**
   * Send log alert
   */
  async sendLogAlert(alert) {
    if (!monitoringConfig.alerts.channels.log.enabled) {
      return;
    }

    try {
      const logLevel = alert.level === 'critical' ? 'error' : 'warn';
      const logMessage = `Performance Alert [${alert.level.toUpperCase()}]: ${alert.message}`;

      logger[logLevel](logMessage, {
        alertId: alert.id,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
      });

      logger.info('Log alert recorded');
    } catch (error) {
      logger.error('Failed to send log alert:', error);
      throw error;
    }
  }

  /**
   * Generate email template for alert
   */
  generateEmailTemplate(alert) {
    const timestamp = new Date(alert.timestamp).toLocaleString();
    const levelColor = alert.level === 'critical' ? '#ff4d4d' : '#ffa726';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Performance Alert</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background-color: ${levelColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .metric { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .label { font-weight: bold; color: #333; }
          .value { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Performance Alert</h1>
            <p>${alert.level.toUpperCase()} - ${alert.metric}</p>
          </div>
          <div class="content">
            <p><strong>Alert Message:</strong> ${alert.message}</p>
            
            <div class="metric">
              <p><span class="label">Metric:</span> <span class="value">${alert.metric}</span></p>
              <p><span class="label">Current Value:</span> <span class="value">${alert.value}</span></p>
              <p><span class="label">Threshold:</span> <span class="value">${alert.threshold}</span></p>
              <p><span class="label">Severity:</span> <span class="value">${alert.level}</span></p>
              <p><span class="label">Time:</span> <span class="value">${timestamp}</span></p>
            </div>
            
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              ${this.generateRecommendedActions(alert)}
            </ul>
          </div>
          <div class="footer">
            <p>This alert was generated by the Boosty Platform Performance Monitoring System</p>
            <p>If you believe this is a false alarm, please contact your system administrator</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate recommended actions for alert
   */
  generateRecommendedActions(alert) {
    const actions = {
      cpu: [
        'Check for high CPU consuming processes',
        'Review recent code deployments',
        'Consider scaling up resources if needed',
      ],
      memory: [
        'Check for memory leaks in the application',
        'Review memory usage patterns',
        'Consider increasing available memory',
      ],
      eventLoopLag: [
        'Check for blocking operations in the event loop',
        'Review synchronous code that might be blocking',
        'Consider optimizing async operations',
      ],
      redisHitRate: [
        'Check Redis caching strategy',
        'Review cache key patterns',
        'Consider increasing cache size or TTL',
      ],
      errorRate: [
        'Review application logs for error patterns',
        'Check for recent code changes',
        'Monitor user impact and error frequency',
      ],
    };

    const metricActions = actions[alert.metric] || [
      'Review system performance metrics',
      'Check recent system changes',
      'Monitor for continued degradation',
    ];

    return metricActions.map((action) => `<li>${action}</li>`).join('');
  }

  /**
   * Check if alert is in cooldown period
   */
  isInCooldown(alert) {
    const cooldownKey = `${alert.metric}-${alert.level}`;
    const lastAlertTime = this.cooldownPeriods.get(cooldownKey);

    if (!lastAlertTime) {
      return false;
    }

    const cooldownPeriod = monitoringConfig.alerts.cooldown[alert.level];
    const now = Date.now();

    return now - lastAlertTime < cooldownPeriod;
  }

  /**
   * Update cooldown period for alert
   */
  updateCooldown(alert) {
    const cooldownKey = `${alert.metric}-${alert.level}`;
    this.cooldownPeriods.set(cooldownKey, Date.now());
  }

  /**
   * Store alert in history
   */
  storeAlertInHistory(alert) {
    const historyKey = alert.metric;

    if (!this.alertHistory.has(historyKey)) {
      this.alertHistory.set(historyKey, []);
    }

    const history = this.alertHistory.get(historyKey);
    history.push(alert);

    // Keep only last 100 alerts per metric
    if (history.length > 100) {
      this.alertHistory.set(historyKey, history.slice(-100));
    }
  }

  /**
   * Get alert history for a metric
   */
  getAlertHistory(metric, limit = 50) {
    const history = this.alertHistory.get(metric) || [];
    return history.slice(-limit);
  }

  /**
   * Get all alert history
   */
  getAllAlertHistory(limit = 100) {
    const allAlerts = [];

    for (const history of this.alertHistory.values()) {
      allAlerts.push(...history);
    }

    // Sort by timestamp (newest first)
    allAlerts.sort((a, b) => b.timestamp - a.timestamp);

    return allAlerts.slice(0, limit);
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(metric = null) {
    if (metric) {
      this.alertHistory.delete(metric);
      logger.info(`Cleared alert history for metric: ${metric}`);
    } else {
      this.alertHistory.clear();
      logger.info('Cleared all alert history');
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics() {
    const stats = {
      totalAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      alertsByMetric: {},
      recentAlerts: 0,
    };

    const now = Date.now();
    const oneHourAgo = now - 3600000; // Last hour

    for (const [metric, history] of this.alertHistory.entries()) {
      const metricAlerts = history.length;
      stats.totalAlerts += metricAlerts;
      stats.alertsByMetric[metric] = metricAlerts;

      // Count by level
      history.forEach((alert) => {
        if (alert.level === 'critical') {
          stats.criticalAlerts++;
        } else if (alert.level === 'warning') {
          stats.warningAlerts++;
        }

        // Count recent alerts
        if (alert.timestamp > oneHourAgo) {
          stats.recentAlerts++;
        }
      });
    }

    return stats;
  }

  /**
   * Test alert notification channels
   */
  async testNotificationChannels() {
    const testAlert = {
      id: `test-${Date.now()}`,
      metric: 'test',
      value: 100,
      threshold: 90,
      level: 'warning',
      timestamp: Date.now(),
      message: 'This is a test alert to verify notification channels',
    };

    try {
      await this.processAlert(testAlert);
      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      logger.error('Test alert failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Shutdown the alerting service
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down performance alerting service');

    // Clear any pending operations
    this.cooldownPeriods.clear();

    this.isInitialized = false;
    logger.info('Performance alerting service shut down');
  }
}

// Create and export singleton instance
const alertingService = new AlertingService();
export default alertingService;
