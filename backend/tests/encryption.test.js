import { jest } from '@jest/globals';
import encryptionService from '../src/services/encryption.service.js';
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
  FIELD_ENCRYPTION_SETTINGS,
  getEncryptionKeyConfig,
  getKeyVersionConfig,
  createEncryptionMetadata,
} from '../src/config/encryption.config.js';

describe('Encryption Service', () => {
  beforeEach(() => {
    // Clear key cache before each test
    encryptionService.clearKeyCache();

    // Set up test environment variables
    process.env.ENCRYPTION_MASTER_KEY =
      'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
    process.env.ENCRYPTION_SALT =
      'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.ENCRYPTION_SALT;
  });

  describe('Key Management', () => {
    test('should derive encryption key correctly', async () => {
      const masterKey =
        'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890';
      const salt =
        'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321';
      const info = 'test-key-info';

      const key = await encryptionService.deriveKey(masterKey, salt, info);

      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(KEY_LENGTH);
    });

    test('should get encryption key with caching', async () => {
      const key1 = await encryptionService.getEncryptionKey(1);
      const key2 = await encryptionService.getEncryptionKey(1);

      expect(key1).toBeInstanceOf(Buffer);
      expect(key2).toBeInstanceOf(Buffer);
      expect(key1.equals(key2)).toBe(true);
    });

    test('should generate different keys for different versions', async () => {
      const key1 = await encryptionService.getEncryptionKey(1);
      const key2 = await encryptionService.getEncryptionKey(2);

      expect(key1.equals(key2)).toBe(false);
    });

    test('should rotate keys correctly', async () => {
      const initialVersion = encryptionService.getCurrentKeyVersion();
      const newVersion = await encryptionService.rotateKeys();

      expect(newVersion).toBe(initialVersion + 1);
      expect(encryptionService.getCurrentKeyVersion()).toBe(newVersion);
    });
  });

  describe('Token Generation', () => {
    test('should generate secure random token', () => {
      const token = encryptionService.generateSecureToken(32);

      expect(token).toBeTypeOf('string');
      expect(token.length).toBe(64); // 32 bytes * 2 (hex)
    });

    test('should generate tokens of different lengths', () => {
      const token16 = encryptionService.generateSecureToken(16);
      const token32 = encryptionService.generateSecureToken(32);

      expect(token16.length).toBe(32); // 16 bytes * 2 (hex)
      expect(token32.length).toBe(64); // 32 bytes * 2 (hex)
      expect(token16).not.toBe(token32);
    });

    test('should generate unique tokens', () => {
      const token1 = encryptionService.generateSecureToken(32);
      const token2 = encryptionService.generateSecureToken(32);

      expect(token1).not.toBe(token2);
    });
  });

  describe('IV Generation', () => {
    test('should generate random IV', () => {
      const iv = encryptionService.generateIV();

      expect(iv).toBeInstanceOf(Buffer);
      expect(iv.length).toBe(IV_LENGTH);
    });

    test('should generate unique IVs', () => {
      const iv1 = encryptionService.generateIV();
      const iv2 = encryptionService.generateIV();

      expect(iv1.equals(iv2)).toBe(false);
    });
  });

  describe('Encryption/Decryption', () => {
    test('should encrypt and decrypt string data', async () => {
      const originalData = 'This is a test string for encryption';

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('metadata');
      expect(decrypted).toBe(originalData);
    });

    test('should encrypt and decrypt buffer data', async () => {
      const originalData = Buffer.from('This is test buffer data', 'utf8');

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData.toString('utf8'));
    });

    test('should handle empty string encryption', async () => {
      const originalData = '';

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    test('should handle special characters', async () => {
      const originalData = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    test('should handle Unicode characters', async () => {
      const originalData = 'Unicode: 🌟💫✨ 中文字符 العربية русский';

      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    test('should fail decryption with wrong data', async () => {
      const encrypted = await encryptionService.encrypt('test data');

      // Modify encrypted data to make it invalid
      encrypted.data = 'invalid_data';

      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow(
        'Decryption failed'
      );
    });

    test('should fail decryption with missing fields', async () => {
      const invalidPayload = {
        data: 'some_data',
        // Missing iv, tag, metadata
      };

      await expect(encryptionService.decrypt(invalidPayload)).rejects.toThrow(
        'Decryption failed'
      );
    });
  });

  describe('Field Encryption', () => {
    test('should encrypt field value', async () => {
      const fieldValue = 'user@example.com';
      const modelName = 'user';
      const fieldName = 'email';

      const encrypted = await encryptionService.encryptField(
        fieldValue,
        modelName,
        fieldName
      );

      expect(encrypted).toHaveProperty('encrypted', true);
      expect(encrypted).toHaveProperty('value');
      expect(encrypted).toHaveProperty('originalType', 'string');
      expect(encrypted).toHaveProperty('metadata');
    });

    test('should decrypt field value', async () => {
      const fieldValue = 'user@example.com';
      const modelName = 'user';
      const fieldName = 'email';

      const encrypted = await encryptionService.encryptField(
        fieldValue,
        modelName,
        fieldName
      );
      const decrypted = await encryptionService.decryptField(
        encrypted,
        modelName,
        fieldName
      );

      expect(decrypted).toBe(fieldValue);
    });

    test('should handle different data types in field encryption', async () => {
      const testCases = [
        { value: 123, type: 'number' },
        { value: true, type: 'boolean' },
        { value: { nested: 'object' }, type: 'object' },
        { value: [1, 2, 3], type: 'object' },
      ];

      for (const testCase of testCases) {
        const encrypted = await encryptionService.encryptField(
          testCase.value,
          'test',
          'testField'
        );
        const decrypted = await encryptionService.decryptField(
          encrypted,
          'test',
          'testField'
        );

        expect(decrypted).toEqual(testCase.value);
      }
    });

    test('should skip encryption for non-configured fields', async () => {
      const fieldValue = 'test value';
      const modelName = 'nonexistent';
      const fieldName = 'nonexistent';

      const result = await encryptionService.encryptField(
        fieldValue,
        modelName,
        fieldName
      );

      expect(result).toBe(fieldValue);
    });

    test('should skip decryption for non-encrypted fields', async () => {
      const fieldValue = 'test value';

      const result = await encryptionService.decryptField(
        fieldValue,
        'test',
        'testField'
      );

      expect(result).toBe(fieldValue);
    });
  });

  describe('Document Encryption', () => {
    test('should encrypt document fields', async () => {
      const document = {
        email: 'user@example.com',
        phone: '+1234567890',
        name: 'John Doe',
        nonEncrypted: 'public data',
      };

      const encrypted = await encryptionService.encryptDocumentFields(
        document,
        'user'
      );

      expect(encrypted.email).toHaveProperty('encrypted', true);
      expect(encrypted.phone).toHaveProperty('encrypted', true);
      expect(encrypted.name).toBe('John Doe'); // Not configured for encryption
      expect(encrypted.nonEncrypted).toBe('public data');
    });

    test('should decrypt document fields', async () => {
      const document = {
        email: 'user@example.com',
        phone: '+1234567890',
        name: 'John Doe',
      };

      const encrypted = await encryptionService.encryptDocumentFields(
        document,
        'user'
      );
      const decrypted = await encryptionService.decryptDocumentFields(
        encrypted,
        'user'
      );

      expect(decrypted.email).toBe('user@example.com');
      expect(decrypted.phone).toBe('+1234567890');
      expect(decrypted.name).toBe('John Doe');
    });

    test('should handle empty documents', async () => {
      const document = {};

      const encrypted = await encryptionService.encryptDocumentFields(
        document,
        'user'
      );
      const decrypted = await encryptionService.decryptDocumentFields(
        encrypted,
        'user'
      );

      expect(encrypted).toEqual({});
      expect(decrypted).toEqual({});
    });
  });

  describe('HMAC Operations', () => {
    test('should generate HMAC for data', () => {
      const data = 'test data for HMAC';
      const key = Buffer.from('test-key', 'utf8');

      const hmac = encryptionService.generateHMAC(data, key);

      expect(hmac).toBeTypeOf('string');
      expect(hmac.length).toBe(64); // SHA-256 produces 64 hex characters
    });

    test('should verify HMAC correctly', () => {
      const data = 'test data for HMAC';
      const key = Buffer.from('test-key', 'utf8');

      const hmac = encryptionService.generateHMAC(data, key);
      const isValid = encryptionService.verifyHMAC(data, hmac, key);

      expect(isValid).toBe(true);
    });

    test('should fail HMAC verification with wrong data', () => {
      const data = 'test data for HMAC';
      const wrongData = 'wrong data';
      const key = Buffer.from('test-key', 'utf8');

      const hmac = encryptionService.generateHMAC(data, key);
      const isValid = encryptionService.verifyHMAC(wrongData, hmac, key);

      expect(isValid).toBe(false);
    });

    test('should fail HMAC verification with wrong key', () => {
      const data = 'test data for HMAC';
      const key = Buffer.from('test-key', 'utf8');
      const wrongKey = Buffer.from('wrong-key', 'utf8');

      const hmac = encryptionService.generateHMAC(data, key);
      const isValid = encryptionService.verifyHMAC(data, hmac, wrongKey);

      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing master key', async () => {
      delete process.env.ENCRYPTION_MASTER_KEY;

      await expect(encryptionService.getEncryptionKey()).rejects.toThrow(
        'ENCRYPTION_MASTER_KEY environment variable is required'
      );
    });

    test('should handle invalid encrypted payload', async () => {
      const invalidPayload = null;

      await expect(encryptionService.decrypt(invalidPayload)).rejects.toThrow(
        'Decryption failed'
      );
    });

    test('should handle key derivation errors', async () => {
      const invalidKey = 'invalid-key-length';
      const salt = 'valid-salt';
      const info = 'test-info';

      await expect(
        encryptionService.deriveKey(invalidKey, salt, info)
      ).rejects.toThrow('Key derivation failed');
    });
  });

  describe('Performance', () => {
    test('should complete encryption within reasonable time', async () => {
      const largeData = 'x'.repeat(10000); // 10KB of data
      const startTime = Date.now();

      await encryptionService.encrypt(largeData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should complete decryption within reasonable time', async () => {
      const largeData = 'x'.repeat(10000); // 10KB of data
      const encrypted = await encryptionService.encrypt(largeData);
      const startTime = Date.now();

      await encryptionService.decrypt(encrypted);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

describe('Encryption Configuration', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  test('should have correct encryption constants', () => {
    expect(ENCRYPTION_ALGORITHM).toBe('aes-256-gcm');
    expect(KEY_DERIVATION_ALGORITHM).toBe('pbkdf2');
    expect(HASH_ALGORITHM).toBe('sha512');
    expect(HMAC_ALGORITHM).toBe('sha256');
    expect(KEY_DERIVATION_ITERATIONS).toBe(100000);
    expect(KEY_LENGTH).toBe(32);
    expect(IV_LENGTH).toBe(16);
    expect(SALT_LENGTH).toBe(32);
    expect(TAG_LENGTH).toBe(16);
  });

  test('should get encryption key config', () => {
    process.env.ENCRYPTION_MASTER_KEY = 'test-key';
    process.env.ENCRYPTION_SALT = 'test-salt';

    const config = getEncryptionKeyConfig();

    expect(config.baseKey).toBe('test-key');
    expect(config.salt).toBe('test-salt');
    expect(config.env).toBe('test');
  });

  test('should get key version config', () => {
    const config = getKeyVersionConfig(2);

    expect(config.version).toBe(2);
    expect(config.keyInfo).toBe('boosty-encryption-key-v2-test');
    expect(config.iterations).toBe(KEY_DERIVATION_ITERATIONS);
  });

  test('should create encryption metadata', () => {
    const metadata = createEncryptionMetadata(1, 'test-key');

    expect(metadata.version).toBe(1);
    expect(metadata.keyId).toBe('test-key');
    expect(metadata.algorithm).toBe(ENCRYPTION_ALGORITHM);
    expect(metadata.keyDerivation.algorithm).toBe(KEY_DERIVATION_ALGORITHM);
    expect(metadata.keyDerivation.iterations).toBe(KEY_DERIVATION_ITERATIONS);
    expect(metadata.keyDerivation.hash).toBe(HASH_ALGORITHM);
    expect(metadata.timestamp).toBeDefined();
  });

  test('should have field encryption settings', () => {
    expect(FIELD_ENCRYPTION_SETTINGS).toBeDefined();
    expect(FIELD_ENCRYPTION_SETTINGS.user).toBeDefined();
    expect(FIELD_ENCRYPTION_SETTINGS.user.email.encrypted).toBe(true);
    expect(FIELD_ENCRYPTION_SETTINGS.user.phone.encrypted).toBe(true);
    expect(FIELD_ENCRYPTION_SETTINGS.user.address.encrypted).toBe(true);
  });
});
