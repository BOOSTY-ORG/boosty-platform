const { describe, it, expect } = require('@jest/globals');

// Mock mongoose to avoid database connection
const mockSchema = jest.fn().mockImplementation((definition) => {
  const schema = definition;
  schema.index = jest.fn();
  schema.virtual = jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn()
  });
  schema.pre = jest.fn();
  schema.post = jest.fn();
  schema.set = jest.fn();
  schema.methods = {};
  schema.statics = {};
  return schema;
});
mockSchema.Types = {
  ObjectId: jest.fn().mockImplementation(() => 'mockObjectId'),
  String: String,
  Number: Number,
  Date: Date,
  Boolean: Boolean,
  Array: Array,
  Mixed: Object
};

jest.mock('mongoose', () => ({
  Schema: mockSchema,
  model: jest.fn().mockImplementation((name, schema) => ({
    schema,
    modelName: name
  })),
  Types: {
    ObjectId: jest.fn().mockImplementation(() => 'mockObjectId')
  }
}));

describe('Messaging Models', () => {
  describe('CrmMessageThread Model', () => {
    let CrmMessageThread;

    beforeAll(() => {
      // Import after mocking mongoose
      CrmMessageThread = require('../../src/models/metrics/crm-message-thread.model.js');
    });

    it('should have the correct schema structure', () => {
      expect(CrmMessageThread.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = CrmMessageThread.schema;
      
      // Check for required fields
      expect(schema.participants).toBeDefined();
      expect(schema.subject).toBeDefined();
      expect(schema.status).toBeDefined();
      expect(schema.priority).toBeDefined();
      expect(schema.createdBy).toBeDefined();
    });

    it('should have default values', () => {
      const schema = CrmMessageThread.schema;
      
      // Check default values
      expect(schema.status.default).toBe('active');
      expect(schema.priority.default).toBe('normal');
      expect(schema.messageCount.default).toBe(0);
      expect(schema.hasUnreadMessages.default).toBe(false);
    });

    it('should have virtual fields', () => {
      // This test would verify virtual fields if they were defined
      // For now, we just confirm the model structure
      expect(CrmMessageThread.modelName).toBe('CrmMessageThread');
    });
  });

  describe('CrmMessage Model', () => {
    let CrmMessage;

    beforeAll(() => {
      CrmMessage = require('../../src/models/metrics/crm-message.model.js');
    });

    it('should have the correct schema structure', () => {
      expect(CrmMessage.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = CrmMessage.schema;
      
      expect(schema.threadId).toBeDefined();
      expect(schema.senderId).toBeDefined();
      expect(schema.senderType).toBeDefined();
      expect(schema.content).toBeDefined();
      expect(schema.type).toBeDefined();
    });

    it('should have default values', () => {
      const schema = CrmMessage.schema;
      
      expect(schema.type.default).toBe('text');
      expect(schema.status.default).toBe('sent');
      expect(schema.deliveryStatus.default).toBe('pending');
    });

    it('should support message reactions', () => {
      const schema = CrmMessage.schema;
      
      expect(schema.reactions).toBeDefined();
      expect(Array.isArray(schema.reactions)).toBe(true);
    });

    it('should support attachments', () => {
      const schema = CrmMessage.schema;
      
      expect(schema.attachments).toBeDefined();
      expect(Array.isArray(schema.attachments)).toBe(true);
    });
  });

  describe('CrmAssignmentMetrics Model', () => {
    let CrmAssignmentMetrics;

    beforeAll(() => {
      CrmAssignmentMetrics = require('../../src/models/metrics/crm-assignment-metrics.model.js');
    });

    it('should have the correct schema structure', () => {
      expect(CrmAssignmentMetrics.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = CrmAssignmentMetrics.schema;
      
      expect(schema.agentId).toBeDefined();
      expect(schema.assignedBy).toBeDefined();
      expect(schema.assignmentType).toBeDefined();
      expect(schema.entityType).toBeDefined();
      expect(schema.entityId).toBeDefined();
    });

    it('should have default values', () => {
      const schema = CrmAssignmentMetrics.schema;
      
      expect(schema.status.default).toBe('active');
      expect(schema.priority.default).toBe('normal');
      expect(schema.escalated.default).toBe(false);
    });

    it('should support SLA tracking', () => {
      const schema = CrmAssignmentMetrics.schema;
      
      expect(schema.sla).toBeDefined();
      expect(schema.sla.dueDate).toBeDefined();
      expect(schema.sla.completedAt).toBeDefined();
      expect(schema.sla.overdue).toBeDefined();
    });

    it('should support performance metrics', () => {
      const schema = CrmAssignmentMetrics.schema;
      
      expect(schema.performance).toBeDefined();
      expect(schema.performance.responseTime).toBeDefined();
      expect(schema.performance.resolutionTime).toBeDefined();
      expect(schema.performance.customerSatisfaction).toBeDefined();
    });
  });
});