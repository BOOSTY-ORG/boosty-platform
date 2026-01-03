/**
 * Performance Aggregation Service Tests
 *
 * Tests for PerformanceAggregationService including:
 * - Data aggregation
 * - Time-based calculations
 * - Statistical operations
 * - Percentile calculations
 * - Trend analysis
 */

const performanceAggregationService = require('../../../src/services/metrics/performance-aggregation.service.js');
const {
  setupTestDatabase,
  teardownTestDatabase,
  generateTestDates,
} = require('../../helpers/metrics.test.helpers.js');

// Mock dependencies
jest.mock('../../../src/helpers/logger.js');

describe('PerformanceAggregationService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Aggregation', () => {
    test('should aggregate metrics by time interval', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const metrics = [
        { timestamp: twoHoursAgo, value: 70 },
        { timestamp: new Date(now.getTime() - 90 * 60 * 1000), value: 75 },
        { timestamp: new Date(now.getTime() - 30 * 60 * 1000), value: 80 },
        { timestamp: oneHourAgo, value: 85 },
      ];

      const result = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h', // 1 hour interval
        'avg' // aggregation function
      );

      expect(result).toHaveLength(2);
      expect(result[0].timestamp).toEqual(
        new Date(now.getTime() - 90 * 60 * 1000)
      );
      expect(result[0].value).toBe(72.5); // (70 + 75) / 2
      expect(result[1].timestamp).toEqual(oneHourAgo);
      expect(result[1].value).toBe(82.5); // (80 + 85) / 2
    });

    test('should aggregate metrics with different functions', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const metrics = [
        { timestamp: oneHourAgo, value: 70 },
        { timestamp: new Date(now.getTime() - 30 * 60 * 1000), value: 80 },
        { timestamp: new Date(now.getTime() - 15 * 60 * 1000), value: 90 },
      ];

      const avgResult = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h',
        'avg'
      );

      const minResult = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h',
        'min'
      );

      const maxResult = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h',
        'max'
      );

      const sumResult = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h',
        'sum'
      );

      const countResult = performanceAggregationService.aggregateByInterval(
        metrics,
        '1h',
        'count'
      );

      expect(avgResult[0].value).toBe(80); // (70 + 80 + 90) / 3
      expect(minResult[0].value).toBe(70);
      expect(maxResult[0].value).toBe(90);
      expect(sumResult[0].value).toBe(240); // 70 + 80 + 90
      expect(countResult[0].value).toBe(3);
    });

    test('should handle empty metrics array', () => {
      const result = performanceAggregationService.aggregateByInterval(
        [],
        '1h',
        'avg'
      );

      expect(result).toHaveLength(0);
    });

    test('should handle invalid aggregation function', () => {
      const metrics = [{ timestamp: new Date(), value: 70 }];

      expect(() => {
        performanceAggregationService.aggregateByInterval(
          metrics,
          '1h',
          'invalid'
        );
      }).toThrow();
    });
  });

  describe('Time-based Calculations', () => {
    test('should calculate time buckets correctly', () => {
      const now = new Date('2023-01-01T12:00:00Z');
      const timeBuckets = performanceAggregationService.getTimeBuckets(
        now,
        '6h', // 6 hour intervals
        2 // 2 buckets
      );

      expect(timeBuckets).toHaveLength(2);
      expect(timeBuckets[0].start).toEqual(new Date('2023-01-01T06:00:00Z'));
      expect(timeBuckets[0].end).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(timeBuckets[1].start).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(timeBuckets[1].end).toEqual(new Date('2023-01-01T06:00:00Z'));
    });

    test('should handle different time intervals', () => {
      const now = new Date('2023-01-01T12:00:00Z');

      const oneMinuteBuckets = performanceAggregationService.getTimeBuckets(
        now,
        '1m',
        5
      );

      const oneHourBuckets = performanceAggregationService.getTimeBuckets(
        now,
        '1h',
        3
      );

      const oneDayBuckets = performanceAggregationService.getTimeBuckets(
        now,
        '1d',
        2
      );

      expect(oneMinuteBuckets).toHaveLength(5);
      expect(oneHourBuckets).toHaveLength(3);
      expect(oneDayBuckets).toHaveLength(2);

      // Verify bucket durations
      expect(
        oneMinuteBuckets[0].end.getTime() - oneMinuteBuckets[0].start.getTime()
      ).toBe(60 * 1000);
      expect(
        oneHourBuckets[0].end.getTime() - oneHourBuckets[0].start.getTime()
      ).toBe(60 * 60 * 1000);
      expect(
        oneDayBuckets[0].end.getTime() - oneDayBuckets[0].start.getTime()
      ).toBe(24 * 60 * 60 * 1000);
    });

    test('should align buckets to interval boundaries', () => {
      const now = new Date('2023-01-01T13:37:00Z'); // Not on boundary

      const oneHourBuckets = performanceAggregationService.getTimeBuckets(
        now,
        '1h',
        2
      );

      // Should align to hour boundaries
      expect(oneHourBuckets[0].start).toEqual(new Date('2023-01-01T12:00:00Z'));
      expect(oneHourBuckets[0].end).toEqual(new Date('2023-01-01T13:00:00Z'));
      expect(oneHourBuckets[1].start).toEqual(new Date('2023-01-01T13:00:00Z'));
      expect(oneHourBuckets[1].end).toEqual(new Date('2023-01-01T14:00:00Z'));
    });
  });

  describe('Statistical Operations', () => {
    test('should calculate basic statistics', () => {
      const values = [10, 20, 30, 40, 50];

      const stats = performanceAggregationService.calculateStatistics(values);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.sum).toBe(150);
      expect(stats.avg).toBe(30);
      expect(stats.count).toBe(5);
      expect(stats.range).toBe(40);
    });

    test('should calculate standard deviation', () => {
      const values = [10, 20, 30, 40, 50];

      const stats = performanceAggregationService.calculateStatistics(values, [
        'stdDev',
      ]);

      // Standard deviation of [10, 20, 30, 40, 50] is approximately 14.14
      expect(stats.stdDev).toBeCloseTo(14.14, 1);
    });

    test('should calculate variance', () => {
      const values = [10, 20, 30, 40, 50];

      const stats = performanceAggregationService.calculateStatistics(values, [
        'variance',
      ]);

      // Variance is standard deviation squared
      expect(stats.variance).toBeCloseTo(200, 1);
    });

    test('should handle empty values array', () => {
      const stats = performanceAggregationService.calculateStatistics([]);

      expect(stats.min).toBeUndefined();
      expect(stats.max).toBeUndefined();
      expect(stats.sum).toBe(0);
      expect(stats.avg).toBeNaN();
      expect(stats.count).toBe(0);
    });

    test('should handle single value array', () => {
      const values = [42];

      const stats = performanceAggregationService.calculateStatistics(values);

      expect(stats.min).toBe(42);
      expect(stats.max).toBe(42);
      expect(stats.sum).toBe(42);
      expect(stats.avg).toBe(42);
      expect(stats.count).toBe(1);
      expect(stats.range).toBe(0);
      expect(stats.stdDev).toBe(0);
    });
  });

  describe('Percentile Calculations', () => {
    test('should calculate percentiles correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      const percentiles = performanceAggregationService.calculatePercentiles(
        values,
        [25, 50, 75, 90, 95]
      );

      expect(percentiles.p25).toBe(32.5); // 10 + 20 + 30 + 40 + 50) / 4
      expect(percentiles.p50).toBe(55); // (50 + 60) / 2
      expect(percentiles.p75).toBe(77.5); // (70 + 80 + 90 + 100) / 4
      expect(percentiles.p90).toBe(90);
      expect(percentiles.p95).toBe(95);
    });

    test('should handle interpolation for percentiles', () => {
      const values = [10, 20, 30, 40, 50];

      const percentiles = performanceAggregationService.calculatePercentiles(
        values,
        [25, 75]
      );

      // 25th percentile should be between 20 and 30
      expect(percentiles.p25).toBe(25);
      // 75th percentile should be between 40 and 50
      expect(percentiles.p75).toBe(45);
    });

    test('should handle edge cases', () => {
      const values = [10, 20, 30, 40, 50];

      const percentiles = performanceAggregationService.calculatePercentiles(
        values,
        [0, 50, 100]
      );

      expect(percentiles.p0).toBe(10);
      expect(percentiles.p50).toBe(30);
      expect(percentiles.p100).toBe(50);
    });

    test('should handle empty values array', () => {
      const percentiles = performanceAggregationService.calculatePercentiles(
        [],
        [50, 90, 95]
      );

      expect(percentiles.p50).toBeUndefined();
      expect(percentiles.p90).toBeUndefined();
      expect(percentiles.p95).toBeUndefined();
    });
  });

  describe('Trend Analysis', () => {
    test('should detect increasing trend', () => {
      const now = Date.now();
      const metrics = [
        { timestamp: now - 3600000, value: 70 }, // 1 hour ago
        { timestamp: now - 1800000, value: 75 }, // 30 minutes ago
        { timestamp: now - 900000, value: 80 }, // 15 minutes ago
        { timestamp: now, value: 85 }, // Now
      ];

      const trend = performanceAggregationService.calculateTrend(metrics);

      expect(trend.direction).toBe('increasing');
      expect(trend.slope).toBeGreaterThan(0);
      expect(trend.strength).toBe('strong');
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    test('should detect decreasing trend', () => {
      const now = Date.now();
      const metrics = [
        { timestamp: now - 3600000, value: 85 },
        { timestamp: now - 1800000, value: 80 },
        { timestamp: now - 900000, value: 75 },
        { timestamp: now, value: 70 },
      ];

      const trend = performanceAggregationService.calculateTrend(metrics);

      expect(trend.direction).toBe('decreasing');
      expect(trend.slope).toBeLessThan(0);
      expect(trend.strength).toBe('strong');
      expect(trend.confidence).toBeGreaterThan(0.8);
    });

    test('should detect stable trend', () => {
      const now = Date.now();
      const metrics = [
        { timestamp: now - 3600000, value: 75 },
        { timestamp: now - 1800000, value: 76 },
        { timestamp: now - 900000, value: 74 },
        { timestamp: now, value: 75 },
      ];

      const trend = performanceAggregationService.calculateTrend(metrics);

      expect(trend.direction).toBe('stable');
      expect(trend.slope).toBeCloseTo(0, 1);
      expect(trend.strength).toBe('weak');
      expect(trend.confidence).toBeLessThan(0.5);
    });

    test('should handle insufficient data points', () => {
      const metrics = [{ timestamp: Date.now(), value: 75 }];

      const trend = performanceAggregationService.calculateTrend(metrics);

      expect(trend.direction).toBe('insufficient_data');
      expect(trend.slope).toBe(0);
      expect(trend.strength).toBe('none');
      expect(trend.confidence).toBe(0);
    });

    test('should handle empty metrics array', () => {
      const trend = performanceAggregationService.calculateTrend([]);

      expect(trend.direction).toBe('insufficient_data');
      expect(trend.slope).toBe(0);
      expect(trend.strength).toBe('none');
      expect(trend.confidence).toBe(0);
    });
  });

  describe('Correlation Analysis', () => {
    test('should calculate positive correlation', () => {
      const metrics1 = [
        { timestamp: Date.now() - 300000, value: 10 },
        { timestamp: Date.now() - 200000, value: 20 },
        { timestamp: Date.now() - 100000, value: 30 },
        { timestamp: Date.now(), value: 40 },
      ];

      const metrics2 = [
        { timestamp: Date.now() - 300000, value: 15 },
        { timestamp: Date.now() - 200000, value: 25 },
        { timestamp: Date.now() - 100000, value: 35 },
        { timestamp: Date.now(), value: 45 },
      ];

      const correlation = performanceAggregationService.calculateCorrelation(
        metrics1,
        metrics2
      );

      expect(correlation.coefficient).toBeCloseTo(1, 0.1); // Perfect positive correlation
      expect(correlation.strength).toBe('strong');
      expect(correlation.direction).toBe('positive');
    });

    test('should calculate negative correlation', () => {
      const metrics1 = [
        { timestamp: Date.now() - 300000, value: 10 },
        { timestamp: Date.now() - 200000, value: 20 },
        { timestamp: Date.now() - 100000, value: 30 },
        { timestamp: Date.now(), value: 40 },
      ];

      const metrics2 = [
        { timestamp: Date.now() - 300000, value: 40 },
        { timestamp: Date.now() - 200000, value: 30 },
        { timestamp: Date.now() - 100000, value: 20 },
        { timestamp: Date.now(), value: 10 },
      ];

      const correlation = performanceAggregationService.calculateCorrelation(
        metrics1,
        metrics2
      );

      expect(correlation.coefficient).toBeCloseTo(-1, 0.1); // Perfect negative correlation
      expect(correlation.strength).toBe('strong');
      expect(correlation.direction).toBe('negative');
    });

    test('should calculate no correlation', () => {
      const metrics1 = [
        { timestamp: Date.now() - 300000, value: 10 },
        { timestamp: Date.now() - 200000, value: 20 },
        { timestamp: Date.now() - 100000, value: 30 },
        { timestamp: Date.now(), value: 40 },
      ];

      const metrics2 = [
        { timestamp: Date.now() - 300000, value: 25 },
        { timestamp: Date.now() - 200000, value: 25 },
        { timestamp: Date.now() - 100000, value: 25 },
        { timestamp: Date.now(), value: 25 },
      ];

      const correlation = performanceAggregationService.calculateCorrelation(
        metrics1,
        metrics2
      );

      expect(correlation.coefficient).toBeCloseTo(0, 0.1); // No correlation
      expect(correlation.strength).toBe('none');
      expect(correlation.direction).toBe('neutral');
    });

    test('should handle mismatched timestamps', () => {
      const metrics1 = [
        { timestamp: Date.now() - 300000, value: 10 },
        { timestamp: Date.now() - 100000, value: 30 },
      ];

      const metrics2 = [
        { timestamp: Date.now() - 200000, value: 20 },
        { timestamp: Date.now(), value: 40 },
      ];

      const correlation = performanceAggregationService.calculateCorrelation(
        metrics1,
        metrics2
      );

      // Should handle by aligning or interpolating data
      expect(correlation.coefficient).toBeDefined();
      expect(correlation.strength).toBeDefined();
    });
  });

  describe('Anomaly Detection', () => {
    test('should detect statistical anomalies', () => {
      const values = [10, 20, 30, 35, 40, 50, 60, 70, 80, 90, 1000]; // 1000 is an outlier

      const anomalies = performanceAggregationService.detectAnomalies(values, {
        method: 'iqr', // Interquartile range method
        threshold: 1.5, // 1.5 * IQR
      });

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].value).toBe(1000);
      expect(anomalies[0].index).toBe(9);
      expect(anomalies[0].type).toBe('outlier');
      expect(anomalies[0].severity).toBe('high');
    });

    test('should detect z-score anomalies', () => {
      const values = [50, 51, 49, 52, 48, 50, 150]; // 150 is an outlier

      const anomalies = performanceAggregationService.detectAnomalies(values, {
        method: 'zscore',
        threshold: 2, // 2 standard deviations
      });

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].value).toBe(150);
      expect(anomalies[0].zScore).toBeGreaterThan(2);
      expect(anomalies[0].type).toBe('outlier');
    });

    test('should handle no anomalies', () => {
      const values = [10, 20, 30, 40, 50];

      const anomalies = performanceAggregationService.detectAnomalies(values);

      expect(anomalies).toHaveLength(0);
    });

    test('should handle empty values array', () => {
      const anomalies = performanceAggregationService.detectAnomalies([]);

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('Forecasting', () => {
    test('should generate linear forecasts', () => {
      const now = Date.now();
      const metrics = [
        { timestamp: now - 3600000, value: 70 },
        { timestamp: now - 1800000, value: 75 },
        { timestamp: now - 900000, value: 80 },
        { timestamp: now, value: 85 },
      ];

      const forecast = performanceAggregationService.generateForecast(metrics, {
        method: 'linear',
        horizon: 3, // 3 future points
        interval: 900000, // 15 minutes
      });

      expect(forecast.points).toHaveLength(3);
      expect(forecast.method).toBe('linear');
      expect(forecast.confidence).toBeDefined();

      // Check that forecast values continue the trend
      expect(forecast.points[0].value).toBeGreaterThan(85);
      expect(forecast.points[1].value).toBeGreaterThan(
        forecast.points[0].value
      );
      expect(forecast.points[2].value).toBeGreaterThan(
        forecast.points[1].value
      );
    });

    test('should generate moving average forecasts', () => {
      const now = Date.now();
      const metrics = [
        { timestamp: now - 3600000, value: 70 },
        { timestamp: now - 1800000, value: 75 },
        { timestamp: now - 900000, value: 80 },
        { timestamp: now, value: 85 },
      ];

      const forecast = performanceAggregationService.generateForecast(metrics, {
        method: 'moving_average',
        window: 3, // 3-point moving average
        horizon: 2,
        interval: 900000,
      });

      expect(forecast.points).toHaveLength(2);
      expect(forecast.method).toBe('moving_average');

      // Moving average should be more stable
      expect(forecast.points[0].value).toBeCloseTo(80, 1);
      expect(forecast.points[1].value).toBeCloseTo(80, 1);
    });

    test('should handle insufficient historical data', () => {
      const metrics = [{ timestamp: Date.now(), value: 75 }];

      const forecast = performanceAggregationService.generateForecast(metrics, {
        method: 'linear',
        horizon: 3,
        interval: 900000,
      });

      expect(forecast.points).toHaveLength(0);
      expect(forecast.error).toContain('insufficient data');
    });
  });

  describe('Data Smoothing', () => {
    test('should apply moving average smoothing', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      const smoothed = performanceAggregationService.smoothData(values, {
        method: 'moving_average',
        window: 3,
      });

      expect(smoothed).toHaveLength(10);

      // First two points should be unchanged (not enough data for window)
      expect(smoothed[0]).toBe(10);
      expect(smoothed[1]).toBe(20);

      // Third point should be average of first three
      expect(smoothed[2]).toBe(20); // (10 + 20 + 30) / 3

      // Fourth point should be average of 2, 3, 4
      expect(smoothed[3]).toBe(30); // (20 + 30 + 40) / 3
    });

    test('should apply exponential smoothing', () => {
      const values = [10, 20, 30, 40, 50];

      const smoothed = performanceAggregationService.smoothData(values, {
        method: 'exponential',
        alpha: 0.3, // Smoothing factor
      });

      expect(smoothed).toHaveLength(5);
      expect(smoothed[0]).toBe(10); // First point unchanged

      // Second point: 0.3 * 20 + 0.7 * 10 = 13
      expect(smoothed[1]).toBeCloseTo(13, 1);

      // Third point: 0.3 * 30 + 0.7 * 13 = 18.1
      expect(smoothed[2]).toBeCloseTo(18.1, 1);
    });

    test('should handle empty values array', () => {
      const smoothed = performanceAggregationService.smoothData([], {
        method: 'moving_average',
        window: 3,
      });

      expect(smoothed).toHaveLength(0);
    });
  });

  describe('Performance Optimization', () => {
    test('should handle large datasets efficiently', () => {
      const largeDataset = Array(10000)
        .fill()
        .map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          value: Math.random() * 100,
        }));

      const startTime = Date.now();
      const result = performanceAggregationService.aggregateByInterval(
        largeDataset,
        '1h',
        'avg'
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should use streaming for very large datasets', () => {
      // This would test streaming implementation if available
      const veryLargeDataset = Array(100000)
        .fill()
        .map((_, i) => ({
          timestamp: Date.now() - i * 1000,
          value: Math.random() * 100,
        }));

      const startTime = Date.now();
      const result = performanceAggregationService.calculateStatistics(
        veryLargeDataset.map((d) => d.value)
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid parameters gracefully', () => {
      expect(() => {
        performanceAggregationService.aggregateByInterval(
          [{ timestamp: Date.now(), value: 70 }],
          'invalid-interval',
          'avg'
        );
      }).toThrow();

      expect(() => {
        performanceAggregationService.calculatePercentiles(
          [10, 20, 30],
          'not-an-array'
        );
      }).toThrow();
    });

    test('should handle malformed data points', () => {
      const malformedData = [
        { timestamp: 'invalid-date', value: 70 },
        { timestamp: Date.now(), value: 'not-a-number' },
        { timestamp: Date.now() }, // Missing value
      ];

      expect(() => {
        performanceAggregationService.calculateTrend(malformedData);
      }).toThrow();

      expect(() => {
        performanceAggregationService.calculateCorrelation(malformedData, []);
      }).toThrow();
    });
  });
});
