#!/usr/bin/env node

/**
 * Payment Test Coverage Report Generator
 * 
 * This script generates comprehensive coverage reports for payment components
 * and provides detailed analysis of test coverage metrics.
 * 
 * Usage:
 *   node scripts/test-payment-coverage.js [options]
 * 
 * Options:
 *   --format <format>  Coverage report format (html, lcov, text, json) (default: html)
 *   --threshold <num>   Minimum coverage threshold percentage (default: 90)
 *   --compare           Compare with previous coverage report
 *   --open              Open coverage report in browser
 *   --output <dir>      Output directory for reports (default: coverage/payment)
 * --include-uncovered  Include uncovered files in report
 * --verbose            Show detailed coverage information
 * --help               Show help information
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  format: 'html',
  threshold: 90,
  compare: false,
  open: false,
  output: 'coverage/payment',
  includeUncovered: false,
  verbose: false,
  help: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  switch (arg) {
    case '--format':
      options.format = args[++i];
      break;
    case '--threshold':
      options.threshold = parseInt(args[++i]);
      break;
    case '--compare':
      options.compare = true;
      break;
    case '--open':
      options.open = true;
      break;
    case '--output':
      options.output = args[++i];
      break;
    case '--include-uncovered':
      options.includeUncovered = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      options.help = true;
      break;
    default:
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
  }
}

// Show help information
if (options.help) {
  console.log(`
Payment Test Coverage Report Generator

Usage: node scripts/test-payment-coverage.js [options]

Options:
  --format <format>  Coverage report format (html, lcov, text, json) (default: html)
  --threshold <num>   Minimum coverage threshold percentage (default: 90)
  --compare           Compare with previous coverage report
  --open              Open coverage report in browser
  --output <dir>      Output directory for reports (default: coverage/payment)
  --include-uncovered  Include uncovered files in report
  --verbose            Show detailed coverage information
  --help               Show this help information

Examples:
  # Generate HTML coverage report
  node scripts/test-payment-coverage.js

  # Generate coverage with 95% threshold and open in browser
  node scripts/test-payment-coverage.js --threshold 95 --open

  # Generate JSON coverage report with comparison
  node scripts/test-payment-coverage.js --format json --compare

  # Generate detailed coverage report including uncovered files
  node scripts/test-payment-coverage.js --include-uncovered --verbose
`);
  process.exit(0);
}

// Validate format option
const validFormats = ['html', 'lcov', 'text', 'json'];
if (!validFormats.includes(options.format)) {
  console.error(`Invalid format: ${options.format}. Valid formats: ${validFormats.join(', ')}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
function ensureOutputDirectory() {
  if (!fs.existsSync(options.output)) {
    fs.mkdirSync(options.output, { recursive: true });
  }
}

// Backup previous coverage report for comparison
function backupPreviousCoverage() {
  const coverageFile = path.join(options.output, 'coverage-summary.json');
  const backupFile = path.join(options.output, 'coverage-summary-previous.json');
  
  if (fs.existsSync(coverageFile)) {
    fs.copyFileSync(coverageFile, backupFile);
    console.log('📋 Previous coverage report backed up for comparison');
  }
}

// Run coverage tests
function runCoverageTests() {
  console.log('🧪 Running payment tests with coverage...');
  
  const jestArgs = [
    'npx',
    'jest',
    'tests/payment/**/*.test.js',
    '--config=jest.config.cjs',
    '--coverage',
    `--coverageDirectory=${options.output}`,
    '--collectCoverageFrom=src/services/payment/**/*.{js,ts}',
    '--collectCoverageFrom=src/models/payment/**/*.{js,ts}',
    '--collectCoverageFrom=src/controllers/payment/**/*.{js,ts}',
    '--collectCoverageFrom=src/utils/payment/**/*.{js,ts}',
    '--collectCoverageFrom=src/middleware/payment/**/*.{js,ts}',
    '--coverageReporters=text',
    `--coverageReporters=${options.format}`,
    '--testTimeout=30000',
    '--maxWorkers=1',
    '--testEnvironment=test'
  ];

  if (options.includeUncovered) {
    jestArgs.push('--collectCoverageOnlyFrom=src/services/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageOnlyFrom=src/models/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageOnlyFrom=src/controllers/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageOnlyFrom=src/utils/payment/**/*.{js,ts}');
    jestArgs.push('--collectCoverageOnlyFrom=src/middleware/payment/**/*.{js,ts}');
  }

  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  try {
    execSync(jestArgs.join(' '), { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Coverage tests completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Coverage tests failed');
    return false;
  }
}

// Parse coverage summary from JSON file
function parseCoverageSummary() {
  const coverageFile = path.join(options.output, 'coverage-summary.json');
  
  if (!fs.existsSync(coverageFile)) {
    console.error('❌ Coverage summary file not found');
    return null;
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    return coverageData;
  } catch (error) {
    console.error('❌ Failed to parse coverage summary:', error.message);
    return null;
  }
}

// Parse previous coverage summary for comparison
function parsePreviousCoverageSummary() {
  const backupFile = path.join(options.output, 'coverage-summary-previous.json');
  
  if (!fs.existsSync(backupFile)) {
    return null;
  }

  try {
    const coverageData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    return coverageData;
  } catch (error) {
    console.error('⚠️  Failed to parse previous coverage summary:', error.message);
    return null;
  }
}

// Calculate coverage percentage
function calculateCoveragePercentage(coverageData) {
  if (!coverageData || !coverageData.total) return 0;
  
  const total = coverageData.total;
  return {
    lines: total.lines.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
    statements: total.statements.pct
  };
}

// Compare coverage with previous report
function compareCoverage(current, previous) {
  if (!current || !previous) return null;

  const currentCoverage = calculateCoveragePercentage(current);
  const previousCoverage = calculateCoveragePercentage(previous);

  return {
    lines: currentCoverage.lines - previousCoverage.lines,
    functions: currentCoverage.functions - previousCoverage.functions,
    branches: currentCoverage.branches - previousCoverage.branches,
    statements: currentCoverage.statements - previousCoverage.statements
  };
}

// Generate coverage report
function generateCoverageReport(coverageData, comparisonData) {
  const coveragePercentage = calculateCoveragePercentage(coverageData);
  
  console.log('\n📊 Payment Test Coverage Report');
  console.log('─'.repeat(50));
  
  console.log(`📈 Overall Coverage:`);
  console.log(`   Lines: ${coveragePercentage.lines.toFixed(2)}%`);
  console.log(`   Functions: ${coveragePercentage.functions.toFixed(2)}%`);
  console.log(`   Branches: ${coveragePercentage.branches.toFixed(2)}%`);
  console.log(`   Statements: ${coveragePercentage.statements.toFixed(2)}%`);

  // Check threshold compliance
  const belowThreshold = [];
  Object.entries(coveragePercentage).forEach(([metric, value]) => {
    if (value < options.threshold) {
      belowThreshold.push(metric);
    }
  });

  if (belowThreshold.length > 0) {
    console.log(`\n⚠️  Coverage below ${options.threshold}% threshold: ${belowThreshold.join(', ')}`);
  } else {
    console.log(`\n✅ All coverage metrics meet ${options.threshold}% threshold`);
  }

  // Show comparison if available
  if (comparisonData) {
    console.log('\n📊 Coverage Comparison (Current vs Previous):');
    Object.entries(comparisonData).forEach(([metric, change]) => {
      const arrow = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
      const sign = change > 0 ? '+' : '';
      console.log(`   ${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${arrow} ${sign}${change.toFixed(2)}%`);
    });
  }

  // Show file-by-file coverage if verbose
  if (options.verbose && coverageData) {
    console.log('\n📁 File-by-File Coverage:');
    Object.entries(coverageData).forEach(([filename, data]) => {
      if (filename !== 'total') {
        console.log(`   ${filename}:`);
        console.log(`     Lines: ${data.lines.pct.toFixed(2)}% (${data.lines.covered}/${data.lines.total})`);
        console.log(`     Functions: ${data.functions.pct.toFixed(2)}% (${data.functions.covered}/${data.functions.total})`);
        console.log(`     Branches: ${data.branches.pct.toFixed(2)}% (${data.branches.covered}/${data.branches.total})`);
        console.log(`     Statements: ${data.statements.pct.toFixed(2)}% (${data.statements.covered}/${data.statements.total})`);
      }
    });
  }

  return {
    coveragePercentage,
    belowThreshold: belowThreshold.length > 0,
    comparisonData
  };
}

// Generate detailed coverage report in JSON format
function generateDetailedJsonReport(coverageData, reportData) {
  const reportFile = path.join(options.output, 'detailed-coverage-report.json');
  
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      overall: reportData.coveragePercentage,
      threshold: options.threshold,
      belowThreshold: reportData.belowThreshold
    },
    comparison: reportData.comparisonData,
    files: {}
  };

  // Add file-level details
  Object.entries(coverageData).forEach(([filename, data]) => {
    if (filename !== 'total') {
      detailedReport.files[filename] = {
        lines: data.lines,
        functions: data.functions,
        branches: data.branches,
        statements: data.statements
      };
    }
  });

  fs.writeFileSync(reportFile, JSON.stringify(detailedReport, null, 2));
  console.log(`\n📄 Detailed JSON report generated: ${reportFile}`);
}

