import PaymentGateway from '../../../src/services/payment/paymentGateway.service.js';
import { PaymentError, PaymentErrorType } from '../../../src/utils/payment/paymentErrors.util.js';
import logger from '../../../src/utils/payment/paymentLogger.util.js';

// Mock dependencies
jest.mock('../../../src/utils/payment/paymentLogger.util.js');
jest.mock('axios');

describe('PaymentGateway Service', () => {
  let paymentGateway;
  let mockAxios;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock axios
    mockAxios = require('axios');
    mockAxios.create = jest.fn(() => ({
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    }));
    
    // Create a concrete implementation for testing
    class TestPaymentGateway extends PaymentGateway {
      async initializePayment(request) {
        return this.client.post('/test', request);
      }

      async verifyTransaction(reference) {
        return this.client.get(`/test/${reference}`);
      }

      async processRefund(request) {
        return this.client.post('/test/refund', request);
      }

      async createTransfer(request) {
        return this.client.post('/test/transfer', request);
      }

      async createTransferRecipient(request) {
        return this.client.post('/test/recipient', request);
      }

      async createSplitPayment(request) {
        return this.client.post('/test/split', request);
      }

      async fetchSplitPayment(splitCode) {
        return this.client.get(`/test/split/${splitCode}`);
      }

      async createSubAccount(request) {
        return this.client.post('/test/subaccount', request);
      }

      async fetchTransactions(options = {}) {
        return this.client.get('/test/transactions', { params: options });
      }

      async fetchBalance() {
        return this.client.get('/test/balance');
      }

      verifyWebhookSignature(payload, signature) {
        return signature === 'valid-signature';
      }

      convertGatewayError(errorResponse) {
        const { status, data } = errorResponse;
        return new PaymentError(
          PaymentErrorType.SYSTEM_ERROR,
          'GATEWAY_ERROR',
          data?.message || 'Gateway error',
          { status, data }
        );
      }
    }

    paymentGateway = new TestPaymentGateway();
  });

  describe('Constructor', () => {
    it('should throw error when instantiated directly', () => {
      expect(() => new PaymentGateway()).toThrow(
        'PaymentGateway is an abstract class and cannot be instantiated directly'
      );
    });

    it('should allow instantiation from subclass', () => {
      expect(paymentGateway).toBeInstanceOf(PaymentGateway);
    });
  });

  describe('createHttpClient', () => {
    it('should create axios instance with correct configuration', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';
      const timeout = 15000;

      const client = paymentGateway.createHttpClient(baseURL, secretKey, timeout);

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL,
        timeout,
        headers: {
          'Authorization': 'Bearer test_secret_key',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should use default timeout if not provided', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000
        })
      );
    });
  });

  describe('sanitizeHeaders', () => {
    it('should sanitize Authorization header', () => {
      const headers = {
        'Authorization': 'Bearer secret_token_here',
        'Content-Type': 'application/json',
        'X-Custom': 'value'
      };

      const sanitized = paymentGateway.sanitizeHeaders(headers);

      expect(sanitized.Authorization).toBe('Bearer ***');
      expect(sanitized['Content-Type']).toBe('application/json');
      expect(sanitized['X-Custom']).toBe('value');
    });

    it('should handle headers without Authorization', () => {
      const headers = {
        'Content-Type': 'application/json',
        'X-Custom': 'value'
      };

      const sanitized = paymentGateway.sanitizeHeaders(headers);

      expect(sanitized).toEqual(headers);
    });
  });

  describe('sanitizeResponseData', () => {
    it('should sanitize sensitive fields in response data', () => {
      const data = {
        data: {
          access_code: 'secret_access_code',
          authorization: {
            authorization_code: 'secret_auth_code'
          },
          customer: {
            authorization_code: 'customer_auth_code'
          },
          safe_field: 'safe_value'
        }
      };

      const sanitized = paymentGateway.sanitizeResponseData(data);

      expect(sanitized.data.access_code).toBe('***');
      expect(sanitized.data.authorization.authorization_code).toBe('***');
      expect(sanitized.data.customer.authorization_code).toBe('***');
      expect(sanitized.data.safe_field).toBe('safe_value');
    });

    it('should handle null/undefined data', () => {
      expect(paymentGateway.sanitizeResponseData(null)).toBeNull();
      expect(paymentGateway.sanitizeResponseData(undefined)).toBeUndefined();
    });

    it('should handle data without sensitive fields', () => {
      const data = {
        data: {
          safe_field1: 'value1',
          safe_field2: 'value2'
        }
      };

      const sanitized = paymentGateway.sanitizeResponseData(data);

      expect(sanitized).toEqual(data);
    });
  });

  describe('Abstract Methods', () => {
    it('should throw error for unimplemented initializePayment', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.initializePayment({}))
        .rejects.toThrow('initializePayment method must be implemented by subclass');
    });

    it('should throw error for unimplemented verifyTransaction', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.verifyTransaction('ref123'))
        .rejects.toThrow('verifyTransaction method must be implemented by subclass');
    });

    it('should throw error for unimplemented processRefund', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.processRefund({}))
        .rejects.toThrow('processRefund method must be implemented by subclass');
    });

    it('should throw error for unimplemented createTransfer', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.createTransfer({}))
        .rejects.toThrow('createTransfer method must be implemented by subclass');
    });

    it('should throw error for unimplemented createTransferRecipient', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.createTransferRecipient({}))
        .rejects.toThrow('createTransferRecipient method must be implemented by subclass');
    });

    it('should throw error for unimplemented createSplitPayment', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.createSplitPayment({}))
        .rejects.toThrow('createSplitPayment method must be implemented by subclass');
    });

    it('should throw error for unimplemented fetchSplitPayment', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.fetchSplitPayment('split123'))
        .rejects.toThrow('fetchSplitPayment method must be implemented by subclass');
    });

    it('should throw error for unimplemented createSubAccount', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.createSubAccount({}))
        .rejects.toThrow('createSubAccount method must be implemented by subclass');
    });

    it('should throw error for unimplemented fetchTransactions', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.fetchTransactions({}))
        .rejects.toThrow('fetchTransactions method must be implemented by subclass');
    });

    it('should throw error for unimplemented fetchBalance', async () => {
      const gateway = new PaymentGateway();
      
      await expect(gateway.fetchBalance())
        .rejects.toThrow('fetchBalance method must be implemented by subclass');
    });

    it('should throw error for unimplemented verifyWebhookSignature', () => {
      const gateway = new PaymentGateway();
      
      expect(() => gateway.verifyWebhookSignature('payload', 'signature'))
        .toThrow('verifyWebhookSignature method must be implemented by subclass');
    });

    it('should throw error for unimplemented convertGatewayError', () => {
      const gateway = new PaymentGateway();
      
      expect(() => gateway.convertGatewayError({}))
        .toThrow('convertGatewayError method must be implemented by subclass');
    });
  });

  describe('HTTP Client Interceptors', () => {
    it('should setup request interceptor for logging', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      expect(mockClient.interceptors.request.use).toHaveBeenCalled();
    });

    it('should setup response interceptor for logging and error handling', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      expect(mockClient.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors properly', async () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      
      // Mock network error
      const networkError = new Error('Network Error');
      mockClient.post.mockRejectedValue(networkError);

      await expect(paymentGateway.initializePayment({}))
        .rejects.toThrow('Network Error');
    });

    it('should convert gateway errors using convertGatewayError', async () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      
      // Mock gateway error response
      const gatewayError = {
        response: {
          status: 400,
          data: { message: 'Invalid request' }
        }
      };
      
      mockClient.post.mockRejectedValue(gatewayError);

      await expect(paymentGateway.initializePayment({}))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('Logging', () => {
    it('should log debug messages for requests', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      const requestInterceptor = mockClient.interceptors.request.use.mock.calls[0][0];

      const config = {
        method: 'POST',
        url: '/test',
        headers: {
          'Authorization': 'Bearer test_secret_key',
          'Content-Type': 'application/json'
        }
      };

      requestInterceptor(config);

      expect(logger.debug).toHaveBeenCalledWith(
        'Payment gateway API request',
        expect.objectContaining({
          method: 'POST',
          url: '/test',
          headers: expect.objectContaining({
            Authorization: 'Bearer ***'
          })
        })
      );
    });

    it('should log debug messages for responses', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      const responseInterceptor = mockClient.interceptors.response.use.mock.calls[0][0];

      const response = {
        status: 200,
        config: { url: '/test' },
        data: {
          access_code: 'secret_code',
          safe_field: 'safe_value'
        }
      };

      responseInterceptor(response);

      expect(logger.debug).toHaveBeenCalledWith(
        'Payment gateway API response',
        expect.objectContaining({
          status: 200,
          url: '/test',
          data: expect.objectContaining({
            access_code: '***',
            safe_field: 'safe_value'
          })
        })
      );
    });

    it('should log error messages for failed requests', () => {
      const baseURL = 'https://test.api.com';
      const secretKey = 'test_secret_key';

      paymentGateway.createHttpClient(baseURL, secretKey);

      const mockClient = mockAxios.create.mock.results[0].value;
      const errorInterceptor = mockClient.interceptors.response.use.mock.calls[0][1];

      const error = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        },
        config: { url: '/test' },
        message: 'Request failed'
      };

      errorInterceptor(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Payment gateway API error',
        expect.objectContaining({
          status: 400,
          url: '/test',
          message: 'Request failed',
          data: { message: 'Bad request' }
        })
      );
    });
  });
});