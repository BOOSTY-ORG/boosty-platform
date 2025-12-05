# Boosty Payment API Documentation

## Overview

This directory contains comprehensive documentation for the Boosty Payment API, designed to help frontend developers integrate payment processing, transaction history, ROI analytics, and payout management into their applications.

## Documentation Structure

### 📚 Core Documentation

1. **[Payment API Documentation](./payment-api.md)**
   - Main overview of the payment system architecture
   - Authentication and security requirements
   - Common response formats and error handling
   - Payment flow diagrams and sequence flows
   - SDK integration guidelines

2. **[Payment Endpoints Reference](./payment-endpoints.md)**
   - Detailed documentation for all payment endpoints
   - Request/response examples for each endpoint
   - Parameter descriptions and validation rules
   - Error codes and troubleshooting
   - Rate limiting information

3. **[Transaction History API Documentation](./transaction-history-api.md)**
   - Comprehensive guide to transaction history endpoints
   - Advanced filtering options and examples
   - Pagination strategies and best practices
   - Export functionality documentation
   - Performance considerations

4. **[ROI and Payout API Documentation](./roi-payout-api.md)**
   - ROI analytics endpoints documentation
   - Payout management and analytics endpoints
   - Data interpretation guidelines
   - Calculation formulas and methodologies
   - Use cases and implementation examples

5. **[Frontend Integration Guide](./frontend-integration-guide.md)**
   - Step-by-step integration guide
   - React/JavaScript code examples
   - State management recommendations
   - Error handling best practices
   - Testing strategies for frontend

### 🔧 Development Tools

6. **[Postman Collection](./Boosty-Payment-API.postman_collection.json)**
   - Complete Postman collection for all endpoints
   - Environment variables configuration
   - Sample requests with test data
   - Automated test scripts

## Quick Start

### 1. Prerequisites

- Node.js 14+ and npm/yarn
- React 16.8+ or Vue 3+ (for framework-specific examples)
- Basic knowledge of JavaScript/TypeScript
- API credentials from Boosty

### 2. Installation

```bash
# Install the SDK
npm install @boosty/payment-sdk

# For React
npm install @boosty/payment-react

# For Vue
npm install @boosty/payment-vue
```

### 3. Basic Setup

```javascript
import { BoostyPayments } from '@boosty/payment-sdk';

const payments = new BoostyPayments({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.boosty.com'
});

// Initialize a payment
const payment = await payments.initialize({
  amount: 10000,
  email: 'customer@example.com',
  paymentMethod: 'card'
});

// Verify payment
const verification = await payments.verify(payment.reference);
```

### 4. Import Postman Collection

1. Open Postman
2. Click "Import" → "Link"
3. Paste the raw URL to the `Boosty-Payment-API.postman_collection.json` file
4. Configure environment variables with your API credentials

## API Endpoints Summary

### Payment Management
- `POST /api/payments/initialize` - Initialize payment
- `GET /api/payments/verify` - Verify payment status
- `GET /api/payments/{transactionId}` - Get transaction details
- `GET /api/payments` - Get transactions list
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/balance` - Get account balance
- `POST /api/payments/recipients` - Create transfer recipient

### Payment Configuration
- `GET /api/payments/methods` - Get available payment methods
- `GET /api/payments/fees` - Get fee structure
- `GET /api/payments/limits` - Get payment limits

### Transaction History
- `GET /api/transactions/history` - Get transaction history
- `GET /api/transactions/users/{userId}` - Get user transactions
- `GET /api/transactions/investors/{investorId}` - Get investor transactions
- `GET /api/transactions/timeline` - Get transaction timeline
- `POST /api/transactions/export` - Export transaction data

### ROI Analytics
- `GET /api/roi-analytics/investments/{investmentId}` - Calculate investment ROI
- `GET /api/roi-analytics/portfolio/{investorId}` - Calculate portfolio ROI
- `GET /api/roi-analytics/performance/{investorId}` - Get ROI performance tracking
- `GET /api/roi-analytics/projections/{investorId}` - Generate ROI projections
- `GET /api/roi-analytics/risk-adjusted/{investmentId}` - Calculate risk-adjusted ROI
- `GET /api/roi-analytics/dashboard/{investorId}` - Get ROI dashboard
- `GET /api/roi-analytics/insights/{investorId}` - Get ROI insights

### Payout Management
- `POST /api/payouts/process` - Process payout
- `POST /api/payouts/batch` - Process batch payouts
- `GET /api/payouts/{payoutId}` - Get payout details
- `GET /api/payouts` - Get payouts list

### Payout Analytics
- `GET /api/payout-analytics/analytics` - Get payout analytics
- `GET /api/payout-analytics/efficiency` - Get efficiency analysis
- `GET /api/payout-analytics/forecasting` - Get payout forecasting
- `GET /api/payout-analytics/distribution` - Get distribution analysis
- `GET /api/payout-analytics/compliance` - Get compliance analytics
- `GET /api/payout-analytics/optimization` - Get optimization recommendations

## Authentication

All API requests require authentication using either:

1. **API Key Authentication** (for server-to-server communication)
   ```http
   Authorization: Bearer YOUR_API_KEY
   ```

2. **JWT Token Authentication** (for user-specific operations)
   ```http
   Authorization: Bearer YOUR_JWT_TOKEN
   ```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data specific to endpoint
  },
  "meta": {
    "timestamp": "2023-12-04T21:30:00.000Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  },
  "meta": {
    "timestamp": "2023-12-04T21:30:00.000Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
```

