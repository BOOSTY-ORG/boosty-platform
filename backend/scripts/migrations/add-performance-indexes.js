/**
 * Database Migration: Add Performance Tracking Indexes
 *
 * This script adds optimized indexes to improve query performance
 * for the performance tracking collections.
 */

import mongoose from 'mongoose';
import logger from '../src/helpers/logger.js';

// Import models to ensure they are registered
import PerformanceMetric from '../src/models/metrics/performance-metric.model.js';
import PerformanceAlert from '../src/models/metrics/performance-alert.model.js';
import PerformanceDashboard from '../src/models/metrics/performance-dashboard.model.js';

/**
 * Create indexes for performance metrics collection
 */
async function createPerformanceMetricIndexes() {
  try {
    logger.info('Creating indexes for performance_metrics collection...');

    await PerformanceMetric.createIndexes([
      // Existing indexes
      { category: 1, name: 1, timestamp: -1 },
      { metricId: 1, timestamp: -1 },
      { timestamp: -1, aggregationLevel: 1 },
      { tags: 1, timestamp: -1 },

      // New optimized indexes
      { category: 1, aggregationLevel: 1, timestamp: -1 },
      { name: 1, aggregationLevel: 1, timestamp: -1 },
      { instanceId: 1, timestamp: -1 },
      { source: 1, timestamp: -1 },

      // Compound indexes for common queries
      { category: 1, name: 1, aggregationLevel: 1, timestamp: -1 },
      { category: 1, timestamp: -1, aggregationLevel: 1 },
      { name: 1, timestamp: -1, aggregationLevel: 1 },
    ]);

    logger.info('Performance metrics indexes created successfully');
  } catch (error) {
    logger.error('Error creating performance metrics indexes:', error);
    throw error;
  }
}

/**
 * Create indexes for performance alerts collection
 */
async function createPerformanceAlertIndexes() {
  try {
    logger.info('Creating indexes for performance_alerts collection...');

    await PerformanceAlert.createIndexes([
      // Existing indexes
      { status: 1, triggeredAt: -1 },
      { category: 1, severity: 1, status: 1 },
      { metric: 1, triggeredAt: -1 },
      { configId: 1, triggeredAt: -1 },
      { tags: 1, triggeredAt: -1 },
      { triggeredAt: -1, status: 1 },

      // New optimized indexes
      { severity: 1, status: 1, triggeredAt: -1 },
      { acknowledgedBy: 1, acknowledgedAt: -1 },
      { resolvedBy: 1, resolvedAt: -1 },
      { suppressed: 1, suppressedUntil: -1 },
      { nextNotification: 1 },

      // Compound indexes for common queries
      { category: 1, severity: 1, status: 1, triggeredAt: -1 },
      { metric: 1, status: 1, triggeredAt: -1 },
      { status: 1, triggeredAt: -1, severity: 1 },
    ]);

    logger.info('Performance alerts indexes created successfully');
  } catch (error) {
    logger.error('Error creating performance alerts indexes:', error);
    throw error;
  }
}

/**
 * Create indexes for performance dashboards collection
 */
async function createPerformanceDashboardIndexes() {
  try {
    logger.info('Creating indexes for performance_dashboards collection...');

    await PerformanceDashboard.createIndexes([
      // Existing indexes
      { owner: 1, isActive: 1 },
      { type: 1, isPublic: 1, isActive: 1 },
      { tags: 1, isActive: 1 },
      { isTemplate: 1, type: 1 },
      { sharedWith: 1, isActive: 1 },
      { lastAccessed: -1 },
      { accessCount: -1 },
      { favoriteCount: -1 },

      // New optimized indexes
      { name: 'text', description: 'text' }, // Text search index
      { category: 1, isActive: 1 },
      { team: 1, isActive: 1 },

      // Compound indexes for common queries
      { owner: 1, isActive: 1, lastAccessed: -1 },
      { type: 1, isPublic: 1, isActive: 1, favoriteCount: -1 },
      { isTemplate: 1, type: 1, isActive: 1 },
    ]);

    logger.info('Performance dashboard indexes created successfully');
  } catch (error) {
    logger.error('Error creating performance dashboard indexes:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    logger.info('Starting performance tracking indexes migration...');

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      const mongoUri =
        process.env.MONGODB_URI || 'mongodb://localhost:27017/boosty-platform';
      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB');
    }

    // Create all indexes
    await createPerformanceMetricIndexes();
    await createPerformanceAlertIndexes();
    await createPerformanceDashboardIndexes();

    logger.info(
      'Performance tracking indexes migration completed successfully'
    );

    // Close connection if we opened it
    if (process.env.NODE_ENV !== 'production') {
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export default {
  runMigration,
  createPerformanceMetricIndexes,
  createPerformanceAlertIndexes,
  createPerformanceDashboardIndexes,
};
