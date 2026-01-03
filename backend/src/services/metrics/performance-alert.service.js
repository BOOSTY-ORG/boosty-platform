/**
 * Performance Alert Service
 *
 * This service handles performance alert management including:
 * - Alert rule evaluation
 * - Alert lifecycle management
 * - Alert notification routing
 * - Alert escalation and suppression
 */

import EventEmitter from 'events';
import PerformanceAlert from '../../models/metrics/performance-alert.model.js';
import performanceCollector from '../../monitoring/performance-collector.js';
import alertingService from '../../monitoring/alerting.service.js';
import logger from '../../helpers/logger.js';

class PerformanceAlertService extends EventEmitter {
  constructor() {
    super();
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    this.suppressionRules = new Map();
    this.escalationRules = new Map();
    this.isInitialized = false;
    this.alertStats = {
      totalCreated: 0,
      totalResolved: 0,
      totalAcknowledged: 0,
      totalEscalated: 0,
      totalSuppressed: 0,
    };
  }

  /**
   * Initialize the alert service
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('Performance alert service is already initialized');
      return;
    }

    try {
      logger.info('Initializing performance alert service');

      // Load default alert rules
      await this.loadDefaultAlertRules();

      // Load suppression rules
      await this.loadSuppressionRules();

      // Load escalation rules
      await this.loadEscalationRules();

      // Subscribe to performance collector events
      this.setupPerformanceEventListeners();

      // Start alert evaluation interval
      this.startAlertEvaluation();

      this.isInitialized = true;
      logger.info('Performance alert service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize alert service:', error);
      throw error;
    }
  }

  /**
   * Load default alert rules
   */
  async loadDefaultAlertRules() {
    const defaultRules = [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        category: 'system',
        metric: 'cpu',
        condition: {
          operator: '>',
          threshold: 80,
          duration: 300000, // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'cpu-critical',
        name: 'Critical CPU Usage',
        category: 'system',
        metric: 'cpu',
        condition: {
          operator: '>',
          threshold: 90,
          duration: 60000, // 1 minute
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        category: 'system',
        metric: 'memory',
        condition: {
          operator: '>',
          threshold: 85,
          duration: 300000, // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'memory-critical',
        name: 'Critical Memory Usage',
        category: 'system',
        metric: 'memory',
        condition: {
          operator: '>',
          threshold: 95,
          duration: 60000, // 1 minute
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'response-time-high',
        name: 'High API Response Time',
        category: 'api',
        metric: 'responseTime',
        condition: {
          operator: '>',
          threshold: 500,
          duration: 300000, // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'response-time-critical',
        name: 'Critical API Response Time',
        category: 'api',
        metric: 'responseTime',
        condition: {
          operator: '>',
          threshold: 1000,
          duration: 60000, // 1 minute
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        category: 'api',
        metric: 'errorRate',
        condition: {
          operator: '>',
          threshold: 5,
          duration: 300000, // 5 minutes
        },
        severity: 'warning',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
      {
        id: 'error-rate-critical',
        name: 'Critical Error Rate',
        category: 'api',
        metric: 'errorRate',
        condition: {
          operator: '>',
          threshold: 10,
          duration: 60000, // 1 minute
        },
        severity: 'critical',
        enabled: true,
        cooldown: 300000, // 5 minutes
      },
    ];

    // Store rules in map
    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });

    logger.info(`Loaded ${defaultRules.length} default alert rules`);
  }

  /**
   * Load suppression rules
   */
  async loadSuppressionRules() {
    const defaultSuppressions = [
      {
        id: 'maintenance-suppression',
        name: 'Maintenance Mode Suppression',
        condition: {
          type: 'system',
          property: 'maintenanceMode',
          operator: '=',
          value: true,
        },
        action: {
          type: 'suppress',
          categories: ['all'],
          duration: 3600000, // 1 hour
        },
        enabled: true,
      },
      {
        id: 'deployment-suppression',
        name: 'Deployment Suppression',
        condition: {
          type: 'system',
          property: 'deploymentInProgress',
          operator: '=',
          value: true,
        },
        action: {
          type: 'suppress',
          categories: ['system'],
          duration: 1800000, // 30 minutes
        },
        enabled: true,
      },
    ];

    // Store suppression rules in map
    defaultSuppressions.forEach((rule) => {
      this.suppressionRules.set(rule.id, rule);
    });

    logger.info(`Loaded ${defaultSuppressions.length} suppression rules`);
  }

  /**
   * Load escalation rules
   */
  async loadEscalationRules() {
    const defaultEscalations = [
      {
        id: 'critical-escalation',
        name: 'Critical Alert Escalation',
        condition: {
          severity: 'critical',
          unacknowledgedFor: 1800000, // 30 minutes
        },
        action: {
          type: 'escalate',
          level: 'high',
          channels: ['sms', 'pagerduty'],
        },
        enabled: true,
      },
      {
        id: 'warning-escalation',
        name: 'Warning Alert Escalation',
        condition: {
          severity: 'warning',
          unacknowledgedFor: 3600000, // 1 hour
        },
        action: {
          type: 'escalate',
          level: 'medium',
          channels: ['email'],
        },
        enabled: true,
      },
    ];

    // Store escalation rules in map
    defaultEscalations.forEach((rule) => {
      this.escalationRules.set(rule.id, rule);
    });

    logger.info(`Loaded ${defaultEscalations.length} escalation rules`);
  }

  /**
   * Setup event listeners for performance collector
   */
  setupPerformanceEventListeners() {
    // Listen to system metrics
    performanceCollector.on('systemMetrics', (data) => {
      this.evaluateAlertRules('system', data);
    });

    // Listen to API metrics
    performanceCollector.on('apiMetrics', (data) => {
      this.evaluateAlertRules('api', data);
    });

    // Listen to database metrics
    performanceCollector.on('databaseMetrics', (data) => {
      this.evaluateAlertRules('database', data);
    });

    // Listen to Redis metrics
    performanceCollector.on('redisMetrics', (data) => {
      this.evaluateAlertRules('redis', data);
    });

    logger.debug('Alert service event listeners setup completed');
  }

  /**
   * Start alert evaluation interval
   */
  startAlertEvaluation() {
    // Evaluate alert rules every 30 seconds
    setInterval(async () => {
      if (!this.isInitialized) return;

      try {
        await this.evaluateAllAlertRules();
      } catch (error) {
        logger.error('Error in alert evaluation interval:', error);
      }
    }, 30000);

    logger.debug('Alert evaluation interval started');
  }

  /**
   * Evaluate alert rules for specific category
   */
  async evaluateAlertRules(category, metrics) {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (rule.category !== category || !rule.enabled) {
        continue;
      }

      // Check if rule condition is met
      const isTriggered = this.evaluateRuleCondition(rule, metrics);

      if (isTriggered) {
        await this.triggerAlert(rule, metrics);
      }
    }
  }

  /**
   * Evaluate all alert rules
   */
  async evaluateAllAlertRules() {
    // Get current metrics
    const metrics = performanceCollector.getMetricsSnapshot();

    // Check suppression rules first
    const suppressedCategories = this.checkSuppressionRules(metrics);

    // Evaluate alert rules for each category
    for (const category of ['system', 'api', 'database', 'redis']) {
      if (suppressedCategories.includes(category)) {
        continue;
      }

      await this.evaluateAlertRules(category, metrics[category] || {});
    }

    // Check escalation rules
    await this.checkEscalationRules();
  }

  /**
   * Evaluate rule condition
   */
  evaluateRuleCondition(rule, metrics) {
    const metricValue = this.getMetricValue(rule.metric, metrics);

    if (metricValue === null) {
      return false;
    }

    const { operator, threshold, duration } = rule.condition;

    // Check threshold condition
    let thresholdMet = false;
    switch (operator) {
      case '>':
        thresholdMet = metricValue > threshold;
        break;
      case '<':
        thresholdMet = metricValue < threshold;
        break;
      case '>=':
        thresholdMet = metricValue >= threshold;
        break;
      case '<=':
        thresholdMet = metricValue <= threshold;
        break;
      case '=':
        thresholdMet = metricValue === threshold;
        break;
      case '!=':
        thresholdMet = metricValue !== threshold;
        break;
    }

    // For duration-based conditions, we'd need to check historical data
    // For simplicity, we'll just check the current value
    return thresholdMet;
  }

  /**
   * Get metric value from metrics data
   */
  getMetricValue(metricName, metrics) {
    // Handle different metric structures
    switch (metricName) {
      case 'cpu':
        return metrics.cpu?.[metrics.cpu?.length - 1]?.value || null;
      case 'memory':
        return metrics.memory?.[metrics.memory?.length - 1]?.value || null;
      case 'responseTime':
        return (
          metrics.responseTimes?.[metrics.responseTimes?.length - 1]?.value ||
          null
        );
      case 'errorRate':
        if (metrics.requestCount > 0) {
          return (metrics.errorCount / metrics.requestCount) * 100;
        }
        return null;
      default:
        return null;
    }
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(rule, metrics) {
    const metricValue = this.getMetricValue(rule.metric, metrics);
    const alertId = `${rule.id}-${Date.now()}`;

    try {
      // Check if similar alert already exists
      const existingAlert = await this.findExistingAlert(rule);

      if (existingAlert) {
        // Update existing alert
        await existingAlert.incrementOccurrence();
        logger.info(`Updated existing alert: ${existingAlert.alertId}`);
        return;
      }

      // Create new alert
      const alert = new PerformanceAlert({
        alertId,
        title: rule.name,
        description: this.generateAlertDescription(rule, metricValue),
        category: rule.category,
        type: 'threshold',
        severity: rule.severity,
        metric: rule.metric,
        currentValue: metricValue,
        threshold: rule.condition.threshold,
        operator: rule.condition.operator,
        unit: this.getMetricUnit(rule.metric),
        triggeredAt: new Date(),
        configId: rule.id,
        context: {
          rule: rule.id,
          metrics: this.extractRelevantMetrics(rule.metric, metrics),
        },
      });

      await alert.save();
      this.activeAlerts.set(alertId, alert);
      this.alertStats.totalCreated++;

      // Send notification
      await this.sendAlertNotification(alert);

      // Emit alert event
      this.emit('alertTriggered', alert);

      logger.info(`Alert triggered: ${alertId} - ${rule.name}`);
    } catch (error) {
      logger.error('Error triggering alert:', error);
    }
  }

  /**
   * Find existing alert for rule
   */
  async findExistingAlert(rule) {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000);

      return await PerformanceAlert.findOne({
        configId: rule.id,
        status: { $in: ['active', 'acknowledged'] },
        triggeredAt: { $gte: oneHourAgo },
      }).sort({ triggeredAt: -1 });
    } catch (error) {
      logger.error('Error finding existing alert:', error);
      return null;
    }
  }

  /**
   * Generate alert description
   */
  generateAlertDescription(rule, metricValue) {
    const { operator, threshold } = rule.condition;

    return `${rule.name}: ${rule.metric} is ${operator} ${threshold} (current value: ${metricValue})`;
  }

  /**
   * Get metric unit
   */
  getMetricUnit(metricName) {
    const units = {
      cpu: '%',
      memory: '%',
      responseTime: 'ms',
      errorRate: '%',
    };

    return units[metricName] || 'unknown';
  }

  /**
   * Extract relevant metrics for alert context
   */
  extractRelevantMetrics(metricName, metrics) {
    const relevantMetrics = {};

    // Extract metrics relevant to the alert
    switch (metricName) {
      case 'cpu':
        relevantMetrics.cpu = metrics.cpu?.slice(-5) || [];
        relevantMetrics.memory = metrics.memory?.slice(-5) || [];
        break;
      case 'memory':
        relevantMetrics.memory = metrics.memory?.slice(-5) || [];
        relevantMetrics.cpu = metrics.cpu?.slice(-5) || [];
        break;
      case 'responseTime':
        relevantMetrics.responseTimes = metrics.responseTimes?.slice(-10) || [];
        relevantMetrics.requestCount = metrics.requestCount;
        relevantMetrics.errorCount = metrics.errorCount;
        break;
      case 'errorRate':
        relevantMetrics.requestCount = metrics.requestCount;
        relevantMetrics.errorCount = metrics.errorCount;
        relevantMetrics.responseTimes = metrics.responseTimes?.slice(-10) || [];
        break;
    }

    return relevantMetrics;
  }

  /**
   * Check suppression rules
   */
  checkSuppressionRules(metrics) {
    const suppressedCategories = [];

    for (const [ruleId, rule] of this.suppressionRules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      const isSuppressed = this.evaluateSuppressionCondition(rule, metrics);

      if (isSuppressed) {
        suppressedCategories.push(...rule.action.categories);
        this.alertStats.totalSuppressed++;
      }
    }

    return suppressedCategories;
  }

  /**
   * Evaluate suppression condition
   */
  evaluateSuppressionCondition(rule, metrics) {
    const { type, property, operator, value } = rule.condition;

    // This is a simplified implementation
    // In a real system, you'd check actual system properties
    switch (property) {
      case 'maintenanceMode':
        // Check if system is in maintenance mode
        return false; // Placeholder
      case 'deploymentInProgress':
        // Check if deployment is in progress
        return false; // Placeholder
      default:
        return false;
    }
  }

  /**
   * Check escalation rules
   */
  async checkEscalationRules() {
    const now = Date.now();

    for (const [ruleId, rule] of this.escalationRules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      // Find alerts matching escalation condition
      const cutoffTime = new Date(now - rule.condition.unacknowledgedFor);

      const alertsToEscalate = await PerformanceAlert.find({
        severity: rule.condition.severity,
        status: 'active',
        triggeredAt: { $lte: cutoffTime },
        escalated: { $ne: true },
      });

      // Escalate each alert
      for (const alert of alertsToEscalate) {
        await this.escalateAlert(alert, rule);
      }
    }
  }

  /**
   * Escalate an alert
   */
  async escalateAlert(alert, rule) {
    try {
      // Mark alert as escalated
      alert.escalated = true;
      alert.escalationLevel = rule.action.level;
      alert.escalationChannels = rule.action.channels;
      await alert.save();

      // Send escalation notification
      await this.sendEscalationNotification(alert, rule);

      // Update statistics
      this.alertStats.totalEscalated++;

      // Emit escalation event
      this.emit('alertEscalated', alert);

      logger.info(
        `Alert escalated: ${alert.alertId} to level ${rule.action.level}`
      );
    } catch (error) {
      logger.error('Error escalating alert:', error);
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      // Create notification payload
      const notification = {
        id: `notification-${alert.alertId}`,
        type: 'alert',
        title: alert.title,
        message: alert.description,
        severity: alert.severity,
        timestamp: alert.triggeredAt,
        data: {
          alertId: alert.alertId,
          category: alert.category,
          metric: alert.metric,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
        },
      };

      // Send through alerting service
      await alertingService.processAlert(notification);

      logger.debug(`Alert notification sent: ${alert.alertId}`);
    } catch (error) {
      logger.error('Error sending alert notification:', error);
    }
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(alert, rule) {
    try {
      // Create escalation notification payload
      const notification = {
        id: `escalation-${alert.alertId}`,
        type: 'escalation',
        title: `Escalated: ${alert.title}`,
        message: `Alert has been escalated to ${rule.action.level} priority`,
        severity: 'critical',
        timestamp: new Date(),
        data: {
          alertId: alert.alertId,
          escalationLevel: rule.action.level,
          escalationChannels: rule.action.channels,
          originalSeverity: alert.severity,
        },
      };

      // Send through alerting service with specific channels
      await alertingService.processAlert(notification);

      logger.debug(`Escalation notification sent: ${alert.alertId}`);
    } catch (error) {
      logger.error('Error sending escalation notification:', error);
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId, userId, note = '') {
    try {
      const alert = await PerformanceAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.acknowledge(userId, note);
      this.alertStats.totalAcknowledged++;

      // Emit acknowledgment event
      this.emit('alertAcknowledged', alert);

      logger.info(`Alert acknowledged: ${alertId} by user ${userId}`);
      return alert;
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId, userId, note = '', method = 'manual') {
    try {
      const alert = await PerformanceAlert.findOne({ alertId });

      if (!alert) {
        throw new Error(`Alert not found: ${alertId}`);
      }

      await alert.resolve(userId, note, method);
      this.alertStats.totalResolved++;

      // Remove from active alerts
      this.activeAlerts.delete(alertId);

      // Emit resolution event
      this.emit('alertResolved', alert);

      logger.info(`Alert resolved: ${alertId} by user ${userId}`);
      return alert;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(filters = {}) {
    try {
      const query = {
        status: { $in: ['active', 'acknowledged'] },
        suppressed: { $ne: true },
      };

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }
      if (filters.severity) {
        query.severity = filters.severity;
      }
      if (filters.startTime) {
        query.triggeredAt = { $gte: filters.startTime };
      }
      if (filters.endTime) {
        query.triggeredAt = { ...query.triggeredAt, $lte: filters.endTime };
      }

      const alerts = await PerformanceAlert.find(query)
        .sort({ triggeredAt: -1 })
        .populate('acknowledgedBy', 'name email')
        .populate('resolvedBy', 'name email');

      // Update active alerts map
      alerts.forEach((alert) => {
        this.activeAlerts.set(alert.alertId, alert);
      });

      return alerts;
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats() {
    return {
      ...this.alertStats,
      activeAlerts: this.activeAlerts.size,
      configuredRules: this.alertRules.size,
      suppressionRules: this.suppressionRules.size,
      escalationRules: this.escalationRules.size,
    };
  }

  /**
   * Get alert rules
   */
  getAlertRules(category = null) {
    const rules = Array.from(this.alertRules.values());

    if (category) {
      return rules.filter((rule) => rule.category === category);
    }

    return rules;
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(ruleId, updates) {
    try {
      const rule = this.alertRules.get(ruleId);

      if (!rule) {
        throw new Error(`Alert rule not found: ${ruleId}`);
      }

      // Update rule
      Object.assign(rule, updates);
      this.alertRules.set(ruleId, rule);

      logger.info(`Alert rule updated: ${ruleId}`);
      return rule;
    } catch (error) {
      logger.error('Error updating alert rule:', error);
      throw error;
    }
  }

  /**
   * Shutdown alert service
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    logger.info('Shutting down performance alert service');

    // Clear all active alerts
    this.activeAlerts.clear();

    // Remove all event listeners
    this.removeAllListeners();

    this.isInitialized = false;
    logger.info('Performance alert service shut down');
  }
}

// Create and export singleton instance
const performanceAlertService = new PerformanceAlertService();

export default performanceAlertService;
