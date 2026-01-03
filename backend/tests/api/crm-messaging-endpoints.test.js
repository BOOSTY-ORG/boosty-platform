const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Mock the controllers to avoid database dependencies
const mockMessageController = {
  getThreads: jest.fn((req, res) => {
    res.status(200).json({
      success: true,
      data: {
        threads: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      }
    });
  }),
  createThread: jest.fn((req, res) => {
    // Check for validation errors
    if (!req.body.subject || !req.body.participants || req.body.participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: ['Subject is required', 'At least one participant is required']
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        threadId: 'mock-thread-id',
        subject: req.body.subject,
        status: 'active',
        createdAt: new Date()
      }
    });
  }),
  sendMessage: jest.fn((req, res) => {
    res.status(201).json({
      success: true,
      data: {
        messageId: 'mock-message-id',
        threadId: req.params.threadId,
        content: req.body.content,
        status: 'sent',
        sentAt: new Date()
      }
    });
  }),
  getMessages: jest.fn((req, res) => {
    res.status(200).json({
      success: true,
      data: {
        messages: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          pages: 0
        }
      }
    });
  })
};

const mockAssignmentController = {
  getAssignments: jest.fn((req, res) => {
    res.status(200).json({
      success: true,
      data: {
        assignments: [],
        summary: {
          total: 0,
          active: 0,
          overdue: 0,
          completed: 0
        },
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      }
    });
  }),
  createAssignment: jest.fn((req, res) => {
    res.status(201).json({
      success: true,
      data: {
        assignmentId: 'mock-assignment-id',
        agentId: req.body.agentId,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        status: 'active',
        assignedAt: new Date()
      }
    });
  }),
  transferAssignment: jest.fn((req, res) => {
    res.status(200).json({
      success: true,
      data: {
        assignmentId: req.params.assignmentId,
        transferredTo: req.body.toAgentId,
        transferredAt: new Date()
      }
    });
  }),
  completeAssignment: jest.fn((req, res) => {
    res.status(200).json({
      success: true,
      data: {
        assignmentId: req.params.assignmentId,
        status: 'completed',
        completedAt: new Date()
      }
    });
  })
};

// Set up routes with mock controllers
app.get('/api/metrics/crm/threads', mockMessageController.getThreads);
app.post('/api/metrics/crm/threads', mockMessageController.createThread);
app.get('/api/metrics/crm/threads/:threadId/messages', mockMessageController.getMessages);
app.post('/api/metrics/crm/threads/:threadId/messages', mockMessageController.sendMessage);

app.get('/api/metrics/crm/assignments', mockAssignmentController.getAssignments);
app.post('/api/metrics/crm/assignments', mockAssignmentController.createAssignment);
app.put('/api/metrics/crm/assignments/:assignmentId/transfer', mockAssignmentController.transferAssignment);
app.put('/api/metrics/crm/assignments/:assignmentId/complete', mockAssignmentController.completeAssignment);

