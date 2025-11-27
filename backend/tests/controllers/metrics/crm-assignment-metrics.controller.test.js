
const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../../src/express.js');
const { createTestData, createMockRequest, createMockResponse, createMockNext } = require('../../helpers/metrics.test.helpers.js');
const CrmAssignmentMetrics = require('../../../src/models/metrics/crm-assignment-metrics.model.js');
const CrmMessageThread = require('../../../src/models/metrics/crm-message-thread.model.js');
const CrmContact = require('../../../src/models/metrics/crm-contact.model.js');
const User = require('../../../src/models/user.model.js');

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-assignment-metrics.model.js');
jest.mock('../../../src/models/metrics/crm-message-thread.model.js');
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Assignment Metrics Controller', () => {
  let mockReq, mockRes, mockNext;
  let testData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAssignmentMetrics', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 5 });
    });

    it('should return comprehensive assignment metrics successfully', async () => {
      // Mock database calls
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(100);
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(60); // Active
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(30); // Completed
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(8); // Transferred
      CrmAssignmentMetrics.countDocuments.mockResolvedValueOnce(2); // Cancelled
      
      // Mock aggregation calls
      CrmAssignmentMetrics.aggregate.mockResolvedValueOnce([
        { _id: 'agent1', count: 25 },
        { _id: 'agent2', count: 15 }
      ]);
      CrmAssignmentMetrics.aggregate.mockResolvedValueOnce([
        { _id: 'thread', count: 70 },
        { _id: 'contact', count: 20 },
        { _id: 'ticket', count: 10 }
      ]);
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([
        { _id: 'overdue1', priority: 'high' },
        { _id: 'overdue2', priority: 'medium' }
      ]);
      CrmAssignmentMetrics.find.mockResolvedValue([
        { _id: 'escalated1', escalationLevel: 1 }
      ]);
      CrmAssignmentMetrics.getAssignmentStats.mockResolvedValue([{
        averageFirstResponseTime: 300,
        averageResolutionTime: 3600,
        averageSatisfactionScore: 4.2
      }]);

      const response = await request(app)
        .get('/api/metrics/crm/assignments')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      const { summary, breakdowns, performance, alerts, trends } = response.body.data;
      
      // Verify summary
      expect(summary.totalAssignments).toBe(100);
      expect(summary.activeAssignments).toBe(60);
      expect(summary.completedAssignments).toBe(30);
      expect(summary.transferredAssignments).toBe(8);
      expect(summary.cancelledAssignments).toBe(2);
      expect(summary.overdueAssignments).toBe(2);
      expect(summary.escalatedAssignments).toBe(1);
      expect(summary.averageFirstResponseTime).toBe(300);
      expect(summary.averageResolutionTime).toBe(3600);
      expect(summary.averageSatisfactionScore).toBe(4.2);
      
      // Verify breakdowns
      expect(breakdowns.byAgent).toBeDefined();
      expect(breakdowns.byEntityType).toBeDefined();
      expect(breakdowns.byStatus).toBeDefined();
      expect(breakdowns.byPriority).toBeDefined();
      expect(breakdowns.byAssignmentType).toBeDefined();
      
      // Verify performance metrics
      expect(performance).toBeDefined();
      
      // Verify alerts
      expect(alerts.overdueAssignments).toBe(2);
      expect(alerts.escalatedAssignments).toBe(1);
      expect(alerts.agentsOverCapacity).toBeDefined();
      expect(alerts.highPriorityUnassigned).toBeDefined();
      
      // Verify trends
      expect(trends).toBeDefined();
    });

    it('should handle date range filtering', async () => {
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([]);
      CrmAssignmentMetrics.find.mockResolvedValue([]);
      CrmAssignmentMetrics.getAssignmentStats.mockResolvedValue([{}]);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmAssignmentMetrics.countDocuments).toHaveBeenCalledWith(
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
      
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([]);
      CrmAssignmentMetrics.find.mockResolvedValue([]);
      CrmAssignmentMetrics.getAssignmentStats.mockResolvedValue([{}]);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments?agentId=${agentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmAssignmentMetrics.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ agentId })
      );
    });

    it('should handle entity type filtering', async () => {
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.aggregate.mockResolvedValue([]);
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([]);
      CrmAssignmentMetrics.find.mockResolvedValue([]);
      CrmAssignmentMetrics.getAssignmentStats.mockResolvedValue([{}]);

      const response = await request(app)
        .get('/api/metrics/crm/assignments?entityType=thread')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmAssignmentMetrics.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'thread' })
      );
    });

    it('should handle database errors gracefully', async () => {
      CrmAssignmentMetrics.countDocuments.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/crm/assignments')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('createAssignment', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should create a new assignment successfully', async () => {
      const assignmentData = {
        agentId: 'agent123',
        entityType: 'thread',
        entityId: 'thread456',
        assignmentType: 'manual',
        assignmentReason: 'High priority customer',
        priority: 'high',
        requiredSkills: ['customer_support', 'technical'],
        tags: ['urgent', 'vip_customer']
      };

      const mockAssignment = {
        _id: 'assignment123',
        assignmentId: 'ASM_123456_abc789',
        ...assignmentData,
        status: 'active',
        assignedAt: new Date(),
        createdAt: new Date(),
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.mockImplementation(() => mockAssignment);
      CrmAssignmentMetrics.findOne.mockResolvedValue(null); // No existing assignment

      const response = await request(app)
        .post('/api/metrics/crm/assignments')
        .send(assignmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agentId).toBe('agent123');
      expect(response.body.data.entityType).toBe('thread');
      expect(response.body.data.priority).toBe('high');
      expect(mockAssignment.save).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        assignmentReason: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/metrics/crm/assignments')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REQUIRED_FIELDS_MISSING');
      expect(response.body.error.message).toBe('Agent ID, entity type, and entity ID are required');
    });

    it('should prevent duplicate assignments', async () => {
      const assignmentData = {
        agentId: 'agent123',
        entityType: 'thread',
        entityId: 'thread456'
      };

      CrmAssignmentMetrics.findOne.mockResolvedValue({ _id: 'existing' });

      const response = await request(app)
        .post('/api/metrics/crm/assignments')
        .send(assignmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_EXISTS');
      expect(response.body.error.message).toBe('Active assignment already exists for this entity');
    });

    it('should handle assignment creation errors', async () => {
      const assignmentData = {
        agentId: 'agent123',
        entityType: 'thread',
        entityId: 'thread456'
      };

      const mockAssignment = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      CrmAssignmentMetrics.mockImplementation(() => mockAssignment);
      CrmAssignmentMetrics.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/metrics/crm/assignments')
        .send(assignmentData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('transferAssignment', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should transfer assignment successfully', async () => {
      const assignmentId = 'assignment123';
      const transferData = {
        toAgentId: 'newAgent456',
        reason: 'Workload balancing',
        priority: 'medium'
      };

      const mockAssignment = {
        _id: assignmentId,
        agentId: 'oldAgent123',
        transfer: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/transfer`)
        .send(transferData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssignment.transfer).toHaveBeenCalledWith('newAgent456', 'Workload balancing');
    });

    it('should validate target agent ID', async () => {
      const assignmentId = 'assignment123';
      const invalidData = {
        reason: 'Missing target agent'
      };

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/transfer`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TO_AGENT_ID_REQUIRED');
      expect(response.body.error.message).toBe('Target agent ID is required');
    });

    it('should handle non-existent assignment', async () => {
      const assignmentId = 'nonexistent';
      const transferData = {
        toAgentId: 'agent456'
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/transfer`)
        .send(transferData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
    });
  });

  describe('completeAssignment', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should complete assignment successfully', async () => {
      const assignmentId = 'assignment123';
      const completionData = {
        completionReason: 'resolved',
        satisfactionScore: 5,
        notes: 'Customer issue resolved successfully'
      };

      const mockAssignment = {
        _id: assignmentId,
        complete: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/complete`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssignment.complete).toHaveBeenCalledWith('resolved', 5);
    });

    it('should validate completion reason', async () => {
      const assignmentId = 'assignment123';
      const invalidData = {
        satisfactionScore: 4
        // Missing completionReason
      };

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/complete`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLETION_REASON_REQUIRED');
      expect(response.body.error.message).toBe('Completion reason is required');
    });

    it('should handle completion with notes', async () => {
      const assignmentId = 'assignment123';
      const completionData = {
        completionReason: 'resolved',
        notes: 'Complex case requiring escalation'
      };

      const mockAssignment = {
        _id: assignmentId,
        complete: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
        customFields: new Map()
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/complete`)
        .send(completionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssignment.customFields.get('completionNotes')).toBe('Complex case requiring escalation');
    });
  });

  describe('getAgentWorkload', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should return agent workload metrics successfully', async () => {
      const agentId = 'agent123';
      
      const mockWorkload = [
        { _id: 'active', count: 15, avgWorkloadScore: 75 },
        { _id: 'completed', count: 30, avgWorkloadScore: 60 }
      ];

      CrmAssignmentMetrics.getAgentWorkload.mockResolvedValue(mockWorkload);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(15); // Active assignments
      CrmAssignmentMetrics.getAgentPerformanceMetrics.mockResolvedValue([
        { _id: 'thread', count: 20, avgResponseTime: 300 }
      ]);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments/agent/${agentId}/workload`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.agentId).toBe(agentId);
      expect(response.body.data.currentWorkload).toBeDefined();
      expect(response.body.data.currentWorkload.activeAssignments).toBe(15);
      expect(response.body.data.periodWorkload).toEqual(mockWorkload);
      expect(response.body.data.performance).toBeDefined();
    });

    it('should handle date range filtering for workload', async () => {
      const agentId = 'agent123';
      const startDate = '2023-01-01';
      const endDate = '2023-01-31';
      
      CrmAssignmentMetrics.getAgentWorkload.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(0);
      CrmAssignmentMetrics.getAgentPerformanceMetrics.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments/agent/${agentId}/workload?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmAssignmentMetrics.getAgentWorkload).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        })
      );
    });

    it('should calculate capacity utilization correctly', async () => {
      const agentId = 'agent123';
      
      CrmAssignmentMetrics.getAgentWorkload.mockResolvedValue([]);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(25); // High workload
      CrmAssignmentMetrics.getAgentPerformanceMetrics.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments/agent/${agentId}/workload`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Assuming max capacity of 20, 25 assignments would be > 100% utilization
      expect(response.body.data.currentWorkload.capacityUtilization).toBeGreaterThanOrEqual(100);
    });
  });

  describe('getOverdueAssignments', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should return overdue assignments successfully', async () => {
      const mockOverdueAssignments = [
        {
          _id: 'overdue1',
          agentId: { _id: 'agent1', firstName: 'John', lastName: 'Doe' },
          entityType: 'thread',
          priority: 'urgent',
          slaDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          _id: 'overdue2',
          agentId: { _id: 'agent2', firstName: 'Jane', lastName: 'Smith' },
          entityType: 'contact',
          priority: 'high',
          slaDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue(mockOverdueAssignments);

      const response = await request(app)
        .get('/api/metrics/crm/assignments/overdue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      
      const firstOverdue = response.body.data.data[0];
      expect(firstOverdue.priority).toBe('urgent');
      expect(firstOverdue.agentId.firstName).toBe('John');
      
      const secondOverdue = response.body.data.data[1];
      expect(secondOverdue.priority).toBe('high');
      expect(secondOverdue.agentId.firstName).toBe('Jane');
    });

    it('should handle pagination for overdue assignments', async () => {
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([
        { _id: 'overdue1' },
        { _id: 'overdue2' },
        { _id: 'overdue3' },
        { _id: 'overdue4' },
        { _id: 'overdue5' }
      ]);

      const response = await request(app)
        .get('/api/metrics/crm/assignments/overdue?page=2&limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2); // Page 2 should have 2 items
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
    });

    it('should handle no overdue assignments', async () => {
      CrmAssignmentMetrics.findOverdueAssignments.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/metrics/crm/assignments/overdue')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('escalateAssignment', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should escalate assignment successfully', async () => {
      const assignmentId = 'assignment123';
      const escalationData = {
        toAgentId: 'manager456',
        level: 2
      };

      const mockAssignment = {
        _id: assignmentId,
        escalate: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/escalate`)
        .send(escalationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssignment.escalate).toHaveBeenCalledWith('manager456', 2);
    });

    it('should handle escalation without level', async () => {
      const assignmentId = 'assignment123';
      const escalationData = {
        toAgentId: 'manager456'
      };

      const mockAssignment = {
        _id: assignmentId,
        escalationLevel: 1,
        escalate: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/escalate`)
        .send(escalationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockAssignment.escalate).toHaveBeenCalledWith('manager456', null);
    });

    it('should handle non-existent assignment escalation', async () => {
      const assignmentId = 'nonexistent';
      const escalationData = {
        toAgentId: 'manager456'
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/escalate`)
        .send(escalationData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle assignment not found in getAssignmentDetails', async () => {
      const assignmentId = 'nonexistent';

      CrmAssignmentMetrics.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/metrics/crm/assignments/${assignmentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
    });

    it('should handle assignment not found in updateAssignment', async () => {
      const assignmentId = 'nonexistent';
      const updateData = {
        priority: 'high'
      };

      CrmAssignmentMetrics.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/metrics/crm/assignments/${assignmentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
    });

    it('should handle assignment not found in deleteAssignment', async () => {
      const assignmentId = 'nonexistent';

      CrmAssignmentMetrics.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/metrics/crm/assignments/${assignmentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
    });

    it('should handle invalid priority values', async () => {
      const assignmentId = 'assignment123';
      const updateData = {
        priority: 'invalid_priority'
      };

      const mockAssignment = {
        _id: assignmentId,
        save: jest.fn().mockRejectedValue(new Error('Validation error'))
      };

      CrmAssignmentMetrics.findByIdAndUpdate.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .put(`/api/metrics/crm/assignments/${assignmentId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid satisfaction scores', async () => {
      const assignmentId = 'assignment123';
      const completionData = {
        completionReason: 'resolved',
        satisfactionScore: 6 // Invalid - should be 1-5
      };

      const mockAssignment = {
        _id: assignmentId,
        complete: jest.fn().mockRejectedValue(new Error('Validation error'))
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/assignments/${assignmentId}/complete`)
        .send(completionData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent assignment operations', async () => {
      const assignmentId = 'assignment123';
      
      const mockAssignment = {
        _id: assignmentId,
        save: jest.fn().mockResolvedValue({}),
        transfer: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById.mockResolvedValue(mockAssignment);

      // Make multiple concurrent requests
      const requests = [
        request(app).put(`/api/metrics/crm/assignments/${assignmentId}`).send({ priority: 'high' }),
        request(app).post(`/api/metrics/crm/assignments/${assignmentId}/transfer`).send({ toAgentId: 'agent456' }),
        request(app).post(`/api/metrics/crm/assignments/${assignmentId}/complete`).send({ completionReason: 'resolved' })
      ];

      const responses = await Promise.all(requests);
      
      // All requests should be processed
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });

    it('should handle large dataset queries', async () => {
      // Mock large dataset
      const largeWorkload = Array(1000).fill().map((_, i) => ({
        _id: `workload_${i}`,
        count: Math.floor(Math.random() * 50),
        avgWorkloadScore: Math.floor(Math.random() * 100)
      }));

      CrmAssignmentMetrics.getAgentWorkload.mockResolvedValue(largeWorkload);
      CrmAssignmentMetrics.countDocuments.mockResolvedValue(1000);
      CrmAssignmentMetrics.getAgentPerformanceMetrics.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/metrics/crm/assignments/agent/agent123/workload')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.periodWorkload).toHaveLength(1000);
    });

    it('should handle database connection timeouts', async () => {
      CrmAssignmentMetrics.countDocuments.mockRejectedValue(new Error('Connection timeout'));

      const response = await request(app)
        .get('/api/metrics/crm/assignments')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});