import getDecryptionKey, { 
  hexToUint8Array, 
  computePublicKey, 
  DETERMINISTIC_EMERGENCY_PAYLOAD,
  decrypt 
} from '../../../../src/api/dao/security-council/getDecryptionKey';
import getEnvPrivateKey from '../../../../src/api/web3/getEnvPrivateKey';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex } from 'viem';
import sodium from 'libsodium-wrappers';
import { decryptSymmetricKey, decryptProposal } from '../../../../src/api/encryption';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock dependencies
jest.mock('../../../../src/api/web3/getEnvPrivateKey');
jest.mock('viem/accounts');
jest.mock('viem');
jest.mock('libsodium-wrappers');
jest.mock('../../../../src/api/encryption');

const mockGetEnvPrivateKey = getEnvPrivateKey as jest.MockedFunction<typeof getEnvPrivateKey>;
const mockPrivateKeyToAccount = privateKeyToAccount as jest.MockedFunction<typeof privateKeyToAccount>;
const mockKeccak256 = keccak256 as jest.MockedFunction<typeof keccak256>;
const mockToHex = toHex as jest.MockedFunction<typeof toHex>;
const mockSodium = sodium as jest.Mocked<typeof sodium>;

// Mock sodium.crypto_scalarmult_base specifically
(sodium as any).crypto_scalarmult_base = jest.fn();
const mockDecryptSymmetricKey = decryptSymmetricKey as jest.MockedFunction<typeof decryptSymmetricKey>;
const mockDecryptProposal = decryptProposal as jest.MockedFunction<typeof decryptProposal>;

