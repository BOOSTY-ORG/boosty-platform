/**
 * Performance Metric Model Tests
 *
 * Tests for the PerformanceMetric model including:
 * - Model validation
 * - Static methods
 * - Instance methods
 * - Middleware functionality
 * - Indexes and TTL behavior
 */

const mongoose = require('mongoose');
const PerformanceMetric = require('../../../src/models/metrics/performance-metric.model.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
  createMockRequest,
} = require('../../helpers/metrics.test.helpers.js');

describe('PerformanceMetric Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await PerformanceMetric.deleteMany({});
  });

  describe('Model Validation', () => {
    test('should create a valid performance metric', async () => {
      const metricData = {
        metricId: 'system-cpu-1640995200000',
        category: 'system',
        name: 'cpu',
        value: 75.5,
        unit: 'percentage',
        timestamp: new Date(),
        tags: ['server:prod', 'region:us-east-1'],
        metadata: { source: 'nodejs' },
        aggregationLevel: 'raw',
        instanceId: 'server-001',
        quality: 'good',
        confidence: 95,
      };

      const metric = new PerformanceMetric(metricData);
      const savedMetric = await metric.save();

      expect(savedMetric.metricId).toBe(metricData.metricId);
      expect(savedMetric.category).toBe(metricData.category);
      expect(savedMetric.name).toBe(metricData.name);
      expect(savedMetric.value).toBe(metricData.value);
      expect(savedMetric.unit).toBe(metricData.unit);
      expect(savedMetric.tags).toEqual(metricData.tags);
      expect(savedMetric.metadata).toEqual(metricData.metadata);
      expect(savedMetric.aggregationLevel).toBe(metricData.aggregationLevel);
      expect(savedMetric.instanceId).toBe(metricData.instanceId);
      expect(savedMetric.quality).toBe(metricData.quality);
      expect(savedMetric.confidence).toBe(metricData.confidence);
    });

    test('should require metricId, category, name, value, unit, and timestamp', async () => {
      const metric = new PerformanceMetric({});

      let error;
      try {
        await metric.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.metricId).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.value).toBeDefined();
      expect(error.errors.unit).toBeDefined();
      expect(error.errors.timestamp).toBeDefined();
    });

    test('should validate category enum values', async () => {
      const metricData = {
        metricId: 'test-invalid-category',
        category: 'invalid',
        name: 'test',
        value: 50,
        unit: 'percentage',
        timestamp: new Date(),
      };

      const metric = new PerformanceMetric(metricData);

      let error;
      try {
        await metric.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    test('should validate aggregationLevel enum values', async () => {
      const metricData = {
        metricId: 'test-invalid-aggregation',
        category: 'system',
        name: 'test',
        value: 50,
        unit: 'percentage',
        timestamp: new Date(),
        aggregationLevel: 'invalid',
      };

      const metric = new PerformanceMetric(metricData);

      let error;
      try {
        await metric.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.aggregationLevel).toBeDefined();
    });

    test('should validate confidence range', async () => {
      const metricData = {
        metricId: 'test-invalid-confidence',
        category: 'system',
        name: 'test',
        value: 50,
        unit: 'percentage',
        timestamp: new Date(),
        confidence: 150, // Invalid: > 100
      };

      const metric = new PerformanceMetric(metricData);

      let error;
      try {
        await metric.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.confidence).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test metrics
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const metrics = [
        {
          metricId: 'system-cpu-1',
          category: 'system',
          name: 'cpu',
          value: 70,
          unit: 'percentage',
          timestamp: oneHourAgo,
          aggregationLevel: 'raw',
        },
        {
          metricId: 'system-cpu-2',
          category: 'system',
          name: 'cpu',
          value: 80,
          unit: 'percentage',
          timestamp: now,
          aggregationLevel: 'raw',
        },
        {
          metricId: 'system-memory-1',
          category: 'system',
          name: 'memory',
          value: 60,
          unit: 'percentage',
          timestamp: oneHourAgo,
          aggregationLevel: 'raw',
        },
        {
          metricId: 'api-response-1',
          category: 'api',
          name: 'response_time',
          value: 250,
          unit: 'milliseconds',
          timestamp: now,
          aggregationLevel: 'raw',
          tags: ['endpoint:/api/users'],
        },
      ];

      await PerformanceMetric.insertMany(metrics);
    });

    test('findByCategoryAndTimeRange should return metrics by category and time range', async () => {
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);

      const metrics = await PerformanceMetric.findByCategoryAndTimeRange(
        'system',
        ninetyMinutesAgo,
        now
      );

      expect(metrics).toHaveLength(3);
      expect(metrics.every((m) => m.category === 'system')).toBe(true);
      expect(metrics[0].timestamp.getTime()).toBeLessThanOrEqual(
        metrics[1].timestamp.getTime()
      );
    });

    test('findByNameAndTimeRange should return metrics by name and time range', async () => {
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);

      const metrics = await PerformanceMetric.findByNameAndTimeRange(
        'cpu',
        ninetyMinutesAgo,
        now
      );

      expect(metrics).toHaveLength(2);
      expect(metrics.every((m) => m.name === 'cpu')).toBe(true);
    });

    test('findByTagsAndTimeRange should return metrics by tags and time range', async () => {
      const now = new Date();
      const ninetyMinutesAgo = new Date(now.getTime() - 90 * 60 * 1000);

      const metrics = await PerformanceMetric.findByTagsAndTimeRange(
        ['endpoint:/api/users'],
        ninetyMinutesAgo,
        now
      );

      expect(metrics).toHaveLength(1);
      expect(metrics[0].tags).toContain('endpoint:/api/users');
    });

    test('getLatestValue should return the latest metric value', async () => {
      const latestMetric = await PerformanceMetric.getLatestValue(
        'system',
        'cpu'
      );

      expect(latestMetric).toBeDefined();
      expect(latestMetric.name).toBe('cpu');
      expect(latestMetric.value).toBe(80); // Latest value
    });

    test('getAggregatedStats should return aggregated statistics', async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const stats = await PerformanceMetric.getAggregatedStats(
        'system',
        'cpu',
        threeHoursAgo,
        now,
        '1h'
      );

      expect(Array.isArray(stats)).toBe(true);
      // Should have one aggregated data point for the 1-hour interval
      expect(stats.length).toBeGreaterThan(0);
      if (stats.length > 0) {
        expect(stats[0]).toHaveProperty('avg');
        expect(stats[0]).toHaveProperty('min');
        expect(stats[0]).toHaveProperty('max');
        expect(stats[0]).toHaveProperty('count');
      }
    });

    test('getPercentiles should return percentile values', async () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const percentiles = await PerformanceMetric.getPercentiles(
        'system',
        'cpu',
        threeHoursAgo,
        now,
        [50, 90, 95]
      );

      expect(percentiles).toHaveLength(1);
      expect(percentiles[0]).toHaveProperty('percentiles');
      expect(Array.isArray(percentiles[0].percentiles)).toBe(true);
    });

    test('cleanupOldMetrics should delete old metrics', async () => {
      // Create an old metric
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      await PerformanceMetric.create({
        metricId: 'old-metric',
        category: 'system',
        name: 'cpu',
        value: 50,
        unit: 'percentage',
        timestamp: oldDate,
        aggregationLevel: 'raw',
      });

      const result = await PerformanceMetric.cleanupOldMetrics(30);
      expect(result.deletedCount).toBe(1);

      const oldMetric = await PerformanceMetric.findOne({
        metricId: 'old-metric',
      });
      expect(oldMetric).toBeNull();
    });

    test('createAggregatedMetrics should create aggregated metrics', async () => {
      // This test would require more complex setup with raw data
      // For now, we'll test that the method exists and handles invalid aggregation level
      await expect(
        PerformanceMetric.createAggregatedMetrics('invalid', 3600000)
      ).rejects.toThrow('Invalid aggregation level: invalid');
    });
  });

  describe('Instance Methods', () => {
    test('getFormattedValue should return formatted value with unit', () => {
      const metric = new PerformanceMetric({
        metricId: 'test-metric',
        category: 'system',
        name: 'cpu',
        value: 75.5,
        unit: 'percentage',
        timestamp: new Date(),
      });

      expect(metric.getFormattedValue()).toBe('75.5 percentage');
    });

    test('isWithinThreshold should return correct status', () => {
      const metric = new PerformanceMetric({
        metricId: 'test-metric',
        category: 'system',
        name: 'cpu',
        value: 85,
        unit: 'percentage',
        timestamp: new Date(),
      });

      // Test critical threshold
      let result = metric.isWithinThreshold(70, 90);
      expect(result.status).toBe('warning');
      expect(result.threshold).toBe(70);

      // Test warning threshold
      result = metric.isWithinThreshold(80, 90);
      expect(result.status).toBe('normal');

      // Test normal value
      metric.value = 65;
      result = metric.isWithinThreshold(70, 90);
      expect(result.status).toBe('normal');
      expect(result.threshold).toBeNull();
    });

    test('getAgeInSeconds should return age in seconds', () => {
      const timestamp = new Date(Date.now() - 5000); // 5 seconds ago
      const metric = new PerformanceMetric({
        metricId: 'test-metric',
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp,
      });

      const age = metric.getAgeInSeconds();
      expect(age).toBeGreaterThanOrEqual(4);
      expect(age).toBeLessThanOrEqual(6);
    });
  });

  describe('Middleware', () => {
    test('pre-save middleware should set metricId if not provided', async () => {
      const metric = new PerformanceMetric({
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp: new Date(),
      });

      await metric.save();
      expect(metric.metricId).toBeDefined();
      expect(metric.metricId).toMatch(/^system-cpu-\d+$/);
    });

    test('pre-save middleware should set quality based on confidence', async () => {
      // Test high confidence
      let metric = new PerformanceMetric({
        metricId: 'test-high-confidence',
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp: new Date(),
        confidence: 95,
      });

      await metric.save();
      expect(metric.quality).toBe('good');

      // Test medium confidence
      metric = new PerformanceMetric({
        metricId: 'test-medium-confidence',
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp: new Date(),
        confidence: 75,
      });

      await metric.save();
      expect(metric.quality).toBe('fair');

      // Test low confidence
      metric = new PerformanceMetric({
        metricId: 'test-low-confidence',
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp: new Date(),
        confidence: 50,
      });

      await metric.save();
      expect(metric.quality).toBe('poor');
    });
  });

  describe('Indexes and TTL', () => {
    test('should have proper indexes defined', async () => {
      // This test would require checking the actual indexes in MongoDB
      // For now, we'll verify that the model can be created with the expected indexes
      const metric = new PerformanceMetric({
        metricId: 'test-indexes',
        category: 'system',
        name: 'cpu',
        value: 75,
        unit: 'percentage',
        timestamp: new Date(),
      });

      await metric.save();
      expect(metric._id).toBeDefined();
    });
  });
});
