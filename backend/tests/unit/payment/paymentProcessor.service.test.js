import PaymentProcessorService from '../../../src/services/payment/paymentProcessor.service.js';
import PaystackService from '../../../src/services/payment/paystack.service.js';
import { PaymentError, PaymentErrorType } from '../../../src/utils/payment/paymentErrors.util.js';
import logger from '../../../src/utils/payment/paymentLogger.util.js';
import { 
  generateMockPaystackResponse, 
  generateMockRequest, 
  generateMockResponse 
} from '../../helpers/payment.test.helpers.js';

// Mock dependencies
jest.mock('../../../src/services/payment/paystack.service.js');
jest.mock('../../../src/utils/payment/paymentLogger.util.js');

describe('PaymentProcessorService', () => {
  let paymentProcessor;
  let mockPaystackService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock Paystack service
    mockPaystackService = new PaystackService();
    paymentProcessor = new PaymentProcessorService();
    paymentProcessor.paystackService = mockPaystackService;
  });

  describe('Constructor', () => {
    it('should initialize with PaystackService instance', () => {
      expect(paymentProcessor.paystackService).toBeInstanceOf(PaystackService);
    });
  });

  describe('processPayment', () => {
    const validRequest = {
      transactionId: 'TXN123456',
      reference: 'REF123456',
      type: 'investment',
      amount: 10000,
      currency: 'NGN',
      paymentMethod: 'card',
      payer: {
        entity: 'investor',
        id: 'user123',
        email: 'test@example.com'
      },
      payee: {
        entity: 'system',
        id: null,
        subaccount: 'SUB123'
      },
      callbackUrl: 'https://example.com/callback',
      metadata: { source: 'web' },
      splitConfig: { code: 'SPLIT123' }
    };

    it('should process payment successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('initialize', {
        data: {
          reference: 'REF123456',
          access_code: 'ACCESS123',
          authorization_url: 'https://paystack.co/pay/ACCESS123'
        }
      });
      
      mockPaystackService.initializePayment.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.processPayment(validRequest);

      expect(mockPaystackService.initializePayment).toHaveBeenCalledWith({
        amount: 10000,
        email: 'test@example.com',
        reference: 'REF123456',
        callbackUrl: 'https://example.com/callback',
        metadata: {
          transactionId: 'TXN123456',
          type: 'investment',
          source: 'web'
        },
        channels: ['card'],
        splitCode: 'SPLIT123',
        subaccount: 'SUB123',
        currency: 'NGN'
      });

      expect(result).toEqual({
        success: true,
        data: {
          transactionId: 'TXN123456',
          reference: 'REF123456',
          accessCode: 'ACCESS123',
          authorizationUrl: 'https://paystack.co/pay/ACCESS123',
          expiresAt: expect.any(Date)
        }
      });
    });

    it('should log payment initialization', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('initialize');
      mockPaystackService.initializePayment.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processPayment(validRequest);

      expect(logger.info).toHaveBeenCalledWith('Starting payment processing', {
        transactionId: 'TXN123456',
        reference: 'REF123456',
        amount: 10000,
        type: 'investment'
      });
    });

    it('should log successful payment initialization', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('initialize');
      mockPaystackService.initializePayment.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processPayment(validRequest);

      expect(logger.logPaymentInitialization).toHaveBeenCalledWith({
        transactionId: 'TXN123456',
        reference: 'REF123456',
        amount: 10000,
        paymentMethod: 'card',
        userId: 'user123',
        processingTime: expect.any(Number)
      });
    });

    it('should handle payment initialization failure', async () => {
      const error = new PaymentError(
        PaymentErrorType.PAYMENT_FAILED,
        'PAYMENT_FAILED',
        'Payment initialization failed'
      );
      mockPaystackService.initializePayment.mockRejectedValue(error);

      await expect(paymentProcessor.processPayment(validRequest))
        .rejects.toThrow(PaymentError);

      expect(logger.logPaymentFailure).toHaveBeenCalledWith({
        reference: 'REF123456',
        error: 'Payment initialization failed',
        amount: 10000,
        transactionId: 'TXN123456',
        errorDetails: undefined
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = { ...validRequest };
      delete invalidRequest.transactionId;

      await expect(paymentProcessor.processPayment(invalidRequest))
        .rejects.toThrow(PaymentError);

      expect(mockPaystackService.initializePayment).not.toHaveBeenCalled();
    });

    it('should validate amount is greater than 0', async () => {
      const invalidRequest = { ...validRequest, amount: 0 };

      await expect(paymentProcessor.processPayment(invalidRequest))
        .rejects.toThrow(PaymentError);
    });

    it('should validate email format', async () => {
      const invalidRequest = { 
        ...validRequest, 
        payer: { ...validRequest.payer, email: 'invalid-email' }
      };

      await expect(paymentProcessor.processPayment(invalidRequest))
        .rejects.toThrow(PaymentError);
    });

    it('should validate transaction type', async () => {
      const invalidRequest = { ...validRequest, type: 'invalid_type' };

      await expect(paymentProcessor.processPayment(invalidRequest))
        .rejects.toThrow(PaymentError);
    });

    it('should validate payment method', async () => {
      const invalidRequest = { ...validRequest, paymentMethod: 'invalid_method' };

      await expect(paymentProcessor.processPayment(invalidRequest))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('verifyPayment', () => {
    const reference = 'REF123456';

    it('should verify payment successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('verify', {
        data: {
          status: 'success',
          amount: 1000000, // in kobo
          currency: 'NGN',
          paid_at: '2023-01-01T12:00:00.000Z',
          channel: 'card',
          fees: 1500, // in kobo
          metadata: { transactionId: 'TXN123456' }
        }
      });
      
      mockPaystackService.verifyTransaction.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.verifyPayment(reference);

      expect(mockPaystackService.verifyTransaction).toHaveBeenCalledWith(reference);

      expect(result).toEqual({
        success: true,
        data: {
          transactionId: 'TXN123456',
          status: 'completed',
          amount: 10000, // converted from kobo
          currency: 'NGN',
          paidAt: '2023-01-01T12:00:00.000Z',
          paymentMethod: 'card',
          fees: {
            processingFee: 15, // converted from kobo
            platformFee: expect.any(Number),
            transactionFee: 15 // converted from kobo
          }
        }
      });
    });

    it('should handle failed verification', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('verify', {
        data: {
          status: 'failed',
          amount: 1000000,
          gateway_response: 'Payment failed'
        }
      });
      
      mockPaystackService.verifyTransaction.mockResolvedValue(mockPaystackResponse);

      await expect(paymentProcessor.verifyPayment(reference))
        .rejects.toThrow(PaymentError);

      expect(logger.logPaymentFailure).toHaveBeenCalledWith({
        reference,
        error: 'Payment failed',
        amount: 10000,
        transactionId: undefined
      });
    });

    it('should log verification start', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('verify');
      mockPaystackService.verifyTransaction.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.verifyPayment(reference);

      expect(logger.info).toHaveBeenCalledWith('Starting payment verification', { reference });
    });

    it('should log successful verification', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('verify', {
        data: {
          status: 'success',
          amount: 1000000,
          metadata: { transactionId: 'TXN123456' }
        }
      });
      
      mockPaystackService.verifyTransaction.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.verifyPayment(reference);

      expect(logger.logPaymentVerification).toHaveBeenCalledWith({
        reference,
        status: 'completed',
        amount: 10000,
        transactionId: 'TXN123456',
        processingTime: expect.any(Number)
      });
    });
  });

  describe('processRefund', () => {
    const refundRequest = {
      transactionId: 'TXN123456',
      amount: 5000,
      reason: 'Customer requested refund',
      customerNote: 'Refund for cancelled order'
    };

    it('should process refund successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('refund', {
        data: {
          id: 'REF123456',
          status: 'success',
          createdAt: '2023-01-01T12:00:00.000Z'
        }
      });
      
      mockPaystackService.processRefund.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.processRefund(refundRequest);

      expect(mockPaystackService.processRefund).toHaveBeenCalledWith({
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund',
        customerNote: 'Refund for cancelled order'
      });

      expect(result).toEqual({
        success: true,
        data: {
          refundId: 'REF123456',
          transactionId: 'TXN123456',
          amount: 5000,
          status: 'success',
          refundDate: '2023-01-01T12:00:00.000Z',
          reason: 'Customer requested refund'
        }
      });
    });

    it('should log refund processing start', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('refund');
      mockPaystackService.processRefund.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processRefund(refundRequest);

      expect(logger.info).toHaveBeenCalledWith('Starting refund processing', {
        transactionId: 'TXN123456',
        amount: 5000,
        reason: 'Customer requested refund'
      });
    });

    it('should log successful refund processing', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('refund', {
        data: { id: 'REF123456', status: 'success' }
      });
      mockPaystackService.processRefund.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processRefund(refundRequest);

      expect(logger.logRefundProcessing).toHaveBeenCalledWith({
        transactionId: 'TXN123456',
        refundId: 'REF123456',
        amount: 5000,
        reason: 'Customer requested refund',
        status: 'success'
      });
    });

    it('should validate refund request', async () => {
      const invalidRequest = { amount: 5000 }; // missing transactionId

      await expect(paymentProcessor.processRefund(invalidRequest))
        .rejects.toThrow(PaymentError);

      expect(mockPaystackService.processRefund).not.toHaveBeenCalled();
    });

    it('should validate refund amount is greater than 0', async () => {
      const invalidRequest = { ...refundRequest, amount: 0 };

      await expect(paymentProcessor.processRefund(invalidRequest))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('processDisbursement', () => {
    const disbursementRequest = {
      transactionId: 'TXN123456',
      recipientCode: 'RCP123456',
      amount: 10000,
      reason: 'Monthly payout',
      currency: 'NGN'
    };

    it('should process disbursement successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('transfer', {
        data: {
          id: 'TRF123456',
          status: 'success',
          createdAt: '2023-01-01T12:00:00.000Z'
        }
      });
      
      mockPaystackService.createTransfer.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.processDisbursement(disbursementRequest);

      expect(mockPaystackService.createTransfer).toHaveBeenCalledWith({
        amount: 10000,
        reference: expect.stringMatching(/^DIS_\d+_[a-z0-9]+$/),
        recipientCode: 'RCP123456',
        reason: 'Monthly payout',
        currency: 'NGN'
      });

      expect(result).toEqual({
        success: true,
        data: {
          transferId: 'TRF123456',
          transactionId: 'TXN123456',
          reference: expect.stringMatching(/^DIS_\d+_[a-z0-9]+$/),
          amount: 10000,
          status: 'success',
          transferDate: '2023-01-01T12:00:00.000Z',
          reason: 'Monthly payout'
        }
      });
    });

    it('should log disbursement processing start', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('transfer');
      mockPaystackService.createTransfer.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processDisbursement(disbursementRequest);

      expect(logger.info).toHaveBeenCalledWith('Starting disbursement processing', {
        transactionId: 'TXN123456',
        recipientCode: 'RCP123456',
        amount: 10000,
        reason: 'Monthly payout'
      });
    });

    it('should log successful disbursement processing', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('transfer', {
        data: { id: 'TRF123456', status: 'success' }
      });
      mockPaystackService.createTransfer.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.processDisbursement(disbursementRequest);

      expect(logger.logDisbursementProcessing).toHaveBeenCalledWith({
        transactionId: 'TXN123456',
        recipientId: 'RCP123456',
        amount: 10000,
        reason: 'Monthly payout',
        status: 'success'
      });
    });

    it('should validate disbursement request', async () => {
      const invalidRequest = { amount: 10000 }; // missing required fields

      await expect(paymentProcessor.processDisbursement(invalidRequest))
        .rejects.toThrow(PaymentError);

      expect(mockPaystackService.createTransfer).not.toHaveBeenCalled();
    });

    it('should validate disbursement amount is greater than 0', async () => {
      const invalidRequest = { ...disbursementRequest, amount: 0 };

      await expect(paymentProcessor.processDisbursement(invalidRequest))
        .rejects.toThrow(PaymentError);
    });
  });

  describe('createTransferRecipient', () => {
    const recipientRequest = {
      type: 'nuban',
      name: 'John Doe',
      accountNumber: '1234567890',
      bankCode: '057',
      currency: 'NGN',
      email: 'john@example.com',
      description: 'Test recipient'
    };

    it('should create transfer recipient successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('createRecipient', {
        data: {
          recipient_code: 'RCP123456',
          name: 'John Doe',
          type: 'nuban',
          createdAt: '2023-01-01T12:00:00.000Z'
        }
      });
      
      mockPaystackService.createTransferRecipient.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.createTransferRecipient(recipientRequest);

      expect(mockPaystackService.createTransferRecipient).toHaveBeenCalledWith(recipientRequest);

      expect(result).toEqual({
        success: true,
        data: {
          recipientCode: 'RCP123456',
          name: 'John Doe',
          type: 'nuban',
          createdAt: '2023-01-01T12:00:00.000Z'
        }
      });
    });

    it('should log recipient creation start', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('createRecipient');
      mockPaystackService.createTransferRecipient.mockResolvedValue(mockPaystackResponse);

      await paymentProcessor.createTransferRecipient(recipientRequest);

      expect(logger.info).toHaveBeenCalledWith('Creating transfer recipient', {
        type: 'nuban',
        name: 'John Doe',
        accountNumber: expect.stringMatching(/^\d+****$/)
      });
    });

    it('should handle recipient creation failure', async () => {
      const error = new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'INVALID_RECIPIENT',
        'Invalid recipient details'
      );
      mockPaystackService.createTransferRecipient.mockRejectedValue(error);

      await expect(paymentProcessor.createTransferRecipient(recipientRequest))
        .rejects.toThrow(PaymentError);

      expect(logger.error).toHaveBeenCalledWith('Transfer recipient creation failed', {
        error: 'Invalid recipient details',
        type: 'nuban',
        name: 'John Doe'
      });
    });
  });

  describe('getBalance', () => {
    it('should get account balance successfully', async () => {
      const mockPaystackResponse = generateMockPaystackResponse('balance', {
        data: [
          {
            currency: 'NGN',
            balance: 10000000, // in kobo
            ledger_balance: 12000000 // in kobo
          }
        ]
      });
      
      mockPaystackService.fetchBalance.mockResolvedValue(mockPaystackResponse);

      const result = await paymentProcessor.getBalance();

      expect(mockPaystackService.fetchBalance).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        data: {
          currency: 'NGN',
          balance: 100000, // converted from kobo
          ledger_balance: 120000 // converted from kobo
        }
      });
    });

    it('should handle balance fetch failure', async () => {
      const error = new PaymentError(
        PaymentErrorType.SYSTEM_ERROR,
        'BALANCE_FETCH_FAILED',
        'Failed to fetch balance'
      );
      mockPaystackService.fetchBalance.mockRejectedValue(error);

      await expect(paymentProcessor.getBalance())
        .rejects.toThrow(PaymentError);

      expect(logger.error).toHaveBeenCalledWith('Balance fetch failed', {
        error: 'Failed to fetch balance'
      });
    });
  });

  describe('getPaymentChannels', () => {
    it('should return correct channels for card', () => {
      const channels = paymentProcessor.getPaymentChannels('card');
      expect(channels).toEqual(['card']);
    });

    it('should return correct channels for bank_transfer', () => {
      const channels = paymentProcessor.getPaymentChannels('bank_transfer');
      expect(channels).toEqual(['bank_transfer']);
    });

    it('should return correct channels for mobile_money', () => {
      const channels = paymentProcessor.getPaymentChannels('mobile_money');
      expect(channels).toEqual(['mobile_money']);
    });

    it('should return correct channels for ussd', () => {
      const channels = paymentProcessor.getPaymentChannels('ussd');
      expect(channels).toEqual(['ussd']);
    });

    it('should return all channels for all', () => {
      const channels = paymentProcessor.getPaymentChannels('all');
      expect(channels).toEqual(['card', 'bank_transfer', 'mobile_money', 'ussd']);
    });

    it('should return all channels for unknown method', () => {
      const channels = paymentProcessor.getPaymentChannels('unknown');
      expect(channels).toEqual(['card', 'bank_transfer', 'mobile_money', 'ussd']);
    });
  });

  describe('calculatePlatformFee', () => {
    beforeEach(() => {
      process.env.PLATFORM_FEE_PERCENTAGE = '0.005';
      process.env.MINIMUM_PLATFORM_FEE = '100';
    });

    afterEach(() => {
      delete process.env.PLATFORM_FEE_PERCENTAGE;
      delete process.env.MINIMUM_PLATFORM_FEE;
    });

    it('should calculate percentage fee above minimum', () => {
      const amount = 10000;
      const fee = paymentProcessor.calculatePlatformFee(amount);
      expect(fee).toBe(50); // 10000 * 0.005
    });

    it('should apply minimum fee for small amounts', () => {
      const amount = 5000;
      const fee = paymentProcessor.calculatePlatformFee(amount);
      expect(fee).toBe(100); // minimum fee
    });

    it('should use default percentage when not set', () => {
      delete process.env.PLATFORM_FEE_PERCENTAGE;
      const amount = 10000;
      const fee = paymentProcessor.calculatePlatformFee(amount);
      expect(fee).toBe(50); // default 0.005
    });

    it('should use default minimum when not set', () => {
      delete process.env.MINIMUM_PLATFORM_FEE;
      const amount = 5000;
      const fee = paymentProcessor.calculatePlatformFee(amount);
      expect(fee).toBe(100); // default 100
    });
  });
});