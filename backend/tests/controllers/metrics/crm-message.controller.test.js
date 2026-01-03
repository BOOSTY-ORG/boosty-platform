
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmMessage from '../../../src/models/metrics/crm-message.model.js';
import CrmMessageThread from '../../../src/models/metrics/crm-message-thread.model.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-message.model.js');
jest.mock('../../../src/models/metrics/crm-message-thread.model.js');
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Message Controller', () => {
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
      CrmMessage.deleteMany({}),
      CrmMessageThread.deleteMany({}),
      CrmContact.deleteMany({})
    ]);
  });

  describe('Message Thread Operations', () => {
    beforeEach(async () => {
      // Create mock thread data
      const mockThread = {
        _id: 'thread123',
        threadId: 'THREAD_123456',
        subject: 'Test Thread Subject',
        entityType: 'contact',
        entityId: 'contact123',
        status: 'active',
        priority: 'normal',
        participants: [
          {
            participantId: testUser._id,
            participantType: 'user',
            role: 'agent',
            joinedAt: new Date()
          },
          {
            participantId: 'contact123',
            participantType: 'contact',
            role: 'customer',
            joinedAt: new Date()
          }
        ],
        tags: ['test', 'support'],
        customFields: new Map(),
        metadata: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmMessageThread.findById = jest.fn().mockResolvedValue(mockThread);
      CrmMessageThread.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockThread])
            })
          })
        })
      });
      CrmMessageThread.countDocuments = jest.fn().mockResolvedValue(1);
      CrmMessageThread.create = jest.fn().mockResolvedValue(mockThread);
      CrmMessageThread.findByIdAndUpdate = jest.fn().mockResolvedValue(mockThread);
      CrmMessageThread.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/threads', () => {
      it('should return paginated list of message threads', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.threads).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.threads)).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads?page=2&limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads?status=active')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessageThread.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'active' })
        );
      });

      it('should support filtering by priority', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads?priority=high')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessageThread.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'high' })
        );
      });

      it('should support filtering by entity type', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads?entityType=contact')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessageThread.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ entityType: 'contact' })
        );
      });

      it('should support search functionality', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads?search=test')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessageThread.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            $text: { $search: 'test' }
          })
        );
      });

      it('should handle database errors gracefully', async () => {
        CrmMessageThread.findActive = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/metrics/crm/threads')
          .set('Authorization', authToken)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('POST /metrics/crm/threads', () => {
      it('should create a new message thread successfully', async () => {
        const threadData = {
          subject: 'New Support Thread',
          entityType: 'contact',
          entityId: 'contact123',
          priority: 'normal',
          participants: [
            {
              participantId: testUser._id,
              participantType: 'user',
              role: 'agent'
            },
            {
              participantId: 'contact123',
              participantType: 'contact',
              role: 'customer'
            }
          ],
          tags: ['support', 'new']
        };

        const response = await request(app)
          .post('/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(threadData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.subject).toBe(threadData.subject);
        expect(response.body.data.entityType).toBe(threadData.entityType);
        expect(response.body.data.entityId).toBe(threadData.entityId);
        expect(CrmMessageThread.create).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: threadData.subject,
            entityType: threadData.entityType,
            entityId: threadData.entityId,
            createdBy: testUser._id
          })
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required fields
          participants: []
        };

        const response = await request(app)
          .post('/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate participant data', async () => {
        const invalidData = {
          subject: 'Test Thread',
          entityType: 'contact',
          entityId: 'contact123',
          participants: [
            {
              // Missing participantId
              participantType: 'user',
              role: 'agent'
            }
          ]
        };

        const response = await request(app)
          .post('/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle database errors during creation', async () => {
        CrmMessageThread.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const threadData = {
          subject: 'Test Thread',
          entityType: 'contact',
          entityId: 'contact123',
          participants: [
            {
              participantId: testUser._id,
              participantType: 'user',
              role: 'agent'
            }
          ]
        };

        const response = await request(app)
          .post('/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(threadData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /metrics/crm/threads/:threadId', () => {
      it('should return thread details successfully', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.threadId).toBe('THREAD_123456');
        expect(response.body.data.subject).toBe('Test Thread Subject');
        expect(CrmMessageThread.findById).toHaveBeenCalledWith(threadId);
      });

      it('should handle non-existent thread', async () => {
        const threadId = 'nonexistent';

        CrmMessageThread.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
      });

      it('should handle invalid thread ID', async () => {
        const response = await request(app)
          .get('/metrics/crm/threads/invalid-id')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /metrics/crm/threads/:threadId', () => {
      it('should update thread successfully', async () => {
        const threadId = 'thread123';
        const updateData = {
          subject: 'Updated Thread Subject',
          priority: 'high',
          status: 'closed',
          tags: ['updated', 'high-priority']
        };

        const response = await request(app)
          .put(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmMessageThread.findByIdAndUpdate).toHaveBeenCalledWith(
          threadId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent thread update', async () => {
        const threadId = 'nonexistent';
        const updateData = { subject: 'Updated Subject' };

        CrmMessageThread.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
      });

      it('should validate update data', async () => {
        const threadId = 'thread123';
        const invalidData = {
          priority: 'invalid_priority'
        };

        const response = await request(app)
          .put(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/threads/:threadId', () => {
      it('should delete thread successfully (soft delete)', async () => {
        const threadId = 'thread123';
        const mockThread = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmMessageThread.findById = jest.fn().mockResolvedValue(mockThread);

        const response = await request(app)
          .delete(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockThread.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent thread deletion', async () => {
        const threadId = 'nonexistent';

        CrmMessageThread.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/threads/${threadId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
      });
    });
  });

  describe('Message Operations', () => {
    beforeEach(async () => {
      // Create mock message data
      const mockMessage = {
        _id: 'message123',
        threadId: 'thread123',
        content: 'Test message content',
        messageType: 'text',
        senderId: testUser._id,
        senderModel: 'User',
        senderRole: 'agent',
        status: 'sent',
        sentAt: new Date(),
        attachments: [],
        reactions: [],
        deliveryChannels: [],
        engagementScore: 0,
        responseTime: 0,
        customFields: new Map(),
        metadata: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);
      CrmMessage.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockMessage])
            })
          })
        })
      });
      CrmMessage.countDocuments = jest.fn().mockResolvedValue(1);
      CrmMessage.create = jest.fn().mockResolvedValue(mockMessage);
      CrmMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(mockMessage);
      CrmMessage.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/threads/:threadId/messages', () => {
      it('should return paginated list of messages for thread', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.messages).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.messages)).toBe(true);
        expect(CrmMessage.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ threadId })
        );
      });

      it('should support pagination for messages', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}/messages?page=2&limit=10`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by message type', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}/messages?messageType=text`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessage.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ messageType: 'text' })
        );
      });

      it('should support filtering by status', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}/messages?status=read`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessage.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'read' })
        );
      });

      it('should support before/after date filtering', async () => {
        const threadId = 'thread123';
        const before = new Date('2023-12-31');
        const after = new Date('2023-01-01');

        const response = await request(app)
          .get(`/metrics/crm/threads/${threadId}/messages?before=${before.toISOString()}&after=${after.toISOString()}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessage.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            sentAt: {
              $lt: expect.any(Date),
              $gt: expect.any(Date)
            }
          })
        );
      });
    });

    describe('POST /metrics/crm/threads/:threadId/messages', () => {
      it('should create a new message successfully', async () => {
        const threadId = 'thread123';
        const messageData = {
          content: 'New message content',
          messageType: 'text',
          senderRole: 'agent',
          attachments: [
            {
              name: 'document.pdf',
              type: 'application/pdf',
              size: 1024,
              url: 'https://example.com/document.pdf'
            }
          ]
        };

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .send(messageData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.content).toBe(messageData.content);
        expect(response.body.data.messageType).toBe(messageData.messageType);
        expect(response.body.data.senderId).toBe(testUser._id);
        expect(CrmMessage.create).toHaveBeenCalledWith(
          expect.objectContaining({
            threadId,
            content: messageData.content,
            messageType: messageData.messageType,
            senderId: testUser._id,
            senderModel: 'User',
            senderRole: messageData.senderRole
          })
        );
      });

      it('should validate required message fields', async () => {
        const threadId = 'thread123';
        const invalidData = {
          // Missing content
          messageType: 'text'
        };

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate message content length', async () => {
        const threadId = 'thread123';
        const invalidData = {
          content: 'a'.repeat(10001), // Exceeds 10000 character limit
          messageType: 'text'
        };

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate attachment data', async () => {
        const threadId = 'thread123';
        const invalidData = {
          content: 'Test message',
          messageType: 'text',
          attachments: [
            {
              // Missing required attachment fields
              name: 'test.pdf'
            }
          ]
        };

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /metrics/crm/messages/:messageId', () => {
      it('should return message details successfully', async () => {
        const messageId = 'message123';

        const response = await request(app)
          .get(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.content).toBe('Test message content');
        expect(response.body.data.messageType).toBe('text');
        expect(CrmMessage.findById).toHaveBeenCalledWith(messageId);
      });

      it('should handle non-existent message', async () => {
        const messageId = 'nonexistent';

        CrmMessage.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
      });
    });

    describe('PUT /metrics/crm/messages/:messageId', () => {
      it('should update message successfully', async () => {
        const messageId = 'message123';
        const updateData = {
          content: 'Updated message content',
          engagementScore: 85
        };

        const response = await request(app)
          .put(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(CrmMessage.findByIdAndUpdate).toHaveBeenCalledWith(
          messageId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent message update', async () => {
        const messageId = 'nonexistent';
        const updateData = { content: 'Updated content' };

        CrmMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
      });
    });

    describe('DELETE /metrics/crm/messages/:messageId', () => {
      it('should delete message successfully (soft delete)', async () => {
        const messageId = 'message123';
        const mockMessage = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

        const response = await request(app)
          .delete(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockMessage.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent message deletion', async () => {
        const messageId = 'nonexistent';

        CrmMessage.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/messages/${messageId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
      });
    });

    describe('Message Status Operations', () => {
      describe('POST /metrics/crm/messages/:messageId/mark-read', () => {
        it('should mark message as read successfully', async () => {
          const messageId = 'message123';
          const mockMessage = {
            markAsRead: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/mark-read`)
            .set('Authorization', authToken)
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.markAsRead).toHaveBeenCalled();
        });

        it('should handle non-existent message when marking as read', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/mark-read`)
            .set('Authorization', authToken)
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });
      });

      describe('POST /metrics/crm/messages/:messageId/mark-delivered', () => {
        it('should mark message as delivered successfully', async () => {
          const messageId = 'message123';
          const mockMessage = {
            markAsDelivered: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/mark-delivered`)
            .set('Authorization', authToken)
            .send({ channel: 'email' })
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.markAsDelivered).toHaveBeenCalledWith('email');
        });

        it('should handle non-existent message when marking as delivered', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/mark-delivered`)
            .set('Authorization', authToken)
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });
      });
    });

    describe('Message Reaction Operations', () => {
      describe('POST /metrics/crm/messages/:messageId/reactions', () => {
        it('should add reaction to message successfully', async () => {
          const messageId = 'message123';
          const reactionData = {
            reaction: '👍',
            userId: testUser._id
          };

          const mockMessage = {
            addReaction: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/reactions`)
            .set('Authorization', authToken)
            .send(reactionData)
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.addReaction).toHaveBeenCalledWith(
            reactionData.userId,
            undefined,
            reactionData.reaction
          );
        });

        it('should handle non-existent message when adding reaction', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/reactions`)
            .set('Authorization', authToken)
            .send({ reaction: '👍' })
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });

        it('should validate reaction data', async () => {
          const messageId = 'message123';

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/reactions`)
            .set('Authorization', authToken)
            .send({}) // Missing reaction
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
      });

      describe('DELETE /metrics/crm/messages/:messageId/reactions', () => {
        it('should remove reaction from message successfully', async () => {
          const messageId = 'message123';
          const mockMessage = {
            removeReaction: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .delete(`/metrics/crm/messages/${messageId}/reactions`)
            .set('Authorization', authToken)
            .send({ userId: testUser._id })
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.removeReaction).toHaveBeenCalledWith(
            testUser._id,
            undefined
          );
        });

        it('should handle non-existent message when removing reaction', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .delete(`/metrics/crm/messages/${messageId}/reactions`)
            .set('Authorization', authToken)
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });
      });
    });

    describe('Message Attachment Operations', () => {
      describe('POST /metrics/crm/messages/:messageId/attachments', () => {
        it('should add attachment to message successfully', async () => {
          const messageId = 'message123';
          const attachmentData = {
            name: 'document.pdf',
            type: 'application/pdf',
            size: 1024,
            url: 'https://example.com/document.pdf',
            contentType: 'application/pdf'
          };

          const mockMessage = {
            addAttachment: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/attachments`)
            .set('Authorization', authToken)
            .send(attachmentData)
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.addAttachment).toHaveBeenCalledWith(attachmentData);
        });

        it('should handle non-existent message when adding attachment', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/attachments`)
            .set('Authorization', authToken)
            .send({ name: 'test.pdf' })
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });

        it('should validate attachment data', async () => {
          const messageId = 'message123';

          const response = await request(app)
            .post(`/metrics/crm/messages/${messageId}/attachments`)
            .set('Authorization', authToken)
            .send({}) // Missing attachment data
            .expect(400);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
      });

      describe('DELETE /metrics/crm/messages/:messageId/attachments/:attachmentIndex', () => {
        it('should remove attachment from message successfully', async () => {
          const messageId = 'message123';
          const attachmentIndex = 0;
          const mockMessage = {
            removeAttachment: jest.fn().mockResolvedValue({})
          };

          CrmMessage.findById = jest.fn().mockResolvedValue(mockMessage);

          const response = await request(app)
            .delete(`/metrics/crm/messages/${messageId}/attachments/${attachmentIndex}`)
            .set('Authorization', authToken)
            .expect(200);

          expect(response.body).toBeDefined();
          expect(response.body.success).toBe(true);
          expect(mockMessage.removeAttachment).toHaveBeenCalledWith(attachmentIndex);
        });

        it('should handle non-existent message when removing attachment', async () => {
          const messageId = 'nonexistent';

          CrmMessage.findById = jest.fn().mockResolvedValue(null);

          const response = await request(app)
            .delete(`/metrics/crm/messages/${messageId}/attachments/0`)
            .set('Authorization', authToken)
            .expect(404);

          expect(response.body.success).toBe(false);
          expect(response.body.error.code).toBe('MESSAGE_NOT_FOUND');
        });
      });
    });
  });

  describe('Participant Management', () => {
    describe('POST /metrics/crm/threads/:threadId/participants', () => {
      it('should add participant to thread successfully', async () => {
        const threadId = 'thread123';
        const participantData = {
          participantId: 'contact456',
          participantType: 'contact',
          role: 'customer'
        };

        const mockThread = {
          addParticipant: jest.fn().mockResolvedValue({})
        };

        CrmMessageThread.findById = jest.fn().mockResolvedValue(mockThread);

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/participants`)
          .set('Authorization', authToken)
          .send(participantData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockThread.addParticipant).toHaveBeenCalledWith(
          participantData.participantId,
          participantData.participantType,
          participantData.role
        );
      });

      it('should handle non-existent thread when adding participant', async () => {
        const threadId = 'nonexistent';

        CrmMessageThread.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/participants`)
          .set('Authorization', authToken)
          .send({ participantId: 'contact456' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
      });

      it('should validate participant data', async () => {
        const threadId = 'thread123';

        const response = await request(app)
          .post(`/metrics/crm/threads/${threadId}/participants`)
          .set('Authorization', authToken)
          .send({}) // Missing participant data
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/threads/:threadId/participants/:participantId', () => {
      it('should remove participant from thread successfully', async () => {
        const threadId = 'thread123';
        const participantId = 'contact456';
        const mockThread = {
          removeParticipant: jest.fn().mockResolvedValue({})
        };

        CrmMessageThread.findById = jest.fn().mockResolvedValue(mockThread);

        const response = await request(app)
          .delete(`/metrics/crm/threads/${threadId}/participants/${participantId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockThread.removeParticipant).toHaveBeenCalledWith(participantId);
      });

      it('should handle non-existent thread when removing participant', async () => {
        const threadId = 'nonexistent';

        CrmMessageThread.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/threads/${threadId}/participants/contact456`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
      });
    });
  });

  describe('Search and Filtering', () => {
    describe('GET /metrics/crm/messages/search', () => {
      it('should search messages successfully', async () => {
        const searchTerm = 'test content';

        CrmMessage.searchMessages = jest.fn().mockResolvedValue({
          messages: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/messages/search?q=${encodeURIComponent(searchTerm)}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmMessage.searchMessages).toHaveBeenCalledWith(searchTerm, {});
      });

      it('should support search filters', async () => {
        const searchTerm = 'test content';
        const filters = {
          threadId: 'thread123',
          messageType: 'text',
          senderId: testUser._id
        };

        CrmMessage.searchMessages = jest.fn().mockResolvedValue({
          messages: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/messages/search?q=${encodeURIComponent(searchTerm)}&threadId=${filters.threadId}&messageType=${filters.messageType}&senderId=${filters.senderId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessage.searchMessages).toHaveBeenCalledWith(searchTerm, filters);
      });

      it('should require search term', async () => {
        const response = await request(app)
          .get('/metrics/crm/messages/search')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });
    });

    describe('GET /metrics/crm/threads/search', () => {
      it('should search threads successfully', async () => {
        const searchTerm = 'test thread';

        CrmMessageThread.searchThreads = jest.fn().mockResolvedValue({
          threads: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/threads/search?q=${encodeURIComponent(searchTerm)}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmMessageThread.searchThreads).toHaveBeenCalledWith(searchTerm, {});
      });

      it('should support thread search filters', async () => {
        const searchTerm = 'test thread';
        const filters = {
          status: 'active',
          priority: 'high',
          entityType: 'contact'
        };

        CrmMessageThread.searchThreads = jest.fn().mockResolvedValue({
          threads: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/threads/search?q=${encodeURIComponent(searchTerm)}&status=${filters.status}&priority=${filters.priority}&entityType=${filters.entityType}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmMessageThread.searchThreads).toHaveBeenCalledWith(searchTerm, filters);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/metrics/crm/threads' },
        { method: 'post', path: '/metrics/crm/threads' },
        { method: 'get', path: '/metrics/crm/threads/thread123' },
        { method: 'get', path: '/metrics/crm/threads/thread123/messages' },
        { method: 'post', path: '/metrics/crm/threads/thread123/messages' },
        { method: 'get', path: '/metrics/crm/messages/message123' }
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
        .get('/metrics/crm/threads')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      CrmMessageThread.findActive = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/threads')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/metrics/crm/threads')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle concurrent message operations', async () => {
      const threadId = 'thread123';
      const messageData = {
        content: 'Concurrent message',
        messageType: 'text',
        senderRole: 'agent'
      };

      const mockMessage = {
        _id: 'message123',
        ...messageData,
        threadId,
        senderId: testUser._id,
        senderModel: 'User',
        status: 'sent',
        createdAt: new Date()
      };

      CrmMessage.create = jest.fn().mockResolvedValue(mockMessage);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .post(`/metrics/crm/threads/${threadId}/messages`)
          .set('Authorization', authToken)
          .send(messageData)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 201, 500]).toContain(response.status);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Mock minimal responses
      CrmMessageThread.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmMessageThread.countDocuments = jest.fn().mockResolvedValue(0);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/threads')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle large message lists efficiently', async () => {
      // Mock large dataset
      const largeMessageList = Array(1000).fill().map((_, i) => ({
        _id: `message${i}`,
        content: `Message ${i}`,
        messageType: 'text',
        status: 'sent'
      }));