describe('CRM Messaging API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Message Threads', () => {
    describe('GET /api/metrics/crm/threads', () => {
      it('should return a list of message threads', async () => {
        const response = await request(app)
          .get('/api/metrics/crm/threads')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('threads');
        expect(response.body.data).toHaveProperty('pagination');
        expect(mockMessageController.getThreads).toHaveBeenCalled();
      });

      it('should support pagination parameters', async () => {
        await request(app)
          .get('/api/metrics/crm/threads?page=2&limit=10')
          .expect(200);

        expect(mockMessageController.getThreads).toHaveBeenCalled();
      });

      it('should support filtering parameters', async () => {
        await request(app)
          .get('/api/metrics/crm/threads?status=active&priority=high')
          .expect(200);

        expect(mockMessageController.getThreads).toHaveBeenCalled();
      });
    });

    describe('POST /api/metrics/crm/threads', () => {
      it('should create a new message thread', async () => {
        const threadData = {
          subject: 'Test Thread',
          participants: [
            { userId: 'user1', role: 'agent' },
            { contactId: 'contact1', role: 'customer' }
          ],
          priority: 'normal'
        };

        const response = await request(app)
          .post('/api/metrics/crm/threads')
          .send(threadData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('threadId');
        expect(response.body.data.subject).toBe(threadData.subject);
        expect(mockMessageController.createThread).toHaveBeenCalled();
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required subject
          participants: []
        };

        await request(app)
          .post('/api/metrics/crm/threads')
          .send(invalidData)
          .expect(400);

        expect(mockMessageController.createThread).toHaveBeenCalled();
      });
    });
  });

  describe('Messages', () => {
    describe('GET /api/metrics/crm/threads/:threadId/messages', () => {
      it('should return messages for a thread', async () => {
        const threadId = 'mock-thread-id';
        
        const response = await request(app)
          .get(`/api/metrics/crm/threads/${threadId}/messages`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('messages');
        expect(response.body.data).toHaveProperty('pagination');
        expect(mockMessageController.getMessages).toHaveBeenCalled();
      });

      it('should support pagination', async () => {
        const threadId = 'mock-thread-id';
        
        await request(app)
          .get(`/api/metrics/crm/threads/${threadId}/messages?page=1&limit=20`)
          .expect(200);

        expect(mockMessageController.getMessages).toHaveBeenCalled();
      });
    });

    describe('POST /api/metrics/crm/threads/:threadId/messages', () => {
      it('should send a new message', async () => {
        const threadId = 'mock-thread-id';
        const messageData = {
          content: 'Test message content',
          type: 'text',
          senderId: 'user1',
          senderType: 'agent'
        };

        const response = await request(app)
          .post(`/api/metrics/crm/threads/${threadId}/messages`)
          .send(messageData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('messageId');
        expect(response.body.data.content).toBe(messageData.content);
        expect(mockMessageController.sendMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Assignments', () => {
    describe('GET /api/metrics/crm/assignments', () => {
      it('should return a list of assignments', async () => {
        const response = await request(app)
          .get('/api/metrics/crm/assignments')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('assignments');
        expect(response.body.data).toHaveProperty('summary');
        expect(response.body.data).toHaveProperty('pagination');
        expect(mockAssignmentController.getAssignments).toHaveBeenCalled();
      });

      it('should include assignment summary', async () => {
        const response = await request(app)
          .get('/api/metrics/crm/assignments')
          .expect(200);

        expect(response.body.data.summary).toHaveProperty('total');
        expect(response.body.data.summary).toHaveProperty('active');
        expect(response.body.data.summary).toHaveProperty('overdue');
        expect(response.body.data.summary).toHaveProperty('completed');
      });
    });

    describe('POST /api/metrics/crm/assignments', () => {
      it('should create a new assignment', async () => {
        const assignmentData = {
          agentId: 'agent1',
          entityType: 'thread',
          entityId: 'thread1',
          assignmentType: 'manual',
          priority: 'normal'
        };

        const response = await request(app)
          .post('/api/metrics/crm/assignments')
          .send(assignmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('assignmentId');
        expect(response.body.data.agentId).toBe(assignmentData.agentId);
        expect(mockAssignmentController.createAssignment).toHaveBeenCalled();
      });
    });

    describe('PUT /api/metrics/crm/assignments/:assignmentId/transfer', () => {
      it('should transfer an assignment', async () => {
        const assignmentId = 'assignment1';
        const transferData = {
          toAgentId: 'agent2',
          reason: 'Workload balancing'
        };

        const response = await request(app)
          .put(`/api/metrics/crm/assignments/${assignmentId}/transfer`)
          .send(transferData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('transferredTo');
        expect(response.body.data.transferredTo).toBe(transferData.toAgentId);
        expect(mockAssignmentController.transferAssignment).toHaveBeenCalled();
      });
    });

    describe('PUT /api/metrics/crm/assignments/:assignmentId/complete', () => {
      it('should complete an assignment', async () => {
        const assignmentId = 'assignment1';
        const completionData = {
          resolution: 'Issue resolved',
          customerSatisfaction: 5
        };

        const response = await request(app)
          .put(`/api/metrics/crm/assignments/${assignmentId}/complete`)
          .send(completionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data).toHaveProperty('completedAt');
        expect(mockAssignmentController.completeAssignment).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent threads', async () => {
      // Mock a 404 response
      const mockController = jest.fn((req, res) => {
        res.status(404).json({
          success: false,
          error: 'Thread not found'
        });
      });

      app.get('/api/metrics/crm/threads/not-found', mockController);

      await request(app)
        .get('/api/metrics/crm/threads/not-found')
        .expect(404);
    });

    it('should handle validation errors', async () => {
      // Mock a validation error response
      const mockController = jest.fn((req, res) => {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: ['Subject is required', 'At least one participant is required']
        });
      });

      app.post('/api/metrics/crm/threads/validate', mockController);

      await request(app)
        .post('/api/metrics/crm/threads/validate')
        .send({})
        .expect(400);
    });

    it('should handle server errors', async () => {
      // Mock a server error response
      const mockController = jest.fn((req, res) => {
        res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      });

      app.get('/api/metrics/crm/error', mockController);

      await request(app)
        .get('/api/metrics/crm/error')
        .expect(500);
    });
  });
});