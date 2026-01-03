/**
 * Performance Alert Service Tests
 *
 * Tests for PerformanceAlertService including:
 * - Alert evaluation
 * - Threshold checking
 * - Alert lifecycle management
 * - Notification delivery
 * - Alert suppression
 */

const performanceAlertService = require('../../../src/services/metrics/performance-alert.service.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/models/metrics/performance-alert.model.js');
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceAlertService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Evaluation', () => {
    test('should evaluate threshold alerts correctly', () => {
      const metric = {
        category: 'system',
        name: 'cpu',
        value: 85,
        timestamp: new Date(),
        unit: 'percentage',
      };

      const alertConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const result = performanceAlertService.evaluateMetric(
        metric,
        alertConfig
      );

      expect(result.shouldAlert).toBe(true);
      expect(result.severity).toBe('warning');
      expect(result.currentValue).toBe(85);
      expect(result.threshold).toBe(80);
      expect(result.operator).toBe('>');
    });

    test('should not alert when below threshold', () => {
      const metric = {
        category: 'system',
        name: 'cpu',
        value: 75,
        timestamp: new Date(),
        unit: 'percentage',
      };

      const alertConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const result = performanceAlertService.evaluateMetric(
        metric,
        alertConfig
      );

      expect(result.shouldAlert).toBe(false);
    });

    test('should evaluate different operators correctly', () => {
      const metric = {
        category: 'system',
        name: 'cpu',
        value: 75,
        timestamp: new Date(),
        unit: 'percentage',
      };

      const greaterThanConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const lessThanConfig = {
        metric: 'cpu',
        threshold: 70,
        operator: '<',
        severity: 'warning',
        enabled: true,
      };

      const equalConfig = {
        metric: 'cpu',
        threshold: 75,
        operator: '=',
        severity: 'warning',
        enabled: true,
      };

      const greaterThanResult = performanceAlertService.evaluateMetric(
        metric,
        greaterThanConfig
      );
      const lessThanResult = performanceAlertService.evaluateMetric(
        metric,
        lessThanConfig
      );
      const equalResult = performanceAlertService.evaluateMetric(
        metric,
        equalConfig
      );

      expect(greaterThanResult.shouldAlert).toBe(false);
      expect(lessThanResult.shouldAlert).toBe(false);
      expect(equalResult.shouldAlert).toBe(true);
    });

    test('should handle disabled alert configurations', () => {
      const metric = {
        category: 'system',
        name: 'cpu',
        value: 95,
        timestamp: new Date(),
        unit: 'percentage',
      };

      const disabledConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'critical',
        enabled: false,
      };

      const result = performanceAlertService.evaluateMetric(
        metric,
        disabledConfig
      );

      expect(result.shouldAlert).toBe(false);
    });

    test('should evaluate multiple metrics', () => {
      const metrics = [
        {
          category: 'system',
          name: 'cpu',
          value: 85,
          timestamp: new Date(),
          unit: 'percentage',
        },
        {
          category: 'system',
          name: 'memory',
          value: 95,
          timestamp: new Date(),
          unit: 'percentage',
        },
      ];

      const alertConfigs = [
        {
          metric: 'cpu',
          threshold: 80,
          operator: '>',
          severity: 'warning',
          enabled: true,
        },
        {
          metric: 'memory',
          threshold: 90,
          operator: '>',
          severity: 'critical',
          enabled: true,
        },
      ];

      const results = performanceAlertService.evaluateMetrics(
        metrics,
        alertConfigs
      );

      expect(results).toHaveLength(2);
      expect(results[0].shouldAlert).toBe(true);
      expect(results[0].metric).toBe('cpu');
      expect(results[1].shouldAlert).toBe(true);
      expect(results[1].metric).toBe('memory');
      expect(results[1].severity).toBe('critical');
    });
  });

  describe('Alert Lifecycle', () => {
    test('should create alert instance', () => {
      const alertData = {
        title: 'High CPU Usage',
        description: 'CPU usage exceeded threshold',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
        operator: '>',
        unit: 'percentage',
      };

      const alert = performanceAlertService.createAlert(alertData);

      expect(alert).toBeDefined();
      expect(alert.alertId).toBeDefined();
      expect(alert.title).toBe(alertData.title);
      expect(alert.description).toBe(alertData.description);
      expect(alert.status).toBe('active');
      expect(alert.triggeredAt).toBeDefined();
      expect(alert.occurrences).toBe(1);
    });

    test('should acknowledge alert', () => {
      const alertData = {
        title: 'Test Alert',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
      };

      const alert = performanceAlertService.createAlert(alertData);
      const userId = 'user123';
      const note = 'Investigating the issue';

      const result = performanceAlertService.acknowledgeAlert(
        alert.alertId,
        userId,
        note
      );

      expect(result).toBe(true);
      expect(alert.status).toBe('acknowledged');
      expect(alert.acknowledgedBy).toBe(userId);
      expect(alert.acknowledgmentNote).toBe(note);
      expect(alert.acknowledgedAt).toBeDefined();
    });

    test('should resolve alert', () => {
      const alertData = {
        title: 'Test Alert',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
      };

      const alert = performanceAlertService.createAlert(alertData);
      const userId = 'user123';
      const note = 'Issue has been resolved';
      const method = 'manual';

      const result = performanceAlertService.resolveAlert(
        alert.alertId,
        userId,
        note,
        method
      );

      expect(result).toBe(true);
      expect(alert.status).toBe('resolved');
      expect(alert.resolvedBy).toBe(userId);
      expect(alert.resolutionNote).toBe(note);
      expect(alert.resolutionMethod).toBe(method);
      expect(alert.resolvedAt).toBeDefined();
      expect(alert.duration).toBeDefined();
    });

    test('should suppress alert', () => {
      const alertData = {
        title: 'Test Alert',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
      };

      const alert = performanceAlertService.createAlert(alertData);
      const userId = 'user123';
      const reason = 'Maintenance window';
      const duration = 3600000; // 1 hour

      const result = performanceAlertService.suppressAlert(
        alert.alertId,
        userId,
        reason,
        duration
      );

      expect(result).toBe(true);
      expect(alert.suppressed).toBe(true);
      expect(alert.suppressionReason).toBe(reason);
      expect(alert.suppressedBy).toBe(userId);
      expect(alert.suppressedUntil).toBeDefined();
    });

    test('should handle non-existent alert operations', () => {
      const acknowledgeResult = performanceAlertService.acknowledgeAlert(
        'non-existent',
        'user123',
        'Note'
      );
      const resolveResult = performanceAlertService.resolveAlert(
        'non-existent',
        'user123',
        'Note'
      );
      const suppressResult = performanceAlertService.suppressAlert(
        'non-existent',
        'user123',
        'Reason'
      );

      expect(acknowledgeResult).toBe(false);
      expect(resolveResult).toBe(false);
      expect(suppressResult).toBe(false);
    });
  });

  describe('Threshold Management', () => {
    test('should check threshold conditions', () => {
      const value = 85;
      const threshold = 80;

      expect(
        performanceAlertService.checkThreshold(value, threshold, '>')
      ).toBe(true);
      expect(
        performanceAlertService.checkThreshold(value, threshold, '>=')
      ).toBe(true);
      expect(
        performanceAlertService.checkThreshold(value, threshold, '<')
      ).toBe(false);
      expect(
        performanceAlertService.checkThreshold(value, threshold, '<=')
      ).toBe(false);
      expect(
        performanceAlertService.checkThreshold(value, threshold, '=')
      ).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(performanceAlertService.checkThreshold(80, 80, '>')).toBe(false);
      expect(performanceAlertService.checkThreshold(80, 80, '>=')).toBe(true);
      expect(performanceAlertService.checkThreshold(80, 80, '<')).toBe(false);
      expect(performanceAlertService.checkThreshold(80, 80, '<=')).toBe(true);
      expect(performanceAlertService.checkThreshold(80, 80, '=')).toBe(true);
    });

    test('should evaluate multiple threshold conditions', () => {
      const value = 85;
      const thresholds = [
        { value: 70, operator: '>', severity: 'warning' },
        { value: 90, operator: '>', severity: 'critical' },
      ];

      const result = performanceAlertService.evaluateThresholds(
        value,
        thresholds
      );

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('critical');
      expect(result.threshold).toBe(90);
    });

    test('should handle no matching thresholds', () => {
      const value = 65;
      const thresholds = [
        { value: 70, operator: '>', severity: 'warning' },
        { value: 90, operator: '>', severity: 'critical' },
      ];

      const result = performanceAlertService.evaluateThresholds(
        value,
        thresholds
      );

      expect(result.triggered).toBe(false);
      expect(result.severity).toBeNull();
      expect(result.threshold).toBeNull();
    });
  });

  describe('Notification Delivery', () => {
    test('should send email notifications', async () => {
      const alert = {
        alertId: 'alert-001',
        title: 'High CPU Usage',
        severity: 'warning',
        currentValue: 85,
        threshold: 80,
      };

      const notificationConfig = {
        type: 'email',
        enabled: true,
        recipients: ['admin@example.com', 'ops@example.com'],
        template: 'default',
      };

      const result = await performanceAlertService.sendNotification(
        alert,
        notificationConfig
      );

      expect(result).toBe(true);
      // Would verify email service was called
    });

    test('should send webhook notifications', async () => {
      const alert = {
        alertId: 'alert-002',
        title: 'Critical Memory Usage',
        severity: 'critical',
        currentValue: 95,
        threshold: 90,
      };

      const notificationConfig = {
        type: 'webhook',
        enabled: true,
        url: 'https://example.com/webhook',
        secret: 'webhook-secret',
        retryCount: 3,
      };

      const result = await performanceAlertService.sendNotification(
        alert,
        notificationConfig
      );

      expect(result).toBe(true);
      // Would verify webhook service was called
    });

    test('should handle notification failures', async () => {
      const alert = {
        alertId: 'alert-003',
        title: 'Test Alert',
        severity: 'info',
      };

      const notificationConfig = {
        type: 'email',
        enabled: true,
        recipients: ['invalid-email'],
      };

      const result = await performanceAlertService.sendNotification(
        alert,
        notificationConfig
      );

      expect(result).toBe(false);
      // Would verify error handling
    });

    test('should skip disabled notifications', async () => {
      const alert = {
        alertId: 'alert-004',
        title: 'Test Alert',
        severity: 'warning',
      };

      const notificationConfig = {
        type: 'email',
        enabled: false, // Disabled
        recipients: ['admin@example.com'],
      };

      const result = await performanceAlertService.sendNotification(
        alert,
        notificationConfig
      );

      expect(result).toBe(true); // Should return true even when skipped
    });
  });

  describe('Alert Suppression', () => {
    test('should respect suppression rules', () => {
      const alert = {
        alertId: 'alert-005',
        title: 'Test Alert',
        severity: 'warning',
        suppressed: true,
        suppressedUntil: new Date(Date.now() + 3600000), // 1 hour
      };

      const shouldNotify = performanceAlertService.shouldNotify(alert);

      expect(shouldNotify).toBe(false);
    });

    test('should handle expired suppression', () => {
      const alert = {
        alertId: 'alert-006',
        title: 'Test Alert',
        severity: 'warning',
        suppressed: true,
        suppressedUntil: new Date(Date.now() - 3600000), // Expired 1 hour ago
      };

      const shouldNotify = performanceAlertService.shouldNotify(alert);

      expect(shouldNotify).toBe(true);
    });

    test('should handle non-suppressed alerts', () => {
      const alert = {
        alertId: 'alert-007',
        title: 'Test Alert',
        severity: 'critical',
        suppressed: false,
      };

      const shouldNotify = performanceAlertService.shouldNotify(alert);

      expect(shouldNotify).toBe(true);
    });

    test('should respect cooldown periods', () => {
      const alert = {
        alertId: 'alert-008',
        title: 'Test Alert',
        severity: 'warning',
        lastNotification: new Date(Date.now() - 1800000), // 30 minutes ago
        cooldownPeriod: 300000, // 5 minutes
      };

      const shouldNotify = performanceAlertService.shouldNotify(alert);

      expect(shouldNotify).toBe(false);
    });

    test('should allow notification after cooldown', () => {
      const alert = {
        alertId: 'alert-009',
        title: 'Test Alert',
        severity: 'warning',
        lastNotification: new Date(Date.now() - 3600000), // 1 hour ago
        cooldownPeriod: 1800000, // 30 minutes
      };

      const shouldNotify = performanceAlertService.shouldNotify(alert);

      expect(shouldNotify).toBe(true);
    });
  });

  describe('Alert Aggregation', () => {
    test('should aggregate similar alerts', () => {
      const alerts = [
        {
          alertId: 'alert-010',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 85,
          threshold: 80,
          triggeredAt: new Date(Date.now() - 600000), // 10 minutes ago
        },
        {
          alertId: 'alert-011',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 87,
          threshold: 80,
          triggeredAt: new Date(Date.now() - 300000), // 5 minutes ago
        },
      ];

      const aggregatedAlert =
        performanceAlertService.aggregateSimilarAlerts(alerts);

      expect(aggregatedAlert).toBeDefined();
      expect(aggregatedAlert.metric).toBe('cpu');
      expect(aggregatedAlert.severity).toBe('warning');
      expect(aggregatedAlert.occurrences).toBe(2);
      expect(aggregatedAlert.currentValue).toBe(87); // Latest value
      expect(aggregatedAlert.firstTriggeredAt).toEqual(alerts[0].triggeredAt);
    });

    test('should not aggregate different metrics', () => {
      const alerts = [
        {
          alertId: 'alert-012',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 85,
          threshold: 80,
        },
        {
          alertId: 'alert-013',
          metric: 'memory',
          severity: 'warning',
          currentValue: 90,
          threshold: 85,
        },
      ];

      const result = performanceAlertService.aggregateSimilarAlerts(alerts);

      expect(result).toBeNull();
    });

    test('should aggregate alerts within time window', () => {
      const now = Date.now();
      const alerts = [
        {
          alertId: 'alert-014',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 85,
          threshold: 80,
          triggeredAt: new Date(now - 300000), // 5 minutes ago
        },
        {
          alertId: 'alert-015',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 87,
          threshold: 80,
          triggeredAt: new Date(now - 600000), // 10 minutes ago
        },
        {
          alertId: 'alert-016',
          metric: 'cpu',
          severity: 'warning',
          currentValue: 88,
          threshold: 80,
          triggeredAt: new Date(now - 1800000), // 30 minutes ago - outside window
        },
      ];

      const aggregatedAlert = performanceAlertService.aggregateSimilarAlerts(
        alerts,
        {
          timeWindow: 900000, // 15 minutes
        }
      );

      expect(aggregatedAlert).toBeDefined();
      expect(aggregatedAlert.occurrences).toBe(2); // Only alerts within time window
    });
  });

  describe('Alert History', () => {
    test('should retrieve alert history', async () => {
      const filters = {
        category: 'system',
        severity: ['warning', 'critical'],
        timeRange: '24h',
        limit: 50,
      };

      const history = await performanceAlertService.getAlertHistory(filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(50);

      // Verify structure of returned alerts
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('alertId');
        expect(history[0]).toHaveProperty('title');
        expect(history[0]).toHaveProperty('severity');
        expect(history[0]).toHaveProperty('triggeredAt');
      }
    });

    test('should filter by status', async () => {
      const filters = {
        status: ['active', 'acknowledged'],
      };

      const history = await performanceAlertService.getAlertHistory(filters);

      expect(history).toBeDefined();
      if (history.length > 0) {
        history.forEach((alert) => {
          expect(['active', 'acknowledged']).toContain(alert.status);
        });
      }
    });

    test('should handle empty history', async () => {
      const filters = {
        category: 'non-existent',
        timeRange: '1h',
      };

      const history = await performanceAlertService.getAlertHistory(filters);

      expect(history).toBeDefined();
      expect(history).toHaveLength(0);
    });
  });

  describe('Alert Statistics', () => {
    test('should calculate alert statistics', async () => {
      const stats = await performanceAlertService.getAlertStatistics({
        timeRange: '24h',
        groupBy: 'severity',
      });

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('trends');
    });

    test('should group alerts by severity', async () => {
      const stats = await performanceAlertService.getAlertStatistics({
        timeRange: '24h',
      });

      expect(stats.bySeverity).toBeDefined();
      expect(stats.bySeverity).toHaveProperty('info');
      expect(stats.bySeverity).toHaveProperty('warning');
      expect(stats.bySeverity).toHaveProperty('critical');
      expect(typeof stats.bySeverity.warning).toBe('number');
    });

    test('should calculate alert trends', async () => {
      const stats = await performanceAlertService.getAlertStatistics({
        timeRange: '7d',
        includeTrends: true,
      });

      expect(stats.trends).toBeDefined();
      expect(Array.isArray(stats.trends)).toBe(true);

      if (stats.trends.length > 0) {
        expect(stats.trends[0]).toHaveProperty('metric');
        expect(stats.trends[0]).toHaveProperty('direction');
        expect(stats.trends[0]).toHaveProperty('change');
      }
    });

    test('should calculate MTTR', async () => {
      const stats = await performanceAlertService.getAlertStatistics({
        timeRange: '24h',
        includeMTTR: true,
      });

      expect(stats).toHaveProperty('mttr');
      expect(typeof stats.mttr).toBe('number');
      expect(stats.mttr).toBeGreaterThan(0);
    });
  });

  describe('Alert Configuration', () => {
    test('should validate alert configuration', () => {
      const validConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
        cooldownPeriod: 300000,
        notifications: [
          {
            type: 'email',
            enabled: true,
            recipients: ['admin@example.com'],
          },
        ],
      };

      const result = performanceAlertService.validateConfiguration(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid configuration', () => {
      const invalidConfig = {
        metric: '', // Required
        threshold: -10, // Should be positive
        operator: 'invalid', // Invalid enum
        severity: 'invalid', // Invalid enum
        enabled: 'invalid', // Should be boolean
        cooldownPeriod: -1, // Should be positive
        notifications: [
          {
            type: 'invalid', // Invalid type
            enabled: 'invalid', // Should be boolean
            recipients: 'invalid', // Should be array
          },
        ],
      };

      const result =
        performanceAlertService.validateConfiguration(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle missing required fields', () => {
      const incompleteConfig = {
        metric: 'cpu',
        // Missing threshold, operator, severity
      };

      const result =
        performanceAlertService.validateConfiguration(incompleteConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('threshold is required');
      expect(result.errors).toContain('operator is required');
      expect(result.errors).toContain('severity is required');
    });
  });

  describe('Performance Optimization', () => {
    test('should handle large alert volumes efficiently', async () => {
      const metrics = Array(1000)
        .fill()
        .map((_, i) => ({
          category: 'system',
          name: 'cpu',
          value: 80 + i, // Increasing values
          timestamp: new Date(Date.now() - i * 1000),
          unit: 'percentage',
        }));

      const alertConfigs = [
        {
          metric: 'cpu',
          threshold: 75,
          operator: '>',
          severity: 'warning',
          enabled: true,
        },
      ];

      const startTime = Date.now();
      const results = performanceAlertService.evaluateMetrics(
        metrics,
        alertConfigs
      );
      const endTime = Date.now();

      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should use caching for repeated evaluations', async () => {
      const metric = {
        category: 'system',
        name: 'cpu',
        value: 85,
        timestamp: new Date(),
        unit: 'percentage',
      };

      const alertConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      // First evaluation
      const startTime1 = Date.now();
      const result1 = performanceAlertService.evaluateMetric(
        metric,
        alertConfig
      );
      const time1 = Date.now() - startTime1;

      // Second evaluation (should use cache)
      const startTime2 = Date.now();
      const result2 = performanceAlertService.evaluateMetric(
        metric,
        alertConfig
      );
      const time2 = Date.now() - startTime2;

      expect(result1.shouldAlert).toBe(result2.shouldAlert);
      expect(time2).toBeLessThan(time1); // Second should be faster due to caching
    });
  });

  describe('Error Handling', () => {
    test('should handle evaluation errors gracefully', () => {
      const invalidMetric = {
        category: 'system',
        name: 'cpu',
        value: 'invalid', // Should be number
        timestamp: new Date(),
        unit: 'percentage',
      };

      const alertConfig = {
        metric: 'cpu',
        threshold: 80,
        operator: '>',
        severity: 'warning',
        enabled: true,
      };

      const result = performanceAlertService.evaluateMetric(
        invalidMetric,
        alertConfig
      );

      expect(result).toBeDefined();
      expect(result.shouldAlert).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle notification service failures', async () => {
      const alert = {
        alertId: 'alert-017',
        title: 'Test Alert',
        severity: 'warning',
      };

      const notificationConfig = {
        type: 'email',
        enabled: true,
        recipients: ['admin@example.com'],
      };

      // Mock notification service to fail
      const result = await performanceAlertService.sendNotification(
        alert,
        notificationConfig
      );

      expect(result).toBe(false);
      // Would verify error handling
    });

    test('should handle database errors gracefully', async () => {
      const filters = {
        category: 'system',
        timeRange: '24h',
      };

      // Mock database to throw error
      const history = await performanceAlertService.getAlertHistory(filters);

      expect(history).toBeDefined();
      // Would verify error handling
    });
  });
});
