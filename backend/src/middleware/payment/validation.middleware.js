import Joi from '../../utils/joi.js';
import {
  PaymentError,
  PaymentErrorType,
} from '../../utils/payment/paymentErrors.util.js';
import logger from '../../utils/payment/paymentLogger.util.js';

/**
 * Payment validation schemas
 */

// Payment initialization validation schema
const paymentInitializationSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    'string.empty': 'Transaction ID is required',
    'any.required': 'Transaction ID is required',
  }),
  transactionType: Joi.string()
    .valid('investment', 'repayment', 'fee', 'refund', 'penalty')
    .required()
    .messages({
      'string.empty': 'Transaction type is required',
      'any.required': 'Transaction type is required',
      'any.only': 'Invalid transaction type',
    }),
  amount: Joi.number().positive().min(100).max(10000000).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.min': 'Amount must be at least 100 NGN',
    'number.max': 'Amount cannot exceed 10,000,000 NGN',
    'any.required': 'Amount is required',
  }),
  currency: Joi.string()
    .valid('NGN', 'USD', 'EUR', 'GBP')
    .default('NGN')
    .messages({
      'any.only': 'Invalid currency',
    }),
  paymentMethod: Joi.string()
    .valid('card', 'bank_transfer', 'mobile_money', 'ussd', 'all')
    .required()
    .messages({
      'string.empty': 'Payment method is required',
      'any.required': 'Payment method is required',
      'any.only': 'Invalid payment method',
    }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'any.required': 'Email is required',
    'string.email': 'Invalid email format',
  }),
  callbackUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Invalid callback URL format',
  }),
  subaccount: Joi.string().optional(),
  metadata: Joi.object().optional(),
  split: Joi.object({
    type: Joi.string().valid('percentage', 'flat').required().messages({
      'any.required': 'Split type is required',
      'any.only': 'Split type must be percentage or flat',
    }),
    subaccounts: Joi.array()
      .items(
        Joi.object({
          subaccount: Joi.string().required(),
          share: Joi.number().positive().required(),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one subaccount is required',
      }),
  }).optional(),
});

// Payment verification validation schema
const paymentVerificationSchema = Joi.object({
  reference: Joi.string().required().messages({
    'string.empty': 'Transaction reference is required',
    'any.required': 'Transaction reference is required',
  }),
});

// Refund validation schema
const refundSchema = Joi.object({
  transactionId: Joi.string().required().messages({
    'string.empty': 'Transaction ID is required',
    'any.required': 'Transaction ID is required',
  }),
  amount: Joi.number().positive().max(10000000).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.max': 'Amount cannot exceed 10,000,000 NGN',
    'any.required': 'Amount is required',
  }),
  reason: Joi.string().max(500).required().messages({
    'string.empty': 'Refund reason is required',
    'any.required': 'Refund reason is required',
    'string.max': 'Refund reason cannot exceed 500 characters',
  }),
  customerNote: Joi.string().max(500).optional().messages({
    'string.max': 'Customer note cannot exceed 500 characters',
  }),
});

// Disbursement validation schema
const disbursementSchema = Joi.object({
  recipientCode: Joi.string().required().messages({
    'string.empty': 'Recipient code is required',
    'any.required': 'Recipient code is required',
  }),
  amount: Joi.number().positive().min(100).max(10000000).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.min': 'Amount must be at least 100 NGN',
    'number.max': 'Amount cannot exceed 10,000,000 NGN',
    'any.required': 'Amount is required',
  }),
  reason: Joi.string().max(500).required().messages({
    'string.empty': 'Disbursement reason is required',
    'any.required': 'Disbursement reason is required',
    'string.max': 'Disbursement reason cannot exceed 500 characters',
  }),
  currency: Joi.string()
    .valid('NGN', 'USD', 'EUR', 'GBP')
    .default('NGN')
    .messages({
      'any.only': 'Invalid currency',
    }),
  metadata: Joi.object().optional(),
});

