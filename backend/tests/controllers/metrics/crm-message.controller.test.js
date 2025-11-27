const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../../src/express.js');
const { createTestData, createMockRequest, createMockResponse, createMockNext } = require('../../helpers/metrics.test.helpers.js');
const CrmMessageThread = require('../../../src/models/metrics/crm-message-thread.model.js');
const CrmMessage = require('../../../src/models/metrics/crm-message.model.js');
const CrmAssignmentMetrics = require('../../../src/models/metrics/crm-assignment-metrics.model.js');
const User = require('../../../src/models/user.model.js');

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-message-thread.model.js');
jest.mock('../../../src/models/metrics/crm-message.model.js');
jest.mock('../../../src/models/metrics/crm-assignment-metrics.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Message Controller', () => {
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

  describe('getMessageThreads', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should return paginated message threads successfully', async () => {
      // Mock database calls
      const mockThreads = [
        {
          _id: 'thread1',
          threadId: 'THR_123456_abc123',
          threadType: 'direct',
          subject: 'Test Thread 1',
          status: 'active',
          priority: 'medium',
          assignedAgent: { _id: 'agent1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          participants: [
            { userId: { _id: 'user1', firstName: 'Alice', lastName: 'Smith' }, role: 'agent' }
          ],
          messageCount: 5,
          unreadCount: 2,
          lastMessageAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          isOverdue: false,
          participantCount: 2,
          hasUnreadMessages: true,
          isHighPriority: false
        }
      ];

      CrmMessageThread.findActive.mockResolvedValue(mockThreads);
      CrmMessageThread.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/metrics/crm/threads?page=1&limit=20')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      
      const thread = response.body.data.data[0];
      expect(thread.threadId).toBe('THR_123456_abc123');
      expect(thread.threadType).toBe('direct');
      expect(thread.status).toBe('active');
      expect(thread.virtuals.isOverdue).toBe(false);
      expect(thread.virtuals.hasUnreadMessages).toBe(true);
    });

    it('should handle filtering parameters correctly', async () => {
      CrmMessageThread.findActive.mockResolvedValue([]);
      CrmMessageThread.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/metrics/crm/threads?status=active&priority=high&assignedAgent=agent123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmMessageThread.findActive).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          priority: 'high',
          assignedAgent: 'agent123'
        })
      );
    });

    it('should handle date range filtering', async () => {
      CrmMessageThread.findActive.mockResolvedValue([]);
      CrmMessageThread.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/metrics/crm/threads?dateRange=last_7_days')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      CrmMessageThread.findActive.mockResolvedValue([]);
      CrmMessageThread.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/metrics/crm/threads?page=2&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBe(50);
      expect(response.body.data.pagination.totalPages).toBe(5);
    });

    it('should handle database errors gracefully', async () => {
      CrmMessageThread.findActive.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/metrics/crm/threads')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('createMessageThread', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should create a new message thread successfully', async () => {
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: 'user1', role: 'agent' },
          { contactId: 'contact1', role: 'contact' }
        ],
        subject: 'New Support Thread',
        priority: 'high',
        primaryChannel: 'in_app',
        tags: ['support', 'urgent']
      };

      const mockThread = {
        _id: 'newThreadId',
        threadId: 'THR_789012_def456',
        ...threadData,
        status: 'active',
        messageCount: 0,
        unreadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockThreadInstance = {
        ...mockThread,
        save: jest.fn().mockResolvedValue(mockThread),
        populate: jest.fn().mockResolvedValue(mockThread)
      };

      CrmMessageThread.mockImplementation(() => mockThreadInstance);
      CrmAssignmentMetrics.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({ _id: 'assignment1' })
      }));

      const response = await request(app)
        .post('/api/metrics/crm/threads')
        .send(threadData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.threadId).toBe('THR_789012_def456');
      expect(response.body.data.threadType).toBe('direct');
      expect(response.body.data.subject).toBe('New Support Thread');
      expect(mockThreadInstance.save).toHaveBeenCalled();
    });

    it('should validate required participants', async () => {
      const invalidData = {
        threadType: 'direct',
        subject: 'Invalid Thread'
        // Missing participants
      };

      const response = await request(app)
        .post('/api/metrics/crm/threads')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARTICIPANTS');
      expect(response.body.error.message).toBe('At least one participant is required');
    });

    it('should create assignment when agent is assigned', async () => {
      const threadData = {
        participants: [{ userId: 'user1', role: 'agent' }],
        assignedAgent: 'agent123',
        priority: 'medium'
      };

      const mockThread = {
        _id: 'thread1',
        ...threadData,
        save: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmMessageThread.mockImplementation(() => mockThread);
      
      const mockAssignment = {
        save: jest.fn().mockResolvedValue({ _id: 'assignment1' })
      };
      CrmAssignmentMetrics.mockImplementation(() => mockAssignment);

      await request(app)
        .post('/api/metrics/crm/threads')
        .send(threadData)
        .expect(201);

      expect(CrmAssignmentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent123',
          entityType: 'thread',
          assignmentType: 'manual',
          priority: 'medium'
        })
      );
    });

    it('should handle thread creation errors', async () => {
      const threadData = {
        participants: [{ userId: 'user1', role: 'agent' }]
      };

      const mockThread = {
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      CrmMessageThread.mockImplementation(() => mockThread);

      const response = await request(app)
        .post('/api/metrics/crm/threads')
        .send(threadData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should send a message successfully', async () => {
      const threadId = 'thread123';
      const messageData = {
        content: 'Hello, this is a test message',
        messageType: 'text',
        deliveryChannels: ['in_app']
      };

      const mockThread = {
        _id: threadId,
        updateMessageCount: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      const mockMessage = {
        _id: 'message123',
        threadId,
        content: messageData.content,
        messageType: messageData.messageType,
        status: 'sent',
        sentAt: new Date(),
        markAsDelivered: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmMessage.mockImplementation(() => ({
        ...mockMessage,
        save: jest.fn().mockResolvedValue(mockMessage)
      }));

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(messageData.content);
      expect(response.body.data.threadId).toBe(threadId);
      expect(mockThread.updateMessageCount).toHaveBeenCalledWith(1);
      expect(mockMessage.markAsDelivered).toHaveBeenCalledWith('in_app');
    });

    it('should handle different message types', async () => {
      const threadId = 'thread123';
      const messageData = {
        content: 'Check out this image',
        messageType: 'image',
        attachments: [
          {
            name: 'test.jpg',
            type: 'image/jpeg',
            size: 1024,
            url: 'https://example.com/test.jpg'
          }
        ]
      };

      const mockThread = {
        _id: threadId,
        updateMessageCount: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      const mockMessage = {
        _id: 'message123',
        ...messageData,
        save: jest.fn().mockResolvedValue({}),
        markAsDelivered: jest.fn().mockResolvedValue({}),
        populate: jest.fn().mockResolvedValue({})
      };

      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmMessage.mockImplementation(() => mockMessage);

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messageType).toBe('image');
      expect(response.body.data.attachments).toHaveLength(1);
    });

    it('should return 404 for non-existent thread', async () => {
      const threadId = 'nonexistent';
      const messageData = {
        content: 'Test message'
      };

      CrmMessageThread.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/messages`)
        .send(messageData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
    });

    it('should handle message sending errors', async () => {
      const threadId = 'thread123';
      const messageData = {
        content: 'Test message'
      };

      const mockThread = { _id: threadId };
      CrmMessageThread.findById.mockResolvedValue(mockThread);

      const mockMessage = {
        save: jest.fn().mockRejectedValue(new Error('Send failed'))
      };
      CrmMessage.mockImplementation(() => mockMessage);

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/messages`)
        .send(messageData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('getThreadMessages', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should return paginated thread messages', async () => {
      const threadId = 'thread123';
      const mockMessages = [
        {
          _id: 'message1',
          threadId,
          content: 'First message',
          messageType: 'text',
          status: 'read',
          sentAt: new Date(),
          isDelivered: true,
          isRead: true,
          hasAttachments: false
        },
        {
          _id: 'message2',
          threadId,
          content: 'Second message',
          messageType: 'text',
          status: 'sent',
          sentAt: new Date(),
          isDelivered: false,
          isRead: false,
          hasAttachments: false
        }
      ];

      const mockThread = { _id: threadId };
      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmMessage.findByThread.mockResolvedValue(mockMessages);
      CrmMessage.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get(`/api/metrics/crm/threads/${threadId}/messages?page=1&limit=50`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toHaveLength(2);
      expect(response.body.data.threadId).toBe(threadId);
      expect(response.body.data.pagination).toBeDefined();
      
      const firstMessage = response.body.data.data[0];
      expect(firstMessage.content).toBe('First message');
      expect(firstMessage.virtuals.isRead).toBe(true);
    });

    it('should handle message type filtering', async () => {
      const threadId = 'thread123';
      
      const mockThread = { _id: threadId };
      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmMessage.findByThread.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/metrics/crm/threads/${threadId}/messages?messageType=image`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmMessage.findByThread).toHaveBeenCalledWith(
        threadId,
        expect.objectContaining({
          messageType: 'image'
        })
      );
    });

    it('should handle cursor pagination with before/after', async () => {
      const threadId = 'thread123';
      const beforeDate = '2023-01-01T00:00:00Z';
      
      const mockThread = { _id: threadId };
      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmMessage.findByThread.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/metrics/crm/threads/${threadId}/messages?before=${beforeDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmMessage.findByThread).toHaveBeenCalledWith(
        threadId,
        expect.objectContaining({
          before: beforeDate
        })
      );
    });
  });

  describe('assignThread', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should assign thread to agent successfully', async () => {
      const threadId = 'thread123';
      const assignmentData = {
        agentId: 'agent456',
        assignmentType: 'manual',
        assignmentReason: 'Customer request'
      };

      const mockThread = {
        _id: threadId,
        assignToAgent: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      const mockAssignment = {
        save: jest.fn().mockResolvedValue({ _id: 'assignment123' })
      };

      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmAssignmentMetrics.findOne.mockResolvedValue(null);
      CrmAssignmentMetrics.mockImplementation(() => mockAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/assign`)
        .send(assignmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockThread.assignToAgent).toHaveBeenCalledWith('agent456');
      expect(CrmAssignmentMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent456',
          entityType: 'thread',
          entityId: threadId,
          assignmentType: 'manual',
          assignmentReason: 'Customer request'
        })
      );
    });

    it('should handle thread transfer when assignment exists', async () => {
      const threadId = 'thread123';
      const assignmentData = {
        agentId: 'newAgent789',
        assignmentReason: 'Workload balancing'
      };

      const mockThread = {
        _id: threadId,
        assignToAgent: jest.fn().mockResolvedValue({})
      };

      const existingAssignment = {
        transfer: jest.fn().mockResolvedValue({})
      };

      CrmMessageThread.findById.mockResolvedValue(mockThread);
      CrmAssignmentMetrics.findOne.mockResolvedValue(existingAssignment);

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/assign`)
        .send(assignmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(existingAssignment.transfer).toHaveBeenCalledWith('newAgent789', 'Workload balancing');
    });

    it('should validate agent ID requirement', async () => {
      const threadId = 'thread123';
      const invalidData = {
        assignmentReason: 'Missing agent ID'
      };

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${threadId}/assign`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AGENT_ID_REQUIRED');
    });
  });

  describe('searchMessages', () => {
    beforeEach(async () => {
      testData = await createTestData({ users: 3 });
    });

    it('should search messages successfully', async () => {
      const searchQuery = 'support request';
      const mockMessages = [
        {
          _id: 'message1',
          content: 'Customer support request',
          threadId: { threadId: 'THR_123', subject: 'Support Thread' },
          senderId: { _id: 'user1', firstName: 'John', lastName: 'Doe' }
        }
      ];

      CrmMessage.searchMessages.mockResolvedValue(mockMessages);
      CrmMessage.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get(`/api/metrics/crm/messages/search?q=${encodeURIComponent(searchQuery)}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBe(searchQuery);
      expect(response.body.data.data).toHaveLength(1);
      expect(CrmMessage.searchMessages).toHaveBeenCalledWith(searchQuery, expect.any(Object));
    });

    it('should handle search with filters', async () => {
      const searchQuery = 'urgent';
      const filters = {
        threadId: 'thread123',
        messageType: 'text',
        page: 1,
        limit: 20
      };

      CrmMessage.searchMessages.mockResolvedValue([]);
      CrmMessage.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/metrics/crm/messages/search?q=${encodeURIComponent(searchQuery)}&threadId=${filters.threadId}&messageType=${filters.messageType}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(CrmMessage.searchMessages).toHaveBeenCalledWith(
        searchQuery,
        expect.objectContaining({
          threadId: filters.threadId,
          messageType: filters.messageType
        })
      );
    });

    it('should validate search query requirement', async () => {
      const response = await request(app)
        .get('/api/metrics/crm/messages/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SEARCH_QUERY_REQUIRED');
    });
  });

  describe('Error Handling', () => {
    it('should handle thread not found errors', async () => {
      const threadId = 'nonexistent';

      CrmMessageThread.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/metrics/crm/threads/${threadId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
    });

    it('should handle message not found errors', async () => {
      const messageId = 'nonexistent';

      CrmMessage.findById.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/metrics/crm/messages/${messageId}`)
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
    });

    it('should handle unauthorized access attempts', async () => {
      // Mock request without user authentication
      const response = await request(app)
        .get('/api/metrics/crm/threads')
        .set('Authorization', '')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Mock multiple rapid requests
      const mockThreads = [{ _id: 'thread1', threadId: 'THR_123' }];
      CrmMessageThread.findActive.mockResolvedValue(mockThreads);
      CrmMessageThread.countDocuments.mockResolvedValue(1);

      // Make multiple requests rapidly
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/metrics/crm/threads')
      );

      const responses = await Promise.all(requests);
      
      // At least some requests should succeed, but rate limiting might kick in
      const successfulResponses = responses.filter(res => res.status === 200);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      expect(successfulResponses.length + rateLimitedResponses.length).toBe(10);
    });
  });
});