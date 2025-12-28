/**
 * Performance Monitoring Dashboard
 *
 * This module provides a simple web-based dashboard for monitoring
 * system performance with real-time metrics and visualizations.
 */

import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import performanceCollector from './performance-collector.js';
import performanceAnalytics from './performance-analytics.js';
import alertingService from './alerting.service.js';
import monitoringConfig from '../config/monitoring.config.js';
import logger from '../helpers/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PerformanceDashboard {
  constructor() {
    this.server = null;
    this.isRunning = false;
    this.clients = new Set();
    this.port = process.env.PERFORMANCE_DASHBOARD_PORT || 3001;
  }

  /**
   * Start the dashboard server
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Performance dashboard is already running');
      return;
    }

    try {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        logger.info(`Performance dashboard started on port ${this.port}`);
        logger.info(`Dashboard URL: http://localhost:${this.port}`);
        this.isRunning = true;
      });

      // Setup WebSocket-like SSE for real-time updates
      this.setupRealTimeUpdates();
    } catch (error) {
      logger.error('Failed to start performance dashboard:', error);
      throw error;
    }
  }

  /**
   * Stop the dashboard server
   */
  async stop() {
    if (!this.isRunning) {
      logger.warn('Performance dashboard is not running');
      return;
    }

    if (this.server) {
      this.server.close(() => {
        logger.info('Performance dashboard stopped');
        this.isRunning = false;
      });
    }

    // Close all client connections
    this.clients.clear();
  }

  /**
   * Handle HTTP requests
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const path = url.pathname;

    try {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Route handling
      if (path === '/') {
        await this.serveDashboard(res);
      } else if (path === '/api/metrics') {
        await this.serveMetrics(req, res);
      } else if (path === '/api/health') {
        await this.serveHealth(res);
      } else if (path === '/api/alerts') {
        await this.serveAlerts(res);
      } else if (path === '/api/analytics') {
        await this.serveAnalytics(res);
      } else if (path === '/api/realtime') {
        await this.serveRealTimeUpdates(req, res);
      } else if (path.startsWith('/static/')) {
        await this.serveStaticFile(path, res);
      } else {
        this.send404(res);
      }
    } catch (error) {
      logger.error('Dashboard request error:', error);
      this.send500(res, error);
    }
  }

  /**
   * Serve the main dashboard HTML
   */
  async serveDashboard(res) {
    const html = await this.generateDashboardHTML();
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(html);
  }

  /**
   * Serve metrics data
   */
  async serveMetrics(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const timeRange = url.searchParams.get('timeRange') || '1h';
    const metric = url.searchParams.get('metric') || 'all';

    const metrics = performanceCollector.getMetricsSnapshot();
    const filteredMetrics = this.filterMetricsByTimeRange(metrics, timeRange);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        data: filteredMetrics,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Serve health status
   */
  async serveHealth(res) {
    const summary = performanceCollector.getPerformanceSummary();
    const health = this.calculateHealthStatus(summary);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        data: {
          summary,
          health,
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Serve alerts
   */
  async serveAlerts(res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    const level = url.searchParams.get('level') || 'all';
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    const metrics = performanceCollector.getMetricsSnapshot();
    let alerts = metrics.alerts;

    if (level !== 'all') {
      alerts = alerts.filter((alert) => alert.level === level);
    }

    alerts.sort((a, b) => b.timestamp - a.timestamp);
    alerts = alerts.slice(0, limit);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        data: {
          alerts,
          summary: {
            total: alerts.length,
            critical: alerts.filter((a) => a.level === 'critical').length,
            warning: alerts.filter((a) => a.level === 'warning').length,
          },
          timestamp: new Date().toISOString(),
        },
      })
    );
  }

  /**
   * Serve analytics data
   */
  async serveAnalytics(res) {
    const metrics = performanceCollector.getMetricsSnapshot();
    const analytics = performanceAnalytics.generatePerformanceReport(metrics);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Serve real-time updates using Server-Sent Events
   */
  async serveRealTimeUpdates(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.writeHead(200);

    // Add client to SSE clients
    this.clients.add(res);

    // Send initial data
    this.sendSSEData(res, {
      type: 'initial',
      data: performanceCollector.getPerformanceSummary(),
    });

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Setup real-time updates
   */
  setupRealTimeUpdates() {
    // Listen to performance collector events
    performanceCollector.on('systemMetrics', (metrics) => {
      this.broadcastToClients({
        type: 'systemMetrics',
        data: metrics,
      });
    });

    performanceCollector.on('databaseMetrics', (metrics) => {
      this.broadcastToClients({
        type: 'databaseMetrics',
        data: metrics,
      });
    });

    performanceCollector.on('redisMetrics', (metrics) => {
      this.broadcastToClients({
        type: 'redisMetrics',
        data: metrics,
      });
    });

    performanceCollector.on('alert', (alert) => {
      this.broadcastToClients({
        type: 'alert',
        data: alert,
      });
    });

    // Periodic updates
    setInterval(() => {
      this.broadcastToClients({
        type: 'summary',
        data: performanceCollector.getPerformanceSummary(),
      });
    }, monitoringConfig.dashboard.refreshInterval);
  }

  /**
   * Broadcast data to all SSE clients
   */
  broadcastToClients(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      try {
        client.write(message);
      } catch (error) {
        // Remove disconnected clients
        this.clients.delete(client);
      }
    });
  }

  /**
   * Send SSE data to a specific client
   */
  sendSSEData(res, data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    try {
      res.write(message);
    } catch (error) {
      this.clients.delete(res);
    }
  }

  /**
   * Serve static files
   */
  async serveStaticFile(path, res) {
    try {
      const filePath = join(__dirname, path);
      const content = await readFile(filePath);
      const ext = path.split('.').pop();

      const contentType =
        {
          css: 'text/css',
          js: 'application/javascript',
          png: 'image/png',
          jpg: 'image/jpeg',
          svg: 'image/svg+xml',
        }[ext] || 'text/plain';

      res.setHeader('Content-Type', contentType);
      res.writeHead(200);
      res.end(content);
    } catch (error) {
      this.send404(res);
    }
  }

  /**
   * Generate dashboard HTML
   */
  async generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Monitoring Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .card:hover {
            transform: translateY(-2px);
        }
        
        .card-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #333;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            font-weight: 500;
            color: #666;
        }
        
        .metric-value {
            font-weight: 600;
            font-size: 1.1rem;
        }
        
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        
        .chart-container {
            height: 200px;
            margin-top: 1rem;
        }
        
        .alert {
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 4px;
            border-left: 4px solid;
        }
        
        .alert-critical {
            background-color: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        
        .alert-warning {
            background-color: #fff3cd;
            border-color: #ffc107;
            color: #856404;
        }
        
        .refresh-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        .refresh-button:hover {
            background: #0056b3;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Monitoring Dashboard</h1>
    </div>
    
    <div class="container">
        <div id="loading" class="loading">Loading dashboard...</div>
        
        <div id="dashboard" style="display: none;">
            <!-- System Health -->
            <div class="grid">
                <div class="card">
                    <div class="card-title">System Health</div>
                    <div id="health-metrics">
                        <div class="metric">
                            <span class="metric-label">Status</span>
                            <span id="health-status" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">CPU Usage</span>
                            <span id="cpu-usage" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memory Usage</span>
                            <span id="memory-usage" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Event Loop Lag</span>
                            <span id="event-loop-lag" class="metric-value">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- Database Metrics -->
                <div class="card">
                    <div class="card-title">Database Performance</div>
                    <div id="database-metrics">
                        <div class="metric">
                            <span class="metric-label">Avg Query Time</span>
                            <span id="avg-query-time" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Slow Queries</span>
                            <span id="slow-queries" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Connections</span>
                            <span id="db-connections" class="metric-value">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- Redis Metrics -->
                <div class="card">
                    <div class="card-title">Redis Performance</div>
                    <div id="redis-metrics">
                        <div class="metric">
                            <span class="metric-label">Hit Rate</span>
                            <span id="redis-hit-rate" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Response Time</span>
                            <span id="redis-response-time" class="metric-value">-</span>
                        </div>
                    </div>
                </div>
                
                <!-- API Metrics -->
                <div class="card">
                    <div class="card-title">API Performance</div>
                    <div id="api-metrics">
                        <div class="metric">
                            <span class="metric-label">Avg Response Time</span>
                            <span id="api-response-time" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Request Count</span>
                            <span id="request-count" class="metric-value">-</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Error Rate</span>
                            <span id="error-rate" class="metric-value">-</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Alerts Section -->
            <div class="card">
                <div class="card-title">
                    Recent Alerts
                    <button class="refresh-button" onclick="refreshAlerts()">Refresh</button>
                </div>
                <div id="alerts-container">
                    <div class="loading">Loading alerts...</div>
                </div>
            </div>
            
            <!-- Performance Charts -->
            <div class="card">
                <div class="card-title">Performance Trends</div>
                <div class="chart-container">
                    <canvas id="performance-chart"></canvas>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let eventSource = null;
        let performanceData = {
            labels: [],
            cpu: [],
            memory: [],
            responseTime: []
        };
        
        // Initialize dashboard
        function initDashboard() {
            connectRealTimeUpdates();
            loadInitialData();
            initChart();
        }
        
        // Connect to real-time updates
        function connectRealTimeUpdates() {
            eventSource = new EventSource('/api/realtime');
            
            eventSource.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleRealTimeUpdate(data);
            };
            
            eventSource.onerror = function() {
                console.error('Real-time updates disconnected');
                setTimeout(connectRealTimeUpdates, 5000);
            };
        }
        
        // Handle real-time updates
        function handleRealTimeUpdate(data) {
            switch(data.type) {
                case 'initial':
                case 'summary':
                    updateMetrics(data.data);
                    break;
                case 'alert':
                    addAlert(data.data);
                    break;
            }
        }
        
        // Update metrics display
        function updateMetrics(summary) {
            // System metrics
            document.getElementById('cpu-usage').textContent = 
                summary.system.cpu ? summary.system.cpu.toFixed(1) + '%' : '-';
            document.getElementById('memory-usage').textContent = 
                summary.system.memory ? summary.system.memory.toFixed(1) + '%' : '-';
            document.getElementById('event-loop-lag').textContent = 
                summary.system.eventLoopLag ? summary.system.eventLoopLag.toFixed(1) + 'ms' : '-';
            
            // Database metrics
            document.getElementById('avg-query-time').textContent = 
                summary.database.avgQueryTime ? summary.database.avgQueryTime.toFixed(1) + 'ms' : '-';
            document.getElementById('slow-queries').textContent = 
                summary.database.slowQueryCount || '-';
            document.getElementById('db-connections').textContent = 
                summary.database.connectionCount || '-';
            
            // Redis metrics
            document.getElementById('redis-hit-rate').textContent = 
                summary.redis.hitRate ? summary.redis.hitRate.toFixed(1) + '%' : '-';
            document.getElementById('redis-response-time').textContent = 
                summary.redis.avgResponseTime ? summary.redis.avgResponseTime.toFixed(1) + 'ms' : '-';
            
            // API metrics
            document.getElementById('api-response-time').textContent = 
                summary.api.avgResponseTime ? summary.api.avgResponseTime.toFixed(1) + 'ms' : '-';
            document.getElementById('request-count').textContent = 
                summary.api.requestCount || '-';
            document.getElementById('error-rate').textContent = 
                summary.api.errorRate ? summary.api.errorRate.toFixed(1) + '%' : '-';
            
            // Update health status
            updateHealthStatus(summary);
            
            // Update chart data
            updateChartData(summary);
            
            // Hide loading, show dashboard
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
        }
        
        // Update health status
        function updateHealthStatus(summary) {
            const statusElement = document.getElementById('health-status');
            let status = 'Healthy';
            let statusClass = 'status-healthy';
            
            // Simple health calculation
            if (summary.system.cpu > 80 || summary.system.memory > 80) {
                status = 'Critical';
                statusClass = 'status-critical';
            } else if (summary.system.cpu > 70 || summary.system.memory > 70) {
                status = 'Warning';
                statusClass = 'status-warning';
            }
            
            statusElement.textContent = status;
            statusElement.className = 'metric-value ' + statusClass;
        }
        
        // Load initial data
        async function loadInitialData() {
            try {
                // Load health data
                const healthResponse = await fetch('/api/health');
                const healthData = await healthResponse.json();
                if (healthData.success) {
                    updateMetrics(healthData.data.summary);
                }
                
                // Load alerts
                loadAlerts();
            } catch (error) {
                console.error('Failed to load initial data:', error);
            }
        }
        
        // Load alerts
        async function loadAlerts() {
            try {
                const response = await fetch('/api/alerts?limit=10');
                const data = await response.json();
                if (data.success) {
                    displayAlerts(data.data.alerts);
                }
            } catch (error) {
                console.error('Failed to load alerts:', error);
            }
        }
        
        // Display alerts
        function displayAlerts(alerts) {
            const container = document.getElementById('alerts-container');
            
            if (alerts.length === 0) {
                container.innerHTML = '<div class="loading">No recent alerts</div>';
                return;
            }
            
            container.innerHTML = alerts.map(alert => 
                \`<div class="alert alert-\${alert.level}">
                    <strong>\${alert.level.toUpperCase()}:</strong> \${alert.message}
                    <br><small>\${new Date(alert.timestamp).toLocaleString()}</small>
                </div>\`
            ).join('');
        }
        
        // Add new alert
        function addAlert(alert) {
            const container = document.getElementById('alerts-container');
            const alertElement = document.createElement('div');
            alertElement.className = \`alert alert-\${alert.level}\`;
            alertElement.innerHTML = \`
                <strong>\${alert.level.toUpperCase()}:</strong> \${alert.message}
                <br><small>\${new Date(alert.timestamp).toLocaleString()}</small>
            \`;
            
            container.insertBefore(alertElement, container.firstChild);
            
            // Keep only last 10 alerts visible
            const alerts = container.querySelectorAll('.alert');
            if (alerts.length > 10) {
                alerts[alerts.length - 1].remove();
            }
        }
        
        // Refresh alerts
        function refreshAlerts() {
            loadAlerts();
        }
        
        // Initialize chart (simplified)
        function initChart() {
            const canvas = document.getElementById('performance-chart');
            const ctx = canvas.getContext('2d');
            
            // Simple chart implementation
            canvas.width = canvas.offsetWidth;
            canvas.height = 200;
        }
        
        // Update chart data
        function updateChartData(summary) {
            const now = new Date().toLocaleTimeString();
            
            // Keep only last 20 data points
            if (performanceData.labels.length > 20) {
                performanceData.labels.shift();
                performanceData.cpu.shift();
                performanceData.memory.shift();
                performanceData.responseTime.shift();
            }
            
            performanceData.labels.push(now);
            performanceData.cpu.push(summary.system.cpu || 0);
            performanceData.memory.push(summary.system.memory || 0);
            performanceData.responseTime.push(summary.api.avgResponseTime || 0);
            
            // Simple chart drawing would go here
            // For now, just log the data
            console.log('Performance data updated:', performanceData);
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initDashboard);
    </script>
</body>
</html>
    `;
  }

  /**
   * Filter metrics by time range
   */
  filterMetricsByTimeRange(metrics, timeRange) {
    const timeRanges = {
      '1h': 3600000,
      '6h': 21600000,
      '24h': 86400000,
      '7d': 604800000,
    };

    const window = timeRanges[timeRange] || timeRanges['1h'];
    const cutoff = Date.now() - window;

    // Filter all metric arrays by timestamp
    const filterArray = (arr) => {
      if (!Array.isArray(arr)) return arr;
      return arr.filter((item) => item.timestamp >= cutoff);
    };

    return {
      system: {
        cpu: filterArray(metrics.system.cpu),
        memory: filterArray(metrics.system.memory),
        eventLoopLag: filterArray(metrics.system.eventLoopLag),
      },
      database: {
        queryTimes: filterArray(metrics.database.queryTimes),
        slowQueries: filterArray(metrics.database.slowQueries),
      },
      redis: {
        responseTime: filterArray(metrics.redis.responseTime),
      },
      api: {
        responseTimes: filterArray(metrics.api.responseTimes),
      },
    };
  }

  /**
   * Calculate health status
   */
  calculateHealthStatus(summary) {
    let score = 100;
    let issues = [];

    // CPU check
    if (summary.system.cpu > 80) {
      score -= 30;
      issues.push('High CPU usage');
    }

    // Memory check
    if (summary.system.memory > 80) {
      score -= 30;
      issues.push('High memory usage');
    }

    // Event loop check
    if (summary.system.eventLoopLag > 50) {
      score -= 20;
      issues.push('High event loop lag');
    }

    // Error rate check
    if (summary.api.errorRate > 5) {
      score -= 20;
      issues.push('High error rate');
    }

    let status = 'healthy';
    if (score < 50) {
      status = 'critical';
    } else if (score < 75) {
      status = 'warning';
    } else if (score < 90) {
      status = 'degraded';
    }

    return {
      score: Math.max(0, score),
      status,
      issues,
    };
  }

  /**
   * Send 404 response
   */
  send404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * Send 500 response
   */
  send500(res, error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// Create and export singleton instance
const performanceDashboard = new PerformanceDashboard();
export default performanceDashboard;
