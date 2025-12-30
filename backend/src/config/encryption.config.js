import crypto from 'crypto';

/**
 * Encryption Configuration
 *
 * This module provides configuration for the encryption system,
 * including key derivation, algorithm settings, and key rotation policies.
 */

// Encryption algorithm configuration
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const KEY_DERIVATION_ALGORITHM = 'pbkdf2';
export const HASH_ALGORITHM = 'sha512';
export const HMAC_ALGORITHM = 'sha256';

// Key derivation parameters
export const KEY_DERIVATION_ITERATIONS = 100000;
export const KEY_LENGTH = 32; // 256 bits for AES-256
export const IV_LENGTH = 16; // 128 bits for GCM
export const SALT_LENGTH = 32; // 256 bits
export const TAG_LENGTH = 16; // 128 bits for GCM authentication tag

// Key rotation configuration
export const KEY_ROTATION_INTERVAL_DAYS = 90;
export const MAX_KEY_VERSIONS = 5;
export const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Field encryption settings
export const FIELD_ENCRYPTION_SETTINGS = {
  // User model fields
  user: {
    email: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    phone: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    address: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
  },
  // Payment models fields
  paymentTransaction: {
    accountNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    routingNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    cardLastFour: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    bankName: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    transactionReference: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
  },
  paymentIntent: {
    accountNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    routingNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    bankName: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
  },
  payout: {
    accountNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    bankCode: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    bankName: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    accountName: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
  },
  // KYC Document model fields
  kycDocument: {
    documentNumber: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    issuingAuthority: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
    personalIdentifiers: {
      encrypted: true,
      searchable: false,
      versioned: true,
    },
  },
};

// Environment-based key configuration
export const getEncryptionKeyConfig = () => {
  const env = process.env.NODE_ENV || 'development';

  // Base key from environment variable
  const baseKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!baseKey) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
  }

  // Environment-specific salt
  const salt =
    process.env.ENCRYPTION_SALT ||
    crypto.randomBytes(SALT_LENGTH).toString('hex');

  return {
    baseKey,
    salt,
    env,
  };
};

// Key versioning configuration
export const getKeyVersionConfig = (version = 1) => {
  const config = getEncryptionKeyConfig();

  // Create version-specific key derivation info
  const keyInfo = `boosty-encryption-key-v${version}-${config.env}`;

  return {
    version,
    keyInfo,
    iterations: KEY_DERIVATION_ITERATIONS,
  };
};

// Encryption metadata structure
export const createEncryptionMetadata = (version, keyId) => ({
  version,
  keyId,
  algorithm: ENCRYPTION_ALGORITHM,
  keyDerivation: {
    algorithm: KEY_DERIVATION_ALGORITHM,
    iterations: KEY_DERIVATION_ITERATIONS,
    hash: HASH_ALGORITHM,
  },
  timestamp: new Date().toISOString(),
});

// Default configuration export
export default {
  ENCRYPTION_ALGORITHM,
  KEY_DERIVATION_ALGORITHM,
  HASH_ALGORITHM,
  HMAC_ALGORITHM,
  KEY_DERIVATION_ITERATIONS,
  KEY_LENGTH,
  IV_LENGTH,
  SALT_LENGTH,
  TAG_LENGTH,
  KEY_ROTATION_INTERVAL_DAYS,
  MAX_KEY_VERSIONS,
  KEY_CACHE_TTL_MS,
  FIELD_ENCRYPTION_SETTINGS,
  getEncryptionKeyConfig,
  getKeyVersionConfig,
  createEncryptionMetadata,
};
