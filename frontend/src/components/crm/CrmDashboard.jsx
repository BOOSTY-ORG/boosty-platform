import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

// Components
import Button from '../common/Button';
import Card from '../common/Card';
import Loading from '../common/Loading';
import Pagination from '../common/Pagination';

// Services
import { crmService } from '../../services/crm.service';

/**
 * CRM Dashboard Component
 * 
 * A comprehensive CRM dashboard with:
 * - Key metrics and KPIs for all CRM entities
 * - Charts and visualizations for engagement and performance
 * - Quick actions and recent activity feed
 * - System health indicators and alerts
 * 
 * @component
 */
const CrmDashboard = ({
  className = '',
  dateRange = 'last_30_days',
  onNavigate = null,
  ...props
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [communicationMetrics, setCommunicationMetrics] = useState(null);
  const [contactMetrics, setContactMetrics] = useState(null);
  const [templateMetrics, setTemplateMetrics] = useState(null);
  const [automationMetrics, setAutomationMetrics] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [topPerformingTemplates, setTopPerformingTemplates] = useState([]);
  const [topPerformingAutomations, setTopPerformingAutomations] = useState([]);
  const [engagementData, setEngagementData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        overviewResponse,
        communicationResponse,
        contactResponse,
        templateResponse,
        automationResponse,
        topTemplatesResponse,
        topAutomationsResponse
      ] = await Promise.all([
        crmService.getOverview({ dateRange }),
        crmService.getCommunicationMetrics({ dateRange }),
        crmService.getContactMetrics({ dateRange }),
        crmService.getTemplateMetrics({ dateRange }),
        crmService.getAutomationMetrics({ dateRange }),
        crmService.getTopPerformingTemplates({ dateRange }),
        crmService.getTopPerformingAutomations({ dateRange })
      ]);

      setOverview(overviewResponse);
      setCommunicationMetrics(communicationResponse.data);
      setContactMetrics(contactResponse.data);
      setTemplateMetrics(templateResponse.data);
      setAutomationMetrics(automationResponse.data);
      setTopPerformingTemplates(topTemplatesResponse.data?.data || []);
      setTopPerformingAutomations(topAutomationsResponse.data?.data || []);

      // Process engagement data
      if (contactResponse.data?.engagementTrends) {
        setEngagementData(contactResponse.data.engagementTrends);
      }

      // Process performance data
      if (communicationResponse.data?.performanceTrends) {
        setPerformanceData(communicationResponse.data.performanceTrends);
      }

      // Simulate recent activity and system health (would come from API)
      setRecentActivity([
        {
          id: 1,
          type: 'contact_created',
          entity: 'John Doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          description: 'New contact created via website form'
        },
        {
          id: 2,
          type: 'automation_executed',
          entity: 'Welcome Email Automation',
          timestamp: new Date(Date.now() - 1000 * 60 * 15),
          description: 'Automation executed for 25 contacts'
        },
        {
          id: 3,
          type: 'template_approved',
          entity: 'Q4 Newsletter Template',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          description: 'Template approved and ready for use'
        },
        {
          id: 4,
          type: 'communication_sent',
          entity: 'Marketing Campaign',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          description: 'Bulk email sent to 500 contacts'
        }
      ]);

      setSystemHealth({
        status: 'healthy',
        uptime: '99.9%',
        responseTime: '120ms',
        lastCheck: new Date()
      });

      setAlerts([
        {
          id: 1,
          type: 'warning',
          title: 'High Email Bounce Rate',
          description: 'Email bounce rate is above 5% threshold',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          severity: 'medium'
        },
        {
          id: 2,
          type: 'info',
          title: 'Automation Performance',
          description: '3 automations have low success rates',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
          severity: 'low'
        }
      ]);

    } catch (error) {
      toast.error(`Failed to load dashboard data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Format activity type
  const formatActivityType = (type) => {
    const types = {
      contact_created: { icon: '👤', color: 'blue' },
      automation_executed: { icon: '⚡', color: 'green' },
      template_approved: { icon: '✅', color: 'green' },
      communication_sent: { icon: '📧', color: 'purple' }
    };
    return types[type] || { icon: '📄', color: 'gray' };
  };

  // Format alert type
  const formatAlertType = (type) => {
    const types = {
      warning: { icon: '⚠️', color: 'yellow' },
      error: { icon: '❌', color: 'red' },
      info: { icon: 'ℹ️', color: 'blue' },
      success: { icon: '✅', color: 'green' }
    };
    return types[type] || { icon: '📢', color: 'gray' };
  };

  // Simple chart component (in real app, would use Chart.js or similar)
  const SimpleLineChart = ({ data, title, color = 'blue' }) => (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="h-32 flex items-end justify-between space-x-1">
        {data?.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-blue-500 rounded-t"
            style={{
              height: `${(value / Math.max(...data)) * 100}%`,
              backgroundColor: color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : '#8B5CF6'
            }}
          />
        ))}
      </div>
    </div>
  );

  const SimpleBarChart = ({ data, title }) => (
    <div className="bg-white p-4 rounded-lg border">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="h-32 flex items-end justify-between space-x-2">
        {data?.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-500 rounded-t"
              style={{
                height: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%`
              }}
            />
            <div className="text-xs text-gray-600 mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading type="spinner" size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} {...props}>
      {/* System Health Banner */}
      {systemHealth && (
        <div className={`p-4 rounded-lg border ${
          systemHealth.status === 'healthy' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  systemHealth.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm font-medium">
                  System {systemHealth.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Uptime: {systemHealth.uptime} | Response: {systemHealth.responseTime}
              </div>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
          <div className="space-y-2">
            {alerts.map((alert) => {
              const alertType = formatAlertType(alert.type);
              return (
                <div key={alert.id} className={`p-3 rounded-lg border flex items-start space-x-3 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="text-2xl">{alertType.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <div className="text-sm text-gray-600">{alert.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {overview && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card.Metrics
              title="Total Contacts"
              value={overview.summary?.totalContacts || 0}
              change="+12%"
              changeType="positive"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <Card.Metrics
              title="Total Communications"
              value={overview.summary?.totalCommunications || 0}
              change="+8%"
              changeType="positive"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <Card.Metrics
              title="Active Automations"
              value={overview.summary?.activeAutomations || 0}
              change="+2"
              changeType="positive"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <Card.Metrics
              title="Approved Templates"
              value={overview.summary?.approvedTemplates || 0}
              change="+5%"
              changeType="positive"
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>
        </div>
      )}

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trends */}
        {engagementData && (
          <SimpleLineChart
            data={engagementData}
            title="Engagement Trends"
            color="green"
          />
        )}

        {/* Performance Trends */}
        {performanceData && (
          <SimpleLineChart
            data={performanceData}
            title="Communication Performance"
            color="blue"
          />
        )}
      </div>

      {/* Channel Distribution */}
      {communicationMetrics?.channelDistribution && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Channel Distribution</h2>
          <SimpleBarChart
            data={communicationMetrics.channelDistribution}
            title="Communications by Channel"
          />
        </div>
      )}

      {/* Top Performing Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Templates */}
        {topPerformingTemplates.length > 0 && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Templates</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                {topPerformingTemplates.slice(0, 5).map((template, index) => (
                  <div key={template._id || template.templateId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-sm text-gray-500">{template.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-blue-600">
                        {template.metrics?.averageOpenRate || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Open Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Top Automations */}
        {topPerformingAutomations.length > 0 && (
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Automations</h3>
            </Card.Header>
            <Card.Body>
              <div className="space-y-3">
                {topPerformingAutomations.slice(0, 5).map((automation, index) => (
                  <div key={automation._id || automation.automationId} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{automation.name}</div>
                      <div className="text-sm text-gray-500">{automation.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-green-600">
                        {automation.metrics?.successRate || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="primary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => onNavigate?.('contacts')}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2 5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v-1H3v1z" />
            </svg>
            <span>Create Contact</span>
          </Button>
          
          <Button
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => onNavigate?.('communications')}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Send Communication</span>
          </Button>
          
          <Button
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => onNavigate?.('templates')}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Create Template</span>
          </Button>
          
          <Button
            variant="secondary"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            onClick={() => onNavigate?.('automations')}
          >
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Create Automation</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Card>
            <Card.Body>
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const activityType = formatActivityType(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="text-2xl">{activityType.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{activity.entity}</div>
                        <div className="text-sm text-gray-600">{activity.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
};

CrmDashboard.propTypes = {
  className: PropTypes.string,
  dateRange: PropTypes.string,
  onNavigate: PropTypes.func
};

export default CrmDashboard;