#!/usr/bin/env node

/**
 * Payment Test Runner Script
 * 
 * This script provides a comprehensive test runner for all payment-related tests
 * including unit tests, integration tests, end-to-end tests, and performance tests.
 * 
 * Usage:
 *   node scripts/test-payment.js [options]
 * 
 * Options:
 *   --unit              Run unit tests only
 *   --integration       Run integration tests only
 *   --e2e               Run end-to-end tests only
 *   --performance       Run performance tests only
 *   --coverage          Generate coverage report
 *   --watch             Run tests in watch mode
 *   --verbose           Enable verbose output
 *   --silent            Suppress output except errors
 *   --filter <pattern>  Run tests matching pattern
 *   --timeout <ms>      Set test timeout (default: 30000)
 *   --parallel <num>    Run tests in parallel (default: 1)
 *   --bail              Stop on first test failure
 *   --reporter <type>   Test reporter (default: 'default')
 *   --env <environment> Test environment (default: 'test')
 *   --db-reset          Reset test database before running tests
 *   --help              Show help information
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  unit: false,
  integration: false,
  e2e: false,
  performance: false,
  coverage: false,
  watch: false,
  verbose: false,
  silent: false,
  filter: null,
  timeout: 30000,
  parallel: 1,
  bail: false,
  reporter: 'default',
  env: 'test',
  dbReset: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--unit':
      options.unit = true;
      break;
    case '--integration':
      options.integration = true;
      break;
    case '--e2e':
      options.e2e = true;
      break;
    case '--performance':
      options.performance = true;
      break;
    case '--coverage':
      options.coverage = true;
      break;
    case '--watch':
      options.watch = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--silent':
      options.silent = true;
      break;
    case '--bail':
      options.bail = true;
      break;
    case '--db-reset':
      options.dbReset = true;
      break;
    case '--help':
      options.help = true;
      break;
    case '--filter':
      options.filter = args[++i];
      break;
    case '--timeout':
      options.timeout = parseInt(args[++i]);
      break;
    case '--parallel':
      options.parallel = parseInt(args[++i]);
      break;
    case '--reporter':
      options.reporter = args[++i];
      break;
    case '--env':
      options.env = args[++i];
      break;
    default:
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
  }
}

// Show help information
if (options.help) {
  console.log(`
Payment Test Runner Script

Usage: node scripts/test-payment.js [options]

Options:
  --unit              Run unit tests only
  --integration       Run integration tests only
  --e2e               Run end-to-end tests only
  --performance       Run performance tests only
  --coverage          Generate coverage report
  --watch             Run tests in watch mode
  --verbose           Enable verbose output
  --silent            Suppress output except errors
  --filter <pattern>  Run tests matching pattern
  --timeout <ms>      Set test timeout (default: 30000)
  --parallel <num>    Run tests in parallel (default: 1)
  --bail              Stop on first test failure
  --reporter <type>   Test reporter (default: 'default')
  --env <environment> Test environment (default: 'test')
  --db-reset          Reset test database before running tests
  --help              Show this help information

Examples:
  # Run all payment tests
  node scripts/test-payment.js

  # Run unit tests with coverage
  node scripts/test-payment.js --unit --coverage

  # Run integration tests in watch mode
  node scripts/test-payment.js --integration --watch

  # Run performance tests with verbose output
  node scripts/test-payment.js --performance --verbose

  # Run all tests with custom timeout and parallel execution
  node scripts/test-payment.js --timeout 60000 --parallel 4

  # Run tests matching a specific pattern
  node scripts/test-payment.js --filter "payment.*service"
`);
  process.exit(0);
}

// If no specific test type is specified, run all tests
if (!options.unit && !options.integration && !options.e2e && !options.performance) {
  options.unit = true;
  options.integration = true;
  options.e2e = true;
  options.performance = true;
}

// Build Jest command arguments
function buildJestCommand(testPattern, additionalOptions = {}) {
  const jestArgs = [
    'npx',
    'jest',
    testPattern,
    `--config=jest.config.cjs`,
    `--testTimeout=${options.timeout}`,
    `--maxWorkers=${options.parallel}`,
    `--reporter=${options.reporter}`,
    `--testEnvironment=${options.env}`
  ];

  if (options.coverage) {
    jestArgs.push('--coverage');
    jestArgs.push('--coverageDirectory=coverage/payment');
    jestArgs.push('--collectCoverageFrom=src/services/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageFrom=src/models/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageFrom=src/controllers/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageFrom=src/utils/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageFrom=src/middleware/payment/**/*.{js,ts}');
  }

  if (options.watch) {
    jestArgs.push('--watch');
  }

  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  if (options.silent) {
    jestArgs.push('--silent');
  }

  if (options.bail) {
    jestArgs.push('--bail');
  }

  if (options.filter) {
    jestArgs.push(`--testNamePattern="${options.filter}"`);
  }

  if (additionalOptions.setupFiles) {
    jestArgs.push(`--setupFilesAfterEnv=${additionalOptions.setupFiles}`);
  }

  return jestArgs.join(' ');
}

