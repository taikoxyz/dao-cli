import sodium from 'libsodium-wrappers';
import {
  encrypt,
  decryptString,
  decryptBytes,
  generateKeyPair,
  getSeededKeyPair,
  computePublicKey,
} from '../../src/api/encryption/asymmetric';

describe('Asymmetric Encryption', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('generateKeyPair', () => {
    it('should generate a valid key pair', () => {
      const keyPair = generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.keyType).toBe('x25519');
    });

    it('should generate different key pairs on each call', () => {
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();

      expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
    });

    it('should generate key pairs with correct lengths', () => {
      const keyPair = generateKeyPair();

      expect(keyPair.publicKey.length).toBe(sodium.crypto_box_PUBLICKEYBYTES);
      expect(keyPair.privateKey.length).toBe(sodium.crypto_box_SECRETKEYBYTES);
    });
  });

  describe('getSeededKeyPair', () => {
    it('should generate a deterministic key pair from a valid seed', () => {
      const seed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const keyPair1 = getSeededKeyPair(seed);
      const keyPair2 = getSeededKeyPair(seed);

      expect(keyPair1.publicKey).toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).toEqual(keyPair2.privateKey);
    });

    it('should throw error for invalid hexadecimal seed', () => {
      const invalidSeed = 'xyz123'; // Contains non-hex characters

      expect(() => {
        getSeededKeyPair(invalidSeed);
      }).toThrow('Invalid hexadecimal seed');
    });

    it('should throw error for seed with wrong length', () => {
      const shortSeed = '0123456789abcdef'; // Too short
      const longSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00'; // Too long

      expect(() => {
        getSeededKeyPair(shortSeed);
      }).toThrow('The hexadecimal seed should be 32 bytes long');

      expect(() => {
        getSeededKeyPair(longSeed);
      }).toThrow('The hexadecimal seed should be 32 bytes long');
    });

    it('should accept uppercase and lowercase hex characters', () => {
      const lowerSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const upperSeed = '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';

      expect(() => {
        getSeededKeyPair(lowerSeed);
        getSeededKeyPair(upperSeed);
      }).not.toThrow();
    });
  });

  describe('computePublicKey', () => {
    it('should compute the correct public key from a private key', () => {
      const keyPair = generateKeyPair();
      const computedPublicKey = computePublicKey(keyPair.privateKey);

      expect(computedPublicKey).toEqual(keyPair.publicKey);
    });

    it('should produce consistent results', () => {
      const keyPair = generateKeyPair();
      const computedPublicKey1 = computePublicKey(keyPair.privateKey);
      const computedPublicKey2 = computePublicKey(keyPair.privateKey);

      expect(computedPublicKey1).toEqual(computedPublicKey2);
    });
  });

  describe('encrypt', () => {
    it('should encrypt a string message', () => {
      const message = 'Hello, asymmetric encryption!';
      const keyPair = generateKeyPair();

      const encrypted = encrypt(message, keyPair.publicKey);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(message.length);
    });

    it('should encrypt a Uint8Array message', () => {
      const message = new Uint8Array([1, 2, 3, 4, 5]);
      const keyPair = generateKeyPair();

      const encrypted = encrypt(message, keyPair.publicKey);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(message.length);
    });

    it('should produce different ciphertext for the same message', () => {
      const message = 'Same message';
      const keyPair = generateKeyPair();

      const encrypted1 = encrypt(message, keyPair.publicKey);
      const encrypted2 = encrypt(message, keyPair.publicKey);

      expect(encrypted1).not.toEqual(encrypted2);
    });
  });

  describe('decryptString', () => {
    it('should decrypt an encrypted string message', () => {
      const originalMessage = 'Hello, asymmetric encryption!';
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      const decrypted = decryptString(encrypted, keyPair);

      expect(decrypted).toBe(originalMessage);
    });

    it('should handle empty string', () => {
      const originalMessage = '';
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      const decrypted = decryptString(encrypted, keyPair);

      expect(decrypted).toBe(originalMessage);
    });

    it('should handle unicode characters', () => {
      const originalMessage = '🔐 Asymmetric encryption! 中文 العربية ñ';
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      const decrypted = decryptString(encrypted, keyPair);

      expect(decrypted).toBe(originalMessage);
    });

    it('should throw error with wrong key pair', () => {
      const originalMessage = 'Secret message';
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair1.publicKey);

      expect(() => {
        decryptString(encrypted, keyPair2);
      }).toThrow();
    });
  });

  describe('decryptBytes', () => {
    it('should decrypt an encrypted Uint8Array message', () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5, 255]);
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      const decrypted = decryptBytes(encrypted, keyPair);

      expect(decrypted).toEqual(originalMessage);
    });

    it('should work with KeyPair without keyType', () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5]);
      const fullKeyPair = generateKeyPair();
      const partialKeyPair = {
        publicKey: fullKeyPair.publicKey,
        privateKey: fullKeyPair.privateKey,
      };

      const encrypted = encrypt(originalMessage, fullKeyPair.publicKey);
      const decrypted = decryptBytes(encrypted, partialKeyPair);

      expect(decrypted).toEqual(originalMessage);
    });

    it('should handle empty Uint8Array', () => {
      const originalMessage = new Uint8Array([]);
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      const decrypted = decryptBytes(encrypted, keyPair);

      expect(decrypted).toEqual(originalMessage);
    });

    it('should throw error with corrupted data', () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5]);
      const keyPair = generateKeyPair();

      const encrypted = encrypt(originalMessage, keyPair.publicKey);
      // Corrupt the data
      encrypted[0] = encrypted[0] ^ 0xff;

      expect(() => {
        decryptBytes(encrypted, keyPair);
      }).toThrow();
    });
  });

  describe('cross-key compatibility', () => {
    it('should allow different recipients to decrypt with their own keys', () => {
      const message = 'Multi-recipient message';
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();

      const encrypted1 = encrypt(message, keyPair1.publicKey);
      const encrypted2 = encrypt(message, keyPair2.publicKey);

      const decrypted1 = decryptString(encrypted1, keyPair1);
      const decrypted2 = decryptString(encrypted2, keyPair2);

      expect(decrypted1).toBe(message);
      expect(decrypted2).toBe(message);
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should maintain data integrity for large messages', () => {
      const largeMessage = 'A'.repeat(10000);
      const keyPair = generateKeyPair();

      const encrypted = encrypt(largeMessage, keyPair.publicKey);
      const decrypted = decryptString(encrypted, keyPair);

      expect(decrypted).toBe(largeMessage);
    });

    it('should work with binary data', () => {
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }
      const keyPair = generateKeyPair();

      const encrypted = encrypt(binaryData, keyPair.publicKey);
      const decrypted = decryptBytes(encrypted, keyPair);

      expect(decrypted).toEqual(binaryData);
    });
  });
});
