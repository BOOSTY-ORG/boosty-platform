# Payment Services Documentation

This directory contains all payment-related services for the Boosty Platform.

## Overview

The payment system is built with a modular architecture that supports multiple payment gateways, with Paystack as the primary implementation. The system handles:

- Payment initialization and verification
- Refund processing
- Disbursement and payout management
- Webhook processing
- Transaction state management
- Compliance and fraud detection
- Split payments and recurring payments

## Services

### 1. Payment Gateway Service (`paymentGateway.service.js`)

**Abstract base class** that defines the interface for all payment gateway implementations.

**Key Methods:**

- `initializePayment(request)` - Initialize a payment transaction
- `verifyTransaction(reference)` - Verify transaction status
- `processRefund(request)` - Process a refund
- `createTransfer(request)` - Create a transfer/disbursement
- `createTransferRecipient(request)` - Create a transfer recipient
- `createSplitPayment(request)` - Create split payment configuration
- `fetchSplitPayment(splitCode)` - Fetch split payment configuration
- `createSubAccount(request)` - Create a sub-account
- `fetchTransactions(options)` - Fetch transaction history
- `fetchBalance()` - Fetch account balance
- `verifyWebhookSignature(payload, signature)` - Verify webhook signature

### 2. Paystack Service (`paystack.service.js`)

**Paystack-specific implementation** of the payment gateway interface.

**Features:**

- Full Paystack API integration
- Automatic error conversion to standardized format
- Request/response logging with sensitive data masking
- Support for all Paystack payment methods
- Webhook signature verification

**Configuration:**

- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_WEBHOOK_SECRET` - Webhook verification secret
- `PAYSTACK_BASE_URL` - Paystack API base URL
- `PAYSTACK_TIMEOUT` - Request timeout in milliseconds

### 3. Payment Processor Service (`paymentProcessor.service.js`)

**Orchestrates payment workflows** and handles business logic.

**Key Features:**

- Payment request validation
- Transaction state management
- Fee calculation
- Split payment processing
- Retry logic with exponential backoff
- Integration with multiple payment methods

**Methods:**

- `processPayment(request)` - Complete payment flow
- `verifyPayment(reference)` - Verify and update transaction
- `processRefund(request)` - Handle refunds
- `processDisbursement(request)` - Handle disbursements
- `createTransferRecipient(request)` - Create transfer recipients
- `getBalance()` - Get account balance

### 4. Webhook Handler Service (`webhookHandler.service.js`)

**Processes incoming webhooks** from payment gateways.

**Supported Events:**

- `charge.success` - Successful payment
- `charge.failed` - Failed payment
- `transfer.success` - Successful transfer
- `transfer.failed` - Failed transfer
- `transfer.reversed` - Reversed transfer
- `refund.processed` - Refund processed
- `invoice.create/update` - Invoice events
- `customer.create/update` - Customer events
- `subscription.*` - Subscription events

**Features:**

- Signature verification
- IP whitelisting
- Event parsing and validation
- Automatic transaction updates
- Error handling and retry logic

## Usage Examples

### Initialize a Payment

```javascript
import PaymentProcessorService from '../services/payment/paymentProcessor.service.js';

const paymentProcessor = new PaymentProcessorService();

const result = await paymentProcessor.processPayment({
  transactionId: 'TXN_123456',
  reference: 'TXN_123456',
  type: 'investment',
  amount: 10000, // 100 NGN in kobo
  currency: 'NGN',
  paymentMethod: 'card',
  payer: {
    entity: 'investor',
    id: 'user123',
    email: 'investor@example.com',
  },
  payee: {
    entity: 'system',
    id: null,
  },
  callbackUrl: 'https://boosty.com/payment/callback',
  metadata: {
    investmentId: 'INV_123',
  },
});
```

### Process a Refund

```javascript
const refundResult = await paymentProcessor.processRefund({
  transactionId: 'TXN_123456',
  amount: 5000, // 50 NGN in kobo
  reason: 'Customer requested refund',
  customerNote: 'Refund for order cancellation',
});
```

### Handle Webhooks

```javascript
import WebhookHandlerService from '../services/payment/webhookHandler.service.js';

