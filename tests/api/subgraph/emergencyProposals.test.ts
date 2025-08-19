import {
  getEmergencyProposalsFromSubgraph,
  getEmergencyProposalFromSubgraph,
} from '../../../src/api/subgraph/emergencyProposals';
import { INetworkConfig } from '../../../src/types/network.type';
import * as getIpfsFileModule from '../../../src/api/ipfs/getIpfsFile';
import { hexToString } from 'viem';

// Mock dependencies
jest.mock('../../../src/api/ipfs/getIpfsFile');
jest.mock('viem', () => ({
  hexToString: jest.fn((hex) => `ipfs://Qm${hex}`),
}));

// Mock fetch globally
/* global Response */
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockGetIpfsFileSafe = getIpfsFileModule.getIpfsFileSafe as jest.MockedFunction<typeof getIpfsFileModule.getIpfsFileSafe>;

describe('Emergency Proposals Subgraph API', () => {
  let mockConfig: INetworkConfig;

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

    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockGetIpfsFileSafe.mockReset();
    jest.restoreAllMocks();
  });

  describe('getEmergencyProposalFromSubgraph', () => {
    it('should fetch a specific emergency proposal', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x656e637279707465645f646174615f31',
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

      mockGetIpfsFileSafe.mockResolvedValueOnce({
        title: 'Emergency Proposal',
        description: 'Test emergency proposal',
      });

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.approvers).toHaveLength(2);
      expect(result!.title).toBe('Emergency Proposal');
      expect(result!.description).toBe('Test emergency proposal');
    });

    it('should handle missing subgraph endpoint', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined };

      await expect(getEmergencyProposalFromSubgraph(1, configWithoutSubgraph as any)).rejects.toThrow(
        'Subgraph endpoint is not defined in network config',
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getEmergencyProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Network error');
    });

    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getEmergencyProposalFromSubgraph(1, mockConfig)).rejects.toThrow('Subgraph request failed');
    });

    it('should handle empty proposal data', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
          emergencyProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
    });

    it('should handle null data response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null }),
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
    });

    it('should handle only proposal mixin data', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x656e637279707465645f646174615f31',
              creationBlockNumber: '1234567890',
              executionBlockNumber: '1234567900',
              approvers: [{ id: '0x1' }],
              creator: '0xcreator1',
            },
          ],
          emergencyProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.executed).toBe(true);
    });

    it('should handle only emergency proposal data', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
          emergencyProposals: [
            {
              id: '1',
              encryptedPayloadURI: '0x656e637279707465645f646174615f31',
              creator: '0xcreator1',
              approvers: [{ id: '0x1' }, { id: '0x2' }, { id: '0x3' }],
              creationBlockNumber: '1234567890',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.approvers).toHaveLength(3);
      expect(result!.executed).toBe(true); // undefined !== null is true
    });

    it('should handle null metadata', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: null,
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              approvers: [],
              creator: '0xcreator1',
            },
          ],
          emergencyProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.metadataURI).toBe('');
    });

    it('should handle undefined response fields', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
            },
          ],
          emergencyProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.approvals).toBe(0);
      expect(result!.creationBlockNumber).toBe(0n);
    });
  });

  describe('getEmergencyProposalsFromSubgraph', () => {
    it('should fetch all emergency proposals', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x656e637279707465645f646174615f31',
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              approvers: [{ id: '0x1' }],
              creator: '0xcreator1',
            },
            {
              proposalId: '2',
              metadata: '0x656e637279707465645f646174615f32',
              creationBlockNumber: '1234567900',
              executionBlockNumber: '1234567910',
              approvers: [{ id: '0x1' }, { id: '0x2' }],
              creator: '0xcreator2',
            },
          ],
          emergencyProposals: [
            {
              id: '1',
              encryptedPayloadURI: '0x656e637279707465645f646174615f31',
              creator: '0xcreator1',
              approvers: [{ id: '0x1' }],
              creationBlockNumber: '1234567890',
            },
            {
              id: '2',
              encryptedPayloadURI: '0x656e637279707465645f646174615f32',
              creator: '0xcreator2',
              approvers: [{ id: '0x1' }, { id: '0x2' }],
              creationBlockNumber: '1234567900',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { proposalMixins: [], emergencyProposals: [] } }),
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].proposalId).toBe(1);
      expect(result[0].executed).toBe(false);
      expect(result[1].proposalId).toBe(2);
      expect(result[1].executed).toBe(true);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
          emergencyProposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle pagination', async () => {
      const firstBatch = {
        data: {
          proposalMixins: Array(1000).fill(null).map((_, i) => ({
            proposalId: `${i}`,
            metadata: null,
            creationBlockNumber: `${1000 + i}`,
            executionBlockNumber: null,
            approvers: [],
            creator: `0xcreator${i}`,
          })),
          emergencyProposals: Array(1000).fill(null).map((_, i) => ({
            id: `${i}`,
            encryptedPayloadURI: null,
            creator: `0xcreator${i}`,
            approvers: [],
            creationBlockNumber: `${1000 + i}`,
          })),
        },
      };

      const secondBatch = {
        data: {
          proposalMixins: Array(500).fill(null).map((_, i) => ({
            proposalId: `${i + 1000}`,
            metadata: null,
            creationBlockNumber: `${2000 + i}`,
            executionBlockNumber: null,
            approvers: [],
            creator: `0xcreator${i + 1000}`,
          })),
          emergencyProposals: Array(500).fill(null).map((_, i) => ({
            id: `${i + 1000}`,
            encryptedPayloadURI: null,
            creator: `0xcreator${i + 1000}`,
            approvers: [],
            creationBlockNumber: `${2000 + i}`,
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
          json: async () => ({ data: { proposalMixins: [], emergencyProposals: [] } }),
        } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1500);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getEmergencyProposalsFromSubgraph(mockConfig)).rejects.toThrow('Network error');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'GraphQL error' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle metadata fetch errors gracefully', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              metadata: '0x656e637279707465645f646174615f31',
              creationBlockNumber: '1234567890',
              executionBlockNumber: null,
              approvers: [],
              creator: '0xcreator1',
            },
          ],
          emergencyProposals: [
            {
              id: '1',
              encryptedPayloadURI: '0x656e637279707465645f646174615f31',
              creator: '0xcreator1',
              approvers: [],
              creationBlockNumber: '1234567890',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { proposalMixins: [], emergencyProposals: [] } }),
      } as Response);

      const ipfsError = new Error('IPFS fetch failed');
      mockGetIpfsFileSafe.mockRejectedValueOnce(ipfsError);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
    });
  });
});