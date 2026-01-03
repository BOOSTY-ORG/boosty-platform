import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/express.js';
import { setupTestDatabase, teardownTestDatabase, createTestData, createMockRequest, createMockResponse, createMockNext } from '../../helpers/metrics.test.helpers.js';
import CrmAutomation from '../../../src/models/metrics/crm-automation.model.js';
import CrmContact from '../../../src/models/metrics/crm-contact.model.js';
import CrmTemplate from '../../../src/models/metrics/crm-template.model.js';
import User from '../../../src/models/user.model.js';

// Mock models to control their behavior in tests
jest.mock('../../../src/models/metrics/crm-automation.model.js');
jest.mock('../../../src/models/metrics/crm-contact.model.js');
jest.mock('../../../src/models/metrics/crm-template.model.js');
jest.mock('../../../src/models/user.model.js');

describe('CRM Automation Operations', () => {
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
      CrmAutomation.deleteMany({}),
      CrmContact.deleteMany({}),
      CrmTemplate.deleteMany({})
    ]);
  });

  describe('Automation CRUD Operations', () => {
    beforeEach(async () => {
      // Create mock automation data
      const mockAutomation = {
        _id: 'automation123',
        name: 'Welcome Email Automation',
        description: 'Sends welcome email to new contacts',
        category: 'onboarding',
        status: 'active',
        priority: 'medium',
        triggers: [
          {
            type: 'contact_created',
            conditions: [
              { field: 'source', operator: 'equals', value: 'website' },
              { field: 'isLead', operator: 'equals', value: true }
            ],
            delay: 0 // Immediate
          }
        ],
        actions: [
          {
            type: 'send_email',
            config: {
              templateId: 'template123',
              variables: {
                firstName: '{{contact.firstName}}',
                lastName: '{{contact.lastName}}'
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
              { field: 'contact.status', operator: 'equals', value: 'active' }
            ]
          }
        ],
        schedule: {
          enabled: false,
          timezone: 'UTC',
          startDate: null,
          endDate: null
        },
        execution: {
          maxExecutions: -1, // Unlimited
          cooldownPeriod: 300, // 5 minutes
          retryPolicy: {
            enabled: true,
            maxRetries: 3,
            retryDelay: 60 // 1 minute
          }
        },
        metrics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          lastExecutedAt: null,
          successRate: 0
        },
        tags: ['onboarding', 'welcome'],
        customFields: new Map(),
        metadata: new Map(),
        createdBy: testUser._id,
        updatedBy: testUser._id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);
      CrmAutomation.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAutomation])
            })
          })
        })
      });
      CrmAutomation.countDocuments = jest.fn().mockResolvedValue(1);
      CrmAutomation.create = jest.fn().mockResolvedValue(mockAutomation);
      CrmAutomation.findByIdAndUpdate = jest.fn().mockResolvedValue(mockAutomation);
      CrmAutomation.findOne = jest.fn().mockResolvedValue(null); // No existing automation
      CrmAutomation.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    });

    describe('GET /metrics/crm/automations', () => {
      it('should return paginated list of automations', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.automations).toBeDefined();
        expect(response.body.pagination).toBeDefined();
        expect(Array.isArray(response.body.data.automations)).toBe(true);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations?page=2&limit=10')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support filtering by category', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations?category=onboarding')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAutomation.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'onboarding' })
        );
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations?status=active')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAutomation.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'active' })
        );
      });

      it('should support filtering by priority', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations?priority=high')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAutomation.findActive).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'high' })
        );
      });

      it('should support search functionality', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations?search=welcome')
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAutomation.findActive).toHaveBeenCalledWith(
          expect.objectContaining({
            $text: { $search: 'welcome' }
          })
        );
      });

      it('should handle database errors gracefully', async () => {
        CrmAutomation.findActive = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/metrics/crm/automations')
          .set('Authorization', authToken)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('POST /metrics/crm/automations', () => {
      it('should create a new automation successfully', async () => {
        const automationData = {
          name: 'Lead Follow-up Automation',
          description: 'Follows up with new leads after 24 hours',
          category: 'lead_management',
          priority: 'high',
          triggers: [
            {
              type: 'contact_created',
              conditions: [
                { field: 'isLead', operator: 'equals', value: true }
              ],
              delay: 86400 // 24 hours
            }
          ],
          actions: [
            {
              type: 'send_email',
              config: {
                templateId: 'template123',
                variables: {
                  firstName: '{{contact.firstName}}'
                }
              },
              delay: 0
            }
          ],
          conditions: [
            {
              type: 'and',
              rules: [
                { field: 'contact.email', operator: 'exists', value: true }
              ]
            }
          ],
          tags: ['lead', 'followup']
        };

        const response = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(automationData)
          .expect(201);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.name).toBe(automationData.name);
        expect(response.body.data.category).toBe(automationData.category);
        expect(response.body.data.priority).toBe(automationData.priority);
        expect(CrmAutomation.create).toHaveBeenCalledWith(
          expect.objectContaining({
            ...automationData,
            createdBy: testUser._id,
            status: 'draft'
          })
        );
      });

      it('should validate required fields', async () => {
        const invalidData = {
          description: 'Missing required fields'
        };

        const response = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toContain('required');
      });

      it('should validate triggers structure', async () => {
        const invalidData = {
          name: 'Invalid Automation',
          category: 'onboarding',
          triggers: [
            {
              // Missing type
              conditions: []
            }
          ],
          actions: []
        };

        const response = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate actions structure', async () => {
        const invalidData = {
          name: 'Invalid Automation',
          category: 'onboarding',
          triggers: [
            {
              type: 'contact_created',
              conditions: []
            }
          ],
          actions: [
            {
              // Missing type
              config: {}
            }
          ]
        };

        const response = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should handle database errors during creation', async () => {
        const automationData = {
          name: 'Test Automation',
          category: 'onboarding',
          triggers: [{ type: 'contact_created', conditions: [] }],
          actions: [{ type: 'send_email', config: {} }]
        };

        CrmAutomation.create = jest.fn().mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .post('/metrics/crm/automations')
          .set('Authorization', authToken)
          .send(automationData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('GET /metrics/crm/automations/:automationId', () => {
      it('should return automation details successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.automation).toBeDefined();
        expect(response.body.data.automation.name).toBe('Welcome Email Automation');
        expect(response.body.data.automation.category).toBe('onboarding');
        expect(CrmAutomation.findById).toHaveBeenCalledWith(automationId);
      });

      it('should handle non-existent automation', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should handle invalid automation ID', async () => {
        const response = await request(app)
          .get('/metrics/crm/automations/invalid-id')
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /metrics/crm/automations/:automationId', () => {
      it('should update automation successfully', async () => {
        const automationId = 'automation123';
        const updateData = {
          name: 'Updated Automation',
          description: 'Updated automation description',
          priority: 'high',
          status: 'active',
          tags: ['updated', 'automation']
        };

        const response = await request(app)
          .put(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(CrmAutomation.findByIdAndUpdate).toHaveBeenCalledWith(
          automationId,
          expect.objectContaining({
            ...updateData,
            updatedBy: testUser._id
          }),
          { new: true, runValidators: true }
        );
      });

      it('should handle non-existent automation update', async () => {
        const automationId = 'nonexistent';
        const updateData = { name: 'Updated Automation' };

        CrmAutomation.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .put(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should validate update data', async () => {
        const automationId = 'automation123';
        const invalidData = {
          priority: 'invalid_priority'
        };

        const response = await request(app)
          .put(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/automations/:automationId', () => {
      it('should delete automation successfully (soft delete)', async () => {
        const automationId = 'automation123';
        const mockAutomation = {
          softDelete: jest.fn().mockResolvedValue({})
        };

        CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);

        const response = await request(app)
          .delete(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(mockAutomation.softDelete).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent automation deletion', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/automations/${automationId}`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });
  });

  describe('Automation Execution Management', () => {
    beforeEach(async () => {
      const mockAutomation = {
        _id: 'automation123',
        activate: jest.fn().mockResolvedValue({}),
        deactivate: jest.fn().mockResolvedValue({}),
        execute: jest.fn().mockResolvedValue({
          executionId: 'exec123',
          status: 'success',
          results: {
            actionsExecuted: 1,
            contactsProcessed: 1,
            errors: []
          }
        }),
        getExecutionHistory: jest.fn().mockResolvedValue([
          {
            _id: 'exec1',
            status: 'success',
            executedAt: new Date(),
            duration: 1500,
            results: { contactsProcessed: 1 }
          },
          {
            _id: 'exec2',
            status: 'failed',
            executedAt: new Date(),
            duration: 800,
            error: 'Template not found'
          }
        ]),
        save: jest.fn().mockResolvedValue({})
      };

      CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);
    });

    describe('POST /metrics/crm/automations/:automationId/activate', () => {
      it('should activate automation successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/activate`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.activate).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent automation activation', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/activate`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should handle already active automation', async () => {
        const automationId = 'automation123';
        const mockAutomation = {
          _id: automationId,
          status: 'active',
          activate: jest.fn().mockRejectedValue(new Error('Automation already active'))
        };

        CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/activate`)
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_ALREADY_ACTIVE');
      });
    });

    describe('POST /metrics/crm/automations/:automationId/deactivate', () => {
      it('should deactivate automation successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/deactivate`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.deactivate).toHaveBeenCalledWith(testUser._id);
      });

      it('should handle non-existent automation deactivation', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/deactivate`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should handle already inactive automation', async () => {
        const automationId = 'automation123';
        const mockAutomation = {
          _id: automationId,
          status: 'inactive',
          deactivate: jest.fn().mockRejectedValue(new Error('Automation already inactive'))
        };

        CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/deactivate`)
          .set('Authorization', authToken)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_ALREADY_INACTIVE');
      });
    });

    describe('POST /metrics/crm/automations/:automationId/execute', () => {
      it('should execute automation successfully', async () => {
        const automationId = 'automation123';
        const executionData = {
          testMode: true,
          contactIds: ['contact1', 'contact2'],
          variables: {
            customVar1: 'value1',
            customVar2: 'value2'
          }
        };

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/execute`)
          .set('Authorization', authToken)
          .send(executionData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.executionId).toBe('exec123');
        expect(response.body.data.status).toBe('success');
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.execute).toHaveBeenCalledWith(
          executionData.testMode,
          executionData.contactIds,
          executionData.variables
        );
      });

      it('should handle non-existent automation execution', async () => {
        const automationId = 'nonexistent';
        const executionData = { testMode: true };

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/execute`)
          .set('Authorization', authToken)
          .send(executionData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should validate execution data', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/execute`)
          .set('Authorization', authToken)
          .send({}) // Missing testMode
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /metrics/crm/automations/:automationId/executions', () => {
      it('should return execution history successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/executions`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(CrmAutomation.getExecutionHistory).toHaveBeenCalledWith(automationId);
      });

      it('should support pagination for execution history', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/executions?page=1&limit=10`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(CrmAutomation.getExecutionHistory).toHaveBeenCalledWith(
          automationId,
          { page: 1, limit: 10 }
        );
      });

      it('should handle non-existent automation execution history', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.getExecutionHistory = jest.fn().mockRejectedValue(new Error('Automation not found'));

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/executions`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });
  });

  describe('Automation Testing and Validation', () => {
    beforeEach(async () => {
      const mockAutomation = {
        _id: 'automation123',
        test: jest.fn().mockResolvedValue({
          testId: 'test123',
          status: 'success',
          results: {
            triggersTested: 1,
            conditionsTested: 1,
            actionsTested: 1,
            errors: [],
            warnings: []
          }
        }),
        validate: jest.fn().mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: [
            'Consider adding more specific conditions to reduce false positives'
          ]
        })
      };

      CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);
    });

    describe('POST /metrics/crm/automations/:automationId/test', () => {
      it('should test automation successfully', async () => {
        const automationId = 'automation123';
        const testData = {
          testContact: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            isLead: true,
            source: 'website'
          },
          testMode: 'dry_run'
        };

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/test`)
          .set('Authorization', authToken)
          .send(testData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.testId).toBe('test123');
        expect(response.body.data.status).toBe('success');
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.test).toHaveBeenCalledWith(testData.testContact, testData.testMode);
      });

      it('should handle non-existent automation testing', async () => {
        const automationId = 'nonexistent';
        const testData = { testContact: {}, testMode: 'dry_run' };

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/test`)
          .set('Authorization', authToken)
          .send(testData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should validate test data', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/test`)
          .set('Authorization', authToken)
          .send({}) // Missing testContact and testMode
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/automations/:automationId/validate', () => {
      it('should validate automation successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/validate`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.isValid).toBe(true);
        expect(Array.isArray(response.body.data.errors)).toBe(true);
        expect(Array.isArray(response.body.data.warnings)).toBe(true);
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.validate).toHaveBeenCalled();
      });

      it('should handle non-existent automation validation', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/validate`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });
  });

  describe('Automation Scheduling', () => {
    beforeEach(async () => {
      const mockAutomation = {
        _id: 'automation123',
        setSchedule: jest.fn().mockResolvedValue({}),
        removeSchedule: jest.fn().mockResolvedValue({}),
        getSchedule: jest.fn().mockResolvedValue({
          enabled: true,
          timezone: 'UTC',
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-12-31T23:59:59Z'),
          cronExpression: '0 9 * * 1-5', // Weekdays at 9 AM
          nextRun: new Date(),
          lastRun: new Date()
        })
      };

      CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);
    });

    describe('POST /metrics/crm/automations/:automationId/schedule', () => {
      it('should set automation schedule successfully', async () => {
        const automationId = 'automation123';
        const scheduleData = {
          enabled: true,
          timezone: 'UTC',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          cronExpression: '0 9 * * 1-5' // Weekdays at 9 AM
        };

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .send(scheduleData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.setSchedule).toHaveBeenCalledWith(scheduleData);
      });

      it('should handle non-existent automation scheduling', async () => {
        const automationId = 'nonexistent';
        const scheduleData = { enabled: true };

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .send(scheduleData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });

      it('should validate schedule data', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .send({}) // Missing required fields
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate cron expression', async () => {
        const automationId = 'automation123';
        const invalidData = {
          enabled: true,
          cronExpression: 'invalid-cron-expression'
        };

        const response = await request(app)
          .post(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /metrics/crm/automations/:automationId/schedule', () => {
      it('should remove automation schedule successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .delete(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        const mockAutomation = await CrmAutomation.findById(automationId);
        expect(mockAutomation.removeSchedule).toHaveBeenCalled();
      });

      it('should handle non-existent automation schedule removal', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.findById = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .delete(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });

    describe('GET /metrics/crm/automations/:automationId/schedule', () => {
      it('should return automation schedule successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.enabled).toBe(true);
        expect(response.body.data.timezone).toBe('UTC');
        expect(response.body.data.cronExpression).toBe('0 9 * * 1-5');
        expect(CrmAutomation.getSchedule).toHaveBeenCalledWith(automationId);
      });

      it('should handle non-existent automation schedule retrieval', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.getSchedule = jest.fn().mockRejectedValue(new Error('Automation not found'));

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/schedule`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });
  });

  describe('Automation Performance and Metrics', () => {
    beforeEach(async () => {
      const mockAutomation = {
        _id: 'automation123',
        getMetrics: jest.fn().mockResolvedValue({
          totalExecutions: 1000,
          successfulExecutions: 950,
          failedExecutions: 50,
          averageExecutionTime: 2500,
          lastExecutedAt: new Date(),
          successRate: 95,
          performanceScore: 88,
          trends: {
            daily: [
              { date: '2024-01-01', executions: 50, successRate: 96 },
              { date: '2024-01-02', executions: 45, successRate: 94 }
            ],
            weekly: [
              { week: '2024-W01', executions: 300, successRate: 95 },
              { week: '2024-W02', executions: 320, successRate: 96 }
            ]
          }
        })
      };

      CrmAutomation.findById = jest.fn().mockResolvedValue(mockAutomation);
    });

    describe('GET /metrics/crm/automations/:automationId/metrics', () => {
      it('should return automation metrics successfully', async () => {
        const automationId = 'automation123';

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/metrics`)
          .set('Authorization', authToken)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.totalExecutions).toBe(1000);
        expect(response.body.data.successfulExecutions).toBe(950);
        expect(response.body.data.failedExecutions).toBe(50);
        expect(response.body.data.successRate).toBe(95);
        expect(response.body.data.performanceScore).toBe(88);
        expect(CrmAutomation.getMetrics).toHaveBeenCalledWith(automationId);
      });

      it('should handle non-existent automation metrics', async () => {
        const automationId = 'nonexistent';

        CrmAutomation.getMetrics = jest.fn().mockRejectedValue(new Error('Automation not found'));

        const response = await request(app)
          .get(`/metrics/crm/automations/${automationId}/metrics`)
          .set('Authorization', authToken)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('AUTOMATION_NOT_FOUND');
      });
    });
  });

  describe('Bulk Automation Operations', () => {
    describe('POST /metrics/crm/automations/bulk/update', () => {
      it('should bulk update automations successfully', async () => {
        const bulkData = {
          automationIds: ['automation1', 'automation2', 'automation3'],
          updateData: { status: 'active', priority: 'high' }
        };

        CrmAutomation.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/update')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.updatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully updated 3 automations');
        expect(CrmAutomation.updateMany).toHaveBeenCalledWith(
          { _id: { $in: bulkData.automationIds }, deleted: false },
          { ...bulkData.updateData, updatedAt: expect.any(Date) }
        );
      });

      it('should validate bulk update data', async () => {
        const invalidData = {
          updateData: { status: 'active' }
          // Missing automationIds
        };

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/update')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/automations/bulk/activate', () => {
      it('should bulk activate automations successfully', async () => {
        const bulkData = {
          automationIds: ['automation1', 'automation2', 'automation3']
        };

        const mockAutomations = [
          { _id: 'automation1', activate: jest.fn().mockResolvedValue({}) },
          { _id: 'automation2', activate: jest.fn().mockResolvedValue({}) },
          { _id: 'automation3', activate: jest.fn().mockResolvedValue({}) }
        ];

        CrmAutomation.find = jest.fn().mockResolvedValue(mockAutomations);

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/activate')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.activatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully activated 3 automations');
        
        // Verify activate was called on each automation
        mockAutomations.forEach(automation => {
          expect(automation.activate).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk activation data', async () => {
        const invalidData = {
          // Missing automationIds
        };

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/activate')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/automations/bulk/deactivate', () => {
      it('should bulk deactivate automations successfully', async () => {
        const bulkData = {
          automationIds: ['automation1', 'automation2', 'automation3']
        };

        const mockAutomations = [
          { _id: 'automation1', deactivate: jest.fn().mockResolvedValue({}) },
          { _id: 'automation2', deactivate: jest.fn().mockResolvedValue({}) },
          { _id: 'automation3', deactivate: jest.fn().mockResolvedValue({}) }
        ];

        CrmAutomation.find = jest.fn().mockResolvedValue(mockAutomations);

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/deactivate')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.deactivatedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully deactivated 3 automations');
        
        // Verify deactivate was called on each automation
        mockAutomations.forEach(automation => {
          expect(automation.deactivate).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk deactivation data', async () => {
        const invalidData = {
          // Missing automationIds
        };

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/deactivate')
          .set('Authorization', authToken)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /metrics/crm/automations/bulk/delete', () => {
      it('should bulk delete automations successfully', async () => {
        const bulkData = {
          automationIds: ['automation1', 'automation2', 'automation3']
        };

        const mockAutomations = [
          { _id: 'automation1', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'automation2', softDelete: jest.fn().mockResolvedValue({}) },
          { _id: 'automation3', softDelete: jest.fn().mockResolvedValue({}) }
        ];

        CrmAutomation.find = jest.fn().mockResolvedValue(mockAutomations);

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/delete')
          .set('Authorization', authToken)
          .send(bulkData)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data.deletedCount).toBe(3);
        expect(response.body.data.message).toContain('Successfully deleted 3 automations');
        
        // Verify soft delete was called on each automation
        mockAutomations.forEach(automation => {
          expect(automation.softDelete).toHaveBeenCalledWith(testUser._id);
        });
      });

      it('should validate bulk delete data', async () => {
        const invalidData = {
          // Missing automationIds
        };

        const response = await request(app)
          .post('/metrics/crm/automations/bulk/delete')
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
        { method: 'get', path: '/metrics/crm/automations' },
        { method: 'post', path: '/metrics/crm/automations' },
        { method: 'get', path: '/metrics/crm/automations/automation123' },
        { method: 'put', path: '/metrics/crm/automations/automation123' },
        { method: 'delete', path: '/metrics/crm/automations/automation123' },
        { method: 'post', path: '/metrics/crm/automations/automation123/activate' },
        { method: 'post', path: '/metrics/crm/automations/automation123/deactivate' },
        { method: 'post', path: '/metrics/crm/automations/automation123/execute' }
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
        .get('/metrics/crm/automations')
        .set('Authorization', 'Bearer low-role-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      CrmAutomation.findActive = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/metrics/crm/automations')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/metrics/crm/automations')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });

    it('should handle concurrent automation operations', async () => {
      const automationId = 'automation123';
      
      const mockAutomation = {
        _id: automationId,
        save: jest.fn().mockResolvedValue({})
      };

      CrmAutomation.findByIdAndUpdate = jest.fn().mockResolvedValue(mockAutomation);

      // Make multiple concurrent requests
      const requests = [
        request(app).put(`/metrics/crm/automations/${automationId}`).send({ name: 'Concurrent 1' }),
        request(app).post(`/metrics/crm/automations/${automationId}/activate`).send({}),
        request(app).post(`/metrics/crm/automations/${automationId}/execute`).send({ testMode: true })
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
      CrmAutomation.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      CrmAutomation.countDocuments = jest.fn().mockResolvedValue(0);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/metrics/crm/automations')
        .set('Authorization', authToken)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle large automation lists efficiently', async () => {
      // Mock large dataset
      const largeAutomationList = Array(1000).fill().map((_, i) => ({
        _id: `automation${i}`,
        name: `Automation ${i}`,
        category: 'onboarding',
        status: 'active'
      }));

      CrmAutomation.findActive = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(largeAutomationList)
            })
          })
        })
      });
      CrmAutomation.countDocuments = jest.fn().mockResolvedValue(1000);

      const startTime = Date.now();
      
      const response = await request(app)
          .get('/metrics/crm/automations?limit=1000')
          .set('Authorization', authToken)
          .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.automations).toHaveLength(1000);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });
  });
});