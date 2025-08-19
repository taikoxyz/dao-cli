import { getStandardProposalsFromSubgraph } from '../../../src/api/subgraph/standardProposals';
import { getEmergencyProposalsFromSubgraph } from '../../../src/api/subgraph/emergencyProposals';
import { getPublicProposalsFromSubgraph } from '../../../src/api/subgraph/publicProposals';
import { getSecurityCouncilMembersFromSubgraph } from '../../../src/api/subgraph/securityCouncil';
import { fetchPublicProposalsFromSubgraph, fetchAllPublicProposalsFromSubgraph } from '../../../src/api/subgraph/index';
import { INetworkConfig } from '../../../src/types/network.type';
import { getNetworkCache } from '../../../src/api/cache';

// Mock dependencies
jest.mock('../../../src/api/ipfs/getIpfsFile');
jest.mock('../../../src/api/cache', () => ({
  getNetworkCache: jest.fn(() => ({
    has: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  }))
}));

// Mock fetch globally
/* global Response */
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Subgraph API', () => {
  let mockConfig: INetworkConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    mockConfig = {
      network: 'holesky',
      urls: {
        rpc: 'https://rpc.holesky.ethpandaops.io',
        explorer: 'https://holesky.etherscan.io',
      },
      subgraph: 'https://subgraph.holesky.example.com',
      contracts: {
        DAO: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        VotingToken: '0x2345678901abcdef2345678901abcdef23456789' as `0x${string}`,
        TaikoBridge: '0x3456789012abcdef3456789012abcdef34567890' as `0x${string}`,
        MultisigPlugin: '0x4567890123abcdef4567890123abcdef45678901' as `0x${string}`,
        EmergencyMultisigPlugin: '0x5678901234abcdef5678901234abcdef56789012' as `0x${string}`,
        OptimisticTokenVotingPlugin: '0x6789012345abcdef6789012345abcdef67890123' as `0x${string}`,
        SignerList: '0x7890123456abcdef7890123456abcdef78901234' as `0x${string}`,
        EncryptionRegistry: '0x8901234567abcdef8901234567abcdef89012345' as `0x${string}`,
        DelegationWall: '0x9012345678abcdef9012345678abcdef90123456' as `0x${string}`,
      },
    };

    // Mock console methods to reduce noise
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  describe('getStandardProposalsFromSubgraph', () => {
    it('should fetch standard proposals from subgraph', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x697066733a2f2f516d5465737431', // hex for ipfs://QmTest1
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              approvers: [{ id: '0x1' }, { id: '0x2' }],
              creator: '0xcreator1',
            },
            {
              proposalId: '2',
              metadata: '0x697066733a2f2f516d5465737432', // hex for ipfs://QmTest2
              creationBlockNumber: '1234567891',
              executionBlockNumber: '1234567900',
              approvers: [{ id: '0x1' }, { id: '0x2' }, { id: '0x3' }],
              creator: '0xcreator2',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].proposalId).toBe(1);
      expect(result[1].proposalId).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.subgraph,
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should handle empty proposals', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { proposalMixins: [] } }),
      } as Response);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle subgraph errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getStandardProposalsFromSubgraph(mockConfig)).rejects.toThrow('Subgraph request failed');
    });
  });

  describe('getEmergencyProposalsFromSubgraph', () => {
    it('should fetch emergency proposals from subgraph', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x656e637279707465645f646174615f31', // hex for encrypted_data_1
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              approvers: [{ id: '0x1' }, { id: '0x2' }],
              creator: '0xcreator1',
            },
          ],
          emergencyProposals: [
            {
              id: '1',
              encryptedPayloadURI: '0x656e637279707465645f646174615f31',
              creator: '0xcreator1',
              approvers: [{ id: '0x1' }, { id: '0x2' }],
              creationBlockNumber: '1234567890',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getPublicProposalsFromSubgraph', () => {
    it('should fetch public proposals from subgraph', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d5075626c696331', // hex for ipfs://QmPublic1
              creator: '0xcreator1',
              creatorAddress: '0xcreator1',
              startDate: '1634567890',
              endDate: '1734567890',
              contractEventId: 'event1',
              creationBlockNumber: '1234567890',
            },
          ],
          proposalMixins: [
            {
              id: '1',
              proposalId: '1',
              metadata: '0x697066733a2f2f516d5075626c696331',
              creator: '0xcreator1',
              creationTxHash: '0xtxhash',
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              executionTxHash: null,
              vetoes: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('fetchPublicProposalsFromSubgraph', () => {
    it('should fetch proposals with default parameters', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: 'ipfs://test1',
              creator: 'creator1',
              startDate: '1234567890',
              endDate: '1234567900',
              creatorAddress: '0x123',
              contractEventId: 'event1',
              creationBlockNumber: '100',
            },
            {
              id: '2',
              metadata: 'ipfs://test2',
              creator: 'creator2',
              startDate: '1234567891',
              endDate: '1234567901',
              creatorAddress: '0x456',
              contractEventId: 'event2',
              creationBlockNumber: '101',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.subgraph,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"first":100'),
        }),
      );
    });

    it('should fetch proposals with custom parameters', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '3',
              metadata: 'test',
              creator: 'c',
              startDate: '1',
              endDate: '2',
              creatorAddress: '0x1',
              contractEventId: 'e',
              creationBlockNumber: '1',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchPublicProposalsFromSubgraph(mockConfig, 50, 10);

      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        mockConfig.subgraph,
        expect.objectContaining({
          body: expect.stringContaining('"first":50,"skip":10'),
        }),
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchPublicProposalsFromSubgraph(mockConfig)).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching proposals from subgraph:', expect.any(Error));
    });

    it('should handle non-ok responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(fetchPublicProposalsFromSubgraph(mockConfig)).rejects.toThrow(
        'Subgraph request failed: 500 Internal Server Error',
      );
    });

    it('should handle invalid response data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response);

      const result = await fetchPublicProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Invalid subgraph response:', { data: null });
    });

    it('should handle missing optimisticTokenVotingProposals in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response);

      const result = await fetchPublicProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Invalid subgraph response:', { data: {} });
    });

    it('should throw error if subgraph endpoint is not defined', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined } as Record<string, unknown>;

      await expect(fetchPublicProposalsFromSubgraph(configWithoutSubgraph as any)).rejects.toThrow(
        'Subgraph endpoint is not defined in network config',
      );
    });
  });

  describe('fetchAllPublicProposalsFromSubgraph', () => {
    it('should fetch all proposals in batches', async () => {
      // First batch - full 1000 items
      const firstBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        metadata: `test${i}`,
        creator: `creator${i}`,
        startDate: '1234567890',
        endDate: '1234567900',
        creatorAddress: `0x${i}`,
        contractEventId: `event${i}`,
        creationBlockNumber: `${i}`,
      }));

      // Second batch - partial
      const secondBatch = Array.from({ length: 500 }, (_, i) => ({
        id: `${1000 + i}`,
        metadata: `test${1000 + i}`,
        creator: `creator${1000 + i}`,
        startDate: '1234567890',
        endDate: '1234567900',
        creatorAddress: `0x${1000 + i}`,
        contractEventId: `event${1000 + i}`,
        creationBlockNumber: `${1000 + i}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { optimisticTokenVotingProposals: firstBatch } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { optimisticTokenVotingProposals: secondBatch } }),
        } as Response);

      const result = await fetchAllPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1500);
      expect(result[0].id).toBe('0');
      expect(result[1499].id).toBe('1499');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle empty results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { optimisticTokenVotingProposals: [] } }),
      } as Response);

      const result = await fetchAllPublicProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop fetching when batch is less than batchSize', async () => {
      const partialBatch = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        metadata: `test${i}`,
        creator: `creator${i}`,
        startDate: '1234567890',
        endDate: '1234567900',
        creatorAddress: `0x${i}`,
        contractEventId: `event${i}`,
        creationBlockNumber: `${i}`,
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { optimisticTokenVotingProposals: partialBatch } }),
      } as Response);

      const result = await fetchAllPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(50);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error if subgraph endpoint is not defined', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined } as Record<string, unknown>;

      await expect(fetchAllPublicProposalsFromSubgraph(configWithoutSubgraph as any)).rejects.toThrow(
        'Subgraph endpoint is not defined in network config',
      );
    });

    it('should propagate errors from fetchPublicProposalsFromSubgraph', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(fetchAllPublicProposalsFromSubgraph(mockConfig)).rejects.toThrow('Network failure');
    });
  });

  describe('getSecurityCouncilMembersFromSubgraph', () => {
    it('should fetch security council members from subgraph', async () => {
      const mockGetNetworkCache = getNetworkCache as jest.MockedFunction<typeof getNetworkCache>;
      mockGetNetworkCache.mockReturnValue({
        has: jest.fn().mockResolvedValue(false),
        get: jest.fn(),
        set: jest.fn(),
      } as any);

      const mockResponse = {
        data: {
          signerListMembers: [
            {
              approvers: [{ id: '0xmember1' }, { id: '0xmember2' }, { id: '0xmember3' }],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual([
        { owner: '0xmember1', signer: '0xmember1' },
        { owner: '0xmember2', signer: '0xmember2' },
        { owner: '0xmember3', signer: '0xmember3' },
      ]);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle empty member list', async () => {
      const mockGetNetworkCache = getNetworkCache as jest.MockedFunction<typeof getNetworkCache>;
      mockGetNetworkCache.mockReturnValue({
        has: jest.fn().mockResolvedValue(false),
        get: jest.fn(),
        set: jest.fn(),
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { signerListMembers: [] } }),
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });
  });
});
