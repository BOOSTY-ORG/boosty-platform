import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const InvestmentTimeline = ({ investorId, timeRange = '1y' }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('timeline');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    fetchTimelineData();
  }, [investorId, timeRange]);

  const fetchTimelineData = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - in real implementation, this would call the API
      // const response = await investorsAPI.getInvestmentTimeline(investorId, { period: timeRange });
      
      // Mock timeline data
      const mockData = {
        investments: [
          {
            id: 1,
            date: '2023-01-15',
            type: 'investment',
            projectName: 'Solar Farm A',
            amount: 15000,
            status: 'active',
            description: 'Initial investment in utility-scale solar farm',
            category: 'utility',
            returns: 8.5,
            currentValue: 16275,
            documents: ['investment_agreement.pdf', 'due_diligence.pdf']
          },
          {
            id: 2,
            date: '2023-03-22',
            type: 'investment',
            projectName: 'Rooftop Solar C',
            amount: 8000,
            status: 'active',
            description: 'Commercial rooftop solar installation',
            category: 'commercial',
            returns: 7.2,
            currentValue: 8576,
            documents: ['investment_agreement.pdf']
          },
          {
            id: 3,
            date: '2023-05-10',
            type: 'return',
            projectName: 'Solar Farm A',
            amount: 637.50,
            status: 'completed',
            description: 'Quarterly return distribution',
            category: 'utility',
            returns: 0,
            currentValue: 0,
            documents: ['return_statement.pdf']
          },
          {
            id: 4,
            date: '2023-06-18',
            type: 'investment',
            projectName: 'Community Solar D',
            amount: 7000,
            status: 'active',
            description: 'Community solar project investment',
            category: 'community',
            returns: 10.1,
            currentValue: 7707,
            documents: ['investment_agreement.pdf', 'project_plan.pdf']
          },
          {
            id: 5,
            date: '2023-08-05',
            type: 'return',
            projectName: 'Rooftop Solar C',
            amount: 144,
            status: 'completed',
            description: 'Quarterly return distribution',
            category: 'commercial',
            returns: 0,
            currentValue: 0,
            documents: ['return_statement.pdf']
          },
          {
            id: 6,
            date: '2023-09-12',
            type: 'milestone',
            projectName: 'Solar Farm A',
            amount: 0,
            status: 'completed',
            description: 'Project reached 50% completion',
            category: 'utility',
            returns: 0,
            currentValue: 0,
            documents: ['completion_report.pdf']
          },
          {
            id: 7,
            date: '2023-10-28',
            type: 'investment',
            projectName: 'Commercial Solar E',
            amount: 5000,
            status: 'pending',
            description: 'Pending commercial solar investment',
            category: 'commercial',
            returns: 15.7,
            currentValue: 5000,
            documents: ['term_sheet.pdf']
          },
          {
            id: 8,
            date: '2023-11-15',
            type: 'return',
            projectName: 'Solar Farm A',
            amount: 637.50,
            status: 'completed',
            description: 'Quarterly return distribution',
            category: 'utility',
            returns: 0,
            currentValue: 0,
            documents: ['return_statement.pdf']
          }
        ],
        summary: {
          totalInvested: 35000,
          totalReturns: 1419,
          activeProjects: 4,
          pendingProjects: 1,
          completedProjects: 0,
          averageReturn: 9.2,
          bestPerformingProject: { name: 'Commercial Solar E', return: 15.7 },
          worstPerformingProject: { name: 'Rooftop Solar C', return: 7.2 }
        },
        monthlyActivity: [
          { month: 'Jan', investments: 15000, returns: 0, net: 15000 },
          { month: 'Feb', investments: 0, returns: 0, net: 0 },
          { month: 'Mar', investments: 8000, returns: 0, net: 8000 },
          { month: 'Apr', investments: 0, returns: 0, net: 0 },
          { month: 'May', investments: 0, returns: 637.50, net: -637.50 },
          { month: 'Jun', investments: 7000, returns: 0, net: 7000 },
          { month: 'Jul', investments: 0, returns: 0, net: 0 },
          { month: 'Aug', investments: 0, returns: 144, net: -144 },
          { month: 'Sep', investments: 0, returns: 0, net: 0 },
          { month: 'Oct', investments: 5000, returns: 0, net: 5000 },
          { month: 'Nov', investments: 0, returns: 637.50, net: -637.50 },
          { month: 'Dec', investments: 0, returns: 0, net: 0 }
        ]
      };

      setTimelineData(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to load timeline data');
      console.error('Error fetching timeline data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'investment':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267.653-.235.932.054l1.162.382.096.048.177.08.533.134.867-.046.795-.331 1.519-.211.548-.474.916-.658.798-.499 1.395-.565 1.639-.405.439.406.699.406.699 0 1.002-.406 1.002-.406 0 .193-.031.433-.046.699-.046.345 0 .504-.054.699-.161.445-.251.802-.517 1.102-.934.705-.712 1.158-1.85.102-.267-.35-.577-.534-.933-.702-.526-.39-1.188-.39-1.188 0-.41.025-.802.072-1.188.39a1.75 1.75 0 01-.713.565c-.405.224-.84.285-1.175.285-.46 0-.905-.084-1.33-.235C8.66 7.942 7.854 8.8 6.775c-.089-.897.716-1.783 1.8-2.683.084-.9.168-.657.168-1.657v-5c0-1.11.9-2 2-2h8c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2v-5z"/>
            </svg>
          </div>
        );
      case 'return':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'milestone':
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'utility': return 'bg-purple-100 text-purple-800';
      case 'commercial': return 'bg-blue-100 text-blue-800';
      case 'residential': return 'bg-green-100 text-green-800';
      case 'community': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvestments = timelineData?.investments.filter(item => {
    if (selectedPeriod === 'all') return true;
    const itemDate = new Date(item.date);
    const now = new Date();
    const monthsBack = selectedPeriod === '3m' ? 3 : selectedPeriod === '6m' ? 6 : 12;
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, now.getDate());
    return itemDate >= cutoffDate;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Invested</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(timelineData.summary.totalInvested)}
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
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Returns</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(timelineData.summary.totalReturns)}
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
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {timelineData.summary.activeProjects}
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
                    <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Return</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {timelineData.summary.averageReturn}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Views */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-3">
            <nav className="flex -mb-px">
              <button
                onClick={() => setSelectedView('timeline')}
                className={`py-2 px-4 text-sm font-medium ${
                  selectedView === 'timeline'
                    ? 'border-primary-500 text-primary-600 border-b-2'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                Timeline View
              </button>
              <button
                onClick={() => setSelectedView('activity')}
                className={`py-2 px-4 text-sm font-medium ${
                  selectedView === 'activity'
                    ? 'border-primary-500 text-primary-600 border-b-2'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                Monthly Activity
              </button>
              <button
                onClick={() => setSelectedView('list')}
                className={`py-2 px-4 text-sm font-medium ${
                  selectedView === 'list'
                    ? 'border-primary-500 text-primary-600 border-b-2'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
                }`}
              >
                List View
              </button>
            </nav>
            
            {selectedView === 'timeline' && (
              <div className="mt-3 sm:mt-0">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Time</option>
                  <option value="3m">Last 3 Months</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {selectedView === 'timeline' && (
            <div className="flow-root">
              <ul className="-mb-8">
                {filteredInvestments.map((item, itemIdx) => (
                  <li key={item.id}>
                    <div className="relative pb-8">
                      {itemIdx !== filteredInvestments.length - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-900 font-medium">{item.projectName}</p>
                            <p className="text-sm text-gray-500">{item.description}</p>
                            <div className="mt-2 flex space-x-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </span>
                            </div>
                            {item.documents && item.documents.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Documents:</p>
                                <div className="flex flex-wrap gap-1">
                                  {item.documents.map((doc, idx) => (
                                    <span key={idx} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                      </svg>
                                      {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={item.date}>{formatDate(item.date)}</time>
                            <div className="font-medium text-gray-900">
                              {item.type === 'investment' ? '-' : '+'}{formatCurrency(item.amount)}
                            </div>
                            {item.returns > 0 && (
                              <div className="text-green-600 text-xs">
                                Returns: {item.returns}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedView === 'activity' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Investment Activity</h3>
              <div className="space-y-4">
                {timelineData.monthlyActivity.map((month, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{month.month}</h4>
                      <div className={`text-sm font-medium ${
                        month.net > 0 ? 'text-blue-600' : month.net < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        Net: {month.net > 0 ? '+' : ''}{formatCurrency(month.net)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Investments:</span>
                        <span className="ml-2 text-gray-900">{formatCurrency(month.investments)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Returns:</span>
                        <span className="ml-2 text-gray-900">{formatCurrency(month.returns)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Activity:</span>
                        <span className={`ml-2 font-medium ${
                          month.investments > 0 || month.returns > 0 ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {month.investments > 0 || month.returns > 0 ? 'Active' : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedView === 'list' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Investment List</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returns</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timelineData.investments.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.type === 'investment' ? 'bg-blue-100 text-blue-800' :
                            item.type === 'return' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.projectName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.type === 'investment' ? '-' : '+'}{formatCurrency(item.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.returns > 0 ? `${item.returns}%` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentTimeline;