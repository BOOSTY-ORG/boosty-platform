import {
  PaymentError,
  PaymentErrorType,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createRateLimitError,
  createPaymentFailedError,
  createSystemError,
  createInsufficientFundsError,
  createDuplicateTransactionError,
  createComplianceFailureError,
  createFraudDetectedError,
  createInvalidAmountError
} from '../../../src/utils/payment/paymentErrors.util.js';

describe('PaymentError Utility', () => {
  describe('PaymentErrorType', () => {
    it('should have all required error types', () => {
      expect(PaymentErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(PaymentErrorType.AUTHENTICATION_ERROR).toBe('AUTHENTICATION_ERROR');
      expect(PaymentErrorType.AUTHORIZATION_ERROR).toBe('AUTHORIZATION_ERROR');
      expect(PaymentErrorType.INSUFFICIENT_FUNDS).toBe('INSUFFICIENT_FUNDS');
      expect(PaymentErrorType.CARD_DECLINED).toBe('CARD_DECLINED');
      expect(PaymentErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(PaymentErrorType.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
      expect(PaymentErrorType.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
      expect(PaymentErrorType.INVALID_AMOUNT).toBe('INVALID_AMOUNT');
      expect(PaymentErrorType.DUPLICATE_TRANSACTION).toBe('DUPLICATE_TRANSACTION');
      expect(PaymentErrorType.FRAUD_DETECTED).toBe('FRAUD_DETECTED');
      expect(PaymentErrorType.COMPLIANCE_FAILURE).toBe('COMPLIANCE_FAILURE');
      expect(PaymentErrorType.PAYMENT_FAILED).toBe('PAYMENT_FAILED');
      expect(PaymentErrorType.REFUND_FAILED).toBe('REFUND_FAILED');
      expect(PaymentErrorType.DISBURSEMENT_FAILED).toBe('DISBURSEMENT_FAILED');
      expect(PaymentErrorType.WEBHOOK_ERROR).toBe('WEBHOOK_ERROR');
      expect(PaymentErrorType.SYSTEM_ERROR).toBe('SYSTEM_ERROR');
      expect(PaymentErrorType.NOT_FOUND).toBe('NOT_FOUND');
      expect(PaymentErrorType.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('PaymentError Class', () => {
    it('should create PaymentError with required properties', () => {
      const error = new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        'Validation failed',
        { field: 'email' },
        400
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('PaymentError');
      expect(error.type).toBe(PaymentErrorType.VALIDATION_ERROR);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.timestamp).toBeDefined();
      expect(error.retryable).toBe(false);
      expect(error.userFriendly).toBe(true);
    });

    it('should set retryable correctly for retryable errors', () => {
      const retryableErrors = [
        PaymentErrorType.NETWORK_ERROR,
        PaymentErrorType.TIMEOUT_ERROR,
        PaymentErrorType.RATE_LIMIT_EXCEEDED,
        PaymentErrorType.SERVICE_UNAVAILABLE,
        PaymentErrorType.SYSTEM_ERROR
      ];

      retryableErrors.forEach(type => {
        const error = new PaymentError(type, 'CODE', 'Message');
        expect(error.retryable).toBe(true);
      });
    });

    it('should set retryable correctly for non-retryable errors', () => {
      const nonRetryableErrors = [
        PaymentErrorType.VALIDATION_ERROR,
        PaymentErrorType.AUTHENTICATION_ERROR,
        PaymentErrorType.AUTHORIZATION_ERROR,
        PaymentErrorType.INSUFFICIENT_FUNDS,
        PaymentErrorType.CARD_DECLINED,
        PaymentErrorType.INVALID_AMOUNT,
        PaymentErrorType.DUPLICATE_TRANSACTION,
        PaymentErrorType.FRAUD_DETECTED,
        PaymentErrorType.COMPLIANCE_FAILURE,
        PaymentErrorType.PAYMENT_FAILED,
        PaymentErrorType.REFUND_FAILED,
        PaymentErrorType.DISBURSEMENT_FAILED,
        PaymentErrorType.WEBHOOK_ERROR,
        PaymentErrorType.NOT_FOUND
      ];

      nonRetryableErrors.forEach(type => {
        const error = new PaymentError(type, 'CODE', 'Message');
        expect(error.retryable).toBe(false);
      });
    });

    it('should set userFriendly correctly for user-friendly errors', () => {
      const userFriendlyErrors = [
        PaymentErrorType.VALIDATION_ERROR,
        PaymentErrorType.INSUFFICIENT_FUNDS,
        PaymentErrorType.CARD_DECLINED,
        PaymentErrorType.INVALID_AMOUNT,
        PaymentErrorType.DUPLICATE_TRANSACTION,
        PaymentErrorType.COMPLIANCE_FAILURE,
        PaymentErrorType.PAYMENT_FAILED,
        PaymentErrorType.REFUND_FAILED,
        PaymentErrorType.DISBURSEMENT_FAILED
      ];

      userFriendlyErrors.forEach(type => {
        const error = new PaymentError(type, 'CODE', 'Message');
        expect(error.userFriendly).toBe(true);
      });
    });

    it('should set userFriendly correctly for non-user-friendly errors', () => {
      const nonUserFriendlyErrors = [
        PaymentErrorType.AUTHENTICATION_ERROR,
        PaymentErrorType.AUTHORIZATION_ERROR,
        PaymentErrorType.NETWORK_ERROR,
        PaymentErrorType.TIMEOUT_ERROR,
        PaymentErrorType.RATE_LIMIT_EXCEEDED,
        PaymentErrorType.SERVICE_UNAVAILABLE,
        PaymentErrorType.SYSTEM_ERROR,
        PaymentErrorType.NOT_FOUND,
        PaymentErrorType.FRAUD_DETECTED,
        PaymentErrorType.WEBHOOK_ERROR
      ];

      nonUserFriendlyErrors.forEach(type => {
        const error = new PaymentError(type, 'CODE', 'Message');
        expect(error.userFriendly).toBe(false);
      });
    });

    it('should convert to JSON correctly', () => {
      const error = new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        'Validation failed',
        { field: 'email' },
        400
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: 'PaymentError',
        type: 'VALIDATION_ERROR',
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        details: { field: 'email' },
        statusCode: 400,
        timestamp: expect.any(String),
        retryable: false,
        userFriendly: true
      });
    });

    it('should maintain proper stack trace', () => {
      const error = new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        'Validation failed'
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PaymentError');
    });
  });

  describe('Error Factory Functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with default status code', () => {
        const error = createValidationError('Invalid email format');

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.VALIDATION_ERROR);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid email format');
        expect(error.statusCode).toBe(400);
      });

      it('should create validation error with custom details', () => {
        const details = { field: 'email', value: 'invalid-email' };
        const error = createValidationError('Invalid email format', details);

        expect(error.details).toEqual(details);
      });
    });

    describe('createAuthenticationError', () => {
      it('should create authentication error with default message', () => {
        const error = createAuthenticationError();

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.AUTHENTICATION_ERROR);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
        expect(error.message).toBe('Authentication failed');
        expect(error.statusCode).toBe(401);
      });

      it('should create authentication error with custom message', () => {
        const customMessage = 'Invalid API key provided';
        const error = createAuthenticationError(customMessage);

        expect(error.message).toBe(customMessage);
      });
    });

    describe('createAuthorizationError', () => {
      it('should create authorization error with default message', () => {
        const error = createAuthorizationError();

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.AUTHORIZATION_ERROR);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
        expect(error.message).toBe('Insufficient permissions');
        expect(error.statusCode).toBe(403);
      });

      it('should create authorization error with custom message', () => {
        const customMessage = 'Admin access required';
        const error = createAuthorizationError(customMessage);

        expect(error.message).toBe(customMessage);
      });
    });

    describe('createNotFoundError', () => {
      it('should create not found error', () => {
        const error = createNotFoundError('Transaction', 'TXN123456');

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.NOT_FOUND);
        expect(error.code).toBe('NOT_FOUND');
        expect(error.message).toBe('Transaction with id TXN123456 not found');
        expect(error.statusCode).toBe(404);
        expect(error.details).toEqual({ resource: 'Transaction', id: 'TXN123456' });
      });
    });

    describe('createRateLimitError', () => {
      it('should create rate limit error with default retry after', () => {
        const error = createRateLimitError();

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.RATE_LIMIT_EXCEEDED);
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(error.message).toBe('Rate limit exceeded. Please try again later.');
        expect(error.statusCode).toBe(429);
        expect(error.details).toEqual({ retryAfter: 60 });
      });

      it('should create rate limit error with custom retry after', () => {
        const customRetryAfter = 120;
        const error = createRateLimitError(customRetryAfter);

        expect(error.details).toEqual({ retryAfter: customRetryAfter });
      });
    });

    describe('createPaymentFailedError', () => {
      it('should create payment failed error', () => {
        const gatewayResponse = 'Card declined';
        const error = createPaymentFailedError(gatewayResponse);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.PAYMENT_FAILED);
        expect(error.code).toBe('PAYMENT_FAILED');
        expect(error.message).toBe('Payment processing failed');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ gatewayResponse });
      });
    });

    describe('createSystemError', () => {
      it('should create system error with default status code', () => {
        const error = createSystemError('Database connection failed');

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.SYSTEM_ERROR);
        expect(error.code).toBe('SYSTEM_ERROR');
        expect(error.message).toBe('Database connection failed');
        expect(error.statusCode).toBe(500);
      });

      it('should create system error with custom details', () => {
        const details = { errorCode: 'DB_CONN_FAILED', stack: '...' };
        const error = createSystemError('Database connection failed', details);

        expect(error.details).toEqual(details);
      });
    });

    describe('createInsufficientFundsError', () => {
      it('should create insufficient funds error', () => {
        const requestedAmount = 10000;
        const availableAmount = 5000;
        const error = createInsufficientFundsError(requestedAmount, availableAmount);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.INSUFFICIENT_FUNDS);
        expect(error.code).toBe('INSUFFICIENT_FUNDS');
        expect(error.message).toBe('Insufficient funds for this transaction');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ 
          requestedAmount, 
          availableAmount 
        });
      });
    });

    describe('createDuplicateTransactionError', () => {
      it('should create duplicate transaction error', () => {
        const reference = 'TXN123456';
        const error = createDuplicateTransactionError(reference);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.DUPLICATE_TRANSACTION);
        expect(error.code).toBe('DUPLICATE_TRANSACTION');
        expect(error.message).toBe('A transaction with this reference already exists');
        expect(error.statusCode).toBe(409);
        expect(error.details).toEqual({ reference });
      });
    });

    describe('createComplianceFailureError', () => {
      it('should create compliance failure error', () => {
        const reason = 'KYC not completed';
        const details = { complianceLevel: 'high' };
        const error = createComplianceFailureError(reason, details);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.COMPLIANCE_FAILURE);
        expect(error.code).toBe('COMPLIANCE_FAILURE');
        expect(error.message).toBe('Compliance check failed: KYC not completed');
        expect(error.statusCode).toBe(403);
        expect(error.details).toEqual({ reason: 'KYC not completed', complianceLevel: 'high' });
      });
    });

    describe('createFraudDetectedError', () => {
      it('should create fraud detected error', () => {
        const reason = 'Unusual transaction pattern';
        const details = { riskScore: 85, riskFactors: ['velocity', 'amount'] };
        const error = createFraudDetectedError(reason, details);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.FRAUD_DETECTED);
        expect(error.code).toBe('FRAUD_DETECTED');
        expect(error.message).toBe('Transaction flagged for potential fraud: Unusual transaction pattern');
        expect(error.statusCode).toBe(403);
        expect(error.details).toEqual({ 
          reason: 'Unusual transaction pattern', 
          riskScore: 85, 
          riskFactors: ['velocity', 'amount'] 
        });
      });
    });

    describe('createInvalidAmountError', () => {
      it('should create invalid amount error', () => {
        const amount = -1000;
        const reason = 'Amount cannot be negative';
        const error = createInvalidAmountError(amount, reason);

        expect(error).toBeInstanceOf(PaymentError);
        expect(error.type).toBe(PaymentErrorType.INVALID_AMOUNT);
        expect(error.code).toBe('INVALID_AMOUNT');
        expect(error.message).toBe('Invalid amount: Amount cannot be negative');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ amount: -1000, reason: 'Amount cannot be negative' });
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle different error types consistently', () => {
      const errors = [
        createValidationError('Invalid data'),
        createAuthenticationError('Invalid token'),
        createAuthorizationError('No access'),
        createNotFoundError('User', '123'),
        createRateLimitError(30),
        createPaymentFailedError('Gateway error'),
        createSystemError('Server error'),
        createInsufficientFundsError(1000, 500),
        createDuplicateTransactionError('REF123'),
        createComplianceFailureError('KYC required'),
        createFraudDetectedError('Suspicious activity'),
        createInvalidAmountError(0, 'Zero amount')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(PaymentError);
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('PaymentError');
        expect(error.type).toBeDefined();
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.statusCode).toBeDefined();
        expect(error.timestamp).toBeDefined();
        expect(typeof error.retryable).toBe('boolean');
        expect(typeof error.userFriendly).toBe('boolean');
      });
    });

    it('should serialize to JSON for logging', () => {
      const error = createValidationError('Test error', { testField: 'testValue' });
      const json = error.toJSON();

      expect(typeof json).toBe('object');
      expect(json.name).toBe('PaymentError');
      expect(json.type).toBe('VALIDATION_ERROR');
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Test error');
      expect(json.details).toEqual({ testField: 'testValue' });
      expect(json.statusCode).toBe(400);
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\.\d{3}Z$/);
      expect(json.retryable).toBe(false);
      expect(json.userFriendly).toBe(true);
    });
  });
});