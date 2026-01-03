/**
 * Encryption Usage Examples
 *
 * This file demonstrates how to use the encryption system
 * in controllers and routes for the Boosty Platform.
 */

import express from 'express';
import {
  encryptRequestData,
  decryptResponseData,
  validateEncryptionRequirements,
  addEncryptionHeaders,
  handleEncryptionErrors,
  conditionalDecryption,
} from '../middleware/encryption.middleware.js';
import encryptionService from '../services/encryption.service.js';
import User from '../models/user.model.js';
import PaymentTransaction from '../models/payment/paymentTransaction.model.js';
import Payout from '../models/payment/payout.model.js';
import KYCDocument from '../models/metrics/kycDocument.model.js';

const router = express.Router();

/**
 * Example: User registration with encrypted sensitive data
 */
router.post(
  '/users/register',
  [
    // Add encryption headers
    addEncryptionHeaders(),

    // Encrypt sensitive request data
    encryptRequestData('user'),

    // Validate encryption requirements
    validateEncryptionRequirements('user'),

    // Handle encryption errors
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      // Create user with encrypted data
      const user = new User(req.body);
      await user.save();

      // Decrypt response data for authorized users
      if (!req.keepEncrypted) {
        const decryptedEmail = await user.getDecryptedEmail();
        const decryptedPhone = await user.getDecryptedPhone();
        const decryptedAddress = await user.getDecryptedAddress();

        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: {
            id: user._id,
            name: user.name,
            email: decryptedEmail,
            phone: decryptedPhone,
            address: decryptedAddress,
          },
        });
      } else {
        // Return encrypted data for unauthorized users
        res.status(201).json({
          success: true,
          message: 'User created successfully',
          user: {
            id: user._id,
            name: user.name,
            email: user.email, // Still encrypted
            phone: user.phone, // Still encrypted
            address: user.address, // Still encrypted
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Payment transaction creation with encryption
 */
router.post(
  '/payments/transactions',
  [
    addEncryptionHeaders(),
    encryptRequestData('paymentTransaction'),
    validateEncryptionRequirements('paymentTransaction'),
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      // Create payment transaction with encrypted sensitive data
      const transaction = new PaymentTransaction(req.body);
      await transaction.save();

      // Get decrypted values for response (if authorized)
      const decryptedBank = await transaction.getDecryptedBank();
      const decryptedLastFour = await transaction.getDecryptedLastFour();

      res.status(201).json({
        success: true,
        message: 'Payment transaction created successfully',
        transaction: {
          id: transaction._id,
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          bank: req.keepEncrypted ? transaction.bank : decryptedBank,
          last4: req.keepEncrypted ? transaction.last4 : decryptedLastFour,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Payout creation with encryption
 */
router.post(
  '/payouts',
  [
    addEncryptionHeaders(),
    encryptRequestData('payout'),
    validateEncryptionRequirements('payout'),
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      // Create payout with encrypted account information
      const payout = new Payout(req.body);
      await payout.save();

      // Get decrypted values for response (if authorized)
      const decryptedAccountNumber = await payout.getDecryptedAccountNumber();
      const decryptedBankName = await payout.getDecryptedBankName();
      const decryptedAccountName = await payout.getDecryptedAccountName();

      res.status(201).json({
        success: true,
        message: 'Payout created successfully',
        payout: {
          id: payout._id,
          payoutId: payout.payoutId,
          amount: payout.amount,
          status: payout.status,
          recipientAccount: req.keepEncrypted
            ? payout.recipientAccount
            : {
                accountNumber: decryptedAccountNumber,
                bankName: decryptedBankName,
                accountName: decryptedAccountName,
              },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: KYC document upload with encryption
 */
router.post(
  '/kyc/documents',
  [
    addEncryptionHeaders(),
    encryptRequestData('kycDocument'),
    validateEncryptionRequirements('kycDocument'),
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      // Create KYC document with encrypted sensitive data
      const kycDocument = new KYCDocument(req.body);
      await kycDocument.save();

      // Get decrypted values for response (if authorized)
      const decryptedDocumentNumber =
        await kycDocument.getDecryptedDocumentNumber();
      const decryptedIssuingAuthority =
        await kycDocument.getDecryptedIssuingAuthority();
      const decryptedPersonalIdentifiers =
        await kycDocument.getDecryptedPersonalIdentifiers();

      res.status(201).json({
        success: true,
        message: 'KYC document uploaded successfully',
        document: {
          id: kycDocument._id,
          documentType: kycDocument.documentType,
          documentUrl: kycDocument.documentUrl,
          verificationStatus: kycDocument.verificationStatus,
          documentNumber: req.keepEncrypted
            ? kycDocument.documentNumber
            : decryptedDocumentNumber,
          issuingAuthority: req.keepEncrypted
            ? kycDocument.issuingAuthority
            : decryptedIssuingAuthority,
          personalIdentifiers: req.keepEncrypted
            ? kycDocument.personalIdentifiers
            : decryptedPersonalIdentifiers,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: User profile retrieval with conditional decryption
 */
router.get(
  '/users/profile',
  [
    addEncryptionHeaders(),
    conditionalDecryption(),
    decryptResponseData('user'),
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      // Find user (data will be automatically decrypted by middleware)
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Response data will be automatically encrypted/decrypted based on permissions
      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email, // Automatically decrypted if authorized
          phone: user.phone, // Automatically decrypted if authorized
          address: user.address, // Automatically decrypted if authorized
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Search transactions with encrypted fields
 */
router.get(
  '/payments/transactions/search',
  [
    addEncryptionHeaders(),
    conditionalDecryption(),
    decryptResponseData('paymentTransaction'),
    handleEncryptionErrors(),
  ],
  async (req, res, next) => {
    try {
      const { bankName, lastFour, ...otherFilters } = req.query;

      const filter = { ...otherFilters };

      // Search by encrypted bank name if provided
      if (bankName) {
        const transactions = await PaymentTransaction.findByBankName(bankName);
        return res.json({
          success: true,
          transactions: transactions,
        });
      }

      // Search by encrypted last 4 digits if provided
      if (lastFour) {
        const transactions =
          await PaymentTransaction.findByCardLastFour(lastFour);
        return res.json({
          success: true,
          transactions: transactions,
        });
      }

      // Regular search with other filters
      const transactions = await PaymentTransaction.find(filter);

      res.json({
        success: true,
        transactions: transactions, // Automatically decrypted if authorized
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Manual encryption/decryption in controller
 */
router.post(
  '/example/manual-encryption',
  [addEncryptionHeaders(), handleEncryptionErrors()],
  async (req, res, next) => {
    try {
      const { sensitiveData, operation } = req.body;

      if (operation === 'encrypt') {
        // Manual encryption example
        const encrypted = await encryptionService.encrypt(sensitiveData);

        res.json({
          success: true,
          operation: 'encrypt',
          result: encrypted,
        });
      } else if (operation === 'decrypt') {
        // Manual decryption example
        const decrypted = await encryptionService.decrypt(sensitiveData);

        res.json({
          success: true,
          operation: 'decrypt',
          result: decrypted,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid operation. Use "encrypt" or "decrypt".',
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Secure file upload with encryption metadata
 */
router.post(
  '/example/secure-upload',
  [addEncryptionHeaders(), handleEncryptionErrors()],
  async (req, res, next) => {
    try {
      const { fileName, fileData, metadata } = req.body;

      // Generate secure token for file
      const fileToken = encryptionService.generateSecureToken(32);

      // Encrypt file metadata
      const encryptedMetadata = await encryptionService.encryptDocumentFields(
        metadata,
        'kycDocument'
      );

      // Generate HMAC for file integrity
      const fileHmac = encryptionService.generateHMAC(
        fileData,
        Buffer.from(fileToken, 'hex')
      );

      res.json({
        success: true,
        fileToken,
        encryptedMetadata,
        fileHmac,
        message: 'File uploaded securely with encryption',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Example: Key rotation endpoint (admin only)
 */
router.post(
  '/admin/rotate-keys',
  [addEncryptionHeaders(), handleEncryptionErrors()],
  async (req, res, next) => {
    try {
      // Only allow admins to rotate keys
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      // Rotate encryption keys
      const newVersion = await encryptionService.rotateKeys();

      res.json({
        success: true,
        message: 'Encryption keys rotated successfully',
        newKeyVersion: newVersion,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
