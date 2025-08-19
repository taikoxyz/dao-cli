import {
  getEmergencyProposalsFromSubgraph,
  getEmergencyProposalFromSubgraph,
} from '../../../src/api/subgraph/emergencyProposals';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Emergency Proposals Subgraph API', () => {
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

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.proposalId).toBe(1);
      expect(result!.approvers).toHaveLength(2);
    });

    it('should handle missing subgraph endpoint', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined } as any;

      await expect(getEmergencyProposalFromSubgraph(1, configWithoutSubgraph)).rejects.toThrow(
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
              approvers: [{ id: '0x1' }],
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
      expect(result!.encryptedPayloadURI).toBe('encrypted_data_1');
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
          emergencyProposals: [
            {
              id: '1',
              encryptedPayloadURI: null,
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

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeDefined();
      expect(result!.metadataURI).toBe('');
      expect(result!.encryptedPayloadURI).toBe('');
    });

    it('should handle undefined response fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await getEmergencyProposalFromSubgraph(1, mockConfig);

      expect(result).toBeUndefined();
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
              creationBlockNumber: '1234567891',
              executionBlockNumber: '1234567900',
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
              creationBlockNumber: '1234567891',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].proposalId).toBe(1);
      expect(result[0].executed).toBe(false);
      expect(result[1].proposalId).toBe(2);
      expect(result[1].executed).toBe(true);
    });

    it('should handle mixed data scenarios', async () => {
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
              id: '2',
              encryptedPayloadURI: '0x656e637279707465645f646174615f32',
              creator: '0xcreator2',
              approvers: [],
              creationBlockNumber: '1234567891',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      // Note: Current implementation only processes proposals in mixins
      // Emergency proposals without corresponding mixins are not included
      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
    });

    it('should handle empty arrays', async () => {
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

    it('should handle missing fields gracefully', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              proposalId: '1',
              creationBlockNumber: '0',
              // Missing other fields
            },
          ],
          emergencyProposals: [
            {
              id: '2',
              // Missing other fields
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      // Only proposals with mixins are returned
      expect(result).toHaveLength(1);
      expect(result[0].proposalId).toBe(1);
    });

    it('should handle null arrays', async () => {
      const mockResponse = {
        data: {
          proposalMixins: null,
          emergencyProposals: null,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });

    it('should handle undefined data fields', async () => {
      const mockResponse = {
        data: {},
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getEmergencyProposalsFromSubgraph(mockConfig);

      expect(result).toEqual([]);
    });
  });
});
