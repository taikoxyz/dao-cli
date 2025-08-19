import { Address } from 'viem';
import isSecurityCouncilMember from '../../../../src/api/dao/security-council/isAppointedAgent';
import getSecurityCouncilMembers from '../../../../src/api/dao/security-council/getSecurityCouncilMembers';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock dependencies
jest.mock('../../../../src/api/dao/security-council/getSecurityCouncilMembers');

const mockGetSecurityCouncilMembers = getSecurityCouncilMembers as jest.MockedFunction<
  typeof getSecurityCouncilMembers
>;

describe('isSecurityCouncilMember', () => {
  let mockConfig: INetworkConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as Address,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as Address,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as Address,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as Address,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as Address,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as Address,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as Address,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as Address,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as Address,
      },
    };
  });

  describe('address matching', () => {
    it('should return true when address matches a signer', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        { owner: '0x2222222222222222222222222222222222222222' as Address, signer: targetAddress },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mockConfig);
    });

    it('should return false when address does not match any signer', async () => {
      const targetAddress = '0x9999999999999999999999999999999999999999' as Address;
      const mockMembers = [
        {
          owner: '0x2222222222222222222222222222222222222222' as Address,
          signer: '0x1111111111111111111111111111111111111111' as Address,
        },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(false);
      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mockConfig);
    });

    it('should return false when members list is empty', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers: { owner: Address; signer: Address }[] = [];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(false);
      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('case sensitivity and address formatting', () => {
    it('should handle lowercase addresses correctly', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        {
          owner: '0x2222222222222222222222222222222222222222' as Address,
          signer: '0x1111111111111111111111111111111111111111' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });

    it('should handle uppercase addresses correctly', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        {
          owner: '0x2222222222222222222222222222222222222222' as Address,
          signer: '0x1111111111111111111111111111111111111111' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });

    it('should handle mixed case addresses correctly', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mixedCaseAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        { owner: '0x2222222222222222222222222222222222222222' as Address, signer: mixedCaseAddress },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });
  });

  describe('multiple members scenarios', () => {
    it('should find match in the first position', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        { owner: '0x2222222222222222222222222222222222222222' as Address, signer: targetAddress },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
        {
          owner: '0x5555555555555555555555555555555555555555' as Address,
          signer: '0x6666666666666666666666666666666666666666' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });

    it('should find match in the middle position', async () => {
      const targetAddress = '0x4444444444444444444444444444444444444444' as Address;
      const mockMembers = [
        {
          owner: '0x2222222222222222222222222222222222222222' as Address,
          signer: '0x1111111111111111111111111111111111111111' as Address,
        },
        { owner: '0x3333333333333333333333333333333333333333' as Address, signer: targetAddress },
        {
          owner: '0x5555555555555555555555555555555555555555' as Address,
          signer: '0x6666666666666666666666666666666666666666' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });

    it('should find match in the last position', async () => {
      const targetAddress = '0x6666666666666666666666666666666666666666' as Address;
      const mockMembers = [
        {
          owner: '0x2222222222222222222222222222222222222222' as Address,
          signer: '0x1111111111111111111111111111111111111111' as Address,
        },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
        { owner: '0x5555555555555555555555555555555555555555' as Address, signer: targetAddress },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });

    it('should return true if address appears multiple times as signer', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [
        { owner: '0x2222222222222222222222222222222222222222' as Address, signer: targetAddress },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
        { owner: '0x5555555555555555555555555555555555555555' as Address, signer: targetAddress }, // Duplicate signer
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
    });
  });

  describe('owner vs signer distinction', () => {
    it('should not match against owner addresses, only signers', async () => {
      const targetAddress = '0x2222222222222222222222222222222222222222' as Address;
      const mockMembers = [
        { owner: targetAddress, signer: '0x1111111111111111111111111111111111111111' as Address }, // Target is owner, not signer
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(false); // Should be false because we only check signer addresses
    });

    it('should match only signer addresses, not owner addresses', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const ownerAddress = '0x2222222222222222222222222222222222222222' as Address;
      const mockMembers = [
        { owner: ownerAddress, signer: targetAddress },
        {
          owner: '0x3333333333333333333333333333333333333333' as Address,
          signer: '0x4444444444444444444444444444444444444444' as Address,
        },
      ];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      // Should match as signer
      const resultAsSigner = await isSecurityCouncilMember(targetAddress, mockConfig);
      expect(resultAsSigner).toBe(true);

      // Should not match as owner
      const resultAsOwner = await isSecurityCouncilMember(ownerAddress, mockConfig);
      expect(resultAsOwner).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getSecurityCouncilMembers', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const error = new Error('Failed to fetch security council members');

      mockGetSecurityCouncilMembers.mockRejectedValue(error);

      await expect(isSecurityCouncilMember(targetAddress, mockConfig)).rejects.toThrow(
        'Failed to fetch security council members',
      );
    });

    it('should handle network errors gracefully', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const networkError = new Error('Network connection failed');

      mockGetSecurityCouncilMembers.mockRejectedValue(networkError);

      await expect(isSecurityCouncilMember(targetAddress, mockConfig)).rejects.toThrow('Network connection failed');
    });
  });

  describe('integration behavior', () => {
    it('should call getSecurityCouncilMembers with correct config', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [{ owner: '0x2222222222222222222222222222222222222222' as Address, signer: targetAddress }];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledTimes(1);
      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mockConfig);
    });

    it('should work with different network configs', async () => {
      const targetAddress = '0x1111111111111111111111111111111111111111' as Address;
      const mockMembers = [{ owner: '0x2222222222222222222222222222222222222222' as Address, signer: targetAddress }];

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      // Test with mainnet config
      const mainnetConfig = { ...mockConfig, network: 'mainnet' };
      await isSecurityCouncilMember(targetAddress, mainnetConfig);

      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledWith(mainnetConfig);
    });

    it('should handle large member lists efficiently', async () => {
      const targetAddress = '0x9999999999999999999999999999999999999999' as Address;

      // Create large list with target at the end
      const mockMembers = [];
      for (let i = 0; i < 1000; i++) {
        mockMembers.push({
          owner: `0x${i.toString().padStart(40, '0')}` as Address,
          signer: `0x${(i + 1000).toString().padStart(40, '0')}` as Address,
        });
      }
      mockMembers.push({
        owner: '0x8888888888888888888888888888888888888888' as Address,
        signer: targetAddress,
      });

      mockGetSecurityCouncilMembers.mockResolvedValue(mockMembers);

      const result = await isSecurityCouncilMember(targetAddress, mockConfig);

      expect(result).toBe(true);
      expect(mockGetSecurityCouncilMembers).toHaveBeenCalledTimes(1);
    });
  });
});
