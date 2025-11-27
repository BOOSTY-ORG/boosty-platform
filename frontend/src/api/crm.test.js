/**
 * CRM API Tests
 * 
 * This file contains comprehensive tests for the CRM API functions.
 * Tests cover all CRUD operations, error handling, and edge cases.
 */

import { crmAPI } from './crm.js';

// Mock the main API module
const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.mock('./index.js', () => ({
  default: mockApi
}));

import api from './index.js';

describe('CRM API Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('CRM Overview', () => {
    it('should get CRM overview', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            summary: {
              totalContacts: 100,
              totalCommunications: 500,
              activeAutomations: 10,
              approvedTemplates: 25
            },
            modules: {
              communications: { endpoint: '/metrics/crm/communications' },
              contacts: { endpoint: '/metrics/crm/contacts' },
              templates: { endpoint: '/metrics/crm/templates' },
              automations: { endpoint: '/metrics/crm/automations' }
            }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);
  
      const result = await crmAPI.getCRMOverview();
  
      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm', { params: {} });
      expect(result).toEqual(mockResponse);
    });

    it('should get CRM overview with parameters', async () => {
      const params = { dateRange: 'last_30_days' };
      const mockResponse = {
        data: {
          success: true,
          data: { summary: { totalContacts: 50 } }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCRMOverview(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should check CRM health', async () => {
      const mockResponse = {
        data: {
          status: 'healthy',
          service: 'crm-api',
          version: '1.0.0'
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCRMHealth();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/health');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Communications', () => {
    it('should get communication metrics', async () => {
      const params = { dateRange: 'last_7_days' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            summary: { totalCommunications: 100 },
            breakdowns: { channel: { email: 60, sms: 40 } },
            performance: { averageEngagementScore: 75 }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCommunicationMetrics(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get communications list with pagination', async () => {
      const params = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', subject: 'Test Email 1', channel: 'email' },
            { id: '2', subject: 'Test SMS 1', channel: 'sms' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCommunicationsList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications/list', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should search communications', async () => {
      const query = 'test';
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', subject: 'Test Subject', content: 'Test content' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.searchCommunications(query, params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications/search', {
        params: { q: query, ...params }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should get communication by ID', async () => {
      const communicationId = 'comm-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: communicationId,
            subject: 'Test Communication',
            channel: 'email',
            status: 'sent'
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCommunicationById(communicationId);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/communications/${communicationId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should create a new communication', async () => {
      const communicationData = {
        communicationId: 'comm-new-001',
        entityType: 'contact',
        entityId: 'contact-123',
        interactionType: 'outbound',
        channel: 'email',
        direction: 'outbound',
        content: 'Test communication content',
        agentId: 'agent-123'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'comm-456',
            ...communicationData,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.createCommunication(communicationData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/communications', communicationData);
      expect(result).toEqual(mockResponse);
    });

    it('should update communication', async () => {
      const communicationId = 'comm-123';
      const updateData = {
        followUpRequired: true,
        followUpDate: new Date().toISOString(),
        followUpNotes: 'Test follow-up notes'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: communicationId,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await crmAPI.updateCommunication(communicationId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/metrics/crm/communications/${communicationId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete communication', async () => {
      const communicationId = 'comm-123';
      const mockResponse = {
        data: {
          success: true,
          data: { message: 'Communication deleted successfully' }
        }
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await crmAPI.deleteCommunication(communicationId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/metrics/crm/communications/${communicationId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should mark response as received', async () => {
      const communicationId = 'comm-123';
      const responseData = {
        responseDate: new Date().toISOString(),
        notes: 'Customer responded positively'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: communicationId,
            responseReceived: true,
            responseReceivedAt: responseData.responseDate
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.markResponseReceived(communicationId, responseData);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/communications/${communicationId}/response-received`,
        responseData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should add follow-up to communication', async () => {
      const communicationId = 'comm-123';
      const followUpData = {
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Follow up with customer'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: communicationId,
            followUpRequired: true,
            followUpDate: followUpData.followUpDate,
            followUpNotes: followUpData.notes
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.addFollowUp(communicationId, followUpData);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/communications/${communicationId}/follow-up`,
        followUpData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should complete follow-up', async () => {
      const communicationId = 'comm-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: communicationId,
            followUpRequired: false,
            followUpCompleted: true
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.completeFollowUp(communicationId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/communications/${communicationId}/follow-up/complete`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get communications by entity', async () => {
      const entityType = 'contact';
      const entityId = 'contact-123';
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 'comm-1', entityType, entityId },
            { id: 'comm-2', entityType, entityId }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getCommunicationsByEntity(entityType, entityId, params);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/metrics/crm/communications/entity/${entityType}/${entityId}`,
        { params }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get overdue responses', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 'comm-1', responseRequired: true, responseDeadline: '2023-01-01' },
            { id: 'comm-2', responseRequired: true, responseDeadline: '2023-01-02' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getOverdueResponses();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications/overdue/responses');
      expect(result).toEqual(mockResponse);
    });

    it('should get overdue follow-ups', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: 'comm-1', followUpRequired: true, followUpDate: '2023-01-01' },
            { id: 'comm-2', followUpRequired: true, followUpDate: '2023-01-02' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getOverdueFollowUps();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications/overdue/follow-ups');
      expect(result).toEqual(mockResponse);
    });

    it('should get agent workload', async () => {
      const agentId = 'agent-123';
      const params = { startDate: '2023-01-01', endDate: '2023-01-31' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { interactionType: 'email', count: 50, avgDuration: 300 },
            { interactionType: 'phone', count: 25, avgDuration: 600 }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAgentWorkload(agentId, params);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/metrics/crm/communications/agent/${agentId}/workload`,
        { params }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should bulk update communications', async () => {
      const communicationIds = ['comm-1', 'comm-2', 'comm-3'];
      const updateData = { status: 'completed', assignedTo: 'agent-456' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedCount: 3,
            message: 'Successfully updated 3 communications'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkUpdateCommunications(communicationIds, updateData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/communications/bulk/update', {
        communicationIds,
        updateData
      });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk delete communications', async () => {
      const communicationIds = ['comm-1', 'comm-2', 'comm-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            deletedCount: 3,
            message: 'Successfully deleted 3 communications'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkDeleteCommunications(communicationIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/communications/bulk/delete', {
        communicationIds
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Contacts', () => {
    it('should get contact metrics', async () => {
      const params = { dateRange: 'last_30_days' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            summary: { totalContacts: 200, activeContacts: 150 },
            breakdowns: { contactType: { lead: 80, customer: 120 } },
            performance: { averageEngagementScore: 65 }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getContactMetrics(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get contacts list with pagination', async () => {
      const params = { page: 1, limit: 20, contactType: 'lead' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getContactsList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/list', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should search contacts', async () => {
      const query = 'john';
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.searchContacts(query, params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/search', {
        params: { q: query, ...params }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create a new contact', async () => {
      const contactData = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        phone: '+1234567890',
        contactType: 'lead',
        contactSource: 'website'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'contact-456',
            ...contactData,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.createContact(contactData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts', contactData);
      expect(result).toEqual(mockResponse);
    });

    it('should update contact', async () => {
      const contactId = 'contact-123';
      const updateData = {
        phone: '+9876543210',
        company: 'New Company',
        jobTitle: 'Senior Developer'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await crmAPI.updateContact(contactId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/metrics/crm/contacts/${contactId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete contact', async () => {
      const contactId = 'contact-123';
      const mockResponse = {
        data: {
          success: true,
          data: { message: 'Contact deleted successfully' }
        }
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await crmAPI.deleteContact(contactId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/metrics/crm/contacts/${contactId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should update contact engagement', async () => {
      const contactId = 'contact-123';
      const engagementData = {
        totalCommunications: 10,
        lastCommunicationDate: new Date().toISOString(),
        opened: true,
        clicked: true
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            engagement: engagementData,
            updatedAt: new Date().toISOString()
          }
        }
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await crmAPI.updateContactEngagement(contactId, engagementData);

      expect(mockApi.put).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/engagement`,
        engagementData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should give marketing consent', async () => {
      const contactId = 'contact-123';
      const consentData = { method: 'email' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            consent: { marketing: true, marketingGivenAt: new Date().toISOString() }
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.giveMarketingConsent(contactId, consentData);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/consent/marketing`,
        consentData
      );
      expect(result).toEqual(mockResponse);
    });

    it('should withdraw consent', async () => {
      const contactId = 'contact-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            consent: { marketing: false, consentWithdrawn: true }
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.withdrawConsent(contactId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/consent/withdraw`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should assign contact to user', async () => {
      const contactId = 'contact-123';
      const userId = 'user-456';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            assignedTo: userId,
            assignedDate: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.assignContact(contactId, userId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/assign`,
        { userId }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should add tag to contact', async () => {
      const contactId = 'contact-123';
      const tag = 'high-value';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            tags: ['lead', 'high-value']
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.addContactTag(contactId, tag);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/tags`,
        { tag }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should remove tag from contact', async () => {
      const contactId = 'contact-123';
      const tag = 'low-priority';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: contactId,
            tags: ['lead', 'high-value']
          }
        }
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await crmAPI.removeContactTag(contactId, tag);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/metrics/crm/contacts/${contactId}/tags`,
        { data: { tag } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should find contact by email', async () => {
      const email = 'john.doe@example.com';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'contact-123',
            firstName: 'John',
            lastName: 'Doe',
            email
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.findContactByEmail(email);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/contacts/email/${email}`);
      expect(result).toEqual(mockResponse);
    });

    it('should get high value leads', async () => {
      const params = { limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', leadScore: 95, firstName: 'John', email: 'john@example.com' },
            { id: '2', leadScore: 88, firstName: 'Jane', email: 'jane@example.com' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getHighValueLeads(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/high-value-leads', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get unassigned contacts', async () => {
      const params = { contactType: 'lead' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', firstName: 'Unassigned1', assignedTo: null },
            { id: '2', firstName: 'Unassigned2', assignedTo: null }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getUnassignedContacts(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/unassigned', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get contacts needing follow-up', async () => {
      const params = { days: 7 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', firstName: 'FollowUp1', lastContactDate: '2023-01-01' },
            { id: '2', firstName: 'FollowUp2', lastContactDate: '2023-01-02' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getContactsNeedingFollowUp(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/follow-up-needed', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should import contacts in bulk', async () => {
      const contacts = [
        { firstName: 'Import1', lastName: 'Test', email: 'import1@example.com' },
        { firstName: 'Import2', lastName: 'Test', email: 'import2@example.com' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: {
            imported: 2,
            failed: 0,
            message: 'Successfully imported 2 contacts'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.importContacts(contacts);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts/import', { contacts });
      expect(result).toEqual(mockResponse);
    });

    it('should export contacts', async () => {
      const params = { format: 'csv', contactType: 'lead' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            downloadUrl: 'https://example.com/exports/contacts.csv',
            exportedCount: 100
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.exportContacts(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/export', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should find duplicate contacts', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              duplicates: [
                { id: '1', email: 'duplicate@example.com', firstName: 'John' },
                { id: '2', email: 'duplicate@example.com', firstName: 'Jon' }
              ]
            }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.findDuplicateContacts();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/duplicates');
      expect(result).toEqual(mockResponse);
    });

    it('should merge duplicate contacts', async () => {
      const primaryContactId = 'contact-1';
      const duplicateContactIds = ['contact-2', 'contact-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            mergedContact: { id: primaryContactId, firstName: 'John' },
            mergedCount: 2
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.mergeDuplicateContacts(primaryContactId, duplicateContactIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts/merge', {
        primaryContactId,
        duplicateContactIds
      });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk update contacts', async () => {
      const contactIds = ['contact-1', 'contact-2', 'contact-3'];
      const updateData = { tags: ['updated'], status: 'active' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            updatedCount: 3,
            message: 'Successfully updated 3 contacts'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkUpdateContacts(contactIds, updateData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts/bulk/update', {
        contactIds,
        updateData
      });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk assign contacts', async () => {
      const contactIds = ['contact-1', 'contact-2', 'contact-3'];
      const userId = 'user-456';
      const mockResponse = {
        data: {
          success: true,
          data: {
            assignedCount: 3,
            message: 'Successfully assigned 3 contacts'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkAssignContacts(contactIds, userId);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts/bulk/assign', {
        contactIds,
        userId
      });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk delete contacts', async () => {
      const contactIds = ['contact-1', 'contact-2', 'contact-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            deletedCount: 3,
            message: 'Successfully deleted 3 contacts'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkDeleteContacts(contactIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/contacts/bulk/delete', {
        contactIds
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Templates', () => {
    it('should get template metrics', async () => {
      const params = { dateRange: 'last_30_days' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            summary: { totalTemplates: 50, approvedTemplates: 35 },
            breakdowns: { category: { welcome: 15, marketing: 20 } },
            performance: { averageOpenRate: 45, averageClickRate: 12 }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplateMetrics(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/templates', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get templates list with pagination', async () => {
      const params = { page: 1, limit: 20, status: 'approved' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Email', category: 'welcome', status: 'approved' },
            { id: '2', name: 'Newsletter', category: 'marketing', status: 'approved' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplatesList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/templates/list', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should search templates', async () => {
      const query = 'welcome';
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Email', description: 'Welcome new users' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.searchTemplates(query, params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/templates/search', {
        params: { q: query, ...params }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should get template by ID', async () => {
      const templateId = 'template-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: templateId,
            name: 'Welcome Template',
            category: 'welcome',
            body: 'Hello {{firstName}}, welcome to our platform!'
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplateById(templateId);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should create a new template', async () => {
      const templateData = {
        name: 'New Template',
        description: 'Test template description',
        category: 'marketing',
        channel: 'email',
        type: 'transactional',
        subject: 'Test Subject',
        body: 'Test body content',
        version: '1.0.0'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'template-456',
            ...templateData,
            status: 'draft',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.createTemplate(templateData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/templates', templateData);
      expect(result).toEqual(mockResponse);
    });

    it('should update template', async () => {
      const templateId = 'template-123';
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        subject: 'Updated Subject'
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: templateId,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await crmAPI.updateTemplate(templateId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete template', async () => {
      const templateId = 'template-123';
      const mockResponse = {
        data: {
          success: true,
          data: { message: 'Template deleted successfully' }
        }
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await crmAPI.deleteTemplate(templateId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should approve template', async () => {
      const templateId = 'template-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: templateId,
            status: 'approved',
            approvedAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.approveTemplate(templateId);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}/approve`);
      expect(result).toEqual(mockResponse);
    });

    it('should reject template', async () => {
      const templateId = 'template-123';
      const reason = 'Template content is not appropriate';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: templateId,
            status: 'rejected',
            rejectionReason: reason,
            rejectedAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.rejectTemplate(templateId, reason);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}/reject`, { reason });
      expect(result).toEqual(mockResponse);
    });

    it('should create new template version', async () => {
      const templateId = 'template-123';
      const version = '2.0.0';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'template-456',
            version,
            parentTemplate: templateId,
            status: 'draft',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.createTemplateVersion(templateId, version);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}/version`, { version });
      expect(result).toEqual(mockResponse);
    });

    it('should get template preview', async () => {
      const templateId = 'template-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: templateId,
            preview: {
              subject: 'Test Subject',
              html: '<p>Test HTML content</p>',
              text: 'Test text content'
            }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplatePreview(templateId);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/templates/${templateId}/preview`);
      expect(result).toEqual(mockResponse);
    });

    it('should get templates by category', async () => {
      const category = 'welcome';
      const params = { limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Email', category, status: 'approved' },
            { id: '2', name: 'Welcome SMS', category, status: 'approved' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplatesByCategory(category, params);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/templates/category/${category}`, { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get top performing templates', async () => {
      const params = { limit: 5, metric: 'openRate' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Template 1', openRate: 85, clickRate: 25 },
            { id: '2', name: 'Template 2', openRate: 78, clickRate: 22 }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTopPerformingTemplates(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/templates/top-performing', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get template statistics', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            totalTemplates: 100,
            approvedTemplates: 75,
            draftTemplates: 25,
            averageOpenRate: 45,
            averageClickRate: 12,
            totalSent: 10000,
            totalOpens: 4500
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTemplateStats();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/templates/stats');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Automations', () => {
    it('should get automation metrics', async () => {
      const params = { dateRange: 'last_30_days' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            summary: { totalAutomations: 25, activeAutomations: 15 },
            breakdowns: { category: { lead_nurturing: 10, marketing: 15 } },
            performance: { averageSuccessRate: 85, totalExecutions: 5000 }
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationMetrics(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get automations list with pagination', async () => {
      const params = { page: 1, limit: 20, status: 'active' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Automation', category: 'lead_nurturing', enabled: true },
            { id: '2', name: 'Follow-up Automation', category: 'support', enabled: true }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationsList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations/list', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should search automations', async () => {
      const query = 'welcome';
      const params = { page: 1, limit: 10 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Automation', description: 'Welcome new users' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.searchAutomations(query, params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations/search', {
        params: { q: query, ...params }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should get automation by ID', async () => {
      const automationId = 'automation-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: automationId,
            name: 'Welcome Automation',
            category: 'lead_nurturing',
            enabled: true,
            trigger: { type: 'event', event: { name: 'contact_created' } },
            actions: [{ type: 'send_email', templateId: 'template-123' }]
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationById(automationId);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should create a new automation', async () => {
      const automationData = {
        name: 'New Automation',
        description: 'Test automation description',
        category: 'lead_nurturing',
        trigger: {
          type: 'event',
          event: { name: 'contact_created', source: 'crm' }
        },
        actions: [
          {
            name: 'Send Welcome Email',
            type: 'send_email',
            templateId: 'template-123',
            delay: 0,
            delayUnit: 'minutes'
          }
        ]
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: 'automation-456',
            ...automationData,
            status: 'draft',
            enabled: false,
            createdAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.createAutomation(automationData);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/automations', automationData);
      expect(result).toEqual(mockResponse);
    });

    it('should update automation', async () => {
      const automationId = 'automation-123';
      const updateData = {
        name: 'Updated Automation Name',
        description: 'Updated description',
        enabled: true
      };

      const mockResponse = {
        data: {
          success: true,
          data: {
            id: automationId,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      };

      mockApi.put.mockResolvedValue(mockResponse);

      const result = await crmAPI.updateAutomation(automationId, updateData);

      expect(mockApi.put).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}`, updateData);
      expect(result).toEqual(mockResponse);
    });

    it('should delete automation', async () => {
      const automationId = 'automation-123';
      const mockResponse = {
        data: {
          success: true,
          data: { message: 'Automation deleted successfully' }
        }
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await crmAPI.deleteAutomation(automationId);

      expect(mockApi.delete).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}`);
      expect(result).toEqual(mockResponse);
    });

    it('should enable automation', async () => {
      const automationId = 'automation-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: automationId,
            enabled: true,
            status: 'active',
            enabledAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.enableAutomation(automationId);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}/enable`);
      expect(result).toEqual(mockResponse);
    });

    it('should disable automation', async () => {
      const automationId = 'automation-123';
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: automationId,
            enabled: false,
            status: 'paused',
            disabledAt: new Date().toISOString()
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.disableAutomation(automationId);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}/disable`);
      expect(result).toEqual(mockResponse);
    });

    it('should test automation', async () => {
      const automationId = 'automation-123';
      const testData = { contactId: 'test-contact-123' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            testResult: {
              success: true,
              executedActions: 1,
              executionTime: 250,
              message: 'Test executed successfully'
            }
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.testAutomation(automationId, testData);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}/test`, testData);
      expect(result).toEqual(mockResponse);
    });

    it('should execute automation manually', async () => {
      const automationId = 'automation-123';
      const triggerData = { contactId: 'contact-456' };
      const mockResponse = {
        data: {
          success: true,
          data: {
            executionResult: {
              success: true,
              executedActions: 1,
              executionTime: 300,
              contactsProcessed: 1
            }
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.executeAutomation(automationId, triggerData);

      expect(mockApi.post).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}/execute`, triggerData);
      expect(result).toEqual(mockResponse);
    });

    it('should get automation execution history', async () => {
      const automationId = 'automation-123';
      const params = { page: 1, limit: 20 };
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              executedAt: '2023-01-01T10:00:00Z',
              status: 'success',
              contactsProcessed: 10,
              executionTime: 500
            },
            {
              executedAt: '2023-01-02T10:00:00Z',
              status: 'success',
              contactsProcessed: 8,
              executionTime: 450
            }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationHistory(automationId, params);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/automations/${automationId}/history`, { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get automations by category', async () => {
      const category = 'lead_nurturing';
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Welcome Automation', category, enabled: true },
            { id: '2', name: 'Onboarding Automation', category, enabled: true }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationsByCategory(category);

      expect(mockApi.get).toHaveBeenCalledWith(`/metrics/crm/automations/category/${category}`);
      expect(result).toEqual(mockResponse);
    });

    it('should get automations due for execution', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Scheduled Automation 1', nextExecution: '2023-01-01T10:00:00Z' },
            { id: '2', name: 'Scheduled Automation 2', nextExecution: '2023-01-01T11:00:00Z' }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationsDueForExecution();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations/due-for-execution');
      expect(result).toEqual(mockResponse);
    });

    it('should get top performing automations', async () => {
      const params = { limit: 5, metric: 'successRate' };
      const mockResponse = {
        data: {
          success: true,
          data: [
            { id: '1', name: 'Automation 1', successRate: 95, executionCount: 100 },
            { id: '2', name: 'Automation 2', successRate: 92, executionCount: 85 }
          ]
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getTopPerformingAutomations(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations/top-performing', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should get automation statistics', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            totalAutomations: 50,
            activeAutomations: 30,
            pausedAutomations: 15,
            errorAutomations: 5,
            averageSuccessRate: 85,
            totalExecutions: 10000,
            totalSuccesses: 8500,
            totalFailures: 1500
          }
        }
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await crmAPI.getAutomationStats();

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/automations/stats');
      expect(result).toEqual(mockResponse);
    });

    it('should bulk enable automations', async () => {
      const automationIds = ['automation-1', 'automation-2', 'automation-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            enabledCount: 3,
            message: 'Successfully enabled 3 automations'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkEnableAutomations(automationIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/automations/bulk/enable', { automationIds });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk disable automations', async () => {
      const automationIds = ['automation-1', 'automation-2', 'automation-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            disabledCount: 3,
            message: 'Successfully disabled 3 automations'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkDisableAutomations(automationIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/automations/bulk/disable', { automationIds });
      expect(result).toEqual(mockResponse);
    });

    it('should bulk delete automations', async () => {
      const automationIds = ['automation-1', 'automation-2', 'automation-3'];
      const mockResponse = {
        data: {
          success: true,
          data: {
            deletedCount: 3,
            message: 'Successfully deleted 3 automations'
          }
        }
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await crmAPI.bulkDeleteAutomations(automationIds);

      expect(mockApi.post).toHaveBeenCalledWith('/metrics/crm/automations/bulk/delete', { automationIds });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      networkError.response = { status: 0 };
      api.get.mockRejectedValue(networkError);

      await expect(crmAPI.getCRMOverview()).rejects.toThrow('Network Error');
    });

    it('should handle 404 errors', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.response = { status: 404, data: { message: 'Resource not found' } };
      mockApi.get.mockRejectedValue(notFoundError);

      await expect(crmAPI.getCommunicationById('invalid-id')).rejects.toThrow('Not Found');
    });

    it('should handle 500 errors', async () => {
      const serverError = new Error('Server Error');
      serverError.response = { status: 500, data: { message: 'Internal server error' } };
      mockApi.get.mockRejectedValue(serverError);

      await expect(crmAPI.getCommunicationsList()).rejects.toThrow('Server Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ECONNABORTED';
      mockApi.get.mockRejectedValue(timeoutError);

      await expect(crmAPI.getContactsList()).rejects.toThrow('Request timeout');
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Validation Error');
      validationError.response = {
        status: 400,
        data: {
          message: 'Invalid input data',
          errors: [{ field: 'email', message: 'Invalid email format' }]
        }
      };
      mockApi.post.mockRejectedValue(validationError);

      await expect(crmAPI.createContact({ invalid: 'data' })).rejects.toThrow('Validation Error');
    });
  });

  describe('Data Transformation', () => {
    it('should handle date parameters correctly', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const params = { startDate, endDate };

      const mockResponse = { data: { success: true, data: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      await crmAPI.getCommunicationMetrics(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/communications', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
    });

    it('should handle array parameters correctly', async () => {
      const tags = ['vip', 'high-value', 'priority'];
      const params = { tags };

      const mockResponse = { data: { success: true, data: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      await crmAPI.getContactsList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/list', { params });
    });

    it('should handle nested object parameters correctly', async () => {
      const filters = {
        engagement: { minScore: 50 },
        consent: { marketing: true },
        metrics: { totalCommunications: { gte: 5 } }
      };
      const params = { filters };

      const mockResponse = { data: { success: true, data: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      await crmAPI.getContactsList(params);

      expect(mockApi.get).toHaveBeenCalledWith('/metrics/crm/contacts/list', { params });
    });
  });
});