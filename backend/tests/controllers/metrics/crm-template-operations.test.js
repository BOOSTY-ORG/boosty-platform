import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmTemplate from '../../../src/models/metrics/crm-template.model.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-template.model.js');
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Template Operations', () => {
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
      CrmTemplate.deleteMany({}),
      CrmContact.deleteMany({})
    ]);
  });

  describe('Template CRUD Operations', () => {
    beforeEach(async () => {
      // Create mock template data
      const mockTemplate = {
        _id: 'template123',
        name: 'Test Template',
        description: 'Test template description',
        category: 'welcome',
        channel: 'email',
        type: 'transactional',
        subject: 'Welcome to Boosty',
        body: 'Hello {{firstName}}, welcome to our platform!',
        htmlBody: '<h1>Hello {{firstName}}, welcome to our platform!</h1>',
        textBody: 'Hello {{firstName}}, welcome to our platform!',
        version: '1.0.0',
        status: 'draft',
        isLatest: true,
        variables: [
          {
            name: 'firstName',
            type: 'string',
            required: true,
            description: 'Customer first name',
            defaultValue: ''
          },
          {
            name: 'lastName',
            type: 'string',
            required: false,
            description: 'Customer last name',
            defaultValue: ''
          }
        ],
        attachments: [],
        metadata: {
          previewText: 'Welcome email',
          thumbnailUrl: 'https://example.com/thumbnail.jpg'
        },
        metrics: {
          totalSent: 0,
          totalOpened: 0,
          totalClicked: 0,
          totalDelivered: 0,
          totalFailed: 0,
          averageOpenRate: 0,
          averageClickRate: 0,
          averageResponseRate: 0,
          averageEngagementScore: 0,
          lastUsedAt: null,
          performanceScore: 0
        },
        approval: {
          status: 'pending',
          submittedBy: testUser._id,
          submittedAt: new Date(),
          reviewedBy: null,
          reviewedAt: null,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: null
        },
        createdBy: testUser._id,
        updatedBy: testUser._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);
      CrmTemplate.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockTemplate])
            })
          })
        })
      });
      CrmTemplate.countDocuments = jest.fn().mockResolvedValue(1);
      CrmTemplate.create = jest.fn().mockResolvedValue(mockTemplate);
      CrmTemplate.findByIdAndUpdate = jest.fn().mockResolvedValue(mockTemplate);
      CrmTemplate.findOne = jest.fn().mockResolvedValue(null); // No existing template
      CrmTemplate.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/templates', () => {
      it('should return paginated list of templates', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.templates).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.templates)).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?page=2&limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by category', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?category=welcome')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'welcome' })
        );
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?status=approved')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'approved' })
        );
      });

      it('should support filtering by channel', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?channel=email')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ channel: 'email' })
        );
      });

      it('should support filtering by type', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?type=transactional')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'transactional' })
        );
      });

      it('should support search functionality', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates?search=welcome')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            $text: { $search: 'welcome' }
          })
        );
      });

      it('should handle database errors gracefully', async () => {
        CrmTemplate.findActive = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/metrics/crm/templates')
          .set('Authorization', authToken)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('POST /metrics/crm/templates', () => {
      it('should create a new template successfully', async () => {
        const templateData = {
          name: 'New Welcome Template',
          description: 'New welcome template description',
          category: 'welcome',
          channel: 'email',
          type: 'transactional',
          subject: 'Welcome {{firstName}}!',
          body: 'Hello {{firstName}}, welcome to our platform!',
          htmlBody: '<h1>Hello {{firstName}}!</h1>',
          textBody: 'Hello {{firstName}}!',
          variables: [
            {
              name: 'firstName',
              type: 'string',
              required: true,
              description: 'Customer first name'
            }
          ],
          metadata: {
            previewText: 'Welcome message'
          }
        };

        const response = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(templateData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(templateData.name);
        expect(response.body.data.category).toBe(templateData.category);
        expect(response.body.data.channel).toBe(templateData.channel);
        expect(response.body.data.type).toBe(templateData.type);
        expect(CrmTemplate.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...templateData,
            createdBy: testUser._id,
            version: '1.0.0',
            status: 'draft',
            isLatest: true
          })
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          description: 'Missing required fields'
        };

        const response = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate email template fields', async () => {
        const invalidData = {
          name: 'Invalid Email Template',
          category: 'welcome',
          channel: 'email',
          type: 'transactional',
          // Missing subject and body for email
          variables: []
        };

        const response = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate SMS template fields', async () => {
        const invalidData = {
          name: 'Invalid SMS Template',
          category: 'welcome',
          channel: 'sms',
          type: 'transactional',
          // Missing body for SMS
          variables: []
        };

        const response = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle database errors during creation', async () => {
        const templateData = {
          name: 'Test Template',
          category: 'welcome',
          channel: 'email',
          type: 'transactional',
          subject: 'Test Subject',
          body: 'Test Body',
          variables: []
        };

        CrmTemplate.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/metrics/crm/templates')
          .set('Authorization', authToken)
          .send(templateData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /metrics/crm/templates/:templateId', () => {
      it('should return template details successfully', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.template).toBeDefined();
        expect(response.body.data.template.name).toBe('Test Template');
        expect(response.body.data.template.category).toBe('welcome');
        expect(CrmTemplate.findById).toHaveBeenCalledWith(templateId);
      });

      it('should handle non-existent template', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should handle invalid template ID', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates/invalid-id')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /metrics/crm/templates/:templateId', () => {
      it('should update template successfully', async () => {
        const templateId = 'template123';
        const updateData = {
          name: 'Updated Template',
          description: 'Updated template description',
          subject: 'Updated Subject',
          body: 'Updated body content',
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
          .put(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
          templateId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent template update', async () => {
        const templateId = 'nonexistent';
        const updateData = { name: 'Updated Template' };

        CrmTemplate.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate update data', async () => {
        const templateId = 'template123';
        const invalidData = {
          channel: 'invalid_channel'
        };

        const response = await request(app)
          .put(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/templates/:templateId', () => {
      it('should delete template successfully (soft delete)', async () => {
        const templateId = 'template123';
        const mockTemplate = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);

        const response = await request(app)
          .delete(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockTemplate.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent template deletion', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/templates/${templateId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
    });
  });

  describe('Template Approval Workflow', () => {
    beforeEach(async () => {
      const mockTemplate = {
        _id: 'template123',
        submitForApproval: jest.fn().mockResolvedValue({}),
        approve: jest.fn().mockResolvedValue({}),
        reject: jest.fn().mockResolvedValue({}),
        save: jest.fn().mockResolvedValue({})
      };

      CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);
    });

    describe('POST /metrics/crm/templates/:templateId/submit', () => {
      it('should submit template for approval successfully', async () => {
        const templateId = 'template123';
        const submitData = {
          notes: 'Ready for review'
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/submit`)
          .set('Authorization', authToken)
          .send(submitData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.submitForApproval).toHaveBeenCalledWith(testUser._id, submitData.notes);
      });

      it('should handle non-existent template submission', async () => {
        const templateId = 'nonexistent';
        const submitData = { notes: 'Ready for review' };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/submit`)
          .set('Authorization', authToken)
          .send(submitData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate submission data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/submit`)
          .set('Authorization', authToken)
          .send({}) // Missing notes
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/templates/:templateId/approve', () => {
      it('should approve template successfully', async () => {
        const templateId = 'template123';
        const approvalData = {
          notes: 'Approved for production use'
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/approve`)
          .set('Authorization', authToken)
          .send(approvalData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.approve).toHaveBeenCalledWith(testUser._id, approvalData.notes);
      });

      it('should handle non-existent template approval', async () => {
        const templateId = 'nonexistent';
        const approvalData = { notes: 'Approved' };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/approve`)
          .set('Authorization', authToken)
          .send(approvalData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate approval data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/approve`)
          .set('Authorization', authToken)
          .send({}) // Missing notes
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/templates/:templateId/reject', () => {
      it('should reject template successfully', async () => {
        const templateId = 'template123';
        const rejectionData = {
          reason: 'Template does not meet brand guidelines',
          notes: 'Please review and update before resubmitting'
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/reject`)
          .set('Authorization', authToken)
          .send(rejectionData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.reject).toHaveBeenCalledWith(testUser._id, rejectionData.reason, rejectionData.notes);
      });

      it('should handle non-existent template rejection', async () => {
        const templateId = 'nonexistent';
        const rejectionData = { reason: 'Rejected' };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/reject`)
          .set('Authorization', authToken)
          .send(rejectionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate rejection data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/reject`)
          .set('Authorization', authToken)
          .send({}) // Missing reason
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Template Versioning', () => {
    beforeEach(async () => {
      const mockTemplate = {
        _id: 'template123',
        createNewVersion: jest.fn().mockResolvedValue({})
      };

      CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);
    });

    describe('POST /metrics/crm/templates/:templateId/version', () => {
      it('should create new template version successfully', async () => {
        const templateId = 'template123';
        const versionData = {
          version: '2.0.0',
          changes: 'Updated subject and body for better engagement',
          updateType: 'minor'
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/version`)
          .set('Authorization', authToken)
          .send(versionData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.createNewVersion).toHaveBeenCalledWith(
          testUser._id,
          versionData.version,
          versionData.changes,
          versionData.updateType
        );
      });

      it('should handle non-existent template versioning', async () => {
        const templateId = 'nonexistent';
        const versionData = { version: '2.0.0' };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/version`)
          .set('Authorization', authToken)
          .send(versionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate version data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/version`)
          .set('Authorization', authToken)
          .send({}) // Missing version
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate version format', async () => {
        const templateId = 'template123';
        const invalidData = {
          version: 'invalid-version-format'
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/version`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /metrics/crm/templates/:templateId/versions', () => {
      it('should return template versions successfully', async () => {
        const templateId = 'template123';
        const mockVersions = [
          { _id: 'version1', version: '1.0.0', isLatest: false },
          { _id: 'version2', version: '2.0.0', isLatest: true }
        ];

        CrmTemplate.findVersions = jest.fn().mockResolvedValue(mockVersions);

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/versions`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(CrmTemplate.findVersions).toHaveBeenCalledWith(templateId);
      });

      it('should handle non-existent template versions', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.findVersions = jest.fn().mockResolvedValue([]);

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/versions`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });
  });

  describe('Template A/B Testing', () => {
    beforeEach(async () => {
      const mockTemplate = {
        _id: 'template123',
        startABTest: jest.fn().mockResolvedValue({}),
        stopABTest: jest.fn().mockResolvedValue({}),
        getABTestResults: jest.fn().mockResolvedValue({
          variants: [
            { _id: 'variant1', name: 'Control', subject: 'Original Subject' },
            { _id: 'variant2', name: 'Test A', subject: 'Test Subject A' }
          ],
          results: {
            control: { opens: 100, clicks: 10, conversions: 5 },
            variantA: { opens: 120, clicks: 15, conversions: 8 }
          },
          winner: 'variantA',
          confidence: 0.85,
          significance: 0.05
        })
      };

      CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);
    });

    describe('POST /metrics/crm/templates/:templateId/ab-test/start', () => {
      it('should start A/B test successfully', async () => {
        const templateId = 'template123';
        const testData = {
          name: 'Welcome Email A/B Test',
          variants: [
            {
              name: 'Control',
              subject: 'Original Welcome Subject',
              body: 'Original welcome body content'
            },
            {
              name: 'Test A',
              subject: 'Test Welcome Subject',
              body: 'Test welcome body content'
            }
          ],
          trafficSplit: 50,
          duration: 7, // days
          successMetric: 'conversions',
          confidence: 0.95
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/ab-test/start`)
          .set('Authorization', authToken)
          .send(testData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.startABTest).toHaveBeenCalledWith(testUser._id, testData);
      });

      it('should handle non-existent template A/B test start', async () => {
        const templateId = 'nonexistent';
        const testData = { name: 'Test', variants: [] };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/ab-test/start`)
          .set('Authorization', authToken)
          .send(testData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate A/B test data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/ab-test/start`)
          .set('Authorization', authToken)
          .send({}) // Missing required fields
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/templates/:templateId/ab-test/stop', () => {
      it('should stop A/B test successfully', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/ab-test/stop`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.stopABTest).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent template A/B test stop', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/ab-test/stop`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
    });

    describe('GET /metrics/crm/templates/:templateId/ab-test/results', () => {
      it('should return A/B test results successfully', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/ab-test/results`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.variants).toBeDefined();
        expect(response.body.data.results).toBeDefined();
        expect(response.body.data.winner).toBe('variantA');
        expect(response.body.data.confidence).toBe(0.85);
        expect(CrmTemplate.getABTestResults).toHaveBeenCalledWith(templateId);
      });

      it('should handle non-existent template A/B test results', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.getABTestResults = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/ab-test/results`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
    });
  });

  describe('Template Usage and Performance', () => {
    beforeEach(async () => {
      const mockTemplate = {
        _id: 'template123',
        recordUsage: jest.fn().mockResolvedValue({}),
        getUsageStats: jest.fn().mockResolvedValue({
          totalSent: 1000,
          totalOpened: 800,
          totalClicked: 200,
          totalDelivered: 950,
          totalFailed: 50,
          averageOpenRate: 80,
          averageClickRate: 25,
          averageResponseRate: 15,
          averageEngagementScore: 75,
          lastUsedAt: new Date(),
          performanceScore: 85
        })
      };

      CrmTemplate.findById = jest.fn().mockResolvedValue(mockTemplate);
    });

    describe('POST /metrics/crm/templates/:templateId/usage', () => {
      it('should record template usage successfully', async () => {
        const templateId = 'template123';
        const usageData = {
          contactId: 'contact456',
          variables: {
            firstName: 'John',
            lastName: 'Doe'
          },
          channel: 'email',
          sentAt: new Date(),
          deliveredAt: new Date(),
          openedAt: new Date(),
          clickedAt: new Date()
        };

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/usage`)
          .set('Authorization', authToken)
          .send(usageData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockTemplate = await CrmTemplate.findById(templateId);
        expect(mockTemplate.recordUsage).toHaveBeenCalledWith(
          usageData.contactId,
          usageData.variables,
          usageData.channel,
          usageData.sentAt,
          usageData.deliveredAt,
          usageData.openedAt,
          usageData.clickedAt
        );
      });

      it('should handle non-existent template usage recording', async () => {
        const templateId = 'nonexistent';
        const usageData = { contactId: 'contact456' };

        CrmTemplate.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/usage`)
          .set('Authorization', authToken)
          .send(usageData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });

      it('should validate usage data', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .post(`/metrics/crm/templates/${templateId}/usage`)
          .set('Authorization', authToken)
          .send({}) // Missing contactId
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /metrics/crm/templates/:templateId/performance', () => {
      it('should return template performance metrics successfully', async () => {
        const templateId = 'template123';

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/performance`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.totalSent).toBe(1000);
        expect(response.body.data.totalOpened).toBe(800);
        expect(response.body.data.totalClicked).toBe(200);
        expect(response.body.data.averageOpenRate).toBe(80);
        expect(response.body.data.averageClickRate).toBe(25);
        expect(response.body.data.performanceScore).toBe(85);
        expect(CrmTemplate.getUsageStats).toHaveBeenCalledWith(templateId);
      });

      it('should handle non-existent template performance metrics', async () => {
        const templateId = 'nonexistent';

        CrmTemplate.getUsageStats = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/templates/${templateId}/performance`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
    });
  });

  describe('Template Search and Filtering', () => {
    describe('GET /metrics/crm/templates/search', () => {
      it('should search templates successfully', async () => {
        const searchTerm = 'welcome email';

        CrmTemplate.searchTemplates = jest.fn().mockResolvedValue({
          templates: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/templates/search?q=${encodeURIComponent(searchTerm)}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmTemplate.searchTemplates).toHaveBeenCalledWith(searchTerm, {});
      });

      it('should support search filters', async () => {
        const searchTerm = 'welcome';
        const filters = {
          category: 'welcome',
          status: 'approved',
          channel: 'email'
        };

        CrmTemplate.searchTemplates = jest.fn().mockResolvedValue({
          templates: [],
          pagination: { page: 1, limit: 20, total: 0 }
        });

        const response = await request(app)
          .get(`/metrics/crm/templates/search?q=${encodeURIComponent(searchTerm)}&category=${filters.category}&status=${filters.status}&channel=${filters.channel}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.searchTemplates).toHaveBeenCalledWith(searchTerm, filters);
      });

      it('should require search term', async () => {
        const response = await request(app)
          .get('/metrics/crm/templates/search')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });
    });

    describe('GET /metrics/crm/templates/category/:category', () => {
      it('should return templates by category successfully', async () => {
        const category = 'welcome';
        const mockTemplates = [
          { _id: 'template1', name: 'Welcome Email 1', category: 'welcome' },
          { _id: 'template2', name: 'Welcome Email 2', category: 'welcome' }
        ];

        CrmTemplate.findByCategory = jest.fn().mockResolvedValue(mockTemplates);

        const response = await request(app)
          .get(`/metrics/crm/templates/category/${category}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(CrmTemplate.findByCategory).toHaveBeenCalledWith(category);
      });

      it('should handle non-existent category', async () => {
        const category = 'nonexistent';

        CrmTemplate.findByCategory = jest.fn().mockResolvedValue([]);

        const response = await request(app)
          .get(`/metrics/crm/templates/category/${category}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('GET /metrics/crm/templates/top-performing', () => {
      it('should return top performing templates successfully', async () => {
        const mockTopTemplates = [
          { _id: 'template1', name: 'High Performer 1', metrics: { averageOpenRate: 95, averageClickRate: 30 } },
          { _id: 'template2', name: 'High Performer 2', metrics: { averageOpenRate: 85, averageClickRate: 25 } }
        ];

        CrmTemplate.getTopPerforming = jest.fn().mockResolvedValue(mockTopTemplates);

        const response = await request(app)
          .get('/metrics/crm/templates/top-performing')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(CrmTemplate.getTopPerforming).toHaveBeenCalled();
      });

      it('should support limit for top performing templates', async () => {
        const limit = 5;
        const mockTopTemplates = Array(5).fill().map((_, i) => ({
          _id: `template${i}`,
          name: `Top Template ${i}`,
          metrics: { averageOpenRate: 90 - i, averageClickRate: 30 - i }
        }));

        CrmTemplate.getTopPerforming = jest.fn().mockResolvedValue(mockTopTemplates);

        const response = await request(app)
          .get(`/metrics/crm/templates/top-performing?limit=${limit}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmTemplate.getTopPerforming).toHaveBeenCalledWith(limit);
      });
    });
  });

  describe('Bulk Template Operations', () => {
    describe('POST /metrics/crm/templates/bulk/update', () => {
      it('should bulk update templates successfully', async () => {
        const bulkData = {
          templateIds: ['template1', 'template2', 'template3'],
          updateData: { status: 'approved', tags: ['bulk-updated'] }
        };

        CrmTemplate.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

        const response = await request(app)
          .post('/metrics/crm/templates/bulk/update')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.updatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully updated 3 templates');
        expect(CrmTemplate.updateMany).toHaveBeenCalledWith(
          { _id: { $in: bulkData.templateIds }, deleted: false },
          { ...bulkData.updateData, updatedAt: expect.any(Date) }
        );
      });

      it('should validate bulk update data', async () => {
        const invalidData = {
          updateData: { tags: ['updated'] }
          // Missing templateIds
        };

        const response = await request(app)
          .post('/metrics/crm/templates/bulk/update')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/templates/bulk/delete', () => {
      it('should bulk delete templates successfully', async () => {
        const bulkData = {
          templateIds: ['template1', 'template2', 'template3']
        };

        const mockTemplates = [
          { _id: 'template1', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'template2', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'template3', softDelete: jest.fn().mockResolvedValue({}) }
        ];

        CrmTemplate.find = jest.fn().mockResolvedValue(mockTemplates);

        const response = await request(app)
          .post('/metrics/crm/templates/bulk/delete')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully deleted 3 templates');
        
        // Verify soft delete was called on each template
        mockTemplates.forEach(template => {
          expect(template.softDelete).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk delete data', async () => {
        const invalidData = {
          // Missing templateIds
        };

        const response = await request(app)
          .post('/metrics/crm/templates/bulk/delete')
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
        { method: 'get', path: '/metrics/crm/templates' },
        { method: 'post', path: '/metrics/crm/templates' },
        { method: 'get', path: '/metrics/crm/templates/template123' },
        { method: 'put', path: '/metrics/crm/templates/template123' },
        { method: 'delete', path: '/metrics/crm/templates/template123' },
        { method: 'post', path: '/metrics/crm/templates/template123/submit' },
        { method: 'post', path: '/metrics/crm/templates/template123/approve' },
        { method: 'post', path: '/metrics/crm/templates/template123/reject' }
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
        .get('/metrics/crm/templates')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      CrmTemplate.findActive = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/templates')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/metrics/crm/templates')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle concurrent template operations', async () => {
      const templateId = 'template123';
      
      const mockTemplate = {
        _id: templateId,
        save: jest.fn().mockResolvedValue({})
      };

      CrmTemplate.findByIdAndUpdate = jest.fn().mockResolvedValue(mockTemplate);

      // Make multiple concurrent requests
      const requests = [
        request(app).put(`/metrics/crm/templates/${templateId}`).send({ name: 'Concurrent 1' }),
        request(app).post(`/metrics/crm/templates/${templateId}/submit`).send({ notes: 'Concurrent submit 1' }),
        request(app).post(`/metrics/crm/templates/${templateId}/approve`).send({ notes: 'Concurrent approve 1' })
      ];

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      // Mock minimal responses
      CrmTemplate.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmTemplate.countDocuments = jest.fn().mockResolvedValue(0);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/templates')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle large template lists efficiently', async () => {
      // Mock large dataset
      const largeTemplateList = Array(1000).fill().map((_, i) => ({
        _id: `template${i}`,
        name: `Template ${i}`,
        category: 'welcome',
        status: 'approved'
      }));

      CrmTemplate.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(largeTemplateList)
            })
          })
        })
      });
      CrmTemplate.countDocuments = jest.fn().mockResolvedValue(1000);

      const startTime = Date.now();
      
      const response = await request(app)
          .get('/metrics/crm/templates?limit=1000')
          .set('Authorization', authToken)
          .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1000);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});