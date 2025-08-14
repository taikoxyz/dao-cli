import { Address } from 'viem';
import getSecurityCouncilMembers from '../../../../src/api/dao/security-council/getSecurityCouncilMembers';
import { getPublicClient } from '../../../../src/api/viem';
import { ABIs } from '../../../../src/abi';
import { cache } from '../../../../src/api/cache';
import { INetworkConfig } from '../../../../src/types/network.type';

// Mock dependencies
jest.mock('../../../../src/api/viem');
jest.mock('../../../../src/api/cache');
jest.mock('../../../../src/abi');

const mockGetPublicClient = getPublicClient as jest.MockedFunction<typeof getPublicClient>;
const mockCache = cache as jest.Mocked<typeof cache>;

describe('getSecurityCouncilMembers', () => {
  let mockConfig: INetworkConfig;
  let mockClient: any;

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

    mockClient = {
      readContract: jest.fn(),
      getBlockNumber: jest.fn(),
    };

    mockGetPublicClient.mockReturnValue(mockClient);
    
    // Mock ABIs
    (ABIs as any) = {
      SignerList: [
        {
          name: 'getEncryptionAgents',
          type: 'function',
          inputs: [],
          outputs: [{ name: '', type: 'address[]' }],
        },
        {
          name: 'getListedEncryptionOwnerAtBlock',
          type: 'function',
          inputs: [
            { name: 'signer', type: 'address' },
            { name: 'blockNumber', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'address' }],
        },
      ],
    };
  });

  describe('cache behavior', () => {
    it('should return cached data when available', async () => {
      const cachedData = [
        { owner: '0x1111111111111111111111111111111111111111' as Address, signer: '0x2222222222222222222222222222222222222222' as Address },
        { owner: '0x3333333333333333333333333333333333333333' as Address, signer: '0x4444444444444444444444444444444444444444' as Address },
      ];

      mockCache.has.mockResolvedValue(true);
      mockCache.get.mockResolvedValue(cachedData);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(mockCache.has).toHaveBeenCalledWith('signerList');
      expect(mockCache.get).toHaveBeenCalledWith('signerList');
      expect(result).toEqual(cachedData);
      expect(mockClient.readContract).not.toHaveBeenCalled();
    });

    it('should fetch fresh data when cache is empty', async () => {
      mockCache.has.mockResolvedValue(false);
      
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
      ];
      
      const mockOwners = [
        '0x3333333333333333333333333333333333333333' as Address,
        '0x4444444444444444444444444444444444444444' as Address,
      ];

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners) // getEncryptionAgents
        .mockResolvedValueOnce(mockOwners[0]) // getListedEncryptionOwnerAtBlock for first signer
        .mockResolvedValueOnce(mockOwners[1]); // getListedEncryptionOwnerAtBlock for second signer

      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(mockCache.has).toHaveBeenCalledWith('signerList');
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.SignerList,
        abi: ABIs.SignerList,
        functionName: 'getEncryptionAgents',
        args: [],
      });
      expect(mockClient.getBlockNumber).toHaveBeenCalled();
      expect(result).toEqual([
        { owner: mockOwners[0], signer: mockSigners[0] },
        { owner: mockOwners[1], signer: mockSigners[1] },
      ]);
    });
  });

  describe('blockchain interaction', () => {
    beforeEach(() => {
      mockCache.has.mockResolvedValue(false);
    });

    it('should call getEncryptionAgents to get signers list', async () => {
      const mockSigners = ['0x1111111111111111111111111111111111111111' as Address];
      const mockOwner = '0x2222222222222222222222222222222222222222' as Address;

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwner);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      await getSecurityCouncilMembers(mockConfig);

      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.SignerList,
        abi: ABIs.SignerList,
        functionName: 'getEncryptionAgents',
        args: [],
      });
    });

    it('should get block number and subtract 10', async () => {
      const mockSigners = ['0x1111111111111111111111111111111111111111' as Address];
      const mockOwner = '0x2222222222222222222222222222222222222222' as Address;

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwner);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      await getSecurityCouncilMembers(mockConfig);

      expect(mockClient.getBlockNumber).toHaveBeenCalled();
      expect(mockClient.readContract).toHaveBeenCalledWith({
        address: mockConfig.contracts.SignerList,
        abi: ABIs.SignerList,
        functionName: 'getListedEncryptionOwnerAtBlock',
        args: [mockSigners[0], 990n], // 1000 - 10
      });
    });

    it('should call getListedEncryptionOwnerAtBlock for each signer', async () => {
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
        '0x3333333333333333333333333333333333333333' as Address,
      ];
      const mockOwners = [
        '0x4444444444444444444444444444444444444444' as Address,
        '0x5555555555555555555555555555555555555555' as Address,
        '0x6666666666666666666666666666666666666666' as Address,
      ];

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwners[0])
        .mockResolvedValueOnce(mockOwners[1])
        .mockResolvedValueOnce(mockOwners[2]);
      mockClient.getBlockNumber.mockResolvedValue(500n);

      await getSecurityCouncilMembers(mockConfig);

      expect(mockClient.readContract).toHaveBeenCalledTimes(4); // 1 for getEncryptionAgents + 3 for owners
      
      mockSigners.forEach((signer, index) => {
        expect(mockClient.readContract).toHaveBeenCalledWith({
          address: mockConfig.contracts.SignerList,
          abi: ABIs.SignerList,
          functionName: 'getListedEncryptionOwnerAtBlock',
          args: [signer, 490n], // 500 - 10
        });
      });
    });

    it('should handle empty signers list', async () => {
      mockClient.readContract.mockResolvedValueOnce([]);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(result).toEqual([]);
      expect(mockClient.readContract).toHaveBeenCalledTimes(1); // Only getEncryptionAgents
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockCache.has.mockResolvedValue(false);
    });

    it('should handle errors when fetching owner for a signer', async () => {
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
      ];
      const mockOwner = '0x3333333333333333333333333333333333333333' as Address;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockRejectedValueOnce(new Error('Contract call failed')) // First owner fetch fails
        .mockResolvedValueOnce(mockOwner); // Second owner fetch succeeds
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching owner for signer'),
        expect.any(Error)
      );
      
      // Should continue processing other signers
      expect(result).toEqual([
        { owner: mockOwner, signer: mockSigners[1] },
      ]);

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing if one signer fails', async () => {
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
        '0x3333333333333333333333333333333333333333' as Address,
      ];
      const mockOwners = [
        '0x4444444444444444444444444444444444444444' as Address,
        '0x6666666666666666666666666666666666666666' as Address,
      ];

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwners[0]) // First succeeds
        .mockRejectedValueOnce(new Error('Network error')) // Second fails
        .mockResolvedValueOnce(mockOwners[1]); // Third succeeds
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(result).toEqual([
        { owner: mockOwners[0], signer: mockSigners[0] },
        { owner: mockOwners[1], signer: mockSigners[2] },
      ]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('caching behavior', () => {
    beforeEach(() => {
      mockCache.has.mockResolvedValue(false);
    });

    it('should cache results after successful fetch', async () => {
      const mockSigners = ['0x1111111111111111111111111111111111111111' as Address];
      const mockOwner = '0x2222222222222222222222222222222222222222' as Address;
      const expectedResult = [{ owner: mockOwner, signer: mockSigners[0] }];

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwner);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      await getSecurityCouncilMembers(mockConfig);

      expect(mockCache.set).toHaveBeenCalledWith('signerList', expectedResult);
    });

    it('should update cache incrementally as owners are fetched', async () => {
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
      ];
      const mockOwners = [
        '0x3333333333333333333333333333333333333333' as Address,
        '0x4444444444444444444444444444444444444444' as Address,
      ];

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwners[0])
        .mockResolvedValueOnce(mockOwners[1]);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      await getSecurityCouncilMembers(mockConfig);

      // Cache should be set twice, once after each successful owner fetch
      expect(mockCache.set).toHaveBeenCalledTimes(2);
      // Due to the implementation appending to the array each time, we just check that it was called
      expect(mockCache.set).toHaveBeenCalledWith('signerList', expect.any(Array));
    });
  });

  describe('return type validation', () => {
    beforeEach(() => {
      mockCache.has.mockResolvedValue(false);
    });

    it('should return array with correct owner/signer structure', async () => {
      const mockSigners = ['0x1111111111111111111111111111111111111111' as Address];
      const mockOwner = '0x2222222222222222222222222222222222222222' as Address;

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwner);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('owner');
      expect(result[0]).toHaveProperty('signer');
      expect(result[0].owner).toBe(mockOwner);
      expect(result[0].signer).toBe(mockSigners[0]);
    });

    it('should handle multiple signers correctly', async () => {
      const mockSigners = [
        '0x1111111111111111111111111111111111111111' as Address,
        '0x2222222222222222222222222222222222222222' as Address,
      ];
      const mockOwners = [
        '0x3333333333333333333333333333333333333333' as Address,
        '0x4444444444444444444444444444444444444444' as Address,
      ];

      mockClient.readContract
        .mockResolvedValueOnce(mockSigners)
        .mockResolvedValueOnce(mockOwners[0])
        .mockResolvedValueOnce(mockOwners[1]);
      mockClient.getBlockNumber.mockResolvedValue(1000n);

      const result = await getSecurityCouncilMembers(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ owner: mockOwners[0], signer: mockSigners[0] });
      expect(result[1]).toEqual({ owner: mockOwners[1], signer: mockSigners[1] });
    });
  });
});