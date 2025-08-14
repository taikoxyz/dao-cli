import sodium from 'libsodium-wrappers';
import {
  encrypt,
  decryptString,
  decryptBytes,
  generateSymmetricKey,
} from '../../src/api/encryption/symmetric';

describe('Symmetric Encryption', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('generateSymmetricKey', () => {
    it('should generate a key with default length of 32 bytes', () => {
      const key = generateSymmetricKey();
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should generate a key with custom length', () => {
      const customLength = 16;
      const key = generateSymmetricKey(customLength);
      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(customLength);
    });

    it('should generate different keys on each call', () => {
      const key1 = generateSymmetricKey();
      const key2 = generateSymmetricKey();
      expect(key1).not.toEqual(key2);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a string message', () => {
      const message = 'Hello, World!';
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(message, key);
      
      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(message.length);
    });

    it('should encrypt a Uint8Array message', () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(message, key);
      
      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(message.length);
    });

    it('should produce different ciphertext for the same message (due to random nonce)', () => {
      const message = 'Same message';
      const key = generateSymmetricKey();
      
      const encrypted1 = encrypt(message, key);
      const encrypted2 = encrypt(message, key);
      
      expect(encrypted1).not.toEqual(encrypted2);
    });
  });

  describe('decryptString', () => {
    it('should decrypt an encrypted string message', () => {
      const originalMessage = 'Hello, World!';
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      const decrypted = decryptString(encrypted, key);
      
      expect(decrypted).toBe(originalMessage);
    });

    it('should handle empty string', () => {
      const originalMessage = '';
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      const decrypted = decryptString(encrypted, key);
      
      expect(decrypted).toBe(originalMessage);
    });

    it('should handle unicode characters', () => {
      const originalMessage = '🔒 Encrypted message with emojis! 中文 العربية';
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      const decrypted = decryptString(encrypted, key);
      
      expect(decrypted).toBe(originalMessage);
    });

    it('should throw error with wrong key', () => {
      const originalMessage = 'Secret message';
      const key1 = generateSymmetricKey();
      const key2 = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key1);
      
      expect(() => {
        decryptString(encrypted, key2);
      }).toThrow();
    });
  });

  describe('decryptBytes', () => {
    it('should decrypt an encrypted Uint8Array message', () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5, 255]);
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      const decrypted = decryptBytes(encrypted, key);
      
      expect(decrypted).toEqual(originalMessage);
    });

    it('should handle empty Uint8Array', () => {
      const originalMessage = new Uint8Array([]);
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      const decrypted = decryptBytes(encrypted, key);
      
      expect(decrypted).toEqual(originalMessage);
    });

    it('should throw error for invalid payload length', () => {
      const key = generateSymmetricKey();
      const invalidPayload = new Uint8Array([1, 2, 3]); // Too short
      
      expect(() => {
        decryptBytes(invalidPayload, key);
      }).toThrow('Invalid encrypted payload');
    });

    it('should throw error with corrupted data', () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5]);
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(originalMessage, key);
      // Corrupt the data
      encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1] ^ 0xFF;
      
      expect(() => {
        decryptBytes(encrypted, key);
      }).toThrow();
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should maintain data integrity for large messages', () => {
      const largeMessage = 'A'.repeat(10000);
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(largeMessage, key);
      const decrypted = decryptString(encrypted, key);
      
      expect(decrypted).toBe(largeMessage);
    });

    it('should work with binary data', () => {
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }
      const key = generateSymmetricKey();
      
      const encrypted = encrypt(binaryData, key);
      const decrypted = decryptBytes(encrypted, key);
      
      expect(decrypted).toEqual(binaryData);
    });
  });
});