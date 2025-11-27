import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import CrmCommunication from '../../../src/models/metrics/crm-communication.model.js';
import CrmTemplate from '../../../src/models/metrics/crm-template.model.js';
import CrmAutomation from '../../../src/models/metrics/crm-automation.model.js';
import CrmMessage from '../../../src/models/metrics/crm-message.model.js';
import CrmAssignmentMetrics from '../../../src/models/metrics/crm-assignment-metrics.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/metrics/crm-communication.model.js');
jest.mock('../../../src/models/metrics/crm-template.model.js');
jest.mock('../../../src/models/metrics/crm-automation.model.js');
jest.mock('../../../src/models/metrics/crm-message.model.js');
jest.mock('../../../src/models/metrics/crm-assignment-metrics.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Metrics Controller', () => {
  let mockReq, mockRes, mockNext;
  let testData;
  let authToken;
  let testUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    
    // Setup test database
    await setupTestDatabase();
    
    // Create test data for each test
    testData = await createTestData({
      users: 5,
      investors: 3,
      applications: 10,
      transactions: 20,
      investments: 8,
      kycDocuments: 15
    });

    // Create a test user for authentication
    testUser = await User.create({
      name: 'Test CRM User',
      email: 'crm-test@example.com',
      password: 'password123',
      role: 'manager'
    });

    // Generate auth token (mock implementation)
    authToken = 'Bearer mock-jwt-token-for-testing';
  });

  afterEach(async () => {
    // Clean up collections between tests
    await Promise.all([
      User.deleteMany({}),
      CrmContact.deleteMany({}),
      CrmCommunication.deleteMany({}),
      CrmTemplate.deleteMany({}),
      CrmAutomation.deleteMany({}),
      CrmMessage.deleteMany({}),
      CrmAssignmentMetrics.deleteMany({})
    ]);
  });

  describe('getCrmMetrics', () => {
    it('should return comprehensive CRM metrics successfully', async () => {
      // Mock all the parallel database calls
      CrmContact.countDocuments.mockResolvedValue(100);
      CrmContact.countDocuments.mockResolvedValueOnce(60); // active
      CrmContact.countDocuments.mockResolvedValueOnce(25); // high value leads
      CrmContact.aggregate.mockResolvedValueOnce([
        { _id: 'lead', count: 60 },
        { _id: 'customer', count: 40 }
      ]);
      
      CrmCommunication.countDocuments.mockResolvedValue(250);
      CrmCommunication.countDocuments.mockResolvedValueOnce(150); // inbound
      CrmCommunication.countDocuments.mockResolvedValueOnce(100); // outbound
      CrmCommunication.aggregate.mockResolvedValueOnce([
        { _id: 'email', count: 150 },
        { _id: 'phone', count: 100 }
      ]);
      
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(80);
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(50); // active
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(25); // completed
      CrmAssignmentMetrics.aggregate.mockResolvedValueOnce([
        { _id: 'manual', count: 40 },
        { _id: 'automatic', count: 40 }
      ]);
      
      CrmMessage.countDocuments.mockResolvedValue(500);
      CrmMessage.aggregate.mockResolvedValueOnce([
        { _id: 'text', count: 400 },
        { _id: 'image', count: 100 }
      ]);
      
      CrmTemplate.countDocuments.mockResolvedValue(30);
      CrmTemplate.countDocuments.mockResolvedValueOnce(20); // active
      CrmTemplate.aggregate.mockResolvedValueOnce([
        { _id: 'welcome', count: 15 },
        { _id: 'newsletter', count: 15 }
      ]);
      
      CrmAutomation.countDocuments.mockResolvedValue(15);
      CrmAutomation.countDocuments.mockResolvedValueOnce(10); // active
      CrmAutomation.aggregate.mockResolvedValueOnce([
        { _id: 'lead_nurturing', count: 8 },
        { _id: 'follow_up', count: 7 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const { summary, breakdowns, trends, performance, alerts, filters } = response.body.data;
      
      // Verify summary contains all expected metrics
      expect(summary.totalContacts).toBe(100);
      expect(summary.activeContacts).toBe(60);
      expect(summary.highValueLeads).toBe(25);
      expect(summary.totalCommunications).toBe(250);
      expect(summary.inboundCommunications).toBe(150);
      expect(summary.outboundCommunications).toBe(100);
      expect(summary.totalAssignments).toBe(80);
      expect(summary.activeAssignments).toBe(50);
      expect(summary.totalMessages).toBe(500);
      expect(summary.totalTemplates).toBe(30);
      expect(summary.activeTemplates).toBe(20);
      expect(summary.totalAutomations).toBe(15);
      expect(summary.activeAutomations).toBe(10);
      
      // Verify breakdowns
      expect(breakdowns.contacts).toBeDefined();
      expect(breakdowns.communications).toBeDefined();
      expect(breakdowns.assignments).toBeDefined();
      expect(breakdowns.messages).toBeDefined();
      expect(breakdowns.templates).toBeDefined();
      expect(breakdowns.automations).toBeDefined();
      
      // Verify trends
      expect(trends).toBeDefined();
      expect(trends.contacts).toBeDefined();
      expect(trends.communications).toBeDefined();
      
      // Verify performance
      expect(performance).toBeDefined();
      
      // Verify alerts
      expect(alerts).toBeDefined();
      
      // Verify filters
      expect(filters).toBeDefined();
      expect(filters.dateRange).toBeDefined();
    });

    it('should handle date range filtering', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get(`/metrics/crm/metrics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmContact.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { 
            $gte: expect.any(Date), 
            $lte: expect.any(Date) 
          }
        })
      );
    });

    it('should handle agent filtering', async () => {
      const agentId = 'agent123';
      
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get(`/metrics/crm/metrics?agentId=${agentId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmContact.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ agentId })
      );
    });

    it('should handle team filtering', async () => {
      const teamId = 'team123';
      
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get(`/metrics/crm/metrics?teamId=${teamId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmContact.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ teamId })
      );
    });

    it('should handle database errors gracefully', async () => {
      CrmContact.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include pagination when requested', async () => {
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get('/metrics/crm/metrics?includePagination=true')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(50);
    });
  });

  describe('getCrmMetricsByCategory', () => {
    it('should return contacts category metrics successfully', async () => {
      // Mock contact-specific responses
      CrmContact.countDocuments.mockResolvedValue(100);
      CrmContact.countDocuments.mockResolvedValueOnce(60); // active
      CrmContact.countDocuments.mockResolvedValueOnce(25); // high value leads
      CrmContact.aggregate.mockResolvedValueOnce([
        { _id: 'lead', count: 60 },
        { _id: 'customer', count: 40 }
      ]);
      CrmContact.aggregate.mockResolvedValueOnce([
        { _id: '2023-01', total: 50, leads: 30, customers: 20, qualified: 25 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/contacts')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalContacts).toBe(100);
      expect(response.body.data.activeContacts).toBe(60);
      expect(response.body.data.highValueLeads).toBe(25);
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
    });

    it('should return communications category metrics successfully', async () => {
      // Mock communication-specific responses
      CrmCommunication.countDocuments.mockResolvedValue(250);
      CrmCommunication.countDocuments.mockResolvedValueOnce(150); // inbound
      CrmCommunication.countDocuments.mockResolvedValueOnce(100); // outbound
      CrmCommunication.aggregate.mockResolvedValueOnce([
        { _id: 'email', count: 150 },
        { _id: 'phone', count: 100 }
      ]);
      CrmCommunication.aggregate.mockResolvedValueOnce([
        { _id: '2023-01', total: 100, inbound: 60, outbound: 40, automated: 20 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/communications')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalCommunications).toBe(250);
      expect(response.body.data.inboundCommunications).toBe(150);
      expect(response.body.data.outboundCommunications).toBe(100);
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
    });

    it('should return assignments category metrics successfully', async () => {
      // Mock assignment-specific responses
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(80);
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(50); // active
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(25); // completed
      CrmAssignmentMetrics.aggregate.mockResolvedValueOnce([
        { _id: 'manual', count: 40 },
        { _id: 'automatic', count: 40 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/assignments')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalAssignments).toBe(80);
      expect(response.body.data.activeAssignments).toBe(50);
      expect(response.body.data.completedAssignments).toBe(25);
      expect(response.body.data.breakdowns).toBeDefined();
    });

    it('should return messages category metrics successfully', async () => {
      // Mock message-specific responses
      CrmMessage.countDocuments.mockResolvedValue(500);
      CrmMessage.countDocuments.mockResolvedValueOnce(300); // sent
      CrmMessage.countDocuments.mockResolvedValueOnce(200); // read
      CrmMessage.aggregate.mockResolvedValueOnce([
        { _id: 'text', count: 400 },
        { _id: 'image', count: 100 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/messages')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalMessages).toBe(500);
      expect(response.body.data.sentMessages).toBe(300);
      expect(response.body.data.readMessages).toBe(200);
      expect(response.body.data.breakdowns).toBeDefined();
    });

    it('should return templates category metrics successfully', async () => {
      // Mock template-specific responses
      CrmTemplate.countDocuments.mockResolvedValue(30);
      CrmTemplate.countDocuments.mockResolvedValueOnce(20); // active
      CrmTemplate.aggregate.mockResolvedValueOnce([
        { _id: 'welcome', count: 15 },
        { _id: 'newsletter', count: 15 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/templates')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTemplates).toBe(30);
      expect(response.body.data.activeTemplates).toBe(20);
      expect(response.body.data.breakdowns).toBeDefined();
    });

    it('should return automations category metrics successfully', async () => {
      // Mock automation-specific responses
      CrmAutomation.countDocuments.mockResolvedValue(15);
      CrmAutomation.countDocuments.mockResolvedValueOnce(10); // active
      CrmAutomation.aggregate.mockResolvedValueOnce([
        { _id: 'lead_nurturing', count: 8 },
        { _id: 'follow_up', count: 7 }
      ]);

      const response = await request(app)
        .get('/metrics/crm/metrics/automations')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalAutomations).toBe(15);
      expect(response.body.data.activeAutomations).toBe(10);
      expect(response.body.data.breakdowns).toBeDefined();
    });

    it('should handle invalid category', async () => {
      const response = await request(app)
        .get('/metrics/crm/metrics/invalid_category')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CATEGORY');
      expect(response.body.error.message).toContain('Invalid category');
    });

    it('should handle database errors gracefully', async () => {
      CrmContact.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/metrics/contacts')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('getCrmRealtimeMetrics', () => {
    it('should return real-time CRM metrics successfully', async () => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Mock real-time data
      CrmContact.countDocuments.mockResolvedValue(25); // Last 24h
      CrmCommunication.countDocuments.mockResolvedValue(50); // Last 24h
      CrmMessage.countDocuments.mockResolvedValue(100); // Last 24h
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(15); // Last 24h
      CrmCommunication.countDocuments.mockResolvedValueOnce(5); // Last hour
      CrmMessage.countDocuments.mockResolvedValueOnce(10); // Last hour
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(30); // Active
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([
        { _id: 'overdue1' },
        { _id: 'overdue2' }
      ]);
      CrmAutomation.countDocuments.mockResolvedValue(8); // Active
      CrmAutomation.find.mockResolvedValue([]); // Failed

      const response = await request(app)
        .get('/metrics/crm/metrics/realtime')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const { timestamp, last24HoursData, lastHour, current, alerts } = response.body.data;
      
      // Verify timestamp
      expect(timestamp).toBeDefined();
      
      // Verify last 24 hours metrics
      expect(last24HoursData.newContacts).toBe(25);
      expect(last24HoursData.newCommunications).toBe(50);
      expect(last24HoursData.newMessages).toBe(100);
      expect(last24HoursData.newAssignments).toBe(15);
      
      // Verify last hour metrics
      expect(lastHour.communications).toBe(5);
      expect(lastHour.messages).toBe(10);
      expect(lastHour.activityRate).toBe(15);
      
      // Verify current metrics
      expect(current.activeAssignments).toBe(30);
      expect(current.overdueAssignments).toBe(2);
      expect(current.activeAutomations).toBe(8);
      expect(current.failedAutomations).toBe(0);
      
      // Verify alerts
      expect(alerts.overdueAssignments).toBe(true);
      expect(alerts.failedAutomations).toBe(false);
      expect(alerts.highActivityRate).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      CrmContact.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/metrics/realtime')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle high activity rate alerts', async () => {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Mock high activity
      CrmContact.countDocuments.mockResolvedValue(25); // Last 24h
      CrmCommunication.countDocuments.mockResolvedValue(50); // Last 24h
      CrmMessage.countDocuments.mockResolvedValue(100); // Last 24h
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(15); // Last 24h
      CrmCommunication.countDocuments.mockResolvedValueOnce(60); // Last hour - high activity
      CrmMessage.countDocuments.mockResolvedValueOnce(50); // Last hour - high activity
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(30); // Active
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([]); // No overdue
      CrmAutomation.countDocuments.mockResolvedValue(8); // Active
      CrmAutomation.find.mockResolvedValue([]); // No failed

      const response = await request(app)
        .get('/metrics/crm/metrics/realtime')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts.highActivityRate).toBe(true);
      expect(response.body.data.lastHour.activityRate).toBe(110); // 60 + 50
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/metrics/crm/metrics')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require manager role', async () => {
      // Create a user with lower role
      const lowRoleUser = await User.create({
        name: 'Low Role User',
        email: 'lowrole@example.com',
        password: 'password123',
        role: 'user'
      });

      const response = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent requests', async () => {
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .get('/metrics/crm/metrics')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Input Validation', () => {
    it('should handle invalid date format', async () => {
      const response = await request(app)
        .get('/metrics/crm/metrics?startDate=invalid-date')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/metrics/crm/metrics?page=0&limit=101')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle empty agent ID', async () => {
      // Mock minimal responses
      CrmContact.countDocuments.mockResolvedValue(0);
      CrmContact.aggregate.mockResolvedValue([]);
      CrmCommunication.countDocuments.mockResolvedValue(0);
      CrmCommunication.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);
      CrmMessage.aggregate.mockResolvedValue([]);
      CrmTemplate.countDocuments.mockResolvedValue(0);
      CrmTemplate.aggregate.mockResolvedValue([]);
      CrmAutomation.countDocuments.mockResolvedValue(0);
      CrmAutomation.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get('/metrics/crm/metrics?agentId=')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle empty agent ID gracefully
    });
  });
});