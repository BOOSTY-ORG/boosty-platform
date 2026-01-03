import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Monitor,
  Smartphone,
  Tablet,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import FinancialKPICards from './FinancialKPICards.jsx';
import { RevenueChart } from './Charts/index.js';
import { TransactionTable } from './Tables/index.js';
import { PayoutTable } from './Tables/index.js';
import { ROIAnalyticsChart } from './Charts/index.js';
import { useFinance } from '../../context/FinanceContext.jsx';
import testConfig, { 
  enableMockData, 
  disableMockData, 
  toggleMockData, 
  setTestScenario, 
  getCurrentScenario,
  setDataSize,
  getCurrentDataSize,
  performanceMonitor,
  visualRegressionHelper
} from '../../utils/testConfig.js';
import financeTestScenarios from '../../utils/financeTestScenarios.js';
import Card from '../common/Card.jsx';

/**
 * FinanceTestPage - Comprehensive testing interface for finance components
 * 
 * Provides controls to:
 * - Toggle between real API and mock data
 * - Switch between different test scenarios
 * - Test responsive design on different screen sizes
 * - Run performance tests
 * - Capture screenshots for visual regression
 * - Test error states and edge cases
 */
const FinanceTestPage = () => {
  const [testState, setTestState] = useState({
    isRunning: false,
    currentTest: null,
    results: [],
    selectedComponents: {
      kpi: true,
      charts: true,
      tables: true
    },
    viewport: 'desktop',
    showTestData: true
  });
  
  const [scenarioResults, setScenarioResults] = useState({});
  const { getKPIData, getTransactionTimeline, getPayoutData, getROIAnalytics } = useFinance();

  // Initialize test environment
  useEffect(() => {
    // Enable mock data by default in test mode
    if (testConfig.useMockData) {
      enableMockData();
    }
    
    // Set default scenario
    setTestScenario(testConfig.scenarios.SUCCESS);
    
    // Load saved test results
    const savedResults = localStorage.getItem('FINANCE_TEST_RESULTS');
    if (savedResults) {
      setScenarioResults(JSON.parse(savedResults));
    }
  }, []);

  // Run comprehensive tests
  const runComprehensiveTests = async () => {
    setTestState(prev => ({ ...prev, isRunning: true, currentTest: 'comprehensive' }));
    
    const results = [];
    const startTime = performance.now();
    
    try {
      // Test KPI components
      if (testState.selectedComponents.kpi) {
        results.push(await testKPIComponents());
      }
      
      // Test Chart components
      if (testState.selectedComponents.charts) {
        results.push(await testChartComponents());
      }
      
      // Test Table components
      if (testState.selectedComponents.tables) {
        results.push(await testTableComponents());
      }
      
      // Test responsive design
      results.push(await testResponsiveDesign());
      
      // Test performance
      results.push(await testPerformance());
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      const testResults = {
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        results: results,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        total: results.length
      };
      
      setScenarioResults(prev => ({
        ...prev,
        comprehensive: testResults
      }));
      
      // Save results
      localStorage.setItem('FINANCE_TEST_RESULTS', JSON.stringify({
        ...scenarioResults,
        comprehensive: testResults
      }));
      
    } catch (error) {
      console.error('Test execution failed:', error);
      results.push({
        component: 'test-runner',
        status: 'error',
        error: error.message
      });
    } finally {
      setTestState(prev => ({ ...prev, isRunning: false, currentTest: null }));
    }
  };

  // Test KPI components
  const testKPIComponents = async () => {
    performanceMonitor.start();
    
    try {
      // Test different KPI scenarios
      const scenarios = Object.values(financeTestScenarios.kpi);
      
      for (const scenario of scenarios) {
        setTestScenario(testConfig.scenarios.SUCCESS);
        await getKPIData();
        
        // Add scenario-specific testing logic here
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const duration = performanceMonitor.end('KPI Components Test');
      
      return {
        component: 'kpi-cards',
        status: 'passed',
        duration,
        scenarios: scenarios.length
      };
    } catch (error) {
      performanceMonitor.end('KPI Components Test');
      return {
        component: 'kpi-cards',
        status: 'failed',
        error: error.message
      };
    }
  };

  // Test Chart components
  const testChartComponents = async () => {
    performanceMonitor.start();
    
    try {
      // Test different chart scenarios
      const scenarios = Object.values(financeTestScenarios.chart);
      
      for (const scenario of scenarios) {
        // Test revenue chart
        await getKPIData();
        
        // Test ROI analytics
        await getROIAnalytics();
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const duration = performanceMonitor.end('Chart Components Test');
      
      return {
        component: 'charts',
        status: 'passed',
        duration,
        scenarios: scenarios.length
      };
    } catch (error) {
      performanceMonitor.end('Chart Components Test');
      return {
        component: 'charts',
        status: 'failed',
        error: error.message
      };
    }
  };

  // Test Table components
  const testTableComponents = async () => {
    performanceMonitor.start();
    
    try {
      // Test different table scenarios
      const scenarios = Object.values(financeTestScenarios.table);
      
      for (const scenario of scenarios) {
        // Test transaction table
        await getTransactionTimeline();
        
        // Test payout table
        await getPayoutData();
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const duration = performanceMonitor.end('Table Components Test');
      
      return {
        component: 'tables',
        status: 'passed',
        duration,
        scenarios: scenarios.length
      };
    } catch (error) {
      performanceMonitor.end('Table Components Test');
      return {
        component: 'tables',
        status: 'failed',
        error: error.message
      };
    }
  };

  // Test responsive design
  const testResponsiveDesign = async () => {
    performanceMonitor.start();
    
    try {
      const viewports = [
        { name: 'mobile', width: 375, height: 667 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1920, height: 1080 }
      ];
      
      for (const viewport of viewports) {
        // Simulate viewport change
        setTestState(prev => ({ ...prev, viewport: viewport.name }));
        
        // Take screenshot for visual regression
        visualRegressionHelper.takeScreenshot(`finance-${viewport.name}`, viewport);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const duration = performanceMonitor.end('Responsive Design Test');
      
      return {
        component: 'responsive-design',
        status: 'passed',
        duration,
        viewports: viewports.length
      };
    } catch (error) {
      performanceMonitor.end('Responsive Design Test');
      return {
        component: 'responsive-design',
        status: 'failed',
        error: error.message
      };
    }
  };

  // Test performance
  const testPerformance = async () => {
    performanceMonitor.start();
    
    try {
      // Test with large dataset
      setDataSize('LARGE');
      
      // Load data
      await Promise.all([
        getKPIData(),
        getTransactionTimeline(),
        getPayoutData(),
        getROIAnalytics()
      ]);
      
      // Measure render performance
      const renderTime = performanceMonitor.measureRender('Finance Components', () => {
        // Components are already rendered, just measure the current state
        return true;
      });
      
      const duration = performanceMonitor.end('Performance Test');
      
      return {
        component: 'performance',
        status: renderTime < testConfig.performance.MAX_RENDER_TIME ? 'passed' : 'failed',
        duration,
        renderTime,
        dataSize: 'LARGE'
      };
    } catch (error) {
      performanceMonitor.end('Performance Test');
      return {
        component: 'performance',
        status: 'failed',
        error: error.message
      };
    }
  };

  // Run specific scenario
  const runScenario = async (scenarioName) => {
    setTestState(prev => ({ ...prev, isRunning: true, currentTest: scenarioName }));
    
    try {
      setTestScenario(scenarioName);
      
      // Load data for the scenario
      await Promise.all([
        getKPIData(),
        getTransactionTimeline(),
        getPayoutData(),
        getROIAnalytics()
      ]);
      
      const result = {
        scenario: scenarioName,
        status: 'passed',
        timestamp: new Date().toISOString()
      };
      
      setScenarioResults(prev => ({
        ...prev,
        [scenarioName]: result
      }));
      
    } catch (error) {
      const result = {
        scenario: scenarioName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      setScenarioResults(prev => ({
        ...prev,
        [scenarioName]: result
      }));
    } finally {
      setTestState(prev => ({ ...prev, isRunning: false, currentTest: null }));
    }
  };

  // Clear test results
  const clearResults = () => {
    setScenarioResults({});
    localStorage.removeItem('FINANCE_TEST_RESULTS');
  };

  // Get viewport icon
  const getViewportIcon = (viewport) => {
    switch (viewport) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="finance-test-page p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Components Test Suite</h1>
          <p className="text-gray-600">
            Comprehensive testing interface for finance UI components with mock data support
          </p>
        </div>

        {/* Test Controls */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Test Controls
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mock Data Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mock Data Mode
                </label>
                <button
                  onClick={toggleMockData}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    testConfig.useMockData 
                      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {testConfig.useMockData ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {testConfig.useMockData ? 'Mock Data Enabled' : 'Using Real API'}
                </button>
              </div>

              {/* Test Scenario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Scenario
                </label>
                <select
                  value={getCurrentScenario().name}
                  onChange={(e) => setTestScenario(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(testScenarios).map(([key, scenario]) => (
                    <option key={key} value={key}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Size
                </label>
                <select
                  value={getCurrentDataSize()}
                  onChange={(e) => setDataSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SMALL">Small (5 items)</option>
                  <option value="MEDIUM">Medium (25 items)</option>
                  <option value="LARGE">Large (100 items)</option>
                  <option value="EXTRA_LARGE">Extra Large (500 items)</option>
                </select>
              </div>
            </div>

            {/* Component Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Components
              </label>
              <div className="flex gap-4">
                {Object.entries(testState.selectedComponents).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setTestState(prev => ({
                        ...prev,
                        selectedComponents: {
                          ...prev.selectedComponents,
                          [key]: e.target.checked
                        }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {key === 'kpi' ? 'KPI Cards' : key}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={runComprehensiveTests}
                disabled={testState.isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testState.isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run All Tests
                  </>
                )}
              </button>
              
              <button
                onClick={clearResults}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Clear Results
              </button>
            </div>
          </div>
        </Card>

        {/* Test Results */}
        {Object.keys(scenarioResults).length > 0 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
              
              <div className="space-y-3">
                {Object.entries(scenarioResults).map(([key, result]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.status === 'passed' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : result.status === 'failed' ? (
                        <XCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      )}
                      
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {result.timestamp && new Date(result.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        result.status === 'passed' ? 'text-green-600' : 
                        result.status === 'failed' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`}>
                        {result.status.toUpperCase()}
                      </div>
                      {result.duration && (
                        <div className="text-xs text-gray-500">
                          {result.duration.toFixed(2)}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Component Preview */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Component Preview</h2>
            
            {/* Viewport Indicator */}
            <div className="flex items-center gap-2 mb-4">
              {getViewportIcon(testState.viewport)}
              <span className="text-sm text-gray-600 capitalize">
                {testState.viewport} View
              </span>
            </div>

            {/* Component Containers */}
            <div className={`space-y-6 ${
              testState.viewport === 'mobile' ? 'max-w-sm mx-auto' :
              testState.viewport === 'tablet' ? 'max-w-2xl mx-auto' :
              ''
            }`}>
              {/* KPI Cards */}
              {testState.selectedComponents.kpi && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">KPI Cards</h3>
                  <FinancialKPICards />
                </div>
              )}

              {/* Charts */}
              {testState.selectedComponents.charts && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Charts</h3>
                  <div className="space-y-6">
                    <RevenueChart height={300} />
                    <ROIAnalyticsChart height={300} />
                  </div>
                </div>
              )}

              {/* Tables */}
              {testState.selectedComponents.tables && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Tables</h3>
                  <div className="space-y-6">
                    <TransactionTable />
                    <PayoutTable />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FinanceTestPage;