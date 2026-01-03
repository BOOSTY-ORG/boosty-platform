/**
 * Notification System Test Runner
 *
 * This script provides an easy way to run all notification system tests:
 * - Run individual test suites
 * - Run comprehensive tests
 * - Generate reports
 * - Test with different configurations
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configurations
const TEST_CONFIGS = {
  // Run all tests using Jest
  jest: {
    command: 'npm',
    args: ['test', '--', '--testPathPattern=notification'],
    description: 'Run all notification tests with Jest',
  },

  // Run comprehensive test suite
  comprehensive: {
    command: 'node',
    args: ['test-notification-system-complete.js'],
    description: 'Run comprehensive notification system tests',
  },

  // Run performance tests
  performance: {
    command: 'node',
    args: ['tests/notification-performance.test.js'],
    description: 'Run performance and load tests',
  },

  // Run model tests
  models: {
    command: 'node',
    args: ['tests/notification-models.test.js'],
    description: 'Run notification model tests',
  },

  // Run integration tests
  integration: {
    command: 'node',
    args: ['tests/notification-services-integration.test.js'],
    description: 'Run notification service integration tests',
  },

  // Run with coverage
  coverage: {
    command: 'npm',
    args: ['test', '--', '--coverage', '--testPathPattern=notification'],
    description: 'Run tests with coverage report',
  },
};

/**
 * Display available test configurations
 */
function showTestConfigs() {
  console.log('\n🧪 Available Test Configurations:');
  console.log('='.repeat(50));

  Object.entries(TEST_CONFIGS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} - ${config.description}`);
  });

  console.log('\nUsage: node run-notification-tests.js [config]');
  console.log('Example: node run-notification-tests.js comprehensive');
}

/**
 * Run a test configuration
 */
function runTestConfig(configKey) {
  const config = TEST_CONFIGS[configKey];

  if (!config) {
    console.error(`❌ Unknown test configuration: ${configKey}`);
    showTestConfigs();
    process.exit(1);
  }

  console.log(`\n🚀 Running: ${config.description}`);
  console.log('='.repeat(50));

  const child = spawn(config.command, config.args, {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Tests completed successfully!');
    } else {
      console.log(`\n❌ Tests failed with exit code: ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (error) => {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  });
}

/**
 * Check if test files exist
 */
function checkTestFiles() {
  const requiredFiles = [
    'test-notification-system-complete.js',
    'tests/notification-performance.test.js',
    'tests/notification-models.test.js',
    'tests/notification-services-integration.test.js',
    'tests/helpers/notification-test-fixtures.js',
  ];

  const missingFiles = requiredFiles.filter(
    (file) => !existsSync(join(__dirname, file))
  );

  if (missingFiles.length > 0) {
    console.error('❌ Missing test files:');
    missingFiles.forEach((file) => console.error(`   - ${file}`));
    console.error(
      '\nPlease ensure all test files are present before running tests.'
    );
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const configKey = args[0];

  // Check if test files exist
  checkTestFiles();

  // If no config specified, show available options
  if (!configKey) {
    showTestConfigs();
    return;
  }

  // Special case for 'all' - run all configurations
  if (configKey === 'all') {
    console.log('🔄 Running all test configurations sequentially...\n');

    const configs = Object.keys(TEST_CONFIGS);
    let currentConfigIndex = 0;

    function runNextConfig() {
      if (currentConfigIndex >= configs.length) {
        console.log('\n🎉 All test configurations completed!');
        return;
      }

      const currentConfig = configs[currentConfigIndex];
      console.log(
        `\n📋 Running configuration ${currentConfigIndex + 1}/${configs.length}: ${currentConfig}`
      );

      const config = TEST_CONFIGS[currentConfig];
      const child = spawn(config.command, config.args, {
        stdio: 'inherit',
        cwd: __dirname,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error(
            `❌ Configuration '${currentConfig}' failed with exit code: ${code}`
          );
          process.exit(code);
        }

        currentConfigIndex++;
        runNextConfig();
      });

      child.on('error', (error) => {
        console.error(
          `❌ Error running configuration '${currentConfig}':`,
          error
        );
        process.exit(1);
      });
    }

    runNextConfig();
    return;
  }

  // Run specific configuration
  runTestConfig(configKey);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
main();
