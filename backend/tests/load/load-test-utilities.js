/**
 * Load Testing Utilities for Boosty Platform Backend
 *
 * This file contains utility functions for load testing including:
 * - Authentication helpers
 * - Test data generation
 * - Performance metrics collection
 * - Randomization utilities
 */

import { performance } from 'perf_hooks';
import { randomBytes } from 'crypto';

// Performance metrics collector
class PerformanceMetrics {
  constructor() {
    this.metrics = {
      requests: [],
      responseTimes: [],
      errors: [],
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      memoryUsage: [],
      cpuUsage: [],
    };
    this.startTime = null;
    this.endTime = null;
  }

  startTest() {
    this.startTime = performance.now();
    this.metrics = {
      requests: [],
      responseTimes: [],
      errors: [],
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
      memoryUsage: [],
      cpuUsage: [],
    };
  }

  endTest() {
    this.endTime = performance.now();
  }

  recordRequest(requestData) {
    this.metrics.requests.push({
      ...requestData,
      timestamp: performance.now(),
    });

    if (requestData.responseTime) {
      this.metrics.responseTimes.push(requestData.responseTime);
    }

    if (requestData.error) {
      this.metrics.errors.push(requestData.error);
    }

    if (requestData.cacheHit) {
      this.metrics.cacheHits++;
    }

    if (requestData.cacheMiss) {
      this.metrics.cacheMisses++;
    }

    if (requestData.dbQuery) {
      this.metrics.dbQueries++;
    }
  }

  recordSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: performance.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });
  }

  getStatistics() {
    const responseTimes = this.metrics.responseTimes;
    const totalRequests = this.metrics.requests.length;
    const successfulRequests = totalRequests - this.metrics.errors.length;
    const failedRequests = this.metrics.errors.length;

    if (responseTimes.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        cacheHitRate: 0,
        totalDbQueries: 0,
        testDuration: 0,
      };
    }

    // Sort response times for percentile calculations
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      averageResponseTime:
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      cacheHitRate:
        (this.metrics.cacheHits /
          (this.metrics.cacheHits + this.metrics.cacheMisses)) *
          100 || 0,
      totalDbQueries: this.metrics.dbQueries,
      testDuration: this.endTime - this.startTime,
    };
  }
}

// Authentication helper
class AuthHelper {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.tokenCache = new Map();
  }

  async getAuthToken(email, password) {
    const cacheKey = `${email}:${password}`;

    if (this.tokenCache.has(cacheKey)) {
      return this.tokenCache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      const token = data.token;

      // Cache token for 30 minutes
      this.tokenCache.set(cacheKey, token);
      setTimeout(
        () => {
          this.tokenCache.delete(cacheKey);
        },
        30 * 60 * 1000
      );

      return token;
    } catch (error) {
      console.error('Authentication error:', error.message);
      throw error;
    }
  }

  clearTokenCache() {
    this.tokenCache.clear();
  }
}

