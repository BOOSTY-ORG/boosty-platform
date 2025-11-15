import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDashboard } from '../../context/DashboardContext.jsx';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters.js';

const FinanceDashboard = () => {
  const { user } = useAuth();
  const { 
    overview, 
    financialSummary, 
    recentTransactions,
    getOverview, 
    getFinancialSummary, 
    getRecentTransactions,
    isLoading 
  } = useDashboard();

  React.useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        getOverview(),
        getFinancialSummary(),
        getRecentTransactions(10)
      ]);
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Finance Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Financial overview and transaction management for the Boosty platform.
          </p>
        </div>
      </div>

      {/* Financial Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267.653-.235.932.054l1.162.382.096.048.177.08.533.134.867-.046.795-.331 1.519-.211.548-.474.916-.658.798-.499 1.395-.565 1.639-.405.439.406.699.406.699 0 1.002-.406 1.002-.406 0 .193-.031.433-.046.699-.046.345 0 .504-.054.699-.161.445-.251.802-.517 1.102-.934.705-.712 1.158-1.85.102-.267-.35-.577-.534-.933-.702-.526-.39-1.188-.39-1.188 0-.41.025-.802.072-1.188.39a1.75 1.75 0 01-.713.565c-.405.224-.84.285-1.175.285-.46 0-.905-.084-1.33-.235C8.66 7.942 7.854 8.8 6.775c-.089-.897.716-1.783 1.8-2.683.084-.9.168-.657.168-1.657v-5c0-1.11.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-5z"/>
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(financialSummary?.totalRevenue || overview?.totalRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(financialSummary?.monthlyRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Investments</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(financialSummary?.totalInvestments || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Profit Margin</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatPercentage(financialSummary?.profitMargin || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Charts and Analytics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue Breakdown</h3>
            <div className="mt-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-700">Solar Investments</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(financialSummary?.revenueBreakdown?.solarInvestments || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-700">Service Fees</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(financialSummary?.revenueBreakdown?.serviceFees || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-700">Commission</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(financialSummary?.revenueBreakdown?.commission || 0)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                    <span className="text-sm text-gray-700">Other</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(financialSummary?.revenueBreakdown?.other || 0)}
                  </span>
                </div>
              </div>
              
              {/* Placeholder for chart */}
              <div className="mt-6 h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">Revenue Chart</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Methods</h3>
            <div className="mt-5">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Bank Transfer</span>
                    <span className="text-sm text-gray-500">
                      {financialSummary?.paymentMethods?.bankTransfer || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${financialSummary?.paymentMethods?.bankTransfer || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Credit Card</span>
                    <span className="text-sm text-gray-500">
                      {financialSummary?.paymentMethods?.creditCard || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${financialSummary?.paymentMethods?.creditCard || 0}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Mobile Money</span>
                    <span className="text-sm text-gray-500">
                      {financialSummary?.paymentMethods?.mobileMoney || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ width: `${financialSummary?.paymentMethods?.mobileMoney || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all
            </button>
          </div>
          <div className="mt-5">
            {recentTransactions?.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentTransactions.slice(0, 5).map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.customer || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(transaction.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {transaction.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.date ? new Date(transaction.date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <p>No recent transactions to display</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Average Transaction Value</h3>
            <div className="mt-2">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(financialSummary?.averageTransactionValue || 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                <span className={`inline-flex items-center ${
                  financialSummary?.avgTransactionChange > 0 ? 'text-green-600' : 
                  financialSummary?.avgTransactionChange < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {financialSummary?.avgTransactionChange > 0 ? '↑' : 
                   financialSummary?.avgTransactionChange < 0 ? '↓' : '→'} 
                  {formatPercentage(Math.abs(financialSummary?.avgTransactionChange || 0))}
                </span>
                {' '}from last month
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Payouts</h3>
            <div className="mt-2">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(financialSummary?.pendingPayouts || 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {formatNumber(financialSummary?.pendingPayoutsCount || 0)} transactions
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Growth</h3>
            <div className="mt-2">
              <p className="text-3xl font-bold text-gray-900">
                {formatPercentage(financialSummary?.monthlyGrowth || 0)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Revenue growth rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;