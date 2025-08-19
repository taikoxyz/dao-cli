import {
  getPublicProposalsFromSubgraph,
  getPublicProposalFromSubgraph,
} from '../../../src/api/subgraph/publicProposals';
import { INetworkConfig } from '../../../src/types/network.type';
import getIpfsFile from '../../../src/api/ipfs/getIpfsFile';

// Mock dependencies
jest.mock('../../../src/api/ipfs/getIpfsFile');

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockGetIpfsFile = getIpfsFile as jest.MockedFunction<typeof getIpfsFile>;

describe('Public Proposals Subgraph API', () => {
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

    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPublicProposalFromSubgraph', () => {
    it('should fetch a specific public proposal', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233', // ipfs://QmTest123
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creatorAddress: '0xcreator1',
              contractEventId: 'event1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              id: 'mixin1',
              proposalId: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              creator: '0xcreator1',
              creationTxHash: '0xtxhash',
              creationBlockNumber: '100',
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

      mockGetIpfsFile.mockResolvedValueOnce({
        title: 'Test Proposal',
        description: 'Test Description',
      });

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.title).toBe('Test Proposal');
      expect(result!.description).toBe('Test Description');
      expect(result!.creator).toBe('0xcreator1');
    });

    it('should handle missing subgraph endpoint', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined } as any;

      await expect(getPublicProposalFromSubgraph(1, configWithoutSubgraph)).rejects.toThrow(
        'Subgraph endpoint is not defined in network config',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getPublicProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Network error');
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getPublicProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Subgraph request failed');
    });

    it('should handle empty proposal data', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [],
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
    });

    it('should handle null metadata', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: null,
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              proposalId: '1',
              metadata: null,
              creator: '0xcreator1',
              creationBlockNumber: '100',
              vetoes: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.metadataURI).toBe('');
      expect(result!.title).toBeUndefined();
    });

    it('should handle IPFS fetch errors gracefully', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233', // ipfs://QmTest123
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              creator: '0xcreator1',
              creationBlockNumber: '100',
              vetoes: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile.mockRejectedValueOnce(new Error('IPFS fetch failed'));

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.title).toBeUndefined();
    });

    it('should handle non-IPFS metadata URIs', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x68747470733a2f2f6578616d706c652e636f6d', // https://example.com
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x68747470733a2f2f6578616d706c652e636f6d',
              creator: '0xcreator1',
              creationBlockNumber: '100',
              vetoes: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.metadataURI).toBe('https://example.com');
      // getIpfsFile is called with non-IPFS URLs but will fail (caught in try/catch)
      expect(mockGetIpfsFile).toHaveBeenCalledWith('https://example.com');
    });

    it('should handle only proposal mixin data', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [],
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              creator: '0xcreator1',
              creationBlockNumber: '100',
              executionBlockNumber: '200',
              vetoes: [{ id: 'veto1' }],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile.mockResolvedValueOnce({
        title: 'Test Proposal',
        description: 'Test Description',
      });

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.executed).toBe(true);
      expect(result!.vetoes).toHaveLength(1);
    });

    it('should handle only optimistic proposal data', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile.mockResolvedValueOnce({
        title: 'Test Proposal',
        description: 'Test Description',
      });

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.startDate).toEqual(new Date(1234567890 * 1000));
      expect(result!.endDate).toEqual(new Date(1234567900 * 1000));
    });

    it('should handle null data response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response);

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
    });

    it('should handle undefined response fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await getPublicProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
    });
  });

  describe('getPublicProposalsFromSubgraph', () => {
    it('should fetch all public proposals', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
            {
              id: '2',
              metadata: '0x697066733a2f2f516d54657374343536',
              startDate: '1234567891',
              endDate: '1234567901',
              creator: '0xcreator2',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              creator: '0xcreator1',
              creationBlockNumber: '100',
              vetoes: [],
            },
            {
              proposalId: '2',
              metadata: '0x697066733a2f2f516d54657374343536',
              creator: '0xcreator2',
              creationBlockNumber: '100',
              vetoes: [{ id: 'veto1' }],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile
        .mockResolvedValueOnce({
          title: 'Test Proposal 1',
          description: 'Test Description 1',
        })
        .mockResolvedValueOnce({
          title: 'Test Proposal 2',
          description: 'Test Description 2',
        });

      const result = await getPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Proposal 1');
      expect(result[1].title).toBe('Test Proposal 2');
      expect(result[1].vetoes).toHaveLength(1);
    });

    it('should handle mixed metadata types', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233', // IPFS
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
            {
              id: '2',
              metadata: '0x68747470733a2f2f6578616d706c652e636f6d', // HTTPS
              startDate: '1234567891',
              endDate: '1234567901',
              creator: '0xcreator2',
              creationBlockNumber: '100',
            },
            {
              id: '3',
              metadata: null, // null
              startDate: '1234567892',
              endDate: '1234567902',
              creator: '0xcreator3',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile.mockResolvedValueOnce({
        title: 'IPFS Proposal',
        description: 'IPFS Description',
      });

      const result = await getPublicProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('IPFS Proposal');
      expect(result[1].metadataURI).toBe('https://example.com');
      expect(result[2].metadataURI).toBe('');
    });

    it('should handle mismatched proposal and mixin data', async () => {
      const mockResponse = {
        data: {
          optimisticTokenVotingProposals: [
            {
              id: '1',
              metadata: '0x697066733a2f2f516d54657374313233',
              startDate: '1234567890',
              endDate: '1234567900',
              creator: '0xcreator1',
              creationBlockNumber: '100',
            },
          ],
          proposalMixins: [
            {
              proposalId: '2', // Different ID
              metadata: '0x697066733a2f2f516d54657374343536',
              creator: '0xcreator2',
              creationBlockNumber: '100',
              vetoes: [],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockGetIpfsFile.mockResolvedValueOnce({ title: 'Proposal 1' }).mockResolvedValueOnce({ title: 'Proposal 2' });

      const result = await getPublicProposalsFromSubgraph(mockConfig);

      // Only optimistic proposals are processed, mixins are looked up
      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
    });
  });
});
