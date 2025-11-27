import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData } from '../helpers/metrics.test.helpers.js';
import CrmContact from '../../src/models/metrics/crm-contact.model.js';
import CrmMessage from '../../src/models/metrics/crm-message.model.js';
import CrmMessageThread from '../../src/models/metrics/crm-message-thread.model.js';
import CrmAssignment from '../../src/models/metrics/crm-assignment-metrics.model.js';
import CrmTemplate from '../../src/models/metrics/crm-template.model.js';
import CrmAutomation from '../../src/models/metrics/crm-automation.model.js';
import User from '../../src/models/user.model.js';

describe('CRM Workflows Integration Tests', () => {
  let testData;
  let authToken;
  let testUser;
  let testAgent;
  let testManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    
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

    // Create test users with different roles
    testManager = await User.create({
      name: 'Test Manager',
      email: 'manager@example.com',
      password: 'password123',
      role: 'manager'
    });

    testAgent = await User.create({
      name: 'Test Agent',
      email: 'agent@example.com',
      password: 'password123',
      role: 'agent'
    });

    testUser = await User.create({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });

    // Generate auth token (mock implementation)
    authToken = 'Bearer mock-jwt-token-for-testing';
  });

  afterEach(async () => {
    // Clean up collections between tests
    await Promise.all([
      User.deleteMany({}),
      CrmContact.deleteMany({}),
      CrmMessage.deleteMany({}),
      CrmMessageThread.deleteMany({}),
      CrmAssignment.deleteMany({}),
      CrmTemplate.deleteMany({}),
      CrmAutomation.deleteMany({})
    ]);
  });

  describe('End-to-End Contact Management Workflow', () => {
    it('should handle complete contact lifecycle from creation to conversion', async () => {
      // Step 1: Create a new contact
      const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        source: 'website',
        status: 'lead',
        tags: ['new-lead'],
        customFields: {
          company: 'Acme Corp',
          industry: 'Technology',
          budget: '50000-100000'
        }
      };

      const createContactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      expect(createContactResponse.body.success).toBe(true);
      const contact = createContactResponse.body.data;
      const contactId = contact._id;

      // Step 2: Update contact with additional information
      const updateData = {
        status: 'qualified',
        tags: ['qualified-lead', 'high-priority'],
        customFields: {
          ...contact.customFields,
          decisionMaker: true,
          timeline: '3-6 months'
        }
      };

      const updateResponse = await request(app)
        .put(`/metrics/crm/contacts/${contactId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('qualified');

      // Step 3: Create message thread for the contact
      const threadData = {
        contactId,
        subject: 'Initial consultation request',
        channel: 'email',
        priority: 'high',
        tags: ['consultation']
      };

      const createThreadResponse = await request(app)
        .post('/metrics/crm/messages/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      expect(createThreadResponse.body.success).toBe(true);
      const thread = createThreadResponse.body.data;
      const threadId = thread._id;

      // Step 4: Send initial message
      const messageData = {
        threadId,
        content: 'Hello John, I received your consultation request and would be happy to discuss your solar energy needs.',
        direction: 'outbound',
        channel: 'email',
        metadata: {
          templateId: 'welcome-template',
          variables: {
            firstName: 'John',
            company: 'Acme Corp'
          }
        }
      };

      const messageResponse = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send(messageData)
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Step 5: Assign contact to agent
      const assignmentData = {
        contactId,
        assignedTo: testAgent._id,
        priority: 'high',
        notes: 'High-value lead, prioritize follow-up'
      };

      const assignmentResponse = await request(app)
        .post('/metrics/crm/assignments')
        .set('Authorization', authToken)
        .send(assignmentData)
        .expect(201);

      expect(assignmentResponse.body.success).toBe(true);

      // Step 6: Update contact status to opportunity
      const opportunityData = {
        status: 'opportunity',
        tags: ['opportunity', 'in-negotiation'],
        customFields: {
          ...updateData.customFields,
          proposalSent: true,
          proposalAmount: 75000,
          closingDate: '2024-03-15'
        }
      };

      const opportunityResponse = await request(app)
        .put(`/metrics/crm/contacts/${contactId}`)
        .set('Authorization', authToken)
        .send(opportunityData)
        .expect(200);

      expect(opportunityResponse.body.success).toBe(true);
      expect(opportunityResponse.body.data.status).toBe('opportunity');

      // Step 7: Verify the complete workflow by checking contact details
      const finalContactResponse = await request(app)
        .get(`/metrics/crm/contacts/${contactId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(finalContactResponse.body.success).toBe(true);
      const finalContact = finalContactResponse.body.data.contact;
      
      expect(finalContact.status).toBe('opportunity');
      expect(finalContact.tags).toContain('opportunity');
      expect(finalContact.customFields.proposalSent).toBe(true);
      expect(finalContact.customFields.proposalAmount).toBe(75000);

      // Step 8: Verify metrics are updated
      const metricsResponse = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      const metrics = metricsResponse.body.data;
      expect(metrics.contacts.total).toBeGreaterThan(0);
      expect(metrics.contacts.byStatus.opportunity).toBeGreaterThan(0);
    });

    it('should handle contact engagement tracking throughout the lifecycle', async () => {
      // Create contact
      const contactData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        source: 'referral',
        status: 'lead'
      };

      const contactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      const contactId = contactResponse.body.data._id;

      // Track multiple engagement events
      const engagementEvents = [
        {
          type: 'email_opened',
          timestamp: new Date(),
          metadata: { campaignId: 'welcome-series' }
        },
        {
          type: 'website_visit',
          timestamp: new Date(),
          metadata: { page: '/pricing', duration: 120 }
        },
        {
          type: 'form_submission',
          timestamp: new Date(),
          metadata: { form: 'contact-us', source: 'landing-page' }
        },
        {
          type: 'email_clicked',
          timestamp: new Date(),
          metadata: { link: '/demo-request' }
        }
      ];

      // Add engagement events
      for (const event of engagementEvents) {
        const engagementResponse = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/engagement`)
          .set('Authorization', authToken)
          .send(event)
          .expect(200);

        expect(engagementResponse.body.success).toBe(true);
      }

      // Update engagement score
      const scoreResponse = await request(app)
        .post(`/metrics/crm/contacts/${contactId}/score`)
        .set('Authorization', authToken)
        .send({
          action: 'update',
          factors: {
            emailEngagement: 20,
            websiteActivity: 15,
            formInteractions: 25,
            overallEngagement: 60
          }
        })
        .expect(200);

      expect(scoreResponse.body.success).toBe(true);
      expect(scoreResponse.body.data.engagementScore).toBe(60);

      // Verify engagement history
      const engagementHistoryResponse = await request(app)
        .get(`/metrics/crm/contacts/${contactId}/engagement`)
        .set('Authorization', authToken)
        .expect(200);

      expect(engagementHistoryResponse.body.success).toBe(true);
      expect(engagementHistoryResponse.body.data.length).toBe(4);
    });
  });

  describe('Message Thread and Assignment Workflow', () => {
    it('should handle complete message thread lifecycle with assignments', async () => {
      // Create contact
      const contactData = {
        firstName: 'Robert',
        lastName: 'Johnson',
        email: 'robert.j@example.com',
        status: 'lead'
      };

      const contactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      const contactId = contactResponse.body.data._id;

      // Create message thread
      const threadData = {
        contactId,
        subject: 'Solar panel inquiry',
        channel: 'email',
        priority: 'medium'
      };

      const threadResponse = await request(app)
        .post('/metrics/crm/messages/threads')
        .set('Authorization', authToken)
        .send(threadData)
        .expect(201);

      const threadId = threadResponse.body.data._id;

      // Assign thread to agent
      const assignmentResponse = await request(app)
        .post('/metrics/crm/assignments')
        .set('Authorization', authToken)
        .send({
          threadId,
          assignedTo: testAgent._id,
          priority: 'medium',
          notes: 'Handle solar panel inquiry'
        })
        .expect(201);

      expect(assignmentResponse.body.success).toBe(true);

      // Send initial message
      const message1Response = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'Hi Robert, I received your inquiry about solar panels. How can I help you today?',
          direction: 'outbound',
          channel: 'email'
        })
        .expect(201);

      expect(message1Response.body.success).toBe(true);

      // Receive reply
      const message2Response = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'I\'m interested in learning about the cost and installation process for a 5kW system.',
          direction: 'inbound',
          channel: 'email'
        })
        .expect(201);

      expect(message2Response.body.success).toBe(true);

      // Send follow-up with template
      const templateResponse = await request(app)
        .post('/metrics/crm/templates')
        .set('Authorization', authToken)
        .send({
          name: 'Solar Information Template',
          category: 'information',
          channel: 'email',
          type: 'transactional',
          subject: 'Solar Panel Information',
          body: 'Here is the information you requested about our 5kW solar systems...',
          variables: [
            { name: 'customerName', type: 'string', required: true },
            { name: 'systemSize', type: 'string', required: true }
          ]
        })
        .expect(201);

      const templateId = templateResponse.body.data._id;

      const message3Response = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'Robert, here is the detailed information about our 5kW solar systems...',
          direction: 'outbound',
          channel: 'email',
          metadata: {
            templateId,
            variables: {
              customerName: 'Robert',
              systemSize: '5kW'
            }
          }
        })
        .expect(201);

      expect(message3Response.body.success).toBe(true);

      // Complete the assignment
      const completeResponse = await request(app)
        .post(`/metrics/crm/assignments/${assignmentResponse.body.data._id}/complete`)
        .set('Authorization', authToken)
        .send({
          resolution: 'successful',
          notes: 'Customer received solar panel information, follow-up scheduled'
        })
        .expect(200);

      expect(completeResponse.body.success).toBe(true);

      // Verify thread status
      const threadStatusResponse = await request(app)
        .get(`/metrics/crm/messages/threads/${threadId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(threadStatusResponse.body.success).toBe(true);
      expect(threadStatusResponse.body.data.status).toBe('completed');

      // Verify message count
      const messagesResponse = await request(app)
        .get(`/metrics/crm/messages/threads/${threadId}/messages`)
        .set('Authorization', authToken)
        .expect(200);

      expect(messagesResponse.body.success).toBe(true);
      expect(messagesResponse.body.data.length).toBe(3);
    });
  });

  describe('Template and Automation Workflow', () => {
    it('should handle template creation, approval, and automation integration', async () => {
      // Step 1: Create template
      const templateData = {
        name: 'Welcome Series Email 1',
        description: 'First email in welcome series for new leads',
        category: 'onboarding',
        channel: 'email',
        type: 'marketing',
        subject: 'Welcome to Boosty Solar!',
        body: 'Hello {{firstName}}, welcome to Boosty Solar! We\'re excited to help you with your solar energy journey.',
        htmlBody: '<h1>Welcome {{firstName}}!</h1><p>Welcome to Boosty Solar!</p>',
        textBody: 'Welcome {{firstName}}! Welcome to Boosty Solar!',
        variables: [
          { name: 'firstName', type: 'string', required: true, description: 'Customer first name' },
          { name: 'company', type: 'string', required: false, description: 'Customer company' }
        ],
        tags: ['welcome', 'onboarding']
      };

      const templateResponse = await request(app)
        .post('/metrics/crm/templates')
        .set('Authorization', authToken)
        .send(templateData)
        .expect(201);

      expect(templateResponse.body.success).toBe(true);
      const templateId = templateResponse.body.data._id;

      // Step 2: Submit template for approval
      const submitResponse = await request(app)
        .post(`/metrics/crm/templates/${templateId}/submit`)
        .set('Authorization', authToken)
        .send({
          notes: 'Ready for review - standard welcome email template'
        })
        .expect(200);

      expect(submitResponse.body.success).toBe(true);

      // Step 3: Approve template
      const approveResponse = await request(app)
        .post(`/metrics/crm/templates/${templateId}/approve`)
        .set('Authorization', authToken)
        .send({
          notes: 'Approved for production use'
        })
        .expect(200);

      expect(approveResponse.body.success).toBe(true);

      // Step 4: Create automation using the template
      const automationData = {
        name: 'New Lead Welcome Automation',
        description: 'Sends welcome email to new leads',
        category: 'onboarding',
        priority: 'high',
        triggers: [
          {
            type: 'contact_created',
            conditions: [
              { field: 'status', operator: 'equals', value: 'lead' },
              { field: 'source', operator: 'in', value: ['website', 'referral'] }
            ],
            delay: 0
          }
        ],
        actions: [
          {
            type: 'send_email',
            config: {
              templateId,
              variables: {
                firstName: '{{contact.firstName}}',
                company: '{{contact.company}}'
              }
            },
            delay: 0
          }
        ],
        conditions: [
          {
            type: 'and',
            rules: [
              { field: 'contact.email', operator: 'exists', value: true },
              { field: 'contact.doNotEmail', operator: 'equals', value: false }
            ]
          }
        ],
        tags: ['onboarding', 'welcome']
      };

      const automationResponse = await request(app)
        .post('/metrics/crm/automations')
        .set('Authorization', authToken)
        .send(automationData)
        .expect(201);

      expect(automationResponse.body.success).toBe(true);
      const automationId = automationResponse.body.data._id;

      // Step 5: Test the automation
      const testResponse = await request(app)
        .post(`/metrics/crm/automations/${automationId}/test`)
        .set('Authorization', authToken)
        .send({
          testContact: {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            status: 'lead',
            source: 'website',
            company: 'Test Corp'
          },
          testMode: 'dry_run'
        })
        .expect(200);

      expect(testResponse.body.success).toBe(true);
      expect(testResponse.body.data.status).toBe('success');

      // Step 6: Activate the automation
      const activateResponse = await request(app)
        .post(`/metrics/crm/automations/${automationId}/activate`)
        .set('Authorization', authToken)
        .expect(200);

      expect(activateResponse.body.success).toBe(true);

      // Step 7: Create a new contact to trigger the automation
      const contactData = {
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.w@example.com',
        status: 'lead',
        source: 'website',
        company: 'Williams Industries'
      };

      const contactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      expect(contactResponse.body.success).toBe(true);

      // Step 8: Check automation execution history
      const executionResponse = await request(app)
        .get(`/metrics/crm/automations/${automationId}/executions`)
        .set('Authorization', authToken)
        .expect(200);

      expect(executionResponse.body.success).toBe(true);
      expect(executionResponse.body.data.length).toBeGreaterThan(0);

      // Step 9: Verify template usage metrics
      const templateMetricsResponse = await request(app)
        .get(`/metrics/crm/templates/${templateId}/performance`)
        .set('Authorization', authToken)
        .expect(200);

      expect(templateMetricsResponse.body.success).toBe(true);
      expect(templateMetricsResponse.body.data.totalSent).toBeGreaterThan(0);
    });
  });

  describe('Cross-Module Integration Workflow', () => {
    it('should handle complex workflow involving contacts, messages, assignments, templates, and automation', async () => {
      // Step 1: Create multiple templates for different stages
      const templates = [
        {
          name: 'Initial Contact Template',
          category: 'initial',
          subject: 'Thank you for your interest',
          body: 'Thank you {{firstName}} for your interest in solar energy.',
          variables: [{ name: 'firstName', type: 'string', required: true }]
        },
        {
          name: 'Follow-up Template',
          category: 'followup',
          subject: 'Following up on your solar inquiry',
          body: 'Hi {{firstName}}, just following up on your solar energy inquiry.',
          variables: [{ name: 'firstName', type: 'string', required: true }]
        },
        {
          name: 'Proposal Template',
          category: 'proposal',
          subject: 'Your solar proposal is ready',
          body: 'Hi {{firstName}}, your custom solar proposal is ready for review.',
          variables: [{ name: 'firstName', type: 'string', required: true }]
        }
      ];

      const createdTemplates = [];
      for (const templateData of templates) {
        const templateResponse = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(templateData)
          .expect(201);

        createdTemplates.push(templateResponse.body.data);
      }

      // Step 2: Create automation rules for each stage
      const automations = [
        {
          name: 'Initial Response Automation',
          category: 'initial',
          triggers: [{ type: 'contact_created', conditions: [], delay: 0 }],
          actions: [{
            type: 'send_email',
            config: { templateId: createdTemplates[0]._id },
            delay: 0
          }]
        },
        {
          name: 'Follow-up Automation',
          category: 'followup',
          triggers: [{ type: 'contact_updated', conditions: [], delay: 86400 }],
          actions: [{
            type: 'send_email',
            config: { templateId: createdTemplates[1]._id },
            delay: 0
          }]
        }
      ];

      const createdAutomations = [];
      for (const automationData of automations) {
        const automationResponse = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(automationData)
          .expect(201);

        createdAutomations.push(automationResponse.body.data);
      }

      // Step 3: Activate all automations
      for (const automation of createdAutomations) {
        await request(app)
          .post(`/metrics/crm/automations/${automation._id}/activate`)
          .set('Authorization', authToken)
          .expect(200);
      }

      // Step 4: Create multiple contacts to trigger workflows
      const contacts = [
        { firstName: 'Alice', lastName: 'Brown', email: 'alice@example.com', status: 'lead' },
        { firstName: 'Bob', lastName: 'Davis', email: 'bob@example.com', status: 'lead' },
        { firstName: 'Carol', lastName: 'Wilson', email: 'carol@example.com', status: 'lead' }
      ];

      const createdContacts = [];
      for (const contactData of contacts) {
        const contactResponse = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(contactData)
          .expect(201);

        createdContacts.push(contactResponse.body.data);
      }

      // Step 5: Create message threads and assignments for each contact
      for (const contact of createdContacts) {
        // Create thread
        const threadResponse = await request(app)
          .post('/metrics/crm/messages/threads')
          .set('Authorization', authToken)
          .send({
            contactId: contact._id,
            subject: `Solar inquiry from ${contact.firstName}`,
            channel: 'email',
            priority: 'medium'
          })
          .expect(201);

        // Assign to agent
        await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send({
            contactId: contact._id,
            threadId: threadResponse.body.data._id,
            assignedTo: testAgent._id,
            priority: 'medium'
          })
          .expect(201);
      }

      // Step 6: Simulate progress through pipeline
      for (let i = 0; i < createdContacts.length; i++) {
        const contact = createdContacts[i];
        
        // Update to qualified
        await request(app)
          .put(`/metrics/crm/contacts/${contact._id}`)
          .set('Authorization', authToken)
          .send({
            status: 'qualified',
            tags: ['qualified-lead'],
            engagementScore: 60 + (i * 10)
          })
          .expect(200);

        // Update to opportunity for first contact
        if (i === 0) {
          await request(app)
            .put(`/metrics/crm/contacts/${contact._id}`)
            .set('Authorization', authToken)
            .send({
              status: 'opportunity',
              tags: ['opportunity', 'high-value'],
              customFields: {
                proposalAmount: 50000 + (i * 10000),
                closingDate: '2024-03-15'
              }
            })
            .expect(200);
        }
      }

      // Step 7: Verify comprehensive metrics
      const metricsResponse = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      const metrics = metricsResponse.body.data;

      expect(metrics.contacts.total).toBe(3);
      expect(metrics.contacts.byStatus.lead).toBe(2);
      expect(metrics.contacts.byStatus.qualified).toBe(1);
      expect(metrics.contacts.byStatus.opportunity).toBe(1);

      expect(metrics.messages.totalThreads).toBe(3);
      expect(metrics.assignments.active).toBe(3);

      expect(metrics.templates.total).toBe(3);
      expect(metrics.automations.active).toBe(2);

      // Step 8: Verify agent workload
      const workloadResponse = await request(app)
        .get(`/metrics/crm/assignments/workload/${testAgent._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(workloadResponse.body.success).toBe(true);
      expect(workloadResponse.body.data.totalAssignments).toBe(3);

      // Step 9: Verify template performance
      for (const template of createdTemplates) {
        const templatePerformanceResponse = await request(app)
          .get(`/metrics/crm/templates/${template._id}/performance`)
          .set('Authorization', authToken)
          .expect(200);

        expect(templatePerformanceResponse.body.success).toBe(true);
      }

      // Step 10: Verify automation execution
      for (const automation of createdAutomations) {
        const automationExecutionsResponse = await request(app)
          .get(`/metrics/crm/automations/${automation._id}/executions`)
          .set('Authorization', authToken)
          .expect(200);

        expect(automationExecutionsResponse.body.success).toBe(true);
      }
    });
  });

  describe('Error Handling and Recovery Workflow', () => {
    it('should handle errors gracefully and maintain data consistency', async () => {
      // Create contact
      const contactData = {
        firstName: 'Error Test',
        lastName: 'User',
        email: 'error@example.com',
        status: 'lead'
      };

      const contactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      const contactId = contactResponse.body.data._id;

      // Try to create message thread with invalid data
      const invalidThreadResponse = await request(app)
        .post('/metrics/crm/messages/threads')
        .set('Authorization', authToken)
        .send({
          contactId: 'invalid-contact-id',
          subject: 'Test Thread',
          channel: 'invalid-channel'
        })
        .expect(400);

      expect(invalidThreadResponse.body.success).toBe(false);

      // Verify contact still exists and is unchanged
      const verifyContactResponse = await request(app)
        .get(`/metrics/crm/contacts/${contactId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(verifyContactResponse.body.success).toBe(true);
      expect(verifyContactResponse.body.data.contact.firstName).toBe('Error Test');

      // Create valid thread
      const validThreadResponse = await request(app)
        .post('/metrics/crm/messages/threads')
        .set('Authorization', authToken)
        .send({
          contactId,
          subject: 'Valid Test Thread',
          channel: 'email'
        })
        .expect(201);

      const threadId = validThreadResponse.body.data._id;

      // Try to send message with invalid template
      const invalidMessageResponse = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'Test message',
          direction: 'outbound',
          channel: 'email',
          metadata: {
            templateId: 'invalid-template-id'
          }
        })
        .expect(400);

      expect(invalidMessageResponse.body.success).toBe(false);

      // Verify thread still exists
      const verifyThreadResponse = await request(app)
        .get(`/metrics/crm/messages/threads/${threadId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(verifyThreadResponse.body.success).toBe(true);

      // Send valid message
      const validMessageResponse = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'Valid test message',
          direction: 'outbound',
          channel: 'email'
        })
        .expect(201);

      expect(validMessageResponse.body.success).toBe(true);

      // Verify overall system consistency
      const metricsResponse = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data.contacts.total).toBe(1);
      expect(metricsResponse.body.data.messages.totalThreads).toBe(1);
      expect(metricsResponse.body.data.messages.totalMessages).toBe(1);
    });
  });

  describe('Performance and Scalability Workflow', () => {
    it('should handle high-volume operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple contacts in batch
      const contacts = Array(50).fill().map((_, i) => ({
        firstName: `User${i}`,
        lastName: `Test${i}`,
        email: `user${i}@example.com`,
        status: 'lead',
        source: 'bulk-import'
      }));

      const createdContacts = [];
      for (const contactData of contacts) {
        const contactResponse = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(contactData)
          .expect(201);

        createdContacts.push(contactResponse.body.data);
      }

      expect(createdContacts.length).toBe(50);

      // Create threads and assignments in batch
      for (const contact of createdContacts) {
        // Create thread
        const threadResponse = await request(app)
          .post('/metrics/crm/messages/threads')
          .set('Authorization', authToken)
          .send({
            contactId: contact._id,
            subject: `Bulk thread for ${contact.firstName}`,
            channel: 'email',
            priority: 'low'
          })
          .expect(201);

        // Create assignment
        await request(app)
          .post('/metrics/crm/assignments')
          .set('Authorization', authToken)
          .send({
            contactId: contact._id,
            threadId: threadResponse.body.data._id,
            assignedTo: testAgent._id,
            priority: 'low'
          })
          .expect(201);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      // Verify all data was created correctly
      const metricsResponse = await request(app)
        .get('/metrics/crm/metrics')
        .set('Authorization', authToken)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data.contacts.total).toBe(50);
      expect(metricsResponse.body.data.messages.totalThreads).toBe(50);
      expect(metricsResponse.body.data.assignments.active).toBe(50);

      // Test pagination performance
      const paginatedResponse = await request(app)
        .get('/metrics/crm/contacts?page=1&limit=20')
        .set('Authorization', authToken)
        .expect(200);

      expect(paginatedResponse.body.success).toBe(true);
      expect(paginatedResponse.body.data.length).toBe(20);
      expect(paginatedResponse.body.pagination.total).toBe(50);
    });
  });

  describe('Real-time Updates and Notifications Workflow', () => {
    it('should handle real-time updates across modules', async () => {
      // Create contact
      const contactData = {
        firstName: 'Real-time',
        lastName: 'Test',
        email: 'realtime@example.com',
        status: 'lead'
      };

      const contactResponse = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      const contactId = contactResponse.body.data._id;

      // Create thread
      const threadResponse = await request(app)
        .post('/metrics/crm/messages/threads')
        .set('Authorization', authToken)
        .send({
          contactId,
          subject: 'Real-time test thread',
          channel: 'email'
        })
        .expect(201);

      const threadId = threadResponse.body.data._id;

      // Create assignment
      const assignmentResponse = await request(app)
        .post('/metrics/crm/assignments')
        .set('Authorization', authToken)
        .send({
          contactId,
          threadId,
          assignedTo: testAgent._id,
          priority: 'high'
        })
        .expect(201);

      const assignmentId = assignmentResponse.body.data._id;

      // Send message
      const messageResponse = await request(app)
        .post('/metrics/crm/messages')
        .set('Authorization', authToken)
        .send({
          threadId,
          content: 'Real-time test message',
          direction: 'outbound',
          channel: 'email'
        })
        .expect(201);

      // Update contact status
      await request(app)
        .put(`/metrics/crm/contacts/${contactId}`)
        .set('Authorization', authToken)
        .send({
          status: 'qualified',
          engagementScore: 75
        })
        .expect(200);

      // Complete assignment
      await request(app)
        .post(`/metrics/crm/assignments/${assignmentId}/complete`)
        .set('Authorization', authToken)
        .send({
          resolution: 'successful',
          notes: 'Contact qualified successfully'
        })
        .expect(200);

      // Verify real-time metrics reflect all changes
      const realTimeResponse = await request(app)
        .get('/metrics/crm/metrics/real-time')
        .set('Authorization', authToken)
        .expect(200);

      expect(realTimeResponse.body.success).toBe(true);
      const realTimeData = realTimeResponse.body.data;

      expect(realTimeData.contacts.total).toBe(1);
      expect(realTimeData.contacts.byStatus.qualified).toBe(1);
      expect(realTimeData.messages.totalThreads).toBe(1);
      expect(realTimeData.messages.totalMessages).toBe(1);
      expect(realTimeData.assignments.completed).toBe(1);
      expect(realTimeData.assignments.active).toBe(0);
    });
  });
});