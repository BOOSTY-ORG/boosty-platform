import paymentLogger from '../../../src/utils/payment/paymentLogger.util.js';

// Mock console methods
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock winston if available
const mockWinston = {
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    add: jest.fn(),
    clear: jest.fn(),
    remove: jest.fn(),
    profile: jest.fn(),
    startTimer: jest.fn(),
    transports: [],
    format: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    timestamp: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    File: jest.fn(() => ({
      filename: 'test.log'
    })),
    Console: jest.fn()
  }
};

describe('PaymentLogger Utility', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console methods
    global.console = mockConsole;
    
    // Mock winston module
    jest.doMock('winston', () => mockWinston);
  });

  afterEach(() => {
    // Restore console
    global.console = console;
    
    // Restore winston
    jest.restoreAllMocks();
  });

  describe('Logger Initialization', () => {
    it('should initialize with winston if available', async () => {
      // This test simulates winston being available
      const logger = await import('../../../src/utils/payment/paymentLogger.util.js');
      
      expect(mockWinston.createLogger).toHaveBeenCalledWith({
        level: process.env.PAYMENT_LOG_LEVEL || 'info',
        format: expect.any(Function),
        defaultMeta: { service: 'payment-service' },
        transports: expect.any(Array)
      });
    });

    it('should fallback to console if winston not available', async () => {
      // Mock winston to throw error
      jest.doMock('winston', () => {
        throw new Error('Winston not available');
      });

      const logger = await import('../../../src/utils/payment/paymentLogger.util.js');
      
      // Should not call winston.createLogger
      expect(mockWinston.createLogger).not.toHaveBeenCalled();
      
      // Should use console fallback
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should add console transport in non-production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      await import('../../../src/utils/payment/paymentLogger.util.js');
      
      expect(mockWinston.transports.Console).toHaveBeenCalledWith(
        expect.objectContaining({
          format: expect.any(Function)
        })
      );
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not add console transport in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      await import('../../../src/utils/payment/paymentLogger.util.js');
      
      expect(mockWinston.transports.Console).not.toHaveBeenCalled();
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Structured Logging Functions', () => {
    describe('logPaymentInitialization', () => {
      it('should log payment initialization with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          reference: 'REF123456',
          amount: 10000,
          paymentMethod: 'card',
          userId: 'USER123',
          processingTime: 250
        };

        paymentLogger.logPaymentInitialization(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Payment initialization completed',
          {
            type: 'payment_initialization',
            transactionId: 'TXN123456',
            reference: 'REF123456',
            amount: 10000,
            paymentMethod: 'card',
            userId: 'USER123',
            processingTime: 250
          }
        );
      });

      it('should use winston if available', () => {
        const data = {
          transactionId: 'TXN123456',
          reference: 'REF123456',
          amount: 10000,
          paymentMethod: 'card',
          userId: 'USER123',
          processingTime: 250
        };

        paymentLogger.logPaymentInitialization(data);

        expect(mockWinston.createLogger().info).toHaveBeenCalledWith(
          'Payment initialization completed',
          {
            type: 'payment_initialization',
            transactionId: 'TXN123456',
            reference: 'REF123456',
            amount: 10000,
            paymentMethod: 'card',
            userId: 'USER123',
            processingTime: 250
          }
        );
      });
    });

    describe('logPaymentVerification', () => {
      it('should log payment verification with correct structure', () => {
        const data = {
          reference: 'REF123456',
          status: 'completed',
          amount: 10000,
          transactionId: 'TXN123456',
          processingTime: 150
        };

        paymentLogger.logPaymentVerification(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Payment verification completed',
          {
            type: 'payment_verification',
            reference: 'REF123456',
            status: 'completed',
            amount: 10000,
            transactionId: 'TXN123456',
            processingTime: 150
          }
        );
      });
    });

    describe('logPaymentCompletion', () => {
      it('should log payment completion with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          reference: 'REF123456',
          amount: 10000,
          paymentMethod: 'card',
          fees: {
            processingFee: 100,
            platformFee: 200,
            transactionFee: 50
          }
        };

        paymentLogger.logPaymentCompletion(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Payment completed successfully',
          {
            type: 'payment_completion',
            transactionId: 'TXN123456',
            reference: 'REF123456',
            amount: 10000,
            paymentMethod: 'card',
            fees: {
              processingFee: 100,
              platformFee: 200,
              transactionFee: 50
            }
          }
        );
      });
    });

    describe('logPaymentFailure', () => {
      it('should log payment failure with correct structure', () => {
        const data = {
          reference: 'REF123456',
          error: 'Card declined',
          amount: 10000,
          transactionId: 'TXN123456',
          errorDetails: {
            gatewayCode: 'CARD_DECLINED',
            gatewayMessage: 'Insufficient funds'
          }
        };

        paymentLogger.logPaymentFailure(data);

        expect(mockConsole.error).toHaveBeenCalledWith(
          '[ERROR] 2023-01-01T00:00:00.000Z - Payment failed',
          {
            type: 'payment_failure',
            reference: 'REF123456',
            error: 'Card declined',
            amount: 10000,
            transactionId: 'TXN123456',
            errorDetails: {
              gatewayCode: 'CARD_DECLINED',
              gatewayMessage: 'Insufficient funds'
            }
          }
        );
      });
    });

    describe('logRefundProcessing', () => {
      it('should log refund processing with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          refundId: 'REF123456',
          amount: 5000,
          reason: 'Customer requested refund',
          status: 'success'
        };

        paymentLogger.logRefundProcessing(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Refund processed',
          {
            type: 'refund_processing',
            transactionId: 'TXN123456',
            refundId: 'REF123456',
            amount: 5000,
            reason: 'Customer requested refund',
            status: 'success'
          }
        );
      });
    });

    describe('logDisbursementProcessing', () => {
      it('should log disbursement processing with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          recipientId: 'REC123456',
          amount: 10000,
          reason: 'Monthly payout',
          status: 'success'
        };

        paymentLogger.logDisbursementProcessing(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Disbursement processed',
          {
            type: 'disbursement_processing',
            transactionId: 'TXN123456',
            recipientId: 'REC123456',
            amount: 10000,
            reason: 'Monthly payout',
            status: 'success'
          }
        );
      });
    });

    describe('logWebhookProcessing', () => {
      it('should log webhook processing with correct structure', () => {
        const data = {
          event: 'charge.success',
          reference: 'REF123456',
          status: 'processed',
          processingTime: 100
        };

        paymentLogger.logWebhookProcessing(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Webhook processed',
          {
            type: 'webhook_processing',
            event: 'charge.success',
            reference: 'REF123456',
            status: 'processed',
            processingTime: 100
          }
        );
      });
    });

    describe('logSplitPaymentProcessing', () => {
      it('should log split payment processing with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          splitCode: 'SPLIT123',
          splits: [
            {
              subaccountId: 'SUB1',
              amount: 5000
            },
            {
              subaccountId: 'SUB2',
              amount: 3000
            }
          ],
          status: 'completed'
        };

        paymentLogger.logSplitPaymentProcessing(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Split payment processed',
          {
            type: 'split_payment_processing',
            transactionId: 'TXN123456',
            splitCode: 'SPLIT123',
            splits: [
              {
                subaccountId: 'SUB1',
                amount: 5000
              },
              {
                subaccountId: 'SUB2',
                amount: 3000
              }
            ],
            status: 'completed'
          }
        );
      });
    });

    describe('logComplianceCheck', () => {
      it('should log compliance check with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          checkType: 'kyc_verification',
          status: 'passed',
          reason: 'All documents verified'
        };

        paymentLogger.logComplianceCheck(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - Compliance check completed',
          {
            type: 'compliance_check',
            transactionId: 'TXN123456',
            checkType: 'kyc_verification',
            status: 'passed',
            reason: 'All documents verified'
          }
        );
      });
    });

    describe('logFraudDetection', () => {
      it('should log fraud detection with correct structure', () => {
        const data = {
          transactionId: 'TXN123456',
          riskScore: 85,
          riskFactors: ['velocity', 'amount', 'location'],
          action: 'block'
        };

        paymentLogger.logFraudDetection(data);

        expect(mockConsole.warn).toHaveBeenCalledWith(
          '[WARN] 2023-01-01T00:00:00.000Z - Fraud detection triggered',
          {
            type: 'fraud_detection',
            transactionId: 'TXN123456',
            riskScore: 85,
            riskFactors: ['velocity', 'amount', 'location'],
            action: 'block'
          }
        );
      });
    });

    describe('logApiRequest', () => {
      it('should log API request with correct structure', () => {
        const data = {
          method: 'POST',
          url: '/api/payment/initialize',
          headers: {
            'authorization': 'Bearer ***',
            'content-type': 'application/json'
          },
          userId: 'USER123'
        };

        paymentLogger.logApiRequest(data);

        expect(mockConsole.debug).toHaveBeenCalledWith(
          '[DEBUG] 2023-01-01T00:00:00.000Z - API request received',
          {
            type: 'api_request',
            method: 'POST',
            url: '/api/payment/initialize',
            headers: {
              'authorization': 'Bearer ***',
              'content-type': 'application/json'
            },
            userId: 'USER123'
          }
        );
      });
    });

    describe('logApiResponse', () => {
      it('should log API response with correct structure', () => {
        const data = {
          statusCode: 200,
          url: '/api/payment/initialize',
          responseTime: 250
        };

        paymentLogger.logApiResponse(data);

        expect(mockConsole.debug).toHaveBeenCalledWith(
          '[DEBUG] 2023-01-01T00:00:00.000Z - API response sent',
          {
            type: 'api_response',
            statusCode: 200,
            url: '/api/payment/initialize',
            responseTime: 250
          }
        );
      });
    });

    describe('logSystemMetrics', () => {
      it('should log system metrics with correct structure', () => {
        const data = {
          transactionCount: 1000,
          successRate: 95.5,
          averageResponseTime: 150,
          errorRate: 4.5
        };

        paymentLogger.logSystemMetrics(data);

        expect(mockConsole.info).toHaveBeenCalledWith(
          '[INFO] 2023-01-01T00:00:00.000Z - System metrics',
          {
            type: 'system_metrics',
            transactionCount: 1000,
            successRate: 95.5,
            averageResponseTime: 150,
            errorRate: 4.5
          }
        );
      });
    });
  });

  describe('Direct Logger Methods', () => {
    it('should expose direct logger methods', () => {
      expect(typeof paymentLogger.error).toBe('function');
      expect(typeof paymentLogger.warn).toBe('function');
      expect(typeof paymentLogger.info).toBe('function');
      expect(typeof paymentLogger.debug).toBe('function');
    });

    it('should call appropriate logger method', () => {
      const testMessage = 'Test message';
      const testMeta = { test: 'data' };

      paymentLogger.error(testMessage, testMeta);
      paymentLogger.warn(testMessage, testMeta);
      paymentLogger.info(testMessage, testMeta);
      paymentLogger.debug(testMessage, testMeta);

      expect(mockConsole.error).toHaveBeenCalledWith('[ERROR]', testMessage, testMeta);
      expect(mockConsole.warn).toHaveBeenCalledWith('[WARN]', testMessage, testMeta);
      expect(mockConsole.info).toHaveBeenCalledWith('[INFO]', testMessage, testMeta);
      expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG]', testMessage, testMeta);
    });

    it('should use winston methods if available', () => {
      const testMessage = 'Test message';
      const testMeta = { test: 'data' };

      paymentLogger.error(testMessage, testMeta);

      expect(mockWinston.createLogger().error).toHaveBeenCalledWith(testMessage, testMeta);
    });
  });

  describe('Environment Configuration', () => {
    it('should respect PAYMENT_LOG_LEVEL environment variable', async () => {
      const originalEnv = process.env.PAYMENT_LOG_LEVEL;
      process.env.PAYMENT_LOG_LEVEL = 'debug';

      await import('../../../src/utils/payment/paymentLogger.util.js');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );

      // Restore environment
      process.env.PAYMENT_LOG_LEVEL = originalEnv;
    });

    it('should use default log level if environment variable not set', async () => {
      const originalEnv = process.env.PAYMENT_LOG_LEVEL;
      delete process.env.PAYMENT_LOG_LEVEL;

      await import('../../../src/utils/payment/paymentLogger.util.js');

      expect(mockWinston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info'
        })
      );

      // Restore environment
      process.env.PAYMENT_LOG_LEVEL = originalEnv;
    });
  });
});