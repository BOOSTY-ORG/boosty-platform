import PaystackService from '../../../src/services/payment/paystack.service.js';
import { PaymentError, PaymentErrorType } from '../../../src/utils/payment/paymentErrors.util.js';
import logger from '../../../src/utils/payment/paymentLogger.util.js';
import { generateMockPaystackResponse, generateWebhookSignature } from '../../helpers/payment.test.helpers.js';

// Mock dependencies
jest.mock('../../../src/utils/payment/paymentLogger.util.js');
jest.mock('axios');
jest.mock('crypto');

describe('PaystackService', () => {
  let paystackService;
  let mockAxios;
  let mockCrypto;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.PAYSTACK_SECRET_KEY = 'test_secret_key';
    process.env.PAYSTACK_PUBLIC_KEY = 'test_public_key';
    process.env.PAYSTACK_WEBHOOK_SECRET = 'test_webhook_secret';
    process.env.PAYSTACK_BASE_URL = 'https://api.paystack.test';
    
    // Mock axios
    mockAxios = require('axios');
    mockAxios.create = jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn()
    }));
    
    // Mock crypto
    mockCrypto = require('crypto');
    mockCrypto.createHmac = jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock_signature')
    }));
    mockCrypto.timingSafeEqual = jest.fn().mockReturnValue(true);
    
    paystackService = new PaystackService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_PUBLIC_KEY;
    delete process.env.PAYSTACK_WEBHOOK_SECRET;
    delete process.env.PAYSTACK_BASE_URL;
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(paystackService.baseURL).toBe('https://api.paystack.test');
      expect(paystackService.secretKey).toBe('test_secret_key');
      expect(paystackService.publicKey).toBe('test_public_key');
      expect(paystackService.webhookSecret).toBe('test_webhook_secret');
      expect(paystackService.timeout).toBe(30000);
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.PAYSTACK_BASE_URL;
      delete process.env.PAYSTACK_TIMEOUT;
      
      const service = new PaystackService();
      
      expect(service.baseURL).toBe('https://api.paystack.co');
      expect(service.timeout).toBe(30000);
    });

    it('should throw error when PAYSTACK_SECRET_KEY is not set', () => {
      delete process.env.PAYSTACK_SECRET_KEY;
      
      expect(() => new PaystackService()).toThrow(
        'PAYSTACK_SECRET_KEY environment variable is required'
      );
    });

    it('should create HTTP client with correct configuration', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.paystack.test',
        timeout: 30000,
        headers: {
          'Authorization': 'Bearer test_secret_key',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('initializePayment', () => {
    it('should initialize payment with correct parameters', async () => {
      const mockResponse = generateMockPaystackResponse('initialize');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        amount: 10000,
        email: 'test@example.com',
        reference: 'TXN123456',
        callbackUrl: 'https://example.com/callback',
        metadata: { userId: '123' },
        channels: ['card', 'bank_transfer'],
        splitCode: 'SPLIT123',
        subaccount: 'SUB123',
        currency: 'NGN'
      };

      const result = await paystackService.initializePayment(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/transaction/initialize', {
        amount: 1000000, // Convert to kobo
        email: 'test@example.com',
        reference: 'TXN123456',
        callback_url: 'https://example.com/callback',
        metadata: { userId: '123' },
        channels: ['card', 'bank_transfer'],
        split_code: 'SPLIT123',
        subaccount: 'SUB123',
        currency: 'NGN'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should use default currency when not provided', async () => {
      const mockResponse = generateMockPaystackResponse('initialize');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        amount: 10000,
        email: 'test@example.com',
        reference: 'TXN123456'
      };

      await paystackService.initializePayment(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith(
        '/transaction/initialize',
        expect.objectContaining({
          currency: 'NGN'
        })
      );
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Invalid request' }
        }
      };
      mockAxios.create.mock.results[0].value.post.mockRejectedValue(errorResponse);

      await expect(paystackService.initializePayment({}))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('verifyTransaction', () => {
    it('should verify transaction with correct reference', async () => {
      const mockResponse = generateMockPaystackResponse('verify');
      mockAxios.create.mock.results[0].value.get.mockResolvedValue({ data: mockResponse });
      
      const reference = 'TXN123456';
      const result = await paystackService.verifyTransaction(reference);

      expect(mockAxios.create.mock.results[0].value.get).toHaveBeenCalledWith(
        `/transaction/verify/${reference}`
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors during verification', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: 'Transaction not found' }
        }
      };
      mockAxios.create.mock.results[0].value.get.mockRejectedValue(errorResponse);

      await expect(paystackService.verifyTransaction('invalid_ref'))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('processRefund', () => {
    it('should process refund with correct parameters', async () => {
      const mockResponse = generateMockPaystackResponse('refund');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund',
        customerNote: 'Refund for cancelled order',
        currency: 'NGN'
      };

      const result = await paystackService.processRefund(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/refund', {
        transaction: 'TXN123456',
        amount: 500000, // Convert to kobo
        currency: 'NGN',
        reason: 'Customer requested refund',
        customer_note: 'Refund for cancelled order'
      });

      expect(result).toEqual(mockResponse);
    });

    it('should use default currency when not provided', async () => {
      const mockResponse = generateMockPaystackResponse('refund');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund'
      };

      await paystackService.processRefund(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith(
        '/refund',
        expect.objectContaining({
          currency: 'NGN'
        })
      );
    });
  });

  describe('createTransfer', () => {
    it('should create transfer with correct parameters', async () => {
      const mockResponse = generateMockPaystackResponse('transfer');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        amount: 10000,
        reference: 'TRF123456',
        recipientCode: 'RCP123456',
        reason: 'Monthly payout',
        currency: 'NGN'
      };

      const result = await paystackService.createTransfer(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/transfer', {
        source: 'balance',
        amount: 1000000, // Convert to kobo
        reference: 'TRF123456',
        recipient: 'RCP123456',
        reason: 'Monthly payout',
        currency: 'NGN'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('createTransferRecipient', () => {
    it('should create transfer recipient with correct parameters', async () => {
      const mockResponse = generateMockPaystackResponse('createRecipient');
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        type: 'nuban',
        name: 'John Doe',
        accountNumber: '1234567890',
        bankCode: '057',
        currency: 'NGN',
        email: 'john@example.com',
        description: 'Test recipient'
      };

      const result = await paystackService.createTransferRecipient(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/transferrecipient', {
        type: 'nuban',
        name: 'John Doe',
        account_number: '1234567890',
        bank_code: '057',
        currency: 'NGN',
        email: 'john@example.com',
        description: 'Test recipient'
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('fetchBalance', () => {
    it('should fetch account balance', async () => {
      const mockResponse = generateMockPaystackResponse('balance');
      mockAxios.create.mock.results[0].value.get.mockResolvedValue({ data: mockResponse });
      
      const result = await paystackService.fetchBalance();

      expect(mockAxios.create.mock.results[0].value.get).toHaveBeenCalledWith('/balance');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const payload = '{"event":"charge.success","data":{}}';
      const signature = generateWebhookSignature(payload, 'test_webhook_secret');
      
      mockCrypto.timingSafeEqual.mockReturnValue(true);
      
      const result = paystackService.verifyWebhookSignature(payload, signature);
      
      expect(mockCrypto.createHmac).toHaveBeenCalledWith('sha512', 'test_webhook_secret');
      expect(mockCrypto.createHmac().update).toHaveBeenCalledWith(payload);
      expect(mockCrypto.createHmac().digest).toHaveBeenCalledWith('hex');
      expect(mockCrypto.timingSafeEqual).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = '{"event":"charge.success","data":{}}';
      const signature = 'invalid_signature';
      
      mockCrypto.timingSafeEqual.mockReturnValue(false);
      
      const result = paystackService.verifyWebhookSignature(payload, signature);
      
      expect(result).toBe(false);
    });

    it('should throw error when webhook secret is not configured', () => {
      delete process.env.PAYSTACK_WEBHOOK_SECRET;
      const service = new PaystackService();
      
      expect(() => service.verifyWebhookSignature('payload', 'signature'))
        .toThrow('Webhook secret not configured');
    });
  });

  describe('convertGatewayError', () => {
    it('should convert 400 error to VALIDATION_ERROR', () => {
      const errorResponse = {
        status: 400,
        data: { message: 'Invalid request' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error).toBeInstanceOf(PaymentError);
      expect(error.type).toBe(PaymentErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
    });

    it('should convert 401 error to AUTHENTICATION_ERROR', () => {
      const errorResponse = {
        status: 401,
        data: { message: 'Unauthorized' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.AUTHENTICATION_ERROR);
    });

    it('should convert 403 error to AUTHORIZATION_ERROR', () => {
      const errorResponse = {
        status: 403,
        data: { message: 'Forbidden' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.AUTHORIZATION_ERROR);
    });

    it('should convert 404 error to NOT_FOUND', () => {
      const errorResponse = {
        status: 404,
        data: { message: 'Not found' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.NOT_FOUND);
    });

    it('should convert 409 error to DUPLICATE_TRANSACTION', () => {
      const errorResponse = {
        status: 409,
        data: { message: 'Duplicate transaction' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.DUPLICATE_TRANSACTION);
    });

    it('should convert 429 error to RATE_LIMIT_EXCEEDED', () => {
      const errorResponse = {
        status: 429,
        data: { message: 'Too many requests' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.RATE_LIMIT_EXCEEDED);
    });

    it('should convert 500 error to SYSTEM_ERROR', () => {
      const errorResponse = {
        status: 500,
        data: { message: 'Internal server error' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.SYSTEM_ERROR);
    });

    it('should handle insufficient funds message', () => {
      const errorResponse = {
        status: 400,
        data: { message: 'Insufficient funds' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.INSUFFICIENT_FUNDS);
      expect(error.message).toBe('Insufficient funds for this transaction');
    });

    it('should handle duplicate message', () => {
      const errorResponse = {
        status: 400,
        data: { message: 'Duplicate transaction detected' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.DUPLICATE_TRANSACTION);
      expect(error.message).toBe('Duplicate transaction detected');
    });

    it('should handle fraud message', () => {
      const errorResponse = {
        status: 400,
        data: { message: 'Transaction flagged for fraud' }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.type).toBe(PaymentErrorType.FRAUD_DETECTED);
      expect(error.message).toBe('Transaction flagged for fraud review');
    });

    it('should include error details in converted error', () => {
      const errorResponse = {
        status: 400,
        data: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: [
            { field: 'email', message: 'Invalid email' },
            { field: 'amount', message: 'Invalid amount' }
          ]
        }
      };

      const error = paystackService.convertGatewayError(errorResponse);

      expect(error.details).toEqual({
        status: 400,
        paystackCode: 'VALIDATION_ERROR',
        paystackMessage: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email' },
          { field: 'amount', message: 'Invalid amount' }
        ]
      });
    });
  });

  describe('isValidWebhookEvent', () => {
    it('should return true for valid webhook events', () => {
      const validEvents = [
        'charge.success',
        'charge.failed',
        'transfer.success',
        'transfer.failed',
        'transfer.reversed',
        'refund.processed',
        'invoice.create',
        'invoice.update',
        'customer.create',
        'customer.update',
        'subscription.create',
        'subscription.disable',
        'subscription.enable',
        'invoice.payment_failed'
      ];

      validEvents.forEach(event => {
        expect(paystackService.isValidWebhookEvent(event)).toBe(true);
      });
    });

    it('should return false for invalid webhook events', () => {
      const invalidEvents = [
        'invalid.event',
        'unknown.event',
        'test.event',
        ''
      ];

      invalidEvents.forEach(event => {
        expect(paystackService.isValidWebhookEvent(event)).toBe(false);
      });
    });
  });

  describe('parseWebhookEvent', () => {
    it('should parse valid webhook event', () => {
      const eventData = {
        event: 'charge.success',
        data: {
          id: 123456,
          reference: 'TXN123456',
          amount: 10000
        }
      };

      const result = paystackService.parseWebhookEvent(eventData);

      expect(result).toEqual({
        eventType: 'charge.success',
        transactionData: {
          id: 123456,
          reference: 'TXN123456',
          amount: 10000
        },
        timestamp: expect.any(String)
      });
    });

    it('should throw error for invalid webhook event', () => {
      const eventData = {
        event: 'invalid.event',
        data: {}
      };

      expect(() => paystackService.parseWebhookEvent(eventData))
        .toThrow(PaymentError);
    });
  });

  describe('Additional Methods', () => {
    it('should get banks', async () => {
      const mockResponse = { status: true, data: [] };
      mockAxios.create.mock.results[0].value.get.mockResolvedValue({ data: mockResponse });
      
      const result = await paystackService.getBanks();

      expect(mockAxios.create.mock.results[0].value.get).toHaveBeenCalledWith('/bank');
      expect(result).toEqual(mockResponse);
    });

    it('should resolve bank account', async () => {
      const mockResponse = { status: true, data: {} };
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const result = await paystackService.resolveAccount('1234567890', '057');

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/bank/resolve', {
        account_number: '1234567890',
        bank_code: '057'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create customer', async () => {
      const mockResponse = { status: true, data: {} };
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+2348012345678',
        metadata: { source: 'web' }
      };

      const result = await paystackService.createCustomer(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith('/customer', {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+2348012345678',
        metadata: { source: 'web' }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should charge authorization', async () => {
      const mockResponse = { status: true, data: {} };
      mockAxios.create.mock.results[0].value.post.mockResolvedValue({ data: mockResponse });
      
      const request = {
        authorizationCode: 'AUTH123456',
        email: 'test@example.com',
        amount: 10000,
        reference: 'TXN123456',
        metadata: { source: 'recurring' }
      };

      const result = await paystackService.chargeAuthorization(request);

      expect(mockAxios.create.mock.results[0].value.post).toHaveBeenCalledWith(
        '/transaction/charge_authorization',
        {
          authorization_code: 'AUTH123456',
          email: 'test@example.com',
          amount: 1000000, // Convert to kobo
          reference: 'TXN123456',
          metadata: { source: 'recurring' }
        }
      );
      expect(result).toEqual(mockResponse);
    });
  });
});