// Reset test database if requested
async function resetTestDatabase() {
  if (!options.dbReset) return;

  console.log('🔄 Resetting test database...');
  try {
    execSync('node scripts/reset-test-db.js', { stdio: 'inherit' });
    console.log('✅ Test database reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset test database:', error.message);
    process.exit(1);
  }
}

// Run tests and handle results
async function runTests(testType, testPattern, additionalOptions = {}) {
  console.log(`\n🧪 Running ${testType} tests...`);
  
  const startTime = Date.now();
  
  try {
    const command = buildJestCommand(testPattern, additionalOptions);
    
    if (!options.silent) {
      console.log(`📝 Command: ${command}`);
    }

    execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: process.cwd()
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ ${testType} tests completed successfully (${duration.toFixed(2)}s)`);
    return true;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.error(`❌ ${testType} tests failed (${duration.toFixed(2)}s)`);
    
    if (options.bail) {
      console.error('🛑 Stopping test execution due to --bail flag');
      process.exit(1);
    }
    
    return false;
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Payment Test Runner');
  console.log(`📊 Test Configuration:`, {
    unit: options.unit,
    integration: options.integration,
    e2e: options.e2e,
    performance: options.performance,
    coverage: options.coverage,
    watch: options.watch,
    verbose: options.verbose,
    silent: options.silent,
    timeout: options.timeout,
    parallel: options.parallel,
    bail: options.bail,
    env: options.env,
    dbReset: options.dbReset
  });

  // Reset test database if requested
  await resetTestDatabase();

  const results = {
    unit: { passed: false, skipped: !options.unit },
    integration: { passed: false, skipped: !options.integration },
    e2e: { passed: false, skipped: !options.e2e },
    performance: { passed: false, skipped: !options.performance }
  };

  const totalStartTime = Date.now();

  // Run unit tests
  if (options.unit) {
    results.unit.passed = await runTests(
      'Unit',
      'tests/unit/payment/**/*.test.js',
      { setupFiles: 'tests/setup.cjs' }
    );
  }

  // Run integration tests
  if (options.integration) {
    results.integration.passed = await runTests(
      'Integration',
      'tests/integration/payment/**/*.test.js',
      { setupFiles: 'tests/setup.cjs' }
    );
  }

  // Run end-to-end tests
  if (options.e2e) {
    results.e2e.passed = await runTests(
      'End-to-End',
      'tests/e2e/payment.e2e.test.js',
      { setupFiles: 'tests/setup.cjs' }
    );
  }

  // Run performance tests
  if (options.performance) {
    results.performance.passed = await runTests(
      'Performance',
      'tests/performance/payment.performance.test.js',
      { setupFiles: 'tests/setup.cjs' }
    );
  }

  const totalEndTime = Date.now();
  const totalDuration = (totalEndTime - totalStartTime) / 1000;

  // Print summary
  console.log('\n📋 Test Results Summary:');
  console.log('─'.repeat(50));
  
  Object.entries(results).forEach(([testType, result]) => {
    const status = result.skipped ? '⏭️  SKIPPED' : result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${testType.charAt(0).toUpperCase() + testType.slice(1)} Tests: ${status}`);
  });
  
  console.log('─'.repeat(50));
  console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);

  // Generate coverage report if requested
  if (options.coverage && fs.existsSync('coverage/payment')) {
    console.log('\n📊 Coverage Report Generated:');
    console.log('📁 Location: coverage/payment/lcov-report/index.html');
    
    try {
      const coverageSummary = fs.readFileSync('coverage/payment/coverage-summary.txt', 'utf8');
      console.log('\n📈 Coverage Summary:');
      console.log(coverageSummary);
    } catch (error) {
      console.log('⚠️  Could not read coverage summary');
    }
  }

  // Determine exit code
  const failedTests = Object.values(results).filter(result => !result.skipped && !result.passed).length;
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log(`\n💥 ${failedTests} test suite(s) failed!`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run main function
main().catch(error => {
  console.error('💥 Test runner failed:', error.message);
  process.exit(1);
});