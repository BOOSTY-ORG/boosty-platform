/**
 * Performance Configuration Controller
 *
 * This controller handles all configuration management endpoints including:
 * - Dashboard configurations
 * - Alert configurations
 * - Threshold management
 * - Performance settings
 */

import { performance } from 'perf_hooks';
import monitoringConfig from '../../config/monitoring.config.js';
import logger from '../../helpers/logger.js';

class PerformanceConfigurationController {
  /**
   * Get dashboard configurations
   */
  async getDashboardConfigurations(req, res) {
    try {
      const startTime = performance.now();
      const { type = 'all' } = req.query;

      // In a real implementation, this would fetch from database
      // For now, we'll return default configurations
      const dashboardConfigs = this.getDefaultDashboardConfigs();

      // Filter by type if specified
      let filteredConfigs = dashboardConfigs;
      if (type !== 'all') {
        filteredConfigs = dashboardConfigs.filter(
          (config) => config.type === type
        );
      }

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          configurations: filteredConfigs,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            count: filteredConfigs.length,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting dashboard configurations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_CONFIG_ERROR',
          message: 'Failed to retrieve dashboard configurations',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboardConfiguration(req, res) {
    try {
      const startTime = performance.now();
      const { id } = req.params;
      const configData = req.body;

      // Validate configuration data
      const validation = this.validateDashboardConfig(configData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DASHBOARD_CONFIG',
            message: 'Invalid dashboard configuration',
            details: validation.errors,
          },
        });
      }

      // In a real implementation, this would update in database
      // For now, we'll just validate and return success
      const updatedConfig = {
        id,
        ...configData,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user._id,
      };

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          configuration: updatedConfig,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error updating dashboard configuration:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_DASHBOARD_CONFIG_ERROR',
          message: 'Failed to update dashboard configuration',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get alert configurations
   */
  async getAlertConfigurations(req, res) {
    try {
      const startTime = performance.now();
      const { type = 'all' } = req.query;

      // In a real implementation, this would fetch from database
      // For now, we'll return default configurations
      const alertConfigs = this.getDefaultAlertConfigs();

      // Filter by type if specified
      let filteredConfigs = alertConfigs;
      if (type !== 'all') {
        filteredConfigs = alertConfigs.filter((config) => config.type === type);
      }

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          configurations: filteredConfigs,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
            count: filteredConfigs.length,
          },
        },
      });
    } catch (error) {
      logger.error('Error getting alert configurations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALERT_CONFIG_ERROR',
          message: 'Failed to retrieve alert configurations',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update alert configuration
   */
  async updateAlertConfiguration(req, res) {
    try {
      const startTime = performance.now();
      const { id } = req.params;
      const configData = req.body;

      // Validate configuration data
      const validation = this.validateAlertConfig(configData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ALERT_CONFIG',
            message: 'Invalid alert configuration',
            details: validation.errors,
          },
        });
      }

      // In a real implementation, this would update in database
      // For now, we'll just validate and return success
      const updatedConfig = {
        id,
        ...configData,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user._id,
      };

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          configuration: updatedConfig,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error updating alert configuration:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ALERT_CONFIG_ERROR',
          message: 'Failed to update alert configuration',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get threshold configurations
   */
  async getThresholdConfigurations(req, res) {
    try {
      const startTime = performance.now();
      const { category = 'all' } = req.query;

      // Get current thresholds from monitoring config
      const thresholds = monitoringConfig.thresholds;

      // Filter by category if specified
      let filteredThresholds = thresholds;
      if (category !== 'all') {
        filteredThresholds = { [category]: thresholds[category] };
      }

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          thresholds: filteredThresholds,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting threshold configurations:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'THRESHOLD_CONFIG_ERROR',
          message: 'Failed to retrieve threshold configurations',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update threshold configuration
   */
  async updateThresholdConfiguration(req, res) {
    try {
      const startTime = performance.now();
      const { category } = req.params;
      const thresholdData = req.body;

      // Validate threshold data
      const validation = this.validateThresholdConfig(category, thresholdData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_THRESHOLD_CONFIG',
            message: 'Invalid threshold configuration',
            details: validation.errors,
          },
        });
      }

      // In a real implementation, this would update in database and config
      // For now, we'll just validate and return success
      const updatedThresholds = {
        category,
        thresholds: thresholdData,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user._id,
      };

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          thresholds: updatedThresholds,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error updating threshold configuration:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_THRESHOLD_CONFIG_ERROR',
          message: 'Failed to update threshold configuration',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get performance settings
   */
  async getPerformanceSettings(req, res) {
    try {
      const startTime = performance.now();

      // Get current performance settings from monitoring config
      const settings = {
        intervals: monitoringConfig.intervals,
        retention: monitoringConfig.retention,
        alerts: monitoringConfig.alerts,
        database: monitoringConfig.database,
        redis: monitoringConfig.redis,
      };

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          settings,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error getting performance settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_SETTINGS_ERROR',
          message: 'Failed to retrieve performance settings',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Update performance settings
   */
  async updatePerformanceSettings(req, res) {
    try {
      const startTime = performance.now();
      const settingsData = req.body;

      // Validate settings data
      const validation = this.validatePerformanceSettings(settingsData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PERFORMANCE_SETTINGS',
            message: 'Invalid performance settings',
            details: validation.errors,
          },
        });
      }

      // In a real implementation, this would update in database and config
      // For now, we'll just validate and return success
      const updatedSettings = {
        ...settingsData,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user._id,
      };

      const responseTime = performance.now() - startTime;

      res.json({
        success: true,
        data: {
          settings: updatedSettings,
          meta: {
            generatedAt: new Date().toISOString(),
            responseTime: responseTime.toFixed(2),
          },
        },
      });
    } catch (error) {
      logger.error('Error updating performance settings:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_PERFORMANCE_SETTINGS_ERROR',
          message: 'Failed to update performance settings',
          details: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get default dashboard configurations
   */
  getDefaultDashboardConfigs() {
    return [
      {
        id: 'overview-dashboard',
        name: 'Performance Overview',
        type: 'overview',
        layout: 'grid',
        widgets: [
          {
            id: 'system-health',
            type: 'metric',
            position: { x: 0, y: 0, width: 4, height: 2 },
          },
          {
            id: 'performance-overview',
            type: 'chart',
            position: { x: 4, y: 0, width: 8, height: 4 },
          },
          {
            id: 'recent-alerts',
            type: 'alert',
            position: { x: 0, y: 2, width: 4, height: 4 },
          },
          {
            id: 'api-performance',
            type: 'table',
            position: { x: 0, y: 6, width: 12, height: 4 },
          },
        ],
        permissions: {
          view: ['admin', 'manager', 'analyst'],
          edit: ['admin', 'manager'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'system-dashboard',
        name: 'System Metrics',
        type: 'system',
        layout: 'grid',
        widgets: [
          {
            id: 'cpu-usage',
            type: 'chart',
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
          {
            id: 'memory-usage',
            type: 'chart',
            position: { x: 6, y: 0, width: 6, height: 4 },
          },
          {
            id: 'event-loop-lag',
            type: 'chart',
            position: { x: 0, y: 4, width: 12, height: 4 },
          },
        ],
        permissions: {
          view: ['admin', 'manager', 'analyst'],
          edit: ['admin', 'manager'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'api-dashboard',
        name: 'API Performance',
        type: 'api',
        layout: 'grid',
        widgets: [
          {
            id: 'api-response-time',
            type: 'chart',
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
          {
            id: 'request-volume',
            type: 'metric',
            position: { x: 6, y: 0, width: 6, height: 2 },
          },
          {
            id: 'top-endpoints',
            type: 'table',
            position: { x: 0, y: 4, width: 12, height: 6 },
          },
        ],
        permissions: {
          view: ['admin', 'manager', 'analyst'],
          edit: ['admin', 'manager'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'database-dashboard',
        name: 'Database Performance',
        type: 'database',
        layout: 'grid',
        widgets: [
          {
            id: 'query-performance',
            type: 'chart',
            position: { x: 0, y: 0, width: 6, height: 4 },
          },
          {
            id: 'slow-queries',
            type: 'table',
            position: { x: 6, y: 0, width: 6, height: 6 },
          },
        ],
        permissions: {
          view: ['admin', 'manager'],
          edit: ['admin'],
        },
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get default alert configurations
   */
  getDefaultAlertConfigs() {
    return [
      {
        id: 'cpu-alert',
        name: 'CPU Usage Alert',
        type: 'system',
        metric: 'cpu',
        enabled: true,
        thresholds: {
          warning: 70,
          critical: 90,
        },
        channels: ['email', 'webhook', 'log'],
        cooldown: 300000, // 5 minutes
        permissions: {
          view: ['admin', 'manager'],
          edit: ['admin'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'memory-alert',
        name: 'Memory Usage Alert',
        type: 'system',
        metric: 'memory',
        enabled: true,
        thresholds: {
          warning: 80,
          critical: 95,
        },
        channels: ['email', 'webhook', 'log'],
        cooldown: 300000, // 5 minutes
        permissions: {
          view: ['admin', 'manager'],
          edit: ['admin'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'response-time-alert',
        name: 'API Response Time Alert',
        type: 'api',
        metric: 'responseTime',
        enabled: true,
        thresholds: {
          warning: 500,
          critical: 1000,
        },
        channels: ['email', 'webhook', 'log'],
        cooldown: 300000, // 5 minutes
        permissions: {
          view: ['admin', 'manager'],
          edit: ['admin'],
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'error-rate-alert',
        name: 'Error Rate Alert',
        type: 'api',
        metric: 'errorRate',
        enabled: true,
        thresholds: {
          warning: 5,
          critical: 10,
        },
        channels: ['email', 'webhook', 'log'],
        cooldown: 300000, // 5 minutes
        permissions: {
          view: ['admin', 'manager'],
          edit: ['admin'],
        },
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Validate dashboard configuration
   */
  validateDashboardConfig(config) {
    const errors = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Dashboard name is required and must be a string');
    }

    if (
      !config.type ||
      !['overview', 'system', 'api', 'database'].includes(config.type)
    ) {
      errors.push(
        'Dashboard type is required and must be one of: overview, system, api, database'
      );
    }

    if (!config.widgets || !Array.isArray(config.widgets)) {
      errors.push('Dashboard widgets are required and must be an array');
    }

    if (config.widgets) {
      config.widgets.forEach((widget, index) => {
        if (!widget.id) {
          errors.push(`Widget at index ${index} is missing an ID`);
        }
        if (!widget.type) {
          errors.push(`Widget at index ${index} is missing a type`);
        }
        if (!widget.position) {
          errors.push(
            `Widget at index ${index} is missing position information`
          );
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate alert configuration
   */
  validateAlertConfig(config) {
    const errors = [];

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Alert name is required and must be a string');
    }

    if (!config.type || !['system', 'api', 'database'].includes(config.type)) {
      errors.push(
        'Alert type is required and must be one of: system, api, database'
      );
    }

    if (!config.metric || typeof config.metric !== 'string') {
      errors.push('Alert metric is required and must be a string');
    }

    if (typeof config.enabled !== 'boolean') {
      errors.push('Alert enabled flag is required and must be a boolean');
    }

    if (!config.thresholds || typeof config.thresholds !== 'object') {
      errors.push('Alert thresholds are required and must be an object');
    } else {
      if (typeof config.thresholds.warning !== 'number') {
        errors.push('Warning threshold is required and must be a number');
      }
      if (typeof config.thresholds.critical !== 'number') {
        errors.push('Critical threshold is required and must be a number');
      }
      if (config.thresholds.warning >= config.thresholds.critical) {
        errors.push('Warning threshold must be less than critical threshold');
      }
    }

    if (!config.channels || !Array.isArray(config.channels)) {
      errors.push('Alert channels are required and must be an array');
    }

    if (typeof config.cooldown !== 'number' || config.cooldown <= 0) {
      errors.push('Alert cooldown is required and must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate threshold configuration
   */
  validateThresholdConfig(category, thresholds) {
    const errors = [];

    if (!category || typeof category !== 'string') {
      errors.push('Threshold category is required and must be a string');
    }

    if (!thresholds || typeof thresholds !== 'object') {
      errors.push('Thresholds are required and must be an object');
    } else {
      for (const [key, value] of Object.entries(thresholds)) {
        if (typeof value !== 'number') {
          errors.push(`Threshold ${key} must be a number`);
        }
        if (value < 0) {
          errors.push(`Threshold ${key} must be positive`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate performance settings
   */
  validatePerformanceSettings(settings) {
    const errors = [];

    if (!settings || typeof settings !== 'object') {
      errors.push('Settings are required and must be an object');
      return { valid: false, errors };
    }

    // Validate intervals
    if (settings.intervals) {
      for (const [key, value] of Object.entries(settings.intervals)) {
        if (typeof value !== 'number' || value <= 0) {
          errors.push(`Interval ${key} must be a positive number`);
        }
      }
    }

    // Validate retention
    if (settings.retention) {
      for (const [key, value] of Object.entries(settings.retention)) {
        if (typeof value !== 'number' || value <= 0) {
          errors.push(`Retention ${key} must be a positive number`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new PerformanceConfigurationController();