describe('getDecryptionKey module', () => {
  let mockConfig: INetworkConfig;
  let mockAccount: any;

  beforeEach(() => {
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation();
    
    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as any,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as any,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as any,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as any,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as any,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as any,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as any,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as any,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as any,
      },
    };

    mockAccount = {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      signMessage: jest.fn(),
    };

    // Set up the function mocks that don't change between tests
    mockGetEnvPrivateKey.mockImplementation(() => '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12');
    mockPrivateKeyToAccount.mockImplementation(() => mockAccount);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hexToUint8Array', () => {
    it('should convert hex string to Uint8Array', () => {
      const hex = '0x48656c6c6f';
      const result = hexToUint8Array(hex);
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]); // "Hello" in bytes
    });

    it('should handle hex without 0x prefix', () => {
      const hex = '48656c6c6f' as any;
      const result = hexToUint8Array(hex);
      
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should throw error for odd length hex', () => {
      const oddHex = '0x123';
      
      expect(() => hexToUint8Array(oddHex)).toThrow('Received an hex value with odd length');
    });

    it('should handle empty hex string', () => {
      const emptyHex = '0x';
      const result = hexToUint8Array(emptyHex);
      
      expect(result).toEqual(new Uint8Array(0));
    });

    it('should handle valid hex values', () => {
      const testCases = [
        { hex: '0x00', expected: [0] },
        { hex: '0xff', expected: [255] },
        { hex: '0x1234', expected: [18, 52] },
        { hex: '0xabcdef', expected: [171, 205, 239] },
      ];

      testCases.forEach(({ hex, expected }) => {
        const result = hexToUint8Array(hex as any);
        expect(Array.from(result)).toEqual(expected);
      });
    });
  });

  describe('computePublicKey', () => {
    it('should compute public key from secret key', () => {
      const secretKey = new Uint8Array([1, 2, 3, 4, 5]);
      const expectedPublicKey = new Uint8Array([6, 7, 8, 9, 10]);
      
      (sodium.crypto_scalarmult_base as jest.Mock).mockReturnValue(expectedPublicKey);

      const result = computePublicKey(secretKey);

      expect(sodium.crypto_scalarmult_base).toHaveBeenCalledWith(secretKey);
      expect(result).toEqual(expectedPublicKey);
    });
  });

  describe('DETERMINISTIC_EMERGENCY_PAYLOAD', () => {
    it('should have correct deterministic message', () => {
      expect(DETERMINISTIC_EMERGENCY_PAYLOAD).toBe(
        'This text is used to generate an encryption key to be used on private proposals targetting the Taiko DAO.\n\nSign this message ONLY if you are about to create, approve or execute a emergency proposal using the official Taiko app.'
      );
    });
  });

  describe.skip('getDecryptionKey', () => {
    beforeEach(() => {
      mockToHex.mockReturnValue('0xabcdef1234567890');
      mockKeccak256
        .mockReturnValueOnce('0xhashedmessage1234567890')
        .mockReturnValueOnce('0xhashedsignature1234567890');
      mockAccount.signMessage.mockResolvedValue('0xsignature1234567890');
      (sodium.crypto_scalarmult_base as jest.Mock).mockReturnValue(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should successfully generate decryption key pair', async () => {
      const result = await getDecryptionKey(mockConfig);

      expect(mockGetEnvPrivateKey).toHaveBeenCalledWith(mockConfig);
      expect(mockPrivateKeyToAccount).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12');
      expect(mockAccount.signMessage).toHaveBeenCalledWith({
        message: DETERMINISTIC_EMERGENCY_PAYLOAD,
      });
      expect(result).toHaveProperty('privateKey');
      expect(result).toHaveProperty('publicKey');
      expect(result.privateKey).toBeInstanceOf(Uint8Array);
      expect(result.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('should handle user rejection of signature', async () => {
      mockAccount.signMessage.mockRejectedValue(new Error('User rejected request'));

      await expect(getDecryptionKey(mockConfig)).rejects.toThrow('Signature canceled by user');
      expect(console.error).toHaveBeenCalledWith('User canceled the signature');
    });

    it('should handle user denied signature', async () => {
      mockAccount.signMessage.mockRejectedValue(new Error('Transaction denied by user'));

      await expect(getDecryptionKey(mockConfig)).rejects.toThrow('Signature canceled by user');
      expect(console.error).toHaveBeenCalledWith('User canceled the signature');
    });

    it('should handle general signature errors', async () => {
      mockAccount.signMessage.mockRejectedValue(new Error('Network error'));

      await expect(getDecryptionKey(mockConfig)).rejects.toThrow('Could not retrieve signature');
      expect(console.error).toHaveBeenCalledWith('Failed to retrieve signature:', 'Network error');
    });

    it('should handle missing wallet address', async () => {
      mockAccount.address = undefined;

      await expect(getDecryptionKey(mockConfig)).rejects.toThrow('No wallet address available');
    });

    it('should process deterministic message hashing correctly', async () => {
      await getDecryptionKey(mockConfig);

      expect(mockToHex).toHaveBeenCalledWith(DETERMINISTIC_EMERGENCY_PAYLOAD);
      expect(mockKeccak256).toHaveBeenCalledWith('0xabcdef1234567890');
    });

    it('should derive keys from signature correctly', async () => {
      await getDecryptionKey(mockConfig);

      expect(mockKeccak256).toHaveBeenCalledWith('0xsignature1234567890');
      expect(sodium.crypto_scalarmult_base).toHaveBeenCalled();
    });
  });

  describe.skip('decrypt function', () => {
    const mockEncryptedMetadata: any = {
      encrypted: {
        metadata: 'encryptedMetadataHex',
        actions: 'encryptedActionsHex',
        symmetricKeys: ['0xkey1', '0xkey2', '0xkey3'],
      },
    };

    beforeEach(() => {
      // Mock getDecryptionKey return value
      mockToHex.mockReturnValue('0xabcdef1234567890');
      mockKeccak256.mockReturnValueOnce('0xhashedmessage').mockReturnValueOnce('0xhashedsignature');
      mockAccount.signMessage.mockResolvedValue('0xsignature1234567890');
      (sodium.crypto_scalarmult_base as jest.Mock).mockReturnValue(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should successfully decrypt proposal metadata', async () => {
      const mockSymmetricKey = new Uint8Array([1, 2, 3, 4]);
      const mockDecryptedResult: any = {
        metadata: { title: 'Decrypted Proposal', description: 'Decrypted description' },
        rawMetadata: 'rawMetadataHex',
        rawActions: new Uint8Array([0x12, 0x34]),
      };

      mockDecryptSymmetricKey.mockReturnValue(mockSymmetricKey);
      mockDecryptProposal.mockReturnValue(mockDecryptedResult);

      // Mock decodeAbiParameters
      const mockDecodeAbiParameters = jest.fn().mockReturnValue([
        [{ to: '0x123', value: '1000', data: '0xabc' }]
      ]);
      jest.doMock('viem', () => ({
        ...jest.requireActual('viem'),
        decodeAbiParameters: mockDecodeAbiParameters,
      }));

      const result = await decrypt(mockConfig, mockEncryptedMetadata);

      expect(mockDecryptSymmetricKey).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          privateKey: expect.any(Uint8Array),
          publicKey: expect.any(Uint8Array),
        })
      );
      expect(mockDecryptProposal).toHaveBeenCalledWith(
        {
          metadata: 'encryptedMetadataHex',
          actions: 'encryptedActionsHex',
        },
        mockSymmetricKey
      );
      expect(result).toEqual(mockDecryptedResult.metadata);
    });

    it('should handle decryption errors', async () => {
      const decryptionError = new Error('Decryption failed');
      mockDecryptSymmetricKey.mockImplementation(() => {
        throw decryptionError;
      });

      const result = await decrypt(mockConfig, mockEncryptedMetadata);

      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Decryption failed:', decryptionError);
    });

    it('should handle invalid actions parameter', async () => {
      const mockSymmetricKey = new Uint8Array([1, 2, 3, 4]);
      const mockDecryptedResult: any = {
        metadata: { title: 'Test' },
        rawMetadata: 'rawMetadata',
        rawActions: new Uint8Array([0x12, 0x34]),
      };

      mockDecryptSymmetricKey.mockReturnValue(mockSymmetricKey);
      mockDecryptProposal.mockReturnValue(mockDecryptedResult);

      // Mock decodeAbiParameters to return empty/invalid result
      const mockDecodeAbiParameters = jest.fn().mockReturnValue([undefined]);
      jest.doMock('viem', () => ({
        ...jest.requireActual('viem'),
        decodeAbiParameters: mockDecodeAbiParameters,
      }));

      const result = await decrypt(mockConfig, mockEncryptedMetadata);

      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Decryption failed:', expect.any(Error));
    });

    it('should convert symmetric keys from hex correctly', async () => {
      const mockSymmetricKey = new Uint8Array([1, 2, 3, 4]);
      mockDecryptSymmetricKey.mockReturnValue(mockSymmetricKey);
      mockDecryptProposal.mockReturnValue({
        metadata: { title: 'Test' },
        rawMetadata: 'raw',
        rawActions: new Uint8Array([0x12, 0x34]),
      } as any);

      await decrypt(mockConfig, mockEncryptedMetadata);

      // Verify that symmetric keys were converted from hex
      expect(mockDecryptSymmetricKey).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Uint8Array),
          expect.any(Uint8Array), 
          expect.any(Uint8Array),
        ]),
        expect.any(Object)
      );
    });

    it('should handle symmetric key decryption errors', async () => {
      const symmetricKeyError = new Error('Symmetric key decryption failed');
      mockDecryptSymmetricKey.mockImplementation(() => {
        throw symmetricKeyError;
      });

      const result = await decrypt(mockConfig, mockEncryptedMetadata);

      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Decryption failed:', symmetricKeyError);
    });

    it('should handle proposal decryption errors', async () => {
      const mockSymmetricKey = new Uint8Array([1, 2, 3, 4]);
      const proposalDecryptionError = new Error('Proposal decryption failed');
      
      mockDecryptSymmetricKey.mockReturnValue(mockSymmetricKey);
      mockDecryptProposal.mockImplementation(() => {
        throw proposalDecryptionError;
      });

      const result = await decrypt(mockConfig, mockEncryptedMetadata);

      expect(result).toBeUndefined();
      expect(console.error).toHaveBeenCalledWith('Decryption failed:', proposalDecryptionError);
    });
  });

  describe.skip('integration scenarios', () => {
    it('should work with real-like encrypted metadata', async () => {
      const realishMetadata: any = {
        encrypted: {
          metadata: '0xencryptedmetadata1234567890abcdef',
          actions: '0xencryptedactions1234567890abcdef',
          symmetricKeys: [
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
            '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef23',
          ],
        },
      };

      // Setup successful mocks
      mockToHex.mockReturnValue('0xhashedpayload');
      mockKeccak256.mockReturnValueOnce('0xhashedpayload').mockReturnValueOnce('0xhashedsignature');
      mockAccount.signMessage.mockResolvedValue('0xsignature');
      (sodium.crypto_scalarmult_base as jest.Mock).mockReturnValue(new Uint8Array([1, 2, 3]));

      const mockSymmetricKey = new Uint8Array([4, 5, 6]);
      mockDecryptSymmetricKey.mockReturnValue(mockSymmetricKey);
      mockDecryptProposal.mockReturnValue({
        metadata: { title: 'Real Proposal', description: 'Real description' },
        rawMetadata: 'realRawMetadata',
        rawActions: new Uint8Array([0xaa, 0xbb, 0xcc]),
      } as any);

      const result = await decrypt(mockConfig, realishMetadata);

      expect(result).toEqual({
        title: 'Real Proposal',
        description: 'Real description',
      });
    });

    it('should handle end-to-end key derivation workflow', async () => {
      // Test the complete workflow from config to derived keys
      mockToHex.mockReturnValue('0xpayloadhex');
      mockKeccak256
        .mockReturnValueOnce('0xhashedpayload')
        .mockReturnValueOnce('0xhashedsignature');
      mockAccount.signMessage.mockResolvedValue('0xvalidsignature');
      
      const expectedPublicKey = new Uint8Array([10, 20, 30]);
      (sodium.crypto_scalarmult_base as jest.Mock).mockReturnValue(expectedPublicKey);

      const result = await getDecryptionKey(mockConfig);

      // Verify the complete chain of operations
      expect(mockGetEnvPrivateKey).toHaveBeenCalledWith(mockConfig);
      expect(mockPrivateKeyToAccount).toHaveBeenCalled();
      expect(mockToHex).toHaveBeenCalledWith(DETERMINISTIC_EMERGENCY_PAYLOAD);
      expect(mockAccount.signMessage).toHaveBeenCalledWith({
        message: DETERMINISTIC_EMERGENCY_PAYLOAD,
      });
      expect(mockKeccak256).toHaveBeenCalledWith('0xvalidsignature');
      expect(result.publicKey).toEqual(expectedPublicKey);
    });
  });
});