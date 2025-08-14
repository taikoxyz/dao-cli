import sodium from 'libsodium-wrappers';
import {
  encryptProposal,
  encryptSymmetricKey,
  decryptSymmetricKey,
  decryptProposal,
  JsonValue,
} from '../../src/api/encryption/index';
import { generateKeyPair } from '../../src/api/encryption/asymmetric';

describe('Encryption Integration', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('encryptProposal', () => {
    it('should encrypt proposal metadata and actions', () => {
      const metadata = JSON.stringify({ title: 'Test Proposal', description: 'A test proposal' });
      const actions = new Uint8Array([1, 2, 3, 4, 5]);
      
      const result = encryptProposal(metadata, actions);
      
      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('symmetricKey');
      expect(result.encrypted).toHaveProperty('metadata');
      expect(result.encrypted).toHaveProperty('actions');
      expect(typeof result.encrypted.metadata).toBe('string');
      expect(typeof result.encrypted.actions).toBe('string');
      expect(result.symmetricKey).toBeInstanceOf(Uint8Array);
    });

    it('should produce different encrypted data for same input', () => {
      const metadata = JSON.stringify({ title: 'Test Proposal' });
      const actions = new Uint8Array([1, 2, 3]);
      
      const result1 = encryptProposal(metadata, actions);
      const result2 = encryptProposal(metadata, actions);
      
      expect(result1.encrypted.metadata).not.toBe(result2.encrypted.metadata);
      expect(result1.encrypted.actions).not.toBe(result2.encrypted.actions);
      expect(result1.symmetricKey).not.toEqual(result2.symmetricKey);
    });

    it('should handle empty metadata and actions', () => {
      const metadata = '';
      const actions = new Uint8Array([]);
      
      const result = encryptProposal(metadata, actions);
      
      expect(result.encrypted.metadata).toBeDefined();
      expect(result.encrypted.actions).toBeDefined();
      expect(result.symmetricKey).toBeInstanceOf(Uint8Array);
    });

    it('should handle large proposal data', () => {
      const largeMetadata = JSON.stringify({ 
        title: 'Large Proposal',
        description: 'A'.repeat(10000)
      });
      const largeActions = new Uint8Array(5000).fill(255);
      
      const result = encryptProposal(largeMetadata, largeActions);
      
      expect(result.encrypted.metadata).toBeDefined();
      expect(result.encrypted.actions).toBeDefined();
      expect(result.symmetricKey).toBeInstanceOf(Uint8Array);
    });
  });

  describe('encryptSymmetricKey', () => {
    it('should encrypt symmetric key for multiple recipients', () => {
      const symmetricKey = new Uint8Array(32).fill(1);
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const keyPair3 = generateKeyPair();
      const recipientPubKeys = [keyPair1.publicKey, keyPair2.publicKey, keyPair3.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(symmetricKey, recipientPubKeys);
      
      expect(encryptedKeys).toHaveLength(3);
      expect(encryptedKeys[0]).toBeInstanceOf(Uint8Array);
      expect(encryptedKeys[1]).toBeInstanceOf(Uint8Array);
      expect(encryptedKeys[2]).toBeInstanceOf(Uint8Array);
      expect(encryptedKeys[0]).not.toEqual(encryptedKeys[1]);
      expect(encryptedKeys[1]).not.toEqual(encryptedKeys[2]);
    });

    it('should handle single recipient', () => {
      const symmetricKey = new Uint8Array(32).fill(42);
      const keyPair = generateKeyPair();
      const recipientPubKeys = [keyPair.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(symmetricKey, recipientPubKeys);
      
      expect(encryptedKeys).toHaveLength(1);
      expect(encryptedKeys[0]).toBeInstanceOf(Uint8Array);
    });

    it('should handle empty recipient list', () => {
      const symmetricKey = new Uint8Array(32).fill(1);
      const recipientPubKeys: Uint8Array[] = [];
      
      const encryptedKeys = encryptSymmetricKey(symmetricKey, recipientPubKeys);
      
      expect(encryptedKeys).toHaveLength(0);
    });
  });

  describe('decryptSymmetricKey', () => {
    it('should decrypt symmetric key for authorized recipient', () => {
      const originalSymmetricKey = new Uint8Array(32).fill(123);
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const recipientPubKeys = [keyPair1.publicKey, keyPair2.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(originalSymmetricKey, recipientPubKeys);
      const decryptedKey = decryptSymmetricKey(encryptedKeys, keyPair1);
      
      expect(decryptedKey).toEqual(originalSymmetricKey);
    });

    it('should work with second authorized recipient', () => {
      const originalSymmetricKey = new Uint8Array(32).fill(200);
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const recipientPubKeys = [keyPair1.publicKey, keyPair2.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(originalSymmetricKey, recipientPubKeys);
      const decryptedKey = decryptSymmetricKey(encryptedKeys, keyPair2);
      
      expect(decryptedKey).toEqual(originalSymmetricKey);
    });

    it('should work with keypair without keyType', () => {
      const originalSymmetricKey = new Uint8Array(32).fill(50);
      const fullKeyPair = generateKeyPair();
      const partialKeyPair = {
        publicKey: fullKeyPair.publicKey,
        privateKey: fullKeyPair.privateKey,
      };
      const recipientPubKeys = [fullKeyPair.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(originalSymmetricKey, recipientPubKeys);
      const decryptedKey = decryptSymmetricKey(encryptedKeys, partialKeyPair);
      
      expect(decryptedKey).toEqual(originalSymmetricKey);
    });

    it('should throw error for unauthorized recipient', () => {
      const originalSymmetricKey = new Uint8Array(32).fill(100);
      const keyPair1 = generateKeyPair();
      const keyPair2 = generateKeyPair();
      const unauthorizedKeyPair = generateKeyPair();
      const recipientPubKeys = [keyPair1.publicKey, keyPair2.publicKey];
      
      const encryptedKeys = encryptSymmetricKey(originalSymmetricKey, recipientPubKeys);
      
      expect(() => {
        decryptSymmetricKey(encryptedKeys, unauthorizedKeyPair);
      }).toThrow('The given keypair cannot decrypt any of the ciphertext\'s');
    });

    it('should handle empty encrypted keys list', () => {
      const keyPair = generateKeyPair();
      const encryptedKeys: Uint8Array[] = [];
      
      expect(() => {
        decryptSymmetricKey(encryptedKeys, keyPair);
      }).toThrow('The given keypair cannot decrypt any of the ciphertext\'s');
    });
  });

  describe('decryptProposal', () => {
    it('should decrypt proposal data correctly', () => {
      const originalMetadata = { title: 'Test Proposal', description: 'A test proposal', votes: 42 };
      const originalActions = new Uint8Array([10, 20, 30, 40, 50]);
      const metadataString = JSON.stringify(originalMetadata);
      
      const { encrypted, symmetricKey } = encryptProposal(metadataString, originalActions);
      const decrypted = decryptProposal(encrypted, symmetricKey);
      
      expect(decrypted.metadata).toEqual(originalMetadata);
      expect(decrypted.rawMetadata).toBe(metadataString);
      expect(decrypted.rawActions).toEqual(originalActions);
    });

    it('should handle complex metadata types', () => {
      const originalMetadata: JsonValue = {
        title: 'Complex Proposal',
        description: 'A complex proposal',
        options: ['option1', 'option2', 'option3'],
        settings: {
          voting_period: 7,
          quorum: 0.5,
          enabled: true,
        },
        tags: ['governance', 'important'],
        count: 123,
      };
      const originalActions = new Uint8Array([1, 2, 3]);
      const metadataString = JSON.stringify(originalMetadata);
      
      const { encrypted, symmetricKey } = encryptProposal(metadataString, originalActions);
      const decrypted = decryptProposal(encrypted, symmetricKey);
      
      expect(decrypted.metadata).toEqual(originalMetadata);
    });

    it('should throw error for empty data', () => {
      const symmetricKey = new Uint8Array(32).fill(1);
      const emptyData = { metadata: '', actions: '' };
      
      expect(() => {
        decryptProposal(emptyData, symmetricKey);
      }).toThrow('Empty data');
    });

    it('should throw error for missing metadata', () => {
      const symmetricKey = new Uint8Array(32).fill(1);
      const incompleteData = { metadata: '', actions: 'some_data' };
      
      expect(() => {
        decryptProposal(incompleteData, symmetricKey);
      }).toThrow('Empty data');
    });

    it('should throw error for missing actions', () => {
      const symmetricKey = new Uint8Array(32).fill(1);
      const incompleteData = { metadata: 'some_data', actions: '' };
      
      expect(() => {
        decryptProposal(incompleteData, symmetricKey);
      }).toThrow('Empty data');
    });

    it('should throw error with wrong symmetric key', () => {
      const originalMetadata = { title: 'Test Proposal' };
      const originalActions = new Uint8Array([1, 2, 3]);
      const metadataString = JSON.stringify(originalMetadata);
      
      const { encrypted } = encryptProposal(metadataString, originalActions);
      const wrongKey = new Uint8Array(32).fill(255);
      
      expect(() => {
        decryptProposal(encrypted, wrongKey);
      }).toThrow();
    });
  });

  describe('end-to-end encryption workflow', () => {
    it('should handle complete proposal encryption/decryption workflow', () => {
      // Original proposal data
      const proposalMetadata = {
        title: 'Funding Proposal',
        description: 'Request for development funding',
        amount: '1000000',
        recipient: '0x1234567890abcdef',
      };
      const proposalActions = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      
      // Security council members
      const councilMember1 = generateKeyPair();
      const councilMember2 = generateKeyPair();
      const councilMember3 = generateKeyPair();
      const councilPubKeys = [
        councilMember1.publicKey,
        councilMember2.publicKey,
        councilMember3.publicKey,
      ];
      
      // Encrypt proposal
      const { encrypted, symmetricKey } = encryptProposal(
        JSON.stringify(proposalMetadata),
        proposalActions
      );
      
      // Encrypt symmetric key for security council
      const encryptedSymKeys = encryptSymmetricKey(symmetricKey, councilPubKeys);
      
      // Simulate council member 2 decrypting the proposal
      const decryptedSymKey = decryptSymmetricKey(encryptedSymKeys, councilMember2);
      const decryptedProposal = decryptProposal(encrypted, decryptedSymKey);
      
      expect(decryptedProposal.metadata).toEqual(proposalMetadata);
      expect(decryptedProposal.rawActions).toEqual(proposalActions);
    });

    it('should prevent unauthorized access', () => {
      const proposalMetadata = { title: 'Secret Proposal' };
      const proposalActions = new Uint8Array([1, 2, 3]);
      
      // Authorized members
      const authorizedMember = generateKeyPair();
      const councilPubKeys = [authorizedMember.publicKey];
      
      // Unauthorized member
      const unauthorizedMember = generateKeyPair();
      
      // Encrypt proposal
      const { encrypted, symmetricKey } = encryptProposal(
        JSON.stringify(proposalMetadata),
        proposalActions
      );
      const encryptedSymKeys = encryptSymmetricKey(symmetricKey, councilPubKeys);
      
      // Unauthorized member cannot decrypt
      expect(() => {
        decryptSymmetricKey(encryptedSymKeys, unauthorizedMember);
      }).toThrow('The given keypair cannot decrypt any of the ciphertext\'s');
    });
  });
});