import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import CrmCommunication from '../../../src/models/metrics/crm-communication.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/metrics/crm-communication.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Contact Operations', () => {
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
      CrmCommunication.deleteMany({})
    ]);
  });

  describe('Contact CRUD Operations', () => {
    beforeEach(async () => {
      // Create mock contact data
      const mockContact = {
        _id: 'contact123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        contactType: 'lead',
        contactSource: 'website',
        company: 'Test Company',
        jobTitle: 'Test Manager',
        department: 'Sales',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'Test Country'
        },
        preferences: {
          preferredChannel: 'email',
          preferredTime: 'morning',
          timezone: 'UTC',
          language: 'en',
          frequency: 'weekly'
        },
        consent: {
          marketing: true,
          marketingConsentDate: new Date(),
          marketingConsentMethod: 'email',
          dataProcessing: true,
          dataProcessingConsentDate: new Date(),
          cookies: true,
          gdprCompliant: true,
          lastConsentUpdate: new Date(),
          consentWithdrawn: false
        },
        tags: ['test', 'lead'],
        segments: [],
        leadScore: 75,
        qualificationStatus: 'working',
        qualificationDate: new Date(),
        engagement: {
          totalCommunications: 5,
          lastCommunicationDate: new Date(),
          lastCommunicationType: 'email',
          totalOpens: 10,
          totalClicks: 3,
          lastOpenDate: new Date(),
          lastClickDate: new Date(),
          engagementScore: 65,
          responseRate: 80
        },
        communicationSummary: {
          totalEmails: 3,
          totalCalls: 2,
          totalSms: 0,
          totalMeetings: 0,
          lastAgentContact: testUser._id,
          lastContactDate: new Date()
        },
        assignedTo: testUser._id,
        assignedDate: new Date(),
        status: 'active',
        statusReason: 'Active lead',
        statusDate: new Date(),
        notes: 'Test contact notes',
        customFields: new Map(),
        metadata: new Map(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmContact.findById = jest.fn().mockResolvedValue(mockContact);
      CrmContact.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockContact])
            })
          })
        })
      });
      CrmContact.countDocuments = jest.fn().mockResolvedValue(1);
      CrmContact.create = jest.fn().mockResolvedValue(mockContact);
      CrmContact.findByIdAndUpdate = jest.fn().mockResolvedValue(mockContact);
      CrmContact.findOne = jest.fn().mockResolvedValue(null); // No existing contact
      CrmContact.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/contacts', () => {
      it('should return paginated list of contacts', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.contacts).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.contacts)).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts?page=2&limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by contact type', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts?contactType=lead')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ contactType: 'lead' })
        );
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts?status=active')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'active' })
        );
      });

      it('should support filtering by lead score range', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts?minLeadScore=50&maxLeadScore=80')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            leadScore: { $gte: 50, $lte: 80 }
          })
        );
      });

      it('should support search functionality', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts?search=john')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            $text: { $search: 'john' }
          })
        );
      });

      it('should handle database errors gracefully', async () => {
        CrmContact.findActive = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('POST /metrics/crm/contacts', () => {
      it('should create a new contact successfully', async () => {
        const contactData = {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567890',
          contactType: 'lead',
          contactSource: 'website',
          company: 'New Company',
          jobTitle: 'Sales Manager',
          address: {
            street: '456 New Street',
            city: 'New City',
            state: 'New State',
            postalCode: '67890',
            country: 'New Country'
          },
          preferences: {
            preferredChannel: 'email',
            preferredTime: 'afternoon',
            timezone: 'EST',
            language: 'en',
            frequency: 'weekly'
          },
          tags: ['new', 'lead'],
          notes: 'New contact notes'
        };

        const response = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(contactData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.firstName).toBe(contactData.firstName);
        expect(response.body.data.lastName).toBe(contactData.lastName);
        expect(response.body.data.email).toBe(contactData.email);
        expect(response.body.data.contactType).toBe(contactData.contactType);
        expect(CrmContact.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...contactData,
            createdBy: testUser._id
          })
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          // Missing required fields
          phone: '+1234567890'
        };

        const response = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate email format', async () => {
        const invalidData = {
          firstName: 'Invalid',
          lastName: 'Email',
          email: 'invalid-email-format',
          contactType: 'lead',
          contactSource: 'manual'
        };

        const response = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should prevent duplicate email addresses', async () => {
        const contactData = {
          firstName: 'Duplicate',
          lastName: 'Email',
          email: 'john.doe@example.com', // Existing email
          contactType: 'lead',
          contactSource: 'manual'
        };

        CrmContact.findOne = jest.fn().mockResolvedValue({ _id: 'existing' });

        const response = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(contactData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
        expect(response.body.error.message).toContain('already exists');
      });

      it('should handle database errors during creation', async () => {
        const contactData = {
          firstName: 'Test',
          lastName: 'Contact',
          email: 'test@example.com',
          contactType: 'lead',
          contactSource: 'manual'
        };

        CrmContact.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/metrics/crm/contacts')
          .set('Authorization', authToken)
          .send(contactData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /metrics/crm/contacts/:contactId', () => {
      it('should return contact details successfully', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .get(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.contact).toBeDefined();
        expect(response.body.data.contact.firstName).toBe('John');
        expect(response.body.data.contact.lastName).toBe('Doe');
        expect(response.body.data.contact.email).toBe('john.doe@example.com');
        expect(CrmContact.findById).toHaveBeenCalledWith(contactId);
      });

      it('should handle non-existent contact', async () => {
        const contactId = 'nonexistent';

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should handle invalid contact ID', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts/invalid-id')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /metrics/crm/contacts/:contactId', () => {
      it('should update contact successfully', async () => {
        const contactId = 'contact123';
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+9876543210',
          company: 'Updated Company',
          jobTitle: 'Updated Manager',
          tags: ['updated', 'contact'],
          notes: 'Updated contact notes'
        };

        const response = await request(app)
          .put(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmContact.findByIdAndUpdate).toHaveBeenCalledWith(
          contactId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent contact update', async () => {
        const contactId = 'nonexistent';
        const updateData = { firstName: 'Updated' };

        CrmContact.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should validate update data', async () => {
        const contactId = 'contact123';
        const invalidData = {
          email: 'invalid-email-format'
        };

        const response = await request(app)
          .put(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/contacts/:contactId', () => {
      it('should delete contact successfully (soft delete)', async () => {
        const contactId = 'contact123';
        const mockContact = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmContact.findById = jest.fn().mockResolvedValue(mockContact);

        const response = await request(app)
          .delete(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockContact.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent contact deletion', async () => {
        const contactId = 'nonexistent';

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });
    });
  });

  describe('Contact Engagement Operations', () => {
    beforeEach(async () => {
      const mockContact = {
        _id: 'contact123',
        updateEngagement: jest.fn().mockResolvedValue({})
      };

      CrmContact.findById = jest.fn().mockResolvedValue(mockContact);
    });

    describe('POST /metrics/crm/contacts/:contactId/engagement', () => {
      it('should update contact engagement successfully', async () => {
        const contactId = 'contact123';
        const engagementData = {
          type: 'email',
          opened: true,
          clicked: true,
          responded: false
        };

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/engagement`)
          .set('Authorization', authToken)
          .send(engagementData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmContact.findById).toHaveBeenCalledWith(contactId);
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.updateEngagement).toHaveBeenCalledWith(engagementData);
      });

      it('should handle non-existent contact engagement update', async () => {
        const contactId = 'nonexistent';
        const engagementData = {
          type: 'email',
          opened: true
        };

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/engagement`)
          .set('Authorization', authToken)
          .send(engagementData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should validate engagement data', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/engagement`)
          .set('Authorization', authToken)
          .send({}) // Missing required fields
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Consent Management Operations', () => {
    beforeEach(async () => {
      const mockContact = {
        _id: 'contact123',
        giveMarketingConsent: jest.fn().mockResolvedValue({}),
        withdrawConsent: jest.fn().mockResolvedValue({})
      };

      CrmContact.findById = jest.fn().mockResolvedValue(mockContact);
    });

    describe('POST /metrics/crm/contacts/:contactId/consent/marketing', () => {
      it('should give marketing consent successfully', async () => {
        const contactId = 'contact123';
        const consentData = {
          method: 'email'
        };

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/consent/marketing`)
          .set('Authorization', authToken)
          .send(consentData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.giveMarketingConsent).toHaveBeenCalledWith(consentData.method);
      });

      it('should handle non-existent contact consent', async () => {
        const contactId = 'nonexistent';
        const consentData = {
          method: 'email'
        };

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/consent/marketing`)
          .set('Authorization', authToken)
          .send(consentData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should validate consent method', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/consent/marketing`)
          .set('Authorization', authToken)
          .send({}) // Missing method
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/contacts/:contactId/consent/withdraw', () => {
      it('should withdraw consent successfully', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/consent/withdraw`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.withdrawConsent).toHaveBeenCalled();
      });

      it('should handle non-existent contact consent withdrawal', async () => {
        const contactId = 'nonexistent';

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/consent/withdraw`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });
    });
  });

  describe('Contact Assignment Operations', () => {
    beforeEach(async () => {
      const mockContact = {
        _id: 'contact123',
        assignTo: jest.fn().mockResolvedValue({})
      };

      CrmContact.findById = jest.fn().mockResolvedValue(mockContact);
    });

    describe('POST /metrics/crm/contacts/:contactId/assign', () => {
      it('should assign contact to user successfully', async () => {
        const contactId = 'contact123';
        const assignmentData = {
          userId: testUser._id
        };

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/assign`)
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.assignTo).toHaveBeenCalledWith(assignmentData.userId);
      });

      it('should handle non-existent contact assignment', async () => {
        const contactId = 'nonexistent';
        const assignmentData = {
          userId: testUser._id
        };

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/assign`)
          .set('Authorization', authToken)
          .send(assignmentData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should validate assignment data', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/assign`)
          .set('Authorization', authToken)
          .send({}) // Missing userId
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Contact Tag Management', () => {
    beforeEach(async () => {
      const mockContact = {
        _id: 'contact123',
        addTag: jest.fn().mockResolvedValue({}),
        removeTag: jest.fn().mockResolvedValue({})
      };

      CrmContact.findById = jest.fn().mockResolvedValue(mockContact);
    });

    describe('POST /metrics/crm/contacts/:contactId/tags', () => {
      it('should add tag to contact successfully', async () => {
        const contactId = 'contact123';
        const tagData = {
          tag: 'new-tag'
        };

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/tags`)
          .set('Authorization', authToken)
          .send(tagData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.addTag).toHaveBeenCalledWith(tagData.tag);
      });

      it('should handle non-existent contact tag addition', async () => {
        const contactId = 'nonexistent';
        const tagData = {
          tag: 'new-tag'
        };

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/tags`)
          .set('Authorization', authToken)
          .send(tagData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });

      it('should validate tag data', async () => {
        const contactId = 'contact123';

        const response = await request(app)
          .post(`/metrics/crm/contacts/${contactId}/tags`)
          .set('Authorization', authToken)
          .send({}) // Missing tag
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/contacts/:contactId/tags/:tag', () => {
      it('should remove tag from contact successfully', async () => {
        const contactId = 'contact123';
        const tag = 'old-tag';

        const response = await request(app)
          .delete(`/metrics/crm/contacts/${contactId}/tags/${encodeURIComponent(tag)}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockContact = await CrmContact.findById(contactId);
        expect(mockContact.removeTag).toHaveBeenCalledWith(tag);
      });

      it('should handle non-existent contact tag removal', async () => {
        const contactId = 'nonexistent';
        const tag = 'old-tag';

        CrmContact.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/contacts/${contactId}/tags/${encodeURIComponent(tag)}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONTACT_NOT_FOUND');
      });
    });
  });

  describe('Contact Search and Filtering', () => {
    describe('GET /metrics/crm/contacts/search', () => {
      it('should search contacts successfully', async () => {
        const searchTerm = 'john doe';

        CrmContact.searchContacts = jest.fn().mockResolvedValue({
          contacts: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/contacts/search?q=${encodeURIComponent(searchTerm)}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmContact.searchContacts).toHaveBeenCalledWith(searchTerm, {});
      });

      it('should support search filters', async () => {
        const searchTerm = 'john doe';
        const filters = {
          contactType: 'lead',
          status: 'active',
          minLeadScore: 50
        };

        CrmContact.searchContacts = jest.fn().mockResolvedValue({
          contacts: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/contacts/search?q=${encodeURIComponent(searchTerm)}&contactType=${filters.contactType}&status=${filters.status}&minLeadScore=${filters.minLeadScore}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.searchContacts).toHaveBeenCalledWith(searchTerm, filters);
      });

      it('should require search term', async () => {
        const response = await request(app)
          .get('/metrics/crm/contacts/search')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });
    });

    describe('GET /metrics/crm/contacts/high-value-leads', () => {
      it('should return high value leads successfully', async () => {
        const mockHighValueLeads = [
          { _id: 'lead1', leadScore: 85 },
          { _id: 'lead2', leadScore: 90 }
        ];

        CrmContact.findHighValueLeads = jest.fn().mockResolvedValue(mockHighValueLeads);

        const response = await request(app)
          .get('/metrics/crm/contacts/high-value-leads')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(CrmContact.findHighValueLeads).toHaveBeenCalledWith(50); // Default limit
      });

      it('should support custom limit for high value leads', async () => {
        const limit = 25;
        const mockHighValueLeads = Array(25).fill().map((_, i) => ({ _id: `lead${i}`, leadScore: 80 + i }));

        CrmContact.findHighValueLeads = jest.fn().mockResolvedValue(mockHighValueLeads);

        const response = await request(app)
          .get(`/metrics/crm/contacts/high-value-leads?limit=${limit}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findHighValueLeads).toHaveBeenCalledWith(limit);
      });
    });

    describe('GET /metrics/crm/contacts/unassigned', () => {
      it('should return unassigned contacts successfully', async () => {
        const mockUnassignedContacts = [
          { _id: 'contact1', assignedTo: null },
          { _id: 'contact2', assignedTo: null }
        ];

        CrmContact.findUnassignedContacts = jest.fn().mockResolvedValue(mockUnassignedContacts);

        const response = await request(app)
          .get('/metrics/crm/contacts/unassigned')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(CrmContact.findUnassignedContacts).toHaveBeenCalledWith();
      });

      it('should support filtering by contact type for unassigned contacts', async () => {
        const contactType = 'lead';
        const mockUnassignedContacts = [
          { _id: 'contact1', contactType: 'lead', assignedTo: null }
        ];

        CrmContact.findUnassignedContacts = jest.fn().mockResolvedValue(mockUnassignedContacts);

        const response = await request(app)
          .get(`/metrics/crm/contacts/unassigned?contactType=${contactType}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findUnassignedContacts).toHaveBeenCalledWith(contactType);
      });
    });

    describe('GET /metrics/crm/contacts/needs-follow-up', () => {
      it('should return contacts needing follow-up successfully', async () => {
        const mockContactsNeedingFollowUp = [
          { _id: 'contact1', lastContactDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { _id: 'contact2', lastContactDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
        ];

        CrmContact.findContactsNeedingFollowUp = jest.fn().mockResolvedValue(mockContactsNeedingFollowUp);

        const response = await request(app)
          .get('/metrics/crm/contacts/needs-follow-up')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(CrmContact.findContactsNeedingFollowUp).toHaveBeenCalledWith(7); // Default days
      });

      it('should support custom days for follow-up contacts', async () => {
        const days = 14;
        const mockContactsNeedingFollowUp = [
          { _id: 'contact1', lastContactDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }
        ];

        CrmContact.findContactsNeedingFollowUp = jest.fn().mockResolvedValue(mockContactsNeedingFollowUp);

        const response = await request(app)
          .get(`/metrics/crm/contacts/needs-follow-up?days=${days}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmContact.findContactsNeedingFollowUp).toHaveBeenCalledWith(days);
      });
    });
  });

  describe('Contact Import and Export', () => {
    describe('POST /metrics/crm/contacts/import', () => {
      it('should import contacts successfully', async () => {
        const importData = {
          contacts: [
            {
              firstName: 'Imported',
              lastName: 'Contact1',
              email: 'imported1@example.com',
              contactType: 'lead',
              contactSource: 'import'
            },
            {
              firstName: 'Imported',
              lastName: 'Contact2',
              email: 'imported2@example.com',
              contactType: 'prospect',
              contactSource: 'import'
            }
          ]
        };

        const mockContact = {
          save: jest.fn().mockResolvedValue({})
        };

        CrmContact.create = jest.fn().mockResolvedValue(mockContact);
        CrmContact.findByEmail = jest.fn().mockResolvedValue(null); // No existing contacts

        const response = await request(app)
          .post('/metrics/crm/contacts/import')
          .set('Authorization', authToken)
          .send(importData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.summary.total).toBe(2);
        expect(response.body.data.summary.created).toBe(2);
        expect(response.body.data.summary.skipped).toBe(0);
        expect(response.body.data.summary.errors).toBe(0);
      });

      it('should handle duplicate contacts during import', async () => {
        const importData = {
          contacts: [
            {
              firstName: 'Duplicate',
              lastName: 'Contact',
              email: 'duplicate@example.com',
              contactType: 'lead'
            }
          ]
        };

        CrmContact.findByEmail = jest.fn().mockResolvedValue({ _id: 'existing' });

        const response = await request(app)
          .post('/metrics/crm/contacts/import')
          .set('Authorization', authToken)
          .send(importData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary.skipped).toBe(1);
        expect(response.body.data.results[0].status).toBe('skipped');
        expect(response.body.data.results[0].reason).toContain('already exists');
      });

      it('should handle import errors gracefully', async () => {
        const importData = {
          contacts: [
            {
              firstName: 'Error',
              lastName: 'Contact',
              email: 'error@example.com',
              contactType: 'lead'
            }
          ]
        };

        CrmContact.findByEmail = jest.fn().mockResolvedValue(null);
        CrmContact.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/metrics/crm/contacts/import')
          .set('Authorization', authToken)
          .send(importData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary.errors).toBe(1);
        expect(response.body.data.results[0].status).toBe('error');
      });

      it('should validate import data', async () => {
        const response = await request(app)
          .post('/metrics/crm/contacts/import')
          .set('Authorization', authToken)
          .send({}) // Missing contacts array
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /metrics/crm/contacts/export', () => {
      it('should export contacts as JSON successfully', async () => {
        const mockContacts = [
          { _id: 'contact1', firstName: 'Export', lastName: 'Contact1' },
          { _id: 'contact2', firstName: 'Export', lastName: 'Contact2' }
        ];

        CrmContact.findActive = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue(mockContacts)
        });

        const response = await request(app)
          .get('/metrics/crm/contacts/export')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should export contacts as CSV successfully', async () => {
        const mockContacts = [
          { _id: 'contact1', firstName: 'Export', lastName: 'Contact1', email: 'export1@example.com' }
        ];

        CrmContact.findActive = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue(mockContacts)
        });

        const response = await request(app)
          .get('/metrics/crm/contacts/export?format=csv')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="contacts.csv"');
        expect(response.text).toContain('ID,First Name,Last Name,Email');
      });

      it('should support filtering for export', async () => {
        const filters = {
          contactType: 'lead',
          status: 'active'
        };

        CrmContact.findActive = jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue([])
        });

        const response = await request(app)
          .get(`/metrics/crm/contacts/export?contactType=${filters.contactType}&status=${filters.status}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Bulk Contact Operations', () => {
    describe('POST /metrics/crm/contacts/bulk/update', () => {
      it('should bulk update contacts successfully', async () => {
        const bulkData = {
          contactIds: ['contact1', 'contact2', 'contact3'],
          updateData: { tags: ['bulk-updated'], status: 'active' }
        };

        CrmContact.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/update')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.updatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully updated 3 contacts');
        expect(CrmContact.updateMany).toHaveBeenCalledWith(
          { _id: { $in: bulkData.contactIds }, deleted: false },
          { ...bulkData.updateData, updatedAt: expect.any(Date) }
        );
      });

      it('should validate bulk update data', async () => {
        const invalidData = {
          updateData: { tags: ['updated'] }
          // Missing contactIds
        };

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/update')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/contacts/bulk/assign', () => {
      it('should bulk assign contacts successfully', async () => {
        const bulkData = {
          contactIds: ['contact1', 'contact2', 'contact3'],
          userId: testUser._id
        };

        CrmContact.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/assign')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.assignedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully assigned 3 contacts');
        expect(CrmContact.updateMany).toHaveBeenCalledWith(
          { _id: { $in: bulkData.contactIds }, deleted: false },
          { 
            assignedTo: bulkData.userId,
            assignedDate: expect.any(Date),
            updatedAt: expect.any(Date)
          }
        );
      });

      it('should validate bulk assignment data', async () => {
        const invalidData = {
          contactIds: ['contact1', 'contact2']
          // Missing userId
        };

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/assign')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/contacts/bulk/delete', () => {
      it('should bulk delete contacts successfully', async () => {
        const bulkData = {
          contactIds: ['contact1', 'contact2', 'contact3']
        };

        const mockContacts = [
          { _id: 'contact1', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'contact2', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'contact3', softDelete: jest.fn().mockResolvedValue({}) }
        ];

        CrmContact.find = jest.fn().mockResolvedValue(mockContacts);

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/delete')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully deleted 3 contacts');
        
        // Verify soft delete was called on each contact
        mockContacts.forEach(contact => {
          expect(contact.softDelete).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk delete data', async () => {
        const invalidData = {
          // Missing contactIds
        };

        const response = await request(app)
          .post('/metrics/crm/contacts/bulk/delete')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/metrics/crm/contacts' },
        { method: 'post', path: '/metrics/crm/contacts' },
        { method: 'get', path: '/metrics/crm/contacts/contact123' },
        { method: 'put', path: '/metrics/crm/contacts/contact123' },
        { method: 'delete', path: '/metrics/crm/contacts/contact123' },
        { method: 'post', path: '/metrics/crm/contacts/contact123/engagement' },
        { method: 'post', path: '/metrics/crm/contacts/contact123/consent/marketing' },
        { method: 'post', path: '/metrics/crm/contacts/contact123/assign' }
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
        .get('/metrics/crm/contacts')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      CrmContact.findActive = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle concurrent contact operations', async () => {
      const contactId = 'contact123';
      const updateData = {
        firstName: 'Concurrent',
        lastName: 'Update'
      };

      const mockContact = {
        _id: contactId,
        save: jest.fn().mockResolvedValue({})
      };

      CrmContact.findByIdAndUpdate = jest.fn().mockResolvedValue(mockContact);

      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        request(app)
          .put(`/metrics/crm/contacts/${contactId}`)
          .set('Authorization', authToken)
          .send(updateData)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Mock minimal responses
      CrmContact.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmContact.countDocuments = jest.fn().mockResolvedValue(0);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/contacts')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle large contact lists efficiently', async () => {
      // Mock large dataset
      const largeContactList = Array(1000).fill().map((_, i) => ({
        _id: `contact${i}`,
        firstName: `Contact${i}`,
        lastName: `Test${i}`,
        email: `contact${i}@example.com`
      }));

      CrmContact.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(largeContactList)
            })
          })
        })
      });
      CrmContact.countDocuments = jest.fn().mockResolvedValue(1000);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/contacts?limit=1000')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.contacts).toHaveLength(1000);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});