// Open coverage report in browser
function openCoverageReport() {
  if (options.format !== 'html') {
    console.log('⚠️  Browser opening only supported for HTML format');
    return;
  }

  const reportFile = path.join(options.output, 'lcov-report', 'index.html');
  
  if (!fs.existsSync(reportFile)) {
    console.error('❌ HTML coverage report not found');
    return;
  }

  const openCommand = process.platform === 'win32' ? 'start' : 
                     process.platform === 'darwin' ? 'open' : 'xdg-open';
  
  try {
    execSync(`${openCommand} "${reportFile}"`);
    console.log('🌐 Coverage report opened in browser');
  } catch (error) {
    console.error('❌ Failed to open coverage report:', error.message);
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting Payment Coverage Report Generation');
  console.log(`📊 Configuration:`, {
    format: options.format,
    threshold: options.threshold,
    compare: options.compare,
    output: options.output,
    includeUncovered: options.includeUncovered,
    verbose: options.verbose
  });

  ensureOutputDirectory();

  // Backup previous coverage if comparison is requested
  if (options.compare) {
    backupPreviousCoverage();
  }

  // Run coverage tests
  const testsPassed = runCoverageTests();
  if (!testsPassed) {
    console.error('💥 Coverage tests failed - report generation incomplete');
    process.exit(1);
  }

  // Parse coverage data
  const coverageData = parseCoverageSummary();
  if (!coverageData) {
    console.error('💥 Failed to parse coverage data');
    process.exit(1);
  }

  // Parse previous coverage for comparison
  const previousCoverage = options.compare ? parsePreviousCoverageSummary() : null;
  const comparisonData = previousCoverage ? compareCoverage(coverageData, previousCoverage) : null;

  // Generate coverage report
  const reportData = generateCoverageReport(coverageData, comparisonData);

  // Generate detailed JSON report
  generateDetailedJsonReport(coverageData, reportData);

  // Open report in browser if requested
  if (options.open) {
    openCoverageReport();
  }

  // Determine exit code based on threshold compliance
  if (reportData.belowThreshold) {
    console.log('\n💥 Coverage threshold not met');
    process.exit(1);
  } else {
    console.log('\n🎉 Coverage report generated successfully!');
    process.exit(0);
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
  console.error('💥 Coverage report generation failed:', error.message);
  process.exit(1);
});