// Test data generator
class TestDataGenerator {
  constructor() {
    this.usernames = [
      'john_doe',
      'jane_smith',
      'bob_wilson',
      'alice_brown',
      'charlie_davis',
    ];
    this.domains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'company.com',
      'test.com',
    ];
    this.investorNames = [
      'Solar Fund LP',
      'Green Energy Ventures',
      'Renewable Power Inc',
      'Clean Tech Investors',
    ];
  }

  generateRandomEmail() {
    const username =
      this.usernames[Math.floor(Math.random() * this.usernames.length)];
    const domain =
      this.domains[Math.floor(Math.random() * this.domains.length)];
    const random = Math.floor(Math.random() * 1000);
    return `${username}${random}@${domain}`;
  }

  generateRandomPhone() {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `+1${areaCode}${exchange}${number}`;
  }

  generateRandomInvestor() {
    const name =
      this.investorNames[Math.floor(Math.random() * this.investorNames.length)];
    const id = Math.floor(Math.random() * 10000) + 1;
    return {
      id,
      name: `${name} ${id}`,
      type: ['individual', 'institutional'][Math.floor(Math.random() * 2)],
      totalInvested: Math.floor(Math.random() * 1000000) + 10000,
      expectedROI: (Math.random() * 20 + 5).toFixed(2),
    };
  }

  generateRandomTransaction() {
    return {
      id: Math.floor(Math.random() * 100000) + 1,
      amount: Math.floor(Math.random() * 50000) + 100,
      type: ['investment', 'withdrawal', 'payout'][
        Math.floor(Math.random() * 3)
      ],
      status: ['pending', 'completed', 'failed'][Math.floor(Math.random() * 3)],
      date: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  generateRandomUser() {
    return {
      id: Math.floor(Math.random() * 50000) + 1,
      name: `User ${Math.floor(Math.random() * 10000) + 1}`,
      email: this.generateRandomEmail(),
      phone: this.generateRandomPhone(),
      kycStatus: ['pending', 'verified', 'rejected'][
        Math.floor(Math.random() * 3)
      ],
      registrationDate: new Date(
        Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  generateRandomNotification() {
    const types = ['system', 'transaction', 'kyc', 'investment', 'payout'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    return {
      id: Math.floor(Math.random() * 100000) + 1,
      type: types[Math.floor(Math.random() * types.length)],
      title: `Notification ${Math.floor(Math.random() * 1000) + 1}`,
      message: `This is a test notification message ${Math.random().toString(36).substring(7)}`,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      read: Math.random() > 0.5,
      createdAt: new Date(
        Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }
}

// Randomization utilities
class Randomizer {
  static randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomDelay(min = 100, max = 1000) {
    return new Promise((resolve) => {
      setTimeout(resolve, this.randomBetween(min, max));
    });
  }

  static randomString(length = 10) {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  static weightedRandom(options) {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    let random = Math.random() * totalWeight;

    for (const option of options) {
      random -= option.weight;
      if (random <= 0) {
        return option.value;
      }
    }

    return options[options.length - 1].value;
  }
}

// HTTP request helper with timing
class HttpRequestHelper {
  constructor() {
    this.metrics = new PerformanceMetrics();
  }

  async timedRequest(url, options = {}) {
    const startTime = performance.now();
    let response;
    let error = null;

    try {
      response = await fetch(url, options);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const requestData = {
        url,
        method: options.method || 'GET',
        statusCode: response.status,
        responseTime,
        success: response.ok,
        cacheHit: response.headers.get('X-Cache') === 'HIT',
        cacheMiss: response.headers.get('X-Cache') === 'MISS',
        dbQuery: response.headers.get('X-DB-Queries')
          ? parseInt(response.headers.get('X-DB-Queries'))
          : 0,
      };

      this.metrics.recordRequest(requestData);
      return { response, responseTime, metrics: requestData };
    } catch (err) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      error = err;

      const requestData = {
        url,
        method: options.method || 'GET',
        error: err.message,
        responseTime,
        success: false,
      };

      this.metrics.recordRequest(requestData);
      throw err;
    }
  }

  getMetrics() {
    return this.metrics.getStatistics();
  }

  resetMetrics() {
    this.metrics = new PerformanceMetrics();
  }
}

// Cache performance monitor
class CacheMonitor {
  constructor() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  recordHit() {
    this.cacheStats.hits++;
  }

  recordMiss() {
    this.cacheStats.misses++;
  }

  recordSet() {
    this.cacheStats.sets++;
  }

  recordDelete() {
    this.cacheStats.deletes++;
  }

  recordEviction() {
    this.cacheStats.evictions++;
  }

  getHitRate() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  getStats() {
    return {
      ...this.cacheStats,
      hitRate: this.getHitRate(),
    };
  }

  reset() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }
}

// Export all utilities
export {
  PerformanceMetrics,
  AuthHelper,
  TestDataGenerator,
  Randomizer,
  HttpRequestHelper,
  CacheMonitor,
};

// Export single instances for convenience
export const performanceMetrics = new PerformanceMetrics();
export const authHelper = new AuthHelper('http://localhost:7000');
export const testDataGenerator = new TestDataGenerator();
export const httpRequestHelper = new HttpRequestHelper();
export const cacheMonitor = new CacheMonitor();
