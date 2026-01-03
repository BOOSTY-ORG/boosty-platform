import crypto from 'crypto';
import {
  ENCRYPTION_ALGORITHM,
  KEY_DERIVATION_ALGORITHM,
  HASH_ALGORITHM,
  HMAC_ALGORITHM,
  KEY_DERIVATION_ITERATIONS,
  KEY_LENGTH,
  IV_LENGTH,
  SALT_LENGTH,
  TAG_LENGTH,
  KEY_CACHE_TTL_MS,
  FIELD_ENCRYPTION_SETTINGS,
  getEncryptionKeyConfig,
  getKeyVersionConfig,
  createEncryptionMetadata,
} from '../config/encryption.config.js';

/**
 * Encryption Service
 *
 * Provides comprehensive encryption and decryption capabilities for sensitive data
 * using AES-256-GCM with authenticated encryption and key management.
 */
class EncryptionService {
  constructor() {
    this.keyCache = new Map();
    this.keyVersionCache = new Map();
    this.currentKeyVersion = 1;
    this.keyCacheTimestamps = new Map();
  }

  /**
   * Derive encryption key from master key using PBKDF2
   * @param {string} masterKey - The master encryption key
   * @param {string} salt - Salt for key derivation
   * @param {string} info - Key derivation info
   * @param {number} iterations - Number of iterations for PBKDF2
   * @returns {Promise<Buffer>} Derived encryption key
   */
  async deriveKey(
    masterKey,
    salt,
    info,
    iterations = KEY_DERIVATION_ITERATIONS
  ) {
    try {
      // Convert inputs to buffers
      const keyBuffer = Buffer.from(masterKey, 'hex');
      const saltBuffer = Buffer.from(salt, 'hex');
      const infoBuffer = Buffer.from(info, 'utf8');

      // Use PBKDF2 to derive the key
      const derivedKey = crypto.pbkdf2Sync(
        keyBuffer,
        saltBuffer,
        iterations,
        KEY_LENGTH,
        HASH_ALGORITHM
      );

      // Zero out sensitive data
      keyBuffer.fill(0);

      return derivedKey;
    } catch (error) {
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  /**
   * Get or derive encryption key with caching
   * @param {number} version - Key version
   * @returns {Promise<Buffer>} Encryption key
   */
  async getEncryptionKey(version = this.currentKeyVersion) {
    const cacheKey = `key-v${version}`;
    const now = Date.now();

    // Check cache first
    if (this.keyCache.has(cacheKey)) {
      const timestamp = this.keyCacheTimestamps.get(cacheKey);
      if (now - timestamp < KEY_CACHE_TTL_MS) {
        return this.keyCache.get(cacheKey);
      }
    }

    try {
      const config = getEncryptionKeyConfig();
      const versionConfig = getKeyVersionConfig(version);

      // Derive the key
      const key = await this.deriveKey(
        config.baseKey,
        config.salt,
        versionConfig.keyInfo,
        versionConfig.iterations
      );

      // Cache the key
      this.keyCache.set(cacheKey, key);
      this.keyCacheTimestamps.set(cacheKey, now);

      return key;
    } catch (error) {
      throw new Error(`Failed to get encryption key: ${error.message}`);
    }
  }

  /**
   * Generate a cryptographically secure random token
   * @param {number} length - Length of the token in bytes
   * @returns {string} Hex-encoded random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random IV
   * @returns {Buffer} Random IV
   */
  generateIV() {
    return crypto.randomBytes(IV_LENGTH);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string|Buffer} data - Data to encrypt
   * @param {number} keyVersion - Key version to use
   * @returns {Promise<Object>} Encrypted data with metadata
   */
  async encrypt(data, keyVersion = this.currentKeyVersion) {
    try {
      // Convert data to buffer if it's a string
      const dataBuffer =
        typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

      // Get encryption key
      const key = await this.getEncryptionKey(keyVersion);

      // Generate random IV
      const iv = this.generateIV();

      // Create cipher
      const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
      cipher.setAAD(Buffer.from(`boosty-v${keyVersion}`, 'utf8'));

      // Encrypt the data
      let encrypted = cipher.update(dataBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Create encrypted payload
      const payload = {
        data: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        metadata: createEncryptionMetadata(keyVersion, `key-${keyVersion}`),
      };

      // Zero out sensitive data
      key.fill(0);
      dataBuffer.fill(0);

      return payload;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedPayload - Encrypted data payload
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encryptedPayload) {
    try {
      const { data, iv, tag, metadata } = encryptedPayload;

      // Validate payload structure
      if (!data || !iv || !tag || !metadata) {
        throw new Error('Invalid encrypted payload structure');
      }

      // Get the key for the specified version
      const key = await this.getEncryptionKey(metadata.version);

      // Convert hex strings to buffers
      const dataBuffer = Buffer.from(data, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      const tagBuffer = Buffer.from(tag, 'hex');

      // Create decipher
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
      decipher.setAAD(Buffer.from(`boosty-v${metadata.version}`, 'utf8'));
      decipher.setAuthTag(tagBuffer);

      // Decrypt the data
      let decrypted = decipher.update(dataBuffer);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Zero out sensitive data
      key.fill(0);
      dataBuffer.fill(0);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt a specific field in a document
   * @param {any} fieldValue - Field value to encrypt
   * @param {string} modelName - Model name
   * @param {string} fieldName - Field name
   * @returns {Promise<Object>} Encrypted field value
   */
  async encryptField(fieldValue, modelName, fieldName) {
    try {
      // Check if field should be encrypted
      const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName]?.[fieldName];
      if (!fieldConfig?.encrypted) {
        return fieldValue;
      }

      // Skip if value is null, undefined, or empty
      if (
        fieldValue === null ||
        fieldValue === undefined ||
        fieldValue === ''
      ) {
        return fieldValue;
      }

      // Convert to string for encryption
      const stringValue =
        typeof fieldValue === 'object'
          ? JSON.stringify(fieldValue)
          : String(fieldValue);

      // Encrypt the value
      const encrypted = await this.encrypt(stringValue);

      // Return encrypted field structure
      return {
        encrypted: true,
        value: encrypted,
        originalType: typeof fieldValue,
        metadata: encrypted.metadata,
      };
    } catch (error) {
      throw new Error(
        `Field encryption failed for ${modelName}.${fieldName}: ${error.message}`
      );
    }
  }

  /**
   * Decrypt a specific field in a document
   * @param {Object} encryptedField - Encrypted field value
   * @param {string} modelName - Model name
   * @param {string} fieldName - Field name
   * @returns {Promise<any>} Decrypted field value
   */
  async decryptField(encryptedField, modelName, fieldName) {
    try {
      // Check if this is an encrypted field
      if (!encryptedField?.encrypted) {
        return encryptedField;
      }

      // Decrypt the value
      const decrypted = await this.decrypt(encryptedField.value);

      // Convert back to original type
      switch (encryptedField.originalType) {
        case 'number':
          return Number(decrypted);
        case 'boolean':
          return decrypted === 'true';
        case 'object':
          return JSON.parse(decrypted);
        default:
          return decrypted;
      }
    } catch (error) {
      throw new Error(
        `Field decryption failed for ${modelName}.${fieldName}: ${error.message}`
      );
    }
  }

  /**
   * Encrypt multiple fields in a document
   * @param {Object} document - Document to encrypt
   * @param {string} modelName - Model name
   * @returns {Promise<Object>} Document with encrypted fields
   */
  async encryptDocumentFields(document, modelName) {
    try {
      const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};
      const encryptedDoc = { ...document };

      // Encrypt each configured field
      for (const [fieldName, config] of Object.entries(fieldConfig)) {
        if (config.encrypted && encryptedDoc[fieldName] !== undefined) {
          encryptedDoc[fieldName] = await this.encryptField(
            encryptedDoc[fieldName],
            modelName,
            fieldName
          );
        }
      }

      return encryptedDoc;
    } catch (error) {
      throw new Error(
        `Document encryption failed for ${modelName}: ${error.message}`
      );
    }
  }

  /**
   * Decrypt multiple fields in a document
   * @param {Object} document - Document to decrypt
   * @param {string} modelName - Model name
   * @returns {Promise<Object>} Document with decrypted fields
   */
  async decryptDocumentFields(document, modelName) {
    try {
      const fieldConfig = FIELD_ENCRYPTION_SETTINGS[modelName] || {};
      const decryptedDoc = { ...document };

      // Decrypt each configured field
      for (const [fieldName, config] of Object.entries(fieldConfig)) {
        if (config.encrypted && decryptedDoc[fieldName]?.encrypted) {
          decryptedDoc[fieldName] = await this.decryptField(
            decryptedDoc[fieldName],
            modelName,
            fieldName
          );
        }
      }

      return decryptedDoc;
    } catch (error) {
      throw new Error(
        `Document decryption failed for ${modelName}: ${error.message}`
      );
    }
  }

  /**
   * Generate HMAC for data integrity verification
   * @param {string|Buffer} data - Data to sign
   * @param {Buffer} key - HMAC key
   * @returns {string} Hex-encoded HMAC
   */
  generateHMAC(data, key) {
    const dataBuffer =
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

    const hmac = crypto.createHmac(HMAC_ALGORITHM, key);
    hmac.update(dataBuffer);

    return hmac.digest('hex');
  }

  /**
   * Verify HMAC for data integrity
   * @param {string|Buffer} data - Data to verify
   * @param {string} signature - HMAC signature to verify against
   * @param {Buffer} key - HMAC key
   * @returns {boolean} True if signature is valid
   */
  verifyHMAC(data, signature, key) {
    try {
      const expectedSignature = this.generateHMAC(data, key);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear encryption key cache
   */
  clearKeyCache() {
    this.keyCache.forEach((key) => key.fill(0));
    this.keyCache.clear();
    this.keyCacheTimestamps.clear();
  }

  /**
   * Rotate encryption keys
   * @returns {Promise<number>} New key version
   */
  async rotateKeys() {
    try {
      // Increment version
      this.currentKeyVersion++;

      // Clear cache to force new key generation
      this.clearKeyCache();

      // Pre-generate new key
      await this.getEncryptionKey(this.currentKeyVersion);

      return this.currentKeyVersion;
    } catch (error) {
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Get current key version
   * @returns {number} Current key version
   */
  getCurrentKeyVersion() {
    return this.currentKeyVersion;
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;
