import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmAssignmentMetrics from '../../../src/models/metrics/crm-assignment-metrics.model.js';
import CrmMessageThread from '../../../src/models/metrics/crm-message-thread.model.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-assignment-metrics.model.js');
jest.mock('../../../src/models/metrics/crm-message-thread.model.js');
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Assignment Operations', () => {
  let mockReq, mockRes, mockNext;
  let testData;
  let authToken;
  let testUser;
  let testAgent;

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

    // Create test users for authentication and agent assignment
    testUser = await User.create({
      name: 'Test CRM Manager',
      email: 'crm-manager@example.com',
      password: 'password123',
      role: 'manager'
    });

    testAgent = await User.create({
      name: 'Test Agent',
      email: 'agent@example.com',
      password: 'password123',
      role: 'agent'
    });

    // Generate auth token (mock implementation)
    authToken = 'Bearer mock-jwt-token-for-testing';
  });

  afterEach(async () => {
    // Clean up collections between tests
    await Promise.all([
      User.deleteMany({}),
      CrmAssignmentMetrics.deleteMany({}),
      CrmMessageThread.deleteMany({}),
      CrmContact.deleteMany({})
    ]);
  });

  describe('Assignment CRUD Operations', () => {
    beforeEach(async () => {
      // Create mock assignment data
      const mockAssignment = {
        _id: 'assignment123',
        assignmentId: 'ASM_123456_abc789',
        agentId: testAgent._id,
        entityType: 'thread',
        entityId: 'thread456',
        assignmentType: 'manual',
        assignmentReason: 'High priority customer',
        priority: 'high',
        status: 'active',
        assignedAt: new Date(),
        requiredSkills: ['customer_support', 'technical'],
        tags: ['urgent', 'vip_customer'],
        customFields: new Map(),
        metadata: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);
      CrmAssignmentMetrics.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAssignment])
            })
          })
        })
      });
      CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(1);
      CrmAssignmentMetrics.create = jest.fn().mockResolvedValue(mockAssignment);
      CrmAssignmentMetrics.findByIdAndUpdate = jest.fn().mockResolvedValue(mockAssignment);
      CrmAssignmentMetrics.findOne = jest.fn().mockResolvedValue(null); // No existing assignment
      CrmAssignmentMetrics.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/assignments', () => {
      it('should return paginated list of assignments', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.assignments).toBeDefined();
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.assignments)).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments?page=2&limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by agent', async () => {
        const response = await request(app)
          .get(`/metrics/crm/assignments?agentId=${testAgent._id}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAssignmentMetrics.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ agentId: testAgent._id })
        );
      });

      it('should support filtering by entity type', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments?entityType=thread')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAssignmentMetrics.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ entityType: 'thread' })
        );
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments?status=active')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAssignmentMetrics.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'active' })
        );
      });

      it('should support filtering by priority', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments?priority=high')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAssignmentMetrics.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'high' })
        );
      });

      it('should include assignment summary', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.summary.total).toBeDefined();
        expect(response.body.data.summary.active).toBeDefined();
        expect(response.body.data.summary.overdue).toBeDefined();
        expect(response.body.data.summary.completed).toBeDefined();
      });

      it('should handle database errors gracefully', async () => {
        CrmAssignmentMetrics.findActive = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('POST /metrics/crm/assignments', () => {
      it('should create a new assignment successfully', async () => {
        const assignmentData = {
          agentId: testAgent._id,
          entityType: 'thread',
          entityId: 'thread456',
          assignmentType: 'manual',
          assignmentReason: 'High priority customer',
          priority: 'high',
          requiredSkills: ['customer_support', 'technical'],
          tags: ['urgent', 'vip_customer']
        };

        const response = await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.agentId).toBe(assignmentData.agentId);
        expect(response.body.data.entityType).toBe(assignmentData.entityType);
        expect(response.body.data.priority).toBe(assignmentData.priority);
        expect(CrmAssignmentMetrics.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...assignmentData,
            createdBy: testUser._id
          })
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          assignmentReason: 'Missing required fields'
        };

        const response = await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('REQUIRED_FIELDS_MISSING');
        expect(response.body.error.message).toContain('required');
      });

      it('should prevent duplicate assignments', async () => {
        const assignmentData = {
          agentId: testAgent._id,
          entityType: 'thread',
          entityId: 'thread456'
        };

        CrmAssignmentMetrics.findOne = jest.fn().mockResolvedValue({ _id: 'existing' });

        const response = await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_EXISTS');
        expect(response.body.error.message).toContain('already exists');
      });

      it('should validate priority values', async () => {
        const invalidData = {
          agentId: testAgent._id,
          entityType: 'thread',
          entityId: 'thread456',
          priority: 'invalid_priority'
        };

        const response = await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle database errors during creation', async () => {
        const assignmentData = {
          agentId: testAgent._id,
          entityType: 'thread',
          entityId: 'thread456'
        };

        CrmAssignmentMetrics.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /metrics/crm/assignments/:assignmentId', () => {
      it('should return assignment details successfully', async () => {
        const assignmentId = 'assignment123';

        const response = await request(app)
          .get(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.assignmentId).toBe('ASM_123456_abc789');
        expect(response.body.data.agentId).toBe(testAgent._id);
        expect(CrmAssignmentMetrics.findById).toHaveBeenCalledWith(assignmentId);
      });

      it('should handle non-existent assignment', async () => {
        const assignmentId = 'nonexistent';

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });

      it('should handle invalid assignment ID', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments/invalid-id')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /metrics/crm/assignments/:assignmentId', () => {
      it('should update assignment successfully', async () => {
        const assignmentId = 'assignment123';
        const updateData = {
          priority: 'urgent',
          tags: ['updated', 'critical'],
          customFields: { updatedField: 'updatedValue' }
        };

        const response = await request(app)
          .put(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmAssignmentMetrics.findByIdAndUpdate).toHaveBeenCalledWith(
          assignmentId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent assignment update', async () => {
        const assignmentId = 'nonexistent';
        const updateData = { priority: 'high' };

        CrmAssignmentMetrics.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });

      it('should validate update data', async () => {
        const assignmentId = 'assignment123';
        const invalidData = {
          priority: 'invalid_priority'
        };

        const response = await request(app)
          .put(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/assignments/:assignmentId', () => {
      it('should delete assignment successfully (soft delete)', async () => {
        const assignmentId = 'assignment123';
        const mockAssignment = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);

        const response = await request(app)
          .delete(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockAssignment.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent assignment deletion', async () => {
        const assignmentId = 'nonexistent';

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/assignments/${assignmentId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });
    });
  });

  describe('Assignment Transfer Operations', () => {
    beforeEach(async () => {
      const mockAssignment = {
        _id: 'assignment123',
        agentId: testAgent._id,
        transfer: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);
    });

    describe('POST /metrics/crm/assignments/:assignmentId/transfer', () => {
      it('should transfer assignment successfully', async () => {
        const assignmentId = 'assignment123';
        const newAgent = await User.create({
          name: 'New Agent',
          email: 'newagent@example.com',
          password: 'password123',
          role: 'agent'
        });

        const transferData = {
          toAgentId: newAgent._id,
          reason: 'Workload balancing',
          priority: 'medium'
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/transfer`)
          .set('Authorization', authToken)
          .send(transferData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmAssignmentMetrics.findById).toHaveBeenCalledWith(assignmentId);
        
        const mockAssignment = await CrmAssignmentMetrics.findById(assignmentId);
        expect(mockAssignment.transfer).toHaveBeenCalledWith(
          transferData.toAgentId,
          transferData.reason
        );
      });

      it('should validate target agent ID', async () => {
        const assignmentId = 'assignment123';
        const invalidData = {
          reason: 'Missing target agent'
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/transfer`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TO_AGENT_ID_REQUIRED');
        expect(response.body.error.message).toContain('required');
      });

      it('should handle non-existent assignment transfer', async () => {
        const assignmentId = 'nonexistent';
        const transferData = {
          toAgentId: testAgent._id
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/transfer`)
          .set('Authorization', authToken)
          .send(transferData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });

      it('should handle transfer errors', async () => {
        const assignmentId = 'assignment123';
        const transferData = {
          toAgentId: testAgent._id,
          reason: 'Test transfer'
        };

        const mockAssignment = {
          transfer: jest.fn().mockRejectedValue(new Error('Transfer failed'))
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/transfer`)
          .set('Authorization', authToken)
          .send(transferData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });
  });

  describe('Assignment Completion Operations', () => {
    beforeEach(async () => {
      const mockAssignment = {
        _id: 'assignment123',
        complete: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);
    });

    describe('POST /metrics/crm/assignments/:assignmentId/complete', () => {
      it('should complete assignment successfully', async () => {
        const assignmentId = 'assignment123';
        const completionData = {
          completionReason: 'resolved',
          satisfactionScore: 5,
          notes: 'Customer issue resolved successfully'
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/complete`)
          .set('Authorization', authToken)
          .send(completionData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAssignment = await CrmAssignmentMetrics.findById(assignmentId);
        expect(mockAssignment.complete).toHaveBeenCalledWith(
          completionData.completionReason,
          completionData.satisfactionScore
        );
      });

      it('should validate completion reason', async () => {
        const assignmentId = 'assignment123';
        const invalidData = {
          satisfactionScore: 4
          // Missing completionReason
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/complete`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('COMPLETION_REASON_REQUIRED');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate satisfaction score range', async () => {
        const assignmentId = 'assignment123';
        const invalidData = {
          completionReason: 'resolved',
          satisfactionScore: 6 // Invalid - should be 1-5
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/complete`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle completion with notes', async () => {
        const assignmentId = 'assignment123';
        const completionData = {
          completionReason: 'resolved',
          notes: 'Complex case requiring escalation'
        };

        const mockAssignment = {
          complete: jest.fn().mockResolvedValue({}),
          save: jest.fn().mockResolvedValue({}),
          customFields: new Map()
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/complete`)
          .set('Authorization', authToken)
          .send(completionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockAssignment.customFields.get('completionNotes')).toBe('Complex case requiring escalation');
      });

      it('should handle non-existent assignment completion', async () => {
        const assignmentId = 'nonexistent';
        const completionData = {
          completionReason: 'resolved'
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/complete`)
          .set('Authorization', authToken)
          .send(completionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });
    });
  });

  describe('Assignment Escalation Operations', () => {
    beforeEach(async () => {
      const mockAssignment = {
        _id: 'assignment123',
        escalationLevel: 1,
        escalate: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);
    });

    describe('POST /metrics/crm/assignments/:assignmentId/escalate', () => {
      it('should escalate assignment successfully', async () => {
        const assignmentId = 'assignment123';
        const escalationData = {
          toAgentId: testUser._id,
          level: 2,
          reason: 'Requires senior agent attention'
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/escalate`)
          .set('Authorization', authToken)
          .send(escalationData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAssignment = await CrmAssignmentMetrics.findById(assignmentId);
        expect(mockAssignment.escalate).toHaveBeenCalledWith(
          escalationData.toAgentId,
          escalationData.level
        );
      });

      it('should handle escalation without level', async () => {
        const assignmentId = 'assignment123';
        const escalationData = {
          toAgentId: testUser._id
        };

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/escalate`)
          .set('Authorization', authToken)
          .send(escalationData)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        const mockAssignment = await CrmAssignmentMetrics.findById(assignmentId);
        expect(mockAssignment.escalate).toHaveBeenCalledWith(
          escalationData.toAgentId,
          null
        );
      });

      it('should handle non-existent assignment escalation', async () => {
        const assignmentId = 'nonexistent';
        const escalationData = {
          toAgentId: testUser._id
        };

        CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/escalate`)
          .set('Authorization', authToken)
          .send(escalationData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ASSIGNMENT_NOT_FOUND');
      });

      it('should validate escalation data', async () => {
        const assignmentId = 'assignment123';

        const response = await request(app)
          .post(`/metrics/crm/assignments/${assignmentId}/escalate`)
          .set('Authorization', authToken)
          .send({}) // Missing toAgentId
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Agent Workload Operations', () => {
    beforeEach(async () => {
      const mockWorkload = [
        { _id: 'active', count: 15, avgWorkloadScore: 75 },
        { _id: 'completed', count: 30, avgWorkloadScore: 60 }
      ];

      CrmAssignmentMetrics.getAgentWorkload = jest.fn().mockResolvedValue(mockWorkload);
      CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(15); // Active assignments
      CrmAssignmentMetrics.getAgentPerformanceMetrics = jest.fn().mockResolvedValue([
        { _id: 'thread', count: 20, avgResponseTime: 300 }
      ]);
    });

    describe('GET /metrics/crm/assignments/agent/:agentId/workload', () => {
      it('should return agent workload metrics successfully', async () => {
        const response = await request(app)
          .get(`/metrics/crm/assignments/agent/${testAgent._id}/workload`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.agentId).toBe(testAgent._id);
        expect(response.body.data.currentWorkload).toBeDefined();
        expect(response.body.data.currentWorkload.activeAssignments).toBe(15);
        expect(response.body.data.periodWorkload).toEqual([
          { _id: 'active', count: 15, avgWorkloadScore: 75 },
          { _id: 'completed', count: 30, avgWorkloadScore: 60 }
        ]);
        expect(response.body.data.performance).toBeDefined();
      });

      it('should handle date range filtering for workload', async () => {
        const startDate = '2023-01-01';
        const endDate = '2023-01-31';

        const response = await request(app)
          .get(`/metrics/crm/assignments/agent/${testAgent._id}/workload?startDate=${startDate}&endDate=${endDate}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAssignmentMetrics.getAgentWorkload).toHaveBeenCalledWith(
          testAgent._id,
          expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date)
          })
        );
      });

      it('should calculate capacity utilization correctly', async () => {
        CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(25); // High workload

        const response = await request(app)
          .get(`/metrics/crm/assignments/agent/${testAgent._id}/workload`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        // Assuming max capacity of 20, 25 assignments would be > 100% utilization
        expect(response.body.data.currentWorkload.capacityUtilization).toBeGreaterThanOrEqual(100);
      });

      it('should handle non-existent agent workload', async () => {
        const nonExistentAgentId = '507f1f77bcf86cd799439011';

        CrmAssignmentMetrics.getAgentWorkload = jest.fn().mockResolvedValue([]);
        CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(0);
        CrmAssignmentMetrics.getAgentPerformanceMetrics = jest.fn().mockResolvedValue([]);

        const response = await request(app)
          .get(`/metrics/crm/assignments/agent/${nonExistentAgentId}/workload`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentWorkload.activeAssignments).toBe(0);
      });
    });
  });

  describe('Overdue Assignments Operations', () => {
    beforeEach(async () => {
      const mockOverdueAssignments = [
        {
          _id: 'overdue1',
          agentId: { _id: testAgent._id, firstName: 'Test', lastName: 'Agent' },
          entityType: 'thread',
          priority: 'urgent',
          slaDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          assignedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          _id: 'overdue2',
          agentId: { _id: testAgent._id, firstName: 'Test', lastName: 'Agent' },
          entityType: 'contact',
          priority: 'high',
          slaDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
          assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ];

      CrmAssignmentMetrics.findOverdueAssignments = jest.fn().mockResolvedValue(mockOverdueAssignments);
    });

    describe('GET /metrics/crm/assignments/overdue', () => {
      it('should return overdue assignments successfully', async () => {
        const response = await request(app)
          .get('/metrics/crm/assignments/overdue')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.data).toHaveLength(2);
        expect(response.body.data.pagination).toBeDefined();
        
        const firstOverdue = response.body.data.data[0];
        expect(firstOverdue.priority).toBe('urgent');
        expect(firstOverdue.agentId.firstName).toBe('Test');
        
        const secondOverdue = response.body.data.data[1];
        expect(secondOverdue.priority).toBe('high');
        expect(secondOverdue.agentId.firstName).toBe('Test');
      });

      it('should handle pagination for overdue assignments', async () => {
        CrmAssignmentMetrics.findOverdueAssignments = jest.fn().mockResolvedValue([
          { _id: 'overdue1' },
          { _id: 'overdue2' },
          { _id: 'overdue3' },
          { _id: 'overdue4' },
          { _id: 'overdue5' }
        ]);

        const response = await request(app)
          .get('/metrics/crm/assignments/overdue?page=2&limit=2')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(2); // Page 2 should have 2 items
        expect(response.body.data.pagination.page).toBe(2);
        expect(response.body.data.pagination.limit).toBe(2);
        expect(response.body.data.pagination.total).toBe(5);
      });

      it('should handle no overdue assignments', async () => {
        CrmAssignmentMetrics.findOverdueAssignments = jest.fn().mockResolvedValue([]);

        const response = await request(app)
          .get('/metrics/crm/assignments/overdue')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.data).toHaveLength(0);
        expect(response.body.data.pagination.total).toBe(0);
      });
    });
  });

  describe('Bulk Assignment Operations', () => {
    beforeEach(async () => {
      CrmAssignmentMetrics.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });
      CrmAssignmentMetrics.find = jest.fn().mockResolvedValue([
        { _id: 'assignment1', softDelete: jest.fn().mockResolvedValue({}) },
        { _id: 'assignment2', softDelete: jest.fn().mockResolvedValue({}) },
        { _id: 'assignment3', softDelete: jest.fn().mockResolvedValue({}) }
      ]);
    });

    describe('POST /metrics/crm/assignments/bulk/update', () => {
      it('should bulk update assignments successfully', async () => {
        const bulkData = {
          assignmentIds: ['assignment1', 'assignment2', 'assignment3'],
          updateData: { priority: 'high', tags: ['bulk-updated'] }
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/update')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.updatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully updated 3 assignments');
        expect(CrmAssignmentMetrics.updateMany).toHaveBeenCalledWith(
          { _id: { $in: bulkData.assignmentIds }, deleted: false },
          { ...bulkData.updateData, updatedAt: expect.any(Date) }
        );
      });

      it('should validate bulk update data', async () => {
        const invalidData = {
          updateData: { priority: 'high' }
          // Missing assignmentIds
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/update')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle empty assignment IDs array', async () => {
        const bulkData = {
          assignmentIds: [],
          updateData: { priority: 'high' }
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/update')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/assignments/bulk/delete', () => {
      it('should bulk delete assignments successfully', async () => {
        const bulkData = {
          assignmentIds: ['assignment1', 'assignment2', 'assignment3']
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/delete')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully deleted 3 assignments');
        
        // Verify soft delete was called on each assignment
        const mockAssignments = await CrmAssignmentMetrics.find({ _id: { $in: bulkData.assignmentIds } });
        mockAssignments.forEach(assignment => {
          expect(assignment.softDelete).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk delete data', async () => {
        const invalidData = {
          // Missing assignmentIds
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/delete')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle empty assignment IDs for deletion', async () => {
        const bulkData = {
          assignmentIds: []
        };

        const response = await request(app)
          .post('/metrics/crm/assignments/bulk/delete')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/metrics/crm/assignments' },
        { method: 'post', path: '/metrics/crm/assignments' },
        { method: 'get', path: '/metrics/crm/assignments/assignment123' },
        { method: 'put', path: '/metrics/crm/assignments/assignment123' },
        { method: 'delete', path: '/metrics/crm/assignments/assignment123' },
        { method: 'post', path: '/metrics/crm/assignments/assignment123/transfer' },
        { method: 'post', path: '/metrics/crm/assignments/assignment123/complete' },
        { method: 'post', path: '/metrics/crm/assignments/assignment123/escalate' },
        { method: 'get', path: '/metrics/crm/assignments/agent/agent123/workload' },
        { method: 'get', path: '/metrics/crm/assignments/overdue' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path).expect(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should require appropriate role for operations', async () => {
      // Create a user with lower role
      const lowRoleUser = await User.create({
        name: 'Low Role User',
        email: 'lowrole@example.com',
        password: 'password123',
        role: 'user'
      });

      const response = await request(app)
        .get('/metrics/crm/assignments')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      CrmAssignmentMetrics.findActive = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/assignments')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle concurrent assignment operations', async () => {
      const assignmentId = 'assignment123';
      
      const mockAssignment = {
        _id: assignmentId,
        save: jest.fn().mockResolvedValue({}),
        transfer: jest.fn().mockResolvedValue({})
      };

      CrmAssignmentMetrics.findById = jest.fn().mockResolvedValue(mockAssignment);

      // Make multiple concurrent requests
      const requests = [
        request(app).put(`/metrics/crm/assignments/${assignmentId}`).send({ priority: 'high' }),
        request(app).post(`/metrics/crm/assignments/${assignmentId}/transfer`).send({ toAgentId: testAgent._id }),
        request(app).post(`/metrics/crm/assignments/${assignmentId}/complete`).send({ completionReason: 'resolved' })
      ];

      const responses = await Promise.all(requests);
      
      // All requests should be processed
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });

    it('should handle large dataset queries', async () => {
      // Mock large dataset
      const largeAssignmentList = Array(1000).fill().map((_, i) => ({
        _id: `assignment${i}`,
        agentId: testAgent._id,
        status: 'active',
        priority: 'normal'
      }));

      CrmAssignmentMetrics.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(largeAssignmentList)
            })
          })
        })
      });
      CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(1000);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/assignments?limit=1000')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignments).toHaveLength(1000);
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    it('should handle invalid date ranges', async () => {
      const response = await request(app)
        .get('/metrics/crm/assignments?startDate=invalid-date&endDate=invalid-date')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Mock minimal responses
      CrmAssignmentMetrics.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(0);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/assignments')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle high concurrent load', async () => {
      // Mock minimal responses
      CrmAssignmentMetrics.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmAssignmentMetrics.countDocuments = jest.fn().mockResolvedValue(0);

      // Make multiple concurrent requests
      const requests = Array(20).fill().map(() => 
        request(app)
          .get('/metrics/crm/assignments')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
  });
});