const webhookHandler = new WebhookHandlerService();

const result = await webhookHandler.processWebhook({
  signature: req.headers['x-paystack-signature'],
  payload: JSON.stringify(req.body),
  headers: req.headers,
});
```

## Error Handling

All services use standardized error handling through the `PaymentError` class and error handler utilities. Errors are categorized into:

- **Validation Errors** - Invalid input data
- **Authentication Errors** - Failed authentication
- **Authorization Errors** - Insufficient permissions
- **Payment Errors** - Payment processing failures
- **Network Errors** - Connection issues
- **Timeout Errors** - Operation timeouts
- **System Errors** - Internal server errors

## Configuration

Payment configuration is managed through environment variables and validated using Joi schemas. See `../config/payment.config.js` for complete configuration options.

## Security Features

- **Webhook Signature Verification** - HMAC-SHA512 signature validation
- **IP Whitelisting** - Restrict webhook processing to known IPs
- **Request Rate Limiting** - Prevent abuse of webhook endpoints
- **Data Encryption** - Sensitive data encryption at rest
- **Input Validation** - Comprehensive input sanitization
- **Audit Logging** - Complete audit trail for all operations

## Integration with Existing System

The payment services integrate with existing Boosty Platform components:

- **Transaction Model** - Extended with Paystack-specific fields
- **User Authentication** - Uses existing auth middleware
- **Metrics System** - Feeds data to existing metrics
- **Notification System** - Triggers notifications for payment events
- **Investment System** - Updates investment status on payment completion

## Testing

The payment services are designed to be easily testable:

```javascript
// Mock Paystack service for testing
import PaystackService from '../services/payment/paystack.service.js';

jest.mock('../services/payment/paystack.service.js').mockImplementation(() => ({
  initializePayment: jest.fn().mockResolvedValue({
    status: 'success',
    data: {
      reference: 'test_ref',
      access_code: 'test_code',
      authorization_url: 'https://test.paystack.co/pay',
    },
  }),
  verifyTransaction: jest.fn().mockResolvedValue({
    status: 'success',
    data: {
      status: 'success',
      amount: 10000,
      paid_at: new Date().toISOString(),
    },
  }),
}));
```

## Performance Considerations

- **Caching** - Frequently accessed data is cached to reduce database load
- **Connection Pooling** - Database connections are reused for efficiency
- **Async Processing** - Heavy operations are moved to background jobs
- **Rate Limiting** - API calls are rate limited to prevent abuse
- **Monitoring** - Comprehensive metrics collection for performance analysis

## Best Practices

1. **Always validate input** before processing
2. **Use transactions** for database consistency
3. **Implement proper error handling** with user-friendly messages
4. **Log all operations** for debugging and auditing
5. **Handle retries** with exponential backoff for transient failures
6. **Never expose sensitive data** in logs or responses
7. **Use HTTPS** for all external API calls
8. **Implement proper timeout handling** for all network operations

## Troubleshooting

### Common Issues

1. **Payment Initialization Fails**
   - Check Paystack API keys
   - Verify request format
   - Check network connectivity

2. **Webhook Not Received**
   - Verify webhook URL is accessible
   - Check signature verification
   - Review Paystack webhook configuration

3. **Transaction Status Mismatch**
   - Verify reference consistency
   - Check for duplicate processing
   - Review transaction state management

### Debug Logging

Enable debug logging by setting environment variable:

```bash
DEBUG=payment=true npm run dev
```

This will provide detailed logs for all payment operations including request/response data (with sensitive information masked).

## API Reference

For complete Paystack API documentation, see: [https://paystack.com/docs/api](https://paystack.com/docs/api)

For internal API documentation, see the individual service files and their JSDoc comments.
