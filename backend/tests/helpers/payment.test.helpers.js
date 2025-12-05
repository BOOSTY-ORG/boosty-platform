import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

/**
 * Payment Test Helpers
 * Provides utilities and mock data generators for payment testing
 */

/**
 * Generate mock payment intent data
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock payment intent data
 */
export const generateMockPaymentIntent = (overrides = {}) => {
  const userId = new mongoose.Types.ObjectId();
  const investmentId = new mongoose.Types.ObjectId();
  
  return {
    intentId: `INT${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    type: faker.helpers.arrayElement(['investment', 'repayment', 'fee', 'refund', 'penalty']),
    amount: faker.datatype.number({ min: 1000, max: 1000000 }),
    currency: 'NGN',
    status: faker.helpers.arrayElement(['created', 'initialized', 'pending', 'completed', 'failed', 'cancelled', 'expired']),
    userId,
    userEmail: faker.internet.email(),
    preferredPaymentMethod: faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd', 'all']),
    availablePaymentMethods: [faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd'])],
    relatedApplication: new mongoose.Types.ObjectId(),
    relatedInvestment: investmentId,
    gatewayReference: faker.datatype.uuid(),
    gatewayTransactionId: faker.datatype.uuid(),
    gatewayAuthorizationUrl: faker.internet.url(),
    gatewayAccessCode: faker.datatype.string(32),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    callbackUrl: faker.internet.url(),
    returnUrl: faker.internet.url(),
    metadata: {
      source: 'test',
      userAgent: faker.internet.userAgent(),
      ipAddress: faker.internet.ip()
    },
    splitConfig: {
      type: faker.helpers.arrayElement(['percentage', 'flat']),
      splitCode: faker.datatype.string(10),
      subaccounts: [
        {
          subaccountId: faker.datatype.string(10),
          subaccountName: faker.company.name(),
          share: faker.datatype.number({ min: 1, max: 100 }),
          amount: faker.datatype.number({ min: 100, max: 10000 })
        }
      ]
    },
    feeStructure: {
      processingFee: faker.datatype.number({ min: 0, max: 500 }),
      platformFee: faker.datatype.number({ min: 0, max: 1000 }),
      transactionFee: faker.datatype.number({ min: 0, max: 200 }),
      totalFees: faker.datatype.number({ min: 0, max: 1700 })
    },
    retryCount: faker.datatype.number({ min: 0, max: 3 }),
    maxRetries: 3,
    nextRetryAt: faker.date.future(),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    deviceId: faker.datatype.uuid(),
    kycRequired: faker.datatype.boolean(),
    kycVerified: faker.datatype.boolean(),
    notifications: {
      emailEnabled: faker.datatype.boolean(),
      smsEnabled: faker.datatype.boolean(),
      pushEnabled: faker.datatype.boolean()
    },
    description: faker.lorem.sentence(),
    tags: [faker.lorem.word(), faker.lorem.word()],
    priority: faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
    ...overrides
  };
};

/**
 * Generate mock payment transaction data
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock payment transaction data
 */
export const generateMockPaymentTransaction = (overrides = {}) => {
  const fromEntityId = new mongoose.Types.ObjectId();
  const toEntityId = new mongoose.Types.ObjectId();
  
  return {
    transactionId: `TXN${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    type: faker.helpers.arrayElement(['investment', 'repayment', 'fee', 'refund', 'penalty']),
    fromEntity: faker.helpers.arrayElement(['investor', 'user', 'system']),
    toEntity: faker.helpers.arrayElement(['investor', 'user', 'system']),
    fromEntityId,
    toEntityId,
    amount: faker.datatype.number({ min: 1000, max: 1000000 }),
    currency: 'NGN',
    status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded']),
    paymentMethod: faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd', 'wallet', 'auto_debit']),
    paymentReference: faker.datatype.uuid(),
    relatedApplication: new mongoose.Types.ObjectId(),
    relatedInvestment: new mongoose.Types.ObjectId(),
    fees: {
      processingFee: faker.datatype.number({ min: 0, max: 500 }),
      platformFee: faker.datatype.number({ min: 0, max: 1000 }),
      transactionFee: faker.datatype.number({ min: 0, max: 200 })
    },
    metadata: {
      source: 'test',
      userAgent: faker.internet.userAgent(),
      ipAddress: faker.internet.ip()
    },
    processedAt: faker.date.recent(),
    completedAt: faker.date.recent(),
    failedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    failureReason: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    paystackReference: faker.datatype.uuid(),
    paystackTransactionId: faker.datatype.uuid(),
    authorizationCode: faker.datatype.string(32),
    last4: faker.datatype.string(4),
    expiryMonth: faker.datatype.string(2),
    expiryYear: faker.datatype.string(4),
    cardType: faker.helpers.arrayElement(['visa', 'mastercard', 'verve']),
    bank: faker.company.name(),
    customerCode: faker.datatype.string(10),
    channel: faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd']),
    splitCode: faker.datatype.string(10),
    splitPayments: [
      {
        subaccountId: faker.datatype.string(10),
        subaccountName: faker.company.name(),
        amount: faker.datatype.number({ min: 100, max: 10000 }),
        percentage: faker.datatype.number({ min: 1, max: 100 }),
        status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
        transferReference: faker.datatype.uuid(),
        processedAt: faker.date.recent(),
        failureReason: faker.datatype.boolean() ? faker.lorem.sentence() : undefined
      }
    ],
    subscriptionId: faker.datatype.uuid(),
    subscriptionPlan: faker.lorem.word(),
    nextPaymentDate: faker.date.future(),
    subscriptionStatus: faker.helpers.arrayElement(['active', 'paused', 'cancelled', 'completed']),
    disbursementStatus: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
    disbursementReference: faker.datatype.uuid(),
    disbursementDate: faker.date.recent(),
    disbursementFailureReason: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    kycVerified: faker.datatype.boolean(),
    complianceChecked: faker.datatype.boolean(),
    amlScreeningPassed: faker.datatype.boolean(),
    riskScore: faker.datatype.number({ min: 0, max: 100 }),
    complianceNotes: faker.lorem.sentence(),
    fraudFlag: faker.datatype.boolean(),
    fraudReason: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    fraudReviewed: faker.datatype.boolean(),
    fraudReviewedBy: new mongoose.Types.ObjectId(),
    refundableAmount: faker.datatype.number({ min: 0, max: 100000 }),
    refundStatus: faker.helpers.arrayElement(['none', 'requested', 'processing', 'completed', 'failed']),
    refundAmount: faker.datatype.number({ min: 0, max: 100000 }),
    refundReason: faker.lorem.sentence(),
    refundReference: faker.datatype.uuid(),
    refundedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    deviceId: faker.datatype.uuid(),
    location: {
      country: faker.address.country(),
      city: faker.address.city(),
      coordinates: {
        latitude: faker.address.latitude(),
        longitude: faker.address.longitude()
      }
    },
    ...overrides
  };
};

/**
 * Generate mock payout data
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock payout data
 */
export const generateMockPayout = (overrides = {}) => {
  const recipientId = new mongoose.Types.ObjectId();
  
  return {
    payoutId: `PAY${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    type: faker.helpers.arrayElement(['roi_payment', 'profit_sharing', 'dividend', 'commission', 'bonus']),
    amount: faker.datatype.number({ min: 1000, max: 1000000 }),
    currency: 'NGN',
    status: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    recipientId,
    recipientType: faker.helpers.arrayElement(['investor', 'affiliate', 'employee', 'system']),
    recipientEmail: faker.internet.email(),
    recipientAccount: {
      accountNumber: faker.datatype.string(10),
      bankCode: faker.datatype.string(3),
      bankName: faker.company.name(),
      accountName: faker.name.fullName()
    },
    relatedInvestment: new mongoose.Types.ObjectId(),
    relatedTransaction: new mongoose.Types.ObjectId(),
    relatedProject: new mongoose.Types.ObjectId(),
    gatewayReference: faker.datatype.uuid(),
    gatewayTransferId: faker.datatype.uuid(),
    gatewayRecipientCode: faker.datatype.string(10),
    gatewayResponse: {
      status: 'success',
      message: 'Transfer completed successfully'
    },
    scheduledFor: faker.date.future(),
    processedAt: faker.date.recent(),
    completedAt: faker.date.recent(),
    failedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    calculationBasis: {
      investmentAmount: faker.datatype.number({ min: 10000, max: 1000000 }),
      investmentPeriod: faker.datatype.number({ min: 1, max: 60 }),
      interestRate: faker.datatype.number({ min: 5, max: 25, precision: 0.1 }),
      roiPercentage: faker.datatype.number({ min: 5, max: 30, precision: 0.1 }),
      profitAmount: faker.datatype.number({ min: 1000, max: 100000 }),
      bonusAmount: faker.datatype.number({ min: 0, max: 10000 }),
      penaltyAmount: faker.datatype.number({ min: 0, max: 5000 })
    },
    fees: {
      processingFee: faker.datatype.number({ min: 0, max: 500 }),
      transferFee: faker.datatype.number({ min: 0, max: 200 }),
      taxWithheld: faker.datatype.number({ min: 0, max: 1000 }),
      platformFee: faker.datatype.number({ min: 0, max: 300 })
    },
    approvalStatus: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
    approvedBy: new mongoose.Types.ObjectId(),
    approvedAt: faker.date.recent(),
    rejectionReason: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    batchId: faker.datatype.uuid(),
    batchStatus: faker.helpers.arrayElement(['individual', 'batch_pending', 'batch_processing', 'batch_completed']),
    kycVerified: faker.datatype.boolean(),
    complianceChecked: faker.datatype.boolean(),
    verifiedAt: faker.date.recent(),
    verificationNotes: faker.lorem.sentence(),
    notificationSent: faker.datatype.boolean(),
    notificationMethod: faker.helpers.arrayElement(['email', 'sms', 'push', 'in_app']),
    notifiedAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    description: faker.lorem.sentence(),
    metadata: {
      source: 'test',
      processedBy: 'test-runner'
    },
    tags: [faker.lorem.word(), faker.lorem.word()],
    priority: faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    processedBy: new mongoose.Types.ObjectId(),
    ...overrides
  };
};

/**
 * Generate mock Paystack API response
 * @param {string} type - Response type (initialize, verify, etc.)
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock Paystack response
 */
export const generateMockPaystackResponse = (type, overrides = {}) => {
  const baseResponse = {
    status: true,
    message: 'Success'
  };

  switch (type) {
    case 'initialize':
      return {
        ...baseResponse,
        data: {
          authorization_url: faker.internet.url(),
          access_code: faker.datatype.string(32),
          reference: faker.datatype.uuid(),
          ...overrides.data
        },
        ...overrides
      };
    
    case 'verify':
      return {
        ...baseResponse,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: 'success',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          message: null,
          gateway_response: 'Successful',
          paid_at: faker.date.recent(),
          created_at: faker.date.past(),
          channel: faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd']),
          currency: 'NGN',
          ip_address: faker.internet.ip(),
          fees: faker.datatype.number({ min: 0, max: 2000 }),
          customer: {
            id: faker.datatype.number({ min: 1000000, max: 9999999 }),
            first_name: faker.name.firstName(),
            last_name: faker.name.lastName(),
            email: faker.internet.email(),
            customer_code: faker.datatype.string(10),
            phone: faker.phone.number(),
            metadata: {},
            risk_action: 'default'
          },
          authorization: {
            authorization_code: faker.datatype.string(32),
            bin: faker.datatype.string(6),
            last4: faker.datatype.string(4),
            exp_month: faker.datatype.string(2),
            exp_year: faker.datatype.string(4),
            card_type: faker.helpers.arrayElement(['visa', 'mastercard', 'verve']),
            bank: faker.company.name(),
            country_code: 'NG',
            brand: faker.helpers.arrayElement(['visa', 'mastercard', 'verve']),
            reusable: faker.datatype.boolean(),
            signature: faker.datatype.string(64)
          },
          plan: {},
          subaccount: {},
          ...overrides.data
        },
        ...overrides
      };
    
    case 'refund':
      return {
        ...baseResponse,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          transaction: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: 'success',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          currency: 'NGN',
          fully_deducted: faker.datatype.boolean(),
          offline_reference: faker.datatype.string(20),
          transfer: {
            code: faker.datatype.string(10),
            reference: faker.datatype.uuid(),
            amount: faker.datatype.number({ min: 100000, max: 10000000 }),
            currency: 'NGN',
            recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
            reason: 'Refund for transaction',
            status: 'success',
            transfer_code: faker.datatype.string(10),
            created_at: faker.date.past()
          },
          createdAt: faker.date.past(),
          ...overrides.data
        },
        ...overrides
      };
    
    case 'transfer':
      return {
        ...baseResponse,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: 'success',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          currency: 'NGN',
          source: 'balance',
          reason: faker.lorem.sentence(),
          recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
          transfers: [
            {
              id: faker.datatype.number({ min: 1000000, max: 9999999 }),
              code: faker.datatype.string(10),
              reference: faker.datatype.uuid(),
              amount: faker.datatype.number({ min: 100000, max: 10000000 }),
              currency: 'NGN',
              recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
              reason: faker.lorem.sentence(),
              status: 'success',
              transfer_code: faker.datatype.string(10),
              created_at: faker.date.past()
            }
          ],
          createdAt: faker.date.past(),
          ...overrides.data
        },
        ...overrides
      };
    
    case 'createRecipient':
      return {
        ...baseResponse,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          type: 'nuban',
          name: faker.name.fullName(),
          description: faker.lorem.sentence(),
          account_number: faker.datatype.string(10),
          bank_code: faker.datatype.string(3),
          bank_name: faker.company.name(),
          currency: 'NGN',
          recipient_code: faker.datatype.string(10),
          metadata: {},
          active: faker.datatype.boolean(),
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
          ...overrides.data
        },
        ...overrides
      };
    
    case 'balance':
      return {
        ...baseResponse,
        data: [
          {
            currency: 'NGN',
            balance: faker.datatype.number({ min: 10000000, max: 100000000 }),
            ledger_balance: faker.datatype.number({ min: 10000000, max: 100000000 })
          },
          ...overrides.data
        ],
        ...overrides
      };
    
    default:
      return baseResponse;
  }
};

/**
 * Generate mock webhook event
 * @param {string} eventType - Webhook event type
 * @param {Object} overrides - Override default values
 * @returns {Object} Mock webhook event
 */
export const generateMockWebhookEvent = (eventType, overrides = {}) => {
  const baseEvent = {
    event: eventType,
    data: {}
  };

  switch (eventType) {
    case 'charge.success':
    case 'charge.failed':
      return {
        ...baseEvent,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: eventType === 'charge.success' ? 'success' : 'failed',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          message: eventType === 'charge.success' ? null : 'Payment failed',
          gateway_response: eventType === 'charge.success' ? 'Successful' : 'Failed',
          paid_at: eventType === 'charge.success' ? faker.date.recent() : undefined,
          created_at: faker.date.past(),
          channel: faker.helpers.arrayElement(['card', 'bank_transfer', 'mobile_money', 'ussd']),
          currency: 'NGN',
          ip_address: faker.internet.ip(),
          fees: faker.datatype.number({ min: 0, max: 2000 }),
          customer: {
            id: faker.datatype.number({ min: 1000000, max: 9999999 }),
            first_name: faker.name.firstName(),
            last_name: faker.name.lastName(),
            email: faker.internet.email(),
            customer_code: faker.datatype.string(10),
            phone: faker.phone.number(),
            metadata: {},
            risk_action: 'default'
          },
          ...overrides.data
        },
        ...overrides
      };
    
    case 'transfer.success':
    case 'transfer.failed':
      return {
        ...baseEvent,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: eventType === 'transfer.success' ? 'success' : 'failed',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          currency: 'NGN',
          source: 'balance',
          reason: faker.lorem.sentence(),
          recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
          transfers: [
            {
              id: faker.datatype.number({ min: 1000000, max: 9999999 }),
              code: faker.datatype.string(10),
              reference: faker.datatype.uuid(),
              amount: faker.datatype.number({ min: 100000, max: 10000000 }),
              currency: 'NGN',
              recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
              reason: faker.lorem.sentence(),
              status: eventType === 'transfer.success' ? 'success' : 'failed',
              transfer_code: faker.datatype.string(10),
              created_at: faker.date.past()
            }
          ],
          createdAt: faker.date.past(),
          ...overrides.data
        },
        ...overrides
      };
    
    case 'refund.processed':
      return {
        ...baseEvent,
        data: {
          id: faker.datatype.number({ min: 1000000, max: 9999999 }),
          transaction: faker.datatype.number({ min: 1000000, max: 9999999 }),
          domain: 'test',
          status: 'success',
          reference: faker.datatype.uuid(),
          amount: faker.datatype.number({ min: 100000, max: 10000000 }),
          currency: 'NGN',
          fully_deducted: faker.datatype.boolean(),
          offline_reference: faker.datatype.string(20),
          transfer: {
            code: faker.datatype.string(10),
            reference: faker.datatype.uuid(),
            amount: faker.datatype.number({ min: 100000, max: 10000000 }),
            currency: 'NGN',
            recipient: faker.datatype.number({ min: 1000000, max: 9999999 }),
            reason: 'Refund for transaction',
            status: 'success',
            transfer_code: faker.datatype.string(10),
            created_at: faker.date.past()
          },
          createdAt: faker.date.past(),
          ...overrides.data
        },
        ...overrides
      };
    
    default:
      return baseEvent;
  }
};

/**
 * Generate webhook signature for testing
 * @param {string} payload - Webhook payload
 * @param {string} secret - Webhook secret
 * @returns {string} HMAC-SHA512 signature
 */
export const generateWebhookSignature = (payload, secret = 'test_webhook_secret') => {
  return crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Setup test database
 * Connects to test database and clears collections
 */
export const setupTestDatabase = async () => {
  // Connect to test database if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/boosty_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }
  
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Cleanup test database
 * Clears all collections and disconnects
 */
export const cleanupTestDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

/**
 * Create authenticated request headers
 * @param {string} token - Auth token
 * @returns {Object} Request headers
 */
export const createAuthHeaders = (token = 'test_token') => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Test-Mode': 'true'
  };
};

/**
 * Create mock request object
 * @param {Object} overrides - Override default request properties
 * @returns {Object} Mock request object
 */
export const createMockRequest = (overrides = {}) => {
  return {
    method: 'GET',
    url: '/api/test',
    headers: {
      'content-type': 'application/json',
      'user-agent': faker.internet.userAgent(),
      'x-forwarded-for': faker.internet.ip()
    },
    body: {},
    query: {},
    params: {},
    auth: {
      _id: new mongoose.Types.ObjectId(),
      email: faker.internet.email(),
      role: 'user'
    },
    user: {
      _id: new mongoose.Types.ObjectId(),
      email: faker.internet.email(),
      role: 'user'
    },
    ip: faker.internet.ip(),
    ...overrides
  };
};

/**
 * Create mock response object
 * @param {Object} overrides - Override default response properties
 * @returns {Object} Mock response object with spies
 */
export const createMockResponse = (overrides = {}) => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    headers: {},
    locals: {},
    ...overrides
  };
  
  return res;
};

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after specified time
 */
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random transaction reference
 * @returns {string} Transaction reference
 */
export const generateTransactionReference = () => {
  return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate random payout reference
 * @returns {string} Payout reference
 */
export const generatePayoutReference = () => {
  return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Mock Paystack service responses
 * @param {Object} service - Paystack service instance
 */
export const mockPaystackService = (service) => {
  service.initializePayment = jest.fn();
  service.verifyTransaction = jest.fn();
  service.processRefund = jest.fn();
  service.createTransfer = jest.fn();
  service.createTransferRecipient = jest.fn();
  service.fetchBalance = jest.fn();
  service.verifyWebhookSignature = jest.fn();
  service.convertGatewayError = jest.fn();
};

export default {
  generateMockPaymentIntent,
  generateMockPaymentTransaction,
  generateMockPayout,
  generateMockPaystackResponse,
  generateMockWebhookEvent,
  generateWebhookSignature,
  setupTestDatabase,
  cleanupTestDatabase,
  createAuthHeaders,
  createMockRequest,
  createMockResponse,
  wait,
  generateTransactionReference,
  generatePayoutReference,
  mockPaystackService
};