// Transfer recipient validation schema
const transferRecipientSchema = Joi.object({
  type: Joi.string()
    .valid('nuban', 'mobile_money', 'card')
    .required()
    .messages({
      'string.empty': 'Recipient type is required',
      'any.required': 'Recipient type is required',
      'any.only': 'Recipient type must be nuban, mobile_money, or card',
    }),
  name: Joi.string().max(100).required().messages({
    'string.empty': 'Recipient name is required',
    'any.required': 'Recipient name is required',
    'string.max': 'Recipient name cannot exceed 100 characters',
  }),
  accountNumber: Joi.string().required().messages({
    'string.empty': 'Account number is required',
    'any.required': 'Account number is required',
  }),
  bankCode: Joi.string().required().messages({
    'string.empty': 'Bank code is required',
    'any.required': 'Bank code is required',
  }),
  currency: Joi.string()
    .valid('NGN', 'USD', 'EUR', 'GBP')
    .default('NGN')
    .messages({
      'any.only': 'Invalid currency',
    }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format',
  }),
  description: Joi.string().max(200).optional().messages({
    'string.max': 'Description cannot exceed 200 characters',
  }),
});

// Split payment validation schema
const splitPaymentSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'string.empty': 'Split name is required',
    'any.required': 'Split name is required',
    'string.max': 'Split name cannot exceed 100 characters',
  }),
  type: Joi.string().valid('percentage', 'flat').required().messages({
    'string.empty': 'Split type is required',
    'any.required': 'Split type is required',
    'any.only': 'Split type must be percentage or flat',
  }),
  currency: Joi.string()
    .valid('NGN', 'USD', 'EUR', 'GBP')
    .default('NGN')
    .messages({
      'any.only': 'Invalid currency',
    }),
  subaccounts: Joi.array()
    .items(
      Joi.object({
        subaccount: Joi.string().required(),
        share: Joi.number().positive().required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one subaccount is required',
    }),
  bearerType: Joi.string()
    .valid('account', 'subaccount', 'all')
    .optional()
    .messages({
      'any.only': 'Bearer type must be account, subaccount, or all',
    }),
  bearerSubaccount: Joi.string().optional(),
});

// Sub-account validation schema
const subAccountSchema = Joi.object({
  businessName: Joi.string().max(100).required().messages({
    'string.empty': 'Business name is required',
    'any.required': 'Business name is required',
    'string.max': 'Business name cannot exceed 100 characters',
  }),
  settlementBank: Joi.string().required().messages({
    'string.empty': 'Settlement bank is required',
    'any.required': 'Settlement bank is required',
  }),
  accountNumber: Joi.string().required().messages({
    'string.empty': 'Account number is required',
    'any.required': 'Account number is required',
  }),
  percentageCharge: Joi.number().min(0).max(100).required().messages({
    'number.base': 'Percentage charge must be a number',
    'number.min': 'Percentage charge cannot be negative',
    'number.max': 'Percentage charge cannot exceed 100',
    'any.required': 'Percentage charge is required',
  }),
  description: Joi.string().max(200).optional().messages({
    'string.max': 'Description cannot exceed 200 characters',
  }),
  primaryContactEmail: Joi.string().email().optional().messages({
    'string.email': 'Invalid email format',
  }),
  primaryContactName: Joi.string().max(100).optional().messages({
    'string.max': 'Primary contact name cannot exceed 100 characters',
  }),
  settlementSchedule: Joi.string()
    .valid('auto', 'weekly', 'monthly', 'manual')
    .optional()
    .messages({
      'any.only':
        'Settlement schedule must be auto, weekly, monthly, or manual',
    }),
});

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const validationError = new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'VALIDATION_ERROR',
        'Validation failed',
        {
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
          })),
        }
      );

      logger.warn('Validation failed', {
        url: req.url,
        method: req.method,
        errors: validationError.details,
        userId: req.auth?._id,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: validationError.code,
          message: validationError.message,
          details: validationError.details,
        },
      });
    }

    // Store validated data
    req[`validated${source.charAt(0).toUpperCase() + source.slice(1)}`] = value;
    next();
  };
};

/**
 * Validate payment business rules
 * @param {Object} paymentData - Payment data to validate
 * @private
 */
