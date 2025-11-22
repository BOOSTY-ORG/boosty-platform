import React, { useState, useEffect } from 'react';
import { formatDate, formatStatus } from '../../utils/formatters.js';
import { usersAPI } from '../../api/users';

const KYCRiskAssessment = ({
  riskScore = 0,
  riskFactors = [],
  documents = [],
  userMetrics = {},
  userId = null,
  isLoading = false,
  onRecalculate
}) => {
  const [expandedFactors, setExpandedFactors] = useState(new Set());
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [mitigationSuggestions, setMitigationSuggestions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate risk level based on score
  const getRiskLevel = (score) => {
    if (score >= 80) return { level: 'Low', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    if (score >= 60) return { level: 'Medium', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    if (score >= 40) return { level: 'High', color: 'orange', bgColor: 'bg-orange-100', textColor: 'text-orange-800' };
    return { level: 'Critical', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' };
  };

  const riskLevel = getRiskLevel(riskScore);

  // Calculate document quality score
  const getDocumentQualityScore = () => {
    if (documents.length === 0) return 0;
    
    const totalScore = documents.reduce((sum, doc) => {
      return sum + (doc.verificationScore || 0);
    }, 0);
    
    return Math.round(totalScore / documents.length);
  };

  // Get risk factors from documents and user metrics
  const getRiskFactors = () => {
    const factors = [...riskFactors];
    
    // Document-related risk factors
    documents.forEach(doc => {
      if (doc.verificationScore < 70) {
        factors.push({
          type: 'document_quality',
          severity: doc.verificationScore < 50 ? 'high' : 'medium',
          description: `Low verification score for ${formatStatus(doc.documentType)}`,
          impact: -10,
          recommendation: 'Request higher quality document or manual verification'
        });
      }
      
      if (doc.isExpired) {
        factors.push({
          type: 'document_expiry',
          severity: 'high',
          description: `Expired ${formatStatus(doc.documentType)}`,
          impact: -15,
          recommendation: 'Request updated document immediately'
        });
      }
      
      if (doc.daysUntilExpiry && doc.daysUntilExpiry < 30) {
        factors.push({
          type: 'document_expiry_soon',
          severity: 'medium',
          description: `${formatStatus(doc.documentType)} expires soon`,
          impact: -5,
          recommendation: 'Request updated document before expiry'
        });
      }
      
      if (doc.aiAnalysis && doc.aiAnalysis.flags && doc.aiAnalysis.flags.length > 0) {
        factors.push({
          type: 'ai_flags',
          severity: 'medium',
          description: `AI detected issues with ${formatStatus(doc.documentType)}`,
          impact: -8,
          recommendation: 'Review AI flags and perform manual verification'
        });
      }
    });

    // User-related risk factors
    if (userMetrics.accountAge && userMetrics.accountAge < 30) {
      factors.push({
        type: 'new_account',
        severity: 'medium',
        description: 'Recently created account',
        impact: -5,
        recommendation: 'Enhanced monitoring for new accounts'
      });
    }

    if (userMetrics.verificationTime && userMetrics.verificationTime > 14) {
      factors.push({
        type: 'verification_delay',
        severity: 'low',
        description: 'Extended verification time',
        impact: -3,
        recommendation: 'Streamline verification process'
      });
    }

    return factors.sort((a, b) => b.impact - a.impact);
  };

  const calculatedRiskFactors = getRiskFactors();

  const toggleFactorExpanded = (index) => {
    const newExpanded = new Set(expandedFactors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFactors(newExpanded);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Fetch assessment history when component mounts
  useEffect(() => {
    const fetchAssessmentHistory = async () => {
      if (userId) {
        setHistoryLoading(true);
        try {
          const response = await usersAPI.getUserRiskHistory(userId);
          setAssessmentHistory(response.data?.history || []);
        } catch (error) {
          console.error('Error fetching assessment history:', error);
        } finally {
          setHistoryLoading(false);
        }
      }
    };

    fetchAssessmentHistory();
  }, [userId]);

  // Generate mitigation suggestions based on risk factors
  useEffect(() => {
    const generateMitigationSuggestions = () => {
      const suggestions = [];
      
      // Document-related mitigations
      const documentIssues = calculatedRiskFactors.filter(f =>
        f.type.includes('document') || f.type.includes('ai')
      );
      
      if (documentIssues.length > 0) {
        suggestions.push({
          priority: 'high',
          category: 'Document Verification',
          title: 'Enhanced Document Review',
          description: 'Implement additional verification steps for documents with low scores or AI flags',
          actions: [
            'Manual review of all documents with verification score below 70%',
            'Cross-reference document information with external databases',
            'Schedule video verification for high-risk documents'
          ],
          estimatedImpact: '+15-25 points',
          timeframe: '1-3 days'
        });
      }

      // Account-related mitigations
      const accountIssues = calculatedRiskFactors.filter(f =>
        f.type.includes('account') || f.type.includes('verification')
      );
      
      if (accountIssues.length > 0) {
        suggestions.push({
          priority: 'medium',
          category: 'Account Monitoring',
          title: 'Enhanced Account Monitoring',
          description: 'Implement additional monitoring for new or high-risk accounts',
          actions: [
            'Set up automated alerts for suspicious activities',
            'Require additional verification for large transactions',
            'Implement periodic review schedule'
          ],
          estimatedImpact: '+10-15 points',
          timeframe: '1-2 weeks'
        });
      }

      // General risk mitigations
      if (riskScore < 60) {
        suggestions.push({
          priority: 'critical',
          category: 'Risk Reduction',
          title: 'Comprehensive Risk Assessment',
          description: 'Conduct thorough review of all risk factors and implement comprehensive mitigation strategy',
          actions: [
            'Schedule in-person or video verification',
            'Request additional documentation',
            'Implement transaction limits',
            'Consider enhanced due diligence procedures'
          ],
          estimatedImpact: '+20-30 points',
          timeframe: '3-5 days'
        });
      }

      setMitigationSuggestions(suggestions);
    };

    generateMitigationSuggestions();
  }, [calculatedRiskFactors, riskScore]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Risk Assessment</h3>
          <div className="flex items-center space-x-3">
            {onRecalculate && (
              <button
                onClick={onRecalculate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recalculate
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'mitigation', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
                {tab === 'mitigation' && mitigationSuggestions.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {mitigationSuggestions.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Risk Score Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(riskScore)}`}>
                  {riskScore}
                </div>
                <div className="text-sm text-gray-500">Risk Score</div>
                <div className={`mt-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${riskLevel.bgColor} ${riskLevel.textColor}`}>
                  {riskLevel.level} Risk
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {getDocumentQualityScore()}
                </div>
                <div className="text-sm text-gray-500">Document Quality</div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${getDocumentQualityScore()}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600">
                  {calculatedRiskFactors.length}
                </div>
                <div className="text-sm text-gray-500">Risk Factors</div>
                <div className="mt-2 space-y-1">
                  {['critical', 'high', 'medium', 'low'].map(severity => {
                    const count = calculatedRiskFactors.filter(f => f.severity === severity).length;
                    if (count === 0) return null;
                    return (
                      <div key={severity} className="text-xs">
                        <span className={`inline-flex px-2 py-1 rounded-full ${getSeverityColor(severity)}`}>
                          {count} {severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

        {/* Risk Factors List */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Risk Factors Analysis</h4>
          
          {calculatedRiskFactors.length === 0 ? (
            <div className="text-center py-8 bg-green-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-green-600">No significant risk factors detected</p>
            </div>
          ) : (
            calculatedRiskFactors.map((factor, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(factor.severity)}`}>
                        {factor.severity}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatStatus(factor.type)}
                      </span>
                      <span className="text-sm text-red-600 font-medium">
                        {factor.impact > 0 ? '+' : ''}{factor.impact} points
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{factor.description}</p>
                    
                    {factor.recommendation && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-500">Recommendation:</span>
                        <span className="ml-2 text-gray-700">{factor.recommendation}</span>
                      </div>
                    )}
                  </div>
                  
                  {factor.metadata && (
                    <button
                      onClick={() => toggleFactorExpanded(index)}
                      className="ml-4 text-gray-400 hover:text-gray-600"
                    >
                      <svg 
                        className={`h-4 w-4 transform transition-transform ${expandedFactors.has(index) ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Expanded Metadata */}
                {expandedFactors.has(index) && factor.metadata && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs text-gray-600">
                      {JSON.stringify(factor.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Risk Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Risk Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Overall Risk Level:</span>
              <span className={`ml-2 font-medium ${riskLevel.textColor}`}>{riskLevel.level}</span>
            </div>
            <div>
              <span className="text-gray-500">Recommended Action:</span>
              <span className="ml-2 font-medium text-gray-900">
                {riskScore >= 80 ? 'Proceed normally' :
                 riskScore >= 60 ? 'Enhanced monitoring' :
                 riskScore >= 40 ? 'Additional verification required' :
                 'High priority review needed'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Last Assessment:</span>
              <span className="ml-2 font-medium text-gray-900">
                {userMetrics.lastAssessment ? formatDate(userMetrics.lastAssessment) : 'Not available'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Next Review:</span>
              <span className="ml-2 font-medium text-gray-900">
                {userMetrics.nextReview ? formatDate(userMetrics.nextReview) : 'Not scheduled'}
              </span>
            </div>
          </div>
            </div>
          </div>
        )}

        {/* Mitigation Tab */}
        {activeTab === 'mitigation' && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Mitigation Strategies</h4>
            
            {mitigationSuggestions.length === 0 ? (
              <div className="text-center py-8 bg-green-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-green-600">No mitigation strategies needed</p>
                <p className="text-sm text-gray-500">Risk level is within acceptable parameters</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mitigationSuggestions.map((suggestion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            suggestion.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {suggestion.priority} priority
                          </span>
                          <span className="text-sm font-medium text-gray-900">{suggestion.category}</span>
                        </div>
                        <h5 className="text-base font-medium text-gray-900 mb-1">{suggestion.title}</h5>
                        <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">{suggestion.estimatedImpact}</div>
                        <div className="text-xs text-gray-500">{suggestion.timeframe}</div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-3">
                      <h6 className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</h6>
                      <ul className="space-y-1">
                        {suggestion.actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start">
                            <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-600">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-3 flex justify-end">
                      <button className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Implement Strategy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Assessment History</h4>
            
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : assessmentHistory.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No assessment history available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessmentHistory.map((assessment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskLevel(assessment.score).bgColor} ${getRiskLevel(assessment.score).textColor}`}>
                            {getRiskLevel(assessment.score).level} Risk
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(assessment.assessedAt)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Risk Score:</span> {assessment.score}
                          {assessment.previousScore && (
                            <span className="ml-2 text-sm">
                              (from {assessment.previousScore} {assessment.score > assessment.previousScore ? '↑' : '↓'})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Assessed by: {assessment.assessedBy || 'System'}
                      </div>
                    </div>
                    
                    {assessment.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        {assessment.notes}
                      </div>
                    )}
                    
                    {assessment.changes && assessment.changes.length > 0 && (
                      <div className="mt-2">
                        <h6 className="text-xs font-medium text-gray-700 mb-1">Changes Made:</h6>
                        <ul className="space-y-1">
                          {assessment.changes.map((change, changeIndex) => (
                            <li key={changeIndex} className="text-xs text-gray-600">
                              • {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KYCRiskAssessment;