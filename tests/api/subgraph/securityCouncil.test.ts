import {
  getSecurityCouncilMembersFromSubgraph,
  isAppointedAgentFromSubgraph,
  getDecryptionKeyFromSubgraph,
} from '../../../src/api/subgraph/securityCouncil';
import { INetworkConfig } from '../../../src/types/network.type';

// Mock fetch
global.fetch = jest.fn();

// Mock the cache
jest.mock('../../../src/api/cache', () => ({
  getNetworkCache: jest.fn(() => ({
    has: jest.fn().mockResolvedValue(false),
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('Security Council Subgraph API', () => {
  let mockConfig: INetworkConfig;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  describe('getSecurityCouncilMembersFromSubgraph', () => {
    it('should fetch security council members successfully', async () => {
      const mockResponse = {
        data: {
          signerListMembers: [
            {
              approvers: [
                { id: '0xapprover1' },
                { id: '0xapprover2' },
              ],
            },
            {
              approvers: [
                { id: '0xapprover2' },
                { id: '0xapprover3' },
              ],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual(
        expect.arrayContaining([
          {
            owner: '0xapprover1',
            signer: '0xapprover1',
          },
          {
            owner: '0xapprover2',
            signer: '0xapprover2',
          },
          {
            owner: '0xapprover3',
            signer: '0xapprover3',
          },
        ])
      );

      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 3 security council members from subgraph');
    });

    it('should handle empty members list', async () => {
      const mockResponse = {
        data: {
          securityCouncilSigner: {
            members: [],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 0 security council members from subgraph');
    });

    it('should handle empty proposals', async () => {
      const mockResponse = {
        data: {
          proposals: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(consoleInfoSpy).toHaveBeenCalledWith('Found 0 security council members from subgraph');
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [{ message: 'GraphQL error' }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('GraphQL errors:', mockResponse.errors);
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);
      
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching security council members from subgraph:', error);
    });

    it('should handle subgraph request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await getSecurityCouncilMembersFromSubgraph(mockConfig);
      
      expect(result).toEqual([]);
    });

    it('should handle missing subgraph endpoint', async () => {
      const configWithoutSubgraph = { ...mockConfig, subgraph: undefined };

      const result = await getSecurityCouncilMembersFromSubgraph(configWithoutSubgraph as any);
      
      expect(result).toEqual([]);
    });
  });

  describe('isAppointedAgentFromSubgraph', () => {
    it('should return true when address is an appointed agent', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              id: '0xproposal1',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await isAppointedAgentFromSubgraph('0xagent1' as `0x${string}`, mockConfig);

      expect(result).toBe(true);
    });

    it('should return false when address is not an appointed agent', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await isAppointedAgentFromSubgraph('0xnotanagent' as `0x${string}`, mockConfig);

      expect(result).toBe(false);
    });

    it('should handle lowercase address comparison', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [
            {
              id: '0xproposal1',
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await isAppointedAgentFromSubgraph('0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`, mockConfig);

      expect(result).toBe(true);
    });

    it('should handle empty proposals', async () => {
      const mockResponse = {
        data: {
          proposalMixins: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await isAppointedAgentFromSubgraph('0xaddress' as `0x${string}`, mockConfig);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValueOnce(error);

      const result = await isAppointedAgentFromSubgraph('0xaddress' as `0x${string}`, mockConfig);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking if address is appointed agent:', error);
    });
  });

  describe('getDecryptionKeyFromSubgraph', () => {
    it('should always return null since decryption keys are not available through subgraph', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await getDecryptionKeyFromSubgraph();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Decryption keys are not available through the subgraph');
      
      consoleWarnSpy.mockRestore();
    });





  });
});