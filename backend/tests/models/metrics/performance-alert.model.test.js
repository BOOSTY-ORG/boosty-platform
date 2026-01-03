/**
 * Performance Alert Model Tests
 *
 * Tests for PerformanceAlert model including:
 * - Model validation
 * - Static methods
 * - Instance methods
 * - Middleware functionality
 * - Virtual fields
 */

const mongoose = require('mongoose');
const PerformanceAlert = require('../../../src/models/metrics/performance-alert.model.js');
const User = require('../../../src/models/user.model.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
  createMockRequest,
} = require('../../helpers/metrics.test.helpers.js');

describe('PerformanceAlert Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await PerformanceAlert.deleteMany({});
    await User.deleteMany({});
  });

  describe('Model Validation', () => {
    test('should create a valid performance alert', async () => {
      const userId = new mongoose.Types.ObjectId();
      const alertData = {
        alertId: 'system-cpu-high-1640995200000',
        title: 'High CPU Usage',
        description: 'CPU usage is above critical threshold',
        category: 'system',
        type: 'threshold',
        severity: 'critical',
        metric: 'cpu',
        currentValue: 95,
        threshold: 90,
        operator: '>',
        unit: 'percentage',
        triggeredAt: new Date(),
        status: 'active',
        occurrences: 1,
        maxOccurrences: 10,
        cooldownPeriod: 300000,
        context: { server: 'prod-server-01' },
        tags: ['server:prod', 'region:us-east-1'],
        configId: 'cpu-monitor-config',
        instanceId: 'server-001',
        environment: 'production',
      };

      const alert = new PerformanceAlert(alertData);
      const savedAlert = await alert.save();

      expect(savedAlert.alertId).toBe(alertData.alertId);
      expect(savedAlert.title).toBe(alertData.title);
      expect(savedAlert.description).toBe(alertData.description);
      expect(savedAlert.category).toBe(alertData.category);
      expect(savedAlert.type).toBe(alertData.type);
      expect(savedAlert.severity).toBe(alertData.severity);
      expect(savedAlert.metric).toBe(alertData.metric);
      expect(savedAlert.currentValue).toBe(alertData.currentValue);
      expect(savedAlert.threshold).toBe(alertData.threshold);
      expect(savedAlert.operator).toBe(alertData.operator);
      expect(savedAlert.unit).toBe(alertData.unit);
      expect(savedAlert.status).toBe(alertData.status);
      expect(savedAlert.occurrences).toBe(alertData.occurrences);
      expect(savedAlert.maxOccurrences).toBe(alertData.maxOccurrences);
      expect(savedAlert.cooldownPeriod).toBe(alertData.cooldownPeriod);
      expect(savedAlert.context).toEqual(alertData.context);
      expect(savedAlert.tags).toEqual(alertData.tags);
      expect(savedAlert.configId).toBe(alertData.configId);
      expect(savedAlert.instanceId).toBe(alertData.instanceId);
      expect(savedAlert.environment).toBe(alertData.environment);
    });

    test('should require alertId, title, description, category, type, severity, metric, currentValue, threshold, unit, and triggeredAt', async () => {
      const alert = new PerformanceAlert({});

      let error;
      try {
        await alert.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.alertId).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.type).toBeDefined();
      expect(error.errors.severity).toBeDefined();
      expect(error.errors.metric).toBeDefined();
      expect(error.errors.currentValue).toBeDefined();
      expect(error.errors.threshold).toBeDefined();
      expect(error.errors.unit).toBeDefined();
      expect(error.errors.triggeredAt).toBeDefined();
    });

    test('should validate category enum values', async () => {
      const alertData = {
        alertId: 'test-invalid-category',
        title: 'Test Alert',
        description: 'Test Description',
        category: 'invalid',
        type: 'threshold',
        severity: 'warning',
        metric: 'test',
        currentValue: 50,
        threshold: 45,
        unit: 'percentage',
        triggeredAt: new Date(),
      };

      const alert = new PerformanceAlert(alertData);

      let error;
      try {
        await alert.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    test('should validate type enum values', async () => {
      const alertData = {
        alertId: 'test-invalid-type',
        title: 'Test Alert',
        description: 'Test Description',
        category: 'system',
        type: 'invalid',
        severity: 'warning',
        metric: 'test',
        currentValue: 50,
        threshold: 45,
        unit: 'percentage',
        triggeredAt: new Date(),
      };

      const alert = new PerformanceAlert(alertData);

      let error;
      try {
        await alert.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.type).toBeDefined();
    });

    test('should validate severity enum values', async () => {
      const alertData = {
        alertId: 'test-invalid-severity',
        title: 'Test Alert',
        description: 'Test Description',
        category: 'system',
        type: 'threshold',
        severity: 'invalid',
        metric: 'test',
        currentValue: 50,
        threshold: 45,
        unit: 'percentage',
        triggeredAt: new Date(),
      };

      const alert = new PerformanceAlert(alertData);

      let error;
      try {
        await alert.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.severity).toBeDefined();
    });

    test('should validate operator enum values', async () => {
      const alertData = {
        alertId: 'test-invalid-operator',
        title: 'Test Alert',
        description: 'Test Description',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'test',
        currentValue: 50,
        threshold: 45,
        operator: 'invalid',
        unit: 'percentage',
        triggeredAt: new Date(),
      };

      const alert = new PerformanceAlert(alertData);

      let error;
      try {
        await alert.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.operator).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test alerts
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const userId = new mongoose.Types.ObjectId();

      const alerts = [
        {
          alertId: 'system-cpu-critical-1',
          title: 'Critical CPU Usage',
          description: 'CPU usage is critical',
          category: 'system',
          type: 'threshold',
          severity: 'critical',
          metric: 'cpu',
          currentValue: 95,
          threshold: 90,
          unit: 'percentage',
          triggeredAt: oneHourAgo,
          status: 'active',
        },
        {
          alertId: 'system-memory-warning-1',
          title: 'High Memory Usage',
          description: 'Memory usage is high',
          category: 'system',
          type: 'threshold',
          severity: 'warning',
          metric: 'memory',
          currentValue: 85,
          threshold: 80,
          unit: 'percentage',
          triggeredAt: now,
          status: 'active',
        },
        {
          alertId: 'api-response-warning-1',
          title: 'Slow API Response',
          description: 'API response time is slow',
          category: 'api',
          type: 'threshold',
          severity: 'warning',
          metric: 'response_time',
          currentValue: 600,
          threshold: 500,
          unit: 'milliseconds',
          triggeredAt: twoHoursAgo,
          status: 'acknowledged',
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
        },
        {
          alertId: 'database-connection-resolved-1',
          title: 'Database Connection Issue',
          description: 'Database connection issue',
          category: 'database',
          type: 'threshold',
          severity: 'critical',
          metric: 'connections',
          currentValue: 95,
          threshold: 90,
          unit: 'count',
          triggeredAt: twoHoursAgo,
          status: 'resolved',
          resolvedBy: userId,
          resolvedAt: new Date(),
        },
        {
          alertId: 'system-cpu-suppressed-1',
          title: 'Suppressed CPU Alert',
          description: 'CPU usage alert suppressed',
          category: 'system',
          type: 'threshold',
          severity: 'warning',
          metric: 'cpu',
          currentValue: 85,
          threshold: 80,
          unit: 'percentage',
          triggeredAt: oneHourAgo,
          status: 'active',
          suppressed: true,
          suppressionReason: 'Maintenance window',
        },
      ];

      await PerformanceAlert.insertMany(alerts);
    });

    test('findActive should return only active and unsuppressed alerts', async () => {
      const alerts = await PerformanceAlert.findActive();

      expect(alerts).toHaveLength(2);
      expect(alerts.every((a) => a.status === 'active' && !a.suppressed)).toBe(
        true
      );
    });

    test('findByCategoryAndSeverity should return alerts by category and severity', async () => {
      const alerts = await PerformanceAlert.findByCategoryAndSeverity(
        'system',
        'critical'
      );

      expect(alerts).toHaveLength(1);
      expect(alerts[0].category).toBe('system');
      expect(alerts[0].severity).toBe('critical');
    });

    test('findByTimeRange should return alerts within time range', async () => {
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);

      const alerts = await PerformanceAlert.findByTimeRange(
        ninetyMinutesAgo,
        now
      );

      expect(alerts).toHaveLength(3); // Alerts from last 90 minutes
    });

    test('findByMetric should return alerts by metric', async () => {
      const alerts = await PerformanceAlert.findByMetric('cpu');

      expect(alerts).toHaveLength(2);
      expect(alerts.every((a) => a.metric === 'cpu')).toBe(true);
    });

    test('getStatistics should return alert statistics', async () => {
      const stats = await PerformanceAlert.getStatistics();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toHaveProperty('total');
      expect(stats[0]).toHaveProperty('active');
      expect(stats[0]).toHaveProperty('acknowledged');
      expect(stats[0]).toHaveProperty('resolved');
      expect(stats[0]).toHaveProperty('critical');
      expect(stats[0]).toHaveProperty('warning');
      expect(stats[0]).toHaveProperty('info');
      expect(stats[0]).toHaveProperty('categoryStats');
      expect(stats[0]).toHaveProperty('byMetric');
    });

    test('findAlertsRequiringAttention should return alerts needing attention', async () => {
      const alerts = await PerformanceAlert.findAlertsRequiringAttention();

      expect(alerts.length).toBeGreaterThan(0);
      // Should include active alerts and old acknowledged alerts
      expect(alerts.some((a) => a.status === 'active')).toBe(true);
    });

    test('cleanupOldAlerts should delete old resolved alerts', async () => {
      // Create an old resolved alert
      const oldDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000); // 95 days ago
      await PerformanceAlert.create({
        alertId: 'old-resolved-alert',
        title: 'Old Resolved Alert',
        description: 'Old resolved alert',
        category: 'system',
        type: 'threshold',
        severity: 'info',
        metric: 'test',
        currentValue: 50,
        threshold: 45,
        unit: 'percentage',
        triggeredAt: oldDate,
        status: 'resolved',
        resolvedAt: oldDate,
      });

      const result = await PerformanceAlert.cleanupOldAlerts(90);
      expect(result.deletedCount).toBe(1);

      const oldAlert = await PerformanceAlert.findOne({
        alertId: 'old-resolved-alert',
      });
      expect(oldAlert).toBeNull();
    });

    test('findSimilarAlerts should find similar alerts', async () => {
      const alerts = await PerformanceAlert.findSimilarAlerts(
        'cpu',
        90,
        3600000
      );

      expect(alerts.length).toBeGreaterThan(0);
      expect(
        alerts.every((a) => a.metric === 'cpu' && a.threshold === 90)
      ).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    let testAlert;
    let userId;

    beforeEach(async () => {
      userId = new mongoose.Types.ObjectId();
      testAlert = await PerformanceAlert.create({
        alertId: 'test-alert-methods',
        title: 'Test Alert',
        description: 'Test alert for methods',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
        unit: 'percentage',
        triggeredAt: new Date(),
        status: 'active',
      });
    });

    test('acknowledge should acknowledge alert with user and note', async () => {
      await testAlert.acknowledge(userId, 'Investigating the issue');

      expect(testAlert.status).toBe('acknowledged');
      expect(testAlert.acknowledgedBy.toString()).toBe(userId.toString());
      expect(testAlert.acknowledgmentNote).toBe('Investigating the issue');
      expect(testAlert.acknowledgedAt).toBeDefined();
    });

    test('resolve should resolve alert with user, note, and method', async () => {
      await testAlert.resolve(userId, 'Fixed the issue', 'manual');

      expect(testAlert.status).toBe('resolved');
      expect(testAlert.resolvedBy.toString()).toBe(userId.toString());
      expect(testAlert.resolutionNote).toBe('Fixed the issue');
      expect(testAlert.resolutionMethod).toBe('manual');
      expect(testAlert.resolvedAt).toBeDefined();
      expect(testAlert.duration).toBeDefined();
    });

    test('suppress should suppress alert with user, reason, and duration', async () => {
      await testAlert.suppress(userId, 'Maintenance window', 7200000); // 2 hours

      expect(testAlert.suppressed).toBe(true);
      expect(testAlert.suppressionReason).toBe('Maintenance window');
      expect(testAlert.suppressedBy.toString()).toBe(userId.toString());
      expect(testAlert.suppressedUntil).toBeDefined();
    });

    test('isSuppressed should return correct suppression status', async () => {
      // Test not suppressed
      expect(testAlert.isSuppressed()).toBe(false);

      // Test suppressed with future date
      await testAlert.suppress(userId, 'Test', 3600000);
      expect(testAlert.isSuppressed()).toBe(true);

      // Test suppressed with past date
      testAlert.suppressedUntil = new Date(Date.now() - 3600000);
      expect(testAlert.isSuppressed()).toBe(false);
    });

    test('canNotify should return correct notification status', async () => {
      // Test with no nextNotification
      expect(testAlert.canNotify()).toBe(true);

      // Test with future nextNotification
      testAlert.nextNotification = new Date(Date.now() + 3600000);
      expect(testAlert.canNotify()).toBe(false);

      // Test with past nextNotification
      testAlert.nextNotification = new Date(Date.now() - 3600000);
      expect(testAlert.canNotify()).toBe(true);

      // Test when suppressed
      await testAlert.suppress(userId, 'Test');
      expect(testAlert.canNotify()).toBe(false);
    });

    test('updateNextNotification should update next notification time', async () => {
      const originalNextNotification = testAlert.nextNotification;
      await testAlert.updateNextNotification();

      expect(testAlert.nextNotification).not.toEqual(originalNextNotification);
      expect(testAlert.nextNotification.getTime()).toBeGreaterThan(Date.now());
    });

    test('incrementOccurrence should increment occurrence count', async () => {
      const originalOccurrences = testAlert.occurrences;
      const originalLastOccurrence = testAlert.lastOccurrence;

      await testAlert.incrementOccurrence();

      expect(testAlert.occurrences).toBe(originalOccurrences + 1);
      expect(testAlert.lastOccurrence.getTime()).toBeGreaterThan(
        originalLastOccurrence.getTime()
      );
    });

    test('incrementOccurrence should suppress when max occurrences reached', async () => {
      testAlert.occurrences = testAlert.maxOccurrences - 1;
      await testAlert.incrementOccurrence();

      expect(testAlert.status).toBe('suppressed');
      expect(testAlert.suppressionReason).toBe('Max occurrences reached');
    });

    test('getAgeInSeconds should return age in seconds', () => {
      const triggeredAt = new Date(Date.now() - 5000); // 5 seconds ago
      testAlert.triggeredAt = triggeredAt;

      const age = testAlert.getAgeInSeconds();
      expect(age).toBeGreaterThanOrEqual(4);
      expect(age).toBeLessThanOrEqual(6);
    });

    test('getFormattedDuration should return formatted duration', async () => {
      await testAlert.resolve(userId, 'Test');

      testAlert.duration = 3665; // 1 hour, 1 minute, 5 seconds
      const formatted = testAlert.getFormattedDuration();

      expect(formatted).toBe('1h 1m 5s');

      testAlert.duration = 65; // 1 minute, 5 seconds
      expect(testAlert.getFormattedDuration()).toBe('1m 5s');

      testAlert.duration = 5; // 5 seconds
      expect(testAlert.getFormattedDuration()).toBe('5s');
    });

    test('isStale should return correct stale status', async () => {
      // Test fresh alert
      expect(testAlert.isStale()).toBe(false);

      // Test stale alert (default 24 hours)
      testAlert.triggeredAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      expect(testAlert.isStale()).toBe(true);

      // Test with custom threshold
      expect(testAlert.isStale(30 * 60 * 60 * 1000)).toBe(false);
    });
  });

  describe('Virtual Fields', () => {
    let testAlert;

    beforeEach(async () => {
      testAlert = new PerformanceAlert({
        alertId: 'test-virtual-fields',
        title: 'Test Alert',
        description: 'Test virtual fields',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
        unit: 'percentage',
        triggeredAt: new Date(),
        status: 'active',
      });
    });

    test('isAcknowledged virtual should return correct status', () => {
      testAlert.status = 'acknowledged';
      expect(testAlert.isAcknowledged).toBe(true);

      testAlert.status = 'active';
      expect(testAlert.isAcknowledged).toBe(false);
    });

    test('isResolved virtual should return correct status', () => {
      testAlert.status = 'resolved';
      expect(testAlert.isResolved).toBe(true);

      testAlert.status = 'active';
      expect(testAlert.isResolved).toBe(false);
    });

    test('isActive virtual should return correct status', () => {
      testAlert.status = 'active';
      testAlert.suppressed = false;
      expect(testAlert.isActive).toBe(true);

      testAlert.status = 'acknowledged';
      expect(testAlert.isActive).toBe(false);

      testAlert.status = 'active';
      testAlert.suppressed = true;
      testAlert.suppressedUntil = new Date(Date.now() + 3600000);
      expect(testAlert.isActive).toBe(false);
    });
  });

  describe('Middleware', () => {
    test('pre-save middleware should set alertId if not provided', async () => {
      const alert = new PerformanceAlert({
        title: 'Test Alert',
        description: 'Test description',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
        unit: 'percentage',
        triggeredAt: new Date(),
      });

      await alert.save();
      expect(alert.alertId).toBeDefined();
      expect(alert.alertId).toMatch(/^system-cpu-\d+$/);
    });

    test('pre-save middleware should update lastOccurrence when status changes to active', async () => {
      const alert = new PerformanceAlert({
        alertId: 'test-last-occurrence',
        title: 'Test Alert',
        description: 'Test description',
        category: 'system',
        type: 'threshold',
        severity: 'warning',
        metric: 'cpu',
        currentValue: 85,
        threshold: 80,
        unit: 'percentage',
        triggeredAt: new Date(),
        status: 'acknowledged',
      });

      await alert.save();
      const originalLastOccurrence = alert.lastOccurrence;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      alert.status = 'active';
      await alert.save();

      expect(alert.lastOccurrence.getTime()).toBeGreaterThan(
        originalLastOccurrence.getTime()
      );
    });
  });
});
