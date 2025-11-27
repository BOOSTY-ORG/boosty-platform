const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../src/express.js');
const { createTestData } = require('../helpers/metrics.test.helpers.js');
const CrmMessageThread = require('../../src/models/metrics/crm-message-thread.model.js');
const CrmMessage = require('../../src/models/metrics/crm-message.model.js');
const CrmAssignmentMetrics = require('../../src/models/metrics/crm-assignment-metrics.model.js');
const User = require('../../src/models/user.model.js');

describe('CRM Messaging Integration Tests', () => {
  let testData;
  let authToken;
  let testUser;
  let testThread;
  let testMessage;
  let testAssignment;

  beforeEach(async () => {
    jest.clearAllMocks();
    testData = await createTestData({ users: 3 });
    
    // Create a test user for authentication
    testUser = await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
      role: 'analyst'
    });

    // Get auth token (mock authentication for tests)
    authToken = 'Bearer mock-jwt-token';
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    
    // Clean up created data
    if (testMessage) {
      await CrmMessage.deleteMany({ _id: testMessage._id });
    }
    if (testThread) {
      await CrmMessageThread.deleteMany({ _id: testThread._id });
    }
    if (testAssignment) {
      await CrmAssignmentMetrics.deleteMany({ _id: testAssignment._id });
    }
    if (testUser) {
      await User.deleteMany({ _id: testUser._id });
    }
  });

  describe('Complete Message Thread Flow', () => {
    it('should create thread, send messages, assign, and close successfully', async () => {
      // Step 1: Create a message thread
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Customer Support Inquiry',
        priority: 'high',
        primaryChannel: 'in_app',
        tags: ['support', 'urgent']
      };

      const createThreadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      expect(createThreadResponse.body.success).toBe(true);
      expect(createThreadResponse.body.data.subject).toBe(threadData.subject);
      expect(createThreadResponse.body.data.priority).toBe(threadData.priority);
      
      testThread = createThreadResponse.body.data;

      // Step 2: Verify thread appears in thread list
      const threadsResponse = await request(app)
        .get('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .expect(200);

      expect(threadsResponse.body.success).toBe(true);
      expect(threadsResponse.body.data.data).toHaveLength(1);
      expect(threadsResponse.body.data.data[0].threadId).toBe(testThread.threadId);

      // Step 3: Send first message
      const firstMessageData = {
        content: 'Hello, I need help with my solar installation',
        messageType: 'text',
        deliveryChannels: ['in_app']
      };

      const firstMessageResponse = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .send(firstMessageData)
        .expect(201);

      expect(firstMessageResponse.body.success).toBe(true);
      expect(firstMessageResponse.body.data.content).toBe(firstMessageData.content);
      
      testMessage = firstMessageResponse.body.data;

      // Step 4: Send reply message
      const replyMessageData = {
        content: 'I understand your issue. Let me help you with that.',
        messageType: 'text',
        replyTo: testMessage._id,
        deliveryChannels: ['in_app']
      };

      const replyMessageResponse = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .send(replyMessageData)
        .expect(201);

      expect(replyMessageResponse.body.success).toBe(true);
      expect(replyMessageResponse.body.data.replyTo).toBe(testMessage._id);

      // Step 5: Assign thread to agent
      const assignmentData = {
        agentId: testUser._id,
        assignmentType: 'manual',
        assignmentReason: 'High priority customer'
      };

      const assignResponse = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/assign`)
        .set('Authorization', authToken)
        .send(assignmentData)
        .expect(200);

      expect(assignResponse.body.success).toBe(true);
      expect(assignResponse.body.data.assignedAgent._id).toBe(testUser._id);

      // Step 6: Verify assignment metrics
      const assignmentsResponse = await request(app)
        .get('/api/metrics/crm/assignments/list')
        .set('Authorization', authToken)
        .expect(200);

      expect(assignmentsResponse.body.success).toBe(true);
      expect(assignmentsResponse.body.data.data.length).toBeGreaterThan(0);
      
      const assignment = assignmentsResponse.body.data.data.find(a => a.entityId === testThread._id);
      expect(assignment).toBeDefined();
      expect(assignment.agentId).toBe(testUser._id);
      testAssignment = assignment;

      // Step 7: Get thread messages
      const messagesResponse = await request(app)
        .get(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .expect(200);

      expect(messagesResponse.body.success).toBe(true);
      expect(messagesResponse.body.data.data).toHaveLength(2);
      expect(messagesResponse.body.data.data[0].content).toBe(firstMessageData.content);
      expect(messagesResponse.body.data.data[1].content).toBe(replyMessageData.content);

      // Step 8: Mark message as read
      const markReadResponse = await request(app)
        .post(`/api/metrics/crm/messages/${testMessage._id}/read`)
        .set('Authorization', authToken)
        .expect(200);

      expect(markReadResponse.body.success).toBe(true);
      expect(markReadResponse.body.data.status).toBe('read');

      // Step 9: Close thread
      const closeData = {
        reason: 'Issue resolved',
        satisfactionScore: 5
      };

      const closeResponse = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/close`)
        .set('Authorization', authToken)
        .send(closeData)
        .expect(200);

      expect(closeResponse.body.success).toBe(true);
      expect(closeResponse.body.data.status).toBe('closed');

      // Step 10: Verify assignment completion
      const updatedAssignmentResponse = await request(app)
        .get(`/api/metrics/crm/assignments/${testAssignment._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(updatedAssignmentResponse.body.success).toBe(true);
      expect(updatedAssignmentResponse.body.data.status).toBe('completed');
      expect(updatedAssignmentResponse.body.data.completionReason).toBe('closed');
    });

    it('should handle message thread with attachments', async () => {
      // Create thread with attachment support
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Document Sharing Thread',
        priority: 'medium'
      };

      const threadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      testThread = threadResponse.body.data;

      // Send message with attachments
      const messageData = {
        content: 'Please find the attached documents',
        messageType: 'text',
        attachments: [
          {
            name: 'solar_specifications.pdf',
            type: 'application/pdf',
            size: 2048576,
            url: 'https://example.com/solar_specifications.pdf',
            contentType: 'application/pdf'
          },
          {
            name: 'installation_photo.jpg',
            type: 'image/jpeg',
            size: 1024000,
            url: 'https://example.com/installation_photo.jpg',
            contentType: 'image/jpeg'
          }
        ],
        deliveryChannels: ['in_app']
      };

      const messageResponse = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .send(messageData)
        .expect(201);

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data.attachments).toHaveLength(2);
      expect(messageResponse.body.data.attachments[0].name).toBe('solar_specifications.pdf');
      expect(messageResponse.body.data.attachments[1].name).toBe('installation_photo.jpg');
    });

    it('should handle message search functionality', async () => {
      // Create multiple threads and messages for search testing
      const threads = [];
      for (let i = 0; i < 3; i++) {
        const threadData = {
          threadType: 'direct',
          participants: [
            { userId: testUser._id, role: 'agent' },
            { contactId: testData.contacts[i % testData.contacts.length]._id, role: 'contact' }
          ],
          subject: `Search Test Thread ${i + 1}`,
          priority: 'medium'
        };

        const threadResponse = await request(app)
          .post('/api/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(threadData)
          .expect(201);

        threads.push(threadResponse.body.data);

        // Add messages to each thread
        const messageData = {
          content: `This is message ${i + 1} about solar panel installation`,
          messageType: 'text',
          deliveryChannels: ['in_app']
        };

        await request(app)
          .post(`/api/metrics/crm/threads/${threadResponse.body.data._id}/messages`)
          .set('Authorization', authToken)
          .send(messageData)
          .expect(201);
      }

      // Search for messages
      const searchResponse = await request(app)
        .get('/api/metrics/crm/messages/search?q=solar')
        .set('Authorization', authToken)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.data.length).toBeGreaterThan(0);
      expect(searchResponse.body.data.query).toBe('solar');

      // Verify search results contain relevant messages
      const searchResults = searchResponse.body.data.data;
      searchResults.forEach(result => {
        expect(result.content).toContain('solar');
      });
    });
  });

  describe('Assignment Metrics Integration', () => {
    it('should track assignment lifecycle correctly', async () => {
      // Create thread
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Assignment Test Thread',
        priority: 'high'
      };

      const threadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      testThread = threadResponse.body.data;

      // Create assignment
      const assignmentData = {
        agentId: testUser._id,
        entityType: 'thread',
        entityId: testThread._id,
        assignmentType: 'manual',
        assignmentReason: 'Test assignment',
        priority: 'high'
      };

      const assignmentResponse = await request(app)
        .post('/api/metrics/crm/assignments')
        .set('Authorization', authToken)
        .send(assignmentData)
        .expect(201);

      expect(assignmentResponse.body.success).toBe(true);
      testAssignment = assignmentResponse.body.data;

      // Update assignment metrics
      const metricsData = {
        firstResponseTime: 300, // 5 minutes
        averageResponseTime: 600, // 10 minutes
        totalMessages: 5,
        totalInteractions: 8,
        workloadScore: 75,
        capacityUtilization: 80
      };

      const updateResponse = await request(app)
        .put(`/api/metrics/crm/assignments/${testAssignment._id}/metrics`)
        .set('Authorization', authToken)
        .send(metricsData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.firstResponseTime).toBe(300);
      expect(updateResponse.body.data.workloadScore).toBe(75);

      // Get agent workload
      const workloadResponse = await request(app)
        .get(`/api/metrics/crm/assignments/agent/${testUser._id}/workload`)
        .set('Authorization', authToken)
        .expect(200);

      expect(workloadResponse.body.success).toBe(true);
      expect(workloadResponse.body.data.agentId).toBe(testUser._id);

      // Transfer assignment
      const transferData = {
        toAgentId: testData.users[1]._id,
        reason: 'Workload balancing',
        priority: 'medium'
      };

      const transferResponse = await request(app)
        .post(`/api/metrics/crm/assignments/${testAssignment._id}/transfer`)
        .set('Authorization', authToken)
        .send(transferData)
        .expect(200);

      expect(transferResponse.body.success).toBe(true);
      expect(transferResponse.body.data.agentId).toBe(testData.users[1]._id);

      // Complete assignment
      const completionData = {
        completionReason: 'resolved',
        satisfactionScore: 4,
        notes: 'Customer satisfied with resolution'
      };

      const completeResponse = await request(app)
        .post(`/api/metrics/crm/assignments/${testAssignment._id}/complete`)
        .set('Authorization', authToken)
        .send(completionData)
        .expect(200);

      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.status).toBe('completed');
      expect(completeResponse.body.data.completionReason).toBe('resolved');
    });

    it('should calculate comprehensive assignment metrics', async () => {
      // Create multiple assignments for metrics testing
      const assignments = [];
      for (let i = 0; i < 5; i++) {
        const threadData = {
          threadType: 'direct',
          participants: [
            { userId: testData.users[i]._id, role: 'agent' },
            { contactId: testData.contacts[i % testData.contacts.length]._id, role: 'contact' }
          ],
          subject: `Metrics Test Thread ${i + 1}`,
          priority: ['low', 'medium', 'high', 'urgent'][i % 4]
        };

        const threadResponse = await request(app)
          .post('/api/metrics/crm/threads')
          .set('Authorization', authToken)
          .send(threadData)
          .expect(201);

        const assignmentData = {
          agentId: testData.users[i]._id,
          entityType: 'thread',
          entityId: threadResponse.body.data._id,
          assignmentType: ['manual', 'automatic', 'round_robin', 'workload_based'][i % 4],
          priority: threadData.priority
        };

        const assignmentResponse = await request(app)
          .post('/api/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(201);

        assignments.push(assignmentResponse.body.data);
      }

      // Get comprehensive metrics
      const metricsResponse = await request(app)
        .get('/api/metrics/crm/assignments')
        .set('Authorization', authToken)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      
      const { summary, breakdowns, performance, alerts } = metricsResponse.body.data;
      
      // Verify summary metrics
      expect(summary.totalAssignments).toBeGreaterThanOrEqual(5);
      expect(summary.activeAssignments).toBeGreaterThanOrEqual(5);
      expect(summary.averageFirstResponseTime).toBeDefined();
      expect(summary.averageResolutionTime).toBeDefined();
      expect(summary.slaComplianceRate).toBeDefined();

      // Verify breakdowns
      expect(breakdowns.byAgent).toBeDefined();
      expect(breakdowns.byEntityType).toBeDefined();
      expect(breakdowns.byStatus).toBeDefined();
      expect(breakdowns.byPriority).toBeDefined();
      expect(breakdowns.byAssignmentType).toBeDefined();

      // Verify performance metrics
      expect(performance).toBeDefined();
      expect(performance.averageFirstResponseTime).toBeDefined();
      expect(performance.averageResolutionTime).toBeDefined();

      // Verify alerts
      expect(alerts).toBeDefined();
      expect(alerts.overdueAssignments).toBeDefined();
      expect(alerts.escalatedAssignments).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unauthorized access attempts', async () => {
      // Try to access endpoints without authentication
      const response = await request(app)
        .get('/api/metrics/crm/threads')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid thread operations', async () => {
      // Try to send message to non-existent thread
      const response = await request(app)
        .post('/api/metrics/crm/threads/nonexistent/messages')
        .set('Authorization', authToken)
        .send({ content: 'Test message' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('THREAD_NOT_FOUND');
    });

    it('should handle concurrent operations safely', async () => {
      // Create thread
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Concurrency Test Thread'
      };

      const threadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      testThread = threadResponse.body.data;

      // Send multiple messages concurrently
      const messagePromises = Array(5).fill().map((_, i) => 
        request(app)
          .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
          .set('Authorization', authToken)
          .send({
            content: `Concurrent message ${i + 1}`,
            messageType: 'text',
            deliveryChannels: ['in_app']
          })
      );

      const responses = await Promise.all(messagePromises);
      
      // All messages should be created successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all messages are in the thread
      const messagesResponse = await request(app)
        .get(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .expect(200);

      expect(messagesResponse.body.data.data).toHaveLength(5);
    });

    it('should handle large message content', async () => {
      // Create thread
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Large Content Test'
      };

      const threadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      testThread = threadResponse.body.data;

      // Send message with large content (near limit)
      const largeContent = 'A'.repeat(9999); // Just under 10000 character limit
      const messageData = {
        content: largeContent,
        messageType: 'text',
        deliveryChannels: ['in_app']
      };

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(largeContent);
    });

    it('should reject oversized message content', async () => {
      // Create thread
      const threadData = {
        threadType: 'direct',
        participants: [
          { userId: testUser._id, role: 'agent' },
          { contactId: testData.contacts[0]._id, role: 'contact' }
        ],
        subject: 'Oversized Content Test'
      };

      const threadResponse = await request(app)
        .post('/api/metrics/crm/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      testThread = threadResponse.body.data;

      // Try to send message with oversized content
      const oversizedContent = 'A'.repeat(10001); // Over 10000 character limit
      const messageData = {
        content: oversizedContent,
        messageType: 'text',
        deliveryChannels: ['in_app']
      };

      const response = await request(app)
        .post(`/api/metrics/crm/threads/${testThread._id}/messages`)
        .set('Authorization', authToken)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});