const validatePaymentBusinessRules = async (paymentData) => {
  // Check if transaction type is allowed for user role
  if (
    paymentData.transactionType === 'refund' ||
    paymentData.transactionType === 'penalty'
  ) {
    // Only admins can process refunds and penalties
    // This would be checked in the controller based on user role
  }

  // Validate split payment configuration
  if (paymentData.split) {
    const totalShare = paymentData.split.subaccounts.reduce(
      (sum, sub) => sum + sub.share,
      0
    );

    if (paymentData.split.type === 'percentage' && totalShare !== 100) {
      throw new PaymentError(
        PaymentErrorType.VALIDATION_ERROR,
        'INVALID_SPLIT_CONFIG',
        'Split percentages must sum to 100%',
        { totalShare }
      );
    }
  }

  // Check payment method availability
  const availableMethods = getAvailablePaymentMethods();
  if (!availableMethods.includes(paymentData.paymentMethod)) {
    throw new PaymentError(
      PaymentErrorType.VALIDATION_ERROR,
      'PAYMENT_METHOD_UNAVAILABLE',
      'Payment method is not currently available',
      { paymentMethod: paymentData.paymentMethod }
    );
  }

  // Validate amount limits
  await validateAmountLimits(paymentData);
};

/**
 * Get available payment methods based on configuration
 * @returns {string[]} Array of available payment methods
 * @private
 */
const getAvailablePaymentMethods = () => {
  const methods = [];

  if (process.env.ENABLE_CARD_PAYMENTS === 'true') methods.push('card');
  if (process.env.ENABLE_BANK_TRANSFER === 'true')
    methods.push('bank_transfer');
  if (process.env.ENABLE_MOBILE_MONEY === 'true') methods.push('mobile_money');
  if (process.env.ENABLE_USSD_PAYMENTS === 'true') methods.push('ussd');

  return methods.length > 0 ? methods : ['card', 'bank_transfer']; // Default methods
};

/**
 * Validate amount limits
 * @param {Object} paymentData - Payment data with amount
 * @private
 */
const validateAmountLimits = async (paymentData) => {
  const minAmount = parseInt(process.env.MIN_TRANSACTION_AMOUNT) || 100;
  const maxAmount = parseInt(process.env.MAX_TRANSACTION_AMOUNT) || 10000000;

  if (paymentData.amount < minAmount) {
    throw new PaymentError(
      PaymentErrorType.INVALID_AMOUNT,
      'AMOUNT_BELOW_MINIMUM',
      `Amount must be at least ${minAmount} NGN`,
      { minAmount, providedAmount: paymentData.amount }
    );
  }

  if (paymentData.amount > maxAmount) {
    throw new PaymentError(
      PaymentErrorType.INVALID_AMOUNT,
      'AMOUNT_ABOVE_MAXIMUM',
      `Amount cannot exceed ${maxAmount} NGN`,
      { maxAmount, providedAmount: paymentData.amount }
    );
  }
};

/**
 * Validate payment initialization request
 */
export const validatePaymentInitialization = async (req, res, next) => {
  try {
    // First validate schema
    await validate(paymentInitializationSchema, 'body')(req, res, () => {});

    // Then validate business rules
    await validatePaymentBusinessRules(req.validatedBody);

    next();
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: {
        code: error.code || 'VALIDATION_ERROR',
        message: error.message,
        details: error.details,
      },
    });
  }
};

/**
 * Validate payment verification request
 */
export const validatePaymentVerification = validate(
  paymentVerificationSchema,
  'query'
);

/**
 * Validate refund request
 */
export const validateRefundRequest = validate(refundSchema, 'body');

/**
 * Validate disbursement request
 */
export const validateDisbursementRequest = validate(disbursementSchema, 'body');

/**
 * Validate transfer recipient request
 */
export const validateTransferRecipientRequest = validate(
  transferRecipientSchema,
  'body'
);

/**
 * Validate split payment request
 */
export const validateSplitPaymentRequest = validate(splitPaymentSchema, 'body');

/**
 * Validate sub-account request
 */
export const validateSubAccountRequest = validate(subAccountSchema, 'body');

export default {
  validatePaymentInitialization,
  validatePaymentVerification,
  validateRefundRequest,
  validateDisbursementRequest,
  validateTransferRecipientRequest,
  validateSplitPaymentRequest,
  validateSubAccountRequest,
  validate,
};