## Payment Methods

| Method | Description | Status | Fees |
|--------|-------------|--------|------|
| Card | Debit/Credit card payments | ✅ Active | 1.5% + ₦100 |
| Bank Transfer | Direct bank transfer | ✅ Active | 0% |
| Mobile Money | Mobile wallet payments | ✅ Active | 1.0% + ₦100 |
| USSD | USSD code payments | ✅ Active | 0.5% + ₦100 |

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|-------------|--------|
| Payment initialization | 100 requests | 15 minutes |
| Payment verification | 200 requests | 15 minutes |
| Transaction history | 50 requests | 15 minutes |
| Analytics endpoints | 30 requests | 15 minutes |
| All other endpoints | 100 requests | 15 minutes |

## Webhooks

### Supported Events
- `payment.completed` - Payment successfully completed
- `payment.failed` - Payment processing failed
- `payment.partial` - Partial payment received
- `payout.processed` - Payout successfully processed
- `payout.failed` - Payout processing failed

### Webhook Security
1. **Signature Verification**: Verify webhook signatures using your webhook secret
2. **HTTPS Only**: Webhook URLs must use HTTPS
3. **Retry Logic**: Webhooks are retried up to 5 times with exponential backoff
4. **Timeout**: Webhook requests timeout after 30 seconds

## SDK Integration

### JavaScript/Node.js
```javascript
import BoostyPayments from '@boosty/payment-sdk';

const payments = new BoostyPayments({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.boosty.com'
});

// Initialize payment
const payment = await payments.initialize({
  amount: 10000,
  email: 'customer@example.com',
  paymentMethod: 'card'
});
```

### React
```jsx
import { useBoostyPayments } from '@boosty/payment-react';

function PaymentComponent() {
  const { initializePayment, verifyPayment, loading, error } = useBoostyPayments();
  
  const handlePayment = async () => {
    try {
      const payment = await initializePayment({
        amount: 10000,
        email: 'customer@example.com'
      });
      
      // Redirect to payment page
      window.location.href = payment.authorizationUrl;
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };
  
  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
}
```

## Testing

### Test Environment
- Base URL: `https://dev-api.boosty.com`
- Test Cards: `4123450141003456` (Visa), `5060990580000217` (Verve)
- Test Bank: `058` (GTBank) with account `0000000000`

### Test Scenarios
1. **Successful Payment**: Use valid test card details
2. **Failed Payment**: Use expired card or insufficient funds
3. **Refund**: Process refund for completed transaction
4. **Webhook**: Test webhook handling with test events

## Error Handling

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request parameters are invalid |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction does not exist |
| `PAYMENT_FAILED` | 500 | Payment processing failed |
| `RATE_LIMIT_EXCEEDED` | 429 | API rate limit exceeded |

### Best Practices

1. **Always check the `success` field** in API responses
2. **Implement exponential backoff** for retry logic
3. **Log error codes and messages** for debugging
4. **Display user-friendly messages** based on error codes
5. **Handle network timeouts** gracefully

## Support

For technical support and documentation updates:

- **Email**: api-support@boosty.com
- **Documentation**: https://docs.boosty.com
- **Status Page**: https://status.boosty.com
- **GitHub Issues**: https://github.com/boosty/payment-api/issues

## Changelog

### v1.0.0 (2023-12-04)
- Initial release of comprehensive payment API documentation
- Added payment processing, transaction history, ROI analytics, and payout management
- Included frontend integration guides and Postman collection
- Added comprehensive error handling and testing documentation

## Contributing

To contribute to the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request with a clear description of changes

## License

This documentation is licensed under the MIT License. See the LICENSE file for details.