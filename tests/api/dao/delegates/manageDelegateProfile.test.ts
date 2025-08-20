import { Address } from 'viem';
import {
  checkDelegateProfileExists,
  createOrUpdateDelegateProfile,
  fetchCurrentProfileForEdit,
  DelegateProfileData,
} from '../../../../src/api/dao/delegates/manageDelegateProfile';
import { getPublicClient } from '../../../../src/api/viem';
import { pinJsonToIpfs } from '../../../../src/api/ipfs/pinToIpfs';
import { getIpfsFileSafe } from '../../../../src/api/ipfs/getIpfsFile';

// Mock dependencies
jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/ipfs/pinToIpfs');
jest.mock('../../../../src/api/ipfs/getIpfsFile');

describe('manageDelegateProfile', () => {
  const mockConfig = {
    network: 'testnet',
    contracts: {
      DelegationWall: '0x1234567890123456789012345678901234567890' as Address,
    },
  } as any;

  const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12' as Address;

  const mockWalletClient = {
    account: { address: mockAddress },
    writeContract: jest.fn(),
  } as any;

  const mockPublicClient = {
    readContract: jest.fn(),
    simulateContract: jest.fn(),
    waitForTransactionReceipt: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getPublicClient as jest.Mock).mockReturnValue(mockPublicClient);
  });

  describe('checkDelegateProfileExists', () => {
    it('should return exists: false when no profile is found', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x');

      const result = await checkDelegateProfileExists(mockAddress, mockConfig);

      expect(result.exists).toBe(false);
      expect(result.contentUrl).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should return exists: true with IPFS metadata when profile exists', async () => {
      const ipfsUrl = 'ipfs://QmTestHash123';
      const contentUrlBytes = '0x697066733a2f2f516d5465737448617368313233'; // hex of ipfs URL
      const mockMetadata = { identifier: 'testDelegate', name: 'Test Delegate' };

      mockPublicClient.readContract.mockResolvedValue(contentUrlBytes);
      (getIpfsFileSafe as jest.Mock).mockResolvedValue(mockMetadata);

      const result = await checkDelegateProfileExists(mockAddress, mockConfig);

      expect(result.exists).toBe(true);
      expect(result.contentUrl).toBe(ipfsUrl);
      expect(result.metadata).toEqual(mockMetadata);
    });

    it('should handle IPFS fetch errors gracefully', async () => {
      const ipfsUrl = 'ipfs://QmTestHash123';
      const contentUrlBytes = '0x697066733a2f2f516d5465737448617368313233';

      mockPublicClient.readContract.mockResolvedValue(contentUrlBytes);
      (getIpfsFileSafe as jest.Mock).mockRejectedValue(new Error('IPFS error'));

      const result = await checkDelegateProfileExists(mockAddress, mockConfig);

      expect(result.exists).toBe(true);
      expect(result.contentUrl).toBe(ipfsUrl);
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('createOrUpdateDelegateProfile', () => {
    const mockProfileData: DelegateProfileData = {
      identifier: 'testDelegate',
      name: 'Test Delegate',
      description: 'A test delegate profile',
    };

    it('should successfully create a delegate profile', async () => {
      const mockIpfsHash = 'QmNewTestHash456';
      const mockTxHash = '0xtransactionhash123';

      (pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);
      mockPublicClient.simulateContract.mockResolvedValue({
        request: { functionName: 'register', args: ['0x...'] },
      });
      mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'success',
      });

      const result = await createOrUpdateDelegateProfile(mockProfileData, mockConfig, mockWalletClient);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(mockTxHash);
      expect(result.ipfsHash).toBe(mockIpfsHash);
      expect(result.error).toBeUndefined();

      expect(pinJsonToIpfs).toHaveBeenCalledWith(mockProfileData);
      expect(mockWalletClient.writeContract).toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const mockIpfsHash = 'QmNewTestHash456';
      const mockTxHash = '0xtransactionhash123';

      (pinJsonToIpfs as jest.Mock).mockResolvedValue(mockIpfsHash);
      mockPublicClient.simulateContract.mockResolvedValue({
        request: { functionName: 'register', args: ['0x...'] },
      });
      mockWalletClient.writeContract.mockResolvedValue(mockTxHash);
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({
        status: 'reverted',
      });

      const result = await createOrUpdateDelegateProfile(mockProfileData, mockConfig, mockWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
      expect(result.txHash).toBe(mockTxHash);
    });

    it('should handle IPFS pinning errors', async () => {
      (pinJsonToIpfs as jest.Mock).mockRejectedValue(new Error('IPFS pinning failed'));

      const result = await createOrUpdateDelegateProfile(mockProfileData, mockConfig, mockWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toContain('IPFS pinning failed');
    });

    it('should handle missing wallet address', async () => {
      const invalidWalletClient = { account: undefined } as any;

      const result = await createOrUpdateDelegateProfile(mockProfileData, mockConfig, invalidWalletClient);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No wallet account found');
    });
  });

  describe('fetchCurrentProfileForEdit', () => {
    it('should return null when no profile exists', async () => {
      mockPublicClient.readContract.mockResolvedValue('0x');

      const result = await fetchCurrentProfileForEdit(mockAddress, mockConfig);

      expect(result).toBeNull();
    });

    it('should return profile data when profile exists', async () => {
      const contentUrlBytes = '0x697066733a2f2f516d5465737448617368313233';
      const mockMetadata: DelegateProfileData = {
        identifier: 'testDelegate',
        name: 'Test Delegate',
        description: 'Test description',
      };

      mockPublicClient.readContract.mockResolvedValue(contentUrlBytes);
      (getIpfsFileSafe as jest.Mock).mockResolvedValue(mockMetadata);

      const result = await fetchCurrentProfileForEdit(mockAddress, mockConfig);

      expect(result).toEqual(mockMetadata);
    });

    it('should handle errors gracefully', async () => {
      mockPublicClient.readContract.mockRejectedValue(new Error('Contract error'));

      const result = await fetchCurrentProfileForEdit(mockAddress, mockConfig);

      expect(result).toBeNull();
    });
  });
});

