import {
  getStandardProposalFromSubgraph,
  getStandardProposalsFromSubgraph,
} from '../../../src/api/subgraph/standardProposals';
import { INetworkConfig } from '../../../src/types/network.type';
import * as getIpfsFileModule from '../../../src/api/ipfs/getIpfsFile';
import { hexToString } from 'viem';

// Mock dependencies
jest.mock('../../../src/api/ipfs/getIpfsFile');
jest.mock('viem', () => ({
  hexToString: jest.fn((hex) => `ipfs://Qm${hex}`),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Standard Proposals Subgraph API', () => {
  let mockConfig: INetworkConfig;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockGetIpfsFileSafe = getIpfsFileModule.getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileModule.getIpfsFileSafe>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default mock for getIpfsFileSafe
    mockGetIpfsFileSafe.mockReset();
    mockGetIpfsFileSafe.mockResolvedValue(null);
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

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetIpfsFileSafe.mockReset();
    jest.restoreAllMocks();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('getStandardProposalFromSubgraph', () => {
    it('should fetch a specific standard proposal', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [{
            id: '0x123',
            proposalId: '1',
            metadata: '0x697066733a2f2f516d54657374313233',
            creator: '0xcreator1',
            isEmergency: false,
            isStandard: true,
            isOptimistic: false,
            creationTxHash: '0xtxhash',
            creationBlockNumber: '1000',
            executionBlockNumber: null,
            executionTxHash: '',
            approvers: [{ id: '0xapprover1' }, { id: '0xapprover2' }],
          }],
          standardProposals: [{
            id: '1',
            creator: '0xcreator1',
            metadata: '0x697066733a2f2f516d54657374313233',
            startDate: '1234567890',
            endDate: '1234567900',
            contractEventId: 'event1',
            creationBlockNumber: '1000',
          }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFileSafe.mockResolvedValueOnce({
        title: 'Test Proposal',
        description: 'Test Description',
      });

      const result = await getStandardProposalFromSubgraph(1, mockConfig);

      expect(result).toEqual({
        proposalId: 1,
        executed: false,
        approvals: 2,
        metadataURI: 'ipfs://Qm0x697066733a2f2f516d54657374313233',
        creator: '0xcreator1',
        creationBlockNumber: 1000n,
        executionBlockNumber: null,
        startDate: new Date(1234567890 * 1000),
        endDate: new Date(1234567900 * 1000),
        title: 'Test Proposal',
        description: 'Test Description',
      });
    });

    it('should handle proposal not found', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
          standardProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getStandardProposalFromSubgraph(999, mockConfig);

      expect(result).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith('Standard proposal 999 not found in subgraph');
    });

    it('should handle only proposal mixin data', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [{
            id: '0x123',
            proposalId: '2',
            metadata: '0x697066733a2f2f516d54657374343536',
            creator: '0xcreator2',
            creationBlockNumber: '2000',
            executionBlockNumber: '2500',
            approvers: [],
          }],
          standardProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFileSafe.mockResolvedValueOnce(null);

      const result = await getStandardProposalFromSubgraph(2, mockConfig);

      expect(result).toEqual({
        proposalId: 2,
        executed: true,
        approvals: 0,
        metadataURI: 'ipfs://Qm0x697066733a2f2f516d54657374343536',
        creator: '0xcreator2',
        creationBlockNumber: 2000n,
        executionBlockNumber: 2500n,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      await expect(getStandardProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching standard proposal 1 from subgraph:', error);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'GraphQL error' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getStandardProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('GraphQL errors:', mockResponse.errors);
    });

    it('should handle subgraph request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getStandardProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Subgraph request failed: 500 Internal Server Error');
    });

    it('should handle missing subgraph endpoint', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined };

      await expect(getStandardProposalFromSubgraph(1, configWithoutSubgraph as any)).rejects.toThrow('Subgraph endpoint is not defined in network config');
    });
  });

  describe('getStandardProposalsFromSubgraph', () => {
    it('should fetch all standard proposals', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              id: '0x1',
              proposalId: '1',
              metadata: '0x697066733a2f2f516d5465737431',
              creator: '0xcreator1',
              creationBlockNumber: '1000',
              executionBlockNumber: null,
              approvers: [{ id: '0xapprover1' }],
            },
            {
              id: '0x2',
              proposalId: '2',
              metadata: '0x697066733a2f2f516d5465737432',
              creator: '0xcreator2',
              creationBlockNumber: '2000',
              executionBlockNumber: '2500',
              approvers: [{ id: '0xapprover1' }, { id: '0xapprover2' }],
            },
          ],
        },
      };

      const emptyResponse = {
        data: {
          proposalMixins: [],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => emptyResponse,
        } as Response);

      mockGetIpfsFileSafe
        .mockResolvedValueOnce({ title: 'Proposal 1', description: 'Description 1' })
        .mockResolvedValueOnce({ title: 'Proposal 2', description: 'Description 2' });

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([
        {
          proposalId: 1,
          executed: false,
          approvals: 1,
          metadataURI: 'ipfs://Qm0x697066733a2f2f516d5465737431',
          creator: '0xcreator1',
          creationBlockNumber: 1000n,
          executionBlockNumber: null,
          title: 'Proposal 1',
          description: 'Description 1',
        },
        {
          proposalId: 2,
          executed: true,
          approvals: 2,
          metadataURI: 'ipfs://Qm0x697066733a2f2f516d5465737432',
          creator: '0xcreator2',
          creationBlockNumber: 2000n,
          executionBlockNumber: 2500n,
          title: 'Proposal 2',
          description: 'Description 2',
        },
      ]);

      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 2 standard proposals in subgraph');
    });

    it('should handle empty proposals list', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 0 standard proposals in subgraph');
    });

    it('should handle pagination', async () => {
      const firstBatch = {
        data: {
          proposalMixins: Array(1000).fill(null).map((_, i) => ({
            id: `0x${i}`,
            proposalId: `${i}`,
            metadata: null,
            creator: `0xcreator${i}`,
            creationBlockNumber: `${i * 100}`,
            executionBlockNumber: null,
            approvers: [],
          })),
        },
      };

      const secondBatch = {
        data: {
          proposalMixins: Array(500).fill(null).map((_, i) => ({
            id: `0x${i + 1000}`,
            proposalId: `${i + 1000}`,
            metadata: null,
            creator: `0xcreator${i + 1000}`,
            creationBlockNumber: `${(i + 1000) * 100}`,
            executionBlockNumber: null,
            approvers: [],
          })),
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => firstBatch,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => secondBatch,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { proposalMixins: [] } }),
        } as Response);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1500);
      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 1500 standard proposals in subgraph');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      await expect(getStandardProposalsFromSubgraph(mockConfig)).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching standard proposals from subgraph:', error);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'GraphQL error' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('GraphQL errors:', mockResponse.errors);
    });

    it('should handle metadata fetch errors gracefully', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [{
            id: '0x1',
            proposalId: '1',
            metadata: '0x697066733a2f2f516d5465737431',
            creator: '0xcreator1',
            creationBlockNumber: '1000',
            executionBlockNumber: null,
            approvers: [],
          }],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const ipfsError = new Error('IPFS fetch failed');
      mockGetIpfsFileSafe.mockRejectedValueOnce(ipfsError);

      const result = await getStandardProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([{
        proposalId: 1,
        executed: false,
        approvals: 0,
        metadataURI: 'ipfs://Qm0x697066733a2f2f516d5465737431',
        creator: '0xcreator1',
        creationBlockNumber: 1000n,
        executionBlockNumber: null,
      }]);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching metadata for proposal 1:', ipfsError);
    });
  });
});