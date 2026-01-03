/**
 * Load Testing Configuration for Boosty Platform Backend
 *
 * This configuration defines test scenarios for validating performance
 * improvements through query optimization and caching implementation.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base configuration
const baseConfig = {
  target: 'http://localhost:7000',
  phases: [],
  defaults: {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  },
  processor: join(__dirname, 'load-test-utilities.js'),
  variables: {
    testUserEmail: 'loadtest@boosty.com',
    testUserPassword: 'LoadTest123!',
  },
};

// Test scenarios for different load levels
const testScenarios = {
  // Baseline load test (10 concurrent users, 100 requests)
  baseline: {
    ...baseConfig,
    phases: [{ duration: 10, arrivalRate: 10 }],
    scenarios: [
      {
        name: 'Dashboard Metrics - Baseline',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - Baseline',
        weight: 25,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - Baseline',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - Baseline',
        weight: 15,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Notifications - Baseline',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/notifications',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
    ],
  },

  // Moderate load test (50 concurrent users, 500 requests)
  moderate: {
    ...baseConfig,
    phases: [
      { duration: 20, arrivalRate: 25 },
      { duration: 30, arrivalRate: 50 },
    ],
    scenarios: [
      {
        name: 'Dashboard Metrics - Moderate',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - Moderate',
        weight: 25,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - Moderate',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - Moderate',
        weight: 15,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Notifications - Moderate',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 1,
          },
          {
            get: {
              url: '/api/notifications',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
    ],
  },

  // High load test (100 concurrent users, 1000 requests)
  high: {
    ...baseConfig,
    phases: [
      { duration: 30, arrivalRate: 50 },
      { duration: 40, arrivalRate: 100 },
    ],
    scenarios: [
      {
        name: 'Dashboard Metrics - High',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - High',
        weight: 25,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - High',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - High',
        weight: 15,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Notifications - High',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 2,
          },
          {
            get: {
              url: '/api/notifications',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
    ],
  },

  // Stress test (200 concurrent users, 2000 requests)
  stress: {
    ...baseConfig,
    phases: [
      { duration: 40, arrivalRate: 100 },
      { duration: 60, arrivalRate: 200 },
    ],
    scenarios: [
      {
        name: 'Dashboard Metrics - Stress',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - Stress',
        weight: 25,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - Stress',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - Stress',
        weight: 15,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
      {
        name: 'Notifications - Stress',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            think: 3,
          },
          {
            get: {
              url: '/api/notifications',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
              },
            },
          },
        ],
      },
    ],
  },

  // Comparison test - with caching enabled
  withCaching: {
    ...baseConfig,
    phases: [{ duration: 20, arrivalRate: 50 }],
    scenarios: [
      {
        name: 'Dashboard Metrics - With Caching',
        weight: 40,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Enabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - With Caching',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Enabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - With Caching',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Enabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - With Caching',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Enabled': 'true',
              },
            },
          },
        ],
      },
    ],
  },

  // Comparison test - without caching
  withoutCaching: {
    ...baseConfig,
    phases: [{ duration: 20, arrivalRate: 50 }],
    scenarios: [
      {
        name: 'Dashboard Metrics - Without Caching',
        weight: 40,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/dashboard',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Disabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'Transaction Analytics - Without Caching',
        weight: 30,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/transaction/analytics',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Disabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'User Metrics - Without Caching',
        weight: 20,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/user',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Disabled': 'true',
              },
            },
          },
        ],
      },
      {
        name: 'Investor Metrics - Without Caching',
        weight: 10,
        flow: [
          {
            post: {
              url: '/api/auth/login',
              json: {
                email: '{{ testUserEmail }}',
                password: '{{ testUserPassword }}',
              },
              capture: [{ json: '$.token', as: 'authToken' }],
            },
          },
          {
            get: {
              url: '/api/metrics/investor',
              headers: {
                Authorization: 'Bearer {{ authToken }}',
                'X-Cache-Disabled': 'true',
              },
            },
          },
        ],
      },
    ],
  },
};

// Export configurations
export default testScenarios;

// Individual exports for specific scenarios
export const baselineConfig = testScenarios.baseline;
export const moderateConfig = testScenarios.moderate;
export const highConfig = testScenarios.high;
export const stressConfig = testScenarios.stress;
export const withCachingConfig = testScenarios.withCaching;
export const withoutCachingConfig = testScenarios.withoutCaching;
