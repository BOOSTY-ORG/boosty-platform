import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData } from '../helpers/metrics.test.helpers.js';
import User from '../../src/models/user.model.js';
import CrmContact from '../../src/models/metrics/crm-contact.model.js';
import CrmCommunication from '../../src/models/metrics/crm-communication.model.js';
import CrmTemplate from '../../src/models/metrics/crm-template.model.js';
import CrmAutomation from '../../src/models/metrics/crm-automation.model.js';
import Communication from '../../src/models/communication.model.js';

describe('CRM API Integration Tests', () => {
  let testData;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });

  afterAll(async () => {
    // Cleanup test database
    await teardownTestDatabase();
  });

  beforeEach(async () => {
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
      Communication.deleteMany({})
    ]);
  });

  describe('CRM Overview and Health', () => {
    it('should return CRM system overview', async () => {
      // Create some CRM data first
      await createCRMTestData();

      const response = await request(app)
        .get('/metrics/crm')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.modules).toBeDefined();
      
      // Verify summary metrics
      expect(response.body.data.summary.totalContacts).toBeDefined();
      expect(response.body.data.summary.totalCommunications).toBeDefined();
      expect(response.body.data.summary.activeAutomations).toBeDefined();
      expect(response.body.data.summary.approvedTemplates).toBeDefined();
      
      // Verify module information
      expect(response.body.data.modules.communications).toBeDefined();
      expect(response.body.data.modules.contacts).toBeDefined();
      expect(response.body.data.modules.templates).toBeDefined();
      expect(response.body.data.modules.automations).toBeDefined();
    });

    it('should return CRM health check', async () => {
      const response = await request(app)
        .get('/metrics/crm/health')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('crm-api');
      expect(response.body.modules).toBeDefined();
      expect(response.body.modules.communications).toBe('active');
      expect(response.body.modules.contacts).toBe('active');
      expect(response.body.modules.templates).toBe('active');
      expect(response.body.modules.automations).toBe('active');
    });
  });

  describe('CRM Communications', () => {
    beforeEach(async () => {
      await createCRMTestData();
    });

    it('should return communication metrics', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
      expect(response.body.data.alerts).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
    });

    it('should return paginated communications list', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications/list')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should handle pagination parameters correctly', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications/list?page=1&limit=5')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should search communications', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications/search?q=test')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should create a new communication', async () => {
      const communicationData = {
        communicationId: 'test-comm-001',
        entityType: 'contact',
        entityId: testData.contacts[0]._id,
        interactionType: 'outbound',
        channel: 'email',
        direction: 'outbound',
        content: 'Test communication content',
        agentId: testUser._id
      };

      const response = await request(app)
        .post('/metrics/crm/communications')
        .set('Authorization', authToken)
        .send(communicationData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.communicationId).toBe(communicationData.communicationId);
      expect(response.body.data.entityType).toBe(communicationData.entityType);
    });

    it('should update a communication', async () => {
      const communication = await CrmCommunication.findOne();
      
      const updateData = {
        followUpRequired: true,
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        followUpNotes: 'Test follow-up notes'
      };

      const response = await request(app)
        .put(`/metrics/crm/communications/${communication._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.followUpRequired).toBe(true);
      expect(response.body.data.followUpNotes).toBe(updateData.followUpNotes);
    });

    it('should delete a communication (soft delete)', async () => {
      const communication = await CrmCommunication.findOne();

      const response = await request(app)
        .delete(`/metrics/crm/communications/${communication._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      
      // Verify soft delete
      const deletedCommunication = await CrmCommunication.findById(communication._id);
      expect(deletedCommunication.deleted).toBe(true);
      expect(deletedCommunication.deletedAt).toBeDefined();
    });

    it('should mark response as received', async () => {
      const communication = await CrmCommunication.findOne();

      const response = await request(app)
        .post(`/metrics/crm/communications/${communication._id}/response-received`)
        .set('Authorization', authToken)
        .send({ responseDate: new Date() })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.responseReceived).toBe(true);
      expect(response.body.data.responseReceivedAt).toBeDefined();
    });

    it('should add follow-up to communication', async () => {
      const communication = await CrmCommunication.findOne();
      const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post(`/metrics/crm/communications/${communication._id}/follow-up`)
        .set('Authorization', authToken)
        .send({ 
          followUpDate: followUpDate.toISOString(),
          notes: 'Test follow-up notes'
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.followUpRequired).toBe(true);
      expect(response.body.data.followUpNotes).toBe('Test follow-up notes');
    });

    it('should complete follow-up', async () => {
      const communication = await CrmCommunication.findOne();
      await communication.addFollowUp(new Date(), 'Test follow-up');

      const response = await request(app)
        .post(`/metrics/crm/communications/${communication._id}/follow-up/complete`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.followUpRequired).toBe(false);
    });

    it('should get communications by entity', async () => {
      const communication = await CrmCommunication.findOne();

      const response = await request(app)
        .get(`/metrics/crm/communications/entity/${communication.entityType}/${communication.entityId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get overdue responses', async () => {
      // Create an overdue response
      const communication = await CrmCommunication.findOne();
      communication.responseRequired = true;
      communication.responseDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await communication.save();

      const response = await request(app)
        .get('/metrics/crm/communications/overdue/responses')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get overdue follow-ups', async () => {
      // Create an overdue follow-up
      const communication = await CrmCommunication.findOne();
      communication.followUpRequired = true;
      communication.followUpDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await communication.save();

      const response = await request(app)
        .get('/metrics/crm/communications/overdue/follow-ups')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get agent workload metrics', async () => {
      const response = await request(app)
        .get(`/metrics/crm/communications/agent/${testUser._id}/workload`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should bulk update communications', async () => {
      const communications = await CrmCommunication.find({}).limit(3);
      const communicationIds = communications.map(c => c._id);

      const response = await request(app)
        .post('/metrics/crm/communications/bulk/update')
        .set('Authorization', authToken)
        .send({
          communicationIds,
          updateData: { followUpRequired: true }
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
    });

    it('should bulk delete communications', async () => {
      const communications = await CrmCommunication.find({}).limit(3);
      const communicationIds = communications.map(c => c._id);

      const response = await request(app)
        .post('/metrics/crm/communications/bulk/delete')
        .set('Authorization', authToken)
        .send({ communicationIds })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(3);
    });
  });

  describe('CRM Contacts', () => {
    beforeEach(async () => {
      await createCRMTestData();
    });

    it('should return contact metrics', async () => {
      const response = await request(app)
        .get('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    it('should return paginated contacts list', async () => {
      const response = await request(app)
        .get('/metrics/crm/contacts/list')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should create a new contact', async () => {
      const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        contactType: 'lead',
        contactSource: 'website'
      };

      const response = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send(contactData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe(contactData.firstName);
      expect(response.body.data.email).toBe(contactData.email);
    });

    it('should update a contact', async () => {
      const contact = await CrmContact.findOne();
      
      const updateData = {
        phone: '+9876543210',
        company: 'Test Company'
      };

      const response = await request(app)
        .put(`/metrics/crm/contacts/${contact._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.company).toBe(updateData.company);
    });

    it('should delete a contact (soft delete)', async () => {
      const contact = await CrmContact.findOne();

      const response = await request(app)
        .delete(`/metrics/crm/contacts/${contact._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      
      // Verify soft delete
      const deletedContact = await CrmContact.findById(contact._id);
      expect(deletedContact.deleted).toBe(true);
      expect(deletedContact.deletedAt).toBeDefined();
    });

    it('should search contacts', async () => {
      const response = await request(app)
        .get('/metrics/crm/contacts/search?q=John')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should get high value leads', async () => {
      const response = await request(app)
        .get('/metrics/crm/contacts/high-value-leads')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get unassigned contacts', async () => {
      const response = await request(app)
        .get('/metrics/crm/contacts/unassigned')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should assign contact to user', async () => {
      const contact = await CrmContact.findOne();

      const response = await request(app)
        .post(`/metrics/crm/contacts/${contact._id}/assign`)
        .set('Authorization', authToken)
        .send({ userId: testUser._id })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo).toBe(testUser._id.toString());
    });

    it('should give marketing consent', async () => {
      const contact = await CrmContact.findOne();

      const response = await request(app)
        .post(`/metrics/crm/contacts/${contact._id}/consent/marketing`)
        .set('Authorization', authToken)
        .send({ method: 'email' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.consent.marketing).toBe(true);
    });

    it('should withdraw consent', async () => {
      const contact = await CrmContact.findOne();

      const response = await request(app)
        .post(`/metrics/crm/contacts/${contact._id}/consent/withdraw`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.consent.marketing).toBe(false);
      expect(response.body.data.consent.consentWithdrawn).toBe(true);
    });

    it('should bulk assign contacts', async () => {
      const contacts = await CrmContact.find({}).limit(3);
      const contactIds = contacts.map(c => c._id);

      const response = await request(app)
        .post('/metrics/crm/contacts/bulk/assign')
        .set('Authorization', authToken)
        .send({
          contactIds,
          userId: testUser._id
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedCount).toBe(3);
    });

    it('should bulk update contacts', async () => {
      const contacts = await CrmContact.find({}).limit(3);
      const contactIds = contacts.map(c => c._id);

      const response = await request(app)
        .post('/metrics/crm/contacts/bulk/update')
        .set('Authorization', authToken)
        .send({
          contactIds,
          updateData: { tags: ['test-tag'] }
        })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBe(3);
    });
  });

  describe('CRM Templates', () => {
    beforeEach(async () => {
      await createCRMTestData();
    });

    it('should return template metrics', async () => {
      const response = await request(app)
        .get('/metrics/crm/templates')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    it('should return paginated templates list', async () => {
      const response = await request(app)
        .get('/metrics/crm/templates/list')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should create a new template', async () => {
      const templateData = {
        name: 'Test Template',
        description: 'Test template description',
        category: 'welcome',
        channel: 'email',
        type: 'transactional',
        subject: 'Welcome to Boosty',
        body: 'Hello {{firstName}}, welcome to our platform!',
        version: '1.0.0',
        variables: [
          {
            name: 'firstName',
            type: 'string',
            required: true,
            description: 'Customer first name'
          }
        ]
      };

      const response = await request(app)
        .post('/metrics/crm/templates')
        .set('Authorization', authToken)
        .send(templateData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(templateData.name);
      expect(response.body.data.category).toBe(templateData.category);
    });

    it('should update a template', async () => {
      const template = await CrmTemplate.findOne();
      
      const updateData = {
        description: 'Updated template description',
        subject: 'Updated Subject'
      };

      const response = await request(app)
        .put(`/metrics/crm/templates/${template._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.subject).toBe(updateData.subject);
    });

    it('should approve a template', async () => {
      const template = await CrmTemplate.findOne();

      const response = await request(app)
        .post(`/metrics/crm/templates/${template._id}/approve`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
      expect(response.body.data.approvedBy).toBeDefined();
      expect(response.body.data.approvedAt).toBeDefined();
    });

    it('should reject a template', async () => {
      const template = await CrmTemplate.findOne();

      const response = await request(app)
        .post(`/metrics/crm/templates/${template._id}/reject`)
        .set('Authorization', authToken)
        .send({ reason: 'Test rejection reason' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe('Test rejection reason');
    });

    it('should create a new template version', async () => {
      const template = await CrmTemplate.findOne();

      const response = await request(app)
        .post(`/metrics/crm/templates/${template._id}/version`)
        .set('Authorization', authToken)
        .send({ version: '2.0.0' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('2.0.0');
      expect(response.body.data.parentTemplate).toBe(template._id.toString());
    });

    it('should get templates by category', async () => {
      const response = await request(app)
        .get('/metrics/crm/templates/category/welcome')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get top performing templates', async () => {
      const response = await request(app)
        .get('/metrics/crm/templates/top-performing')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('CRM Automations', () => {
    beforeEach(async () => {
      await createCRMTestData();
    });

    it('should return automation metrics', async () => {
      const response = await request(app)
        .get('/metrics/crm/automations')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.breakdowns).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    it('should return paginated automations list', async () => {
      const response = await request(app)
        .get('/metrics/crm/automations/list')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should create a new automation', async () => {
      const automationData = {
        name: 'Test Automation',
        description: 'Test automation description',
        category: 'lead_nurturing',
        trigger: {
          type: 'event',
          event: {
            name: 'contact_created',
            source: 'crm'
          }
        },
        actions: [
          {
            name: 'Send Welcome Email',
            type: 'send_email',
            templateId: 'template-id',
            delay: 0,
            delayUnit: 'minutes'
          }
        ]
      };

      const response = await request(app)
        .post('/metrics/crm/automations')
        .set('Authorization', authToken)
        .send(automationData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(automationData.name);
      expect(response.body.data.category).toBe(automationData.category);
    });

    it('should enable an automation', async () => {
      const automation = await CrmAutomation.findOne();

      const response = await request(app)
        .post(`/metrics/crm/automations/${automation._id}/enable`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.status).toBe('active');
    });

    it('should disable an automation', async () => {
      const automation = await CrmAutomation.findOne();

      const response = await request(app)
        .post(`/metrics/crm/automations/${automation._id}/disable`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.status).toBe('paused');
    });

    it('should test an automation', async () => {
      const automation = await CrmAutomation.findOne();

      const response = await request(app)
        .post(`/metrics/crm/automations/${automation._id}/test`)
        .set('Authorization', authToken)
        .send({ testData: { contactId: 'test-contact-id' } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.testResult).toBeDefined();
    });

    it('should execute an automation manually', async () => {
      const automation = await CrmAutomation.findOne();

      const response = await request(app)
        .post(`/metrics/crm/automations/${automation._id}/execute`)
        .set('Authorization', authToken)
        .send({ triggerData: { contactId: 'test-contact-id' } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.executionResult).toBeDefined();
    });

    it('should get automations by category', async () => {
      const response = await request(app)
        .get('/metrics/crm/automations/category/lead_nurturing')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get automations due for execution', async () => {
      const response = await request(app)
        .get('/metrics/crm/automations/due-for-execution')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get top performing automations', async () => {
      const response = await request(app)
        .get('/metrics/crm/automations/top-performing')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should bulk enable automations', async () => {
      const automations = await CrmAutomation.find({}).limit(3);
      const automationIds = automations.map(a => a._id);

      const response = await request(app)
        .post('/metrics/crm/automations/bulk/enable')
        .set('Authorization', authToken)
        .send({ automationIds })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabledCount).toBe(3);
    });

    it('should bulk disable automations', async () => {
      const automations = await CrmAutomation.find({}).limit(3);
      const automationIds = automations.map(a => a._id);

      const response = await request(app)
        .post('/metrics/crm/automations/bulk/disable')
        .set('Authorization', authToken)
        .send({ automationIds })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
      expect(response.body.data.disabledCount).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const response = await request(app)
        .get('/metrics/crm')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle authorization errors', async () => {
      // Create a user with lower role
      const lowRoleUser = await User.create({
        name: 'Low Role User',
        email: 'lowrole@example.com',
        password: 'password123',
        role: 'user'
      });

      const response = await request(app)
        .get('/metrics/crm')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should handle non-existent resources', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/metrics/crm/communications/${nonExistentId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMMUNICATION_NOT_FOUND');
    });

    it('should handle invalid IDs', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications/invalid-id')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid query parameters', async () => {
      const response = await request(app)
        .get('/metrics/crm/communications/list?page=0&limit=101')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send({ firstName: 'John' }) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle duplicate email addresses', async () => {
      // Create a contact first
      await CrmContact.create({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        contactType: 'lead'
      });

      // Try to create another contact with the same email
      const response = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.doe@example.com', // Duplicate email
          contactType: 'lead'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      // Make multiple concurrent requests
      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/metrics/crm/communications/list')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large datasets', async () => {
      // Create a larger dataset
      await createLargeCRMDataSet();

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/communications/list')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Response should be under 1 second for a simple overview query
      expect(responseTime).toBeLessThan(1000);
    });
  });

  // Helper function to create CRM test data
  async function createCRMTestData() {
    // Create CRM contacts
    const contacts = [];
    for (let i = 0; i < 5; i++) {
      const contact = await CrmContact.create({
        firstName: `Test${i}`,
        lastName: `Contact${i}`,
        email: `test${i}@example.com`,
        phone: `+123456789${i}`,
        contactType: 'lead',
        contactSource: 'website',
        status: 'active',
        createdBy: testUser._id
      });
      contacts.push(contact);
    }

    // Create base communications for CRM communications
    const communications = [];
    for (let i = 0; i < 5; i++) {
      const communication = await Communication.create({
        type: 'email',
        subject: `Test Communication ${i}`,
        content: `Test content ${i}`,
        senderId: testUser._id,
        recipientId: contacts[i]._id,
        status: 'sent'
      });
      communications.push(communication);
    }

    // Create CRM communications
    const crmCommunications = [];
    for (let i = 0; i < 5; i++) {
      const crmCommunication = await CrmCommunication.create({
        communicationId: communications[i]._id,
        entityType: 'contact',
        entityId: contacts[i]._id,
        interactionType: 'outbound',
        channel: 'email',
        direction: 'outbound',
        agentId: testUser._id,
        status: 'sent'
      });
      crmCommunications.push(crmCommunication);
    }

    // Create CRM templates
    const templates = [];
    for (let i = 0; i < 3; i++) {
      const template = await CrmTemplate.create({
        name: `Test Template ${i}`,
        description: `Test template description ${i}`,
        category: 'welcome',
        channel: 'email',
        type: 'transactional',
        subject: `Test Subject ${i}`,
        body: `Test body content ${i}`,
        version: '1.0.0',
        status: 'approved',
        isLatest: true,
        createdBy: testUser._id
      });
      templates.push(template);
    }

    // Create CRM automations
    const automations = [];
    for (let i = 0; i < 3; i++) {
      const automation = await CrmAutomation.create({
        name: `Test Automation ${i}`,
        description: `Test automation description ${i}`,
        category: 'lead_nurturing',
        enabled: true,
        status: 'active',
        trigger: {
          type: 'event',
          event: {
            name: 'contact_created',
            source: 'crm'
          }
        },
        actions: [
          {
            name: 'Send Welcome Email',
            type: 'send_email',
            delay: 0,
            delayUnit: 'minutes'
          }
        ],
        createdBy: testUser._id
      });
      automations.push(automation);
    }

    return {
      contacts,
      communications,
      crmCommunications,
      templates,
      automations
    };
  }

  // Helper function to create large dataset for performance testing
  async function createLargeCRMDataSet() {
    const contacts = [];
    const crmCommunications = [];

    // Create 100 contacts
    for (let i = 0; i < 100; i++) {
      const contact = await CrmContact.create({
        firstName: `Perf${i}`,
        lastName: `Contact${i}`,
        email: `perf${i}@example.com`,
        contactType: 'lead',
        contactSource: 'website',
        status: 'active',
        createdBy: testUser._id
      });
      contacts.push(contact);
    }

    // Create 200 CRM communications
    for (let i = 0; i < 200; i++) {
      const communication = await Communication.create({
        type: 'email',
        subject: `Perf Communication ${i}`,
        content: `Performance test content ${i}`,
        senderId: testUser._id,
        recipientId: contacts[i % contacts.length]._id,
        status: 'sent'
      });

      const crmCommunication = await CrmCommunication.create({
        communicationId: communication._id,
        entityType: 'contact',
        entityId: contacts[i % contacts.length]._id,
        interactionType: 'outbound',
        channel: 'email',
        direction: 'outbound',
        agentId: testUser._id,
        status: 'sent'
      });
      crmCommunications.push(crmCommunication);
    }

    return { contacts, crmCommunications };
  }
});